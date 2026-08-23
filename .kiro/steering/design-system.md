# Design System

## Overview
This design system defines the visual language and UI consistency for the application.
It follows a modern dashboard aesthetic with a fixed sidebar, top bar, and card-based content grid.
The style is clean, spacious, and uses soft shadows with rounded corners throughout.

---

## 1. Color System

### Primary Colors
| Name        | Hex       | Usage                                    |
|------------|----------|------------------------------------------|
| Primary    | #00BCD4  | Brand color, active nav items, CTAs      |
| Primary Light | #E0F7FA | Active nav item background, light badges |
| Secondary  | #7C3AED  | Purple accent badges, icons              |
| Accent     | #06B6D4  | Links, focus states, icon badges         |

### Neutral Colors
| Name        | Hex       | Usage                          |
|------------|----------|--------------------------------|
| Background | #F0F4F8  | Page background (light gray-blue) |
| Surface    | #FFFFFF  | Cards, sidebar, top bar, inputs |
| Border     | #E5E7EB  | Dividers, borders, separators  |
| Text Main  | #1A1A2E  | Primary text, headings         |
| Text Muted | #6B7280  | Secondary text, meta info      |
| Text Sub   | #374151  | Labels, nav items              |

### Semantic / Badge Colors
| Name    | Hex       | Usage                          |
|--------|----------|--------------------------------|
| Success| #10B981  | Success states, green badges   |
| Warning| #F59E0B  | Warning alerts, orange badges  |
| Error  | #EF4444  | Errors, red/pink badges        |
| Info   | #3B82F6  | Info states, blue badges       |
| Pink   | #EC4899  | Pink icon badges               |
| Purple | #8B5CF6  | Purple icon badges             |
| Orange | #F97316  | Orange icon badges             |
| Cyan   | #06B6D4  | Cyan/teal icon badges          |

### Badge Background Tints (for colored icon circles)
| Name         | Hex       | Usage                        |
|-------------|----------|------------------------------|
| Pink Tint   | #FDE8F0  | Background for pink icons    |
| Green Tint  | #D1FAE5  | Background for green icons   |
| Blue Tint   | #DBEAFE  | Background for blue icons    |
| Orange Tint | #FFEDD5  | Background for orange icons  |
| Purple Tint | #EDE9FE  | Background for purple icons  |
| Cyan Tint   | #CFFAFE  | Background for cyan icons    |

---

## 2. Typography

### Font Family
- Primary: Inter, system-ui, sans-serif
- Kanban components: DM Sans, Inter, system-ui, sans-serif (matches Figma reference)
- Monospace: JetBrains Mono, monospace

### Font Sizes
| Token        | Size  | Usage                          |
|-------------|------|--------------------------------|
| text-xs     | 12px | Badge counts, meta labels      |
| text-sm     | 14px | Nav items, card meta text      |
| text-base   | 16px | Body text, input text          |
| text-lg     | 18px | Card titles                    |
| text-xl     | 20px | Section headings               |
| text-2xl    | 24px | Page titles                    |
| text-3xl    | 30px | Hero headings (if needed)      |

### Font Weights
| Name     | Weight | Usage                          |
|----------|--------|--------------------------------|
| Regular  | 400    | Body text, meta info           |
| Medium   | 500    | Nav items, labels              |
| Semibold | 600    | Card titles, section heads     |
| Bold     | 700    | Page titles, emphasis          |

---

## 3. Spacing System

Base unit: 4px

| Token | Value | Usage                          |
|------|------|--------------------------------|
| 1    | 4px  | Tight spacing, icon gaps       |
| 2    | 8px  | Inline spacing, small gaps     |
| 3    | 12px | Nav item padding, card meta    |
| 4    | 16px | Card padding, section gaps     |
| 5    | 20px | Card internal spacing          |
| 6    | 24px | Section margins                |
| 8    | 32px | Large section gaps             |
| 10   | 40px | Page-level padding             |

---

## 4. Border Radius

| Token   | Value  | Usage                          |
|--------|--------|--------------------------------|
| sm     | 4px    | Small badges, pills            |
| md     | 8px    | Buttons, inputs                |
| lg     | 12px   | Cards, dropdowns               |
| xl     | 16px   | Sidebar, large containers      |
| 2xl    | 20px   | Main content wrapper           |
| full   | 9999px | Avatars, circular icon badges  |

---

