from pydantic import BaseModel, Field


class FeedbackRequest(BaseModel):
    interaction_id: int
    rating: int = Field(ge=-1, le=5)
    comment: str | None = Field(default=None, max_length=1000)


class FeedbackResponse(BaseModel):
    id: int
    interaction_log_id: int
    rating: int

    model_config = {"from_attributes": True}
