import logging

from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException

from extensions import db, jwt, cors

logger = logging.getLogger(__name__)


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

    app.register_blueprint(auth_bp)
    app.register_blueprint(tasks_bp)
    app.register_blueprint(health_bp)
    app.register_blueprint(teams_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(invitations_bp)

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
        logger.info("Database tables ensured.")

    logger.info(
        "Flask application created (env=%s).", app.config.get("FLASK_ENV", "unknown")
    )
    return app
