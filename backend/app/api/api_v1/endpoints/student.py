from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import require_student
from app.db.session import get_db
from app.models.chat_session import MessageRole
from app.models.user import User
from app.schemas.chat_session import (
    ChatMessageResponse,
    ChatSessionCreateRequest,
    ChatSessionDetailResponse,
    ChatSessionResponse,
    ChatSessionUpdateRequest,
    SessionChatRequest,
    ShareLinkResponse,
)
from app.services.chat_pipeline import process_chat
from app.services.chat_session_service import ChatSessionService

student_router = APIRouter()
session_service = ChatSessionService()


def _to_session_response(session) -> ChatSessionResponse:
    data = session_service.session_to_dict(session)
    return ChatSessionResponse(**data)


@student_router.get("/sessions", response_model=list[ChatSessionResponse])
def list_sessions(
    q: str | None = Query(default=None, description="Tìm theo tiêu đề hoặc nội dung chat"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    sessions = session_service.list_sessions(db, current_user, q)
    return [_to_session_response(item) for item in sessions]


@student_router.post("/sessions", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    request: ChatSessionCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    session = session_service.create_session(db, current_user, request.title)
    return _to_session_response(session)


@student_router.get("/sessions/{session_id}", response_model=ChatSessionDetailResponse)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    session = session_service.get_session(db, current_user, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session không tồn tại.")
    return ChatSessionDetailResponse(
        **_to_session_response(session).model_dump(),
        messages=[ChatMessageResponse.model_validate(msg) for msg in session.messages],
    )


@student_router.patch("/sessions/{session_id}", response_model=ChatSessionResponse)
def update_session(
    session_id: int,
    request: ChatSessionUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    session = session_service.update_session(db, current_user, session_id, request.title)
    if session is None:
        raise HTTPException(status_code=404, detail="Session không tồn tại.")
    return _to_session_response(session)


@student_router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    if not session_service.delete_session(db, current_user, session_id):
        raise HTTPException(status_code=404, detail="Session không tồn tại.")
    return None


@student_router.post("/sessions/{session_id}/share", response_model=ShareLinkResponse)
def share_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    session = session_service.enable_share(db, current_user, session_id)
    if session is None or not session.share_token:
        raise HTTPException(status_code=404, detail="Session không tồn tại.")
    return ShareLinkResponse(
        share_token=session.share_token,
        share_url=session_service.build_share_url(session.share_token),
        is_shared=True,
    )


@student_router.delete("/sessions/{session_id}/share", response_model=ShareLinkResponse)
def unshare_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    session = session_service.disable_share(db, current_user, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session không tồn tại.")
    return ShareLinkResponse(
        share_token=session.share_token or "",
        share_url="",
        is_shared=False,
    )


@student_router.post("/sessions/{session_id}/chat")
async def chat_in_session(
    session_id: int,
    request: SessionChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_student),
):
    session = session_service.get_session(db, current_user, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session không tồn tại.")

    history = [
        {"role": msg.role.value, "content": msg.content}
        for msg in session.messages
    ]

    session_service.add_message(
        db,
        session,
        role=MessageRole.USER,
        content=request.message.strip(),
    )

    explicit_filter = (
        request.metadata_filter.model_dump(exclude_none=True)
        if request.metadata_filter
        else None
    )
    result = await process_chat(
        db,
        message=request.message,
        user_id=current_user.id,
        session_id=session_id,
        history=history,
        explicit_metadata_filter=explicit_filter,
    )

    assistant_message = session_service.add_message(
        db,
        session,
        role=MessageRole.ASSISTANT,
        content=result["answer"],
        from_rag=result.get("from_rag", False),
    )

    return {
        **result,
        "message": ChatMessageResponse.model_validate(assistant_message),
    }
