"""Chuẩn hóa câu hỏi — sai chính tả, khoảng trắng, cách viết không dấu."""

import re
import unicodedata

# Cặp (pattern không dấu / sai chính tả, thay thế)
_SPELLING_FIXES: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\bbang\b", re.IGNORECASE), "bằng"),
    (re.compile(r"\bmay\b", re.IGNORECASE), "mấy"),
    (re.compile(r"\bbao nhieu\b", re.IGNORECASE), "bao nhiêu"),
    (re.compile(r"\bphep\b", re.IGNORECASE), "phép"),
    (re.compile(r"\bnhan\b", re.IGNORECASE), "nhân"),
    (re.compile(r"\bcong\b", re.IGNORECASE), "cộng"),
    (re.compile(r"\btru\b", re.IGNORECASE), "trừ"),
    (re.compile(r"\bchia\b", re.IGNORECASE), "chia"),
    (re.compile(r"\blop\b", re.IGNORECASE), "lớp"),
    (re.compile(r"\btoan\b", re.IGNORECASE), "toán"),
    (re.compile(r"\bbai\b", re.IGNORECASE), "bài"),
    (re.compile(r"\bgiai\b", re.IGNORECASE), "giải"),
    (re.compile(r"\btinh\b", re.IGNORECASE), "tính"),
    (re.compile(r"\bket qua\b", re.IGNORECASE), "kết quả"),
    (re.compile(r"\bgiup em\b", re.IGNORECASE), "giúp em"),
    (re.compile(r"\blam sao\b", re.IGNORECASE), "làm sao"),
    (re.compile(r"\bcai nay\b", re.IGNORECASE), "cái này"),
    (re.compile(r"\bbai nay\b", re.IGNORECASE), "bài này"),
]

_MATH_SPACING = re.compile(r"(\d+)\s*[x×*]\s*(\d+)")


def _strip_accents(text: str) -> str:
    normalized = unicodedata.normalize("NFD", text)
    return "".join(char for char in normalized if unicodedata.category(char) != "Mn")


def normalize_user_query(text: str) -> str:
    """Chuẩn hóa câu hỏi trước khi RAG và phân tích metadata."""
    result = text.strip()
    if not result:
        return result

    result = _MATH_SPACING.sub(r"\1 x \2", result)
    result = re.sub(r"\s+", " ", result)

    accentless = _strip_accents(result.lower())
    for pattern, replacement in _SPELLING_FIXES:
        if pattern.search(accentless):
            result = pattern.sub(replacement, result)

    return result.strip()
