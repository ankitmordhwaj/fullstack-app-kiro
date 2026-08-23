# TaskFlow

A full-stack task management application built with Flask and React. Authenticated users can create, manage, and track personal tasks with team collaboration features.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, React Router v6 |
| Backend | Python 3.11, Flask, Flask-SQLAlchemy, Flask-JWT-Extended |
| Database | PostgreSQL 15 |
| Testing | pytest (backend), Vitest + Testing Library (frontend) |
| Deployment | AWS Lambda + API Gateway, Terraform |
| Local Dev | Docker Compose |

## Project Structure

```
├── backend/              # Flask REST API
│   ├── models/           # SQLAlchemy models
│   ├── routes/           # Blueprint route handlers
│   ├── tests/            # pytest unit tests
│   ├── app.py            # App factory (create_app)
│   ├── config.py         # Configuration
│   ├── extensions.py     # Flask extensions (db, jwt, cors)
│   └── wsgi.py           # AWS Lambda entry point (aws-wsgi)
├── frontend/             # React + TypeScript app
│   ├── src/
│   │   ├── api/          # API client modules
│   │   ├── components/   # Reusable UI components
│   │   ├── context/      # React context (Auth)
│   │   ├── pages/        # Page components
│   │   └── types/        # TypeScript interfaces
│   └── public/
├── docs/                 # Project documentation
├── .github/workflows/    # CI/CD pipelines
├── docker-compose.yml    # Local development setup
└── .env                  # Environment variables (not committed)
```

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for frontend development outside Docker)
- Python 3.11+ (for backend development outside Docker)

### Quick Start (Docker)

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd FullStack-Admin-App
   ```

2. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

3. Start all services:
   ```bash
   docker compose up --build
   ```

4. Access the app:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Database: localhost:5432

### Manual Setup (Without Docker)

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
flask run --port 5000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register a new user | No |
| POST | `/auth/login` | Login and get JWT token | No |

### Tasks
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/tasks` | List all tasks for current user | Yes |
| POST | `/tasks` | Create a new task | Yes |
| PUT | `/tasks/<id>` | Update a task | Yes |
| DELETE | `/tasks/<id>` | Delete a task | Yes |

### Teams
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/teams/members` | List team members | Yes |
| POST | `/teams/invite` | Invite a user to the team | Yes |

### Notifications
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/notifications` | List notifications | Yes |
| GET | `/notifications/unread-count` | Get unread notification count | Yes |

### Invitations
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| PUT | `/invitations/<id>/accept` | Accept an invitation | Yes |
| PUT | `/invitations/<id>/decline` | Decline an invitation | Yes |

### Health
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/health` | Health check | No |

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_USER` | Database username | `taskflow` |
| `POSTGRES_PASSWORD` | Database password | `taskflow_secret` |
| `POSTGRES_DB` | Database name | `taskflow` |
| `DATABASE_URL` | Full connection string | `postgresql://user:pass@db:5432/taskflow` |
| `JWT_SECRET_KEY` | Secret for JWT signing | `your-secret-key` |
| `FLASK_ENV` | Flask environment | `development` |
| `VITE_API_URL` | Backend URL for frontend | `http://localhost:5000` |

## Running Tests

**Backend:**
```bash
cd backend
pytest tests/ -v
```

**Frontend:**
```bash
cd frontend
npm run test
```

## Deployment

The application deploys to AWS:
- **Backend**: AWS Lambda via API Gateway (using `aws-wsgi`)
- **Database**: Amazon RDS Aurora PostgreSQL (Serverless v2)
- **Frontend**: Static hosting (S3 + CloudFront)
- **IaC**: Terraform (in `infra/` directory)

CI/CD workflows are defined in `.github/workflows/`.

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all tests pass
4. Submit a pull request

## License

This project is for educational and workshop purposes.
