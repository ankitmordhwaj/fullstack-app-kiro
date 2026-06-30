# Requirements Document

## Introduction

TaskFlow is a full-stack task management web application that enables authenticated users to create, organize, and track personal tasks. The system comprises a React + TypeScript frontend, a Flask REST API backend, and a PostgreSQL database, containerized via Docker Compose for local development. Users register with their name, email, and password; log in to receive JWT tokens; and then perform full CRUD operations on their own tasks. No user can access another user's data.

## Glossary

- **System**: The TaskFlow application as a whole
- **API**: The Flask REST API backend
- **UI**: The React frontend application
- **User**: A registered and authenticated person using TaskFlow
- **Task**: A personal work item belonging to a User, containing title, description, priority, status, and timestamps
- **JWT**: JSON Web Token — a signed token used for stateless authentication
- **Access_Token**: A short-lived JWT used to authenticate API requests; well-formed, correctly signed, and not expired
- **Refresh_Token**: A longer-lived JWT used to obtain a new Access_Token
- **Priority**: A Task classification value — one of LOW, MEDIUM, or HIGH
- **Status**: A Task state value — one of PENDING, INPROGRESS, or COMPLETED
- **Auth_Service**: The component responsible for user registration and login
- **Task_Service**: The component responsible for task CRUD operations
- **Token_Store**: The browser's localStorage, used to persist JWT tokens on the client
- **Password_Hasher**: The Werkzeug pbkdf2:sha256 hashing component

---

## Requirements

### Requirement 1: User Registration

**User Story:** As a new visitor, I want to create an account with my full name, email, and password, so that I can access TaskFlow and manage my personal tasks.

#### Acceptance Criteria

1. THE UI SHALL provide a registration form with fields for full name, email, and password.
2. WHEN a registration form is submitted with all required fields populated with valid values, THE API SHALL create a new User record and return HTTP 201 with the created user's id, full_name, email, and created_at fields.
3. WHEN a registration request is received with a missing or whitespace-only full name, email, or password field, THE API SHALL return HTTP 400 with an error message identifying each missing field by name.
4. WHEN a registration request is received with an email address that does not conform to a standard email format (local-part@domain), THE API SHALL return HTTP 400 with an error message stating the email format is invalid.
5. WHEN a registration request is received with a password shorter than 8 characters, THE API SHALL return HTTP 400 with an error message stating the password must be at least 8 characters.
6. WHEN a registration request is received with an email address that already exists in the database (case-insensitive comparison), THE API SHALL return HTTP 409 with an error message stating the email is already registered.
7. WHEN a registration request is accepted, THE API SHALL store the User's password as a hash produced by the Password_Hasher — the stored value SHALL NOT be the plain-text password supplied in the request.
8. WHEN a registration request is received with a full_name exceeding 255 characters or an email exceeding 254 characters, THE API SHALL return HTTP 400 with an error message identifying the offending field and its length limit.
9. IF a registration request fails validation, THEN THE UI SHALL display each error message beneath its corresponding form field and SHALL display all field errors simultaneously if multiple fields are invalid.

---

### Requirement 2: User Login

**User Story:** As a registered user, I want to log in with my email and password, so that I can authenticate and access my tasks.

#### Acceptance Criteria

1. THE UI SHALL provide a login form with fields for email and password.
2. WHEN a login request is submitted with a valid email and matching password, THE API SHALL return HTTP 200 with an access_token, refresh_token, and a user object containing id, full_name, email, and created_at.
3. WHEN a login request is submitted with an unrecognised email or an incorrect password, THE API SHALL return HTTP 401 with an error message stating the credentials are invalid.
4. WHEN a login request is received with a missing email or password field, THE API SHALL return HTTP 400 with an error message indicating which required field is missing.
5. WHEN a login response with HTTP 200 is received, THE UI SHALL store the access_token and refresh_token in localStorage and redirect the User to the tasks dashboard.
6. WHEN a login response with an HTTP 4xx or 5xx status code is received, THE UI SHALL display the error message returned by the API on the login form without clearing the user's entered credentials.
7. IF a login request fails due to a network error (no HTTP response received), THEN THE UI SHALL display an error message indicating that the request could not be completed due to a connectivity issue.

---

### Requirement 3: JWT Authentication Enforcement

**User Story:** As a system operator, I want every task-related endpoint to require a valid JWT, so that unauthenticated access to user data is prevented.

