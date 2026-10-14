import subprocess
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db, is_postgres_active
from app.models import Document, DocumentChunk
from app.services.embedding_service import get_embedding_model
from app.config import settings

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Health check endpoint providing runtime diagnostics."""
    # Check DB
    try:
        doc_count_res = await db.execute(select(func.count(Document.id)))
        total_docs = doc_count_res.scalar() or 0
        chunk_count_res = await db.execute(select(func.count(DocumentChunk.id)))
        total_chunks = chunk_count_res.scalar() or 0
        db_status = "connected"
    except Exception as db_err:
        total_docs = 0
        total_chunks = 0
        db_status = f"error: {str(db_err)}"

    # Check Tesseract
    tesseract_version = "not available"
    try:
        proc = subprocess.run(
            [settings.TESSERACT_CMD, "--version"],
            capture_output=True,
            text=True,
            timeout=3
        )
        if proc.returncode == 0:
            tesseract_version = proc.stdout.split("\n")[0].strip()
    except Exception:
        pass

    # Check Embedding Engine
    _, backend_type = get_embedding_model()

    return {
        "status": "healthy",
        "version": settings.VERSION,
        "database": {
            "type": "PostgreSQL (pgvector)" if is_postgres_active else "SQLite (Fallback Vector)",
            "status": db_status,
            "total_documents": total_docs,
            "total_chunks": total_chunks,
        },
        "ocr_engine": {
            "name": "Tesseract OCR",
            "version": tesseract_version,
            "enabled": True,
        },
        "embedding_engine": {
            "model": settings.EMBEDDING_MODEL_NAME,
            "dimension": settings.EMBEDDING_DIM,
            "backend": backend_type,
        },
        "llm_provider": settings.LLM_PROVIDER,
    }
