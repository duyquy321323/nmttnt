import hashlib
import os
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.document_metadata import normalize_metadata
from app.models.document import Document
from app.services.document_parser import DocumentParser
from app.services.rag_service import get_rag_service


class DocumentService:
    """Tài liệu: lưu file, đồng bộ metadata DB và reindex RAG."""

    def __init__(self) -> None:
        self._parser = DocumentParser()
        self._rag = get_rag_service()

    @staticmethod
    def _resolve_path(file_path: str) -> Path:
        return Path(file_path)

    @staticmethod
    def _content_hash(content: bytes) -> str:
        return hashlib.sha256(content).hexdigest()[:32]

    @staticmethod
    def _apply_metadata(document: Document, metadata: dict | None) -> None:
        normalized = normalize_metadata(metadata)
        document.material_type = normalized.get("material_type")
        document.grade = normalized.get("grade")
        document.subject = normalized.get("subject")
        document.lesson = normalized.get("lesson")
        document.level = normalized.get("level")
        document.skill = normalized.get("skill")
        document.vietnamese_level = normalized.get("vietnamese_level")
        document.region = normalized.get("region")

    @staticmethod
    def _rag_payload_metadata(
        document: Document,
        normalized_metadata: dict[str, str],
    ) -> dict[str, str]:
        payload = dict(normalized_metadata)
        payload["document_version"] = str(document.version)
        if document.content_hash:
            payload["content_hash"] = document.content_hash
        return payload

    def create_document(
        self,
        db: Session,
        *,
        title: str,
        description: str | None,
        original_filename: str,
        storage_filename: str,
        content: bytes,
        uploaded_by_id: int,
        storage_dir: str,
        metadata: dict | None = None,
    ) -> Document:
        self._parser.validate_extension(original_filename)
        normalized_metadata = normalize_metadata(metadata)
        content_hash = self._content_hash(content)

        document = Document(
            title=title,
            description=description,
            original_filename=original_filename,
            storage_filename=storage_filename,
            rag_document_id="pending",
            file_path=str(Path(storage_dir) / storage_filename),
            uploaded_by_id=uploaded_by_id,
            version=1,
            content_hash=content_hash,
        )
        self._apply_metadata(document, normalized_metadata)

        rag_result = self._rag.ingest_file(
            storage_filename,
            content,
            metadata=self._rag_payload_metadata(document, normalized_metadata),
        )
        document.rag_document_id = rag_result["document_id"]
        document.last_indexed_at = datetime.now(timezone.utc)

        file_path = Path(storage_dir) / storage_filename
        file_path.write_bytes(content)

        db.add(document)
        db.commit()
        db.refresh(document)
        return document

    def update_document(
        self,
        db: Session,
        document: Document,
        *,
        title: str | None = None,
        description: str | None = None,
        metadata: dict | None = None,
        new_content: bytes | None = None,
        new_original_filename: str | None = None,
    ) -> Document:
        if title is not None:
            document.title = title
        if description is not None:
            document.description = description

        metadata_changed = metadata is not None
        if metadata_changed:
            self._apply_metadata(document, metadata)

        if new_content is not None and new_original_filename is not None:
            self._parser.validate_extension(new_original_filename)
            document.version += 1
            document.content_hash = self._content_hash(new_content)
            self._rag.delete_document(document.rag_document_id)
            rag_result = self._rag.ingest_file(
                document.storage_filename,
                new_content,
                metadata=self._rag_payload_metadata(document, document.metadata_dict()),
            )
            document.rag_document_id = rag_result["document_id"]
            document.original_filename = new_original_filename
            document.last_indexed_at = datetime.now(timezone.utc)
            Path(document.file_path).write_bytes(new_content)
        elif metadata_changed:
            version_payload = document.metadata_dict()
            version_payload["document_version"] = str(document.version)
            if document.content_hash:
                version_payload["content_hash"] = document.content_hash
            self._rag.update_document_metadata(document.rag_document_id, version_payload)

        db.commit()
        db.refresh(document)
        return document

    def delete_document(self, db: Session, document: Document) -> None:
        self._rag.delete_document(document.rag_document_id)
        file_path = self._resolve_path(document.file_path)
        if file_path.exists():
            os.remove(file_path)
        db.delete(document)
        db.commit()
