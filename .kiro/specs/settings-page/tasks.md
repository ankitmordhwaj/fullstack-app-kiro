# Implementation Plan: Settings Page

## Overview

Implement a Settings page with Profile and Appearance sections. The Profile section allows users to update their full name and email via a new backend endpoint. The Appearance section provides a light/dark theme toggle using CSS variables and localStorage persistence. Implementation spans backend (Python/Flask), frontend types, context providers, API layer, and the page component itself.

## Tasks

- [x] 1. Add types and extend AuthContext
  - [x] 1.1 Add Theme and Profile types to frontend/src/types/index.ts
    - Add `Theme` type (`'light' | 'dark'`)
    - Add `ThemeContextType` interface with `theme` and `setTheme`
    - Add `ProfileUpdatePayload` interface with `full_name` and `email`
    - Add `ProfileUpdateResponse` interface with `id`, `full_name`, `email`, `created_at`
    - Update `AuthContextType` to include `updateUser: (user: User) => void`
    - _Requirements: 1.1, 2.2, 5.1_

  - [x] 1.2 Add updateUser method to AuthContext
    - Add `updateUser` function that updates state and localStorage user entry
    - Ensure the provider value includes `updateUser`
    - _Requirements: 2.2_

- [x] 2. Implement ThemeContext provider
  - [x] 2.1 Create frontend/src/context/ThemeContext.tsx
    - Create `ThemeContext` with `createContext`
    - Implement `ThemeProvider` that reads initial theme from localStorage (default to 'light' if missing or invalid)
    - Use `useEffect` to set `data-theme` attribute on `document.documentElement` and persist to localStorage
    - Export `useTheme` hook
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 2.2 Write unit tests for ThemeContext
    - Test defaults to 'light' when no localStorage value
    - Test reads theme from localStorage on mount
    - Test discards invalid localStorage values
    - Test setTheme updates data-theme attribute and localStorage
    - _Requirements: 5.4, 5.5, 5.6_

- [x] 3. Add dark theme CSS variables
  - [x] 3.1 Add dark theme variable overrides to frontend/src/index.css
    - Add `[data-theme="dark"]` selector with dark background (#1A1A2E), surface (#2D2D44), border (#3D3D5C), text (#F0F4F8), muted text (#9CA3AF), sub text (#D1D5DB)
    - Add dark mode input/select/textarea overrides (background #2D2D44, color #F0F4F8, border #3D3D5C)
    - Add dark mode placeholder color overrides (#9CA3AF)
    - Maintain primary brand color (#00BCD4) unchanged
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

- [x] 4. Implement backend PUT /auth/profile endpoint
  - [x] 4.1 Add update_profile route to backend/routes/auth.py
    - Add `@auth_bp.route("/profile", methods=["PUT"])` with `@jwt_required()`
    - Get current user ID from JWT identity
    - Parse and validate `full_name` (non-empty, ≤255 chars) and `email` (valid format, ≤254 chars)
    - Check email uniqueness excluding current user
    - Update user fields, commit, return `user.to_dict()` with 200
    - Return 400 for validation errors, 409 for email conflict, 500 for DB errors
    - Ignore any `password` field in request body
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [ ]* 4.2 Write unit tests for PUT /auth/profile
    - Test success case: valid token and payload returns 200 with updated user
    - Test missing full_name returns 400
    - Test missing email returns 400
    - Test empty/whitespace full_name returns 400
    - Test full_name > 255 chars returns 400
    - Test invalid email format returns 400
    - Test email > 254 chars returns 400
    - Test email already taken by another user returns 409
    - Test user's own email is not a conflict (returns 200)
    - Test no JWT token returns 401
    - Test password field in body is ignored
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 5. Checkpoint - Ensure backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement profile API function
  - [x] 6.1 Create frontend/src/api/profile.ts
    - Implement `updateProfile(token: string, payload: ProfileUpdatePayload): Promise<ProfileUpdateResponse>`
    - Send PUT request to `${API_URL}/auth/profile` with Bearer token
    - Handle success (200), validation errors (400), conflict (409), and network errors
    - _Requirements: 2.1, 3.1_

  - [ ]* 6.2 Write unit tests for profile API
    - Test success path returns updated user
    - Test 400 error throws with field errors
    - Test 409 error throws with conflict message
    - Test network error throws NetworkError
    - _Requirements: 2.1, 2.3, 2.4_

- [x] 7. Implement SettingsPage component
  - [x] 7.1 Create frontend/src/pages/SettingsPage.module.css
    - Style the settings page layout: page title, card sections, form fields, theme toggle
    - Use design system tokens: 24px section margins, 16px card padding, 12px border-radius
    - Style the theme toggle as a segmented control with active state (Primary #00BCD4, white text)
    - Add focus indicators (2px solid #00BCD4, outline-offset 2px)
    - Ensure dark theme compatibility using CSS variables
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 4.3_

  - [x] 7.2 Create frontend/src/pages/SettingsPage.tsx
    - Render "Settings" page title (24px, font-weight 700)
    - Render Profile card with Full Name and Email inputs pre-filled from AuthContext
    - Implement client-side validation (non-empty name ≤255 chars, valid email ≤254 chars)
    - Show inline validation errors below fields
    - On submit, call `updateProfile`, then `updateUser` on success, show success message
    - Handle server errors (400 mapped to fields, 409 below email, 500 as general banner)
    - Disable submit button during loading
    - Render Appearance card with theme toggle (Light | Dark segmented control)
    - Theme toggle reads from and writes to ThemeContext
    - Accessible: aria labels, keyboard navigable, visible focus
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 4.1, 4.2, 4.3, 4.4, 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 7.3 Write unit tests for SettingsPage
    - Test renders profile form with user data pre-filled
    - Test shows validation error for empty full name
    - Test shows validation error for invalid email
    - Test disables button during submission
    - Test shows success message on successful update
    - Test shows server error inline
    - Test renders theme toggle reflecting current theme
    - Test theme toggle switches theme on click
    - _Requirements: 1.1, 1.2, 2.3, 2.5, 2.6, 2.7, 4.2, 5.1_

- [x] 8. Wire SettingsPage into App and add ThemeProvider
  - [x] 8.1 Update App.tsx to use SettingsPage and ThemeProvider
    - Import `SettingsPage` and replace `<ComingSoon title="Settings" />` with `<SettingsPage />`
    - Import `ThemeProvider` from context/ThemeContext
    - Wrap the app with `ThemeProvider` (inside BrowserRouter, outside AuthProvider)
    - _Requirements: 1.3, 7.1_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The project steering explicitly mandates unit tests only — no property-based tests
- CSS Modules are used for component styles (not Tailwind) per project conventions
- Native fetch API is used for all HTTP calls (no Axios)
- The ThemeProvider wraps outside AuthProvider since theme is independent of auth state

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "3.1", "4.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "4.2", "6.1"] },
    { "id": 2, "tasks": ["2.2", "6.2", "7.1"] },
    { "id": 3, "tasks": ["7.2"] },
    { "id": 4, "tasks": ["7.3", "8.1"] }
  ]
}
```
