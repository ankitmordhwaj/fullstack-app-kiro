"""Health check blueprint — no authentication required."""

import logging

from flask import Blueprint, jsonify

logger = logging.getLogger(__name__)

health_bp = Blueprint("health", __name__)


@health_bp.route("/health", methods=["GET"])
def health_check():
    """Liveness probe endpoint.

    Returns:
        200 + ``{"status": "ok"}``
    """
    logger.debug("GET /health — ok")
    return jsonify({"status": "ok"}), 200
