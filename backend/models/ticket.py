"""Ticket model for the Kanban Board feature."""

import os
import sys

# Ensure the backend package root is on sys.path so that bare imports
# like `from extensions import db` work regardless of how the module is
# invoked.
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from datetime import datetime

from extensions import db
from models.task import Priority, Status


class Ticket(db.Model):
    """Represents a kanban board ticket owned by a team."""

    __tablename__ = "tickets"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.String(1000), nullable=False)
    priority = db.Column(db.Enum(Priority), nullable=False)
    status = db.Column(db.Enum(Status), nullable=False, default=Status.PENDING)
    team_id = db.Column(db.Integer, db.ForeignKey("teams.id"), nullable=False, index=True)
    creator_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    assignee_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    team = db.relationship("Team", backref="tickets")
    creator = db.relationship("User", foreign_keys=[creator_id], backref="created_tickets")
    assignee = db.relationship("User", foreign_keys=[assignee_id], backref="assigned_tickets")

    def to_dict(self) -> dict:
        """Serialise the ticket to a JSON-safe dict."""
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "priority": self.priority.value,
            "status": self.status.value,
            "team_id": self.team_id,
            "creator_id": self.creator_id,
            "assignee_id": self.assignee_id,
            "assignee_name": self.assignee.full_name if self.assignee else None,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
