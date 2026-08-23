# Requirements Document

## Introduction

This feature enhances the existing team management capabilities in TaskFlow by adding the ability to remove team members, cancel pending invitations, and automatically deliver pending invitations to users upon registration. Currently, once a member is added or an invitation is sent, there is no way to reverse those actions. Additionally, invitations sent to unregistered email addresses remain permanently pending because the invitee never receives a notification after account creation.

## Glossary

- **Team_Owner**: The user who created the team (role = "owner" in the TeamMember table).
- **Team_Member**: A user who has accepted an invitation and belongs to a team (role = "member" in the TeamMember table).
- **Inviter**: The authenticated user who sends a team invitation.
- **Invitee**: The user (registered or unregistered) who is the target of a team invitation.
- **Pending_Invitation**: An Invitation record with status = "pending" that has not been accepted, declined, or cancelled.
- **Invitation_Service**: The backend subsystem responsible for creating, cancelling, and delivering team invitations.
- **Team_Service**: The backend subsystem responsible for managing team membership (adding and removing members).
- **Notification_Service**: The backend subsystem responsible for creating and delivering user notifications.
- **Registration_Service**: The backend subsystem that handles new user account creation.

## Requirements

### Requirement 1: Remove Team Member

**User Story:** As a team owner, I want to remove a member from my team, so that I can manage team composition and revoke access for users who should no longer be part of the team.

#### Acceptance Criteria

1. WHEN the authenticated Team_Owner sends a request specifying the team_id and the user_id of the Team_Member to remove, THE Team_Service SHALL delete the TeamMember record for that user from the specified team.
2. WHEN a Team_Member is successfully removed, THE Team_Service SHALL return HTTP status 200 with a JSON response containing a confirmation message.
3. IF a non-owner user attempts to remove a Team_Member, THEN THE Team_Service SHALL reject the request with HTTP status 403 and an error message indicating insufficient permissions.
4. IF the specified user_id does not correspond to an existing member of the specified team, THEN THE Team_Service SHALL return HTTP status 404 with an error message indicating the member was not found.
5. IF the Team_Owner attempts to remove themselves from the team, THEN THE Team_Service SHALL reject the request with HTTP status 400 and an error message indicating the owner cannot be removed.
6. WHEN a Team_Member is successfully removed, THE Notification_Service SHALL create a notification of type "team_removal" for the removed user informing them they have been removed from the team.
7. IF a database error occurs during the removal operation, THEN THE Team_Service SHALL roll back any partial changes and return HTTP status 500 with an error message indicating an unexpected error occurred.

### Requirement 2: Cancel Pending Invitation

**User Story:** As an inviter, I want to cancel a pending invitation I sent, so that I can revoke invitations that were sent by mistake or are no longer needed.

#### Acceptance Criteria

1. WHEN the authenticated Inviter sends a request specifying the invitation_id to cancel, THE Invitation_Service SHALL update the invitation status from "pending" to "cancelled".
2. WHEN an invitation is successfully cancelled, THE Invitation_Service SHALL return HTTP status 200 with a JSON response containing the invitation ID and updated status.
3. IF a user who is not the original Inviter attempts to cancel an invitation, THEN THE Invitation_Service SHALL reject the request with HTTP status 403 and an error message indicating insufficient permissions.
4. IF the specified invitation_id does not correspond to an existing invitation, THEN THE Invitation_Service SHALL return HTTP status 404 with an error message indicating the invitation was not found.
5. IF the invitation is not in "pending" status, THEN THE Invitation_Service SHALL return HTTP status 400 with an error message indicating only pending invitations can be cancelled.
6. WHEN an invitation is cancelled AND the Invitee is a registered user with an existing notification for this invitation, THE Notification_Service SHALL mark the associated invitation notification as read.
7. IF a database error occurs during the cancellation operation, THEN THE Invitation_Service SHALL roll back any partial changes and return HTTP status 500 with an error message indicating an unexpected error occurred.

### Requirement 3: Deliver Pending Invitations on User Registration

**User Story:** As a newly registered user, I want to automatically receive any pending team invitations addressed to my email, so that I can see and respond to invitations that were sent before I created my account.

#### Acceptance Criteria

1. WHEN a new user completes registration, THE Registration_Service SHALL query all Pending_Invitations where the invitee_email matches the new user's email address using case-insensitive comparison and the invitation status is "pending".
2. WHEN pending invitations are found for the newly registered user, THE Registration_Service SHALL update each matching invitation's invitee_id field to reference the new user's ID.
3. WHEN pending invitations are linked to the newly registered user, THE Notification_Service SHALL create one notification per invitation with type "team_invitation" and a message indicating the team name and inviter, linked via the notification's invitation_id field.
4. IF no pending invitations exist for the newly registered user's email, THEN THE Registration_Service SHALL complete registration without creating invitation-related notifications.
5. THE Registration_Service SHALL process all matching pending invitations, notification creation, and user creation within the same database transaction to maintain data consistency.
6. IF the database transaction fails during pending invitation processing or notification creation, THEN THE Registration_Service SHALL roll back the entire transaction including user creation and return an error response indicating that registration could not be completed.

### Requirement 4: Frontend — Remove Member UI

**User Story:** As a team owner, I want to see a remove button next to each team member in the members list, so that I can easily remove members from the team.

#### Acceptance Criteria

1. WHILE the authenticated user is the Team_Owner, THE Team_Members_Page SHALL display a remove action control next to each team member whose role is "member" (not "owner"), with an accessible label indicating the remove action for that specific member.
2. WHEN the Team_Owner clicks the remove action for a Team_Member, THE Team_Members_Page SHALL display a confirmation dialog that identifies the member being removed by name, and provides both a confirm and a cancel option.
3. WHEN the Team_Owner confirms the removal in the dialog, THE Team_Members_Page SHALL disable the confirm button, send the remove request to the backend, and upon success remove the member from the displayed members list without requiring a full page reload.
4. IF the remove request fails, THEN THE Team_Members_Page SHALL display a dismissible error message indicating the removal was unsuccessful, and SHALL preserve the members list in its current state.
5. WHILE the authenticated user is a regular Team_Member (not owner), THE Team_Members_Page SHALL not render the remove action controls for any member in the list.

### Requirement 5: Frontend — Cancel Invitation UI

**User Story:** As an inviter, I want to see a cancel button next to each pending invitation, so that I can revoke invitations that are no longer needed.

#### Acceptance Criteria

1. THE Team_Members_Page SHALL display a cancel action control next to each Pending_Invitation in the pending invitations list.
2. WHEN the user clicks the cancel action for a Pending_Invitation, THE Team_Members_Page SHALL display a confirmation dialog that identifies the invitation being cancelled (e.g., the invitee email) and provides both a confirm and a dismiss option, where selecting dismiss closes the dialog without sending a cancel request.
3. WHEN the user confirms the cancellation in the dialog, THE Team_Members_Page SHALL disable the cancel action control for that invitation, send the cancel request to the backend, and remove the invitation from the pending list upon receiving a success response.
4. IF the cancel request fails, THEN THE Team_Members_Page SHALL re-enable the cancel action control and display an error message indicating that the cancellation failed, visible until the user dismisses it or initiates another action.
5. WHILE a cancel request is in-flight for a Pending_Invitation, THE Team_Members_Page SHALL prevent additional cancel requests for that same invitation.
