---
inclusion: fileMatch
fileMatchPattern: ["backend/**/*.py"]
---

# Python & Flask Best Practices

## Project Structure
```
backend/
├── app.py              # App factory: create_app()
├── config.py           # Config classes (Dev, Prod, Test)
├── extensions.py       # db, jwt, cors instances
├── models/
│   ├── __init__.py
│   ├── user.py
│   └── task.py
├── routes/
│   ├── __init__.py
│   ├── auth.py         # /auth/register, /auth/login
│   └── tasks.py        # /tasks GET, POST, PUT, DELETE
├── tests/
│   ├── conftest.py     # shared fixtures (app, client, db)
│   ├── test_auth.py    # unit tests for auth routes
│   ├── test_tasks.py   # unit tests for task routes
│   └── test_models.py  # unit tests for User and Task models
├── requirements.txt
└── wsgi.py             # aws-wsgi handler for Lambda
```

## App Factory Pattern

Always use the app factory pattern — never create the app at module level.

```python
# backend/extensions.py
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS

db = SQLAlchemy()
jwt = JWTManager()
cors = CORS()
```

```python
# backend/app.py
from flask import Flask
from .extensions import db, jwt, cors
from .routes.auth import auth_bp
from .routes.tasks import tasks_bp
from .config import Config

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialise extensions
    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/*": {"origins": "*"}})

    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(tasks_bp, url_prefix='/tasks')

    # Create tables — never use Alembic
    with app.app_context():
        db.create_all()

    return app
```

## Configuration

```python
# backend/config.py
import os

class Config:
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'dev-secret')
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24 hours in seconds
```

## Database Models

### Always inherit from db.Model
### Always define `__tablename__` explicitly
### Always add a `to_dict()` method for JSON serialisation — never return model objects directly

Example:
```python
# backend/models/user.py
from datetime import datetime
from ..extensions import db

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    tasks = db.relationship('Task', backref='user', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'full_name': self.full_name,
            'email': self.email,
            'created_at': self.created_at.isoformat(),
        }
```


## Routes & Blueprints

### Always use Blueprints — never register routes directly on the app
### Always return `jsonify()` — never return raw dicts
### Always validate required fields before touching the database


## Package and Module Structure

- Organize packages by business capability or bounded context
- Modules must be single-purpose and cohesive
- Avoid circular dependencies

### Prohibited
- utils.py, helpers.py, common.py
- God classes or god modules


### Rules
- One test file per source module — `test_auth.py`, `test_tasks.py`, `test_models.py`
- Every route (success + failure paths) must have a test
- Every model method (`to_dict()`) must have a test
- Use in-memory SQLite — never connect to a real database in tests
- Do NOT write property-based tests — unit tests only
- Run with: `pytest backend/tests/ -v`


- Always hash passwords with `werkzeug.security.generate_password_hash`
- Always verify with `werkzeug.security.check_password_hash`
- Never store or log plain-text passwords
- Never return `password_hash` in any API response

## Error Responses
All error responses must follow this shape:
```json
{ "message": "Human readable error description" }
```

Success responses return the relevant data object or list directly.

## HTTP Status Codes
| Scenario | Code |
|---|---|
| Successful GET | 200 |
| Successful POST (created) | 201 |
| Successful PUT (updated) | 200 |
| Successful DELETE | 200 |
| Validation error | 400 |
| Wrong credentials | 401 |
| Access to another user's resource | 403 |
| Resource not found | 404 |
| Server error | 500 |


## Error Handling Standards

- Explicit, typed exceptions
- No silent failures
- No blanket except Exception without rethrow

### Error Categories
- Validation errors
- Authorization errors
- Dependency failures
- System/runtime errors

## Type Safety and Data Modeling

- Prefer explicit typing
- Use dataclasses, TypedDict, or Pydantic
- Avoid Any and untyped dictionaries
- Fully typed public APIs

## Logging and Observability

- Structured logging
- No sensitive data in logs
- Correlation IDs where applicable



## Lambda Entry Point

Use `awsgi` (aws-wsgi)

```python
# backend/wsgi.py
import awsgi
from app import create_app

app = create_app()

def handler(event, context):
    return awsgi.response(app, event, context)
```


## Do Nots
- Do NOT use Alembic or Flask-Migrate — use `db.create_all()` only
- Do NOT return SQLAlchemy model objects directly — always call `.to_dict()`
- Do NOT put business logic inside route functions — if it grows, extract to a service layer
- Do NOT commit to the database without handling exceptions
- Do NOT hardcode secrets — always use environment variables
- Do NOT use `SELECT *` raw SQL — use SQLAlchemy ORM queries