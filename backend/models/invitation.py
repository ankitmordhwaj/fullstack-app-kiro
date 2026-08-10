"""Invitation model for TaskFlow team collaboration."""

import os
import sys

# Ensure the backend package root is on sys.path so that bare imports
# like `from extensions import db` work regardless of how the module is
# invoked (e.g. `python -m backend.models.invitation` from the project root).
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

import enum
from datetime import datetime

from extensions import db


class InvitationStatus(enum.Enum):
    """Status of a team invitation."""

    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"


class Invitation(db.Model):
    """Represents a team invitation sent from one user to another."""

    __tablename__ = "invitations"

    id = db.Column(db.Integer, primary_key=True)
    team_id = db.Column(db.Integer, db.ForeignKey("teams.id"), nullable=False, index=True)
    inviter_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    invitee_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    invitee_email = db.Column(db.String(254), nullable=False)
    status = db.Column(db.Enum(InvitationStatus), nullable=False, default=InvitationStatus.PENDING)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    team = db.relationship("Team", backref="invitations")
    inviter = db.relationship(
        "User",
        foreign_keys=[inviter_id],
        backref="sent_invitations",
    )
    invitee = db.relationship(
        "User",
        foreign_keys=[invitee_id],
        backref="received_invitations",
    )

    def to_dict(self) -> dict:
        """Serialise the invitation to a JSON-safe dict."""
        return {
            "id": self.id,
            "team_id": self.team_id,
            "inviter_id": self.inviter_id,
            "invitee_id": self.invitee_id,
            "invitee_email": self.invitee_email,
            "status": self.status.value,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
