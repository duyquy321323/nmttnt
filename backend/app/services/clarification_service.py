"""Phát hiện câu hỏi thiếu ngữ cảnh — yêu cầu hỏi lại."""

import re

from app.core.fallback_types import CLARIFICATION_MESSAGE

_VAGUE_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"bài này", re.IGNORECASE),
    re.compile(r"câu này", re.IGNORECASE),
    re.compile(r"cái này", re.IGNORECASE),
    re.compile(r"làm sao", re.IGNORECASE),
    re.compile(r"giúp em", re.IGNORECASE),
    re.compile(r"giải giúp", re.IGNORECASE),
    re.compile(r"không hiểu", re.IGNORECASE),
    re.compile(r"em không biết", re.IGNORECASE),
]

_HAS_SPECIFIC = re.compile(
    r"(\d+|lớp|toán|tiếng việt|khoa học|phép|cộng|trừ|nhân|chia|bài\s*\d+)",
    re.IGNORECASE,
)


def detect_clarification_need(
    question: str,
    history: list[dict] | None = None,
) -> tuple[bool, str]:
    """
    Trả về (cần_hỏi_lại, câu_hỏi_lại).
    Bỏ qua nếu lịch sử đã có ngữ cảnh gần đây.
    """
    text = question.strip()
    if len(text) < 4:
        return True, CLARIFICATION_MESSAGE

    if _HAS_SPECIFIC.search(text):
        return False, ""

    vague_hits = sum(1 for pattern in _VAGUE_PATTERNS if pattern.search(text))
    if vague_hits == 0:
        return False, ""

    if len(text) >= 40:
        return False, ""

    if history:
        recent = " ".join(item.get("content", "") for item in history[-4:])
        if _HAS_SPECIFIC.search(recent):
            return False, ""

    return True, CLARIFICATION_MESSAGE


def detect_reask(question: str, history: list[dict] | None) -> bool:
    """Phát hiện em hỏi lại cùng ý (theo dõi re-ask accuracy)."""
    if not history:
        return False

    normalized = re.sub(r"\s+", " ", question.strip().lower())
    if len(normalized) < 6:
        return False

    for item in reversed(history[-6:]):
        if item.get("role") != "user":
            continue
        prior = re.sub(r"\s+", " ", item.get("content", "").strip().lower())
        if prior and prior == normalized:
            return True
    return False
