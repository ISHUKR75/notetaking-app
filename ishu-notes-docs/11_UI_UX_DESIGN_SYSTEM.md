# Ishu Notes — UI/UX Design System

## Design Philosophy

**"Calm power"** — Every surface is clean and focused. Every tool is exactly where you expect it. Power users find every feature. Beginners feel comfortable immediately. Nothing competes for attention — the content is always the star.

---

## Color System

### Light Mode Palette
```css
/* Primary Brand */
--color-primary-50:  #eef2ff;
--color-primary-100: #e0e7ff;
--color-primary-200: #c7d2fe;
--color-primary-300: #a5b4fc;
--color-primary-400: #818cf8;
--color-primary-500: #6366f1;  /* Main brand color */
--color-primary-600: #4f46e5;
--color-primary-700: #4338ca;
--color-primary-800: #3730a3;
--color-primary-900: #312e81;

/* Neutrals */
--color-gray-50:  #f9fafb;
--color-gray-100: #f3f4f6;
--color-gray-200: #e5e7eb;
--color-gray-300: #d1d5db;
--color-gray-400: #9ca3af;
--color-gray-500: #6b7280;
--color-gray-600: #4b5563;
--color-gray-700: #374151;
--color-gray-800: #1f2937;
--color-gray-900: #111827;
--color-gray-950: #030712;

/* Semantic Colors */
--color-success: #10b981;   /* Emerald */
--color-warning: #f59e0b;   /* Amber */
--color-error:   #ef4444;   /* Red */
--color-info:    #3b82f6;   /* Blue */

/* Note Label Colors (12 options) */
--note-color-red:    #fca5a5;
--note-color-orange: #fdba74;
--note-color-yellow: #fde047;
--note-color-green:  #86efac;
--note-color-teal:   #5eead4;
--note-color-blue:   #93c5fd;
--note-color-purple: #c4b5fd;
--note-color-pink:   #f9a8d4;
--note-color-brown:  #d6b896;
--note-color-gray:   #d1d5db;
--note-color-black:  #374151;
--note-color-white:  #ffffff;
```

### Dark Mode Palette
```css
/* Dark mode adjusts all colors for proper contrast */
--color-bg-primary:   #0f1117;   /* Main background */
--color-bg-secondary: #1a1d27;   /* Sidebar, panels */
--color-bg-tertiary:  #252836;   /* Cards, hover states */
--color-bg-elevated:  #2d3045;   /* Modals, dropdowns */
--color-border:       #363a4f;
--color-text-primary: #e2e8f0;
--color-text-secondary: #94a3b8;
--color-text-muted:   #64748b;
```

### Theme System
- **Light** — Crisp white with indigo accent
- **Dark** — Deep navy with indigo accent
- **System** — Follows OS preference (with instant switch)
- **Sepia** — Warm paper tone for reading comfort
- **OLED Black** — Pure black for OLED displays
- **High Contrast** — AAA accessibility compliance
- **Custom** — Build your own theme (premium)

---

## Typography Scale

```css
/* Font Families */
--font-sans:  'Inter var', 'Inter', system-ui, sans-serif;
--font-serif: 'Merriweather', 'Georgia', serif;
--font-mono:  'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
--font-hand:  'Caveat', 'Dancing Script', cursive;  /* For hand-feel UI elements */

/* Type Scale (Major Third — 1.250 ratio) */
--text-xs:   0.64rem;   /* 10.24px */
--text-sm:   0.8rem;    /* 12.8px */
--text-base: 1rem;      /* 16px */
--text-lg:   1.25rem;   /* 20px */
--text-xl:   1.563rem;  /* 25px */
--text-2xl:  1.953rem;  /* 31.25px */
--text-3xl:  2.441rem;  /* 39px */
--text-4xl:  3.052rem;  /* 48.8px */
--text-5xl:  3.815rem;  /* 61px */

/* Font Weights */
--weight-light:    300;
--weight-regular:  400;
--weight-medium:   500;
--weight-semibold: 600;
--weight-bold:     700;
--weight-extrabold: 800;

/* Line Heights */
--leading-tight:  1.25;
--leading-snug:   1.375;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
--leading-loose:  2;
```

---

## Spacing System

```css
/* 4px base unit — all spacing is multiples of 4 */
--space-0:   0px;
--space-0.5: 2px;
--space-1:   4px;
--space-1.5: 6px;
--space-2:   8px;
--space-3:   12px;
--space-4:   16px;
--space-5:   20px;
--space-6:   24px;
--space-7:   28px;
--space-8:   32px;
--space-10:  40px;
--space-12:  48px;
--space-14:  56px;
--space-16:  64px;
--space-20:  80px;
--space-24:  96px;
--space-32:  128px;
```

