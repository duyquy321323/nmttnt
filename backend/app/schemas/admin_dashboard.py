from pydantic import BaseModel


class UserCountStats(BaseModel):
    total: int
    active: int
    inactive: int
    pending_password: int


class RagStatusSummary(BaseModel):
    has_documents: bool
    document_count: int
    total_points: int
    collection_name: str


class RecentUserItem(BaseModel):
    id: int
    username: str
    full_name: str | None
    role: str
    is_active: bool
    created_at: str


class DailyInteractionItem(BaseModel):
    date: str
    count: int


class AdminDashboardResponse(BaseModel):
    teachers: UserCountStats
    students: UserCountStats
    documents_total: int
    chat_sessions_total: int
    chat_messages_total: int
    shared_sessions_total: int
    total_interactions: int
    failed_interactions: int
    reask_count: int
    clarification_count: int
    feedback_count: int
    positive_feedback_rate: float | None
    rag: RagStatusSummary
    by_fallback_reason: dict[str, int]
    by_subject: dict[str, int]
    documents_by_subject: dict[str, int]
    interactions_by_day: list[DailyInteractionItem]
    recent_users: list[RecentUserItem]
    prompt_version: str
