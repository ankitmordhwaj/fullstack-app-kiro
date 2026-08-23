"""Team routes: GET /teams/members, POST /teams/invite, and DELETE /teams/members/<user_id>."""

import logging
import re

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models.user import User
from models.team import Team, TeamMember
from models.invitation import Invitation, InvitationStatus
from models.notification import Notification

logger = logging.getLogger(__name__)

teams_bp = Blueprint("teams", __name__, url_prefix="/teams")

# RFC 5322-inspired email regex (pragmatic subset) — same as auth.py
_EMAIL_RE = re.compile(
    r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+"
    r"@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?"
    r"(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$"
)


def _valid_email(value: str) -> bool:
    """Return True if *value* looks like a valid e-mail address."""
    return bool(_EMAIL_RE.match(value))


@teams_bp.route("/members", methods=["GET"])
@jwt_required()
def get_members():
    """Return confirmed members and pending invitations for the current user's team.

    Returns:
        200 + { "members": [...], "pending_invitations": [...] }
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if user is None:
        logger.warning("GET /teams/members — user not found: id=%s", user_id)
        return jsonify({"error": "User not found."}), 404

    # Find team where user is owner OR is a team member
    team = Team.query.filter_by(owner_id=user_id).first()
    if team is None:
        membership = TeamMember.query.filter_by(user_id=user_id).first()
        if membership:
            team = Team.query.get(membership.team_id)

    if team is None:
        logger.info("GET /teams/members — user id=%s has no team", user_id)
        return jsonify({"members": [], "pending_invitations": []}), 200

    # Get confirmed members
    members = TeamMember.query.filter_by(team_id=team.id).all()
    members_data = []
    for member in members:
        member_user = User.query.get(member.user_id)
        if member_user:
            members_data.append({
                "id": member_user.id,
                "full_name": member_user.full_name,
                "email": member_user.email,
                "role": member.role,
                "joined_at": member.joined_at.isoformat(),
            })

    # Get pending invitations for this team
    pending_invitations = Invitation.query.filter_by(
        team_id=team.id, status=InvitationStatus.PENDING
    ).all()
    pending_data = [
        {
            "id": inv.id,
            "email": inv.invitee_email,
            "status": inv.status.value,
            "created_at": inv.created_at.isoformat(),
        }
        for inv in pending_invitations
    ]

    logger.info(
        "GET /teams/members — user id=%s, team id=%s, members=%d, pending=%d",
        user_id, team.id, len(members_data), len(pending_data),
    )
    return jsonify({"members": members_data, "pending_invitations": pending_data}), 200


@teams_bp.route("/invite", methods=["POST"])
@jwt_required()
def invite_member():
    """Invite a user to the current user's team.

    Creates a team implicitly on first invite if the user doesn't have one.

    Returns:
        201 + invitation data on success.
        400 + { "error": "..." } on validation failure.
        409 + { "error": "..." } on duplicate pending invitation.
        500 + { "error": "..." } on database error.
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if user is None:
        logger.warning("POST /teams/invite — user not found: id=%s", user_id)
        return jsonify({"error": "User not found."}), 404

    data: dict = request.get_json(silent=True) or {}
    email: str = (data.get("email") or "").strip()

    # Validate: email is required
    if not email:
        logger.info("POST /teams/invite — email missing, user id=%s", user_id)
        return jsonify({"error": "Email is required."}), 400

    # Validate: email format
    if not _valid_email(email):
        logger.info("POST /teams/invite — invalid email format: %s, user id=%s", email, user_id)
        return jsonify({"error": "Invalid email format."}), 400

    # Validate: cannot invite yourself
    email_lower = email.lower()
    if email_lower == user.email.lower():
        logger.info("POST /teams/invite — self-invite attempt, user id=%s", user_id)
        return jsonify({"error": "Cannot invite yourself."}), 400

    # Find or create team
    team = Team.query.filter_by(owner_id=user_id).first()
    if team is None:
        membership = TeamMember.query.filter_by(user_id=user_id).first()
        if membership:
            team = Team.query.get(membership.team_id)

    try:
        if team is None:
            # Create team implicitly on first invite
            team = Team(name=f"{user.full_name}'s Team", owner_id=user_id)
            db.session.add(team)
            db.session.flush()  # Get team.id for the member record

            # Add user as owner member
            owner_member = TeamMember(team_id=team.id, user_id=user_id, role="owner")
            db.session.add(owner_member)
            db.session.flush()
            logger.info("POST /teams/invite — created team id=%s for user id=%s", team.id, user_id)

        # Check for duplicate pending invitation
        existing_invitation = Invitation.query.filter_by(
            team_id=team.id,
            invitee_email=email_lower,
            status=InvitationStatus.PENDING,
        ).first()
        if existing_invitation:
            logger.info(
                "POST /teams/invite — duplicate pending invite for %s, team id=%s",
                email_lower, team.id,
            )
            return jsonify({"error": "An invitation is already pending for this email."}), 409

        # Create Invitation record
        invitation = Invitation(
            team_id=team.id,
            inviter_id=user_id,
            invitee_email=email_lower,
            status=InvitationStatus.PENDING,
        )

        # If invitee is a registered user, set invitee_id and create notification
        invitee = User.query.filter_by(email=email_lower).first()
        if invitee:
            invitation.invitee_id = invitee.id

        db.session.add(invitation)
        db.session.flush()  # Get invitation.id for the notification

        if invitee:
            notification = Notification(
                user_id=invitee.id,
                type="team_invitation",
                message=f"{user.full_name} invited you to join their team.",
                invitation_id=invitation.id,
            )
            db.session.add(notification)
            logger.info(
                "POST /teams/invite — notification created for invitee id=%s",
                invitee.id,
            )

        db.session.commit()
    except Exception:
        db.session.rollback()
        logger.exception("POST /teams/invite — database error, user id=%s", user_id)
        return jsonify({"error": "An unexpected error occurred. Please try again later."}), 500

    logger.info(
        "POST /teams/invite — invitation id=%s created for %s, team id=%s",
        invitation.id, email_lower, team.id,
    )
    return jsonify({
        "id": invitation.id,
        "email": invitation.invitee_email,
        "status": invitation.status.value,
        "created_at": invitation.created_at.isoformat(),
    }), 201


