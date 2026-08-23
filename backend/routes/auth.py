"""Authentication routes: POST /auth/register and POST /auth/login."""

import logging
import re

from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    get_jwt_identity,
    jwt_required,
)

from extensions import db
from models.invitation import Invitation, InvitationStatus
from models.notification import Notification
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
        db.session.flush()  # Assign user.id without committing

        # Auto-link pending invitations for this email
        pending_invitations = Invitation.query.filter(
            db.func.lower(Invitation.invitee_email) == email_lower,
            Invitation.status == InvitationStatus.PENDING,
        ).all()

        for invitation in pending_invitations:
            invitation.invitee_id = user.id
            inviter = User.query.get(invitation.inviter_id)
            notification = Notification(
                user_id=user.id,
                type="team_invitation",
                message=f"{inviter.full_name} invited you to join their team.",
                invitation_id=invitation.id,
            )
            db.session.add(notification)

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


@auth_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    """Update the authenticated user's full_name and email.

    Returns:
        200 + updated user dict on success.
        400 + ``{ "errors": {...} }`` on validation failure.
        409 + ``{ "error": "..." }`` when new e-mail is taken by another user.
        500 + ``{ "error": "..." }`` on database error.
    """
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))

    if user is None:
        logger.warning("Profile update attempted for non-existent user id=%s", user_id)
        return jsonify({"error": "User not found."}), 404

    data: dict = request.get_json(silent=True) or {}

    full_name: str = (data.get("full_name") or "").strip()
    email: str = (data.get("email") or "").strip()

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

    if errors:
        logger.info("Profile update validation failed for user id=%s: %s", user_id, list(errors.keys()))
        return jsonify({"errors": errors}), 400

    # Normalise email to lowercase for storage and uniqueness checks
    email_lower = email.lower()

    # Check email uniqueness excluding the current user
    existing = User.query.filter(User.email == email_lower, User.id != user.id).first()
    if existing:
        logger.info("Profile update rejected — email already registered: %s (user id=%s)", email_lower, user_id)
        return jsonify({"error": "Email is already registered."}), 409

    # Update user fields (password is intentionally ignored)
    user.full_name = full_name
    user.email = email_lower

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        logger.exception("Database error while updating profile for user id=%s", user_id)
        return jsonify({"error": "An unexpected error occurred."}), 500

    logger.info("Profile updated successfully: id=%s email=%s", user.id, email_lower)
    return jsonify(user.to_dict()), 200


@auth_bp.route("/preferences", methods=["PUT"])
@jwt_required()
def update_preferences():
    """Update the authenticated user's display preferences (accent_color).

    Returns:
        200 + updated user dict on success.
        400 + ``{ "error": "..." }`` on invalid accent color.
        500 + ``{ "error": "..." }`` on database error.
    """
    VALID_ACCENT_COLORS = {
        "royal-blue", "ocean-blue", "sapphire", "sky-blue",
        "emerald-green", "violet",
    }

    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))

    if user is None:
        logger.warning("Preferences update attempted for non-existent user id=%s", user_id)
        return jsonify({"error": "User not found."}), 404

    data: dict = request.get_json(silent=True) or {}
    accent_color: str = (data.get("accent_color") or "").strip().lower()

    if not accent_color:
        return jsonify({"error": "accent_color is required."}), 400

    if accent_color not in VALID_ACCENT_COLORS:
        valid_colors = ', '.join(sorted(VALID_ACCENT_COLORS))
        return jsonify({"error": f"Invalid accent color. Must be one of: {valid_colors}"}), 400

    user.accent_color = accent_color

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        logger.exception("Database error while updating preferences for user id=%s", user_id)
        return jsonify({"error": "An unexpected error occurred."}), 500

    logger.info("Preferences updated for user id=%s: accent_color=%s", user_id, accent_color)
    return jsonify(user.to_dict()), 200


@auth_bp.route("/password", methods=["PUT"])
@jwt_required()
def change_password():
    """Change the authenticated user's password.

    Validates the current password, enforces new password strength rules,
    and updates the stored hash.

    Returns:
        200 + ``{ "message": "Password changed successfully." }`` on success.
        400 + ``{ "errors": {...} }`` when required fields are missing.
        400 + ``{ "error": "..." }`` when new password fails strength validation.
        401 + ``{ "error": "..." }`` when current password is incorrect.
        500 + ``{ "error": "..." }`` on database error.
    """
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))

    if user is None:
        logger.warning("Password change attempted for non-existent user id=%s", user_id)
        return jsonify({"error": "User not found."}), 404

    data: dict = request.get_json(silent=True) or {}

    current_password: str = data.get("current_password") or ""
    new_password: str = data.get("new_password") or ""

    # --- Required field validation ---
    errors: dict[str, str] = {}

    if not current_password:
        errors["current_password"] = "Current password is required."
    if not new_password:
        errors["new_password"] = "New password is required."

    if errors:
        logger.info("Password change validation failed for user id=%s: missing fields %s", user_id, list(errors.keys()))
        return jsonify({"errors": errors}), 400

    # --- New password strength validation (priority order) ---
    if len(new_password) < 8 or len(new_password) > 128:
        logger.info("Password change rejected for user id=%s: length requirement not met", user_id)
        return jsonify({"error": "Password must be between 8 and 128 characters."}), 400

    if not any(c.isupper() for c in new_password):
        logger.info("Password change rejected for user id=%s: missing uppercase letter", user_id)
        return jsonify({"error": "Password must contain at least one uppercase letter."}), 400

    special_characters = set("!@#$%^&*()_+-=[]{}|;:',.<>?/`~\"")
    if not any(c in special_characters for c in new_password):
        logger.info("Password change rejected for user id=%s: missing special character", user_id)
        return jsonify({"error": "Password must contain at least one special character."}), 400

    # --- Verify current password ---
    if not user.check_password(current_password):
        logger.info("Password change failed for user id=%s: current password incorrect", user_id)
        return jsonify({"error": "Current password is incorrect."}), 401

    # --- Update password ---
    user.set_password(new_password)

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        logger.exception("Database error while changing password for user id=%s", user_id)
        return jsonify({"error": "An unexpected error occurred. Please try again."}), 500

    logger.info("Password changed successfully for user id=%s", user_id)
    return jsonify({"message": "Password changed successfully."}), 200
