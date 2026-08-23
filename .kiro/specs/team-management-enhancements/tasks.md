# Implementation Plan: Team Management Enhancements

## Overview

This plan implements five capabilities for the team management feature: backend endpoints for removing members and cancelling invitations, enhanced registration to auto-link pending invitations, and frontend UI for remove and cancel actions. Each task builds incrementally on existing patterns (Flask blueprints, SQLAlchemy models, ConfirmDialog component, native fetch API layer).

## Tasks

- [x] 1. Update Invitation model and add backend remove member endpoint
  - [x] 1.1 Add CANCELLED status to InvitationStatus enum
    - In `backend/models/invitation.py`, add `CANCELLED = "cancelled"` to the `InvitationStatus` enum
    - This is a prerequisite for the cancel invitation endpoint
    - _Requirements: 2.1_

  - [x] 1.2 Implement DELETE /teams/members/<user_id> endpoint
    - In `backend/routes/teams.py`, add a new route `@teams_bp.route("/members/<int:user_id>", methods=["DELETE"])`
    - Require JWT authentication via `@jwt_required()`
    - Look up the current user's team (where they are owner)
    - Validate: current user is team owner (403 if not)
    - Validate: target user_id is not the owner themselves (400 if so)
    - Validate: target user_id is a member of the team (404 if not)
    - Delete the `TeamMember` record for the target user
    - Create a `Notification` with type `"team_removal"` and message `"You have been removed from {team_name}."` for the removed user
    - Wrap in try/except with `db.session.rollback()` on failure, return 500
    - Return `{"message": "Member removed successfully."}` with status 200
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x]* 1.3 Write unit tests for DELETE /teams/members/<user_id>
    - Create `backend/tests/test_remove_member.py`
    - Test success: owner removes a member → 200, member record deleted, notification created
    - Test 403: non-owner attempts removal
    - Test 400: owner tries to remove themselves
    - Test 404: target user is not a member
    - Test 500: mock db.session.commit raising exception → rollback and 500 response
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 2. Implement cancel invitation endpoint
  - [x] 2.1 Implement PUT /invitations/<invitation_id>/cancel endpoint
    - In `backend/routes/invitations.py`, add a new route `@invitations_bp.route("/<int:invitation_id>/cancel", methods=["PUT"])`
    - Require JWT authentication via `@jwt_required()`
    - Look up the invitation by ID (404 if not found)
    - Validate: current user is the `inviter_id` on the invitation (403 if not)
    - Validate: invitation status is `PENDING` (400 if not)
    - Update invitation status to `InvitationStatus.CANCELLED`
    - If a notification exists for this invitation (`Notification.query.filter_by(invitation_id=invitation.id).first()`), set `is_read = True`
    - Wrap in try/except with `db.session.rollback()` on failure, return 500
    - Return `{"id": invitation.id, "status": "cancelled"}` with status 200
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x]* 2.2 Write unit tests for PUT /invitations/<invitation_id>/cancel
    - Create `backend/tests/test_cancel_invitation.py`
    - Test success: inviter cancels pending invitation → 200, status updated, notification marked read
    - Test 403: non-inviter attempts cancellation
    - Test 404: invitation does not exist
    - Test 400: invitation is not pending (already accepted/declined/cancelled)
    - Test 500: mock db.session.commit raising exception → rollback and 500
    - Test: cancellation when no notification exists (should still succeed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 3. Checkpoint - Ensure backend removal and cancellation tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Enhance registration to deliver pending invitations
  - [x] 4.1 Enhance POST /auth/register to auto-link pending invitations
    - In `backend/routes/auth.py`, after the user is created and added to the session (but before commit):
    - Import `Invitation`, `InvitationStatus`, and `Notification` models
    - Query `Invitation.query.filter(db.func.lower(Invitation.invitee_email) == email_lower, Invitation.status == InvitationStatus.PENDING).all()`
    - For each matching invitation: set `invitation.invitee_id = user.id`
    - For each matching invitation: create a `Notification` with `user_id=user.id`, `type="team_invitation"`, `message=f"{inviter.full_name} invited you to join their team."`, `invitation_id=invitation.id`
    - All within the same transaction (single `db.session.commit()`) — if anything fails, the entire registration rolls back
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x]* 4.2 Write unit tests for registration pending invitation delivery
    - Create `backend/tests/test_registration_invitations.py`
    - Test: registration with matching pending invitations → invitee_id linked, notifications created
    - Test: case-insensitive email matching (e.g., `User@Example.com` matches `user@example.com`)
    - Test: registration with no matching invitations → no notifications created, registration succeeds
    - Test: multiple pending invitations for same email → all linked, one notification per invitation
    - Test: transaction rollback on failure during invitation processing
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 5. Checkpoint - Ensure registration enhancement tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Add frontend API client functions
  - [x] 6.1 Add removeMember function to api/teams.ts
    - In `frontend/src/api/teams.ts`, add and export `removeMember(token: string, userId: number): Promise<{ message: string }>`
    - Use `fetch` with method `DELETE` to `${API_URL}/teams/members/${userId}`
    - Include `Authorization: Bearer ${token}` header
    - Handle `NetworkError` on `TypeError` (same pattern as existing functions)
    - Throw parsed error JSON if `!response.ok`
    - _Requirements: 4.3_

  - [x] 6.2 Add cancelInvitation function to api/invitations.ts
    - In `frontend/src/api/invitations.ts`, add and export `cancelInvitation(token: string, invitationId: number): Promise<{ id: number; status: string }>`
    - Use `fetch` with method `PUT` to `${API_URL}/invitations/${invitationId}/cancel`
    - Include `Authorization: Bearer ${token}` header
    - Handle `NetworkError` on `TypeError` (same pattern as existing functions)
    - Throw parsed error JSON if `!response.ok`
    - _Requirements: 5.3_

  - [x]* 6.3 Write unit tests for removeMember and cancelInvitation API functions
    - Add tests to `frontend/src/api/teams.test.ts` for `removeMember`: success (200), error (non-ok throws)
    - Add `frontend/src/api/invitations.test.ts` for `cancelInvitation`: success (200), error (non-ok throws)
    - Mock fetch with `vi.stubGlobal('fetch', ...)`
    - _Requirements: 4.3, 5.3_

