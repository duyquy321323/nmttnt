"""Gemini API — chỉ load prompt từ file .md và gọi model."""

import asyncio
import logging
from functools import lru_cache

from google import genai
from google.genai import types

from app.core.config import settings
from app.prompt import get_prompt


logger = logging.getLogger(__name__)

_FALLBACK_MODELS = (
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
)


class ChatbotService:
    def __init__(self) -> None:
        if not settings.GEMINI_API_KEY:
            raise ValueError(
                "GEMINI_API_KEY chưa được cấu hình. Thêm key vào file .env."
            )
        self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self._model = settings.GEMINI_MODEL

    def _model_candidates(self) -> tuple[str, ...]:
        candidates = [self._model, *_FALLBACK_MODELS]
        seen: set[str] = set()
        unique_candidates: list[str] = []
        for model in candidates:
            if model in seen:
                continue
            seen.add(model)
            unique_candidates.append(model)
        return tuple(unique_candidates)

    @staticmethod
    def _response_text(response) -> str:
        text = response.text
        if text:
            return text.strip()

        parts: list[str] = []
        if response.candidates:
            for part in response.candidates[0].content.parts or []:
                if getattr(part, "text", None):
                    parts.append(part.text)
        if parts:
            return "\n".join(parts).strip()
        raise RuntimeError("Gemini không trả về nội dung.")

    def _build_generation_config(self, system_prompt: str) -> types.GenerateContentConfig:
        kwargs: dict = {
            "system_instruction": system_prompt,
            "temperature": settings.GEMINI_TEMPERATURE,
            "max_output_tokens": settings.GEMINI_MAX_OUTPUT_TOKENS,
        }
        if settings.GEMINI_THINKING_BUDGET == 0:
            try:
                kwargs["thinking_config"] = types.ThinkingConfig(thinking_budget=0)
            except (TypeError, AttributeError):
                pass
        return types.GenerateContentConfig(**kwargs)

    def _generate_sync(self, system_prompt: str, user_content: str) -> str:
        config = self._build_generation_config(system_prompt)
        last_error: Exception | None = None
        candidates = self._model_candidates()
        for index, model_name in enumerate(candidates):
            try:
                response = self._client.models.generate_content(
                    model=model_name,
                    contents=user_content,
                    config=config,
                )
            except Exception as exc:
                last_error = exc
                logger.exception(
                    "Gemini generate_content failed stage=generate_content attempt=%d/%d model=%s system_prompt_chars=%d user_content_chars=%d",
                    index + 1,
                    len(candidates),
                    model_name,
                    len(system_prompt),
                    len(user_content),
                )
                if index + 1 < len(candidates) and "not available" in str(exc).lower():
                    logger.warning(
                        "Gemini model unavailable, falling back to next candidate model=%s",
                        candidates[index + 1],
                    )
                    continue
                raise

        try:
            return self._response_text(response)
        except Exception:
            logger.exception(
                "Gemini response parsing failed stage=response_text model=%s system_prompt_chars=%d user_content_chars=%d",
                model_name,
                len(system_prompt),
                len(user_content),
            )
            raise

    async def _generate(self, system_prompt: str, user_content: str) -> str:
        return await asyncio.to_thread(
            self._generate_sync, system_prompt, user_content
        )

    @staticmethod
    def _compose_general_system_prompt(base_prompt_path: str) -> str:
        base = get_prompt(base_prompt_path).strip()
        fairness = get_prompt("chat/fairness_guidelines.md").strip()
        robustness = get_prompt("chat/robustness_guidelines.md").strip()
        return f"{base}\n\n{fairness}\n\n{robustness}"

    async def generate(self, prompt: str) -> str:
        system_prompt = self._compose_general_system_prompt("chat/general_instruction.md")
        return await self._generate(system_prompt, prompt)

    @staticmethod
    def _compose_rag_system_prompt(base_prompt_path: str) -> str:
        base = get_prompt(base_prompt_path).strip()
        fairness = get_prompt("chat/fairness_guidelines.md").strip()
        robustness = get_prompt("chat/robustness_guidelines.md").strip()
        explainability = get_prompt("chat/explainability_guidelines.md").strip()
        return f"{base}\n\n{fairness}\n\n{robustness}\n\n{explainability}"

    async def generate_with_context(
        self,
        question: str,
        context: str,
        history: list[dict] | None = None,
        explainability_hint: str = "",
        system_prompt: str | None = None,
        user_content: str | None = None,
    ) -> str:
        resolved_system_prompt = system_prompt or self._compose_rag_system_prompt("chat/rag_system_instruction.md")
        if user_content is None:
            history_text = self._format_history(history or [])
            hint_block = explainability_hint.strip() or "Tuân thủ explainability guidelines."
            user_content = get_prompt(
                "chat/rag_user_template.md",
                context=context,
                question=question,
                explainability_hint=hint_block,
            )
            if history_text:
                user_content = f"{history_text}\n{user_content}"
        return await self._generate(resolved_system_prompt, user_content)

    @staticmethod
    def _format_history(history: list[dict]) -> str:
        if not history:
            return ""
        lines: list[str] = []
        for item in history[-20:]:
            role = item.get("role", "user")
            label = "Học sinh" if role == "user" else "Chatbot"
            lines.append(f"{label}: {item.get('content', '')}")
        return "Lịch sử hội thoại gần đây:\n" + "\n".join(lines)


@lru_cache
def get_chatbot_service() -> ChatbotService:
    return ChatbotService()
