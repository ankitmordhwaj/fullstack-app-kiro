# Requirements Document

## Introduction

The Settings page provides authenticated TaskFlow users with the ability to manage their personal profile information and control the application's visual appearance. The page replaces the current "Coming Soon" placeholder at the `/settings` route and is organized into two sections: a Profile section for updating personal details (full name, email) and an Appearance section with a light/dark theme toggle.

## Glossary

- **Settings_Page**: The page component rendered at the `/settings` route within the authenticated dashboard layout, containing profile and appearance settings sections.
- **Profile_Section**: The area within the Settings page that displays editable fields for the user's full name and email address.
- **Theme_Toggle**: A toggle switch UI control that allows the user to switch between light mode and dark mode.
- **Theme_Context**: A React context provider that stores the current theme preference and exposes a function to switch themes.
- **User_API**: The backend REST API endpoint responsible for retrieving and updating user profile data.
- **Auth_Context**: The existing React context that holds the current user's authentication token and user object (id, full_name, email).

## Requirements

### Requirement 1: Display Profile Information

**User Story:** As an authenticated user, I want to see my current profile information on the Settings page, so that I can verify what details are stored.

#### Acceptance Criteria

1. WHEN the Settings_Page loads, THE Profile_Section SHALL display the current user's full_name and email from the Auth_Context as pre-filled values in editable form fields.
2. THE Profile_Section SHALL render labeled input fields for "Full Name" and "Email" with the current values from Auth_Context populated as default values.
3. WHEN the Auth_Context does not contain a user object (user is null), THE Settings_Page SHALL redirect the user to the "/login" route.

---

### Requirement 2: Update Profile Information

**User Story:** As an authenticated user, I want to update my full name and email address, so that I can keep my personal details accurate.

#### Acceptance Criteria

1. WHEN the user edits the full name or email field and submits the form, THE Profile_Section SHALL send a PUT request to the User_API with the updated fields and the authentication token.
2. WHEN the User_API returns a successful response, THE Profile_Section SHALL update the Auth_Context with the new user data and display a success message that remains visible until the user dismisses it or navigates away.
3. IF the User_API returns a validation error, THEN THE Profile_Section SHALL display the error message inline below the corresponding field.
4. IF the User_API returns a 409 conflict (email already taken), THEN THE Profile_Section SHALL display an error message below the email field indicating the email is already registered.
5. WHILE the update request is in progress, THE Profile_Section SHALL disable the submit button and show a loading indicator.
6. THE Profile_Section SHALL validate that the full name field is not empty and not whitespace-only, and does not exceed 255 characters, before submitting.
7. THE Profile_Section SHALL validate that the email field contains a valid email format and does not exceed 254 characters before submitting.
8. IF the User_API returns a non-validation error (network failure or server error), THEN THE Profile_Section SHALL display an error message indicating the update could not be completed and SHALL preserve the user's entered form data.
9. IF client-side validation fails, THEN THE Profile_Section SHALL display the corresponding validation error inline below the invalid field and SHALL NOT send a request to the User_API.

---

### Requirement 3: Backend Profile Update Endpoint

**User Story:** As a developer, I want a secure API endpoint for updating user profiles, so that the frontend can persist profile changes.

#### Acceptance Criteria

1. WHEN a PUT request is received at `/auth/profile` with a valid JWT token and a request body containing both full_name and email fields, THE User_API SHALL update the authenticated user's full_name and email fields in the database and return the updated user object (id, full_name, email, created_at) with HTTP status 200.
2. IF the request body is missing the full_name or email field, THEN THE User_API SHALL return HTTP 400 with an error message indicating which required fields are missing.
3. IF the request body contains a full_name that is empty or exceeds 255 characters, THEN THE User_API SHALL return HTTP 400 with a validation error indicating the full_name constraint.
4. IF the request body contains an email that does not match a valid email format or exceeds 254 characters, THEN THE User_API SHALL return HTTP 400 with a validation error indicating the email constraint.
5. IF the request body contains an email already used by another user, THEN THE User_API SHALL return HTTP 409 with an error indicating the email is taken.
6. IF the JWT token is missing or invalid, THEN THE User_API SHALL return HTTP 401 with an unauthorized error.
7. THE User_API SHALL ignore any password field present in the request body and SHALL NOT allow modification of the user's password through this endpoint.
8. IF a database error occurs during the update, THEN THE User_API SHALL return HTTP 500 with a generic error message and SHALL NOT persist partial changes.

