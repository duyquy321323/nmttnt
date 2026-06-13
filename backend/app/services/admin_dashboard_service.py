"""Tổng hợp số liệu dashboard quản trị."""

import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.fallback_types import FallbackReason
from app.models.chat_interaction_log import ChatInteractionLog
from app.models.chat_session import ChatMessage, ChatSession
from app.models.document import Document
from app.models.user import User, UserRole
from app.services.analytics_service import analytics_service
from app.services.prompt_version import get_prompt_version
from app.services.rag_service import get_rag_service

logger = logging.getLogger(__name__)


def _user_stats(db: Session, role: UserRole) -> dict:
    rows = db.query(User).filter(User.role == role).all()
    return {
        "total": len(rows),
        "active": sum(1 for row in rows if row.is_active),
        "inactive": sum(1 for row in rows if not row.is_active),
        "pending_password": sum(1 for row in rows if row.must_change_password),
    }


class AdminDashboardService:
    def get_dashboard(self, db: Session) -> dict:
        teachers = _user_stats(db, UserRole.TEACHER)
        students = _user_stats(db, UserRole.STUDENT)

        documents_total = db.query(func.count(Document.id)).scalar() or 0
        chat_sessions_total = db.query(func.count(ChatSession.id)).scalar() or 0
        chat_messages_total = db.query(func.count(ChatMessage.id)).scalar() or 0
        shared_sessions_total = (
            db.query(func.count(ChatSession.id))
            .filter(ChatSession.is_shared.is_(True))
            .scalar()
            or 0
        )

        analytics = analytics_service.get_error_report(db, limit=10)

        rag_summary = {
            "has_documents": False,
            "document_count": 0,
            "total_points": 0,
            "collection_name": "",
        }
        try:
            rag_status = get_rag_service().get_storage_status()
            rag_summary = {
                "has_documents": rag_status.get("has_documents", False),
                "document_count": rag_status.get("document_count", 0),
                "total_points": rag_status.get("total_points", 0),
                "collection_name": rag_status.get("collection_name", ""),
            }
        except Exception:
            logger.exception("Không lấy được trạng thái RAG cho dashboard admin.")

        documents_by_subject: dict[str, int] = defaultdict(int)
        for row in db.query(Document.subject).filter(Document.subject.isnot(None)).all():
            if row.subject:
                documents_by_subject[row.subject] += 1

        interactions_by_day = self._interactions_by_day(db, days=7)

        recent_users = (
            db.query(User)
            .filter(User.role.in_([UserRole.TEACHER, UserRole.STUDENT]))
            .order_by(User.created_at.desc())
            .limit(8)
            .all()
        )

        return {
            "teachers": teachers,
            "students": students,
            "documents_total": documents_total,
            "chat_sessions_total": chat_sessions_total,
            "chat_messages_total": chat_messages_total,
            "shared_sessions_total": shared_sessions_total,
            "total_interactions": analytics["total_interactions"],
            "failed_interactions": analytics["failed_count"],
            "reask_count": analytics["reask_count"],
            "clarification_count": analytics["clarification_count"],
            "feedback_count": analytics["feedback_count"],
            "positive_feedback_rate": analytics["positive_feedback_rate"],
            "rag": rag_summary,
            "by_fallback_reason": analytics["by_fallback_reason"],
            "by_subject": analytics["by_subject"],
            "documents_by_subject": dict(
                sorted(documents_by_subject.items(), key=lambda item: -item[1])[:10],
            ),
            "interactions_by_day": interactions_by_day,
            "recent_users": [
                {
                    "id": user.id,
                    "username": user.username,
                    "full_name": user.full_name,
                    "role": user.role.value,
                    "is_active": user.is_active,
                    "created_at": user.created_at.isoformat(),
                }
                for user in recent_users
            ],
            "prompt_version": get_prompt_version(),
        }

    def _interactions_by_day(self, db: Session, days: int = 7) -> list[dict]:
        """Số tương tác chat theo ngày (7 ngày gần nhất)."""
        today = datetime.now(timezone.utc).date()
        start = today - timedelta(days=days - 1)

        rows = (
            db.query(
                func.date(ChatInteractionLog.created_at).label("day"),
                func.count(ChatInteractionLog.id).label("count"),
            )
            .filter(func.date(ChatInteractionLog.created_at) >= start)
            .group_by(func.date(ChatInteractionLog.created_at))
            .all()
        )

        counts_by_day = {str(row.day): row.count for row in rows}
        result: list[dict] = []
        for offset in range(days):
            day = start + timedelta(days=offset)
            key = str(day)
            result.append({"date": key, "count": counts_by_day.get(key, 0)})
        return result


admin_dashboard_service = AdminDashboardService()
