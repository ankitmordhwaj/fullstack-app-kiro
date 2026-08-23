"""Ticket routes: GET/POST/PUT/DELETE /tickets for the Kanban Board feature."""

import logging

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models.task import Priority, Status
from models.team import Team, TeamMember
from models.ticket import Ticket
from models.user import User

logger = logging.getLogger(__name__)

tickets_bp = Blueprint("tickets", __name__, url_prefix="/tickets")

# Valid enum string values for validation
_VALID_PRIORITIES = {p.value for p in Priority}
_VALID_STATUSES = {s.value for s in Status}


def _validate_ticket_fields(data: dict, team_id: int | None = None) -> dict[str, str]:
    """Validate ticket creation fields.

    Collects all field errors into a dict so all failures are returned at once.

    Args:
        data: Request JSON dict.
        team_id: The team ID to validate assignee membership against.

    Returns:
        Dict of field name -> error message. Empty dict means no errors.
    """
    errors: dict[str, str] = {}

    title: str = (data.get("title") or "").strip()
    description: str = (data.get("description") or "").strip()
    priority = data.get("priority")
    status = data.get("status")
    assignee_id = data.get("assignee_id")

    # title
    if not title:
        errors["title"] = "Title is required."
    elif len(title) > 200:
        errors["title"] = "Title must be 200 characters or fewer."

    # description
    if not description:
        errors["description"] = "Description is required."
    elif len(description) > 1000:
        errors["description"] = "Description must be 1000 characters or fewer."

    # priority
    if priority is None or (isinstance(priority, str) and priority.strip() == ""):
        errors["priority"] = "Priority is required."
    elif priority not in _VALID_PRIORITIES:
        errors["priority"] = (
            f"Priority must be one of: {', '.join(sorted(_VALID_PRIORITIES))}."
        )

    # status (optional — defaults to PENDING if not provided)
    if status is not None and status != "":
        if status not in _VALID_STATUSES:
            errors["status"] = (
                f"Status must be one of: {', '.join(sorted(_VALID_STATUSES))}."
            )

    # assignee_id (optional — if provided, must be a team member)
    if assignee_id is not None and team_id is not None:
        # Check if assignee is a member of the team
        is_team_owner = Team.query.filter_by(id=team_id, owner_id=assignee_id).first()
        is_team_member = TeamMember.query.filter_by(
            team_id=team_id, user_id=assignee_id
        ).first()
        if not is_team_owner and not is_team_member:
            errors["assignee_id"] = "Assignee must be a member of the team."

    return errors


def _validate_ticket_fields_partial(data: dict, team_id: int | None = None) -> dict[str, str]:
    """Validate ticket update fields (partial — only validate fields present in data).

    For PUT requests where all fields are optional (e.g., status-only drag updates).

    Args:
        data: Request JSON dict (only provided fields are validated).
        team_id: The team ID to validate assignee membership against.

    Returns:
        Dict of field name -> error message. Empty dict means no errors.
    """
    errors: dict[str, str] = {}

    # title — only validate if provided
    if "title" in data:
        title: str = (data["title"] or "").strip()
        if not title:
            errors["title"] = "Title must not be empty."
        elif len(title) > 200:
            errors["title"] = "Title must be 200 characters or fewer."

    # description — only validate if provided
    if "description" in data:
        description: str = (data["description"] or "").strip()
        if not description:
            errors["description"] = "Description must not be empty."
        elif len(description) > 1000:
            errors["description"] = "Description must be 1000 characters or fewer."

    # priority — only validate if provided
    if "priority" in data:
        priority = data["priority"]
        if priority is None or (isinstance(priority, str) and priority.strip() == ""):
            errors["priority"] = "Priority must not be empty."
        elif priority not in _VALID_PRIORITIES:
            errors["priority"] = (
                f"Priority must be one of: {', '.join(sorted(_VALID_PRIORITIES))}."
            )

    # status — only validate if provided
    if "status" in data:
        status = data["status"]
        if status is None or (isinstance(status, str) and status.strip() == ""):
            errors["status"] = "Status must not be empty."
        elif status not in _VALID_STATUSES:
            errors["status"] = (
                f"Status must be one of: {', '.join(sorted(_VALID_STATUSES))}."
            )

    # assignee_id — only validate if provided
    if "assignee_id" in data and data["assignee_id"] is not None and team_id is not None:
        assignee_id = data["assignee_id"]
        is_team_owner = Team.query.filter_by(id=team_id, owner_id=assignee_id).first()
        is_team_member = TeamMember.query.filter_by(
            team_id=team_id, user_id=assignee_id
        ).first()
        if not is_team_owner and not is_team_member:
            errors["assignee_id"] = "Assignee must be a member of the team."

    return errors


