---
inclusion: always
---

# Product Overview

## Product Name
TaskFlow — A Mini Kanban Board Application

## Purpose
TaskFlow is a full-stack web application that provides a mini kanban board for authenticated users to visually manage and track tasks across workflow stages. It is built as a workshop demonstration project for Kiro spec-driven development.

## Target Users
- Individual users who need a visual, column-based task tracker
- Workshop participants learning Kiro's spec-driven development workflow

## Core Features

### Authentication
- User registration with Full Name, Email, and Password (all mandatory)
- User login with email and password
- JWT-based session management
- Protected routes — unauthenticated users cannot access the board

### Kanban Board
- Three fixed columns representing task status: **To Do** (PENDING), **In Progress** (INPROGRESS), **Done** (COMPLETED)
- Tasks displayed as cards within their respective status column
- Drag-and-drop cards between columns to update task status
- Visual count of tasks per column shown in column header
- Cards display title, description snippet, and priority badge

### Task Management
- Create tasks with:
  - Title (mandatory)
  - Description (mandatory)
  - Priority: LOW, MEDIUM, HIGH
  - Status: PENDING, INPROGRESS, COMPLETED (Defaults to PENDING)
- Edit task details inline or via modal
- Delete tasks from the board
- Each task card shows title, truncated description, priority, and status clearly

### Board Interaction
- Drag a card from one column to another to change its status
- Optimistic UI update on drag — revert on API failure
- Smooth animations when cards move between columns
- Cards maintain order within a column (newest at top)

## Business Rules
- A user can only see their own tasks on the board — never another user's tasks
- All four task fields (title, description, priority, status) are required on creation
- Moving a card between columns updates only the status field via the existing update API
- Passwords must be stored securely (hashed, never plain text)
- Every API endpoint except registration and login requires authentication
- The three board columns (To Do, In Progress, Done) are fixed — users cannot create custom columns

## Out of Scope
- File attachments
- Custom columns or board configuration
- Card ordering/sorting persistence (within a column)
- Swimlanes or grouping by priority
- Email verification
- Password reset flow
- Admin panel

## Deployment Target
- Backend: AWS Lambda exposed via API Gateway
- Database: Amazon RDS Aurora PostgreSQL
- Frontend: Static hosting via S3
- Local development: Docker Compose with PostgreSQL container