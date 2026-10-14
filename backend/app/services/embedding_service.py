import hashlib
import logging
import math
from typing import List
import numpy as np
from app.config import settings

logger = logging.getLogger(__name__)

_embedding_model = None
_backend_type = None


def get_embedding_model():
    """
    Initializes and caches the embedding model.
    Prefers FastEmbed (ONNX based Sentence-Transformers all-MiniLM-L6-v2)
    or falls back to sentence_transformers or a deterministic vector fallback.
    """
    global _embedding_model, _backend_type
    if _embedding_model is not None:
        return _embedding_model, _backend_type

    # Option 1: Try FastEmbed
    try:
        from fastembed import TextEmbedding
        logger.info(f"Loading FastEmbed model: {settings.EMBEDDING_MODEL_NAME}...")
        _embedding_model = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
        _backend_type = "fastembed"
        logger.info("Successfully loaded FastEmbed embedding model.")
        return _embedding_model, _backend_type
    except Exception as fe_err:
        logger.warning(f"FastEmbed not available or failed to load ({fe_err}). Trying sentence-transformers...")

    # Option 2: Try SentenceTransformer
    try:
        from sentence_transformers import SentenceTransformer
        logger.info(f"Loading SentenceTransformer: {settings.EMBEDDING_MODEL_NAME}...")
        _embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
        _backend_type = "sentence_transformers"
        logger.info("Successfully loaded SentenceTransformer embedding model.")
        return _embedding_model, _backend_type
    except Exception as st_err:
        logger.warning(f"SentenceTransformer not available ({st_err}). Falling back to deterministic semantic encoder.")

    _backend_type = "fallback"
    return None, _backend_type


def _fallback_embed(text: str, dim: int = 384) -> List[float]:
    """
    Deterministic dense semantic embedding generator for offline testing or fallback.
    Produces unit-normalized 384-dimensional dense vectors preserving word hash distribution.
    """
    tokens = text.lower().split()
    vec = np.zeros(dim, dtype=np.float32)
    for token in tokens:
        h = int(hashlib.sha256(token.encode("utf-8")).hexdigest(), 16)
        idx = h % dim
        sign = 1.0 if ((h >> 8) % 2 == 0) else -1.0
        weight = 1.0 / (1.0 + math.log(1.0 + len(token)))
        vec[idx] += sign * weight

    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    else:
        vec[0] = 1.0
    return vec.tolist()


def embed_text(text: str) -> List[float]:
    """Generates a 384-dimensional embedding for a single text."""
    if not text.strip():
        return [0.0] * settings.EMBEDDING_DIM

    model, backend = get_embedding_model()
    try:
        if backend == "fastembed":
            # fastembed embed returns a generator of numpy arrays
            embeddings = list(model.embed([text]))
            return embeddings[0].tolist()
        elif backend == "sentence_transformers":
            emb = model.encode(text, normalize_embeddings=True)
            return emb.tolist()
    except Exception as e:
        logger.warning(f"Embedding failed with {backend}: {e}. Using fallback encoder.")

    return _fallback_embed(text, settings.EMBEDDING_DIM)


def embed_batch(texts: List[str]) -> List[List[float]]:
    """Generates embeddings for a batch of texts in one efficient pass."""
    if not texts:
        return []

    model, backend = get_embedding_model()
    try:
        if backend == "fastembed":
            embeddings = list(model.embed(texts))
            return [e.tolist() for e in embeddings]
        elif backend == "sentence_transformers":
            embs = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
            return [e.tolist() for e in embs]
    except Exception as e:
        logger.warning(f"Batch embedding failed with {backend}: {e}. Using fallback encoder.")

    return [_fallback_embed(t, settings.EMBEDDING_DIM) for t in texts]


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Calculates cosine similarity between two unit vectors."""
    a = np.array(vec_a, dtype=np.float32)
    b = np.array(vec_b, dtype=np.float32)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))
