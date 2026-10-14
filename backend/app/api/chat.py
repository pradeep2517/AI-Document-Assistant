import uuid
import logging
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import ChatSession, ChatMessage, Document
from app.schemas import (
    ChatMessageCreate,
    ChatMessageResponse,
    ChatSessionCreate,
    ChatSessionResponse,
    FeedbackRequest,
    TextActionRequest,
)
from app.services.vector_store import search_similar_chunks
from app.services.rag_service import answer_question_with_rag, process_text_action
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.get("/sessions", response_model=List[ChatSessionResponse])
async def list_chat_sessions(db: AsyncSession = Depends(get_db)):
    """Lists all chat sessions ordered by latest activity."""
    stmt = select(ChatSession).order_by(ChatSession.updated_at.desc())
    result = await db.execute(stmt)
    sessions = result.scalars().all()
    return [ChatSessionResponse(**s.to_dict()) for s in sessions]


@router.post("/sessions", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_chat_session(
    data: ChatSessionCreate,
    db: AsyncSession = Depends(get_db)
):
    """Creates a new conversation session."""
    session = ChatSession(
        id=str(uuid.uuid4()),
        title=data.title or "New Conversation",
        document_id=data.document_id,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return ChatSessionResponse(**session.to_dict())


@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
async def get_chat_session(session_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieves a specific chat session with its full message history."""
    stmt = select(ChatSession).where(ChatSession.id == session_id)
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    session_dict = session.to_dict()
    session_dict["messages"] = [m.to_dict() for m in session.messages]
    return ChatSessionResponse(**session_dict)


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat_session(session_id: str, db: AsyncSession = Depends(get_db)):
    """Deletes a chat session and all its messages."""
    stmt = select(ChatSession).where(ChatSession.id == session_id)
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    await db.delete(session)
    await db.commit()
    return None


@router.post("/message", response_model=ChatMessageResponse)
async def send_chat_message(
    data: ChatMessageCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Submits a user question, retrieves relevant document chunks via pgvector/embeddings,
    generates a grounded answer with page citations, and saves everything to history.
    """
    user_query = data.content.strip()
    if not user_query:
        raise HTTPException(status_code=400, detail="Message content cannot be empty.")

    # 1. Resolve or create ChatSession
    session_id = data.session_id
    session = None
    if session_id:
        stmt = select(ChatSession).where(ChatSession.id == session_id)
        res = await db.execute(stmt)
        session = res.scalar_one_or_none()

    if not session:
        # Create new session
        session_id = str(uuid.uuid4())
        session = ChatSession(
            id=session_id,
            title="New Conversation",
            document_id=data.document_id
        )
        db.add(session)
        await db.flush()

    # Link document if provided
    if data.document_id and not session.document_id:
        session.document_id = data.document_id

    # 2. Save user message
    user_msg_id = str(uuid.uuid4())
    user_msg = ChatMessage(
        id=user_msg_id,
        session_id=session_id,
        role="user",
        content=user_query,
        model_used=data.model or "User"
    )
    db.add(user_msg)

    # Auto-generate a smart title from the first question if currently default
    if session.title in ("New Conversation", "Untitled") or len(session.messages) <= 1:
        words = user_query.split()
        cleaned_title = " ".join(words[:5])
        if len(words) > 5:
            cleaned_title += "..."
        session.title = cleaned_title.capitalize()

    # 3. Retrieve relevant chunks from vector store
    target_doc_id = data.document_id or session.document_id
    retrieved_chunks = await search_similar_chunks(
        session=db,
        query_text=user_query,
        document_id=target_doc_id,
        top_k=settings.TOP_K_CHUNKS,
        similarity_threshold=settings.SIMILARITY_THRESHOLD
    )

    # 4. Generate grounded RAG answer
    rag_result = await answer_question_with_rag(
        question=user_query,
        retrieved_chunks=retrieved_chunks,
        requested_model=data.model or "GPT-4"
    )

    # 5. Save assistant message
    asst_msg_id = str(uuid.uuid4())
    asst_msg = ChatMessage(
        id=asst_msg_id,
        session_id=session_id,
        role="assistant",
        content=rag_result["answer"],
        model_used=rag_result["model_used"]
    )
    asst_msg.set_citations(rag_result["citations"])
    db.add(asst_msg)

    # Update session timestamp
    session.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(asst_msg)

    return ChatMessageResponse(**asst_msg.to_dict())


@router.post("/message/{message_id}/feedback")
async def record_feedback(
    message_id: str,
    feedback_req: FeedbackRequest,
    db: AsyncSession = Depends(get_db)
):
    """Records user feedback (thumbs up / thumbs down) on an assistant message."""
    stmt = select(ChatMessage).where(ChatMessage.id == message_id)
    result = await db.execute(stmt)
    msg = result.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    msg.feedback = None if feedback_req.feedback == "clear" else feedback_req.feedback
    await db.commit()
    return {"status": "success", "message_id": message_id, "feedback": msg.feedback}


@router.post("/text-action")
async def execute_text_action(data: TextActionRequest):
    """
    Executes instant inline document actions: 'explain', 'summarise', or 'rewrite'
    for selected passages in the PDF viewer.
    """
    result = await process_text_action(
        text=data.text,
        action=data.action,
        page_number=data.page_number
    )
    return {
        "action": data.action,
        "original_text": data.text,
        "page_number": data.page_number,
        "result": result
    }


@router.get("/models/status")
async def get_models_status():
    """Returns availability of Local Ollama and Google Gemini configurations."""
    import httpx
    ollama_online = False
    ollama_models = []

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/tags")
            if resp.status_code == 200:
                ollama_online = True
                data = resp.json()
                ollama_models = [m.get("name") for m in data.get("models", [])]
    except Exception:
        ollama_online = False

    return {
        "ollama_online": ollama_online,
        "ollama_models": ollama_models or ["mistral:latest"],
        "gemini_configured": bool(settings.GEMINI_API_KEY.strip()),
        "gemini_model": settings.GEMINI_MODEL,
        "default_ollama_model": "mistral:latest"
    }


@router.post("/models/gemini-key")
async def set_gemini_key(data: dict):
    """Dynamically sets or updates the Gemini API key at runtime."""
    new_key = data.get("api_key", "").strip()
    if new_key:
        settings.GEMINI_API_KEY = new_key
        return {"status": "success", "gemini_configured": True}
    return {"status": "cleared", "gemini_configured": False}

