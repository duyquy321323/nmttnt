"""Generate vector embeddings for text"""

from functools import lru_cache

from sentence_transformers import SentenceTransformer

from app.core.config import settings


class EmbeddingService:
    def __init__(self) -> None:
        self._model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)

    @property
    def vector_size(self) -> int:
        return self._model.get_sentence_embedding_dimension()

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        vectors = self._model.encode(texts, normalize_embeddings=True)
        return vectors.tolist()

    def embed_query(self, query: str) -> list[float]:
        return self.embed_texts([query])[0]


@lru_cache
def get_embedding_service() -> EmbeddingService:
    return EmbeddingService()
