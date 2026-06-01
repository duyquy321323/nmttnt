"""add robustness logging and document versioning

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-05-31 23:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "documents",
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
    )
    op.add_column("documents", sa.Column("content_hash", sa.String(length=64), nullable=True))
    op.add_column("documents", sa.Column("last_indexed_at", sa.DateTime(), nullable=True))

    op.create_table(
        "chat_interaction_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("session_id", sa.Integer(), nullable=True),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("normalized_question", sa.Text(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=True),
        sa.Column("from_rag", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("fallback_reason", sa.String(length=32), nullable=True),
        sa.Column("needs_clarification", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_reask", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("subject", sa.String(length=64), nullable=True),
        sa.Column("lesson", sa.String(length=64), nullable=True),
        sa.Column("grade", sa.String(length=32), nullable=True),
        sa.Column("prompt_version", sa.String(length=16), nullable=True),
        sa.Column("document_versions", sa.Text(), nullable=True),
        sa.Column("rag_score", sa.String(length=32), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["session_id"], ["chat_sessions.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_chat_interaction_logs_user_id"),
        "chat_interaction_logs",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_chat_interaction_logs_session_id"),
        "chat_interaction_logs",
        ["session_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_chat_interaction_logs_fallback_reason"),
        "chat_interaction_logs",
        ["fallback_reason"],
        unique=False,
    )
    op.create_index(
        op.f("ix_chat_interaction_logs_subject"),
        "chat_interaction_logs",
        ["subject"],
        unique=False,
    )
    op.create_index(
        op.f("ix_chat_interaction_logs_created_at"),
        "chat_interaction_logs",
        ["created_at"],
        unique=False,
    )

    op.create_table(
        "answer_feedbacks",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("interaction_log_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["interaction_log_id"], ["chat_interaction_logs.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_answer_feedbacks_interaction_log_id"),
        "answer_feedbacks",
        ["interaction_log_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_answer_feedbacks_interaction_log_id"), table_name="answer_feedbacks")
    op.drop_table("answer_feedbacks")
    op.drop_index(op.f("ix_chat_interaction_logs_created_at"), table_name="chat_interaction_logs")
    op.drop_index(op.f("ix_chat_interaction_logs_subject"), table_name="chat_interaction_logs")
    op.drop_index(
        op.f("ix_chat_interaction_logs_fallback_reason"),
        table_name="chat_interaction_logs",
    )
    op.drop_index(op.f("ix_chat_interaction_logs_session_id"), table_name="chat_interaction_logs")
    op.drop_index(op.f("ix_chat_interaction_logs_user_id"), table_name="chat_interaction_logs")
    op.drop_table("chat_interaction_logs")
    op.drop_column("documents", "last_indexed_at")
    op.drop_column("documents", "content_hash")
    op.drop_column("documents", "version")
