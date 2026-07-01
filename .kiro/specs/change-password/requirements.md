# Requirements Document

## Introduction

The Change Password feature adds a new "Change Password" section to the existing Settings page, positioned as the third section after Profile and Appearance. It allows authenticated users to update their account password by verifying their current password and setting a new one that meets defined strength criteria. A real-time password strength indicator provides visual feedback as the user types the new password.

## Glossary

- **Settings_Page**: The page component rendered at the `/settings` route within the authenticated dashboard layout, containing Profile, Appearance, and Change Password sections.
- **Change_Password_Section**: The third card section on the Settings page that contains the form for changing the user's password.
- **Password_Strength_Indicator**: A visual component that evaluates and displays the strength level of the new password as the user types, using color-coded labels (Weak, Fair, Strong).
- **Password_API**: The backend REST API endpoint (`PUT /auth/password`) responsible for validating the current password and updating to the new password.
- **Auth_Context**: The existing React context that holds the current user's authentication token and user object.

## Requirements

### Requirement 1: Display Change Password Form

**User Story:** As an authenticated user, I want to see a Change Password section on the Settings page, so that I can update my account password.

#### Acceptance Criteria

1. THE Settings_Page SHALL render a Change_Password_Section as the third card section, positioned below the Appearance section.
2. THE Change_Password_Section SHALL display a section heading of "Change Password".
3. THE Change_Password_Section SHALL render three password input fields with visible labels: "Current Password", "New Password", and "Confirm New Password", each programmatically associated with its label via matching `for`/`id` attributes.
4. THE Change_Password_Section SHALL render a submit button labeled "Update Password" that is enabled when the page loads.
5. THE Change_Password_Section SHALL mask all password input values by default using input type "password".
6. THE Change_Password_Section SHALL display all three password input fields as empty (no pre-filled value) when the section is first rendered.
7. THE Change_Password_Section SHALL accept a maximum of 128 characters per password input field.

---

### Requirement 2: Validate New Password Requirements

**User Story:** As an authenticated user, I want to know the password requirements before submitting, so that I can set a valid new password on the first attempt.

#### Acceptance Criteria

