from fastapi import APIRouter, Depends

from app.db.session import get_db
from app.requests import ChatRequest
from app.services.chat_pipeline import process_chat
from sqlalchemy.orm import Session

chat_router = APIRouter()


@chat_router.post("/chat")
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    explicit = (
        request.metadata_filter.model_dump(exclude_none=True)
        if request.metadata_filter
        else None
    )
    return await process_chat(
        db,
        message=request.message,
        explicit_metadata_filter=explicit,
    )