---

## Layout System

### App Shell Layout

```
┌───────────────────────────────────────────────────────────────┐
│  HEADER BAR (48px)                                            │
│  [≡ Menu]  [Ishu Notes Logo]  [Search 🔍]  [Sync][Profile]  │
├──────────┬────────────────────────────────────────────────────┤
│ SIDEBAR  │                                                     │
│  (260px) │  CONTENT AREA (flex-1)                            │
│  ────── │  ─────────────────────────────────────────────── │
│ Libraries│  ┌─────────────────────────────────────────────┐  │
│ Notebooks│  │  NOTE LIST (300px)  │  EDITOR (flex-1)     │  │
│ Recent   │  │  ─────────────────  │  ─────────────────── │  │
│ Tags     │  │  [Note Title]       │  [Editor Content]    │  │
│ Trash    │  │  [Note Title]       │  [Editor Toolbar]    │  │
│ Settings │  │  [Note Title]       │                       │  │
│          │  └─────────────────────────────────────────────┘  │
└──────────┴────────────────────────────────────────────────────┘
```

### Responsive Breakpoints
```css
/* Mobile First */
--breakpoint-sm:  640px;   /* Small mobile landscape */
--breakpoint-md:  768px;   /* Tablet portrait */
--breakpoint-lg:  1024px;  /* Tablet landscape / small laptop */
--breakpoint-xl:  1280px;  /* Desktop */
--breakpoint-2xl: 1536px;  /* Large desktop */
```

### Responsive Layout Behavior

| Screen Width | Layout |
|-------------|--------|
| < 640px | Single panel, bottom tab nav, full-screen editor |
| 640–768px | Single panel, sidebar as sheet/drawer |
| 768–1024px | Two panels: list + editor (sidebar hamburger) |
| 1024–1280px | Three panels: sidebar (collapsed) + list + editor |
| > 1280px | Three panels: sidebar (full) + list + editor |
| > 1536px | Three panels + optional AI assistant panel |

---

## Component Library

### Navigation Components

#### Sidebar
- Fixed left panel, 260px width (collapsible to 60px icon rail)
- Smooth collapse/expand animation (Framer Motion)
- Sections: Libraries, Notebooks, Recent, Tags, Smart Folders, Trash
- Drag-to-reorder notebooks and libraries
- Right-click context menu on any item
- Keyboard navigation (arrow keys)

#### Note List Panel
- Width: 300px (resizable 200px–500px)
- List view: Title + snippet + date + color indicator
- Grid view: Card thumbnails (2 or 3 columns)
- Gallery view: Large cover image cards
- Sort bar: Modified / Created / Title / Manual
- Filter bar: Tags, notebook, content type
- Multi-select with checkboxes on hover

#### Breadcrumb Trail
```
Personal Library > Meeting Notes > Q2 2026 > Team Standup June 22
```
- Click any segment to navigate up
- Overflow ellipsis on mobile
- Keyboard accessible

### Editor Components

#### Toolbar (Floating + Fixed)
**Fixed Toolbar (top):**
```
[Undo][Redo] | [Bold][Italic][Underline] | [H1][H2][H3] | 
[List▼][Table][Image][Link] | [Color▼][Highlight▼] | [AI▼] |
[More▼]
```

**Floating Toolbar (on text selection):**
```
[B][I][U][S] | [H1][H2] | [Link] | [Highlight▼] | [AI Rewrite▼]
```

**Handwriting Toolbar:**
```
[✏ Pen][✏ Pencil][🖌 Brush][◻️ Shape][⟨ Lasso][⬚ Eraser][↩ Undo][↪ Redo]
[Color: ●▼][Width: ══▼][Opacity: ▒▼] | [Layers][Templates]
```

#### Block Drag Handles
- Hover any block → ⠿ handle appears on left
- Drag to reorder
- Click → block options menu (delete, duplicate, move, turn into...)

#### Block Options Menu
```
Turn into → [Text][H1][H2][H3][Quote][Code][Callout]
Action    → [Duplicate][Delete][Copy][Cut]
Move      → [Move to notebook...][Copy to notebook...]
Comment   → [Add comment]
```

### Modal & Dialog Components

#### Command Palette (Cmd+K)
- Fuzzy search across all notes, notebooks, actions
- Recent actions at top
- Keyboard navigable (↑↓, Enter)
- Categories: Notes, Notebooks, Actions, Settings

#### Quick Note (Cmd+N)
- Minimal modal overlay
- Just title + content
- Auto-saves, dismisses on Escape or click outside

---

## Motion & Animation System

