# Implementation Plan: Kanban Board

## Overview

This plan implements a team-scoped Kanban Board feature for TaskFlow. It covers the backend Ticket model and REST API, frontend TypeScript types, API module, board components with HTML5 drag-and-drop, assignee filtering, and unit tests for both layers. Tasks are ordered so each step builds on the previous, with no orphaned code.

## Tasks

- [x] 1. Backend: Ticket model and route setup
  - [x] 1.1 Create the Ticket model
    - Create `backend/models/ticket.py` with the `Ticket` class using SQLAlchemy
    - Reuse `Priority` and `Status` enums from `models/task.py`
    - Define columns: id, title, description, priority, status, team_id, creator_id, assignee_id, created_at, updated_at
    - Define relationships to Team, User (creator), User (assignee)
    - Implement `to_dict()` method including `assignee_name`
    - Register the model in `backend/models/__init__.py`
    - _Requirements: 2.3, 3.3, 8.4_

  - [x] 1.2 Create the tickets blueprint with GET and POST routes
    - Create `backend/routes/tickets.py` with a `tickets_bp` Blueprint (url_prefix `/tickets`)
    - Implement `GET /tickets` — resolve user's team (owner first, then member, else own tickets only), return all team-scoped tickets
    - Implement `POST /tickets` — validate title, description, priority; default status to PENDING; validate assignee_id is a team member; associate ticket with team; return 201
    - Add input validation helper collecting all field errors into a dict
    - _Requirements: 1.1, 2.2, 2.3, 2.4, 2.6, 3.2, 3.4, 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 1.3 Add PUT, DELETE, and GET /tickets/members routes
    - Implement `PUT /tickets/<id>` — owner-only check (403), partial update support for status-only drag updates, validate fields, return 200
    - Implement `DELETE /tickets/<id>` — owner-only check (403), return 200 with message
    - Implement `GET /tickets/members` — return team members (id, full_name, email) for assignee dropdown
    - _Requirements: 4.4, 5.2, 5.3, 5.6, 6.3, 6.4, 6.6, 3.1, 7.1_

  - [x] 1.4 Register tickets blueprint in app.py
    - Import and register `tickets_bp` in `create_app()` alongside existing blueprints
    - Verify `db.create_all()` picks up the new Ticket table
    - _Requirements: 2.3, 8.1_

- [x] 2. Backend: Unit tests for tickets
  - [x]* 2.1 Write unit tests for ticket routes
    - Create `backend/tests/test_tickets.py`
    - Test GET /tickets returns team-scoped tickets and handles no-team user
    - Test POST /tickets creates ticket, validates fields, validates assignee membership, defaults status
    - Test PUT /tickets/<id> updates fields, rejects non-owner (403), returns 404 for missing
    - Test DELETE /tickets/<id> deletes owned ticket, rejects non-owner (403), returns 404
    - Test GET /tickets/members returns team members
    - Use in-memory SQLite via conftest fixtures
    - _Requirements: 2.2, 2.3, 2.6, 3.2, 3.4, 4.4, 5.2, 5.3, 5.6, 6.3, 6.4, 8.1, 8.3, 8.5, 8.6_

- [x] 3. Checkpoint - Backend verification
  - Ensure all backend tests pass with `pytest backend/tests/ -v`, ask the user if questions arise.

- [x] 4. Frontend: Types and API module
  - [x] 4.1 Add Ticket-related TypeScript types
    - Add `TicketPriority`, `TicketStatus`, `ColumnId`, `Ticket`, `TicketPayload`, `KanbanColumnDef`, and `TeamMemberInfo` interfaces/types to `frontend/src/types/index.ts`
    - _Requirements: 1.1, 1.4, 2.2, 3.1_

  - [x] 4.2 Create the tickets API module
    - Create `frontend/src/api/tickets.ts` with functions: `getTickets`, `createTicket`, `updateTicket`, `deleteTicket`, `getTeamMembers`
    - Use native `fetch` with `Authorization: Bearer` header pattern matching existing API modules
    - Throw on non-ok responses (consistent with existing error handling pattern)
    - _Requirements: 1.3, 2.3, 4.4, 5.3, 6.3, 7.1_

  - [ ]* 4.3 Write unit tests for tickets API module
    - Create `frontend/src/api/tickets.test.ts`
    - Test success and error paths for each API function using `vi.stubGlobal('fetch', ...)`
    - _Requirements: 2.3, 2.7, 5.3, 6.3_

