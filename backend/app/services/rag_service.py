"""Qdrant based RAG indexing and search"""

import hashlib
import re
import uuid
from functools import lru_cache

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)

from app.core.config import settings
from app.core.constants import (
    DOCUMENT_NOT_FOUND_MESSAGE,
    KNOWLEDGE_NOT_IN_DOCUMENT_MESSAGE,
)
from app.core.document_metadata import METADATA_FIELD_NAMES, metadata_to_payload, normalize_metadata
from app.services.document_parser import DocumentParser
from app.services.embedding_service import get_embedding_service
from app.services.metadata_extractor import hit_matches_metadata
from app.services.rag_retrieval import (
    merge_hits,
    multiply_teaching_chunk_score,
    normalize_query,
    parse_multiply,
    addition_teaching_chunk_score,
    context_supports_question,
    hits_are_relevant,
    is_mixed_expression,
    rerank_hits,
    select_hits_for_context,
)


class RagService:
    def __init__(self) -> None:
        self._client = QdrantClient(url=settings.QDRANT_URL)
        self._collection = settings.QDRANT_COLLECTION_NAME
        self._parser = DocumentParser()
        self._embedding = get_embedding_service()
        self._ensure_collection()

    def _ensure_collection(self) -> None:
        if self._client.collection_exists(self._collection):
            return
        self._client.create_collection(
            collection_name=self._collection,
            vectors_config=VectorParams(
                size=self._embedding.vector_size,
                distance=Distance.COSINE,
            ),
        )

    @staticmethod
    def _chunk_text(text: str) -> list[str]:
        chunk_size = settings.RAG_CHUNK_SIZE
        overlap = settings.RAG_CHUNK_OVERLAP
        if len(text) <= chunk_size:
            return [text]

        chunks: list[str] = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunks.append(text[start:end].strip())
            if end >= len(text):
                break
            start = max(end - overlap, 0)
        return [c for c in chunks if c]

    @staticmethod
    def _document_id(filename: str) -> str:
        return hashlib.sha256(filename.encode("utf-8")).hexdigest()[:32]

    @staticmethod
    def _build_qdrant_filter(metadata_filter: dict[str, str] | None) -> Filter | None:
        if not metadata_filter:
            return None

        conditions = [
            FieldCondition(key=field, match=MatchValue(value=value))
            for field in METADATA_FIELD_NAMES
            if (value := metadata_filter.get(field))
        ]
        return Filter(must=conditions) if conditions else None

    @staticmethod
    def _payload_to_hit(payload: dict, vector_score: float = 0.0) -> dict:
        hit = {
            "vector_score": round(vector_score, 4),
            "text": payload.get("text", ""),
            "filename": payload.get("filename", ""),
            "chunk_index": payload.get("chunk_index"),
            "document_id": payload.get("document_id"),
        }
        for field in METADATA_FIELD_NAMES:
            if payload.get(field) is not None:
                hit[field] = payload.get(field)
        return hit

    def has_documents(self) -> bool:
        info = self._client.get_collection(self._collection)
        return info.points_count > 0

    def list_uploaded_documents(self) -> list[dict]:
        """Danh sách file đã ingest trong Qdrant (theo payload filename)."""
        documents: dict[str, dict] = {}
        offset = None

        while True:
            records, offset = self._client.scroll(
                collection_name=self._collection,
                limit=64,
                offset=offset,
                with_payload=True,
                with_vectors=False,
            )
            for point in records:
                if not point.payload:
                    continue
                filename = point.payload.get("filename")
                if not filename:
                    continue
                if filename not in documents:
                    documents[filename] = {
                        "filename": filename,
                        "document_id": point.payload.get("document_id"),
                        "chunks_count": 0,
                    }
                documents[filename]["chunks_count"] += 1
            if offset is None:
                break

        return sorted(documents.values(), key=lambda item: item["filename"])

    def get_storage_status(self) -> dict:
        info = self._client.get_collection(self._collection)
        documents = self.list_uploaded_documents()
        total_points = info.points_count or 0
        return {
            "has_documents": total_points > 0,
            "collection_name": self._collection,
            "qdrant_url": settings.QDRANT_URL,
            "total_points": total_points,
            "document_count": len(documents),
            "documents": documents,
        }

    def ingest_file(
        self,
        filename: str,
        content: bytes,
        metadata: dict | None = None,
    ) -> dict:
        text = self._parser.parse(filename, content)
        chunks = self._chunk_text(text)
        if not chunks:
            raise ValueError("Tài liệu không có nội dung để lưu vào kho.")

        document_id = self._document_id(filename)
        self._delete_document(document_id)

        doc_metadata = metadata_to_payload(normalize_metadata(metadata))
        vectors = self._embedding.embed_texts(chunks)
        points = [
            PointStruct(
                id=str(uuid.uuid4()),
                vector=vector,
                payload={
                    "document_id": document_id,
                    "filename": filename,
                    "chunk_index": index,
                    "text": chunk,
                    **doc_metadata,
                },
            )
            for index, (chunk, vector) in enumerate(zip(chunks, vectors))
        ]
        self._client.upsert(collection_name=self._collection, points=points)

        return {
            "document_id": document_id,
            "filename": filename,
            "chunks_indexed": len(chunks),
            "metadata": doc_metadata,
            "message": "Đã cập nhật kho tài liệu thành công.",
        }

    def update_document_metadata(self, document_id: str, metadata: dict | None) -> None:
        """Cập nhật metadata trên toàn bộ chunk của tài liệu mà không re-embed."""
        doc_metadata = metadata_to_payload(normalize_metadata(metadata))
        self._client.set_payload(
            collection_name=self._collection,
            payload=doc_metadata,
            points=Filter(
                must=[
                    FieldCondition(
                        key="document_id",
                        match=MatchValue(value=document_id),
                    )
                ]
            ),
        )

    def delete_document(self, document_id: str) -> None:
        """Xóa toàn bộ chunk của tài liệu khỏi Qdrant."""
        self._delete_document(document_id)

    def _delete_document(self, document_id: str) -> None:
        self._client.delete(
            collection_name=self._collection,
            points_selector=Filter(
                must=[
                    FieldCondition(
                        key="document_id",
                        match=MatchValue(value=document_id),
                    )
                ]
            ),
        )

    def _find_math_chunks_by_keyword(
        self,
        a: str,
        b: str,
        metadata_filter: dict[str, str] | None = None,
    ) -> list[dict]:
        """Tìm chunk chứa phép a x b (bổ sung khi vector search trượt)."""
        pattern = re.compile(rf"{a}\s*[x×*]\s*{b}", re.IGNORECASE)
        found: list[dict] = []
        offset = None
        scroll_filter = self._build_qdrant_filter(metadata_filter)

        while True:
            records, offset = self._client.scroll(
                collection_name=self._collection,
                limit=64,
                offset=offset,
                scroll_filter=scroll_filter,
                with_payload=True,
                with_vectors=False,
            )
            for point in records:
                if not point.payload:
                    continue
                text = point.payload.get("text", "")
                if not pattern.search(text):
                    continue
                hit = self._payload_to_hit(point.payload)
                if hit_matches_metadata(hit, metadata_filter or {}):
                    found.append(hit)
            if offset is None:
                break

        return found

    def _find_multiply_teaching_chunks(
        self,
        limit: int = 2,
        metadata_filter: dict[str, str] | None = None,
    ) -> list[dict]:
        """Lấy chunk mẫu dạy phép nhân khi câu hỏi không trùng số trong tài liệu."""
        candidates: list[tuple[float, dict]] = []
        offset = None
        scroll_filter = self._build_qdrant_filter(metadata_filter)

        while True:
            records, offset = self._client.scroll(
                collection_name=self._collection,
                limit=64,
                offset=offset,
                scroll_filter=scroll_filter,
                with_payload=True,
                with_vectors=False,
            )
            for point in records:
                if not point.payload:
                    continue
                text = point.payload.get("text", "")
                teach_score = multiply_teaching_chunk_score(text)
                if teach_score < 0.35:
                    continue
                hit = self._payload_to_hit(point.payload)
                if not hit_matches_metadata(hit, metadata_filter or {}):
                    continue
                candidates.append((teach_score, hit))
            if offset is None:
                break

        candidates.sort(key=lambda item: item[0], reverse=True)
        return [hit for _, hit in candidates[:limit]]

    def _find_addition_teaching_chunks(
        self,
        limit: int = 2,
        metadata_filter: dict[str, str] | None = None,
    ) -> list[dict]:
        """Lấy chunk mẫu phép cộng/trừ (Phần II) cho biểu thức hỗn hợp."""
        candidates: list[tuple[float, dict]] = []
        offset = None
        scroll_filter = self._build_qdrant_filter(metadata_filter)

        while True:
            records, offset = self._client.scroll(
                collection_name=self._collection,
                limit=64,
                offset=offset,
                scroll_filter=scroll_filter,
                with_payload=True,
                with_vectors=False,
            )
            for point in records:
                if not point.payload:
                    continue
                text = point.payload.get("text", "")
                teach_score = addition_teaching_chunk_score(text)
                if teach_score < 0.35:
                    continue
                hit = self._payload_to_hit(point.payload)
                if not hit_matches_metadata(hit, metadata_filter or {}):
                    continue
                candidates.append((teach_score, hit))
            if offset is None:
                break

        candidates.sort(key=lambda item: item[0], reverse=True)
        return [hit for _, hit in candidates[:limit]]

    def search(
        self,
        query: str,
        metadata_filter: dict[str, str] | None = None,
    ) -> list[dict]:
        if not self.has_documents():
            return []

        normalized = normalize_query(query)
        query_vector = self._embedding.embed_query(normalized)
        query_filter = self._build_qdrant_filter(metadata_filter)
        response = self._client.query_points(
            collection_name=self._collection,
            query=query_vector,
            query_filter=query_filter,
            limit=settings.RAG_FETCH_K,
        )
        hits = [
            self._payload_to_hit(hit.payload, hit.score)
            for hit in response.points
            if hit.payload
        ]

        multiply = parse_multiply(query)
        if multiply:
            keyword_hits = self._find_math_chunks_by_keyword(
                multiply[0],
                multiply[1],
                metadata_filter=metadata_filter,
            )
            if not keyword_hits:
                keyword_hits = self._find_multiply_teaching_chunks(
                    metadata_filter=metadata_filter,
                )
            hits = merge_hits(hits, keyword_hits)

        if is_mixed_expression(query):
            hits = merge_hits(
                hits,
                self._find_addition_teaching_chunks(metadata_filter=metadata_filter),
            )

        hits = rerank_hits(query, hits)
        hits = hits[: settings.RAG_TOP_K]

        filtered: list[dict] = []
        for hit in hits:
            vector_ok = hit.get("vector_score", 0) >= settings.RAG_SCORE_THRESHOLD
            lexical_ok = hit.get("lexical_score", 0) >= settings.RAG_MIN_LEXICAL_SCORE
            if vector_ok or lexical_ok:
                filtered.append(hit)

        if not filtered and hits:
            relaxed_vector = max(0.28, settings.RAG_MIN_VECTOR_SCORE - 0.04)
            filtered = [
                hit
                for hit in hits
                if hit.get("vector_score", 0) >= relaxed_vector
                or hit.get("lexical_score", 0) >= settings.RAG_MIN_LEXICAL_SCORE
            ][: settings.RAG_TOP_K]
            if not filtered:
                filtered = hits[: min(2, len(hits))]

        return filtered

    @staticmethod
    def format_chunks_for_response(hits: list[dict]) -> list[dict]:
        formatted: list[dict] = []
        for hit in hits:
            item = {
                "score": hit.get("score"),
                "vector_score": hit.get("vector_score"),
                "lexical_score": hit.get("lexical_score"),
                "filename": hit.get("filename"),
                "chunk_index": hit.get("chunk_index"),
                "document_id": hit.get("document_id"),
                "text": hit.get("text", ""),
            }
            for field in METADATA_FIELD_NAMES:
                if hit.get(field) is not None:
                    item[field] = hit.get(field)
            formatted.append(item)
        return formatted

    def build_context(self, hits: list[dict]) -> str:
        parts: list[str] = []
        for index, hit in enumerate(hits, start=1):
            source = hit.get("filename") or "tài liệu"
            meta_bits: list[str] = []
            if hit.get("grade"):
                meta_bits.append(f"lớp {hit['grade']}")
            if hit.get("subject"):
                meta_bits.append(hit["subject"])
            if hit.get("lesson"):
                meta_bits.append(f"bài {hit['lesson']}")
            meta_label = f" — {', '.join(meta_bits)}" if meta_bits else ""
            parts.append(f"[{index}] ({source}{meta_label})\n{hit.get('text', '')}")
        return "\n\n".join(parts)

    def chat_or_fallback(
        self,
        question: str,
        metadata_filter: dict[str, str] | None = None,
    ) -> dict:
        threshold = settings.RAG_SCORE_THRESHOLD
        empty_chunks: list[dict] = []

        storage = self.get_storage_status()
        uploaded_sources = [doc["filename"] for doc in storage["documents"]]

        if not storage["has_documents"]:
            return {
                "answer": DOCUMENT_NOT_FOUND_MESSAGE,
                "from_rag": False,
                "sources": [],
                "chunks": empty_chunks,
                "score_threshold": threshold,
                "metadata_filter": metadata_filter or {},
            }

        hits = select_hits_for_context(
            question,
            self.search(question, metadata_filter=metadata_filter),
        )

        if not hits and metadata_filter:
            hits = select_hits_for_context(question, self.search(question))

        chunks = self.format_chunks_for_response(hits)

        if not hits:
            return {
                "answer": KNOWLEDGE_NOT_IN_DOCUMENT_MESSAGE,
                "from_rag": False,
                "sources": uploaded_sources,
                "chunks": empty_chunks,
                "score_threshold": threshold,
                "metadata_filter": metadata_filter or {},
            }

        if not hits_are_relevant(hits) or not context_supports_question(question, hits):
            return {
                "answer": KNOWLEDGE_NOT_IN_DOCUMENT_MESSAGE,
                "from_rag": False,
                "sources": list({h["filename"] for h in hits if h.get("filename")}),
                "chunks": chunks,
                "score_threshold": threshold,
                "metadata_filter": metadata_filter or {},
            }

        context = self.build_context(hits)
        return {
            "context": context,
            "from_rag": True,
            "sources": list({h["filename"] for h in hits if h.get("filename")}),
            "chunks": chunks,
            "score_threshold": threshold,
            "metadata_filter": metadata_filter or {},
        }


@lru_cache
def get_rag_service() -> RagService:
    return RagService()