### Animation Principles
- **Purposeful:** Every animation has a reason
- **Fast:** Never > 300ms for UI responses
- **Consistent:** Same easing throughout app
- **Reducible:** Respects `prefers-reduced-motion`

### Easing Functions
```css
--ease-default:     cubic-bezier(0.25, 0.46, 0.45, 0.94);  /* Ease out */
--ease-spring:      cubic-bezier(0.175, 0.885, 0.32, 1.275); /* Bouncy */
--ease-anticipate:  cubic-bezier(0.36, 0, 0.66, -0.56);    /* Pull back then forward */
--ease-linear:      linear;
```

### Animation Tokens
```css
/* Duration */
--duration-instant: 50ms;
--duration-fast:    150ms;
--duration-base:    200ms;
--duration-slow:    300ms;
--duration-slower:  500ms;
--duration-slowest: 700ms;
```

### Key Animations
| Interaction | Animation | Duration | Easing |
|-------------|-----------|----------|--------|
| Sidebar open/close | Slide + fade | 200ms | ease-out |
| Modal appear | Scale 95%→100% + fade | 150ms | spring |
| Page switch | Crossfade | 200ms | ease-out |
| Note open | Slide right + fade | 200ms | ease-out |
| Delete note | Slide left + fade | 200ms | ease-in |
| Block insertion | Height expand + fade | 150ms | ease-out |
| Toast notification | Slide up from bottom | 250ms | spring |
| Hover states | Opacity/color change | 100ms | linear |
| Canvas stroke | Real-time (< 16ms) | — | — |
| Sync indicator spin | Rotate 360° | 1000ms loop | linear |

---

## Accessibility (WCAG 2.1 AA)

### Color Contrast
- All text: minimum 4.5:1 contrast ratio
- Large text: minimum 3:1 contrast ratio
- Interactive elements: minimum 3:1 against surroundings
- Tested with Figma Contrast plugin + axe-core

### Keyboard Navigation
- Full app navigable without mouse
- Visible focus indicators (not hidden)
- Tab order follows visual reading order
- Escape closes any modal/popup
- Arrow keys navigate lists and menus

### Screen Reader Support
- Semantic HTML (proper heading hierarchy)
- ARIA labels on all icon-only buttons
- ARIA live regions for dynamic content updates
- Announcements for: note saved, sync status, error messages

### Touch Targets
- Minimum 44×44px all interactive elements
- 8px spacing between adjacent targets
- Custom touch target extension via pseudo-elements

### Motor Accessibility
- Sticky keys support
- All drag-and-drop has keyboard alternative
- Hold-to-confirm on destructive actions
- Large cursor mode
- Simplified mode (reduces feature surface, larger UI)

---

## Micro-interactions (Detail Level)

| Element | Interaction | Visual Response |
|---------|-------------|-----------------|
| Note card (hover) | Mouse enter | Subtle lift (box-shadow deepens, 2px translate-y) |
| Button (press) | Click | Scale 0.97, instant |
| Checkbox (check) | Click | Bouncy checkmark draw animation |
| Toggle (switch) | Click | Smooth slide with spring physics |
| Sync icon | Syncing | Rotation animation with pulse |
| Toolbar button (active) | Activated | Color fill with scale animation |
| Drag handle (hover) | Mouse enter | Opacity 0→1, slight scale |
| Color picker (select) | Click | Ripple from selection point |
| Handwriting (stroke end) | Pen lift | Subtle ink settle animation |
| Page turn | Swipe | 3D page flip animation (optional) |
| Empty state | Load | Gentle float animation on illustration |

---

## App Icon & Brand Identity

### App Icon
- **Shape:** Rounded rectangle (standard iOS/Android icon)
- **Background:** Indigo gradient (#6366f1 → #4338ca)
- **Symbol:** Stylized pen nib / "I" letterform
- **Sizes:** 16×16, 32×32, 64×64, 128×128, 256×256, 512×512, 1024×1024

### Splash Screen
- Full screen indigo background
- App icon animation (draw → settle)
- Tagline fades in: "Write Freely. Think Clearly."
- Duration: 1.5 seconds max

### PWA Manifest
```json
{
  "name": "Ishu Notes",
  "short_name": "Ishu Notes",
  "description": "Write Freely. Think Clearly. Create Limitlessly.",
  "theme_color": "#6366f1",
  "background_color": "#0f1117",
  "display": "standalone",
  "orientation": "any",
  "start_url": "/",
  "scope": "/",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ],
  "shortcuts": [
    { "name": "New Note", "url": "/new", "icons": [{ "src": "/icons/shortcut-new.png" }] },
    { "name": "Search", "url": "/search", "icons": [{ "src": "/icons/shortcut-search.png" }] }
  ]
}
```