## 5. Shadows

| Token  | Value                              | Usage                    |
|--------|-------------------------------------|--------------------------|
| sm     | 0 1px 3px rgba(0,0,0,0.04)         | Subtle element lift      |
| md     | 0 4px 12px rgba(0,0,0,0.06)        | Cards, sidebar           |
| lg     | 0 8px 24px rgba(0,0,0,0.08)        | Modals, elevated panels  |
| xl     | 0 12px 40px rgba(0,0,0,0.1)        | Main dashboard wrapper   |

---

## 6. Theme

This app uses a light theme only. Do NOT use `color-scheme: light dark` or dark mode media queries.

### Light Theme
- page background: #F0F4F8 (soft gray-blue)
- surface: #FFFFFF (sidebar, cards, top bar)
- text: #1A1A2E
- primary: #00BCD4 (teal/cyan)

---

## 7. Component Guidelines

### Sidebar (Left Navigation)

Layout:
- Fixed left position, full viewport height
- Width: 240px
- Background: #FFFFFF
- No border or box-shadow (clean seamless look)
- Padding: 24px 16px

Nav Items:
- Padding: 10px 16px
- Border-radius: 8px
- Font-size: 14px
- Font-weight: 500
- Color: #374151 (default)
- Icon + text layout with 12px gap
- Hover: background #F3F4F6
- Active: background #00BCD4, color #FFFFFF, font-weight 600

Logo Area:
- Top of sidebar, padding-bottom: 32px
- Brand icon + text, font-weight 700

Bottom Section:
- Logout link pinned to bottom
- Same styling as nav items

---

### Top Bar (Header)

Layout:
- Height: 64px
- Background: transparent (inherits from content wrapper)
- No border-bottom (sits inside the rounded content wrapper)
- Padding: 0 24px
- Display: flex, align-items center, justify-content space-between

Left Side:
- Search input with icon
- Search: background #F3F4F6, border-radius 8px, padding 8px 16px 8px 40px, no border, width 240px
- Search icon: position absolute, left 12px, color #9CA3AF, size 16px
- Focus: box-shadow 0 0 0 2px #00BCD4

