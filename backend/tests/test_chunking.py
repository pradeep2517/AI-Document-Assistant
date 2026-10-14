import pytest
from app.services.chunking import split_text_recursive, chunk_document_pages


def test_split_text_recursive():
    """Tests that recursive text splitting handles sentence and paragraph breaks."""
    text = (
        "Paragraph one is introducing a key concept in document AI. It explains embeddings.\n\n"
        "Paragraph two discusses vector search using pgvector and high-dimensional indexes. "
        "Cosine similarity enables fast semantic retrieval across thousands of document segments."
    )
    chunks = split_text_recursive(text, max_chunk_size=120, chunk_overlap=20)
    assert len(chunks) >= 2
    for c in chunks:
        assert len(c) <= 150  # within margin of separator retention


def test_chunk_document_pages():
    """Verifies that chunks maintain exact 1-indexed page references for grounded citations."""
    pages = [
        {"page_number": 1, "text": "Page one content with introductory facts about energy."},
        {"page_number": 2, "text": "Page two content with transformer architecture specifications."}
    ]
    chunks = chunk_document_pages(pages, chunk_size=300, chunk_overlap=50)

    assert len(chunks) >= 2
    assert chunks[0].page_number == 1
    assert chunks[0].chunk_index == 0
    assert chunks[-1].page_number == 2
    assert chunks[-1].chunk_index == len(chunks) - 1
    assert chunks[0].token_count > 0