1. WHEN the user submits the form with a new password shorter than 8 characters, THE Change_Password_Section SHALL display a validation error "Password must be at least 8 characters long" below the New Password field and SHALL NOT send a request to the Password_API.
2. WHEN the user submits the form with a new password that does not contain at least one uppercase letter, THE Change_Password_Section SHALL display a validation error "Password must contain at least one uppercase letter" below the New Password field and SHALL NOT send a request to the Password_API.
3. WHEN the user submits the form with a new password that does not contain at least one special character (one of !@#$%^&*()_+-=[]{}|;:',.<>?/`~"), THE Change_Password_Section SHALL display a validation error "Password must contain at least one special character" below the New Password field and SHALL NOT send a request to the Password_API.
4. WHEN the user submits the form with a "Confirm New Password" value that does not match the "New Password" value, THE Change_Password_Section SHALL display a validation error "Passwords do not match" below the Confirm New Password field and SHALL NOT send a request to the Password_API.
5. WHEN the user submits the form with an empty "Current Password" field, THE Change_Password_Section SHALL display a validation error "Current password is required" below the Current Password field and SHALL NOT send a request to the Password_API.
6. WHEN the user changes the value of a field that currently displays a validation error, THE Change_Password_Section SHALL clear the validation error for that specific field only, leaving validation errors on other fields unchanged.
7. WHEN the user submits the form with a new password that violates multiple validation rules simultaneously, THE Change_Password_Section SHALL display only the first applicable validation error for the New Password field, evaluated in this priority order: minimum length, uppercase letter, special character.
8. THE Change_Password_Section SHALL enforce a maximum password length of 128 characters on the "New Password" and "Confirm New Password" fields and SHALL NOT allow the user to enter more than 128 characters.

---

### Requirement 3: Password Strength Indicator

**User Story:** As an authenticated user, I want to see a visual indicator of my new password's strength as I type, so that I can choose a strong password.

#### Acceptance Criteria

1. WHEN the value of the "New Password" field changes (via typing, pasting, or clearing), THE Password_Strength_Indicator SHALL evaluate the password strength and display the indicator immediately below the "New Password" field.
2. THE Password_Strength_Indicator SHALL classify password strength into three levels: "Weak" (red, #EF4444), "Fair" (amber, #F59E0B), and "Strong" (green, #10B981).
3. THE Password_Strength_Indicator SHALL display a colored bar that fills proportionally to the strength level: one-third width for Weak, two-thirds width for Fair, and full width for Strong, along with a text label showing the current strength level name.
4. THE Password_Strength_Indicator SHALL classify a password as "Weak" when the password meets fewer than two of these criteria: length of 8 or more characters, contains at least one uppercase letter, contains at least one special character, contains at least one digit.
5. THE Password_Strength_Indicator SHALL classify a password as "Fair" when the password meets exactly two or three of these criteria: length of 8 or more characters, contains at least one uppercase letter, contains at least one special character, contains at least one digit.
6. THE Password_Strength_Indicator SHALL classify a password as "Strong" when the password meets all four criteria: length of 8 or more characters, contains at least one uppercase letter, contains at least one special character, contains at least one digit.
7. WHEN the "New Password" field is empty, THE Password_Strength_Indicator SHALL not be rendered in the DOM.
8. WHEN the "New Password" field contains one or more characters meeting the "Weak" classification, THE Password_Strength_Indicator SHALL transition from hidden to visible without requiring a page reload or additional user action beyond the input change.

---

### Requirement 4: Submit Password Change

**User Story:** As an authenticated user, I want to submit my password change after entering valid data, so that my account password is updated securely.

#### Acceptance Criteria

1. WHEN the user submits the form with valid current password, valid new password (meeting all requirements), and matching confirmation, THE Change_Password_Section SHALL send a PUT request to the Password_API with the current password and new password, authenticated with the JWT token from Auth_Context.
2. WHEN the Password_API returns a successful response (HTTP 200), THE Change_Password_Section SHALL display a success message "Password updated successfully" above the form using a status live region, SHALL clear all form fields, and SHALL hide the Password_Strength_Indicator.
3. IF the Password_API returns HTTP 401 indicating the current password is incorrect, THEN THE Change_Password_Section SHALL display an error message "Current password is incorrect" below the Current Password field.
4. IF the Password_API returns HTTP 400 indicating new password validation failure, THEN THE Change_Password_Section SHALL display the validation error message returned by the API below the New Password field.
5. IF the Password_API returns a network error or HTTP 500 server error, THEN THE Change_Password_Section SHALL display a general error message "An unexpected error occurred. Please try again." above the form and SHALL preserve all entered form data.
6. WHILE the password change request is in progress, THE Change_Password_Section SHALL disable the submit button and display "Updating..." as the button text.
7. WHEN the Password_API returns any response (success or error), THE Change_Password_Section SHALL re-enable the submit button and restore the button text to "Update Password" within 1 second of receiving the response.
8. IF the request to the Password_API does not receive a response within 30 seconds, THEN THE Change_Password_Section SHALL treat it as a network error, display the general error message "An unexpected error occurred. Please try again." above the form, and SHALL re-enable the submit button.

---

### Requirement 5: Backend Password Change Endpoint

**User Story:** As a developer, I want a secure API endpoint for changing passwords, so that the frontend can update user passwords with proper verification.

#### Acceptance Criteria

1. WHEN a PUT request is received at `/auth/password` with a valid JWT token and a request body containing `current_password` and `new_password` fields, THE Password_API SHALL verify the current password against the stored hash and, if valid, hash the new password and update the user's password in the database, returning HTTP 200 with a JSON body containing a `message` field indicating the password was changed successfully.
2. IF the request body is missing the `current_password` or `new_password` field, THEN THE Password_API SHALL return HTTP 400 with a JSON body containing an `errors` object where each key is the missing field name and each value describes that the field is required.
3. IF the `current_password` does not match the user's stored password hash, THEN THE Password_API SHALL return HTTP 401 with an error message "Current password is incorrect."
4. IF the `new_password` is shorter than 8 characters or longer than 128 characters, THEN THE Password_API SHALL return HTTP 400 with a validation error indicating the length requirement (minimum 8, maximum 128 characters).
5. IF the `new_password` does not contain at least one uppercase letter (A-Z), THEN THE Password_API SHALL return HTTP 400 with a validation error indicating the uppercase letter requirement.
6. IF the `new_password` does not contain at least one special character from the set `!@#$%^&*()_+-=[]{}|;:'",.<>?/\`~`, THEN THE Password_API SHALL return HTTP 400 with a validation error indicating the special character requirement.
7. IF the JWT token is missing or invalid, THEN THE Password_API SHALL return HTTP 401 with an error message indicating unauthorized access.
8. IF a database error occurs during the password update, THEN THE Password_API SHALL roll back the transaction, return HTTP 500 with a generic error message, and SHALL NOT persist partial changes.
9. THE Password_API SHALL hash the new password using Werkzeug's `generate_password_hash` with the pbkdf2:sha256 method before storing.
10. IF all validation rules (minimum length, maximum length, uppercase letter, special character) are violated simultaneously, THEN THE Password_API SHALL return HTTP 400 with a single validation error for the first failing rule evaluated in order: length, uppercase, special character.

---

### Requirement 6: Accessibility and Keyboard Navigation

**User Story:** As a user who relies on keyboard navigation or assistive technologies, I want the Change Password section to be fully accessible, so that I can change my password without barriers.

#### Acceptance Criteria

1. THE Change_Password_Section SHALL associate each input field (Current Password, New Password, Confirm New Password) with a visible label element using the HTML `for` attribute matching the input's `id`.
2. WHEN a validation error is displayed for a field, THE Change_Password_Section SHALL set `aria-invalid="true"` on that field and associate the error message element using `aria-describedby` referencing the error element's `id`.
3. WHEN a validation error is cleared from a field, THE Change_Password_Section SHALL remove the `aria-invalid` attribute (or set it to "false") and remove the `aria-describedby` reference to the error message element.
4. WHEN a success message is displayed, THE Change_Password_Section SHALL announce it to screen readers using an ARIA live region with `role="status"`.
5. WHEN an error message (general or field-level) is displayed, THE Change_Password_Section SHALL announce it to screen readers using an ARIA live region with `role="alert"`.
6. THE Change_Password_Section SHALL support keyboard navigation in a logical tab order: Current Password field, New Password field, Confirm New Password field, then the Update Password button, using Tab to move forward and Shift+Tab to move backward.
7. THE Change_Password_Section SHALL display visible focus indicators (2px solid #00BCD4, outline-offset 2px) on all interactive elements (input fields and the submit button) when they receive keyboard focus.
8. THE Password_Strength_Indicator SHALL have an `aria-label` that communicates the current strength level to screen readers (e.g., "Password strength: Strong") and SHALL use `aria-live="polite"` so that screen readers announce strength level changes as the user types.
