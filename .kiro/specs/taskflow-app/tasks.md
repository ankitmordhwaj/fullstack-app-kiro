# Implementation Plan: TaskFlow Application

## Overview

Full-stack task management application built with Flask (Python 3.11) on the backend and React 18 + TypeScript on the frontend, containerised with Docker Compose. Tasks are ordered so that infrastructure and data models come first, then API routes, then frontend types and API modules, then UI components and pages, then tests, and finally wiring and Docker configuration.

---

## Tasks

- [x] 1. Set up backend project structure and configuration
  - Create `backend/` directory layout: `models/`, `routes/`, `tests/`
  - Create `backend/config.py` reading `DATABASE_URL`, `JWT_SECRET_KEY`, and `FLASK_ENV` from environment; call `sys.exit(1)` with a logged error if either required variable is missing
  - Create `backend/requirements.txt` with pinned versions: `flask`, `flask-sqlalchemy`, `flask-jwt-extended`, `flask-cors`, `werkzeug`, `aws-wsgi`, `psycopg2-binary`, `python-dotenv`, `pytest`, `pytest-flask`
  - Create `backend/app.py` with `create_app(config=None)` factory: initialise Flask, SQLAlchemy, JWTManager, CORS, register blueprints, call `db.create_all()` inside app context
  - Create `backend/wsgi.py` Lambda entry point using `awsgi`
  - _Requirements: 8.1, 8.2, 8.3, 8.8_

- [x] 2. Implement backend data models
  - [ ] 2.1 Implement `User` model in `backend/models/user.py`
    - Define `users` table with `id`, `full_name`, `email` (unique, indexed, lowercase-normalised), `password` (hash), `created_at`
    - Implement `set_password(plain_text)` using `werkzeug.security.generate_password_hash`
    - Implement `check_password(plain_text)` using `werkzeug.security.check_password_hash`
    - Implement `to_dict()` returning `id`, `full_name`, `email`, `created_at` — never `password`
    - Add `tasks` relationship with `cascade='all, delete-orphan'`
    - _Requirements: 1.2, 1.7, 2.2_

  - [ ] 2.2 Implement `Task` model in `backend/models/task.py`
    - Define `Priority` and `Status` enums (`LOW/MEDIUM/HIGH`, `PENDING/INPROGRESS/COMPLETED`)
    - Define `tasks` table with `id`, `title`, `description`, `priority`, `status`, `created_at`, `updated_at` (`onupdate=datetime.utcnow`), `user_id` (FK → users, indexed)
    - Implement `to_dict()` returning all fields with enum `.value` strings
    - _Requirements: 4.2, 5.1, 6.2_

  - [ ]* 2.3 Write unit tests for models in `backend/tests/test_models.py`
    - Test `User.set_password` stores a hash, never plain text
    - Test `User.check_password` returns True for correct password, False for wrong
    - Test `User.to_dict` omits `password` field
    - Test `Task.to_dict` returns all fields with string enum values
    - Test `Priority` and `Status` enum string values
    - _Requirements: 1.7_

- [x] 3. Implement auth blueprint
  - [x] 3.1 Implement `POST /auth/register` in `backend/routes/auth.py`
    - Validate `full_name` (required, ≤ 255 chars), `email` (required, valid format, ≤ 254 chars, case-insensitive uniqueness), `password` (required, ≥ 8 chars)
    - Return all field errors simultaneously as `{ "errors": {...} }` on HTTP 400
    - Return HTTP 409 if email already registered
    - Store password as hash via `User.set_password`; save to DB
    - Return HTTP 201 with `user.to_dict()`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [x] 3.2 Implement `POST /auth/login` in `backend/routes/auth.py`
    - Validate `email` and `password` fields present (HTTP 400 if missing)
    - Look up user by email (case-insensitive); verify password with `check_password`
    - Return HTTP 401 with generic message on bad credentials
    - Return HTTP 200 with `access_token`, `refresh_token`, and `user.to_dict()`
    - _Requirements: 2.2, 2.3, 2.4_

  - [ ]* 3.3 Write unit tests for auth routes in `backend/tests/test_auth.py`
    - Register: valid data → 201, no password in response
    - Register: missing fields → 400 with all field names
    - Register: invalid email format → 400
    - Register: password < 8 chars → 400
    - Register: duplicate email → 409
    - Register: full_name > 255 chars or email > 254 chars → 400
    - Login: valid credentials → 200 with tokens and user object
    - Login: wrong password → 401 generic message
    - Login: unrecognised email → 401 generic message
    - Login: missing email or password → 400
    - _Requirements: 1.2–1.8, 2.2–2.4_

