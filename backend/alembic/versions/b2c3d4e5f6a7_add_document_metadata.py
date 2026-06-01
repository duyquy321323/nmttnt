"""add document metadata for RAG filtering

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-05-31 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("documents", sa.Column("material_type", sa.String(length=32), nullable=True))
    op.add_column("documents", sa.Column("grade", sa.String(length=32), nullable=True))
    op.add_column("documents", sa.Column("subject", sa.String(length=64), nullable=True))
    op.add_column("documents", sa.Column("lesson", sa.String(length=64), nullable=True))
    op.add_column("documents", sa.Column("level", sa.String(length=64), nullable=True))
    op.add_column("documents", sa.Column("skill", sa.String(length=128), nullable=True))
    op.add_column("documents", sa.Column("vietnamese_level", sa.String(length=64), nullable=True))
    op.add_column("documents", sa.Column("region", sa.String(length=128), nullable=True))
    op.create_index(op.f("ix_documents_material_type"), "documents", ["material_type"], unique=False)
    op.create_index(op.f("ix_documents_grade"), "documents", ["grade"], unique=False)
    op.create_index(op.f("ix_documents_subject"), "documents", ["subject"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_documents_subject"), table_name="documents")
    op.drop_index(op.f("ix_documents_grade"), table_name="documents")
    op.drop_index(op.f("ix_documents_material_type"), table_name="documents")
    op.drop_column("documents", "region")
    op.drop_column("documents", "vietnamese_level")
    op.drop_column("documents", "skill")
    op.drop_column("documents", "level")
    op.drop_column("documents", "lesson")
    op.drop_column("documents", "subject")
    op.drop_column("documents", "grade")
    op.drop_column("documents", "material_type")
