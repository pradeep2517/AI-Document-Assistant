import pytest
from app.services.embedding_service import (
    embed_text,
    embed_batch,
    cosine_similarity,
    _fallback_embed
)
from app.config import settings


def test_embed_text_dimension():
    """Ensures embedding returns a float vector matching expected dimensionality (384)."""
    vec = embed_text("Contrastive learning on power grid networks.")
    assert isinstance(vec, list)
    assert len(vec) == settings.EMBEDDING_DIM
    assert all(isinstance(x, float) for x in vec)


def test_embed_batch():
    """Tests batch embedding generation."""
    texts = [
        "Solar irradiance forecasting.",
        "Wind turbine power curves.",
        "Substation fault detection."
    ]
    embs = embed_batch(texts)
    assert len(embs) == 3
    for emb in embs:
        assert len(emb) == settings.EMBEDDING_DIM


def test_cosine_similarity():
    """Tests mathematical correctness of cosine similarity."""
    # Identical vectors should have similarity 1.0
    v1 = [1.0, 0.0, 0.0]
    v2 = [1.0, 0.0, 0.0]
    assert pytest.approx(cosine_similarity(v1, v2), 0.001) == 1.0

    # Orthogonal vectors should have similarity 0.0
    v3 = [0.0, 1.0, 0.0]
    assert pytest.approx(cosine_similarity(v1, v3), 0.001) == 0.0


def test_deterministic_fallback():
    """Verifies fallback encoder produces deterministic normalized vectors."""
    v1 = _fallback_embed("smart grid resilience")
    v2 = _fallback_embed("smart grid resilience")
    v3 = _fallback_embed("unrelated biological text")

    assert len(v1) == settings.EMBEDDING_DIM
    assert pytest.approx(cosine_similarity(v1, v2), 0.0001) == 1.0
    assert cosine_similarity(v1, v3) < 0.9
