from pydantic import BaseModel

from app.schemas.document import RagMetadataFilter


class ChatRequest(BaseModel):
    message: str
    metadata_filter: RagMetadataFilter | None = None
