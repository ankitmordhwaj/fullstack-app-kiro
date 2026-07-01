# Requirements Document

## Introduction

This feature introduces a modern dashboard layout for the TaskFlow application, comprising a fixed left sidebar for navigation, a top bar/header displaying the authenticated user's information, and a structured main content area. The layout wraps all protected routes to provide a consistent navigation experience across the application. The design follows the established design system with clean aesthetics, soft shadows, rounded corners, and a teal/cyan primary color.

## Glossary

- **Sidebar**: A fixed-position vertical navigation panel on the left side of the viewport, 240px wide, containing navigation links and the application brand logo.
- **Top_Bar**: A horizontal header bar at the top of the main content area, 64px tall, displaying user information and contextual actions.
- **Dashboard_Layout**: A wrapper component that renders the Sidebar, Top_Bar, and a content area for child routes. Applied to all protected pages.
- **Nav_Item**: An individual clickable navigation link within the Sidebar, consisting of an icon and a text label.
- **Active_Nav_Item**: A Nav_Item whose route matches the current browser URL path, visually distinguished with the primary color background.
- **User_Info_Section**: The portion of the Top_Bar on the right side that displays the authenticated user's avatar, full name, and role label.
- **Content_Area**: The scrollable region to the right of the Sidebar and below the Top_Bar where page-specific content is rendered.

## Requirements

### Requirement 1: Dashboard Layout Structure

**User Story:** As an authenticated user, I want a consistent dashboard layout with sidebar and top bar on all protected pages, so that I can navigate the application efficiently.

#### Acceptance Criteria

1. THE Dashboard_Layout SHALL render a fixed-position Sidebar on the left side of the viewport with a width of 240px, full viewport height, and a z-index that ensures it remains above scrolling content.
2. THE Dashboard_Layout SHALL render a Top_Bar at the top of the Content_Area with a height of 64px and a sticky position so it remains visible when the Content_Area is scrolled.
3. THE Dashboard_Layout SHALL render a Content_Area to the right of the Sidebar and below the Top_Bar with 24px padding, where the Content_Area scrolls independently while the Sidebar remains fixed.
4. THE Dashboard_Layout SHALL apply a left margin of 240px to the main content region so content does not overlap the Sidebar.
5. THE Dashboard_Layout SHALL use a page background color of #F0F4F8 for the Content_Area.
6. THE Dashboard_Layout SHALL wrap all protected routes so that the Sidebar and Top_Bar appear on every authenticated page.
7. WHEN the viewport width is less than 640px, THE Dashboard_Layout SHALL hide the Sidebar and remove the left margin from the Content_Area so that content occupies the full viewport width.

---

### Requirement 2: Sidebar Navigation Items

**User Story:** As an authenticated user, I want clearly labeled navigation items in the sidebar, so that I can access different sections of the application.

#### Acceptance Criteria

1. THE Sidebar SHALL display the TaskFlow brand logo and name at the top with font-weight 700 and 32px bottom padding.
2. THE Sidebar SHALL display a "Todo" Nav_Item that navigates to the "/tasks" route.
3. THE Sidebar SHALL display a "Team Members" Nav_Item that navigates to the "/team" route.
4. THE Sidebar SHALL display a "Settings" Nav_Item that navigates to the "/settings" route.
5. THE Sidebar SHALL display the Nav_Items in the following top-to-bottom order: "Todo", "Team Members", "Settings".
6. THE Sidebar SHALL display a "Logout" Nav_Item pinned to the bottom of the Sidebar, visually separated from the main navigation items.
7. WHEN the "Logout" Nav_Item is clicked, THE Dashboard_Layout SHALL invoke the logout function from the authentication context, which clears stored tokens and redirects the user to the "/login" route.
8. THE Sidebar SHALL render each Nav_Item with an icon and text label, using a 12px gap between the icon and the text.
9. WHEN a Nav_Item's route matches the current browser URL path, THE Sidebar SHALL render that Nav_Item with active styling (background #00BCD4, text color #FFFFFF, font-weight 600) to indicate the current section.

---

### Requirement 3: Active Navigation State

**User Story:** As an authenticated user, I want to see which navigation item corresponds to my current page, so that I always know where I am in the application.

#### Acceptance Criteria

1. WHEN the current URL path starts with a Nav_Item route prefix, THE Sidebar SHALL display that Nav_Item as the Active_Nav_Item with a background color of #00BCD4, white text color, and font-weight 600.
2. WHILE a Nav_Item is not the Active_Nav_Item, THE Sidebar SHALL display that Nav_Item with text color #374151, font-weight 500, and no background color.
3. WHEN the user hovers over a non-active Nav_Item, THE Sidebar SHALL display a background color of #F3F4F6 on that Nav_Item.
4. IF the current URL path does not start with any Nav_Item route prefix, THEN THE Sidebar SHALL display all Nav_Items in their inactive state with no Active_Nav_Item highlighted.
5. THE Sidebar SHALL apply a border-radius of 8px to each Nav_Item.
6. THE Sidebar SHALL apply a transition of 0.15s ease on background color changes for Nav_Items.

