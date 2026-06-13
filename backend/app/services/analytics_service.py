"""Ghi log và báo cáo robustness."""

import json
import logging
from collections import defaultdict

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.fallback_types import FallbackReason
from app.models.answer_feedback import AnswerFeedback
from app.models.chat_interaction_log import ChatInteractionLog
from app.services.prompt_version import get_prompt_version

logger = logging.getLogger(__name__)


class AnalyticsService:
    def log_interaction(
        self,
        db: Session,
        *,
        question: str,
        normalized_question: str,
        answer: str | None,
        from_rag: bool,
        fallback_reason: FallbackReason | None,
        needs_clarification: bool,
        is_reask: bool,
        user_id: int | None = None,
        session_id: int | None = None,
        metadata_filter: dict | None = None,
        rag_score: float | None = None,
        document_versions: dict | None = None,
    ) -> ChatInteractionLog | None:
        meta = metadata_filter or {}
        log = ChatInteractionLog(
            user_id=user_id,
            session_id=session_id,
            question=question,
            normalized_question=normalized_question,
            answer=answer,
            from_rag=from_rag,
            fallback_reason=fallback_reason.value if fallback_reason else None,
            needs_clarification=needs_clarification,
            is_reask=is_reask,
            subject=meta.get("subject"),
            lesson=meta.get("lesson"),
            grade=meta.get("grade"),
            prompt_version=get_prompt_version(),
            document_versions=json.dumps(document_versions or {}, ensure_ascii=False),
            rag_score=str(rag_score) if rag_score is not None else None,
        )
        try:
            db.add(log)
            db.commit()
            db.refresh(log)
            return log
        except Exception:
            logger.exception("Không ghi được chat_interaction_logs — chat vẫn trả lời bình thường.")
            db.rollback()
            return None

    def add_feedback(
        self,
        db: Session,
        *,
        interaction_log_id: int,
        rating: int,
        user_id: int | None = None,
        comment: str | None = None,
    ) -> AnswerFeedback:
        feedback = AnswerFeedback(
            interaction_log_id=interaction_log_id,
            user_id=user_id,
            rating=rating,
            comment=comment.strip() if comment else None,
        )
        db.add(feedback)
        db.commit()
        db.refresh(feedback)
        return feedback

    def get_error_report(self, db: Session, limit: int = 50) -> dict:
        """Báo cáo lỗi theo môn/bài và loại fallback."""
        failed = (
            db.query(ChatInteractionLog)
            .filter(
                ChatInteractionLog.fallback_reason.isnot(None),
                ChatInteractionLog.fallback_reason != FallbackReason.NONE.value,
            )
            .order_by(ChatInteractionLog.created_at.desc())
            .limit(500)
            .all()
        )

        by_subject: dict[str, int] = defaultdict(int)
        by_lesson: dict[str, int] = defaultdict(int)
        by_reason: dict[str, int] = defaultdict(int)
        recent_failures: list[dict] = []

        for row in failed:
            if row.fallback_reason:
                by_reason[row.fallback_reason] += 1
            if row.subject:
                by_subject[row.subject] += 1
            if row.lesson:
                key = f"{row.subject or '?'} — bài {row.lesson}"
                by_lesson[key] += 1

        for row in failed[:limit]:
            recent_failures.append(
                {
                    "id": row.id,
                    "question": row.question[:200],
                    "fallback_reason": row.fallback_reason,
                    "subject": row.subject,
                    "lesson": row.lesson,
                    "grade": row.grade,
                    "is_reask": row.is_reask,
                    "needs_clarification": row.needs_clarification,
                    "created_at": row.created_at.isoformat(),
                }
            )

        total = db.query(func.count(ChatInteractionLog.id)).scalar() or 0
        reask_total = (
            db.query(func.count(ChatInteractionLog.id))
            .filter(ChatInteractionLog.is_reask.is_(True))
            .scalar()
            or 0
        )
        clarification_total = (
            db.query(func.count(ChatInteractionLog.id))
            .filter(ChatInteractionLog.needs_clarification.is_(True))
            .scalar()
            or 0
        )
        feedback_total = db.query(func.count(AnswerFeedback.id)).scalar() or 0
        positive = (
            db.query(func.count(AnswerFeedback.id))
            .filter(AnswerFeedback.rating >= 1)
            .scalar()
            or 0
        )

        return {
            "total_interactions": total,
            "failed_count": len(failed),
            "reask_count": reask_total,
            "clarification_count": clarification_total,
            "feedback_count": feedback_total,
            "positive_feedback_rate": round(positive / feedback_total, 2) if feedback_total else None,
            "by_fallback_reason": dict(by_reason),
            "by_subject": dict(sorted(by_subject.items(), key=lambda x: -x[1])[:20]),
            "by_lesson": dict(sorted(by_lesson.items(), key=lambda x: -x[1])[:20]),
            "prompt_version": get_prompt_version(),
            "recent_failures": recent_failures,
        }


analytics_service = AnalyticsService()
