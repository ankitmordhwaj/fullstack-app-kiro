"""Invitation routes: PUT /invitations/<id>/accept, PUT /invitations/<id>/decline, PUT /invitations/<id>/cancel."""

import logging

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models.invitation import Invitation, InvitationStatus
from models.team import TeamMember
from models.notification import Notification

logger = logging.getLogger(__name__)

invitations_bp = Blueprint("invitations", __name__, url_prefix="/invitations")


@invitations_bp.route("/<int:invitation_id>/accept", methods=["PUT"])
@jwt_required()
def accept_invitation(invitation_id):
    """Accept a pending team invitation.

    Validates that the current user is the invitee, that the invitation is
    still pending, then updates the status to accepted, creates a TeamMember
    record, and marks the related notification as read.

    Returns:
        200 + ``{ "id", "status", "team_id" }`` on success.
        403 if current user is not the invitee.
        404 if invitation not found.
        400 if invitation is no longer pending.
        500 on database error.
    """
    current_user_id = int(get_jwt_identity())

    invitation = Invitation.query.get(invitation_id)
    if invitation is None:
        logger.info("Accept invitation failed: invitation id=%s not found.", invitation_id)
        return jsonify({"error": "Invitation not found."}), 404

    if invitation.invitee_id != current_user_id:
        logger.warning(
            "Accept invitation forbidden: user id=%s is not invitee for invitation id=%s.",
            current_user_id,
            invitation_id,
        )
        return jsonify({"error": "You are not the invitee for this invitation."}), 403

    if invitation.status != InvitationStatus.PENDING:
        logger.info(
            "Accept invitation rejected: invitation id=%s status is %s.",
            invitation_id,
            invitation.status.value,
        )
        return jsonify({"error": "Invitation is no longer pending."}), 400

    try:
        invitation.status = InvitationStatus.ACCEPTED

        team_member = TeamMember(
            team_id=invitation.team_id,
            user_id=current_user_id,
            role="member",
        )
        db.session.add(team_member)

        # Mark related notification as read
        notification = Notification.query.filter_by(invitation_id=invitation.id).first()
        if notification:
            notification.is_read = True

        db.session.commit()
        logger.info(
            "Invitation id=%s accepted by user id=%s for team id=%s.",
            invitation_id,
            current_user_id,
            invitation.team_id,
        )
        return jsonify({"id": invitation.id, "status": "accepted", "team_id": invitation.team_id}), 200

    except Exception:
        db.session.rollback()
        logger.exception("Database error while accepting invitation id=%s.", invitation_id)
        return jsonify({"error": "An unexpected error occurred. Please try again later."}), 500


@invitations_bp.route("/<int:invitation_id>/decline", methods=["PUT"])
@jwt_required()
def decline_invitation(invitation_id):
    """Decline a pending team invitation.

    Validates that the current user is the invitee, that the invitation is
    still pending, then updates the status to declined and marks the related
    notification as read.

    Returns:
        200 + ``{ "id", "status" }`` on success.
        403 if current user is not the invitee.
        404 if invitation not found.
        400 if invitation is no longer pending.
        500 on database error.
    """
    current_user_id = int(get_jwt_identity())

    invitation = Invitation.query.get(invitation_id)
    if invitation is None:
        logger.info("Decline invitation failed: invitation id=%s not found.", invitation_id)
        return jsonify({"error": "Invitation not found."}), 404

    if invitation.invitee_id != current_user_id:
        logger.warning(
            "Decline invitation forbidden: user id=%s is not invitee for invitation id=%s.",
            current_user_id,
            invitation_id,
        )
        return jsonify({"error": "You are not the invitee for this invitation."}), 403

    if invitation.status != InvitationStatus.PENDING:
        logger.info(
            "Decline invitation rejected: invitation id=%s status is %s.",
            invitation_id,
            invitation.status.value,
        )
        return jsonify({"error": "Invitation is no longer pending."}), 400

    try:
        invitation.status = InvitationStatus.DECLINED

        # Mark related notification as read
        notification = Notification.query.filter_by(invitation_id=invitation.id).first()
        if notification:
            notification.is_read = True

        db.session.commit()
        logger.info(
            "Invitation id=%s declined by user id=%s.",
            invitation_id,
            current_user_id,
        )
        return jsonify({"id": invitation.id, "status": "declined"}), 200

    except Exception:
        db.session.rollback()
        logger.exception("Database error while declining invitation id=%s.", invitation_id)
        return jsonify({"error": "An unexpected error occurred. Please try again later."}), 500


@invitations_bp.route("/<int:invitation_id>/cancel", methods=["PUT"])
@jwt_required()
def cancel_invitation(invitation_id):
    """Cancel a pending team invitation (by the inviter).

    Validates that the current user is the inviter, that the invitation is
    still pending, then updates the status to cancelled and marks the related
    notification as read.

    Returns:
        200 + ``{ "id", "status" }`` on success.
        403 if current user is not the inviter.
        404 if invitation not found.
        400 if invitation is not pending.
        500 on database error.
    """
    current_user_id = int(get_jwt_identity())

    invitation = Invitation.query.get(invitation_id)
    if invitation is None:
        logger.info("Cancel invitation failed: invitation id=%s not found.", invitation_id)
        return jsonify({"error": "Invitation not found."}), 404

    if invitation.inviter_id != current_user_id:
        logger.warning(
            "Cancel invitation forbidden: user id=%s is not inviter for invitation id=%s.",
            current_user_id,
            invitation_id,
        )
        return jsonify({"error": "You are not the inviter for this invitation."}), 403

    if invitation.status != InvitationStatus.PENDING:
        logger.info(
            "Cancel invitation rejected: invitation id=%s status is %s.",
            invitation_id,
            invitation.status.value,
        )
        return jsonify({"error": "Only pending invitations can be cancelled."}), 400

    try:
        invitation.status = InvitationStatus.CANCELLED

        # Mark related notification as read
        notification = Notification.query.filter_by(invitation_id=invitation.id).first()
        if notification:
            notification.is_read = True

        db.session.commit()
        logger.info(
            "Invitation id=%s cancelled by user id=%s.",
            invitation_id,
            current_user_id,
        )
        return jsonify({"id": invitation.id, "status": "cancelled"}), 200

    except Exception:
        db.session.rollback()
        logger.exception("Database error while cancelling invitation id=%s.", invitation_id)
        return jsonify({"error": "An unexpected error occurred. Please try again later."}), 500
