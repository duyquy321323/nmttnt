"""Truy vấn RAG: chuẩn hóa câu hỏi và xếp hạng lại chunk theo từ khóa/số"""

import re

from app.core.config import settings


def is_mixed_expression(question: str) -> bool:
    """Biểu thức có cộng/trừ và nhân/chia (vd 500 + 6 x 3)."""
    return bool(
        re.search(r"\d+\s*[x×*]\s*\d+", question, re.IGNORECASE)
        and "+" in question
    )


def detect_question_type(question: str) -> str | None:
    q = question.lower()
    if is_mixed_expression(question):
        return "mixed_expression"
    if re.search(r"\d+\s*[x×*]\s*\d+", question, re.IGNORECASE):
        return "multiply"
    if re.search(r"\d+\s*:\s*\d+", question) or "chia" in q:
        return "divide"
    if "tìm x" in q or "tim x" in q or re.search(r"\bx\s*[\+\-]", q):
        return "find_x"
    if re.search(r"\d+\s*[\+\-]\s*\d+", question):
        return "add_subtract"
    return None


def normalize_query(query: str) -> str:
    """4x7 -> 4 x 7 để embedding và khớp từ trong tài liệu."""
    text = query.strip()
    text = re.sub(
        r"(\d+)\s*[x×*]\s*(\d+)",
        r"\1 x \2",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r"(\d+)[x×*](\d+)",
        r"\1 x \2",
        text,
        flags=re.IGNORECASE,
    )
    return text


def parse_multiply(question: str) -> tuple[str, str] | None:
    match = re.search(r"(\d+)\s*[x×*]\s*(\d+)", question, re.IGNORECASE)
    if not match:
        return None
    return match.group(1), match.group(2)


def multiply_teaching_chunk_score(chunk_text: str) -> float:
    """Điểm chunk có mẫu dạy phép nhân (Bài 1, lời giải mẫu...)."""
    if not chunk_text:
        return 0.0

    c = chunk_text.lower()
    score = 0.0
    if "phep nhan" in c or "phan i:" in c:
        score += 0.35
    if "loi giai" in c and re.search(r"\d+\s*[x×*]\s*\d+", chunk_text, re.IGNORECASE):
        score += 0.35
    if "cong them" in c or "bang nhan" in c or "dap so" in c:
        score += 0.2
    if "bai 1" in c or "bai 1." in c:
        score += 0.15
    return min(score, 1.0)


def addition_teaching_chunk_score(chunk_text: str) -> float:
    """Điểm chunk có mẫu dạy phép cộng/trừ (Phần II...)."""
    if not chunk_text:
        return 0.0

    c = chunk_text.lower()
    score = 0.0
    if "phep cong" in c or "phan ii" in c:
        score += 0.4
    if re.search(r"\d+\s*\+\s*\d+", chunk_text):
        score += 0.3
    if "hang don vi" in c or "hang chuc" in c or "hang ram" in c:
        score += 0.2
    if "phep tru" in c:
        score += 0.15
    return min(score, 1.0)


def lexical_relevance_score(question: str, chunk_text: str) -> float:
    """Điểm khớp từ/số giữa câu hỏi và chunk (0..1)."""
    if not chunk_text:
        return 0.0

    score = 0.0
    q_lower = question.lower()
    chunk_lower = chunk_text.lower()

    numbers = re.findall(r"\d+", question)
    if numbers:
        matched = sum(1 for num in numbers if num in chunk_text)
        score += (matched / len(numbers)) * 0.2

    multiply = parse_multiply(question)
    if multiply:
        a, b = multiply
        pattern = rf"{a}\s*[x×*]\s*{b}"
        if re.search(pattern, chunk_text, re.IGNORECASE):
            score += 0.45
        teaching = multiply_teaching_chunk_score(chunk_text)
        score += teaching * 0.55
        if teaching >= 0.35:
            score += 0.15

    keywords = ("nhân", "phep nhan", "bảng nhân", "tính:", "tinh:")
    if any(k in q_lower for k in ("nhân", "x ", "×")):
        if any(k in chunk_lower for k in keywords) or re.search(
            r"\d+\s*x\s*\d+", chunk_lower
        ):
            score += 0.1

    if is_mixed_expression(question):
        score += addition_teaching_chunk_score(chunk_text) * 0.5

    if re.search(r"\d+\s*\+\s*\d+", question) and "phep cong" in chunk_lower:
        score += 0.2

    grammar_q = (
        "loai tu",
        "loại từ",
        "tu loai",
        "danh tu",
        "danh từ",
        "dong tu",
        "động từ",
        "tinh tu",
        "tính từ",
    )
    if any(marker in q_lower for marker in grammar_q):
        grammar_chunk = (
            "danh tu",
            "dong tu",
            "tinh tu",
            "tu loai",
            "phan loai",
            "loi giai - phan loai",
        )
        if any(marker in chunk_lower for marker in grammar_chunk):
            score += 0.45
        if "hoc sinh" in q_lower and "hoc sinh" in chunk_lower:
            score += 0.4

    return min(score, 1.0)