- [x] 4. Implement tasks blueprint
  - [x] 4.1 Implement `GET /tasks` in `backend/routes/tasks.py`
    - Require valid JWT (`@jwt_required()`)
    - Query `Task` records filtered by `user_id == get_jwt_identity()`
    - Return HTTP 200 with JSON array of `task.to_dict()`
    - _Requirements: 3.1, 5.1, 5.2_

  - [x] 4.2 Implement `POST /tasks` in `backend/routes/tasks.py`
    - Require valid JWT
    - Validate `title` (required, ≤ 200 chars, non-whitespace), `description` (required, ≤ 1000 chars, non-whitespace), `priority` (LOW/MEDIUM/HIGH), `status` (PENDING/INPROGRESS/COMPLETED)
    - Create `Task` with `user_id` from JWT identity; commit; return HTTP 201 with `task.to_dict()`
    - Return HTTP 400 with field-specific errors for all validation failures
    - _Requirements: 4.2, 4.3, 4.4, 4.5_

  - [x] 4.3 Implement `PUT /tasks/<id>` in `backend/routes/tasks.py`
    - Require valid JWT
    - Look up task by id; return 404 if not found
    - Return 403 if `task.user_id != get_jwt_identity()`
    - Validate updated fields (same constraints as creation); return 400 on failure
    - Update fields, commit, return HTTP 200 with updated `task.to_dict()` including refreshed `updated_at`
    - _Requirements: 6.2, 6.3, 6.4, 6.5_

  - [x] 4.4 Implement `DELETE /tasks/<id>` in `backend/routes/tasks.py`
    - Require valid JWT
    - Look up task by id; return 404 if not found
    - Return 403 if `task.user_id != get_jwt_identity()`
    - Delete task, commit; return HTTP 200 with confirmation message
    - _Requirements: 7.2, 7.3, 7.4, 7.5_

  - [x] 4.5 Implement health blueprint in `backend/routes/health.py`
    - Register `GET /health` returning `{"status": "ok"}` with HTTP 200, no auth required
    - _Requirements: 8.4_

  - [x] 4.6 Register global error handler in `create_app()`
    - Use `@app.errorhandler(Exception)` to catch unhandled exceptions
    - Return HTTP 500 with sanitised `{"error": "..."}` (no stack trace in response)
    - Log full traceback server-side
    - _Requirements: 9.1_

  - [ ]* 4.7 Write unit tests for tasks routes in `backend/tests/test_tasks.py`
    - GET /tasks with valid token → only requester's tasks
    - GET /tasks with expired/missing token → 401
    - POST /tasks valid payload → 201 with all fields
    - POST /tasks missing title or description → 400
    - POST /tasks whitespace-only title → 400
    - POST /tasks invalid priority/status value → 400
    - PUT /tasks/:id valid update → 200 with refreshed updated_at
    - PUT /tasks/:id not found → 404
    - PUT /tasks/:id owned by another user → 403
    - DELETE /tasks/:id valid → 200
    - DELETE /tasks/:id not found → 404
    - DELETE /tasks/:id owned by another user → 403
    - _Requirements: 3.1–3.4, 4.2–4.5, 5.1–5.2, 6.2–6.5, 7.2–7.5_

  - [ ]* 4.8 Write unit tests for health route in `backend/tests/test_health.py`
    - GET /health → 200 `{"status": "ok"}`
    - _Requirements: 8.4_

- [x] 5. Checkpoint — backend complete
  - Ensure `pytest backend/tests/` passes with zero failures before proceeding to frontend.
  - Ask the user if any backend behaviour needs adjustment before moving to the frontend.

- [x] 6. Scaffold frontend project and global types
  - [x] 6.1 Initialise Vite React-TS project at `frontend/` with `npm create vite@latest frontend -- --template react-ts`
    - Install dependencies: `react-router-dom`, `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`
    - Update `tsconfig.app.json`: set `verbatimModuleSyntax` to `false`
    - Remove default Vite template styles from `App.css` and `index.css`; add global reset (box-sizing, Inter font, light theme colours per design system)
    - _Requirements: 8.5, 8.6_

  - [x] 6.2 Create `frontend/src/types/index.ts`
    - Define and export: `User`, `Priority`, `TaskStatus`, `Task`, `AuthContextType`, `RegisterPayload`, `LoginPayload`, `TaskPayload`, `AuthResponse`, `ApiError`, `FieldErrors`, `NetworkError`
    - _Requirements: 1.2, 2.2, 4.2, 5.3_

