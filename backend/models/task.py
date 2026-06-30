"""Task model for TaskFlow."""

import enum
import os
import sys

# Ensure the backend package root is on sys.path so that bare imports
# like `from extensions import db` work regardless of how the module is
# invoked (e.g. `python -m backend.models.task` from the project root).
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from datetime import datetime

from extensions import db


class Priority(enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class Status(enum.Enum):
    PENDING = "PENDING"
    INPROGRESS = "INPROGRESS"
    COMPLETED = "COMPLETED"


class Task(db.Model):
    """Represents a task owned by a user."""

    __tablename__ = "tasks"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.String(1000), nullable=False)
    priority = db.Column(db.Enum(Priority), nullable=False)
    status = db.Column(db.Enum(Status), nullable=False, default=Status.PENDING)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    def to_dict(self) -> dict:
        """Serialise the task to a JSON-safe dict."""
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "priority": self.priority.value,
            "status": self.status.value,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "user_id": self.user_id,
        }
