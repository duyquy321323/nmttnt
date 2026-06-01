"""Kiểm tra và hỗ trợ giải thích từng bước (explainability)."""

import re

_EXERCISE_PATTERN = re.compile(
    r"(\d+\s*[:÷/×x*+\-]\s*\d+|\btính\b|\bbằng\b|\bchia\b|\bnhân\b|\bcộng\b|\btrừ\b|\bgiải\b|\btìm\s*x\b)",
    re.IGNORECASE,
)

_STUDENT_ANSWER_PATTERN = re.compile(
    r"^(em\s+(nghĩ|đoán|trả lời)\s+(là\s+)?)?[\d.,\s/:=x×+\-]+$|"
    r"^(là\s+)?[\d.,]+(\s*(đ|là đúng))?$",
    re.IGNORECASE,
)

_STEP_MARKERS = (
    "bước",
    "=>",
    "vì",
    "tại vì",
    "cách làm",
    "lời giải",
    "1.",
    "2.",
    "###",
)

_ANALOGY_MARKERS = ("ví dụ", "hình dung", "tưởng tượng", "ngô", "bắp", "chia đều", "làng", "nương")

_WHY_MARKERS = ("vì sao", "tại vì", "vì cô", "do ", "nên ")

_PRACTICE_MARKERS = ("em thử", "thử thêm", "luyện thêm", "em thử làm")

_COUNTERFACTUAL_MARKERS = ("nếu đổi", "nếu thay", "đổi thành", "nếu số")


def is_exercise_question(question: str) -> bool:
    """Câu hỏi có phải dạng bài tập / tính toán không."""
    return bool(_EXERCISE_PATTERN.search(question.strip()))


def detect_student_answer_attempt(question: str) -> bool:
    """Học sinh chỉ gửi đáp số / phép tính ngắn thay vì hỏi bài."""
    text = question.strip()
    if len(text) > 40:
        return False
    return bool(_STUDENT_ANSWER_PATTERN.match(text)) or (
        len(text) <= 8 and bool(re.search(r"\d", text))
    )


def build_explainability_hint(question: str, history: list[dict] | None = None) -> str:
    """Gợi ý bổ sung cho prompt khi cần giải thích sâu."""
    hints: list[str] = []

    if is_exercise_question(question):
        hints.append(
            "Đây là câu bài tập: bắt buộc dùng cấu trúc ### Ví dụ gần gũi → ### Cách làm từng bước → "
            "### Vì sao cô giải như vậy → ### Đáp số → ### Em thử thêm. Không chỉ ghi đáp số."
        )

    if detect_student_answer_attempt(question):
        hints.append(
            "Em có vẻ đang trả lời bằng số. Hãy giải thích vì sao đáp án có thể chưa đúng (nếu sai) "
            "hoặc xác nhận đúng kèm lý do từng bước — không chỉ nói 'đúng rồi'."
        )

    if history:
        last_assistant = next(
            (m.get("content", "") for m in reversed(history) if m.get("role") == "assistant"),
            "",
        )
        if "em thử" in last_assistant.lower() and detect_student_answer_attempt(question):
            hints.append(
                "Em đang trả lời bài luyện tập gợi ý trước đó. So sánh từng bước và giải thích đúng/sai."
            )

    return "\n".join(hints)


def validate_explanation(answer: str, question: str) -> dict:
    """Đánh giá câu trả lời có đạt chuẩn explainability không."""
    if not is_exercise_question(question):
        return {
            "meets_standard": True,
            "is_exercise": False,
            "has_steps": True,
            "has_analogy": True,
            "has_why": True,
            "has_practice": True,
            "has_counterfactual": False,
        }

    text = answer.strip()
    lower = text.lower()

    has_steps = any(marker in lower or marker in text for marker in _STEP_MARKERS)
    has_analogy = any(marker in lower for marker in _ANALOGY_MARKERS)
    has_why = any(marker in lower for marker in _WHY_MARKERS) or "### vì sao" in lower
    has_practice = any(marker in lower for marker in _PRACTICE_MARKERS)
    has_counterfactual = any(marker in lower for marker in _COUNTERFACTUAL_MARKERS)
    only_number = bool(re.fullmatch(r"[\d\s.,]+", text.replace(" ", "")))

    meets = (
        len(text) >= 80
        and has_steps
        and not only_number
        and (has_analogy or "ví dụ" in lower)
        and has_practice
    )

    return {
        "meets_standard": meets,
        "is_exercise": True,
        "has_steps": has_steps,
        "has_analogy": has_analogy,
        "has_why": has_why,
        "has_practice": has_practice,
        "has_counterfactual": has_counterfactual,
    }


RETRY_EXPLANATION_HINT = (
    "Câu trả lời trước chưa đủ giải thích từng bước. Viết lại đầy đủ theo cấu trúc "
    "### Ví dụ gần gũi, ### Cách làm từng bước, ### Vì sao cô giải như vậy, ### Đáp số, ### Em thử thêm."
)
