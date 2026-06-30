---
inclusion: always
---

# Product Overview

## Product Name
TaskFlow — A Task Management Application

## Purpose
TaskFlow is a full-stack web application that allows authenticated users to create, manage, and track personal tasks. It is built as a workshop demonstration project for Kiro spec-driven development.

## Target Users
- Individual users who need a simple personal task tracker
- Workshop participants learning Kiro's spec-driven development workflow

## Core Features

### Authentication
- User registration with Full Name, Email, and Password (all mandatory)
- User login with email and password
- JWT-based session management
- Protected routes — unauthenticated users cannot access tasks

### Task Management
- Create tasks with:
  - Title (mandatory)
  - Description (mandatory)
  - Priority: LOW, MEDIUM, HIGH
  - Status: PENDING, INPROGRESS, COMPLETED (Defaults to PENDING)
- View all tasks belonging to the authenticated user in a list
- Each task displays title, description, priority, and status clearly
- User can edit and delete tasks owned.

## Business Rules
- A user can only see their own tasks — never another user's tasks
- All four task fields (title, description, priority, status) are required on creation
- Passwords must be stored securely (hashed, never plain text)
- Every API endpoint except registration and login requires authentication

## Out of Scope
- File attachments
- Team or shared tasks
- Email verification
- Password reset flow
- Admin panel

## Deployment Target
- Backend: AWS Lambda exposed via API Gateway
- Database: Amazon RDS Aurora PostgreSQL
- Frontend: Static hosting via S3
- Local development: Docker Compose with PostgreSQL container