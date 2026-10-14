import pytest
from app.services.rag_service import (
    generate_grounded_synthesis,
    extract_citations,
    answer_question_with_rag,
    process_text_action
)


def test_extract_citations():
    """Tests citation creation from retrieved chunks."""
    chunks = [
        {"chunk_id": "c1", "page_number": 2, "text": "Telemetry telemetry data is analyzed.", "score": 0.88},
        {"chunk_id": "c2", "page_number": 3, "text": "Experimental results demonstrate 24% error reduction.", "score": 0.79}
    ]
    citations = extract_citations(chunks)
    assert len(citations) == 2
    assert citations[0].page_number == 2
    assert citations[0].score == 0.88
    assert citations[1].page_number == 3


def test_generate_grounded_synthesis():
    """Ensures grounded synthesis includes exact bracket page references."""
    chunks = [
        {
            "chunk_id": "c1",
            "page_number": 2,
            "text": "The dual-branch transformer models meteorological forecasts and telemetry data.",
            "score": 0.85
        }
    ]
    ans = generate_grounded_synthesis("How does the transformer work?", chunks)
    assert "[Page 2]" in ans
    assert "Grounding Verification" in ans


@pytest.mark.asyncio
async def test_answer_question_with_rag():
    """Tests end-to-end RAG answer generation with citations."""
    chunks = [
        {
            "chunk_id": "c1",
            "page_number": 1,
            "text": "Renewable energy distribution relies on solar and wind balancing.",
            "score": 0.91
        }
    ]
    result = await answer_question_with_rag("What does energy distribution rely on?", chunks, "GPT-4")
    assert "answer" in result
    assert len(result["citations"]) == 1
    assert result["citations"][0]["page_number"] == 1
    assert "GPT-4" in result["model_used"]


@pytest.mark.asyncio
async def test_process_text_actions():
    """Tests interactive actions: explain, summarise, and rewrite."""
    text = "Machine learning models forecast solar irradiance and prevent grid instability."
    
    explanation = await process_text_action(text, "explain", page_number=2)
    assert "explain" in explanation.lower() or "excerpt" in explanation.lower()
    assert len(explanation) > 20

    summary = await process_text_action(text, "summarise", page_number=2)
    assert len(summary) > 20

    rewrite = await process_text_action(text, "rewrite", page_number=2)
    assert len(rewrite) > 20