---

### Requirement 4: Top Bar User Information

**User Story:** As an authenticated user, I want to see my profile information in the top bar, so that I can confirm I am logged in with the correct account.

#### Acceptance Criteria

1. THE Top_Bar SHALL display the authenticated user's full name on the right side of the header.
2. THE Top_Bar SHALL display a circular avatar (36px diameter) showing the user's initials as a fallback, derived from the first character of the first and last word of the full_name field, uppercased, with a maximum of 2 characters.
3. THE Top_Bar SHALL display a static "Member" role label below the user's full name in muted text color #6B7280 and font-size 12px.
4. THE Top_Bar SHALL use a white background (#FFFFFF) with a bottom border of 1px solid #E5E7EB.
5. THE Top_Bar SHALL vertically center all content within its 64px height.
6. THE Top_Bar SHALL position the User_Info_Section on the right side and any left-side content (such as page title or search) on the left, with content pushed to opposite edges.
7. IF the user's full name exceeds 20 characters, THE Top_Bar SHALL truncate the displayed name with an ellipsis.
8. IF the authenticated user data is unavailable (null or loading), THE Top_Bar SHALL display a placeholder skeleton or empty state without crashing.

---

### Requirement 5: Sidebar Visual Design

**User Story:** As an authenticated user, I want the sidebar to look modern and professional, so that the application feels polished and trustworthy.

#### Acceptance Criteria

1. THE Sidebar SHALL use a white background (#FFFFFF) with a box-shadow of 2px 0 8px rgba(0,0,0,0.04) on the right edge.
2. THE Sidebar SHALL use padding of 24px vertically and 16px horizontally.
3. THE Sidebar SHALL use font-size 14px and font-weight 500 for Nav_Item text.
4. THE Sidebar SHALL use 20px icon size for Nav_Item icons, using outlined/linear icon style with 1.5px stroke.
5. THE Sidebar SHALL use padding of 10px 16px for each Nav_Item.
6. THE Sidebar SHALL display Nav_Item text in color #374151 for inactive items and #FFFFFF for the Active_Nav_Item.
7. THE Sidebar SHALL use a 12px gap between icon and text within each Nav_Item.
8. THE Sidebar SHALL apply a border-radius of 8px to each Nav_Item.

---

### Requirement 6: Responsive Behavior

**User Story:** As a user on a smaller screen, I want the layout to adapt gracefully, so that the application remains usable on different viewport sizes.

#### Acceptance Criteria

1. WHILE the viewport width is at or above 1024px, THE Dashboard_Layout SHALL display the Sidebar in its full 240px width with text labels visible alongside navigation icons.
2. WHILE the viewport width is between 640px and 1023px, THE Dashboard_Layout SHALL display the Sidebar in a collapsed state showing only navigation icons within a 64px wide column.
3. WHILE the viewport width is below 640px, THE Dashboard_Layout SHALL hide the Sidebar entirely and display a hamburger menu button in the Top_Bar that toggles the Sidebar as an overlay when activated.
4. WHILE the Sidebar is collapsed or hidden, THE Content_Area SHALL expand to fill the remaining viewport width (full width minus the collapsed sidebar width, or full viewport width when sidebar is hidden).
5. WHEN the viewport width crosses a breakpoint boundary (640px or 1024px), THE Dashboard_Layout SHALL complete the layout transition within 200ms.

---

### Requirement 7: Keyboard Accessibility and Semantic Structure

**User Story:** As a user who navigates via keyboard, I want all navigation items to be accessible, so that I can use the application without a mouse.

#### Acceptance Criteria

1. THE Sidebar SHALL use a semantic `<nav>` HTML element as the navigation container.
2. THE Top_Bar SHALL use a semantic `<header>` HTML element.
3. THE Content_Area SHALL use a semantic `<main>` HTML element.
4. THE Sidebar SHALL make all Nav_Items keyboard-focusable and navigable using the Tab key in top-to-bottom logical order.
5. WHEN a Nav_Item receives keyboard focus, THE Sidebar SHALL display a visible focus indicator with outline 2px solid #00BCD4 and outline-offset 2px.
6. WHEN the user presses Enter or Space on a focused Nav_Item, THE Sidebar SHALL activate the navigation to that item's route.
7. THE Sidebar SHALL provide an aria-label of "Main navigation" on the nav element.
8. WHEN a Nav_Item is the Active_Nav_Item, THE Sidebar SHALL set aria-current="page" on that item, and no other Nav_Item SHALL have aria-current set.
