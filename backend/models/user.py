"""User model for TaskFlow."""

import os
import sys

# Ensure the backend package root is on sys.path so that bare imports
# like `from extensions import db` work regardless of how the module is
# invoked (e.g. `python -m backend.models.user` from the project root).
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from datetime import datetime

from werkzeug.security import generate_password_hash, check_password_hash

from extensions import db


class User(db.Model):
    """Represents an application user."""

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(254), unique=True, nullable=False, index=True)
    password = db.Column(db.String(512), nullable=False)  # pbkdf2:sha256 hash
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    tasks = db.relationship(
        "Task",
        backref="owner",
        lazy=True,
        cascade="all, delete-orphan",
    )

    def set_password(self, plain_text: str) -> None:
        """Hash and store the given plain-text password."""
        self.password = generate_password_hash(plain_text)

    def check_password(self, plain_text: str) -> bool:
        """Return True if plain_text matches the stored hash."""
        return check_password_hash(self.password, plain_text)

    def to_dict(self) -> dict:
        """Serialise the user to a JSON-safe dict. Password is never included."""
        return {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
            "created_at": self.created_at.isoformat(),
        }
