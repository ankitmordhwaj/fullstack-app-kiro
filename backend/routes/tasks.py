"""Task routes: GET/POST /tasks and PUT/DELETE /tasks/<id>."""

import logging

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models.task import Task, Priority, Status

logger = logging.getLogger(__name__)

tasks_bp = Blueprint("tasks", __name__, url_prefix="/tasks")

# Valid enum string values for validation
_VALID_PRIORITIES = {p.value for p in Priority}
_VALID_STATUSES = {s.value for s in Status}


def _validate_task_fields(data: dict) -> dict[str, str]:
    """Validate task creation/update fields.

    Collects all field errors into a dict so all failures are returned at once.

    Args:
        data: Request JSON dict.

    Returns:
        Dict of field name → error message. Empty dict means no errors.
    """
    errors: dict[str, str] = {}

    title: str = (data.get("title") or "").strip()
    description: str = (data.get("description") or "").strip()
    priority = data.get("priority")
    status = data.get("status")

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

    # status
    if status is None or (isinstance(status, str) and status.strip() == ""):
        errors["status"] = "Status is required."
    elif status not in _VALID_STATUSES:
        errors["status"] = (
            f"Status must be one of: {', '.join(sorted(_VALID_STATUSES))}."
        )

    return errors


@tasks_bp.route("", methods=["GET"])
@jwt_required()
def get_tasks():
    """Return all tasks belonging to the authenticated user.

    Returns:
        200 + JSON array of task dicts.
    """
    user_id = int(get_jwt_identity())
    tasks = Task.query.filter_by(user_id=user_id).all()
    logger.info("GET /tasks — user_id=%s returned %d tasks", user_id, len(tasks))
    return jsonify([task.to_dict() for task in tasks]), 200


@tasks_bp.route("", methods=["POST"])
@jwt_required()
def create_task():
    """Create a new task for the authenticated user.

    Returns:
        201 + task dict on success.
        400 + ``{ "errors": {...} }`` on validation failure.
    """
    user_id = int(get_jwt_identity())
    data: dict = request.get_json(silent=True) or {}

    errors = _validate_task_fields(data)
    if errors:
        logger.info("POST /tasks validation failed for user_id=%s: %s", user_id, list(errors.keys()))
        return jsonify({"errors": errors}), 400

    task = Task(
        title=data["title"].strip(),
        description=data["description"].strip(),
        priority=Priority(data["priority"]),
        status=Status(data["status"]),
        user_id=user_id,
    )

    try:
        db.session.add(task)
        db.session.commit()
    except Exception:
        db.session.rollback()
        logger.exception("Database error creating task for user_id=%s", user_id)
        return jsonify({"error": "An unexpected error occurred. Please try again later."}), 500

    logger.info("POST /tasks — created task id=%s for user_id=%s", task.id, user_id)
    return jsonify(task.to_dict()), 201


@tasks_bp.route("/<int:task_id>", methods=["PUT"])
@jwt_required()
def update_task(task_id: int):
    """Update an existing task.

    Returns:
        200 + updated task dict on success.
        400 + ``{ "errors": {...} }`` on validation failure.
        403 if the task belongs to a different user.
        404 if the task does not exist.
    """
    user_id = int(get_jwt_identity())

    task = Task.query.get(task_id)
    if task is None:
        logger.info("PUT /tasks/%s — not found", task_id)
        return jsonify({"error": "Task not found."}), 404

    if task.user_id != user_id:
        logger.warning(
            "PUT /tasks/%s — user_id=%s does not own task (owner=%s)",
            task_id,
            user_id,
            task.user_id,
        )
        return jsonify({"error": "You do not have permission to update this task."}), 403

    data: dict = request.get_json(silent=True) or {}

    errors = _validate_task_fields(data)
    if errors:
        logger.info("PUT /tasks/%s validation failed: %s", task_id, list(errors.keys()))
        return jsonify({"errors": errors}), 400

    task.title = data["title"].strip()
    task.description = data["description"].strip()
    task.priority = Priority(data["priority"])
    task.status = Status(data["status"])

    try:
        db.session.commit()
        # Refresh to pick up server-side onupdate for updated_at
        db.session.refresh(task)
    except Exception:
        db.session.rollback()
        logger.exception("Database error updating task id=%s", task_id)
        return jsonify({"error": "An unexpected error occurred. Please try again later."}), 500

    logger.info("PUT /tasks/%s — updated successfully by user_id=%s", task_id, user_id)
    return jsonify(task.to_dict()), 200


@tasks_bp.route("/<int:task_id>", methods=["DELETE"])
@jwt_required()
def delete_task(task_id: int):
    """Delete a task.

    Returns:
        200 + confirmation message on success.
        403 if the task belongs to a different user.
        404 if the task does not exist.
    """
    user_id = int(get_jwt_identity())

    task = Task.query.get(task_id)
    if task is None:
        logger.info("DELETE /tasks/%s — not found", task_id)
        return jsonify({"error": "Task not found."}), 404

    if task.user_id != user_id:
        logger.warning(
            "DELETE /tasks/%s — user_id=%s does not own task (owner=%s)",
            task_id,
            user_id,
            task.user_id,
        )
        return jsonify({"error": "You do not have permission to delete this task."}), 403

    try:
        db.session.delete(task)
        db.session.commit()
    except Exception:
        db.session.rollback()
        logger.exception("Database error deleting task id=%s", task_id)
        return jsonify({"error": "An unexpected error occurred. Please try again later."}), 500

    logger.info("DELETE /tasks/%s — deleted successfully by user_id=%s", task_id, user_id)
    return jsonify({"message": f"Task {task_id} deleted successfully."}), 200
