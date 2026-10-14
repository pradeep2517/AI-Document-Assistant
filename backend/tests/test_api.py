import os
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient):
    """Verifies API health diagnostic endpoint."""
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert "database" in data
    assert "ocr_engine" in data
    assert "embedding_engine" in data


@pytest.mark.asyncio
async def test_upload_and_chat_flow(client: AsyncClient, sample_pdf_path: str):
    """Verifies complete upload, retrieval, and citation QA workflow."""
    # 1. Upload sample PDF
    with open(sample_pdf_path, "rb") as f:
        files = {"file": ("renewable_energy.pdf", f, "application/pdf")}
        upload_resp = await client.post("/api/v1/documents/upload", files=files)

    assert upload_resp.status_code == 201
    doc_data = upload_resp.json()
    doc_id = doc_data["id"]
    assert doc_data["filename"] == "renewable_energy.pdf"
    assert doc_data["page_count"] == 3
    assert doc_data["chunks_count"] >= 3

    # 2. List documents
    list_resp = await client.get("/api/v1/documents")
    assert list_resp.status_code == 200
    assert any(d["id"] == doc_id for d in list_resp.json()["documents"])

    # 3. Retrieve chunks
    chunks_resp = await client.get(f"/api/v1/documents/{doc_id}/chunks")
    assert chunks_resp.status_code == 200
    chunks = chunks_resp.json()
    assert len(chunks) >= 3
    assert chunks[0]["page_number"] == 1

    # 4. Ask a question grounded in the document
    chat_resp = await client.post(
        "/api/v1/chat/message",
        json={
            "content": "What is the proposed system architecture for grid stability?",
            "document_id": doc_id,
            "model": "GPT-4"
        }
    )
    assert chat_resp.status_code == 200
    chat_data = chat_resp.json()
    assert "content" in chat_data
    assert len(chat_data["citations"]) > 0
    message_id = chat_data["id"]

    # 5. Record feedback
    feedback_resp = await client.post(
        f"/api/v1/chat/message/{message_id}/feedback",
        json={"feedback": "up"}
    )
    assert feedback_resp.status_code == 200
    assert feedback_resp.json()["feedback"] == "up"

    # 6. Text action (inline selection popup)
    action_resp = await client.post(
        "/api/v1/chat/text-action",
        json={
            "text": "The dual-branch transformer models meteorological forecasts.",
            "action": "explain",
            "page_number": 2
        }
    )
    assert action_resp.status_code == 200
    assert "result" in action_resp.json()


@pytest.mark.asyncio
async def test_invalid_upload_format(client: AsyncClient):
    """Verifies that non-PDF files are rejected with a 400 error."""
    files = {"file": ("malicious_script.exe", b"fake binary data", "application/octet-stream")}
    resp = await client.post("/api/v1/documents/upload", files=files)
    assert resp.status_code == 400
    assert "PDF" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_empty_chat_message(client: AsyncClient):
    """Verifies that empty messages are rejected."""
    resp = await client.post(
        "/api/v1/chat/message",
        json={"content": "   "}
    )
    assert resp.status_code == 400
