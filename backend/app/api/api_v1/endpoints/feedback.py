from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import get_current_user_optional
from app.db.session import get_db
from app.models.chat_interaction_log import ChatInteractionLog
from app.models.user import User
from app.schemas.analytics import FeedbackRequest, FeedbackResponse
from app.services.analytics_service import analytics_service
from sqlalchemy.orm import Session

feedback_router = APIRouter()


@feedback_router.post("/feedback", response_model=FeedbackResponse)
def submit_feedback(
    request: FeedbackRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    log = db.query(ChatInteractionLog).filter(ChatInteractionLog.id == request.interaction_id).first()
    if log is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy log tương tác.")

    feedback = analytics_service.add_feedback(
        db,
        interaction_log_id=request.interaction_id,
        rating=request.rating,
        user_id=current_user.id if current_user else None,
        comment=request.comment,
    )
    return feedback
