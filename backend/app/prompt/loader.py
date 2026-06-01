"""Đọc prompt từ file Markdown trong thư mục app/prompt."""

from pathlib import Path

_PROMPT_ROOT = Path(__file__).resolve().parent


class _SafeFormatDict(dict):
    def __missing__(self, key: str) -> str:
        return "{" + key + "}"


def get_prompt(path: str, **variables: str) -> str:
    """
    Đọc nội dung prompt từ file .md.

    Args:
        path: Đường dẫn tương đối trong app/prompt (vd: chat/rag_system_instruction.md).
        **variables: Thay thế placeholder {ten_bien} trong file.

    Returns:
        Chuỗi prompt đã trim.
    """
    relative = path.replace("\\", "/").lstrip("/")
    file_path = _PROMPT_ROOT / relative
    if file_path.suffix.lower() != ".md":
        file_path = file_path.with_suffix(".md")

    if not file_path.is_file():
        raise FileNotFoundError(f"Không tìm thấy file prompt: {file_path}")

    content = file_path.read_text(encoding="utf-8").strip()
    if not variables:
        return content
    return content.format_map(_SafeFormatDict(variables))
