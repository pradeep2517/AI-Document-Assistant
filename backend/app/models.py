import uuid
from datetime import datetime, timezone
import json
from typing import List, Optional, Dict, Any
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String(255), nullable=False)
    file_path = Column(String(1024), nullable=False)
    file_size = Column(Integer, nullable=False, default=0)
    mime_type = Column(String(100), default="application/pdf")
    page_count = Column(Integer, nullable=False, default=0)
    ocr_applied = Column(Boolean, nullable=False, default=False)
    ocr_pages_count = Column(Integer, nullable=False, default=0)
    extracted_chars = Column(Integer, nullable=False, default=0)
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan", lazy="selectin")
    sessions = relationship("ChatSession", back_populates="document")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "filename": self.filename,
            "file_size": self.file_size,
            "mime_type": self.mime_type,
            "page_count": self.page_count,
            "ocr_applied": self.ocr_applied,
            "ocr_pages_count": self.ocr_pages_count,
            "extracted_chars": self.extracted_chars,
            "summary": self.summary,
            "chunks_count": len(self.chunks) if self.chunks else 0,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    page_number = Column(Integer, nullable=False, index=True)
    text = Column(Text, nullable=False)
    token_count = Column(Integer, nullable=False, default=0)
    embedding_json = Column(Text, nullable=False)  # JSON-encoded float list (e.g. 384-d vector)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    document = relationship("Document", back_populates="chunks")

    __table_args__ = (
        Index("idx_doc_chunk_page", "document_id", "page_number"),
    )

    def get_embedding(self) -> List[float]:
        try:
            return json.loads(self.embedding_json)
        except Exception:
            return []

    def set_embedding(self, vector: List[float]):
        self.embedding_json = json.dumps(vector)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "document_id": self.document_id,
            "chunk_index": self.chunk_index,
            "page_number": self.page_number,
            "text": self.text,
            "token_count": self.token_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False, default="New Conversation")
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    document = relationship("Document", back_populates="sessions", lazy="selectin")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan", lazy="selectin", order_by="ChatMessage.created_at")

    def to_dict(self) -> Dict[str, Any]:
        doc_name = None
        try:
            if self.document:
                doc_name = self.document.filename
        except Exception:
            doc_name = None

        return {
            "id": self.id,
            "title": self.title,
            "document_id": self.document_id,
            "document_name": doc_name,
            "messages_count": len(self.messages) if self.messages else 0,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    citations_json = Column(Text, nullable=True)  # JSON list of citation dicts
    feedback = Column(String(10), nullable=True)  # 'up', 'down', None
    model_used = Column(String(50), nullable=True, default="Grounded RAG")
    created_at = Column(DateTime(timezone=True), default=utc_now)

    session = relationship("ChatSession", back_populates="messages")

    def get_citations(self) -> List[Dict[str, Any]]:
        if not self.citations_json:
            return []
        try:
            return json.loads(self.citations_json)
        except Exception:
            return []

    def set_citations(self, citations: List[Dict[str, Any]]):
        self.citations_json = json.dumps(citations)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "session_id": self.session_id,
            "role": self.role,
            "content": self.content,
            "citations": self.get_citations(),
            "feedback": self.feedback,
            "model_used": self.model_used,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
