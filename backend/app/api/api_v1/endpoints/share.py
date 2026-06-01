from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.chat_session import ChatMessageResponse, ChatSessionDetailResponse
from app.services.chat_session_service import ChatSessionService

share_router = APIRouter()
session_service = ChatSessionService()


@share_router.get("/{share_token}", response_model=ChatSessionDetailResponse)
def get_shared_session(share_token: str, db: Session = Depends(get_db)):
    session = session_service.get_shared_session(db, share_token)
    if session is None:
        raise HTTPException(status_code=404, detail="Link chia sẻ không hợp lệ hoặc đã bị tắt.")

    return ChatSessionDetailResponse(
        **session_service.session_to_dict(session),
        messages=[ChatMessageResponse.model_validate(msg) for msg in session.messages],
    )
