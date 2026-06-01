from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    original_filename: Mapped[str] = mapped_column(String(255))
    storage_filename: Mapped[str] = mapped_column(String(255), unique=True)
    rag_document_id: Mapped[str] = mapped_column(String(64), index=True)
    file_path: Mapped[str] = mapped_column(String(512))
    material_type: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    grade: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    subject: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    lesson: Mapped[str | None] = mapped_column(String(64), nullable=True)
    level: Mapped[str | None] = mapped_column(String(64), nullable=True)
    skill: Mapped[str | None] = mapped_column(String(128), nullable=True)
    vietnamese_level: Mapped[str | None] = mapped_column(String(64), nullable=True)
    region: Mapped[str | None] = mapped_column(String(128), nullable=True)
    version: Mapped[int] = mapped_column(default=1, server_default="1")
    content_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    last_indexed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    uploaded_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    uploaded_by = relationship("User", back_populates="documents")

    def metadata_dict(self) -> dict[str, str]:
        """Metadata RAG lấy từ bản ghi tài liệu."""
        raw = {
            "material_type": self.material_type,
            "grade": self.grade,
            "subject": self.subject,
            "lesson": self.lesson,
            "level": self.level,
            "skill": self.skill,
            "vietnamese_level": self.vietnamese_level,
            "region": self.region,
        }
        return {key: value for key, value in raw.items() if value}