#### Acceptance Criteria

1. THE API SHALL require a valid Access_Token in the Authorization header (Bearer scheme) for all endpoints except POST /auth/register and POST /auth/login.
2. WHEN a request is received without an Authorization header on a protected endpoint, THE API SHALL return HTTP 401 with an error message stating that authentication credentials were not provided.
3. WHEN a request is received with a malformed or incorrectly-signed Access_Token on a protected endpoint, THE API SHALL return HTTP 401 with an error message stating the token is invalid.
4. WHEN a request is received with an expired Access_Token on a protected endpoint, THE API SHALL return HTTP 401 with an error message stating the token has expired.
5. WHILE a User is unauthenticated (no access_token present in localStorage), WHEN a navigation to a protected route occurs, THE UI SHALL redirect the User to the /login page.
6. WHEN the User logs out, THE UI SHALL remove the access_token and refresh_token from localStorage and redirect to the /login page.
7. WHEN the API returns HTTP 401 on any request made during an active UI session, THE UI SHALL clear the access_token and refresh_token from localStorage and redirect the User to the /login page.

---

### Requirement 4: Task Creation

**User Story:** As a logged-in user, I want to create a new task with a title, description, priority, and status, so that I can track work items in my personal list.

#### Acceptance Criteria

1. THE UI SHALL provide a task creation form with fields for title (text, max 200 characters), description (text, max 1000 characters), priority (LOW / MEDIUM / HIGH), and status (PENDING / INPROGRESS / COMPLETED) with PENDING pre-selected as the default status value.
2. WHEN a task creation request is submitted with all required fields and a valid Access_Token, THE API SHALL create a Task record associated with the authenticated User and return HTTP 201 with the task's id, title, description, priority, status, created_at, updated_at, and user_id.
3. WHEN a task creation request is received with a missing or whitespace-only title or description field, or with a title exceeding 200 characters or description exceeding 1000 characters, THE API SHALL return HTTP 400 with an error message that identifies which field failed and why.
4. WHEN a task creation request is received with a priority value outside LOW, MEDIUM, HIGH, THE API SHALL return HTTP 400 with an error message stating the priority value is invalid.
5. WHEN a task creation request is received with a status value outside PENDING, INPROGRESS, COMPLETED, THE API SHALL return HTTP 400 with an error message stating the status value is invalid.
6. WHEN the user attempts to submit the task creation form with an empty title or empty description, THE UI SHALL prevent form submission and display an inline validation error below each empty required field without making an API request.
7. IF a task creation request fails validation (HTTP 400 from the API), THEN THE UI SHALL display the error message returned by the API on the task creation form without clearing the user's existing field input.

---

### Requirement 5: Task Listing

**User Story:** As a logged-in user, I want to view all my tasks in a list, so that I can see everything I need to do at a glance.

#### Acceptance Criteria

1. WHEN a GET request for tasks is received with a valid Access_Token, THE API SHALL return HTTP 200 with a JSON array containing only the Task objects associated with the authenticated User.
2. THE API SHALL never include Tasks owned by any User other than the one identified by the Access_Token in any task listing response.
3. WHEN a task listing response is received, THE UI SHALL render each task displaying its title, description, priority as one of the strings LOW, MEDIUM, or HIGH, and status as one of the strings PENDING, INPROGRESS, or COMPLETED.
4. WHEN a task listing response contains an empty array, THE UI SHALL display an empty-state message and an interactive control that navigates the User to the task creation interface.
5. WHEN a GET request for tasks is received with a missing, malformed, or expired Access_Token, THE API SHALL return HTTP 401 with an error message and SHALL NOT include any task data in the response body.

---

### Requirement 6: Task Update

**User Story:** As a logged-in user, I want to edit the details of my own tasks, so that I can keep them accurate as my work evolves.

#### Acceptance Criteria

1. WHEN a User selects a Task to edit, THE UI SHALL display an edit interface with each task field (title, description, priority, status) pre-populated with the Task's current values.
2. WHEN a task update request is submitted with at least one modified field, a title of 1–255 characters, a description of 1–2000 characters, and a valid Access_Token for the Task owner, THE API SHALL update the Task record and return HTTP 200 with the updated task object including a refreshed updated_at timestamp that is later than the previous updated_at value.
3. WHEN a task update request is received for a Task id that does not exist in the database, THE API SHALL return HTTP 404 with an error message.
4. WHEN a task update request is received with a valid Access_Token belonging to a User who does not own the Task, THE API SHALL return HTTP 403 with an error message.
5. WHEN a task update request is received with a missing or whitespace-only title or description, a title exceeding 255 characters, a description exceeding 2000 characters, or an invalid priority or status value, THE API SHALL return HTTP 400 with an error message identifying the offending field and the constraint that was violated.
6. IF a task update request fails, THEN THE UI SHALL display the error message returned by the API and SHALL preserve the user's edited field values in the form so the user does not need to re-enter them.

