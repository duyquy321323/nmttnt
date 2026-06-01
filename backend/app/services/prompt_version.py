"""Versioning prompt — hash nội dung file .md."""

import hashlib
from functools import lru_cache
from pathlib import Path

_PROMPT_CHAT_DIR = Path(__file__).resolve().parent.parent / "prompt" / "chat"


@lru_cache
def get_prompt_version() -> str:
    """Hash gộp các file prompt chat để ghi log phiên bản."""
    digest = hashlib.sha256()
    for file_path in sorted(_PROMPT_CHAT_DIR.glob("*.md")):
        digest.update(file_path.name.encode("utf-8"))
        digest.update(file_path.read_bytes())
    return digest.hexdigest()[:12]
