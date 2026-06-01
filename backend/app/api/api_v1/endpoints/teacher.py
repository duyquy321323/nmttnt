from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import require_teacher
from app.core.document_metadata import MATERIAL_TYPE_LABELS
from app.db.init_db import build_storage_filename, ensure_documents_storage
from app.db.session import get_db
from app.models.document import Document
from app.models.user import User
from app.schemas.document import DocumentResponse, MaterialTypeOption
from app.services.analytics_service import analytics_service
from app.services.document_service import DocumentService

teacher_router = APIRouter()
document_service = DocumentService()


def _metadata_from_form(
    material_type: str | None,
    grade: str | None,
    subject: str | None,
    lesson: str | None,
    level: str | None,
    skill: str | None,
    vietnamese_level: str | None,
    region: str | None,
) -> dict:
    return {
        "material_type": material_type,
        "grade": grade,
        "subject": subject,
        "lesson": lesson,
        "level": level,
        "skill": skill,
        "vietnamese_level": vietnamese_level,
        "region": region,
    }


@teacher_router.get("/documents/material-types", response_model=list[MaterialTypeOption])
def list_material_types(_: User = Depends(require_teacher)):
    return [
        MaterialTypeOption(value=value, label=label)
        for value, label in MATERIAL_TYPE_LABELS.items()
    ]


@teacher_router.get("/documents", response_model=list[DocumentResponse])
def list_documents(
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher),
):
    documents = db.query(Document).order_by(Document.created_at.desc()).all()
    return documents


@teacher_router.post("/documents", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_document(
    title: str = Form(...),
    description: str | None = Form(default=None),
    material_type: str | None = Form(default=None),
    grade: str | None = Form(default=None),
    subject: str | None = Form(default=None),
    lesson: str | None = Form(default=None),
    level: str | None = Form(default=None),
    skill: str | None = Form(default=None),
    vietnamese_level: str | None = Form(default=None),
    region: str | None = Form(default=None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Tên file không hợp lệ.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="File rỗng.")

    ensure_documents_storage()
    storage_filename = build_storage_filename(file.filename)

    try:
        document = document_service.create_document(
            db,
            title=title.strip(),
            description=description.strip() if description else None,
            original_filename=file.filename,
            storage_filename=storage_filename,
            content=content,
            uploaded_by_id=current_user.id,
            storage_dir=settings.DOCUMENTS_STORAGE_PATH,
            metadata=_metadata_from_form(
                material_type,
                grade,
                subject,
                lesson,
                level,
                skill,
                vietnamese_level,
                region,
            ),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Không kết nối được Qdrant hoặc lỗi khi lưu tài liệu.",
        ) from exc

    return document


@teacher_router.put("/documents/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: int,
    title: str | None = Form(default=None),
    description: str | None = Form(default=None),
    material_type: str | None = Form(default=None),
    grade: str | None = Form(default=None),
    subject: str | None = Form(default=None),
    lesson: str | None = Form(default=None),
    level: str | None = Form(default=None),
    skill: str | None = Form(default=None),
    vietnamese_level: str | None = Form(default=None),
    region: str | None = Form(default=None),
    file: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher),
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if document is None:
        raise HTTPException(status_code=404, detail="Tài liệu không tồn tại.")

    new_content = None
    new_original_filename = None
    if file is not None and file.filename:
        new_content = await file.read()
        if not new_content:
            raise HTTPException(status_code=400, detail="File rỗng.")
        new_original_filename = file.filename

    metadata = _metadata_from_form(
        material_type,
        grade,
        subject,
        lesson,
        level,
        skill,
        vietnamese_level,
        region,
    )
    has_metadata = any(value is not None for value in metadata.values())

    try:
        updated = document_service.update_document(
            db,
            document,
            title=title.strip() if title else None,
            description=description.strip() if description is not None else None,
            metadata=metadata if has_metadata else None,
            new_content=new_content,
            new_original_filename=new_original_filename,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Lỗi khi cập nhật và reindex tài liệu.",
        ) from exc

    return updated


@teacher_router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher),
):
    document = db.query(Document).filter(Document.id == document_id).first()
    if document is None:
        raise HTTPException(status_code=404, detail="Tài liệu không tồn tại.")

    try:
        document_service.delete_document(db, document)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Lỗi khi xóa tài liệu khỏi kho RAG.",
        ) from exc

    return None


@teacher_router.get("/analytics")
def teacher_analytics_report(
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher),
):
    return analytics_service.get_error_report(db)
