from fastapi import APIRouter

from app.services.rag_service import get_rag_service

documents_router = APIRouter()


@documents_router.get("/status")
async def document_status():
    """Trạng thái kho RAG — guest có thể xem."""
    rag_service = get_rag_service()
    status = rag_service.get_storage_status()

    if status["has_documents"]:
        names = ", ".join(doc["filename"] for doc in status["documents"])
        message = (
            f"Kho tài liệu đã sẵn sàng ({status['document_count']} file, "
            f"{status['total_points']} chunk): {names}"
        )
    else:
        message = "Kho tài liệu đang trống, chờ giáo viên tải lên."

    return {
        **status,
        "message": message,
    }
