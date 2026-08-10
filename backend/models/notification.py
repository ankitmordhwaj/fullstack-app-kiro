"""Notification model for TaskFlow."""

import os
import sys

# Ensure the backend package root is on sys.path so that bare imports
# like `from extensions import db` work regardless of how the module is
# invoked (e.g. `python -m backend.models.notification` from the project root).
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from datetime import datetime

from extensions import db


class Notification(db.Model):
    """Represents a user notification (e.g. team invitation)."""

    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    type = db.Column(db.String(50), nullable=False, default="team_invitation")
    message = db.Column(db.String(500), nullable=False)
    invitation_id = db.Column(db.Integer, db.ForeignKey("invitations.id"), nullable=True)
    is_read = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship("User", backref="notifications")
    invitation = db.relationship("Invitation", backref="notification")

    def to_dict(self) -> dict:
        """Serialise the notification to a JSON-safe dict."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "type": self.type,
            "message": self.message,
            "invitation_id": self.invitation_id,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat(),
        }
