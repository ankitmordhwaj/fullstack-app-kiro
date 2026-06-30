# Design System

## Overview
This design system defines the visual language and UI consistency for the application.
It includes colors, typography, spacing, themes, and component styling rules.

---

## 1. Color System

### Primary Colors
| Name        | Hex       | Usage                          |
|------------|----------|--------------------------------|
| Primary    | #2563EB  | Main brand color, buttons      |
| Secondary  | #7C3AED  | Highlights, accents            |
| Accent     | #06B6D4  | Links, focus states            |

### Neutral Colors
| Name        | Hex       | Usage                          |
|------------|----------|--------------------------------|
| Background | #F9FAFB  | Page background                |
| Surface    | #FFFFFF  | Cards, containers, inputs      |
| Border     | #E5E7EB  | Dividers, borders              |
| Text Main  | #111827  | Primary text                   |
| Text Muted | #6B7280  | Secondary text, placeholders   |
| Text Sub   | #374151  | Labels, secondary headings     |

### Semantic Colors
| Name    | Hex       | Usage                  |
|--------|----------|------------------------|
| Success| #10B981  | Success messages        |
| Warning| #F59E0B  | Alerts                  |
| Error  | #EF4444  | Errors                  |
| Info   | #3B82F6  | Informational UI        |

---

## 2. Typography

### Font Family
- Primary: Inter, system-ui, sans-serif
- Monospace: JetBrains Mono, monospace

### Font Sizes
| Token        | Size  |
|-------------|------|
| text-xs     | 12px |
| text-sm     | 14px |
| text-base   | 16px |
| text-lg     | 18px |
| text-xl     | 20px |
| text-2xl    | 24px |
| text-3xl    | 30px |

### Font Weights
| Name     | Weight |
|----------|--------|
| Regular  | 400    |
| Medium   | 500    |
| Semibold | 600    |
| Bold     | 700    |

---

## 3. Spacing System

Base unit: 4px

| Token | Value |
|------|------|
| 1    | 4px  |
| 2    | 8px  |
| 3    | 12px |
| 4    | 16px |
| 5    | 20px |
| 6    | 24px |
| 8    | 32px |
| 10   | 40px |

---

## 4. Border Radius

| Token   | Value |
|--------|------|
| sm     | 4px  |
| md     | 8px  |
| lg     | 12px |
| xl     | 16px |
| full   | 9999px |

---

## 5. Shadows

| Token  | Value |
|--------|------|
| sm     | 0 1px 2px rgba(0,0,0,0.05) |
| md     | 0 4px 6px rgba(0,0,0,0.07)  |
| lg     | 0 10px 15px rgba(0,0,0,0.1)|

---

## 6. Theme

This app uses a light theme only. Do NOT use `color-scheme: light dark` or dark mode media queries.

### Light Theme
- background: #F9FAFB (page)
- surface: #FFFFFF (cards, inputs)
- text: #111827
- primary: #2563EB

---

## 7. Component Guidelines

### Button

Variants:
- Primary: background #2563EB, color #FFFFFF
- Secondary: background #7C3AED, color #FFFFFF
- Outline: background transparent, border #E5E7EB, color #374151
- Ghost: background transparent, color #374151

Styles:
- padding: 8px 16px
- borderRadius: 8px
- fontWeight: 500
- border: none (except Outline)

States:
- Disabled: opacity 0.6, cursor not-allowed

---

### Input / Textarea / Select

Styles:
- padding: 10px 12px
- border: 1px solid #E5E7EB
- borderRadius: 8px
- background: #FFFFFF
- color: #111827
- fontSize: 16px (prevents iOS zoom)

States:
- Focus: outline 2px solid #2563EB, outline-offset 2px
- Error: border-color #EF4444

Placeholder color: #9CA3AF

---

### Card

Styles:
- background: #FFFFFF
- padding: 16px
- borderRadius: 12px
- boxShadow: 0 4px 6px rgba(0,0,0,0.07)

---

## 8. Layout Rules

- Page background: #F9FAFB
- Use 8px spacing grid
- Max container width: 1200px
- Do NOT constrain #root width or add borders to it

Breakpoints:
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px

---

## 9. Global CSS Rules

- Always reset box-sizing to border-box
- Never use `color-scheme: light dark` — light theme only
- Set explicit `color: #111827` and `background: #FFFFFF` on inputs/selects/textareas
- Set placeholder color to #9CA3AF explicitly
- Do not carry over Vite template styles (App.css, index.css defaults)

---

## 10. Accessibility

- Minimum contrast ratio: 4.5:1
- Visible focus states required (outline on inputs and buttons)
- Use semantic HTML
- Avoid color-only meaning
