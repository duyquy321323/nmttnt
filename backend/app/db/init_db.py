import uuid
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User, UserRole


def ensure_default_admin(db: Session) -> None:
    """Khởi tạo tài khoản admin mặc định nếu chưa có."""
    admin = (
        db.query(User)
        .filter(User.role == UserRole.ADMIN, User.username == settings.ADMIN_DEFAULT_USERNAME)
        .first()
    )
    if admin:
        return

    db.add(
        User(
            username=settings.ADMIN_DEFAULT_USERNAME,
            password_hash=hash_password(settings.ADMIN_DEFAULT_PASSWORD),
            full_name="Administrator",
            role=UserRole.ADMIN,
            must_change_password=False,
            is_active=True,
        )
    )
    db.commit()


def ensure_documents_storage() -> None:
    Path(settings.DOCUMENTS_STORAGE_PATH).mkdir(parents=True, exist_ok=True)


def build_storage_filename(original_filename: str) -> str:
    suffix = Path(original_filename).suffix.lower()
    return f"{uuid.uuid4().hex}{suffix}"
