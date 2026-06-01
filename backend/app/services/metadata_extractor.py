"""Trích metadata từ câu hỏi để lọc RAG."""

import re

from app.core.document_metadata import normalize_metadata

GRADE_PATTERN = re.compile(r"(?:lớp|grade)\s*(\d+)", re.IGNORECASE)
LESSON_PATTERN = re.compile(
    r"(?:bài|lesson)\s*(\d+|[IVXLC]+)",
    re.IGNORECASE,
)

SUBJECT_KEYWORDS: dict[str, str] = {
    "toán": "Toán",
    "toán học": "Toán",
    "math": "Toán",
    "tiếng việt": "Tiếng Việt",
    "văn": "Tiếng Việt",
    "khoa học": "Khoa học",
    "science": "Khoa học",
    "lịch sử": "Lịch sử",
    "địa lý": "Địa lý",
    "tiếng anh": "Tiếng Anh",
    "english": "Tiếng Anh",
}

LEVEL_KEYWORDS: dict[str, str] = {
    "cơ bản": "cơ bản",
    "nâng cao": "nâng cao",
    "khó": "nâng cao",
    "dễ": "cơ bản",
}


def extract_metadata_from_question(question: str) -> dict[str, str]:
    """Suy luận metadata từ câu hỏi tự nhiên của học sinh."""
    if not question.strip():
        return {}

    extracted: dict[str, str] = {}
    lowered = question.lower()

    grade_match = GRADE_PATTERN.search(question)
    if grade_match:
        extracted["grade"] = grade_match.group(1)

    lesson_match = LESSON_PATTERN.search(question)
    if lesson_match:
        extracted["lesson"] = lesson_match.group(1)

    for keyword, subject in SUBJECT_KEYWORDS.items():
        if keyword in lowered:
            extracted["subject"] = subject
            break

    for keyword, level in LEVEL_KEYWORDS.items():
        if keyword in lowered:
            extracted["level"] = level
            break

    return normalize_metadata(extracted)


def merge_metadata_filters(
    explicit: dict | None,
    extracted: dict | None,
) -> dict[str, str]:
    """Gộp filter tường minh (ưu tiên) với filter trích từ câu hỏi."""
    merged: dict[str, str] = {}
    if extracted:
        merged.update(extracted)
    if explicit:
        merged.update(normalize_metadata(explicit))
    return merged


def hit_matches_metadata(hit: dict, metadata_filter: dict[str, str]) -> bool:
    """Kiểm tra chunk có khớp filter metadata hay không."""
    if not metadata_filter:
        return True

    for field, expected in metadata_filter.items():
        if not expected:
            continue
        actual = hit.get(field)
        if actual is None:
            return False
        if str(actual).strip().lower() != expected.strip().lower():
            return False
    return True