- [x] 7. Implement frontend Remove Member UI
  - [x] 7.1 Add remove member controls and confirmation dialog to TeamPage
    - In `frontend/src/pages/TeamPage.tsx`:
    - Determine if the current user is the team owner by checking if any member has `role === "owner"` and their `id` matches the logged-in user's ID from AuthContext
    - If current user is owner: render a remove button (with accessible `aria-label` like `Remove {member.full_name}`) next to each member with `role === "member"`
    - Do NOT render remove button next to the owner row or for non-owner users
    - On remove button click: open `ConfirmDialog` with message identifying the member by name (e.g., "Are you sure you want to remove {member.full_name} from the team?")
    - On confirm: disable the confirm button, call `removeMember(token, member.id)`, on success remove member from `members` state
    - On failure: show a dismissible error banner
    - On cancel/dismiss in dialog: close dialog without action
    - Add necessary state: `removingMemberId`, `removeError`, `showRemoveDialog`, `memberToRemove`
    - Update `TeamPage.module.css` with styles for the remove button
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x]* 7.2 Write unit tests for remove member UI
    - Create `frontend/src/pages/TeamPage.test.tsx` (or add to existing)
    - Test: remove button renders only for owner viewing non-owner members
    - Test: remove button NOT rendered for non-owner users
    - Test: ConfirmDialog appears on remove click with correct member name
    - Test: member removed from list on successful API call
    - Test: error banner appears on failed removal
    - Test: dismiss dialog closes without action
    - Mock `getTeamMembers`, `removeMember` via `vi.stubGlobal('fetch', ...)`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 8. Implement frontend Cancel Invitation UI
  - [x] 8.1 Add cancel invitation controls and confirmation dialog to TeamPage
    - In `frontend/src/pages/TeamPage.tsx`:
    - Render a cancel button next to each pending invitation in the pending invitations list
    - On cancel button click: open `ConfirmDialog` with message identifying the invitee email (e.g., "Are you sure you want to cancel the invitation to {invitation.email}?")
    - On confirm: disable the cancel button for that invitation, call `cancelInvitation(token, invitation.id)`, on success remove invitation from `pendingInvitations` state
    - On failure: re-enable the cancel button, show a dismissible error message
    - While in-flight: button stays disabled to prevent duplicate requests
    - On dismiss in dialog: close dialog without sending a cancel request
    - Add necessary state: `cancellingInvitationId`, `cancelError`, `showCancelDialog`, `invitationToCancel`
    - Update `TeamPage.module.css` with styles for cancel button and loading state
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x]* 8.2 Write unit tests for cancel invitation UI
    - Add tests to `frontend/src/pages/TeamPage.test.tsx`
    - Test: cancel button renders for each pending invitation
    - Test: ConfirmDialog appears on cancel click with correct email
    - Test: invitation removed from list on successful cancel
    - Test: error message on failed cancel, button re-enabled
    - Test: cancel button disabled while request in-flight
    - Test: dismiss dialog closes without action
    - Mock `getTeamMembers`, `cancelInvitation` via `vi.stubGlobal('fetch', ...)`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- No property-based tests per project conventions — unit tests only
- Frontend uses CSS Modules (not Tailwind) and native fetch (not Axios) per project conventions
- The existing `ConfirmDialog` component is reused for both removal and cancellation confirmations

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["1.3", "2.2", "4.1"] },
    { "id": 3, "tasks": ["4.2", "6.1", "6.2"] },
    { "id": 4, "tasks": ["6.3", "7.1"] },
    { "id": 5, "tasks": ["7.2", "8.1"] },
    { "id": 6, "tasks": ["8.2"] }
  ]
}
```