def _resolve_user_team(user_id: int) -> Team | None:
    """Resolve the team for a user using the priority logic.

    1. If user owns a team -> use that team
    2. Else if user is a member of a team -> use that team
    3. Else -> return None (user has no team)

    Args:
        user_id: The authenticated user's ID.

    Returns:
        The Team instance, or None if the user has no team.
    """
    # Check if user owns a team
    owned_team = Team.query.filter_by(owner_id=user_id).first()
    if owned_team:
        return owned_team

    # Check if user is a member of a team
    membership = TeamMember.query.filter_by(user_id=user_id).first()
    if membership:
        return Team.query.get(membership.team_id)

    return None


@tickets_bp.route("", methods=["GET"])
@jwt_required()
def get_tickets():
    """Return all tickets scoped to the user's team.

    Team resolution:
    1. If user owns a team -> return all tickets for that team
    2. Else if user is a member of a team -> return all tickets for that team
    3. Else -> return only the user's own tickets (creator_id = user_id, no team)

    Returns:
        200 + JSON array of ticket dicts.
    """
    user_id = int(get_jwt_identity())

    team = _resolve_user_team(user_id)

    if team:
        tickets = Ticket.query.filter_by(team_id=team.id).all()
        logger.info(
            "GET /tickets — user_id=%s, team_id=%s, returned %d tickets",
            user_id,
            team.id,
            len(tickets),
        )
    else:
        tickets = Ticket.query.filter_by(creator_id=user_id).all()
        logger.info(
            "GET /tickets — user_id=%s (no team), returned %d own tickets",
            user_id,
            len(tickets),
        )

    return jsonify([ticket.to_dict() for ticket in tickets]), 200


@tickets_bp.route("", methods=["POST"])
@jwt_required()
def create_ticket():
    """Create a new ticket for the user's team.

    Returns:
        201 + ticket dict on success.
        400 + ``{ "errors": {...} }`` on validation failure.
        400 + ``{ "error": "..." }`` if user has no team.
    """
    user_id = int(get_jwt_identity())
    data: dict = request.get_json(silent=True) or {}

    # Resolve user's team
    team = _resolve_user_team(user_id)
    if not team:
        logger.info("POST /tickets — user_id=%s has no team", user_id)
        return jsonify({"error": "You must belong to a team to create tickets."}), 400

    # Validate fields
    errors = _validate_ticket_fields(data, team_id=team.id)
    if errors:
        logger.info(
            "POST /tickets validation failed for user_id=%s: %s",
            user_id,
            list(errors.keys()),
        )
        return jsonify({"errors": errors}), 400

    # Determine status — default to PENDING if not provided
    status_value = data.get("status")
    if not status_value:
        status_value = Status.PENDING.value

    ticket = Ticket(
        title=data["title"].strip(),
        description=data["description"].strip(),
        priority=Priority(data["priority"]),
        status=Status(status_value),
        team_id=team.id,
        creator_id=user_id,
        assignee_id=data.get("assignee_id"),
    )

    try:
        db.session.add(ticket)
        db.session.commit()
    except Exception:
        db.session.rollback()
        logger.exception("Database error creating ticket for user_id=%s", user_id)
        return jsonify({"error": "An unexpected error occurred. Please try again later."}), 500

    logger.info(
        "POST /tickets — created ticket id=%s for user_id=%s, team_id=%s",
        ticket.id,
        user_id,
        team.id,
    )
    return jsonify(ticket.to_dict()), 201


