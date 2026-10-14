from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class Citation(BaseModel):
    chunk_id: str
    page_number: int
    snippet: str
    score: float = Field(..., description="Cosine similarity score (0 to 1)")


class DocumentResponse(BaseModel):
    id: str
    filename: str
    file_size: int
    mime_type: str
    page_count: int
    ocr_applied: bool
    ocr_pages_count: int
    extracted_chars: int
    summary: Optional[str] = None
    chunks_count: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
    total: int


class DocumentChunkResponse(BaseModel):
    id: str
    document_id: str
    chunk_index: int
    page_number: int
    text: str
    token_count: int
    created_at: Optional[str] = None


class SearchQuery(BaseModel):
    query: str
    document_id: Optional[str] = None
    top_k: int = 5
    similarity_threshold: Optional[float] = None


class SearchResult(BaseModel):
    chunk_id: str
    document_id: str
    page_number: int
    text: str
    score: float


class ChatMessageCreate(BaseModel):
    content: str
    session_id: Optional[str] = None
    document_id: Optional[str] = None
    model: Optional[str] = "Local / Ollama"


class ChatMessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    citations: List[Citation] = []
    feedback: Optional[str] = None
    model_used: Optional[str] = None
    created_at: Optional[str] = None


class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Conversation"
    document_id: Optional[str] = None


class ChatSessionResponse(BaseModel):
    id: str
    title: str
    document_id: Optional[str] = None
    document_name: Optional[str] = None
    messages_count: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    messages: Optional[List[ChatMessageResponse]] = None


class FeedbackRequest(BaseModel):
    feedback: Optional[str] = Field(None, pattern="^(up|down|clear)$")


class TextActionRequest(BaseModel):
    text: str
    action: str = Field(..., description="'explain', 'summarise', or 'rewrite'")
    document_id: Optional[str] = None
    page_number: Optional[int] = None
