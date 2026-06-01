"""Kiểm tra nội dung nhạy cảm — fallback an toàn."""

import re

_SENSITIVE_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"tự\s*tử", re.IGNORECASE),
    re.compile(r"tự\s*sát", re.IGNORECASE),
    re.compile(r"giết\s*người", re.IGNORECASE),
    re.compile(r"khiêu\s*dâm", re.IGNORECASE),
    re.compile(r"quan\s*hệ\s*tình\s*dục", re.IGNORECASE),
    re.compile(r"ma\s*túy", re.IGNORECASE),
    re.compile(r"chất\s*kích\s*thích", re.IGNORECASE),
    re.compile(r"\bsex\b", re.IGNORECASE),
    re.compile(r"bạo\s*lực\s*gia\s*đình", re.IGNORECASE),
]


def is_sensitive_content(text: str) -> bool:
    """Phát hiện chủ đề nhạy cảm cần dừng và chuyển sang người lớn."""
    if not text.strip():
        return False
    return any(pattern.search(text) for pattern in _SENSITIVE_PATTERNS)