- [x] 7. Implement frontend API modules
  - [x] 7.1 Implement `frontend/src/api/auth.ts`
    - Export `register(payload: RegisterPayload): Promise<AuthResponse>` — POST `/auth/register`
    - Export `login(payload: LoginPayload): Promise<AuthResponse>` — POST `/auth/login`
    - Catch `TypeError` (no response) and re-throw as `NetworkError`
    - Read base URL from `import.meta.env.VITE_API_URL`
    - _Requirements: 1.2, 2.2, 2.7, 9.2_

  - [x] 7.2 Implement `frontend/src/api/tasks.ts`
    - Export `getTasks(token: string): Promise<Task[]>` — GET `/tasks`
    - Export `createTask(token: string, payload: TaskPayload): Promise<Task>` — POST `/tasks`
    - Export `updateTask(token: string, id: number, payload: TaskPayload): Promise<Task>` — PUT `/tasks/:id`
    - Export `deleteTask(token: string, id: number): Promise<void>` — DELETE `/tasks/:id`
    - All functions set `Authorization: Bearer <token>` header
    - Catch `TypeError` and re-throw as `NetworkError`
    - _Requirements: 3.1, 4.2, 5.1, 6.2, 7.2, 9.2_

  - [ ]* 7.3 Write unit tests for `frontend/src/api/auth.test.ts`
    - `register` sends correct URL, method, body; returns parsed response
    - `login` sends correct URL, method, body; returns parsed response
    - Both functions surface `NetworkError` when `fetch` throws `TypeError`
    - _Requirements: 1.2, 2.2, 2.7_

  - [ ]* 7.4 Write unit tests for `frontend/src/api/tasks.test.ts`
    - `getTasks` sends Authorization header; returns task array
    - `createTask` sends correct body and Authorization header; returns created task
    - `updateTask` sends correct body and Authorization header; returns updated task
    - `deleteTask` sends DELETE with Authorization header
    - Network error handling for each function
    - _Requirements: 3.1, 4.2, 5.1, 6.2, 7.2, 9.2_

- [x] 8. Implement AuthContext and routing scaffold
  - [x] 8.1 Implement `frontend/src/context/AuthContext.tsx`
    - Provide `AuthContextType` via React Context
    - `login(token, refreshToken, user)` — store `access_token` and `refresh_token` in `localStorage`, set state
    - `logout()` — remove both tokens from `localStorage`, clear state, redirect to `/login`
    - On mount, read existing tokens from `localStorage` to restore session
    - _Requirements: 2.5, 3.5, 3.6, 3.7_

  - [x] 8.2 Implement `frontend/src/components/ProtectedRoute.tsx`
    - Read `token` from `AuthContext`; if null redirect to `/login` via `<Navigate>`
    - Otherwise render child routes/components
    - _Requirements: 3.5_

  - [x] 8.3 Wire routing in `frontend/src/App.tsx`
    - Wrap app in `AuthProvider`
    - Define routes: `/` → redirect to `/tasks`, `/register`, `/login`, `/tasks` (protected), `/tasks/new` (protected), `/tasks/:id/edit` (protected)
    - _Requirements: 3.5_

  - [ ]* 8.4 Write unit tests for `frontend/src/context/AuthContext.test.tsx`
    - `login` sets `access_token` and `refresh_token` in localStorage and updates context state
    - `logout` removes both tokens from localStorage and clears state
    - _Requirements: 2.5, 3.6_

  - [ ]* 8.5 Write unit tests for `frontend/src/components/ProtectedRoute.test.tsx`
    - Redirects to `/login` when no token present
    - Renders children when token is present
    - _Requirements: 3.5_

