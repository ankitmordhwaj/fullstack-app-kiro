"""Notification routes: GET /notifications and GET /notifications/unread-count."""

import logging

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models.notification import Notification
from models.invitation import Invitation
from models.user import User

logger = logging.getLogger(__name__)

notifications_bp = Blueprint("notifications", __name__, url_prefix="/notifications")


@notifications_bp.route("", methods=["GET"])
@jwt_required()
def get_notifications():
    """Return all notifications for the authenticated user, ordered newest to oldest.

    Returns:
        200 + ``{ "notifications": [...] }`` on success.
        500 + ``{ "error": "..." }`` on database error.
    """
    user_id = get_jwt_identity()

    try:
        notifications = (
            Notification.query
            .filter_by(user_id=int(user_id))
            .order_by(Notification.created_at.desc())
            .all()
        )
    except Exception:
        logger.exception("Database error fetching notifications for user id=%s", user_id)
        return jsonify({"error": "An unexpected error occurred."}), 500

    results = []
    for notification in notifications:
        inviter_name = None
        invitation_status = None

        if notification.invitation:
            invitation_status = notification.invitation.status.value
            if notification.invitation.inviter:
                inviter_name = notification.invitation.inviter.full_name

        results.append({
            "id": notification.id,
            "type": notification.type,
            "message": notification.message,
            "invitation_id": notification.invitation_id,
            "inviter_name": inviter_name,
            "invitation_status": invitation_status,
            "is_read": notification.is_read,
            "created_at": notification.created_at.isoformat(),
        })

    logger.info("Fetched %d notifications for user id=%s", len(results), user_id)
    return jsonify({"notifications": results}), 200


@notifications_bp.route("/unread-count", methods=["GET"])
@jwt_required()
def get_unread_count():
    """Return the count of unread notifications for the authenticated user.

    Returns:
        200 + ``{ "count": N }`` on success.
        500 + ``{ "error": "..." }`` on database error.
    """
    user_id = get_jwt_identity()

    try:
        count = (
            Notification.query
            .filter_by(user_id=int(user_id), is_read=False)
            .count()
        )
    except Exception:
        logger.exception("Database error fetching unread count for user id=%s", user_id)
        return jsonify({"error": "An unexpected error occurred."}), 500

    logger.info("Unread count for user id=%s: %d", user_id, count)
    return jsonify({"count": count}), 200
