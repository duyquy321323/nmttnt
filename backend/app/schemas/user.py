from datetime import datetime

from pydantic import BaseModel, Field


class UserResponse(BaseModel):
    id: int
    username: str
    full_name: str | None
    role: str
    is_active: bool
    must_change_password: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TeacherCreateRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    full_name: str | None = Field(default=None, max_length=128)


class TeacherUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, max_length=128)
    is_active: bool | None = None
    reset_password: bool = False


class StudentCreateRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    full_name: str | None = Field(default=None, max_length=128)


class StudentUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, max_length=128)
    is_active: bool | None = None
    reset_password: bool = False
