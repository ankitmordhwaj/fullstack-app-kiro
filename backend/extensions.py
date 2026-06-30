"""Shared Flask extension instances.

These are initialised here without an app, then bound to the app via
``init_app()`` inside the ``create_app()`` factory in ``app.py``.
Importing from this module avoids circular imports between ``app.py``
and the model / route modules that also need access to ``db`` and ``jwt``.
"""

from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS

db = SQLAlchemy()
jwt = JWTManager()
cors = CORS()