Right Side:
- User avatar (circular, 36px, background #00BCD4, white initials) + name + role label
- Gap: 12px between elements

---

### Task/Project Card

Layout:
- Background: #FFFFFF
- Border-radius: 12px
- Padding: 20px
- Box-shadow: 0 4px 12px rgba(0,0,0,0.06)
- Display: flex, flex-direction column, gap 12px

Card Header:
- Colored icon badge (48px circle with tinted background + icon)
- Title: font-size 18px, font-weight 600, color #1A1A2E

Card Meta:
- Team name with icon, font-size 13px, color #6B7280
- Due/time-left indicator, font-size 13px, color #6B7280

Card Footer:
- Display flex, justify-content space-between
- Left: "Team Member" label + avatar stack (overlapping circles, 28px each)
- Right: "Progress" label + percentage text (font-weight 600)

---

### Kanban Board

Reference Figma: https://www.figma.com/design/z8ZQQmYvdqQkihJSCWzmFI/Kanban-Board-%E2%80%93-Task-Management--Community-?node-id=0-1

Layout:
- Display: flex, gap 20px, overflow-x auto
- Full width of content area, horizontal scroll on small screens
- Padding: 24px 0
- Min-height: calc(100vh - 140px) (fill available vertical space)

Column:
- Flex: 1, min-width 280px, max-width 380px
- Background: #FDFDFD (near-white, from Figma)
- Border: 1px solid #F4F4F4
- Border-radius: 12px
- Overflow: clip (rounded corners clip children)
- Display: flex, flex-direction column, gap 16px, align-items center
- Padding-bottom: 24px
- Box-shadow: 24px 24px 80px rgba(0,0,0,0.01)
- Overflow-y: auto, max-height: calc(100vh - 200px)

Column Header:
- Background: #FFFFFF
- Border-bottom: 1px solid #F4F4F4
- Padding: 12px 24px
- Width: 100%
- Text: font-size 16px, font-weight 400, color #313131, text-transform uppercase, text-align center, font-family DM Sans

Column Colors (left accent bar on cards within column):
- To Do (PENDING): left accent bar color #3B82F6 (blue)
- In Progress (INPROGRESS): left accent bar color #F59E0B (amber)
- Done (COMPLETED): left accent bar color #10B981 (green)

### Kanban Task Card (based on Figma Card component)

Layout:
- Background: #FFFFFF
- Border: 1px solid #E3E3E3
- Border-radius: 12px
- Padding: 16px
- Width: 264px
- Display: flex, flex-direction column, gap 12px
- Box-shadow: multi-layer subtle (0 0 0 rgba(0,0,0,0.01), 2px 2px 6px rgba(0,0,0,0.01), 7px 9px 11px rgba(0,0,0,0.01))
- Position: relative (for the left accent bar)
- Cursor: grab (while dragging: cursor grabbing)
- Transition: box-shadow 0.2s ease, transform 0.2s ease

Left Accent Bar (priority/status indicator):
- Position: absolute, left -2px, top 45px
- Width: 3px, height 50px
- Border-radius: 9999px (pill)
- Color varies by column (see Column Colors above)

Card Content:
- Title row: display flex, justify-content space-between, align-items start
  - Title: font-size 16px, font-weight 500, color #313131, font-family DM Sans, line-height 22px
  - Priority icon: 22px, right-aligned in title row
- Description: font-size 12px, font-weight 400, color #828282, line-height 16px, max 2 lines with text-overflow ellipsis

Priority Badge Colors (pill style, font-size 10px, font-weight 500, border-radius 4px, padding 4px 8px):
- HIGH: background #FFECE1, color #FF5C00
- MEDIUM: background #E1F6FF, color #2C62B4
- LOW: background #CDF4DD, color #188544

Drag States:
- Dragging: box-shadow 0 8px 24px rgba(0,0,0,0.12), transform scale(1.02), opacity 0.9
- Drop target (column): background #E0F7FA, border 2px dashed #00BCD4
- Hover (not dragging): box-shadow 0 4px 12px rgba(0,0,0,0.06)

Card Actions (visible on hover):
- Position: absolute, top-right corner
- Small icon buttons (edit, delete), 24px, ghost style
- Opacity 0 by default, opacity 1 on card hover

---

### Icon Badge (Colored Circle)

Styles:
- Width/Height: 48px
- Border-radius: 9999px (full circle)
- Background: use appropriate tint color from Badge Background Tints
- Display: flex, align-items center, justify-content center
- Icon color: matching solid color (e.g., pink icon on pink tint bg)
- Icon size: 20px

---

### Tab Filters

Layout:
- Display: flex, gap 8px, align-items center
- Margin-bottom: 24px

Tab Item:
- Padding: 6px 16px
- Border-radius: 20px (pill shape)
- Font-size: 14px
- Font-weight: 500
- Default: background transparent, color #6B7280
- Active: background #00BCD4, color #FFFFFF
- Count badge: displayed inline next to label, same color as text

---

### Avatar Stack

Layout:
- Display: flex
- Each avatar overlaps previous by -8px (negative margin-left)
- Avatar size: 28px circle
- Border: 2px solid #FFFFFF around each
- Border-radius: 9999px

---

### Button

Variants:
- Primary: background #00BCD4, color #FFFFFF
- Secondary: background #7C3AED, color #FFFFFF
- Outline: background transparent, border 1px solid #E5E7EB, color #374151
- Ghost: background transparent, color #374151
- Icon Button (FAB): 48px circle, background #00BCD4, color #FFFFFF, box-shadow md

Styles:
- padding: 8px 16px
- borderRadius: 8px
- fontWeight: 500
- border: none (except Outline)
- transition: all 0.2s ease

States:
- Hover: slight darken (filter brightness 0.95)
- Disabled: opacity 0.6, cursor not-allowed
- Focus: outline 2px solid #00BCD4, outline-offset 2px

---

### Input / Textarea / Select

Styles:
- padding: 10px 12px
- border: 1px solid #E5E7EB
- borderRadius: 8px
- background: #FFFFFF
- color: #1A1A2E
- fontSize: 16px (prevents iOS zoom)

States:
- Focus: outline 2px solid #00BCD4, outline-offset 2px
- Error: border-color #EF4444

Placeholder color: #9CA3AF

---

### Search Input

Styles:
- background: #F3F4F6
- border: none
- border-radius: 8px
- padding: 8px 16px 8px 40px (space for search icon)
- font-size: 14px
- color: #1A1A2E
- width: 240px

Icon:
- Position absolute, left 12px
- Color: #9CA3AF
- Size: 16px

---

### Progress Indicator

Display:
- Text-based percentage (e.g., "76%")
- Font-size: 14px
- Font-weight: 600
- Color: #1A1A2E

Alternative (progress bar, if needed):
- Height: 6px
- Border-radius: 9999px
- Background track: #E5E7EB
- Fill: #00BCD4
- Transition: width 0.3s ease

---

### Notification Badge

Styles:
- Width/Height: 8px (dot) or 18px (with count)
- Border-radius: 9999px
- Background: #EF4444
- Color: #FFFFFF (if showing count)
- Font-size: 10px
- Position: absolute, top-right of bell icon

---

## 8. Layout Rules

### Overall Dashboard Layout
- Display: flex (sidebar + content wrapper)
- Page background: #F0F4F8 (the gray-blue behind everything)
- Sidebar: fixed left, 240px wide, full height, white, no shadow
- Content wrapper: margin-left 240px, flex 1, white background, border-radius 20px, box-shadow 0 8px 24px rgba(0,0,0,0.06), margin 12px (top/right/bottom), overflow hidden
- Top bar: inside content wrapper, transparent background, no border
- Content area: below top bar inside wrapper, padding 24px, transparent background, scrolls independently
- The content wrapper creates the "floating panel" appearance with rounded corners

### Content Grid (Card Grid)
- Display: grid
- grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))
- Gap: 20px
- Page background: #F0F4F8