---

### Requirement 7: Task Deletion

**User Story:** As a logged-in user, I want to delete tasks I no longer need, so that my task list stays relevant.

#### Acceptance Criteria

1. THE UI SHALL provide a labeled, interactive button element as the delete action for each Task displayed in the task list.
2. WHEN a task deletion request is received with a valid Access_Token for the Task owner, THE API SHALL permanently delete the Task record and return HTTP 200 with a confirmation message.
3. IF a task deletion request is received without an Authorization header, or with a missing, expired, or incorrectly-signed Access_Token, THEN THE API SHALL return HTTP 401 with an error message and SHALL NOT delete any Task record.
4. WHEN a task deletion request is received for a Task id that does not exist in the database, THE API SHALL return HTTP 404 with an error message.
5. WHEN a task deletion request is received with a valid Access_Token belonging to a User who does not own the Task, THE API SHALL return HTTP 403 with an error message.
6. WHEN the User activates the delete button for a Task, THE UI SHALL display a confirmation prompt asking the User to confirm the deletion before sending the DELETE request to the API.
7. IF the API returns a non-2xx response to a deletion request, THEN THE UI SHALL display an error message to the User and SHALL keep the Task visible in the list.
8. WHEN THE API returns HTTP 200 for a deletion request, THE UI SHALL remove the deleted Task from the displayed list without requiring a full page reload.

---

### Requirement 8: Data Persistence and Containerisation

**User Story:** As a developer, I want the application to run locally via Docker Compose with a PostgreSQL database, so that the development environment is reproducible and isolated.

#### Acceptance Criteria

1. THE System SHALL provide a docker-compose.yml at the project root that defines three services: db (PostgreSQL 15), backend (Flask on port 5000), and frontend (React on port 3000).
2. WHEN the docker-compose stack is started for the first time, THE System SHALL create all required database tables automatically so that the application is operational without any manual schema setup steps.
3. THE System SHALL read all secrets (POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, JWT_SECRET_KEY) exclusively from a .env file at the project root — these values SHALL NOT be hardcoded in docker-compose.yml or any application source file.
4. WHEN the backend service is running, THE API SHALL respond with HTTP 200 to a GET request to /health within 30 seconds of container startup.
5. WHEN the frontend service is running, THE UI SHALL be reachable via HTTP on port 3000 and return a non-error HTTP response within 30 seconds of container startup.
6. WHEN a source file in the backend or frontend directory is saved, THE System SHALL reflect the change in the running container without requiring a manual container restart or rebuild.
7. THE docker-compose.yml SHALL configure the backend service to wait for the db service to be ready before starting, so that the backend does not attempt database connections before PostgreSQL is accepting them.
8. WHEN the backend service starts with one or more required environment variables missing from the .env file, THE API SHALL exit immediately and log an error message identifying each missing variable.

---

### Requirement 9: Error Handling

**User Story:** As a user, I want to see clear error messages when something goes wrong, so that I understand what happened and how to correct it.

#### Acceptance Criteria

1. WHEN THE API encounters an unhandled server-side error, THE API SHALL return HTTP 500 with an error message that does not expose internal implementation details (such as stack traces, file paths, or database information) and SHALL log the full error details server-side.
2. IF a form submission fails due to a network error (no HTTP response received), THEN THE UI SHALL display an error message indicating that the request could not be completed due to a connectivity issue and SHALL provide a retry action that resubmits the same form data without requiring the user to re-enter it.
3. WHEN THE API returns HTTP 400 with field-specific validation messages, THE UI SHALL display each field's error message directly below its corresponding input field.
4. WHEN the user corrects a field that has a displayed validation error, THE UI SHALL remove that field's error message as soon as the field value changes.
5. WHEN THE API returns HTTP 401, 403, 404, or 500, THE UI SHALL display a dismissible error banner at the top of the current page that remains visible until the user explicitly closes it.