- [x] 9. Implement shared UI components
  - [ ] 9.1 Implement `frontend/src/components/Button.tsx`
    - Props: `variant` (primary | secondary | outline | ghost), `disabled`, standard button props
    - Apply design system styles per variant via CSS Module
    - Disabled state: `opacity: 0.6`, `cursor: not-allowed`
    - _Requirements: 1.1, 4.1_

  - [ ] 9.2 Implement form input components
    - `frontend/src/components/Input.tsx` — controlled text input with `error?: string` prop; error state border `#EF4444`, error message below input
    - `frontend/src/components/Textarea.tsx` — controlled textarea with same error pattern
    - `frontend/src/components/Select.tsx` — controlled select with same error pattern; clears field error on change (Requirement 9.4)
    - Apply design system input styles (padding, border-radius, focus outline) via CSS Modules
    - _Requirements: 1.9, 4.6, 9.3, 9.4_

  - [ ] 9.3 Implement `frontend/src/components/Card.tsx`
    - Surface container with background `#FFFFFF`, padding `16px`, border-radius `12px`, box-shadow per design system
    - _Requirements: 5.3_

  - [ ] 9.4 Implement `frontend/src/components/ErrorBanner.tsx`
    - Dismissible banner fixed at top of page for 401/403/404/500 responses
    - Props: `message: string`, `onDismiss: () => void`
    - Includes a close (×) button
    - _Requirements: 9.5_

  - [ ] 9.5 Implement `frontend/src/components/ConfirmDialog.tsx`
    - Modal confirmation prompt with confirm and cancel callbacks
    - Props: `message: string`, `onConfirm: () => void`, `onCancel: () => void`
    - _Requirements: 7.6_

  - [ ] 9.6 Implement `frontend/src/components/TaskCard.tsx`
    - Display task `title`, `description`, `priority` badge, `status` badge
    - Include Edit button (navigates to `/tasks/:id/edit`) and Delete button
    - Delete button triggers `ConfirmDialog` before calling `onDelete`
    - Props: `task: Task`, `onDelete: (id: number) => void`
    - _Requirements: 5.3, 7.1, 7.6_

  - [ ]* 9.7 Write unit tests for shared components
    - `Button.test.tsx`: renders each variant, disabled state sets correct attributes
    - `Input.test.tsx`, `Textarea.test.tsx`, `Select.test.tsx`: renders with error message, clears error on change
    - `Card.test.tsx`: renders children
    - `ErrorBanner.test.tsx`: renders message, dismiss button removes it
    - `ConfirmDialog.test.tsx`: confirm callback fires on confirm, cancel callback fires on cancel
    - `TaskCard.test.tsx`: renders all task fields, delete button shows ConfirmDialog
    - _Requirements: 5.3, 7.1, 7.6, 9.3, 9.4, 9.5_

- [x] 10. Implement authentication pages
  - [x] 10.1 Implement `frontend/src/pages/RegisterPage.tsx`
    - Form with `full_name`, `email`, `password` fields using `Input` component
    - Client-side: all fields required before API call
    - On submit: call `register(payload)`, on success redirect to `/login`
    - On HTTP 400: display field-level errors below each input; clear field error on change
    - On HTTP 409: display form-level error
    - On `NetworkError`: display connectivity message with retry action
    - _Requirements: 1.1, 1.9, 9.2, 9.3, 9.4_

  - [x] 10.2 Implement `frontend/src/pages/LoginPage.tsx`
    - Form with `email` and `password` fields
    - On submit: call `login(payload)`, on success call `AuthContext.login(...)` and redirect to `/tasks`
    - On HTTP 4xx/5xx: display API error message without clearing entered credentials
    - On `NetworkError`: display connectivity message with retry
    - _Requirements: 2.1, 2.5, 2.6, 2.7_

  - [ ]* 10.3 Write unit tests for auth pages
    - `RegisterPage.test.tsx`: form renders all fields, submit calls `register`, 400 shows field errors, 409 shows form error, network error shows retry
    - `LoginPage.test.tsx`: form renders, successful login stores tokens and redirects, 401 shows error message without clearing inputs
    - _Requirements: 1.1, 1.9, 2.1, 2.5, 2.6, 2.7, 9.2_

- [x] 11. Implement task pages
  - [x] 11.1 Implement `frontend/src/pages/TasksPage.tsx`
    - On mount: call `getTasks(token)`, render list of `TaskCard` components
    - Empty state: show message and a link/button to `/tasks/new`
    - On 401 from API: call `AuthContext.logout()` which clears storage and redirects to `/login`
    - On 403/404/500: show `ErrorBanner`
    - Handle delete: call `deleteTask(token, id)`, on success remove task from state without page reload; on error show `ErrorBanner`
    - _Requirements: 3.7, 5.3, 5.4, 7.7, 7.8, 9.5_

  - [x] 11.2 Implement `frontend/src/pages/CreateTaskPage.tsx`
    - Form with `title` (Input), `description` (Textarea), `priority` (Select), `status` (Select with PENDING pre-selected)
    - Client-side: block submission and show inline errors if `title` or `description` empty (no API call)
    - On submit: call `createTask(token, payload)`, on success redirect to `/tasks`
    - On HTTP 400: display field errors; clear each field error on change; preserve all input values
    - On `NetworkError`: display connectivity message with retry
    - _Requirements: 4.1, 4.6, 4.7, 9.2, 9.3, 9.4_

  - [x] 11.3 Implement `frontend/src/pages/EditTaskPage.tsx`
    - On mount: call `getTasks(token)` (or a single-task fetch) to retrieve task; pre-populate all four fields
    - On submit: call `updateTask(token, id, payload)`, on success redirect to `/tasks`
    - On HTTP 400: display field errors, preserve edited values
    - On 403/404: show `ErrorBanner`
    - On `NetworkError`: display connectivity message with retry
    - _Requirements: 6.1, 6.2, 6.6, 9.2, 9.3, 9.4_

  - [ ]* 11.4 Write unit tests for task pages
    - `TasksPage.test.tsx`: renders task list, shows empty state message with create link, 401 redirects to login
    - `CreateTaskPage.test.tsx`: form renders with PENDING default, client-side validation blocks empty submit, successful submit navigates to /tasks, 400 shows field errors
    - `EditTaskPage.test.tsx`: pre-populates fields from fetched task, saves changes and navigates, shows field errors on failure
    - _Requirements: 4.1, 4.6, 4.7, 5.3, 5.4, 6.1, 6.2, 6.6_

