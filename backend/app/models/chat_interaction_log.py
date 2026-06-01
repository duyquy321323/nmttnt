"""Log tương tác chat — failed questions, re-ask, fallback."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ChatInteractionLog(Base):
    __tablename__ = "chat_interaction_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    session_id: Mapped[int | None] = mapped_column(
        ForeignKey("chat_sessions.id"), nullable=True, index=True
    )
    question: Mapped[str] = mapped_column(Text)
    normalized_question: Mapped[str] = mapped_column(Text)
    answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    from_rag: Mapped[bool] = mapped_column(Boolean, default=False)
    fallback_reason: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    needs_clarification: Mapped[bool] = mapped_column(Boolean, default=False)
    is_reask: Mapped[bool] = mapped_column(Boolean, default=False)
    subject: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    lesson: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    grade: Mapped[str | None] = mapped_column(String(32), nullable=True)
    prompt_version: Mapped[str | None] = mapped_column(String(16), nullable=True)
    document_versions: Mapped[str | None] = mapped_column(Text, nullable=True)
    rag_score: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), index=True
    )