---

### Requirement 4: Theme Toggle Display

**User Story:** As an authenticated user, I want to see a theme toggle switch on the Settings page, so that I can choose between light and dark mode.

#### Acceptance Criteria

1. THE Settings_Page SHALL render a Theme_Toggle in the Appearance section with labels for "Light" and "Dark" modes.
2. WHEN the Settings_Page loads, THE Theme_Toggle SHALL reflect the currently active theme from the Theme_Context.
3. THE Theme_Toggle SHALL visually distinguish the selected option from the unselected option by applying the active background color (Primary #00BCD4 with white text) to the currently selected mode and a neutral background to the unselected mode.
4. THE Theme_Toggle SHALL have an accessible name of "Theme" and use a role that conveys its purpose to assistive technologies, so that screen readers announce the current selection and available options.

---

### Requirement 5: Theme Switching

**User Story:** As an authenticated user, I want to toggle between light and dark themes, so that I can use the application with my preferred visual style.

#### Acceptance Criteria

1. WHEN the user activates the Theme_Toggle to dark mode, THE Theme_Context SHALL apply dark theme CSS variables to the application root element and set a `data-theme="dark"` attribute on the document root element within the same render cycle.
2. WHEN the user activates the Theme_Toggle to light mode, THE Theme_Context SHALL apply light theme CSS variables to the application root element and set a `data-theme="light"` attribute on the document root element within the same render cycle.
3. WHEN the theme changes, THE Theme_Context SHALL persist the selected theme value ("light" or "dark") to localStorage under the key "theme".
4. WHEN the application loads, THE Theme_Context SHALL read the stored theme from localStorage and apply it before the first visible render so that no flash of an incorrect theme occurs.
5. IF no theme preference is stored in localStorage, THEN THE Theme_Context SHALL default to "light" mode.
6. IF the value stored in localStorage under the key "theme" is not one of the valid values ("light" or "dark"), THEN THE Theme_Context SHALL discard the invalid value and default to "light" mode.

---

### Requirement 6: Dark Theme Color Definitions

**User Story:** As a user, I want dark mode to use appropriate contrasting colors, so that the interface remains readable and visually consistent.

#### Acceptance Criteria

1. WHILE dark mode is active, THE application SHALL use a dark page background (#1A1A2E) instead of the light background (#F0F4F8).
2. WHILE dark mode is active, THE application SHALL use a dark surface color (#2D2D44) for cards, sidebar, and content areas instead of white (#FFFFFF).
3. WHILE dark mode is active, THE application SHALL use light text color (#F0F4F8) for primary text instead of dark text (#1A1A2E).
4. WHILE dark mode is active, THE application SHALL use muted text color (#9CA3AF) for secondary text.
5. WHILE dark mode is active, THE application SHALL use a dark border color (#3D3D5C) instead of the light border (#E5E7EB).
6. WHILE dark mode is active, THE application SHALL maintain the primary brand color (#00BCD4) for accents, active states, and focus indicators.
7. WHILE dark mode is active, THE application SHALL render form inputs and textareas with a background of #2D2D44, text color of #F0F4F8, border color of #3D3D5C, and placeholder color of #9CA3AF.
8. WHILE dark mode is active, THE application SHALL ensure that all text and interactive elements meet a minimum contrast ratio of 4.5:1 against their immediate background color.

---

### Requirement 7: Settings Page Layout

**User Story:** As a user, I want the Settings page to be well-organized and consistent with the rest of the application, so that it feels integrated with the TaskFlow dashboard.

#### Acceptance Criteria

1. THE Settings_Page SHALL render within the existing DashboardLayout with sidebar and top bar visible.
2. THE Settings_Page SHALL display a "Settings" page title at the top of the content area using font-size 24px and font-weight 700.
3. THE Settings_Page SHALL organize content into visually distinct card sections with white background, 12px border-radius, and card shadow: one for "Profile" (displayed first) and one for "Appearance" (displayed second).
4. THE Settings_Page SHALL use the existing design system spacing (24px section margins, 16px internal card padding), typography (Inter font family), and border-radius tokens for all elements.
5. THE Settings_Page SHALL be fully navigable using keyboard controls, with visible focus indicators (2px solid #00BCD4, outline-offset 2px) on all interactive elements including inputs, buttons, and the theme toggle.
