"""Loại fallback và thông báo robustness."""

from enum import Enum


class FallbackReason(str, Enum):
    NONE = "none"
    NO_DOCUMENTS = "no_documents"
    NO_MATCH = "no_match"
    CLARIFICATION = "clarification"
    SENSITIVE = "sensitive"
    API_ERROR = "api_error"


CLARIFICATION_MESSAGE = (
    "Cô chưa rõ em đang hỏi bài nào. Em ghi rõ môn học, lớp mấy và nội dung câu hỏi "
    "(hoặc chụp/ gõ lại đề bài) để cô hỗ trợ chính xác hơn nhé."
)

SENSITIVE_CONTENT_MESSAGE = (
    "Chủ đề này nhạy cảm, cô không thể trao đổi qua chatbot. "
    "Em hãy nói chuyện với cô giáo, phụ huynh hoặc người lớn tin cậy nhé."
)

API_ERROR_MESSAGE = (
    "Hệ thống đang gặp sự cố tạm thời. Em thử gửi lại sau vài giây nhé."
)
