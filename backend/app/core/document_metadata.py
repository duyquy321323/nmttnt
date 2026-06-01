"""Hằng số và helper metadata học liệu cho RAG."""

from typing import TypedDict

MATERIAL_TYPE_CURRICULUM = "curriculum"
MATERIAL_TYPE_EXERCISE = "exercise"
MATERIAL_TYPE_VOCABULARY = "vocabulary"
MATERIAL_TYPE_LOCAL_EXAMPLE = "local_example"

MATERIAL_TYPE_LABELS: dict[str, str] = {
    MATERIAL_TYPE_CURRICULUM: "Chương trình học",
    MATERIAL_TYPE_EXERCISE: "Bài tập & đáp án",
    MATERIAL_TYPE_VOCABULARY: "Từ vựng khó",
    MATERIAL_TYPE_LOCAL_EXAMPLE: "Ví dụ địa phương",
}

ALLOWED_MATERIAL_TYPES = set(MATERIAL_TYPE_LABELS.keys())

METADATA_FIELD_NAMES = (
    "material_type",
    "grade",
    "subject",
    "lesson",
    "level",
    "skill",
    "vietnamese_level",
    "region",
)


class DocumentMetadataDict(TypedDict, total=False):
    material_type: str
    grade: str
    subject: str
    lesson: str
    level: str
    skill: str
    vietnamese_level: str
    region: str


def normalize_metadata(raw: dict | None) -> dict[str, str]:
    """Chuẩn hóa metadata trước khi lưu DB hoặc gắn vào Qdrant payload."""
    if not raw:
        return {}

    normalized: dict[str, str] = {}
    for field in METADATA_FIELD_NAMES:
        value = raw.get(field)
        if value is None:
            continue
        text = str(value).strip()
        if text:
            normalized[field] = text

    material_type = normalized.get("material_type")
    if material_type and material_type not in ALLOWED_MATERIAL_TYPES:
        raise ValueError(
            f"Loại học liệu không hợp lệ. Chọn một trong: {', '.join(ALLOWED_MATERIAL_TYPES)}"
        )

    return normalized


def metadata_to_payload(metadata: dict[str, str]) -> dict[str, str]:
    """Payload metadata gắn vào từng chunk trong Qdrant."""
    return dict(metadata)
