"""Pipeline chat robustness — normalize, policy, clarification, RAG, log."""

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.fallback_types import (
    API_ERROR_MESSAGE,
    FallbackReason,
    SENSITIVE_CONTENT_MESSAGE,
)
from app.services.analytics_service import analytics_service
from app.services.chatbot_service import get_chatbot_service
from app.services.clarification_service import detect_clarification_need, detect_reask
from app.services.content_policy import is_sensitive_content
from app.services.explainability_service import (
    RETRY_EXPLANATION_HINT,
    build_explainability_hint,
    validate_explanation,
)
from app.services.metadata_extractor import extract_metadata_from_question, merge_metadata_filters
from app.services.query_normalizer import normalize_user_query
from app.services.rag_service import get_rag_service


def _resolve_metadata_filter(
    message: str,
    explicit: dict | None,
) -> dict[str, str]:
    extracted = extract_metadata_from_question(message)
    return merge_metadata_filters(explicit, extracted)


def _base_response(rag_result: dict, **extra) -> dict:
    return {
        "from_rag": rag_result.get("from_rag", False),
        "sources": rag_result.get("sources", []),
        "chunks": rag_result.get("chunks", []),
        "score_threshold": rag_result.get("score_threshold"),
        "metadata_filter": rag_result.get("metadata_filter", {}),
        "fallback_reason": rag_result.get("fallback_reason", FallbackReason.NONE.value),
        "needs_clarification": rag_result.get("needs_clarification", False),
        **extra,
    }


def _map_rag_fallback(rag_result: dict) -> FallbackReason:
    if rag_result.get("from_rag"):
        return FallbackReason.NONE
    answer = rag_result.get("answer", "")
    if "chưa tồn tại" in answer or "chờ giáo viên tải" in answer:
        return FallbackReason.NO_DOCUMENTS
    return FallbackReason.NO_MATCH


async def process_chat(
    db: Session | None,
    *,
    message: str,
    user_id: int | None = None,
    session_id: int | None = None,
    history: list[dict] | None = None,
    explicit_metadata_filter: dict | None = None,
) -> dict:
    """Xử lý một lượt chat với đầy đủ lớp robustness."""
    raw_message = message.strip()
    normalized = normalize_user_query(raw_message)
    metadata_filter = _resolve_metadata_filter(normalized, explicit_metadata_filter)
    is_reask = detect_reask(normalized, history)

    if is_sensitive_content(normalized):
        answer = SENSITIVE_CONTENT_MESSAGE
        interaction_id = None
        if db is not None:
            log = analytics_service.log_interaction(
                db,
                question=raw_message,
                normalized_question=normalized,
                answer=answer,
                from_rag=False,
                fallback_reason=FallbackReason.SENSITIVE,
                needs_clarification=False,
                is_reask=is_reask,
                user_id=user_id,
                session_id=session_id,
                metadata_filter=metadata_filter,
            )
            interaction_id = log.id
        return {
            "answer": answer,
            "from_rag": False,
            "sources": [],
            "chunks": [],
            "score_threshold": None,
            "metadata_filter": metadata_filter,
            "fallback_reason": FallbackReason.SENSITIVE.value,
            "needs_clarification": False,
            "interaction_id": interaction_id,
            "model": None,
        }

    needs_clarification, clarification_msg = detect_clarification_need(normalized, history)
    if needs_clarification:
        interaction_id = None
        if db is not None:
            log = analytics_service.log_interaction(
                db,
                question=raw_message,
                normalized_question=normalized,
                answer=clarification_msg,
                from_rag=False,
                fallback_reason=FallbackReason.CLARIFICATION,
                needs_clarification=True,
                is_reask=is_reask,
                user_id=user_id,
                session_id=session_id,
                metadata_filter=metadata_filter,
            )
            interaction_id = log.id
        return {
            "answer": clarification_msg,
            "from_rag": False,
            "sources": [],
            "chunks": [],
            "score_threshold": None,
            "metadata_filter": metadata_filter,
            "fallback_reason": FallbackReason.CLARIFICATION.value,
            "needs_clarification": True,
            "interaction_id": interaction_id,
            "model": None,
        }

    rag_service = get_rag_service()
    rag_result = rag_service.chat_or_fallback(
        normalized,
        metadata_filter=metadata_filter or None,
    )
    fallback_reason = _map_rag_fallback(rag_result)
    rag_result["fallback_reason"] = fallback_reason.value
    rag_result["needs_clarification"] = False

    top_score = None
    chunks = rag_result.get("chunks") or []
    if chunks and chunks[0].get("score") is not None:
        top_score = chunks[0]["score"]
    elif chunks and chunks[0].get("vector_score") is not None:
        top_score = chunks[0]["vector_score"]

    if not rag_result.get("from_rag"):
        answer = rag_result["answer"]
        interaction_id = None
        if db is not None:
            log = analytics_service.log_interaction(
                db,
                question=raw_message,
                normalized_question=normalized,
                answer=answer,
                from_rag=False,
                fallback_reason=fallback_reason,
                needs_clarification=False,
                is_reask=is_reask,
                user_id=user_id,
                session_id=session_id,
                metadata_filter=metadata_filter,
                rag_score=top_score,
            )
            interaction_id = log.id
        return {
            **_base_response(rag_result),
            "answer": answer,
            "interaction_id": interaction_id,
            "model": None,
        }

    if not settings.GEMINI_API_KEY:
        from fastapi import HTTPException

        raise HTTPException(status_code=503, detail="GEMINI_API_KEY chưa được cấu hình.")

    try:
        chatbot_service = get_chatbot_service()
        explain_hint = build_explainability_hint(normalized, history)
        answer = await chatbot_service.generate_with_context(
            normalized,
            rag_result["context"],
            history=history,
            explainability_hint=explain_hint,
        )
        explanation = validate_explanation(answer, normalized)
        if not explanation["meets_standard"]:
            retry_hint = f"{RETRY_EXPLANATION_HINT}\n{explain_hint}"
            answer = await chatbot_service.generate_with_context(
                normalized,
                rag_result["context"],
                history=history,
                explainability_hint=retry_hint,
            )
            explanation = validate_explanation(answer, normalized)
    except Exception:
        answer = API_ERROR_MESSAGE
        interaction_id = None
        if db is not None:
            log = analytics_service.log_interaction(
                db,
                question=raw_message,
                normalized_question=normalized,
                answer=answer,
                from_rag=False,
                fallback_reason=FallbackReason.API_ERROR,
                needs_clarification=False,
                is_reask=is_reask,
                user_id=user_id,
                session_id=session_id,
                metadata_filter=metadata_filter,
                rag_score=top_score,
            )
            interaction_id = log.id
        return {
            **_base_response(rag_result, fallback_reason=FallbackReason.API_ERROR.value),
            "answer": answer,
            "interaction_id": interaction_id,
            "model": None,
        }

    interaction_id = None
    if db is not None:
        log = analytics_service.log_interaction(
            db,
            question=raw_message,
            normalized_question=normalized,
            answer=answer,
            from_rag=True,
            fallback_reason=FallbackReason.NONE,
            needs_clarification=False,
            is_reask=is_reask,
            user_id=user_id,
            session_id=session_id,
            metadata_filter=metadata_filter,
            rag_score=top_score,
        )
        interaction_id = log.id

    return {
        **_base_response(rag_result),
        "answer": answer,
        "interaction_id": interaction_id,
        "model": settings.GEMINI_MODEL,
        "explanation": explanation,
    }
