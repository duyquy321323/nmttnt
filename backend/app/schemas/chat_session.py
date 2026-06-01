from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.schemas.document import RagMetadataFilter


class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    from_rag: bool
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("role", mode="before")
    @classmethod
    def normalize_role(cls, value: object) -> str:
        if hasattr(value, "value"):
            return str(value.value)
        return str(value)


class ChatSessionResponse(BaseModel):
    id: int
    title: str
    is_shared: bool
    share_token: str | None
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    model_config = {"from_attributes": True}


class ChatSessionDetailResponse(ChatSessionResponse):
    messages: list[ChatMessageResponse]


class ChatSessionCreateRequest(BaseModel):
    title: str = Field(default="Cuộc trò chuyện mới", max_length=255)


class ChatSessionUpdateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)


class SessionChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    metadata_filter: RagMetadataFilter | None = None


class ShareLinkResponse(BaseModel):
    share_token: str
    share_url: str
    is_shared: bool