- [x] 5. Frontend: Board components
  - [x] 5.1 Create KanbanCard component
    - Create `frontend/src/components/board/KanbanCard.tsx` and `KanbanCard.module.css`
    - Render ticket title, truncated description (2 lines), priority badge with correct colors, assignee name/avatar, left accent bar by column
    - Set `draggable={true}`, handle `onDragStart` (setData with ticket ID, apply drag styles), `onDragEnd` (remove styles)
    - Show edit/delete action buttons on hover
    - Include keyboard-accessible "Move to..." button for status change
    - _Requirements: 1.4, 4.1, 4.8, 9.1, 9.2, 3.6, 3.7_

  - [x] 5.2 Create KanbanColumn component
    - Create `frontend/src/components/board/KanbanColumn.tsx` and `KanbanColumn.module.css`
    - Render column header with title and ticket count
    - Handle `onDragOver` (preventDefault), `onDragEnter`/`onDragLeave` (toggle drop-target highlight), `onDrop` (extract ticket ID, call parent handler)
    - Render list of KanbanCard components
    - _Requirements: 1.1, 1.2, 4.2, 4.6_

  - [x] 5.3 Create KanbanBoard component
    - Create `frontend/src/components/board/KanbanBoard.tsx` and `KanbanBoard.module.css`
    - Accept tickets array and callbacks as props
    - Group tickets by status into three KanbanColumn components (PENDING, INPROGRESS, COMPLETED)
    - Pass `onDrop`, `onEdit`, `onDelete` callbacks down to columns/cards
    - _Requirements: 1.1, 1.3, 4.3_

  - [x] 5.4 Create TicketForm modal component
    - Create `frontend/src/components/board/TicketForm.tsx` and `TicketForm.module.css`
    - Support create mode (empty form) and edit mode (pre-filled with ticket data)
    - Fields: title, description, priority dropdown, status dropdown, assignee dropdown (from team members)
    - Inline validation error display, disable submit while in-flight
    - _Requirements: 2.1, 2.5, 2.7, 3.1, 5.1, 5.5, 10.3_

  - [x] 5.5 Create AssigneeFilter component
    - Create `frontend/src/components/board/AssigneeFilter.tsx` and `AssigneeFilter.module.css`
    - Render multi-select list of team members with "All Members" default option
    - Call parent callback on selection change with selected assignee IDs
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 6. Frontend: BoardPage integration
  - [x] 6.1 Create BoardPage with state management and drag-and-drop logic
    - Create `frontend/src/pages/BoardPage.tsx` and `BoardPage.module.css`
    - Fetch tickets and team members on mount using auth token
    - Manage state: tickets, filteredTickets, selectedAssignees, loading, error, formOpen, editingTicket
    - Implement `handleDrop` with optimistic update: move card in state immediately, fire PUT API call, revert on failure with error notification
    - Implement create, update, delete handlers with proper error handling
    - Apply assignee filter to tickets before passing to KanbanBoard
    - Render loading indicator, error state with retry, and the board
    - Detect same-column drops and ignore them (no API call)
    - _Requirements: 1.1, 1.6, 1.7, 4.3, 4.4, 4.5, 4.6, 5.4, 6.1, 6.2, 6.3, 6.5, 7.2, 7.3, 7.4, 8.2, 8.6, 10.1, 10.2, 10.4, 10.5_

  - [x] 6.2 Add board route to App.tsx
    - Import BoardPage and add `/board` route inside the DashboardLayout protected route group
    - _Requirements: 1.1_

  - [x] 6.3 Add Board navigation link to sidebar
    - Add "Board" nav item to the DashboardLayout sidebar linking to `/board`
    - _Requirements: 1.1_

- [x] 7. Checkpoint - Frontend build verification
  - Ensure the frontend builds without errors (`npm run build` in frontend/), ask the user if questions arise.

- [x] 8. Frontend: Unit tests for board components
  - [x] 8.1 Write unit tests for KanbanCard
    - Create `frontend/src/components/board/KanbanCard.test.tsx`
    - Test renders title, description, priority badge, assignee; test drag events fire; test edit/delete actions
    - _Requirements: 1.4, 4.1, 9.1, 9.2_

  - [x] 8.2 Write unit tests for KanbanColumn
    - Create `frontend/src/components/board/KanbanColumn.test.tsx`
    - Test renders ticket count in header, renders cards, applies drop-target styles
    - _Requirements: 1.2, 4.2_

  - [x] 8.3 Write unit tests for KanbanBoard
    - Create `frontend/src/components/board/KanbanBoard.test.tsx`
    - Test renders three columns, groups tickets by status, handles empty state
    - _Requirements: 1.1, 1.3_

  - [x] 8.4 Write unit tests for TicketForm
    - Create `frontend/src/components/board/TicketForm.test.tsx`
    - Test create mode renders empty, edit mode pre-fills, validates required fields, displays API errors
    - _Requirements: 2.1, 5.1, 5.5, 10.3_

  - [x] 8.5 Write unit tests for AssigneeFilter
    - Create `frontend/src/components/board/AssigneeFilter.test.tsx`
    - Test renders member list, applies filter on selection, defaults to all
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 8.6 Write unit tests for BoardPage
    - Create `frontend/src/pages/BoardPage.test.tsx`
    - Test loading state, error state with retry, successful data load, drag-and-drop updates status optimistically and reverts on failure
    - _Requirements: 1.6, 1.7, 4.3, 4.5, 10.1, 10.2, 10.4, 10.5_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Run `pytest backend/tests/ -v` and `npm run test` in frontend/. Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- No property-based tests — unit tests only, as specified by project conventions
- CSS Modules used for all component styling (project convention)
- HTML5 Drag and Drop API used natively — no external DnD library
- Optimistic updates with revert-on-failure for drag-and-drop status changes

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "4.1"] },
    { "id": 1, "tasks": ["1.2", "4.2"] },
    { "id": 2, "tasks": ["1.3", "4.3"] },
    { "id": 3, "tasks": ["1.4", "5.1"] },
    { "id": 4, "tasks": ["2.1", "5.2", "5.5"] },
    { "id": 5, "tasks": ["5.3", "5.4"] },
    { "id": 6, "tasks": ["6.1"] },
    { "id": 7, "tasks": ["6.2", "6.3"] },
    { "id": 8, "tasks": ["8.1", "8.2", "8.3", "8.4", "8.5"] },
    { "id": 9, "tasks": ["8.6"] }
  ]
}
```
