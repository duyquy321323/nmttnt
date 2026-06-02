import secrets

from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.models.chat_interaction_log import ChatInteractionLog
from app.models.chat_session import ChatMessage, ChatSession, MessageRole
from app.models.user import User


class ChatSessionService:
    """Quản lý session chat của học sinh."""

    DEFAULT_TITLE = "Cuộc trò chuyện mới"

    def list_sessions(self, db: Session, user: User, query: str | None = None) -> list[ChatSession]:
        q = db.query(ChatSession).filter(ChatSession.user_id == user.id)

        if query and query.strip():
            keyword = f"%{query.strip()}%"
            message_session_ids = (
                db.query(ChatMessage.session_id)
                .filter(ChatMessage.content.like(keyword))
                .distinct()
                .subquery()
            )
            q = q.filter(
                or_(
                    ChatSession.title.like(keyword),
                    ChatSession.id.in_(message_session_ids),
                )
            )

        return q.order_by(ChatSession.updated_at.desc()).all()

    def create_session(self, db: Session, user: User, title: str | None = None) -> ChatSession:
        session = ChatSession(
            user_id=user.id,
            title=(title or self.DEFAULT_TITLE).strip()[:255],
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    def get_session(self, db: Session, user: User, session_id: int) -> ChatSession | None:
        return (
            db.query(ChatSession)
            .options(joinedload(ChatSession.messages))
            .filter(ChatSession.id == session_id, ChatSession.user_id == user.id)
            .first()
        )

    def get_shared_session(self, db: Session, share_token: str) -> ChatSession | None:
        return (
            db.query(ChatSession)
            .options(joinedload(ChatSession.messages))
            .filter(
                ChatSession.share_token == share_token,
                ChatSession.is_shared.is_(True),
            )
            .first()
        )

    def update_session(
        self,
        db: Session,
        user: User,
        session_id: int,
        title: str,
    ) -> ChatSession | None:
        session = self.get_session(db, user, session_id)
        if session is None:
            return None
        session.title = title.strip()[:255]
        db.commit()
        db.refresh(session)
        return session

    def delete_session(self, db: Session, user: User, session_id: int) -> bool:
        session = (
            db.query(ChatSession)
            .filter(ChatSession.id == session_id, ChatSession.user_id == user.id)
            .first()
        )
        if session is None:
            return False
        db.query(ChatInteractionLog).filter(ChatInteractionLog.session_id == session_id).delete(
            synchronize_session=False,
        )
        db.delete(session)
        db.commit()
        return True

    def enable_share(self, db: Session, user: User, session_id: int) -> ChatSession | None:
        session = self.get_session(db, user, session_id)
        if session is None:
            return None
        if not session.share_token:
            session.share_token = secrets.token_urlsafe(24)
        session.is_shared = True
        db.commit()
        db.refresh(session)
        return session

    def disable_share(self, db: Session, user: User, session_id: int) -> ChatSession | None:
        session = self.get_session(db, user, session_id)
        if session is None:
            return None
        session.is_shared = False
        db.commit()
        db.refresh(session)
        return session

    def add_message(
        self,
        db: Session,
        session: ChatSession,
        *,
        role: MessageRole,
        content: str,
        from_rag: bool = False,
    ) -> ChatMessage:
        message = ChatMessage(
            session_id=session.id,
            role=role,
            content=content,
            from_rag=from_rag,
        )
        db.add(message)

        if session.title == self.DEFAULT_TITLE and role == MessageRole.USER:
            session.title = content.strip()[:80] or self.DEFAULT_TITLE

        db.commit()
        db.refresh(message)
        return message

    @staticmethod
    def build_share_url(share_token: str) -> str:
        base = settings.FRONTEND_URL.rstrip("/")
        return f"{base}/share/{share_token}"

    @staticmethod
    def session_to_dict(session: ChatSession) -> dict:
        return {
            "id": session.id,
            "title": session.title,
            "is_shared": session.is_shared,
            "share_token": session.share_token if session.is_shared else None,
            "created_at": session.created_at,
            "updated_at": session.updated_at,
            "message_count": len(session.messages),
        }