@teams_bp.route("/members/<int:user_id>", methods=["DELETE"])
@jwt_required()
def remove_member(user_id):
    """Remove a member from the current user's team.

    Only the team owner can remove members. The owner cannot remove themselves.

    Returns:
        200 + { "message": "Member removed successfully." }
        400 + { "error": "..." } if attempting to remove the owner.
        403 + { "error": "..." } if the current user is not the team owner.
        404 + { "error": "..." } if the target user is not a member.
        500 + { "error": "..." } on database error.
    """
    current_user_id = int(get_jwt_identity())

    # Look up the team where the current user is owner
    team = Team.query.filter_by(owner_id=current_user_id).first()

    # Validate: current user must be a team owner
    if team is None:
        logger.warning(
            "DELETE /teams/members/%s — user id=%s is not a team owner",
            user_id, current_user_id,
        )
        return jsonify({"error": "Only the team owner can remove members."}), 403

    # Validate: cannot remove the owner themselves
    if user_id == current_user_id:
        logger.info(
            "DELETE /teams/members/%s — owner attempted self-removal, team id=%s",
            user_id, team.id,
        )
        return jsonify({"error": "Cannot remove the team owner."}), 400

    # Validate: target user must be a member of the team
    membership = TeamMember.query.filter_by(team_id=team.id, user_id=user_id).first()
    if membership is None:
        logger.info(
            "DELETE /teams/members/%s — not a member of team id=%s",
            user_id, team.id,
        )
        return jsonify({"error": "Member not found in this team."}), 404

    try:
        db.session.delete(membership)

        # Create a notification for the removed user
        notification = Notification(
            user_id=user_id,
            type="team_removal",
            message=f"You have been removed from {team.name}.",
        )
        db.session.add(notification)

        db.session.commit()
    except Exception:
        db.session.rollback()
        logger.exception(
            "DELETE /teams/members/%s — database error, team id=%s",
            user_id, team.id,
        )
        return jsonify({"error": "An unexpected error occurred. Please try again later."}), 500

    logger.info(
        "DELETE /teams/members/%s — member removed from team id=%s",
        user_id, team.id,
    )
    return jsonify({"message": "Member removed successfully."}), 200