def chunk_section_penalty(question: str, chunk_text: str) -> float:
    """Giảm điểm chunk sai phần (vd hình học khi hỏi phép nhân)."""
    if detect_question_type(question) not in ("multiply", "mixed_expression"):
        return 0.0
    c = chunk_text.lower()
    noise = (
        "dien tich",
        "chu vi",
        "doi don vi",
        "thoi gian",
        "ban do",
        "bac si kham",
        "hinh vuong",
        "hinh chu nhat",
    )
    if any(marker in c for marker in noise):
        return 0.55
    return 0.0


def rerank_hits(
    question: str,
    hits: list[dict],
    vector_weight: float = 0.35,
    lexical_weight: float = 0.65,
) -> list[dict]:
    for hit in hits:
        text = hit.get("text", "")
        lexical = lexical_relevance_score(question, text)
        vector_score = hit.get("vector_score", hit.get("score", 0.0))
        penalty = chunk_section_penalty(question, text)
        hit["vector_score"] = round(vector_score, 4)
        hit["lexical_score"] = round(lexical, 4)
        hit["score"] = round(
            vector_weight * vector_score + lexical_weight * lexical - penalty,
            4,
        )
    return sorted(hits, key=lambda item: item["score"], reverse=True)


def select_hits_for_context(question: str, hits: list[dict]) -> list[dict]:
    """Chọn chunk đưa vào LLM — ưu tiên đúng dạng bài, bỏ nhiễu."""
    if not hits:
        return hits

    q_type = detect_question_type(question)

    if q_type == "mixed_expression":
        multiply_chunks = [
            h
            for h in hits
            if multiply_teaching_chunk_score(h.get("text", "")) >= 0.35
        ]
        add_chunks = [
            h
            for h in hits
            if addition_teaching_chunk_score(h.get("text", "")) >= 0.35
        ]
        clean = [
            h
            for h in hits
            if chunk_section_penalty(question, h.get("text", "")) == 0
        ]
        ordered = merge_hits(merge_hits(multiply_chunks, add_chunks), clean)
        return ordered[:4] if ordered else hits[:4]

    if q_type == "multiply":
        teaching = [
            h
            for h in hits
            if multiply_teaching_chunk_score(h.get("text", "")) >= 0.35
        ]
        clean = [
            h
            for h in hits
            if chunk_section_penalty(question, h.get("text", "")) == 0
        ]
        ordered = merge_hits(teaching, clean)
        return ordered[:3] if ordered else hits[:3]

    return hits[: settings.RAG_TOP_K]


def context_supports_question(question: str, hits: list[dict]) -> bool:
    """Ngữ cảnh có dạng toán cần thiết (không cần trùng số)."""
    if not hits:
        return False

    texts = " ".join(h.get("text", "") for h in hits).lower()
    q_type = detect_question_type(question)

    if q_type == "mixed_expression":
        has_mul = multiply_teaching_chunk_score(texts) >= 0.35 or bool(
            re.search(r"\d+\s*[x×*]\s*\d+", texts, re.IGNORECASE)
        )
        has_add = addition_teaching_chunk_score(texts) >= 0.35 or "phep cong" in texts
        return has_mul and has_add

    if q_type == "multiply":
        return multiply_teaching_chunk_score(texts) >= 0.35 or bool(
            re.search(r"\d+\s*[x×*]\s*\d+", texts, re.IGNORECASE)
        )

    if q_type == "add_subtract":
        return addition_teaching_chunk_score(texts) >= 0.35 or bool(
            re.search(r"\d+\s*[\+\-]\s*\d+", texts)
        )

    if q_type in ("divide", "find_x", "word_problem"):
        return "loi giai" in texts or "bai " in texts

    return True


def hits_are_relevant(hits: list[dict]) -> bool:
    """Chunk có đủ liên quan để được phép gọi LLM — tránh trả lời bịa."""
    if not hits:
        return False

    for hit in hits:
        vector_score = hit.get("vector_score", 0.0)
        lexical_score = hit.get("lexical_score", 0.0)
        rerank_score = hit.get("score", 0.0)

        if vector_score >= settings.RAG_SCORE_THRESHOLD:
            return True
        if lexical_score >= settings.RAG_MIN_LEXICAL_SCORE and vector_score >= settings.RAG_MIN_VECTOR_SCORE:
            return True
        if lexical_score >= 0.5:
            return True
        if rerank_score >= settings.RAG_MIN_RERANK_SCORE:
            return True

    return False


def merge_hits(primary: list[dict], extra: list[dict]) -> list[dict]:
    seen: set[str] = set()
    merged: list[dict] = []
    for hit in primary + extra:
        key = f"{hit.get('document_id')}:{hit.get('chunk_index')}"
        if key in seen:
            continue
        seen.add(key)
        merged.append(hit)
    return merged
