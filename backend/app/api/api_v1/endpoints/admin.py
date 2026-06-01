from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import require_admin
from app.core.security import hash_password
from app.db.session import get_db
from app.models.chat_session import ChatSession
from app.models.document import Document
from app.models.user import User, UserRole
from app.schemas.user import (
    StudentCreateRequest,
    StudentUpdateRequest,
    TeacherCreateRequest,
    TeacherUpdateRequest,
    UserResponse,
)
from app.services.document_service import DocumentService

admin_router = APIRouter()


def get_document_service() -> DocumentService:
    return DocumentService()


@admin_router.get("/teachers", response_model=list[UserResponse])
def list_teachers(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    teachers = (
        db.query(User)
        .filter(User.role == UserRole.TEACHER)
        .order_by(User.created_at.desc())
        .all()
    )
    return teachers


@admin_router.post("/teachers", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_teacher(
    request: TeacherCreateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    existing = db.query(User).filter(User.username == request.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên đăng nhập đã tồn tại.",
        )

    teacher = User(
        username=request.username,
        full_name=request.full_name,
        password_hash=hash_password(settings.TEACHER_DEFAULT_PASSWORD),
        role=UserRole.TEACHER,
        must_change_password=True,
        is_active=True,
    )
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    return teacher


@admin_router.put("/teachers/{teacher_id}", response_model=UserResponse)
def update_teacher(
    teacher_id: int,
    request: TeacherUpdateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    teacher = (
        db.query(User)
        .filter(User.id == teacher_id, User.role == UserRole.TEACHER)
        .first()
    )
    if teacher is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Giáo viên không tồn tại.")

    if request.full_name is not None:
        teacher.full_name = request.full_name
    if request.is_active is not None:
        teacher.is_active = request.is_active
    if request.reset_password:
        teacher.password_hash = hash_password(settings.TEACHER_DEFAULT_PASSWORD)
        teacher.must_change_password = True

    db.commit()
    db.refresh(teacher)
    return teacher


@admin_router.delete("/teachers/{teacher_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_teacher(
    teacher_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    teacher = (
        db.query(User)
        .filter(User.id == teacher_id, User.role == UserRole.TEACHER)
        .first()
    )
    if teacher is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Giáo viên không tồn tại.")

    teacher_documents = db.query(Document).filter(Document.uploaded_by_id == teacher_id).all()
    for item in teacher_documents:
        get_document_service().delete_document(db, item)

    db.delete(teacher)
    db.commit()
    return None


@admin_router.get("/students", response_model=list[UserResponse])
def list_students(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    students = (
        db.query(User)
        .filter(User.role == UserRole.STUDENT)
        .order_by(User.created_at.desc())
        .all()
    )
    return students


@admin_router.post("/students", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_student(
    request: StudentCreateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    existing = db.query(User).filter(User.username == request.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên đăng nhập đã tồn tại.",
        )

    student = User(
        username=request.username,
        full_name=request.full_name,
        password_hash=hash_password(settings.STUDENT_DEFAULT_PASSWORD),
        role=UserRole.STUDENT,
        must_change_password=True,
        is_active=True,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@admin_router.put("/students/{student_id}", response_model=UserResponse)
def update_student(
    student_id: int,
    request: StudentUpdateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    student = (
        db.query(User)
        .filter(User.id == student_id, User.role == UserRole.STUDENT)
        .first()
    )
    if student is None:
        raise HTTPException(status_code=404, detail="Học sinh không tồn tại.")

    if request.full_name is not None:
        student.full_name = request.full_name
    if request.is_active is not None:
        student.is_active = request.is_active
    if request.reset_password:
        student.password_hash = hash_password(settings.STUDENT_DEFAULT_PASSWORD)
        student.must_change_password = True

    db.commit()
    db.refresh(student)
    return student


@admin_router.delete("/students/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    student = (
        db.query(User)
        .filter(User.id == student_id, User.role == UserRole.STUDENT)
        .first()
    )
    if student is None:
        raise HTTPException(status_code=404, detail="Học sinh không tồn tại.")

    db.query(ChatSession).filter(ChatSession.user_id == student_id).delete()
    db.delete(student)
    db.commit()
    return None
