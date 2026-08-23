---
inclusion: always
---

# Technology Stack

## Project Structure
```
root/
├── frontend/        # React application
├── backend/         # Flask REST API
├── scripts/         # Utility and setup scripts
└── infra/           # Terraform infrastructure as code
```

## Backend

### Language & Framework
- **Python 3.11+**
- **Flask** — lightweight REST API framework
- **Flask-SQLAlchemy** — ORM for database models
- **Flask-JWT-Extended** — JWT authentication
- **Flask-CORS** — Cross-origin resource sharing for React frontend
- **Werkzeug** — Password hashing (pbkdf2:sha256)
- **aws-wsgi** — AWS Lambda WSGI adapter for deploying Flask to Lambda (use `awsgi`, NOT Mangum)
- **pytest** — Unit testing framework
- **pytest-flask** — Flask test client integration for pytest

### Database
- **PostgreSQL** (via Docker in local dev, RDS Aurora PostgreSQL in production)
- **SQLAlchemy** ORM
- Database initialisation via `db.create_all()` — **do NOT use Alembic or any migration tool**
- Connection string via `DATABASE_URL` environment variable

### Key Conventions
- All models live in `backend/models/`
- All route blueprints live in `backend/routes/`
- App factory pattern: `create_app()` in `backend/app.py`
- Environment config via `.env` file (never committed) and `backend/config.py`
- Return JSON responses for all endpoints
- Use HTTP status codes correctly: 200, 201, 400, 401, 403, 404, 500
- All passwords hashed with Werkzeug before storing
- Add proper logging using logger.

### Testing
- Test files live in `backend/tests/`
- One test file per source file: `test_auth.py`, `test_tasks.py`, `test_models.py`
- Use `pytest` with `pytest-flask` for the Flask test client
- Use an in-memory SQLite database for tests (`SQLALCHEMY_DATABASE_URI = 'sqlite://'`)
- Every route and every model method must have unit tests
- Do NOT write property-based tests — unit tests only

### Dependencies File
- `backend/requirements.txt`

### Lambda Entry Point
- Use `awsgi` (aws-wsgi) as the Lambda handler — NOT Mangum
- Entry point in `backend/wsgi.py`:
```python
import awsgi
from app import create_app

app = create_app()

def handler(event, context):
    return awsgi.response(app, event, context)
```

## Frontend

### Language & Framework
- **React 18** with **Vite** — use `npm create vite@latest frontend -- --template react-ts`
- **TypeScript** — all files use `.tsx` for components, `.ts` for non-JSX files. **No `.js` or `.jsx` files**
- **React Router v6** — client-side routing
- Native **fetch API** for all HTTP calls — **do NOT use Axios or any HTTP library**
- **CSS Modules** or plain CSS for styling — no Tailwind or UI component library

### TypeScript Config
- `verbatimModuleSyntax` is set to `false` in `tsconfig.app.json` — do NOT enable it
- Enabling it forces `import type` on every type/interface import and causes runtime `SyntaxError` in Vite's dev server

### TypeScript Conventions
- Define interfaces for all data shapes in `frontend/src/types/index.ts`
- All component props must be typed with an interface
- No use of `any` — use proper types or `unknown` with type guards
- API functions must declare return types explicitly

```ts
// frontend/src/types/index.ts
export interface User {
  id: number;
  full_name: string;
  email: string;
  created_at: string;
}

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'PENDING' | 'INPROGRESS' | 'COMPLETED';

// Kanban column identifiers map directly to TaskStatus
export type ColumnId = TaskStatus;

export interface Task {
  id: number;
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  user_id: number;
}

// Kanban board column definition
export interface KanbanColumn {
  id: ColumnId;
  title: string;  // Display name: "To Do", "In Progress", "Done"
  tasks: Task[];
}

export interface AuthContextType {
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}
```

### Key Conventions
- All API calls centralised in `frontend/src/api/` folder
- Components in `frontend/src/components/`
- Kanban board components in `frontend/src/components/board/` (KanbanBoard, KanbanColumn, KanbanCard)
- Pages in `frontend/src/pages/`
- Auth context via React Context API in `frontend/src/context/AuthContext.tsx`
- Shared types in `frontend/src/types/index.ts`
- JWT token stored in `localStorage`
- Protected routes redirect unauthenticated users to `/login`
- Use the HTML5 Drag and Drop API for kanban card movement — no external DnD library required

### Testing
- Use **Vitest** (built into Vite) as the test runner
- Use **@testing-library/react** and **@testing-library/user-event** for component tests
- Use **jsdom** as the test environment
- One test file per component/page: `TaskCard.test.tsx`, `LoginPage.test.tsx`
- One test file per API module: `auth.test.ts`, `tasks.test.ts`
- Mock `fetch` globally in tests using `vi.stubGlobal('fetch', ...)`
- Every component and every API function must have unit tests
- Do NOT write property-based tests — unit tests only
- Test files live alongside source files: `TaskCard.tsx` → `TaskCard.test.tsx`

### Environment
- API base URL via `VITE_API_URL` environment variable (Vite uses `VITE_` prefix, NOT `REACT_APP_`)
- Use the `.env` file from project root.

## Local Development

### Docker Compose
- `docker-compose.yml` at project root
- Services:
  - `db` — PostgreSQL 15 container
  - `backend` — Flask app (hot reload via volume mount)
  - `frontend` — React dev server (hot reload)
- Backend exposed on port **5000**
- Frontend exposed on port **3000**
- Database exposed on port **5432**
- All secrets via `.env` file at project root

## Infrastructure (AWS)

### Tool
- **Terraform** — all infra as code in `infra/` folder
- Provider: `hashicorp/aws`

### AWS Services
- **AWS Lambda** — runs the Flask backend via aws-wsgi (awsgi)
- **API Gateway (HTTP API)** — exposes Lambda as REST endpoints
- **RDS Aurora PostgreSQL (Serverless v2)** — production database
- **VPC + Subnets + Security Groups** — network isolation

### Terraform Conventions
- `infra/main.tf` — provider and backend config
- `infra/variables.tf` — input variables
- `infra/outputs.tf` — output values
- `infra/lambda.tf` — Lambda and API Gateway resources
- `infra/rds.tf` — Aurora PostgreSQL cluster
- `infra/vpc.tf` — networking
- State backend: S3 + DynamoDB lock (configured in `main.tf`)

## Environment Variables Reference

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/taskflow
JWT_SECRET_KEY=your-secret-key-here
FLASK_ENV=development
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000
```

### Docker Compose (.env at root)
```
POSTGRES_USER=taskflow
POSTGRES_PASSWORD=taskflow
POSTGRES_DB=taskflow
JWT_SECRET_KEY=dev-secret-key
```