- [x] 12. Checkpoint — frontend complete
  - Run `npx vitest --run` and confirm all tests pass.
  - Verify all routes are reachable and ProtectedRoute correctly guards `/tasks`, `/tasks/new`, `/tasks/:id/edit`.
  - Ask the user if any frontend behaviour needs adjustment before wiring Docker Compose.

- [-] 13. Create Docker Compose and environment configuration
  - [x] 13.1 Create `docker-compose.yml` at project root
    - Define `db` service: `postgres:15`, port `5432`, `POSTGRES_USER/PASSWORD/DB` from `.env`, named volume for data persistence
    - Define `backend` service: build from `backend/Dockerfile`, port `5000`, volume mount `./backend:/app` for hot reload, depends on `db` with health-check condition, env vars from `.env`
    - Define `frontend` service: build from `frontend/Dockerfile`, port `3000`, volume mount `./frontend:/app` for hot reload, env var `VITE_API_URL`
    - _Requirements: 8.1, 8.6, 8.7_

  - [x] 13.2 Create `backend/Dockerfile`
    - Base: `python:3.11-slim`
    - Install dependencies from `requirements.txt`
    - Run with `flask run --host=0.0.0.0 --port=5000` (hot reload via `FLASK_ENV=development`)
    - _Requirements: 8.1, 8.6_

  - [x] 13.3 Create `frontend/Dockerfile`
    - Base: `node:20-slim`
    - Install dependencies via `npm install`
    - Run with `npm run dev -- --host 0.0.0.0 --port 3000`
    - _Requirements: 8.1, 8.5, 8.6_

  - [x] 13.4 Create `.env.example` at project root documenting all required variables
    - `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `JWT_SECRET_KEY`, `DATABASE_URL`, `FLASK_ENV`, `VITE_API_URL`
    - Add `.env` to `.gitignore`
    - _Requirements: 8.3_

- [x] 14. Final checkpoint — full stack integration
  - Ensure `pytest backend/tests/` passes with zero failures.
  - Ensure `npx vitest --run` (in `frontend/`) passes with zero failures.
  - Verify `docker compose up` brings all three services online: `GET http://localhost:5000/health` → 200, `GET http://localhost:3000` → non-error HTTP response.
  - Ask the user if any final adjustments are needed.

---

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster MVP build.
- All tasks reference specific requirements for full traceability.
- Backend tasks (1–5) must complete before frontend API modules (7) to ensure API contracts are stable.
- Data models (2) must precede route implementations (3, 4).
- Shared UI components (9) must precede page implementations (10, 11).
- Auth pages (10) must precede task pages (11) because task pages depend on `AuthContext`.
- Docker Compose (13) is last because it wires together already-validated services.
- No property-based tests — unit tests only per tech steering.
- All TypeScript files use `.tsx` for components and `.ts` for non-JSX modules; no `.js`/`.jsx` files.
- `verbatimModuleSyntax` must remain `false` in `tsconfig.app.json`.
- All secrets are read exclusively from `.env`; nothing is hardcoded.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["6.1", "6.2"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "3.1", "3.2", "7.1", "7.2"] },
    { "id": 3, "tasks": ["3.3", "4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "7.3", "7.4", "8.1", "8.2", "8.3"] },
    { "id": 4, "tasks": ["4.7", "4.8", "8.4", "8.5", "9.1", "9.2", "9.3", "9.4", "9.5", "9.6"] },
    { "id": 5, "tasks": ["9.7", "10.1", "10.2"] },
    { "id": 6, "tasks": ["10.3", "11.1", "11.2", "11.3"] },
    { "id": 7, "tasks": ["11.4", "13.1", "13.2", "13.3", "13.4"] }
  ]
}
```
