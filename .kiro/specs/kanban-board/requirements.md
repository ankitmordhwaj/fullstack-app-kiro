# Requirements Document

## Introduction

This feature adds a Kanban Board view to TaskFlow, providing a visual, column-based interface for managing tickets. The board allows authenticated users to create tickets, assign them to team members, drag-and-drop tickets between status columns, and manage ticket lifecycle. The kanban board extends the existing task management system by introducing team-scoped tickets with assignee support, distinct from the personal tasks already in the system.

## Glossary

- **Board**: The visual kanban interface consisting of multiple columns representing workflow stages.
- **Column**: A vertical lane on the Board representing a ticket status (To Do, In Progress, Done).
- **Ticket**: A work item displayed as a card on the Board, containing a title, description, priority, status, and assignee.
- **Assignee**: A team member to whom a Ticket is assigned for completion.
- **Team_Member**: A user who belongs to the authenticated user's team, available for ticket assignment.
- **Kanban_API**: The backend REST API endpoints that handle ticket CRUD operations and board data retrieval.
- **Board_View**: The frontend React component that renders the kanban board with columns and ticket cards.
- **Drag_Operation**: The user action of picking up a ticket card and dropping it into a different column to change its status.

## Requirements

### Requirement 1: Display Kanban Board

**User Story:** As an authenticated user, I want to see a kanban board with columns for each workflow stage, so that I can visually track the progress of tickets.

#### Acceptance Criteria

1. WHEN an authenticated user navigates to the board page, THE Board_View SHALL display three columns: "To Do" (PENDING), "In Progress" (INPROGRESS), and "Done" (COMPLETED).
2. THE Board_View SHALL display the count of tickets in each column header, showing "0" when a column contains no tickets.
3. WHEN the authenticated user has tasks, THE Board_View SHALL render each task as a card within the column matching the task's status.
4. THE Board_View SHALL display each ticket card with the ticket title, description truncated to a maximum of 2 lines with an ellipsis overflow indicator, priority badge (HIGH, MEDIUM, or LOW), and the assignee's avatar showing the current user's initials.
5. IF the user has no team, THEN THE Board_View SHALL display an empty board with the three columns and a prompt indicating how to create a team or invite members.
6. WHILE the Board_View is fetching task data from the API, THE Board_View SHALL display a loading indicator within the board content area.
7. IF the API request to fetch tasks fails, THEN THE Board_View SHALL display an error message indicating the failure and provide a way to retry the request.

### Requirement 2: Create Ticket

**User Story:** As an authenticated user, I want to create a new ticket on the kanban board, so that I can track new work items for my team.

#### Acceptance Criteria

1. WHEN the user clicks the "Add Ticket" button, THE Board_View SHALL display a ticket creation form with input fields for title, description, priority, and status.
2. THE Kanban_API SHALL require title (1-200 characters), description (1-1000 characters), priority (LOW, MEDIUM, or HIGH), and status (PENDING, INPROGRESS, or COMPLETED) fields for ticket creation.
3. WHEN a valid ticket creation request is submitted, THE Kanban_API SHALL create the ticket and return the created ticket object including a system-generated unique numeric identifier, with a 201 status code.
4. IF the status field is not explicitly provided in the creation request, THEN THE Kanban_API SHALL default the ticket status to PENDING and process the request as valid.
5. WHEN a ticket is successfully created, THE Board_View SHALL add the new ticket card to the column matching the ticket's status value without requiring a page reload.
6. IF required fields are missing or invalid, THEN THE Kanban_API SHALL return a 400 status code with a JSON response containing an "errors" object where each key is the invalid field name and its value is a human-readable error message describing the validation failure.
7. IF the ticket creation API request fails due to a network error or a server error (5xx status code), THEN THE Board_View SHALL display an error message indicating that ticket creation failed and SHALL preserve the user's form input so it is not lost.

### Requirement 3: Assign Ticket to Team Member

**User Story:** As an authenticated user, I want to assign a ticket to a team member, so that responsibilities are clearly communicated.

#### Acceptance Criteria