@tickets_bp.route("/<int:ticket_id>", methods=["PUT"])
@jwt_required()
def update_ticket(ticket_id: int):
    """Update an existing ticket (owner only, partial update supported).

    Only the ticket creator can update. All fields are optional to support
    status-only drag-and-drop updates.

    Returns:
        200 + updated ticket dict on success.
        400 + ``{ "errors": {...} }`` on validation failure.
        403 + ``{ "error": "..." }`` if user is not the ticket creator.
        404 + ``{ "error": "..." }`` if ticket not found.
    """
    user_id = int(get_jwt_identity())

    ticket = db.session.get(Ticket, ticket_id)
    if not ticket:
        logger.info("PUT /tickets/%s — not found", ticket_id)
        return jsonify({"error": "Ticket not found."}), 404

    # Owner-only check
    if ticket.creator_id != user_id:
        logger.info(
            "PUT /tickets/%s — user_id=%s is not creator (creator_id=%s)",
            ticket_id,
            user_id,
            ticket.creator_id,
        )
        return jsonify({"error": "You do not have permission to update this ticket."}), 403

    data: dict = request.get_json(silent=True) or {}

    # Validate only the fields that are provided
    errors = _validate_ticket_fields_partial(data, team_id=ticket.team_id)
    if errors:
        logger.info(
            "PUT /tickets/%s validation failed for user_id=%s: %s",
            ticket_id,
            user_id,
            list(errors.keys()),
        )
        return jsonify({"errors": errors}), 400

    # Apply updates for provided fields
    if "title" in data:
        ticket.title = data["title"].strip()
    if "description" in data:
        ticket.description = data["description"].strip()
    if "priority" in data:
        ticket.priority = Priority(data["priority"])
    if "status" in data:
        ticket.status = Status(data["status"])
    if "assignee_id" in data:
        ticket.assignee_id = data["assignee_id"]

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        logger.exception("Database error updating ticket id=%s", ticket_id)
        return jsonify({"error": "An unexpected error occurred. Please try again later."}), 500

    logger.info("PUT /tickets/%s — updated by user_id=%s", ticket_id, user_id)
    return jsonify(ticket.to_dict()), 200


@tickets_bp.route("/<int:ticket_id>", methods=["DELETE"])
@jwt_required()
def delete_ticket(ticket_id: int):
    """Delete an existing ticket (owner only).

    Returns:
        200 + ``{ "message": "Ticket <id> deleted successfully." }`` on success.
        403 + ``{ "error": "..." }`` if user is not the ticket creator.
        404 + ``{ "error": "..." }`` if ticket not found.
    """
    user_id = int(get_jwt_identity())

    ticket = db.session.get(Ticket, ticket_id)
    if not ticket:
        logger.info("DELETE /tickets/%s — not found", ticket_id)
        return jsonify({"error": "Ticket not found."}), 404

    # Owner-only check
    if ticket.creator_id != user_id:
        logger.info(
            "DELETE /tickets/%s — user_id=%s is not creator (creator_id=%s)",
            ticket_id,
            user_id,
            ticket.creator_id,
        )
        return jsonify({"error": "You do not have permission to delete this ticket."}), 403

    try:
        db.session.delete(ticket)
        db.session.commit()
    except Exception:
        db.session.rollback()
        logger.exception("Database error deleting ticket id=%s", ticket_id)
        return jsonify({"error": "An unexpected error occurred. Please try again later."}), 500

    logger.info("DELETE /tickets/%s — deleted by user_id=%s", ticket_id, user_id)
    return jsonify({"message": f"Ticket {ticket_id} deleted successfully."}), 200


@tickets_bp.route("/members", methods=["GET"])
@jwt_required()
def get_team_members():
    """Return team members for the assignee dropdown/filter.

    Uses the same team resolution logic as GET /tickets:
    1. If user owns a team -> return owner + members
    2. Else if user is member of a team -> return owner + members
    3. Else -> return empty list

    Returns:
        200 + JSON array of ``[{"id", "full_name", "email"}]``.
    """
    user_id = int(get_jwt_identity())

    team = _resolve_user_team(user_id)
    if not team:
        logger.info("GET /tickets/members — user_id=%s has no team", user_id)
        return jsonify([]), 200

    # Collect all team member user IDs (owner + members)
    member_ids: set[int] = {team.owner_id}
    team_members = TeamMember.query.filter_by(team_id=team.id).all()
    for tm in team_members:
        member_ids.add(tm.user_id)

    # Fetch user records
    users = User.query.filter(User.id.in_(member_ids)).all()

    result = [
        {"id": u.id, "full_name": u.full_name, "email": u.email}
        for u in users
    ]

    logger.info(
        "GET /tickets/members — user_id=%s, team_id=%s, returned %d members",
        user_id,
        team.id,
        len(result),
    )
    return jsonify(result), 200
