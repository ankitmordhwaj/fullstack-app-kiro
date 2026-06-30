import os
import sys
import logging

logger = logging.getLogger(__name__)


class Config:
    """Application configuration loaded from environment variables."""

    DATABASE_URL: str
    JWT_SECRET_KEY: str
    FLASK_ENV: str

    def __init__(self) -> None:
        missing = []

        database_url = os.environ.get("DATABASE_URL")
        jwt_secret_key = os.environ.get("JWT_SECRET_KEY")

        if not database_url:
            missing.append("DATABASE_URL")
        if not jwt_secret_key:
            missing.append("JWT_SECRET_KEY")

        if missing:
            logger.error(
                "Missing required environment variable(s): %s. "
                "Ensure they are set in your .env file before starting the application.",
                ", ".join(missing),
            )
            sys.exit(1)

        self.DATABASE_URL = database_url  # type: ignore[assignment]
        self.JWT_SECRET_KEY = jwt_secret_key  # type: ignore[assignment]
        self.FLASK_ENV = os.environ.get("FLASK_ENV", "production")

        # SQLAlchemy settings
        self.SQLALCHEMY_DATABASE_URI = self.DATABASE_URL
        self.SQLALCHEMY_TRACK_MODIFICATIONS = False

        # JWT settings
        self.JWT_SECRET_KEY = self.JWT_SECRET_KEY

        # CORS is handled by Flask-CORS in create_app()