1. WHEN the user opens the create or edit ticket form, THE Board_View SHALL display a dropdown listing all Team_Members belonging to the user's current team, sorted alphabetically by name, showing each member's name and avatar.
2. THE Kanban_API SHALL accept an optional assignee_id field on both the create ticket and update ticket endpoints, where assignee_id references a valid Team_Member user ID or is null to indicate no assignee.
3. WHEN a valid assignee_id is provided in a create or update request, THE Kanban_API SHALL associate the ticket with the specified Team_Member and return the updated ticket object including the assignee_id and assignee name in the response.
4. IF an assignee_id references a user who is not a member of the team, THEN THE Kanban_API SHALL reject the request with a 400 status and an error message indicating the assignee must be a team member, without creating or modifying the ticket.
5. WHEN the user sets assignee_id to null or omits it on an update request, THE Kanban_API SHALL remove the current assignee from the ticket and persist the ticket as unassigned.
6. THE Board_View SHALL display the assigned Team_Member's avatar and name (truncated to 20 characters with ellipsis if longer) on the ticket card.
7. WHEN no assignee is associated with a ticket, THE Board_View SHALL display an "Unassigned" placeholder indicator on the ticket card in place of the avatar and name.

### Requirement 4: Drag and Drop Tickets Between Columns

**User Story:** As an authenticated user, I want to drag a ticket card from one column to another, so that I can quickly update its status.

#### Acceptance Criteria

1. WHEN the user initiates a Drag_Operation on a ticket card, THE Board_View SHALL apply a drag indicator to the card consisting of transform scale(1.02), an elevated box-shadow, and opacity 0.9, within 150 milliseconds of the drag start event.
2. WHILE a Drag_Operation is active, THE Board_View SHALL highlight all Columns other than the source Column with a dashed border and tinted background (as defined by the design system drop-target style) within 150 milliseconds of the card entering the Column boundary.
3. WHEN the user drops a ticket card onto a different Column, THE Board_View SHALL optimistically move the card to the top of the target Column and remove the drag visual indicators within 200 milliseconds of the drop event.
4. WHEN a ticket card is dropped onto a different Column, THE Kanban_API SHALL send a status update request to the backend within 10 seconds; the request SHALL set the ticket status field to the TaskStatus value corresponding to the target Column (PENDING for "To Do", INPROGRESS for "In Progress", COMPLETED for "Done").
5. IF the Kanban_API status update fails or does not respond within 10 seconds, THEN THE Board_View SHALL revert the card to its original Column and original position, and display an error notification indicating the status update failed, visible for at least 5 seconds.
6. WHEN a ticket card is dropped onto the same Column it originated from, THE Board_View SHALL return the card to its original position without making an API call.
7. WHEN the user activates a keyboard-accessible move action on a focused ticket card, THE Board_View SHALL allow the user to select a target Column via keyboard navigation and move the card to that Column, following the same optimistic update and error handling behavior as drag-and-drop.
8. IF a Drag_Operation is cancelled by the user (e.g., pressing Escape or releasing outside any Column), THEN THE Board_View SHALL return the card to its original Column and position and remove all drag visual indicators within 200 milliseconds.

### Requirement 5: Edit Ticket

**User Story:** As an authenticated user, I want to edit ticket details, so that I can keep ticket information accurate and up-to-date.

#### Acceptance Criteria

1. WHEN the user clicks the edit action on a ticket card, THE Board_View SHALL display an edit form pre-populated with the ticket's current title, description, priority, status, and assignee values.
2. THE Kanban_API SHALL accept updates to title (1-200 characters), description (1-1000 characters), priority (LOW, MEDIUM, or HIGH), status (PENDING, INPROGRESS, or COMPLETED), and assignee_id (valid Team_Member ID or null) fields via a PUT request to /tickets/<ticket_id>.
3. WHEN a valid update request is submitted, THE Kanban_API SHALL update the ticket, set the updated_at timestamp, and return the updated ticket data with a 200 status code.
4. WHEN the ticket status is changed via the edit form, THE Board_View SHALL move the ticket card to the corresponding Column without requiring a page reload.
5. IF validation errors occur during update, THEN THE Kanban_API SHALL return a 400 status code with field-level validation errors and THE Board_View SHALL display the errors inline next to the corresponding form fields.
6. IF the user attempts to edit a ticket they did not create, THEN THE Kanban_API SHALL return a 403 status code and THE Board_View SHALL display an error message indicating insufficient permissions.

### Requirement 6: Delete Ticket

**User Story:** As an authenticated user, I want to delete a ticket from the board, so that I can remove completed or irrelevant work items.

#### Acceptance Criteria

