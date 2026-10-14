import os
import shutil
import uuid
import logging
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from fastapi.responses import FileResponse
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import Document, DocumentChunk
from app.schemas import DocumentResponse, DocumentListResponse, DocumentChunkResponse
from app.services.pdf_processor import extract_text_from_pdf
from app.services.chunking import chunk_document_pages
from app.services.embedding_service import embed_batch
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    force_ocr: bool = Query(False, description="Force Tesseract OCR on all pages"),
    db: AsyncSession = Depends(get_db)
):
    """
    Uploads a PDF file, extracts text with PyMuPDF, falls back to Tesseract OCR for
    scanned pages, splits into chunks, generates embeddings, and saves to database.
    """
    filename = file.filename or "uploaded_document.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files (.pdf) are currently supported."
        )

    doc_id = str(uuid.uuid4())
    safe_filename = f"{doc_id}_{filename}"
    saved_path = settings.UPLOAD_DIR / safe_filename

    try:
        # 1. Save uploaded file to disk
        with open(saved_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        file_size = os.path.getsize(saved_path)

        # 2. Extract text & execute OCR on scanned pages
        logger.info(f"Processing PDF '{filename}' ({file_size:,} bytes)...")
        pdf_result = extract_text_from_pdf(saved_path, force_ocr=force_ocr)

        # 3. Create Document DB entity
        doc_entity = Document(
            id=doc_id,
            filename=filename,
            file_path=str(saved_path),
            file_size=file_size,
            mime_type="application/pdf",
            page_count=pdf_result.page_count,
            ocr_applied=pdf_result.ocr_applied,
            ocr_pages_count=len(pdf_result.ocr_pages),
            extracted_chars=pdf_result.extracted_chars,
            summary=pdf_result.summary
        )
        db.add(doc_entity)
        await db.flush()

        # 4. Chunk text with page tracking
        chunk_items = chunk_document_pages(
            pages=pdf_result.pages,
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP
        )
        logger.info(f"Generated {len(chunk_items)} chunks for '{filename}'.")

        # 5. Generate embeddings in batch
        chunk_texts = [c.text for c in chunk_items]
        embeddings = embed_batch(chunk_texts)

        # 6. Save chunks to database
        chunk_records = []
        for item, emb in zip(chunk_items, embeddings):
            c_rec = DocumentChunk(
                id=str(uuid.uuid4()),
                document_id=doc_id,
                chunk_index=item.chunk_index,
                page_number=item.page_number,
                text=item.text,
                token_count=item.token_count,
            )
            c_rec.set_embedding(emb)
            chunk_records.append(c_rec)

        db.add_all(chunk_records)
        await db.commit()
        await db.refresh(doc_entity)

        logger.info(f"Successfully indexed document '{filename}' with {len(chunk_records)} embedded chunks.")
        
        doc_dict = doc_entity.to_dict()
        doc_dict["chunks_count"] = len(chunk_records)
        return DocumentResponse(**doc_dict)

    except Exception as e:
        logger.error(f"Failed to process document {filename}: {e}", exc_info=True)
        # Clean up temporary file if saved
        if saved_path.exists():
            try:
                os.remove(saved_path)
            except Exception:
                pass
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process document: {str(e)}"
        )


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves all indexed documents."""
    stmt = select(Document).order_by(Document.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    documents = result.scalars().all()

    doc_responses = [DocumentResponse(**d.to_dict()) for d in documents]
    return DocumentListResponse(documents=doc_responses, total=len(doc_responses))


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieves details of a specific document."""
    stmt = select(Document).where(Document.id == doc_id)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentResponse(**doc.to_dict())


@router.get("/{doc_id}/file")
async def get_document_file(doc_id: str, db: AsyncSession = Depends(get_db)):
    """Serves the actual PDF file for the PDF viewer."""
    stmt = select(Document).where(Document.id == doc_id)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = Path(doc.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="PDF file missing from storage")

    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=doc.filename,
        headers={"Content-Disposition": f'inline; filename="{doc.filename}"'}
    )


@router.get("/{doc_id}/chunks", response_model=List[DocumentChunkResponse])
async def get_document_chunks(
    doc_id: str,
    page: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """Retrieves chunks of a document, optionally filtered by page number."""
    stmt = select(DocumentChunk).where(DocumentChunk.document_id == doc_id)
    if page is not None:
        stmt = stmt.where(DocumentChunk.page_number == page)
    stmt = stmt.order_by(DocumentChunk.chunk_index.asc())

    result = await db.execute(stmt)
    chunks = result.scalars().all()
    return [DocumentChunkResponse(**c.to_dict()) for c in chunks]


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    """Deletes a document, all its chunks, and its file on disk."""
    stmt = select(Document).where(Document.id == doc_id)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = Path(doc.file_path)
    if file_path.exists():
        try:
            os.remove(file_path)
        except Exception as e:
            logger.warning(f"Could not remove file {file_path}: {e}")

    await db.delete(doc)
    await db.commit()
    return None
