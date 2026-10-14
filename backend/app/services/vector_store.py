import logging
from typing import List, Dict, Any, Optional
import numpy as np
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import DocumentChunk
from app.services.embedding_service import embed_text, cosine_similarity
from app.database import is_postgres_active
from app.config import settings

logger = logging.getLogger(__name__)


async def search_similar_chunks(
    session: AsyncSession,
    query_text: str,
    document_id: Optional[str] = None,
    top_k: int = 5,
    similarity_threshold: float = settings.SIMILARITY_THRESHOLD
) -> List[Dict[str, Any]]:
    """
    Retrieves the most semantically relevant document chunks for a given query text.
    Uses pgvector when running against PostgreSQL, or optimized vector cosine
    similarity when running on SQLite.
    """
    if not query_text.strip():
        return []

    # 1. Generate embedding for query
    query_vec = embed_text(query_text)
    if not query_vec:
        return []

    # 2. Check if pgvector native query can be used
    if is_postgres_active:
        try:
            # Query pgvector with cosine distance (<=>)
            query_vec_str = f"[{','.join(str(x) for x in query_vec)}]"
            sql = """
                SELECT id, document_id, chunk_index, page_number, text,
                       1 - (embedding <=> :query_vec::vector) AS score
                FROM document_chunks
            """
            params: Dict[str, Any] = {"query_vec": query_vec_str, "top_k": top_k}
            
            if document_id:
                sql += " WHERE document_id = :doc_id"
                params["doc_id"] = document_id

            sql += " ORDER BY embedding <=> :query_vec::vector ASC LIMIT :top_k"

            result = await session.execute(text(sql), params)
            rows = result.fetchall()

            hits = []
            for r in rows:
                score = float(r.score)
                hits.append({
                    "chunk_id": str(r.id),
                    "document_id": str(r.document_id),
                    "chunk_index": int(r.chunk_index),
                    "page_number": int(r.page_number),
                    "text": str(r.text),
                    "score": round(score, 4),
                })
            # Filter by threshold if matches exist, otherwise keep top matches
            filtered = [h for h in hits if h["score"] >= similarity_threshold]
            if filtered:
                return filtered[:top_k]
            elif hits:
                return hits[:top_k]
        except Exception as pg_err:
            logger.warning(f"pgvector query attempt failed ({pg_err}). Falling back to in-memory cosine matching.")

    # 3. Fallback / SQLite vector search
    stmt = select(DocumentChunk)
    if document_id:
        stmt = stmt.where(DocumentChunk.document_id == document_id)

    db_result = await session.execute(stmt)
    all_chunks = db_result.scalars().all()

    if not all_chunks:
        return []

    query_arr = np.array(query_vec, dtype=np.float32)
    q_norm = np.linalg.norm(query_arr)
    if q_norm == 0:
        return []

    scored_chunks = []
    all_scored = []
    for chunk in all_chunks:
        emb = chunk.get_embedding()
        if not emb or len(emb) != len(query_vec):
            continue

        c_arr = np.array(emb, dtype=np.float32)
        c_norm = np.linalg.norm(c_arr)
        if c_norm == 0:
            continue

        sim = float(np.dot(query_arr, c_arr) / (q_norm * c_norm))
        chunk_dict = {
            "chunk_id": chunk.id,
            "document_id": chunk.document_id,
            "chunk_index": chunk.chunk_index,
            "page_number": chunk.page_number,
            "text": chunk.text,
            "score": round(sim, 4),
        }
        all_scored.append(chunk_dict)
        if sim >= similarity_threshold:
            scored_chunks.append(chunk_dict)

    # Sort all chunks descending by similarity
    all_scored.sort(key=lambda x: x["score"], reverse=True)

    # If threshold filtered everything out, take the closest chunks from the document
    if not scored_chunks and all_scored:
        scored_chunks = all_scored[:top_k]
    else:
        scored_chunks.sort(key=lambda x: x["score"], reverse=True)
        scored_chunks = scored_chunks[:top_k]

    # For broad/overview queries (topic, title, summary, content, what is this),
    # ensure Page 1 introductory chunk is present so the model knows the document topic
    query_lower = query_text.lower()
    is_overview_query = any(w in query_lower for w in [
        "topic", "title", "subject", "pdf", "document", "about", "summary",
        "summarize", "overview", "what is this", "content", "tell", "name"
    ])
    if is_overview_query and all_chunks:
        has_page_1 = any(c["page_number"] == 1 for c in scored_chunks)
        if not has_page_1:
            p1_chunk = next((c for c in all_chunks if c.page_number == 1), None)
            if p1_chunk:
                scored_chunks.insert(0, {
                    "chunk_id": p1_chunk.id,
                    "document_id": p1_chunk.document_id,
                    "chunk_index": p1_chunk.chunk_index,
                    "page_number": 1,
                    "text": p1_chunk.text,
                    "score": 0.99,
                })
                scored_chunks = scored_chunks[:top_k + 1]

    return scored_chunks
