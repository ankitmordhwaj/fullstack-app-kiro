"""Team and TeamMember models for TaskFlow."""

import os
import sys

# Ensure the backend package root is on sys.path so that bare imports
# like `from extensions import db` work regardless of how the module is
# invoked (e.g. `python -m backend.models.team` from the project root).
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from datetime import datetime

from extensions import db


class Team(db.Model):
    """Represents a team group in TaskFlow."""

    __tablename__ = "teams"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    owner_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    owner = db.relationship("User", backref="owned_teams", foreign_keys=[owner_id])
    members = db.relationship("TeamMember", backref="team", lazy=True, cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        """Serialise the team to a JSON-safe dict."""
        return {
            "id": self.id,
            "name": self.name,
            "owner_id": self.owner_id,
            "created_at": self.created_at.isoformat(),
        }


class TeamMember(db.Model):
    """Join table linking Users to Teams with a role."""

    __tablename__ = "team_members"

    id = db.Column(db.Integer, primary_key=True)
    team_id = db.Column(db.Integer, db.ForeignKey("teams.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    role = db.Column(db.String(20), nullable=False, default="member")  # "owner" or "member"
    joined_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship("User", backref="team_memberships")

    __table_args__ = (db.UniqueConstraint("team_id", "user_id", name="uq_team_user"),)

    def to_dict(self) -> dict:
        """Serialise the team member to a JSON-safe dict."""
        return {
            "id": self.id,
            "team_id": self.team_id,
            "user_id": self.user_id,
            "role": self.role,
            "joined_at": self.joined_at.isoformat(),
        }
