from contextlib import asynccontextmanager
import logging
import re

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.api_v1.api import api_router
from app.core.config import settings
from app.db.init_db import ensure_default_admin, ensure_documents_storage
from app.db.session import SessionLocal
from app.services.embedding_service import get_embedding_service
from app.services.rag_service import get_rag_service

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_documents_storage()
    db = SessionLocal()
    try:
        ensure_default_admin(db)
    finally:
        db.close()
    get_embedding_service()
    get_rag_service()
    yield


# Create FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Edu-Ethnic-Chatbot",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)


class DynamicCORSMiddleware(BaseHTTPMiddleware):
    """
    Custom CORS middleware that supports dynamic origins with credentials.
    Based on Vercel's CORS guide: https://vercel.com/kb/guide/how-to-enable-cors
    """

    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin")

        # Define allowed origins - can be extended with environment variables
        allowed_origins = settings.BACKEND_CORS_ORIGINS

        # Check if origin matches Vercel pattern (for preview deployments)
        is_vercel = origin and re.match(r"https://.*\.vercel\.app", origin)
        is_local_dev = origin and re.match(
            r"http://(localhost|127\.0\.0\.1):\d+",
            origin,
        )
        is_allowed = origin in allowed_origins or is_vercel or is_local_dev

        # Handle OPTIONS preflight requests
        if request.method == "OPTIONS":
            headers = {
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
                "Access-Control-Max-Age": "3600",
            }
            if is_allowed and origin:
                headers["Access-Control-Allow-Origin"] = origin
                headers["Access-Control-Allow-Credentials"] = "true"
            return Response(status_code=200, headers=headers)

        # Process the actual request
        try:
            response = await call_next(request)
        except Exception:
            logger.exception("Unhandled error for %s %s", request.method, request.url.path)
            response = JSONResponse(
                status_code=500,
                content={"detail": "Internal server error"},
            )

        # Add CORS headers to response
        if is_allowed and origin:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = (
                "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            )
            response.headers["Access-Control-Allow-Headers"] = (
                "Content-Type, Authorization, Accept"
            )

        return response


# Add CORS middleware FIRST to handle preflight requests
app.add_middleware(DynamicCORSMiddleware)

# Include routers
app.include_router(api_router, prefix=settings.API_V1_STR)  # API v1 endpoints
