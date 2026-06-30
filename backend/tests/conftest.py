"""Shared pytest fixtures for the TaskFlow backend test suite."""

import pytest

from app import create_app
from extensions import db as _db


@pytest.fixture(scope="session")
def app():
    """Create a Flask application configured for testing (in-memory SQLite)."""
    test_config = {
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite://",  # in-memory, no file
        "SQLALCHEMY_TRACK_MODIFICATIONS": False,
        "JWT_SECRET_KEY": "test-secret-key",
    }
    flask_app = create_app(config=test_config)
    return flask_app


@pytest.fixture(scope="function")
def client(app):
    """Return a test client with a fresh database for every test function."""
    with app.app_context():
        _db.create_all()
        yield app.test_client()
        _db.session.remove()
        _db.drop_all()
