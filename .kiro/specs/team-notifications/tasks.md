# Implementation Plan: Team Notifications

## Overview

This plan implements team collaboration and in-app notifications for TaskFlow. The work is divided into backend models, API routes, frontend API modules, UI components, pages, and integration. Each step builds incrementally on the previous — models first, then routes, then frontend API, then UI, then wiring.

## Tasks

- [x] 1. Create backend data models
  - [x] 1.1 Create Team and TeamMember models in `backend/models/team.py`
    - Define `Team` model with id, name, owner_id, created_at and `to_dict()` method
    - Define `TeamMember` model with id, team_id, user_id, role, joined_at, unique constraint on (team_id, user_id), and `to_dict()` method
    - Add relationships to User model (owned_teams, team_memberships)
    - _Requirements: 1.1, 1.2, 6.2_

  - [x] 1.2 Create Invitation model in `backend/models/invitation.py`
    - Define `InvitationStatus` enum (PENDING, ACCEPTED, DECLINED)
    - Define `Invitation` model with id, team_id, inviter_id, invitee_id (nullable), invitee_email, status, created_at, updated_at, and `to_dict()` method
    - Add relationships to Team, User (inviter/invitee)
    - _Requirements: 2.2, 2.3, 6.2, 6.3_

  - [x] 1.3 Create Notification model in `backend/models/notification.py`
    - Define `Notification` model with id, user_id, type, message, invitation_id, is_read, created_at, and `to_dict()` method
    - Add relationship to User and Invitation
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 1.4 Register new models in `backend/models/__init__.py`
    - Import Team, TeamMember, Invitation, Notification so `db.create_all()` picks them up
    - _Requirements: 1.1, 2.2, 3.1_

- [x] 2. Implement backend teams blueprint
  - [x] 2.1 Create `backend/routes/teams.py` with `teams_bp` blueprint
    - Implement `GET /teams/members` — returns confirmed members and pending invitations for the current user's team
    - Implement `POST /teams/invite` — validates email, checks for self-invite, checks for duplicate pending invite, creates team (implicit on first invite), creates Invitation, creates Notification if invitee is registered
    - Register blueprint in `backend/app.py`
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 7.1, 7.2_

  - [ ]* 2.2 Write unit tests for teams routes in `backend/tests/test_teams.py`
    - Test GET /teams/members returns empty list for new user
    - Test GET /teams/members returns confirmed members with name and email
    - Test GET /teams/members returns pending invitations separately
    - Test POST /teams/invite creates invitation for valid email (201)
    - Test POST /teams/invite rejects empty email (400)
    - Test POST /teams/invite rejects invalid email format (400)
    - Test POST /teams/invite rejects self-invitation (400)
    - Test POST /teams/invite rejects duplicate pending invitation (409)
    - Test POST /teams/invite creates notification for registered invitee
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.4, 2.5, 2.6, 2.7, 3.1_

- [x] 3. Implement backend invitations blueprint
  - [x] 3.1 Create `backend/routes/invitations.py` with `invitations_bp` blueprint
    - Implement `PUT /invitations/<id>/accept` — validates invitee identity, checks pending status, updates status to accepted, creates TeamMember record, marks notification as read
    - Implement `PUT /invitations/<id>/decline` — validates invitee identity, checks pending status, updates status to declined, marks notification as read
    - Register blueprint in `backend/app.py`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.3_

  - [ ]* 3.2 Write unit tests for invitations routes in `backend/tests/test_invitations.py`
    - Test accept updates status and creates team membership (200)
    - Test decline updates status (200)
    - Test rejects accept/decline by non-invitee (403)
    - Test returns 404 for non-existent invitation
    - Test rejects accept/decline for non-pending invitation (400)
    - _Requirements: 6.1, 6.2, 6.3, 6.6_

- [x] 4. Implement backend notifications blueprint
  - [x] 4.1 Create `backend/routes/notifications.py` with `notifications_bp` blueprint
    - Implement `GET /notifications` — returns all notifications for the authenticated user, ordered newest to oldest, including invitation_status
    - Implement `GET /notifications/unread-count` — returns count of unread notifications
    - Register blueprint in `backend/app.py`
    - _Requirements: 5.1, 5.2, 5.5, 3.3, 4.2, 4.3_

  - [ ]* 4.2 Write unit tests for notifications routes in `backend/tests/test_notifications.py`
    - Test returns notifications ordered newest to oldest
    - Test returns correct unread count
    - Test returns empty list when no notifications exist
    - Test includes invitation status in notification response
    - _Requirements: 5.1, 5.2, 5.5, 3.3_

- [x] 5. Checkpoint - Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Add frontend TypeScript types
  - [x] 6.1 Add team notification types to `frontend/src/types/index.ts`
    - Add `InvitationStatus`, `TeamMember`, `PendingInvitation`, `TeamMembersResponse`, `Notification`, `UnreadCountResponse` interfaces
    - _Requirements: 1.2, 2.3, 5.2, 3.3_

