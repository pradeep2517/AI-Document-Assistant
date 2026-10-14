import logging
import uuid
import shutil
from pathlib import Path
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Document, DocumentChunk, ChatSession, ChatMessage
from app.services.pdf_processor import extract_text_from_pdf
from app.services.chunking import chunk_document_pages
from app.services.embedding_service import embed_batch
from app.config import settings

logger = logging.getLogger(__name__)


async def seed_database_if_empty(db: AsyncSession):
    """
    Seeds initial documents and chat sessions so reviewers and users
    have an immediately interactive, portfolio-grade experience upon launch.
    """
    # Check if documents already exist
    doc_count_res = await db.execute(select(func.count(Document.id)))
    if (doc_count_res.scalar() or 0) > 0:
        logger.info("Database already contains documents. Skipping initial seed.")
        return

    logger.info("Seeding initial documents and conversation history...")

    sample_files = [
        settings.SAMPLE_DIR / "The Future of Renewable Energy.pdf",
        settings.SAMPLE_DIR / "Cognitive Behavioral Therapy.pdf",
    ]

    indexed_docs = {}

    for sample_path in sample_files:
        if not sample_path.exists():
            continue

        doc_id = str(uuid.uuid4())
        dest_filename = f"{doc_id}_{sample_path.name}"
        dest_path = settings.UPLOAD_DIR / dest_filename
        shutil.copy2(sample_path, dest_path)

        pdf_result = extract_text_from_pdf(dest_path)
        file_size = dest_path.stat().st_size

        doc = Document(
            id=doc_id,
            filename=sample_path.name,
            file_path=str(dest_path),
            file_size=file_size,
            mime_type="application/pdf",
            page_count=pdf_result.page_count,
            ocr_applied=pdf_result.ocr_applied,
            ocr_pages_count=len(pdf_result.ocr_pages),
            extracted_chars=pdf_result.extracted_chars,
            summary=pdf_result.summary
        )
        db.add(doc)
        await db.flush()

        # Chunk & Embed
        chunk_items = chunk_document_pages(pdf_result.pages, settings.CHUNK_SIZE, settings.CHUNK_OVERLAP)
        chunk_texts = [c.text for c in chunk_items]
        embeddings = embed_batch(chunk_texts)

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
        await db.flush()
        indexed_docs[sample_path.name] = (doc, chunk_records)

    # Seed Conversation History
    now = datetime.now(timezone.utc)
    yesterday = now - timedelta(days=1)

    # Conversation 1: The Culinary World Tour
    s0 = ChatSession(
        id=str(uuid.uuid4()),
        title="The Culinary World Tour",
        document_id=None,
        created_at=now - timedelta(minutes=45),
        updated_at=now - timedelta(minutes=45)
    )
    db.add(s0)

    # Conversation 2: Cognitive Behavioral Therapy
    cbt_doc, _ = indexed_docs.get("Cognitive Behavioral Therapy.pdf", (None, []))
    s1 = ChatSession(
        id=str(uuid.uuid4()),
        title="Cognitive Behavioral Therapy",
        document_id=cbt_doc.id if cbt_doc else None,
        created_at=now - timedelta(hours=2),
        updated_at=now - timedelta(hours=2)
    )
    db.add(s1)

    # Conversation 3: The Future of Renewable Energy (Active matching reference UI)
    re_doc, re_chunks = indexed_docs.get("The Future of Renewable Energy.pdf", (None, []))
    if re_doc:
        s2_id = str(uuid.uuid4())
        s2 = ChatSession(
            id=s2_id,
            title="The Future of Renewable Energy",
            document_id=re_doc.id,
            created_at=now - timedelta(minutes=10),
            updated_at=now - timedelta(minutes=2)
        )
        db.add(s2)
        await db.flush()

        # Assistant Greeting
        m1 = ChatMessage(
            id=str(uuid.uuid4()),
            session_id=s2_id,
            role="assistant",
            content=(
                "Hello, I am a multilingual document assistant. I am here to assist you with any questions you may have regarding your uploaded document.\n\n"
                "This insightful report provides an in-depth exploration of the latest innovations and trends in renewable energy. "
                "Highlighting groundbreaking technologies and strategies, it paints a picture of a sustainable and green future where energy is abundant and clean."
            ),
            model_used="AskYourPDF Bot",
            created_at=now - timedelta(minutes=9)
        )
        db.add(m1)

        # User Question
        m2 = ChatMessage(
            id=str(uuid.uuid4()),
            session_id=s2_id,
            role="user",
            content="Tell me more about these innovations",
            model_used="User",
            created_at=now - timedelta(minutes=5)
        )
        db.add(m2)

        # Assistant Grounded Answer with Citations
        m3 = ChatMessage(
            id=str(uuid.uuid4()),
            session_id=s2_id,
            role="assistant",
            content=(
                "Based on the strategic technology assessment report, here are the key innovations in renewable energy:\n\n"
                "• **Dual-Branch Spatial-Temporal Transformers**: The proposed architecture processes meteorological forecasts (solar irradiance, wind velocity) and real-time sub-station voltage profiles to forecast solar generation with a **24.3% error reduction** **[Page 1]**.\n\n"
                "• **High-Frequency Telemetry Ingestion**: A distributed network of 144 phasor measurement units (PMUs) samples active power and frequency at 60 Hz, partitioning data into 15-minute observation windows **[Page 2]**.\n\n"
                "• **Contrastive Latent Space Embeddings**: Telemetry windows are mapped into a 384-dimensional dense vector space where cosine similarity directly measures grid stability margins **[Page 2]**.\n\n"
                "• **Automated Battery Dispatch**: When stability margins drop below 0.35, autonomous reserve injection commands are dispatched to battery energy storage systems (BESS) **[Page 2]**.\n\n"
                "• **Economic and Environmental Impact**: Tested across 12 microgrids, demonstrating an 18.4% improvement in battery lifespan and $340,000 in annual cost savings per facility **[Page 3]**."
            ),
            model_used="GPT-4 (Grounded RAG)",
            created_at=now - timedelta(minutes=4)
        )
        # Citations metadata
        citations_data = []
        for c in re_chunks[:3]:
            citations_data.append({
                "chunk_id": c.id,
                "page_number": c.page_number,
                "snippet": c.text[:180] + "...",
                "score": 0.89 if c.page_number == 1 else 0.94
            })
        m3.set_citations(citations_data)
        db.add(m3)

    # Yesterday's history items
    s3 = ChatSession(
        id=str(uuid.uuid4()),
        title="Biodiversity in the Rainforest",
        document_id=None,
        created_at=yesterday,
        updated_at=yesterday
    )
    db.add(s3)

    await db.commit()
    logger.info("Database successfully seeded with realistic sample documents and conversations.")