### Kanban Board Layout
- Display: flex, flex-direction row
- Gap: 20px
- Overflow-x: auto (horizontal scroll on narrow viewports)
- Padding: 0 24px 24px
- Each column is flex: 1, min-width 280px
- On small screens (< 768px): columns stack vertically or scroll horizontally

### General Rules
- Use 8px spacing grid
- Max container width: 1200px (for content within main area)
- Do NOT constrain #root width or add borders to it
- Dashboard wrapper has border-radius 20px and box-shadow xl for "floating" appearance

### Breakpoints
- sm: 640px (single column cards, sidebar collapses)
- md: 768px (2 column cards)
- lg: 1024px (3 column cards)
- xl: 1280px (4 column cards, full sidebar)

---

## 9. Global CSS Rules

- Always reset box-sizing to border-box
- Never use `color-scheme: light dark` — light theme only
- Set explicit `color: #1A1A2E` and `background: #FFFFFF` on inputs/selects/textareas
- Set placeholder color to #9CA3AF explicitly
- Do not carry over Vite template styles (App.css, index.css defaults)
- Use smooth transitions: `transition: all 0.2s ease` on interactive elements
- Scrollbar styling: thin, subtle (webkit-scrollbar width 6px, thumb #CBD5E1, radius full)

---

## 10. Accessibility

- Minimum contrast ratio: 4.5:1
- Visible focus states required (outline 2px solid #00BCD4 on interactive elements)
- Use semantic HTML (nav, main, header, section, article for cards)
- Avoid color-only meaning — pair colors with icons or text labels
- All interactive elements must be keyboard navigable
- Avatar images must have alt text
- Icon-only buttons must have aria-label

---

## 11. Animation & Transitions

| Element        | Property    | Duration | Easing     |
|---------------|------------|----------|------------|
| Buttons       | all        | 0.2s     | ease       |
| Cards (hover) | transform, box-shadow | 0.2s | ease |
| Nav items     | background | 0.15s   | ease       |
| Progress bar  | width      | 0.3s    | ease       |
| Kanban card (drag start) | transform, box-shadow | 0.15s | ease-out |
| Kanban card (drop)       | transform, opacity    | 0.2s  | ease     |
| Column (drop highlight)  | background, border    | 0.15s | ease     |

### Card Hover Effect
- transform: translateY(-2px)
- box-shadow: 0 8px 24px rgba(0,0,0,0.08)

### Kanban Drag Effect
- On grab: transform scale(1.02), box-shadow lg, opacity 0.9
- On drop: animate card into new position with 0.2s ease transition
- Column highlight on drag-over: background fades to #E0F7FA

---

## 12. Iconography

- Icon style: Outlined/linear (not filled), consistent 1.5px stroke
- Default icon size: 20px
- Nav icon size: 20px
- Card badge icon size: 20px
- Icon color inherits from parent text color unless inside a colored badge
- Recommended icon set: Lucide Icons or Heroicons (outline variant)
