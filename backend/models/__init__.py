"""Import all models so SQLAlchemy can discover them during db.create_all()."""

from .user import User  # noqa: F401
from .task import Task, Priority, Status  # noqa: F401
