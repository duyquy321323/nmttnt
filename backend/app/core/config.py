from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
from typing import Optional
import json


class Settings(BaseSettings):
    """Application settings."""

    # Basic settings
    PROJECT_NAME: str = "DATN Backend"
    API_V1_STR: str = "/api/v1"

    # CORS - stored as string to avoid JSON parsing issues, then converted to list
    # Use alias to map from BACKEND_CORS_ORIGINS env var to this field
    cors_origins_str: str = Field(
        default="http://localhost:3001", alias="BACKEND_CORS_ORIGINS"
    )

    @property
    def BACKEND_CORS_ORIGINS(self) -> List[str]:
        """
        Convert stored CORS origins string to list.
        Supports both JSON format and comma-separated format.
        """
        value = self.cors_origins_str
        if not value:
            return ["http://localhost:3001"]

        # Try to parse as JSON first
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return parsed
        except (json.JSONDecodeError, ValueError):
            pass

        # If JSON parsing fails, treat as comma-separated string
        origins = [origin.strip() for origin in value.split(",") if origin.strip()]
        return origins if origins else ["http://localhost:3001"]

    # Gemini LLM
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.0-flash"
    GEMINI_TEMPERATURE: float = 0.3
    GEMINI_MAX_OUTPUT_TOKENS: int = 2048
    GEMINI_THINKING_BUDGET: int = 0

    # Qdrant / RAG settings
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_COLLECTION_NAME: str = "edu_documents"
    EMBEDDING_MODEL_NAME: str = (
        "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    )
    RAG_CHUNK_SIZE: int = 500
    RAG_CHUNK_OVERLAP: int = 80
    RAG_FETCH_K: int = 20
    RAG_TOP_K: int = 5
    RAG_SCORE_THRESHOLD: float = 0.45
    RAG_MIN_LEXICAL_SCORE: float = 0.25
    RAG_MIN_VECTOR_SCORE: float = 0.32
    RAG_MIN_RERANK_SCORE: float = 0.35

    # Database (MySQL)
    DATABASE_URL: str = (
        "mysql+pymysql://edu:edu123@localhost:3306/edu_chatbot?charset=utf8mb4"
    )

    # Auth
    JWT_SECRET_KEY: str = "change-me-in-production-use-long-random-string"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Default accounts
    ADMIN_DEFAULT_USERNAME: str = "admin"
    ADMIN_DEFAULT_PASSWORD: str = "Admin@123"
    TEACHER_DEFAULT_PASSWORD: str = "Teacher@123"
    STUDENT_DEFAULT_PASSWORD: str = "Student@123"

    # Frontend URL (for share links)
    FRONTEND_URL: str = "http://localhost:3001"
    DOCUMENTS_STORAGE_PATH: str = "./storage/documents"

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
