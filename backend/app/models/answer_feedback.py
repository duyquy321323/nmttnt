"""Đánh giá câu trả lời — giáo viên / học sinh."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AnswerFeedback(Base):
    __tablename__ = "answer_feedbacks"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    interaction_log_id: Mapped[int] = mapped_column(
        ForeignKey("chat_interaction_logs.id"), index=True
    )
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    rating: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
