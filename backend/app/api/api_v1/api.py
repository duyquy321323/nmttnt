from fastapi import APIRouter

from .endpoints.admin import admin_router
from .endpoints.auth import auth_router
from .endpoints.chatbot import chat_router
from .endpoints.documents import documents_router
from .endpoints.feedback import feedback_router
from .endpoints.share import share_router
from .endpoints.student import student_router
from .endpoints.teacher import teacher_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(admin_router, prefix="/admin", tags=["admin"])
api_router.include_router(teacher_router, prefix="/teacher", tags=["teacher"])
api_router.include_router(student_router, prefix="/student", tags=["student"])
api_router.include_router(share_router, prefix="/share", tags=["share"])
api_router.include_router(chat_router, prefix="/chat", tags=["chat"])
api_router.include_router(feedback_router, prefix="/chat", tags=["chat"])
api_router.include_router(documents_router, prefix="/documents", tags=["documents"])