- [x] 7. Create frontend API modules
  - [x] 7.1 Create `frontend/src/api/teams.ts`
    - Implement `getTeamMembers(token)` — fetches GET /teams/members
    - Implement `sendInvite(token, email)` — posts POST /teams/invite
    - Follow existing NetworkError pattern from tasks.ts
    - _Requirements: 1.1, 2.1, 2.8_

  - [x] 7.2 Create `frontend/src/api/invitations.ts`
    - Implement `acceptInvitation(token, id)` — puts PUT /invitations/:id/accept
    - Implement `declineInvitation(token, id)` — puts PUT /invitations/:id/decline
    - Follow existing NetworkError pattern
    - _Requirements: 6.2, 6.3, 6.6_

  - [x] 7.3 Create `frontend/src/api/notifications.ts`
    - Implement `getNotifications(token)` — fetches GET /notifications
    - Implement `getUnreadCount(token)` — fetches GET /notifications/unread-count
    - Follow existing NetworkError pattern
    - _Requirements: 5.1, 3.3, 4.2_

  - [ ]* 7.4 Write unit tests for frontend API modules
    - Create `frontend/src/api/teams.test.ts` — test success and error paths for getTeamMembers, sendInvite
    - Create `frontend/src/api/invitations.test.ts` — test success and error paths for acceptInvitation, declineInvitation
    - Create `frontend/src/api/notifications.test.ts` — test success and error paths for getNotifications, getUnreadCount
    - _Requirements: 1.1, 2.1, 5.1, 6.2, 6.3_

- [x] 8. Implement frontend components and pages
  - [x] 8.1 Create `NotificationIcon` component in `frontend/src/components/NotificationIcon.tsx`
    - Create `NotificationIcon.tsx` with bell icon SVG
    - Create `NotificationIcon.module.css` with red badge styling
    - Accept unreadCount prop, show badge when count > 0
    - Navigate to /notifications on click using `useNavigate`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 8.2 Integrate NotificationIcon into `frontend/src/components/TopBar.tsx`
    - Import and render NotificationIcon to the left of the user avatar
    - Add 30-second polling interval for unread count using setInterval + getUnreadCount
    - Pass unreadCount state to NotificationIcon
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 8.3 Create TeamPage in `frontend/src/pages/TeamPage.tsx`
    - Create `TeamPage.tsx` with loading, error, and empty states
    - Create `TeamPage.module.css` with styling per design system
    - Display confirmed members list (full name, email)
    - Display pending invitations section with "Invite Sent" labels
    - Add invite form with email input and submit button
    - Handle validation errors (empty email, invalid format) inline
    - Display API error messages using ErrorBanner pattern
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.3, 2.4, 2.5, 2.8, 7.1, 7.2_

  - [x] 8.4 Create NotificationsPage in `frontend/src/pages/NotificationsPage.tsx`
    - Create `NotificationsPage.tsx` with loading, error, and empty states
    - Create `NotificationsPage.module.css` with styling per design system
    - Display notifications list ordered newest to oldest
    - Show inviter name and invitation message for each notification
    - Show Accept/Decline buttons for pending invitations
    - Replace buttons with "Accepted" or "Declined" label after action
    - Display error and retain buttons if accept/decline API call fails
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 8.5 Write unit tests for frontend components and pages
    - Create `frontend/src/components/NotificationIcon.test.tsx` — test badge display, click navigation, zero-count state
    - Create `frontend/src/pages/TeamPage.test.tsx` — test renders members, pending invitations, loading state, error state, invite form submission
    - Create `frontend/src/pages/NotificationsPage.test.tsx` — test renders notifications, accept/decline actions, empty state, loading state
    - _Requirements: 4.1, 4.2, 1.1, 1.3, 5.1, 5.5, 6.1_

- [x] 9. Wire routing and navigation
  - [x] 9.1 Update `frontend/src/App.tsx` to register new routes
    - Replace ComingSoon placeholder for `/team` with TeamPage component
    - Add `/notifications` route inside DashboardLayout
    - Import TeamPage and NotificationsPage
    - _Requirements: 1.1, 5.1, 4.4_

  - [x] 9.2 Update Sidebar navigation if needed
    - Verify `/team` nav item already exists (it does — "Team Members")
    - No changes needed unless Notifications page gets a sidebar entry
    - _Requirements: 1.1_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The design has a Correctness Properties section, but workspace rules mandate unit tests only — no property-based tests are included
- Backend uses in-memory SQLite for tests (existing pattern in conftest.py)
- Frontend tests use vitest with vi.stubGlobal('fetch', ...) for API mocking
- The existing `/team` route in App.tsx currently renders a ComingSoon placeholder — task 9.1 replaces it with the real TeamPage
- Implicit team creation happens inside POST /teams/invite (no separate team creation flow)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["1.4", "6.1"] },
    { "id": 2, "tasks": ["2.1", "3.1", "4.1"] },
    { "id": 3, "tasks": ["2.2", "3.2", "4.2", "7.1", "7.2", "7.3"] },
    { "id": 4, "tasks": ["7.4", "8.1"] },
    { "id": 5, "tasks": ["8.2", "8.3", "8.4"] },
    { "id": 6, "tasks": ["8.5", "9.1", "9.2"] }
  ]
}
```