1. WHEN the user clicks the delete action on a ticket card, THE Board_View SHALL display a confirmation dialog that identifies the ticket being deleted by its title.
2. WHEN the user cancels the confirmation dialog, THE Board_View SHALL dismiss the dialog and leave the ticket card unchanged in its Column.
3. WHEN the user confirms deletion, THE Kanban_API SHALL permanently remove the ticket from the database and THE Board_View SHALL remove the ticket card from the Column and update the Column task count without requiring a page reload.
4. IF the authenticated user attempts to delete a ticket they do not own, THEN THE Kanban_API SHALL reject the request and THE Board_View SHALL display an error message indicating insufficient permissions.
5. IF deletion fails due to a network error or server error, THEN THE Board_View SHALL display an error message indicating the failure reason and retain the ticket card in its original Column.
6. IF the ticket no longer exists when deletion is confirmed, THEN THE Kanban_API SHALL return a not-found error and THE Board_View SHALL display an error message indicating the ticket was not found and remove the stale ticket card from the Column.

### Requirement 7: Filter Tickets by Assignee

**User Story:** As an authenticated user, I want to filter the board by assignee, so that I can focus on a specific team member's workload.

#### Acceptance Criteria

1. THE Board_View SHALL display a filter control that lists all Team_Members of the user's current team, allowing the user to select one or more Team_Members (up to 20 members displayed) as a filter, plus an "All Members" option.
2. WHEN an assignee filter is applied, THE Board_View SHALL display only tickets assigned to the selected Team_Members across all Columns within 1 second of selection.
3. WHEN the Board_View is first loaded or the user navigates to the board, THE Board_View SHALL default to the "All Members" filter option and display all tickets regardless of assignee.
4. THE Board_View SHALL update the ticket count in each Column header to reflect the number of tickets visible after the currently applied filter.
5. IF the Team_Member list fails to load, THEN THE Board_View SHALL display an error message indicating that the filter is unavailable and SHALL show all tickets unfiltered.

### Requirement 8: Team-Scoped Ticket Visibility

**User Story:** As an authenticated user, I want the board to show all tickets belonging to my team, so that I can see the overall team workload.

#### Acceptance Criteria

1. IF the authenticated user belongs to a team, THEN THE Kanban_API SHALL return all tickets created by any member of that team, including the authenticated user's own tickets.
2. IF the authenticated user belongs to a team, THEN THE Board_View SHALL display all tickets for that team grouped by status column, not just tickets created by the authenticated user.
3. IF the user does not belong to any team, THEN THE Kanban_API SHALL return only the user's own tickets.
4. WHEN a user creates a ticket, THE Kanban_API SHALL associate that ticket with the team the user belongs to at the time of creation.
5. IF the user belongs to multiple teams, THEN THE Kanban_API SHALL scope tickets to the team the user owns; if the user does not own a team, THE Kanban_API SHALL use the first team the user is a member of.
6. WHILE a user is viewing team-scoped tickets, THE Board_View SHALL allow the user to edit or delete only tickets that the user created, not tickets created by other team members.

### Requirement 9: Ticket Priority Visualization

**User Story:** As an authenticated user, I want to see ticket priority visually distinguished, so that I can quickly identify high-priority items.

#### Acceptance Criteria

1. THE Board_View SHALL display a colored priority badge on each ticket card using pill-style styling (font-size 10px, font-weight 500, border-radius 4px, padding 4px 8px): HIGH (background #FFECE1, text color #FF5C00), MEDIUM (background #E1F6FF, text color #2C62B4), LOW (background #CDF4DD, text color #188544).
2. THE Board_View SHALL display a colored left accent bar on each ticket card (position absolute, left -2px, top 45px, width 3px, height 50px, border-radius 9999px) based on the Column: To Do (blue #3B82F6), In Progress (amber #F59E0B), Done (green #10B981).
3. THE Board_View SHALL ensure priority badges meet a minimum contrast ratio of 4.5:1 between text color and background color as required by WCAG AA standards.

### Requirement 10: Board Loading and Error States

**User Story:** As an authenticated user, I want to see appropriate feedback while the board is loading or if an error occurs, so that I know the system status.

#### Acceptance Criteria

1. WHILE the Board_View is fetching ticket data, THE Board_View SHALL display a visible loading indicator in place of the board content within 100 milliseconds of the request being initiated.
2. IF the Kanban_API returns an error when fetching tickets, THEN THE Board_View SHALL display an error message indicating the failure reason and a retry button that re-initiates the fetch request when activated.
3. WHILE a ticket creation or update request is in-flight, THE Board_View SHALL disable the submit button to prevent duplicate submissions and re-enable it within 1 second of receiving a success or error response.
4. IF a ticket creation or update request fails, THEN THE Board_View SHALL preserve any previously loaded board data and display an error message indicating the failure.
5. WHEN the user activates the retry button after a fetch error, THE Board_View SHALL display the loading indicator and re-fetch the ticket data from the Kanban_API.
