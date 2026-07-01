# Implementation Plan: Change Password

## Overview

Add a "Change Password" feature to the Settings page. This includes a new backend endpoint (`PUT /auth/password`) for secure password updates, a frontend API function, a `PasswordStrengthIndicator` component, and a new Change Password section embedded directly in `SettingsPage.tsx`. All password inputs are validated client-side before submission and server-side as a security backstop.

## Tasks

- [x] 1. Implement backend PUT /auth/password endpoint
  - [x] 1.1 Add the change_password route to backend/routes/auth.py
    - Add `PUT /auth/password` route decorated with `@jwt_required()`
    - Get current user from JWT identity via `get_jwt_identity()`
    - Validate required fields (`current_password`, `new_password`), return 400 with `errors` object if missing
    - Validate new password strength in priority order: length (8–128), uppercase letter, special character; return 400 with first failing rule
    - Verify current password with `user.check_password()`; return 401 if incorrect
    - Hash new password with `user.set_password()` and commit; rollback on DB error returning 500
    - Return 200 with `{ "message": "Password changed successfully." }` on success
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10_

  - [x]* 1.2 Write unit tests for the change_password endpoint
    - Add tests to `backend/tests/test_auth.py` covering:
      - Successful password change (200)
      - Missing `current_password` field (400)
      - Missing `new_password` field (400)
      - New password too short / too long (400)
      - New password missing uppercase (400)
      - New password missing special char (400)
      - Multiple validation failures returns first in priority order (400)
      - Incorrect current password (401)
      - No JWT token (401)
      - Verify new password is hashed and old password no longer works
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.8, 5.9, 5.10_

- [x] 2. Implement frontend password API function
  - [x] 2.1 Create frontend/src/api/password.ts
    - Export `ChangePasswordPayload` interface (`current_password`, `new_password`)
    - Export `ChangePasswordResponse` interface (`message`)
    - Implement `changePassword(token, payload)` using native fetch with PUT method
    - Include AbortController with 30-second timeout
    - Throw `NetworkError` on TypeError or AbortError
    - Parse JSON response; throw error object with status on non-ok
    - _Requirements: 4.1, 4.5, 4.8_

  - [x]* 2.2 Write unit tests for the changePassword API function
    - Create `frontend/src/api/password.test.ts`
    - Test success path returns message
    - Test 401 error throws with status and error
    - Test 400 error throws with validation error
    - Test network error throws NetworkError
    - Test timeout (AbortError) throws NetworkError
    - _Requirements: 4.1, 4.5, 4.8_

- [x] 3. Implement PasswordStrengthIndicator component
  - [x] 3.1 Create frontend/src/components/PasswordStrengthIndicator.tsx and PasswordStrengthIndicator.module.css
    - Accept `password` prop (string)
    - Evaluate 4 criteria: length ≥8, uppercase, special char, digit
    - Score 0–1 → Weak (red #EF4444, 33% bar), 2–3 → Fair (amber #F59E0B, 66% bar), 4 → Strong (green #10B981, 100% bar)
    - Return `null` when password is empty (not rendered in DOM)
    - Display colored bar + text label ("Weak", "Fair", "Strong")
    - Add `aria-label="Password strength: {level}"` and `aria-live="polite"`
    - Style with CSS Module: bar container (full width, 6px height, gray track), filled portion with transition
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 6.8_

  - [x]* 3.2 Write unit tests for PasswordStrengthIndicator
    - Create `frontend/src/components/PasswordStrengthIndicator.test.tsx`
    - Test not rendered when password is empty
    - Test "Weak" for "a" (0 criteria)
    - Test "Weak" for "abcdefgh" (1 criterion: length)
    - Test "Fair" for "Abcdefgh" (2 criteria: length + uppercase)
    - Test "Fair" for "Abcdefg1" (3 criteria: length + uppercase + digit)
    - Test "Strong" for "Abcdefg1!" (all 4)
    - Test aria-label includes strength level
    - Test aria-live="polite" is present
    - _Requirements: 3.2, 3.4, 3.5, 3.6, 3.7, 6.8_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Integrate Change Password section into SettingsPage
  - [x] 5.1 Add Change Password section to frontend/src/pages/SettingsPage.tsx
    - Import `changePassword` from `../api/password` and `PasswordStrengthIndicator` from `../components/PasswordStrengthIndicator`
    - Add local state: `currentPassword`, `newPassword`, `confirmPassword`, `pwFieldErrors`, `pwGeneralError`, `pwSuccessMessage`, `pwLoading`
    - Implement `validatePasswordForm()`: check empty current password, new password length ≥8, uppercase, special char (priority order, first error only), confirm match
    - Implement `handlePasswordSubmit()`: validate → call API → on success show message & clear form → on error map to field or general error
    - Render new `<section>` card below Appearance with heading "Change Password"
    - Add three password inputs (Current Password, New Password, Confirm New Password) with `maxLength={128}`, labels with `htmlFor`/`id`, and `type="password"`
    - Render `PasswordStrengthIndicator` below New Password when non-empty
    - Show field errors with `aria-invalid`, `aria-describedby`, and `role="alert"`
    - Show success message with `role="status"` and `aria-live="polite"`
    - Show general error banner with `role="alert"` and `aria-live="assertive"`
    - Button: "Update Password" / "Updating..." while loading, disabled during submit
    - Clear field error on input change for that field only
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 5.2 Add CSS styles for the Change Password section in frontend/src/pages/SettingsPage.module.css
    - Add styles for strength indicator wrapper if needed (the indicator has its own CSS Module)
    - Reuse existing `.card`, `.cardContent`, `.sectionTitle`, `.form`, `.formField`, `.label`, `.input`, `.inputError`, `.fieldError`, `.successMessage`, `.errorBanner`, `.saveButton` classes
    - Ensure visible focus indicators (2px solid #00BCD4, outline-offset 2px) per design system
    - _Requirements: 6.7_

  - [x]* 5.3 Write unit tests for the Change Password section in SettingsPage
    - Extend `frontend/src/pages/SettingsPage.test.tsx` (or create if not present)
    - Test renders Change Password section with heading
    - Test renders three password inputs (empty, masked)
    - Test renders "Update Password" button enabled
    - Test shows "Current password is required" on empty submit
    - Test shows length error for short new password
    - Test shows uppercase error when missing
    - Test shows special char error when missing
    - Test shows "Passwords do not match" when confirm differs
    - Test shows only first validation error for new password
    - Test clears field error on input change
    - Test disables button and shows "Updating..." during submit
    - Test shows success message and clears form on 200
    - Test shows "Current password is incorrect" on 401
    - Test shows server message on 400
    - Test shows general error banner on network error (form data preserved)
    - Test strength indicator hidden when new password empty
    - Test strength indicator shows correct level
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The ChangePasswordSection is embedded directly in SettingsPage.tsx (not a separate component file)
- PasswordStrengthIndicator is a standalone component with its own CSS Module
- The backend endpoint reuses existing `User.check_password()` and `User.set_password()` methods
- No database schema changes are required

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "3.1"] },
    { "id": 1, "tasks": ["1.2", "2.2", "3.2"] },
    { "id": 2, "tasks": ["5.1", "5.2"] },
    { "id": 3, "tasks": ["5.3"] }
  ]
}
```
