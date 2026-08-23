import logging

from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException

from extensions import db, jwt, cors

logger = logging.getLogger(__name__)


def _sync_pg_enums(app: Flask) -> None:
    """Ensure PostgreSQL enum types contain all values defined in Python enums.

    This handles the case where a new enum member (e.g. CANCELLED) is added to
    the Python code after the database type was originally created. Only runs
    for PostgreSQL connections; silently skips for SQLite (used in tests).
    """
    uri = app.config.get("SQLALCHEMY_DATABASE_URI", "")
    if not uri or "postgresql" not in uri:
        return

    from models.invitation import InvitationStatus

    enum_sync_map = {
        "invitationstatus": [member.name for member in InvitationStatus],
    }

    try:
        with db.engine.connect() as conn:
            for type_name, expected_values in enum_sync_map.items():
                result = conn.execute(
                    db.text(
                        "SELECT enumlabel FROM pg_enum "
                        "JOIN pg_type ON pg_enum.enumtypid = pg_type.oid "
                        "WHERE pg_type.typname = :type_name"
                    ),
                    {"type_name": type_name},
                )
                existing = {row[0] for row in result}

                for value in expected_values:
                    if value not in existing:
                        conn.execute(
                            db.text(
                                f"ALTER TYPE {type_name} ADD VALUE IF NOT EXISTS :val"
                            ),
                            {"val": value},
                        )
                        conn.commit()
                        logger.info(
                            "Added missing value '%s' to PostgreSQL enum type '%s'.",
                            value,
                            type_name,
                        )
    except Exception:
        logger.warning("Could not sync PostgreSQL enum types.", exc_info=True)


def create_app(config=None) -> Flask:
    """Application factory.

    Args:
        config: Optional dict or object to override configuration values.
                Pass a dict when running tests (e.g. in-memory SQLite),
                or leave as ``None`` to load from environment via
                ``config.Config``.

    Returns:
        A configured Flask application instance.
    """
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    app = Flask(__name__)

    # ------------------------------------------------------------------ #
    # Configuration
    # ------------------------------------------------------------------ #
    if config is not None:
        if isinstance(config, dict):
            app.config.update(config)
        else:
            app.config.from_object(config)
    else:
        # Load from environment — Config.sys.exit(1) if vars missing
        from config import Config

        app_cfg = Config()
        app.config["SQLALCHEMY_DATABASE_URI"] = app_cfg.SQLALCHEMY_DATABASE_URI
        app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = app_cfg.SQLALCHEMY_TRACK_MODIFICATIONS
        app.config["JWT_SECRET_KEY"] = app_cfg.JWT_SECRET_KEY
        app.config["FLASK_ENV"] = app_cfg.FLASK_ENV

    # ------------------------------------------------------------------ #
    # Extensions
    # ------------------------------------------------------------------ #
    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/*": {"origins": "*"}})

    # ------------------------------------------------------------------ #
    # Blueprints
    # ------------------------------------------------------------------ #
    from routes.auth import auth_bp
    from routes.tasks import tasks_bp
    from routes.health import health_bp
    from routes.teams import teams_bp
    from routes.notifications import notifications_bp
    from routes.invitations import invitations_bp
    from routes.tickets import tickets_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(tasks_bp)
    app.register_blueprint(health_bp)
    app.register_blueprint(teams_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(invitations_bp)
    app.register_blueprint(tickets_bp)

    # ------------------------------------------------------------------ #
    # Global error handlers
    # ------------------------------------------------------------------ #
    @app.errorhandler(HTTPException)
    def handle_http_exception(exc: HTTPException):
        """Return proper JSON responses for HTTP errors (404, 405, etc.)."""
        logger.debug("HTTP %s: %s", exc.code, exc.description)
        return jsonify({"message": exc.description}), exc.code

    @app.errorhandler(Exception)
    def handle_unhandled_exception(exc: Exception):
        """Catch-all for unexpected non-HTTP exceptions — return 500."""
        logger.exception("Unhandled exception: %s", exc)
        return (
            jsonify({"message": "An unexpected error occurred. Please try again later."}),
            500,
        )

    # ------------------------------------------------------------------ #
    # Database initialisation — db.create_all(), never Alembic
    # ------------------------------------------------------------------ #
    with app.app_context():
        db.create_all()

        # Sync PostgreSQL enum types with Python enums.
        # db.create_all() does not add new values to existing enum types,
        # so we must do it manually to avoid StatementError on updates.
        _sync_pg_enums(app)

        logger.info("Database tables ensured.")

    logger.info(
        "Flask application created (env=%s).", app.config.get("FLASK_ENV", "unknown")
    )
    return app
