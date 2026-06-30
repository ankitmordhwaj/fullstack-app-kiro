"""Authentication routes: POST /auth/register and POST /auth/login."""

import logging
import re

from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, create_refresh_token

from extensions import db
from models.user import User

logger = logging.getLogger(__name__)

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

# RFC 5322-inspired email regex (pragmatic subset)
_EMAIL_RE = re.compile(
    r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+"
    r"@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?"
    r"(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$"
)


def _valid_email(value: str) -> bool:
    """Return True if *value* looks like a valid e-mail address."""
    return bool(_EMAIL_RE.match(value))


@auth_bp.route("/register", methods=["POST"])
def register():
    """Register a new user.

    Validates all fields, collects every error before responding,
    and returns HTTP 409 when the e-mail is already taken.

    Returns:
        201 + user dict on success.
        400 + ``{ "errors": {...} }`` on validation failure.
        409 + ``{ "error": "..." }`` when e-mail already exists.
    """
    data: dict = request.get_json(silent=True) or {}

    full_name: str = (data.get("full_name") or "").strip()
    email: str = (data.get("email") or "").strip()
    password: str = data.get("password") or ""

    errors: dict[str, str] = {}

    # --- full_name validation ---
    if not full_name:
        errors["full_name"] = "Full name is required."
    elif len(full_name) > 255:
        errors["full_name"] = "Full name must be 255 characters or fewer."

    # --- email validation ---
    if not email:
        errors["email"] = "Email is required."
    elif len(email) > 254:
        errors["email"] = "Email must be 254 characters or fewer."
    elif not _valid_email(email):
        errors["email"] = "Email must be a valid email address."

    # --- password validation ---
    if not password:
        errors["password"] = "Password is required."
    elif len(password) < 8:
        errors["password"] = "Password must be at least 8 characters."

    if errors:
        logger.info("Registration validation failed: %s", list(errors.keys()))
        return jsonify({"errors": errors}), 400

    # Normalise email to lowercase for storage and uniqueness checks
    email_lower = email.lower()

    existing = User.query.filter_by(email=email_lower).first()
    if existing:
        logger.info("Registration rejected — email already registered: %s", email_lower)
        return jsonify({"error": "Email is already registered."}), 409

    user = User(full_name=full_name, email=email_lower)
    user.set_password(password)

    try:
        db.session.add(user)
        db.session.commit()
    except Exception:
        db.session.rollback()
        logger.exception("Database error while registering user %s", email_lower)
        return jsonify({"error": "An unexpected error occurred. Please try again later."}), 500

    logger.info("User registered successfully: id=%s email=%s", user.id, email_lower)
    return jsonify(user.to_dict()), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    """Authenticate an existing user.

    Returns:
        200 + ``{ access_token, refresh_token, user }`` on success.
        400 + ``{ "errors": {...} }`` when required fields are missing.
        401 + ``{ "error": "..." }`` on bad credentials.
    """
    data: dict = request.get_json(silent=True) or {}

    email: str = (data.get("email") or "").strip()
    password: str = data.get("password") or ""

    errors: dict[str, str] = {}

    if not email:
        errors["email"] = "Email is required."
    if not password:
        errors["password"] = "Password is required."

    if errors:
        logger.info("Login validation failed: missing fields %s", list(errors.keys()))
        return jsonify({"errors": errors}), 400

    email_lower = email.lower()
    user = User.query.filter_by(email=email_lower).first()

    # Use a single generic message for both "user not found" and "wrong password"
    # to avoid leaking whether the e-mail is registered.
    if user is None or not user.check_password(password):
        logger.info("Login failed for email: %s", email_lower)
        return jsonify({"error": "Invalid email or password."}), 401

    identity = str(user.id)
    access_token = create_access_token(identity=identity)
    refresh_token = create_refresh_token(identity=identity)

    logger.info("User logged in successfully: id=%s email=%s", user.id, email_lower)
    return (
        jsonify(
            {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "user": user.to_dict(),
            }
        ),
        200,
    )
