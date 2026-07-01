# Implementation Plan: Dashboard Sidebar Layout

## Overview

This plan implements a persistent dashboard layout for the TaskFlow application using React Router v6 nested routes. The layout consists of a Sidebar, TopBar, and Content Area that wrap all authenticated routes. Implementation follows an incremental approach: utilities first, then components, then routing integration.

## Tasks

- [x] 1. Create navigation utility functions
  - [x] 1.1 Create `src/utils/navigation.ts` with pure utility functions
    - Implement `getInitials(fullName: string): string` — extracts up to 2 uppercase initials from the first and last word; returns `"?"` for empty input
    - Implement `truncateName(name: string, maxLength?: number): string` — returns name unchanged if within limit, otherwise truncates at maxLength and appends "…"
    - Implement `isActiveRoute(currentPath: string, routePrefix: string): boolean` — returns true if currentPath starts with routePrefix
    - _Requirements: 3.1, 4.2, 4.7_

  - [ ]* 1.2 Write property-based tests for navigation utilities
    - **Property 1: Route-prefix matching correctly identifies active navigation**
    - **Property 2: Initials derivation produces valid uppercase initials**
    - **Property 3: Name truncation preserves short names and truncates long names**
    - Install `fast-check` as a dev dependency
    - Create `src/utils/navigation.test.ts` with property tests using fast-check (min 100 iterations each)
    - Tag each test with `// Feature: dashboard-sidebar-layout, Property {N}: {description}`
    - **Validates: Requirements 2.9, 3.1, 3.2, 3.4, 4.2, 4.7, 7.8**

- [x] 2. Implement the Sidebar component
  - [x] 2.1 Create `src/components/Sidebar.tsx` and `src/components/Sidebar.module.css`
    - Define `SidebarProps` interface: `{ collapsed: boolean; mobileOpen: boolean; onCloseMobile: () => void }`
    - Render `<nav>` with `aria-label="Main navigation"`
    - Render brand logo section at top (TaskFlow brand, font-weight 700, 32px bottom padding)
    - Render Nav_Items in order: "Todo" (/tasks), "Team Members" (/team), "Settings" (/settings) — each with inline SVG icon (20px, 1.5px stroke) and text label
    - Render "Logout" Nav_Item pinned to bottom, invoking `logout()` from `useAuth()`
    - Apply active styling (bg #00BCD4, color #FFFFFF, font-weight 600, `aria-current="page"`) based on `isActiveRoute()`
    - Apply inactive styling (color #374151, font-weight 500), hover (#F3F4F6), border-radius 8px, 0.15s transition
    - Handle `collapsed` mode (icons only, 64px width) and `mobileOpen` overlay mode
    - Use CSS Modules for all styling per design system
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 7.1, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [ ]* 2.2 Write unit tests for Sidebar component
    - Create `src/components/Sidebar.test.tsx`
    - Test: renders all nav items in correct order
    - Test: active item receives correct class and `aria-current="page"`
    - Test: logout button calls context logout function
    - Test: collapsed mode hides text labels
    - Test: keyboard focus shows visible focus indicator
    - _Requirements: 2.1–2.9, 3.1–3.6, 7.1, 7.4–7.8_

- [x] 3. Implement the TopBar component
  - [x] 3.1 Create `src/components/TopBar.tsx` and `src/components/TopBar.module.css`
    - Define `TopBarProps` interface: `{ onHamburgerClick: () => void; showHamburger: boolean }`
    - Render `<header>` element with 64px height, white bg, bottom border 1px solid #E5E7EB
    - Left section: page title placeholder (or hamburger button when `showHamburger` is true)
    - Right section (User_Info_Section): circular avatar (36px) with initials from `getInitials()`, user's full name (truncated via `truncateName()` if >20 chars), "Member" label (12px, #6B7280)
    - Handle null user state with placeholder skeleton (empty avatar circle + gray text blocks)
    - Vertically center all content, push left/right sections to opposite edges
    - _Requirements: 1.2, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 7.2_

  - [ ]* 3.2 Write unit tests for TopBar component
    - Create `src/components/TopBar.test.tsx`
    - Test: renders user name and initials avatar
    - Test: truncates names longer than 20 characters
    - Test: displays "Member" role label
    - Test: handles null user without crashing
    - Test: hamburger button visible when `showHamburger` is true
    - _Requirements: 4.1–4.8, 7.2_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement the DashboardLayout component and responsive hook
  - [x] 5.1 Create `useSidebarMode` hook in `src/components/DashboardLayout.tsx`
    - Implement `useSidebarMode(): SidebarMode` using `window.matchMedia` listeners
    - Return `'full'` for ≥1024px, `'collapsed'` for 640–1023px, `'hidden'` for <640px
    - Clean up listeners in useEffect to prevent memory leaks
    - Reset `mobileOpen` to false when mode transitions away from `'hidden'`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 5.2 Create `src/components/DashboardLayout.tsx` and `src/components/DashboardLayout.module.css`
    - Check authentication via `useAuth()` — redirect to `/login` if no token
    - Render Sidebar, TopBar, and `<Outlet />` (content area) wrapped in flex layout
    - Main content region: `<main>` element, left margin 240px (full), 64px (collapsed), 0 (hidden)
    - Content_Area: 24px padding, bg #F0F4F8, scrolls independently
    - TopBar sticky at top of content area
    - Manage `mobileOpen` state for hamburger toggle at <640px
    - Pass responsive props to Sidebar (`collapsed`, `mobileOpen`, `onCloseMobile`) and TopBar (`showHamburger`, `onHamburgerClick`)
    - Apply layout transition within 200ms on breakpoint changes
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 6.1, 6.2, 6.3, 6.4, 6.5, 7.3_

  - [ ]* 5.3 Write unit tests for DashboardLayout component
    - Create `src/components/DashboardLayout.test.tsx`
    - Test: renders sidebar, top bar, and outlet when authenticated
    - Test: redirects to /login when unauthenticated
    - Test: uses semantic `<main>` element for content area
    - _Requirements: 1.1–1.7, 7.3_

- [x] 6. Integrate layout into App.tsx routing
  - [x] 6.1 Update `src/App.tsx` to use nested layout routes
    - Replace individual `<ProtectedRoute>` wrappers with a single `<Route element={<DashboardLayout />}>` parent
    - Nest existing protected routes (`/tasks`, `/tasks/new`, `/tasks/:id/edit`) as children
    - Add placeholder routes for `/team` and `/settings` (can render simple "Coming Soon" text)
    - Keep public routes (`/login`, `/register`) outside the layout route
    - Keep the default redirect (`/` → `/tasks`)
    - Remove unused `ProtectedRoute` import if no longer needed by any route
    - _Requirements: 1.6, 2.2, 2.3, 2.4_

- [-] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases using Vitest + React Testing Library
- CSS Modules are used for component styling (not Tailwind) per the tech stack steering
- The design system steering file defines all color values, spacing, and component guidelines

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "3.2", "5.1"] },
    { "id": 3, "tasks": ["5.2"] },
    { "id": 4, "tasks": ["5.3", "6.1"] }
  ]
}
```
