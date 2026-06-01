from datetime import datetime

from pydantic import BaseModel, Field


class DocumentMetadataFields(BaseModel):
    material_type: str | None = Field(default=None, max_length=32)
    grade: str | None = Field(default=None, max_length=32)
    subject: str | None = Field(default=None, max_length=64)
    lesson: str | None = Field(default=None, max_length=64)
    level: str | None = Field(default=None, max_length=64)
    skill: str | None = Field(default=None, max_length=128)
    vietnamese_level: str | None = Field(default=None, max_length=64)
    region: str | None = Field(default=None, max_length=128)


class RagMetadataFilter(DocumentMetadataFields):
    """Filter metadata tùy chọn khi chat RAG."""


class DocumentResponse(BaseModel):
    id: int
    title: str
    description: str | None
    original_filename: str
    rag_document_id: str
    material_type: str | None = None
    grade: str | None = None
    subject: str | None = None
    lesson: str | None = None
    level: str | None = None
    skill: str | None = None
    vietnamese_level: str | None = None
    region: str | None = None
    version: int = 1
    content_hash: str | None = None
    last_indexed_at: datetime | None = None
    uploaded_by_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    material_type: str | None = Field(default=None, max_length=32)
    grade: str | None = Field(default=None, max_length=32)
    subject: str | None = Field(default=None, max_length=64)
    lesson: str | None = Field(default=None, max_length=64)
    level: str | None = Field(default=None, max_length=64)
    skill: str | None = Field(default=None, max_length=128)
    vietnamese_level: str | None = Field(default=None, max_length=64)
    region: str | None = Field(default=None, max_length=128)


class MaterialTypeOption(BaseModel):
    value: str
    label: str
