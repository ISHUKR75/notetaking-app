# Ishu Notes — Responsive Design & Multi-Device Strategy

## Design Principle

One codebase. One codebase that feels **native** on every device. Not "works on mobile" — but truly optimized for every form factor: 4-inch phone, 13-inch iPad, 27-inch desktop. Each device gets a tailored experience.

---

## Device Breakpoints & Layouts

### 1. Small Mobile (< 640px) — Portrait Phone

```
┌─────────────────┐
│   TOP BAR       │  48px — Search + Menu + Sync
├─────────────────┤
│                 │
│   NOTE LIST     │  Full screen
│   (or EDITOR)   │  One panel at a time
│   (or SIDEBAR)  │  Navigate between panels
│                 │
├─────────────────┤
│ BOTTOM NAV BAR  │  56px
│ [📓][📝][🔍][👤] │  Tab navigation
└─────────────────┘
```

**Layout Details:**
- Single panel — tap to navigate deeper
- Bottom tab bar: Home, New Note, Search, Profile
- Floating action button: Quick new note
- Swipe back to navigate up
- Full-screen editor — no chrome visible while writing
- Toolbar: Compact, icon-only, scrollable horizontally
- Note list: Full width, comfortable touch targets (48px min)

**Gestures:**
- Swipe right → Back/previous panel
- Swipe down in editor → Minimize note (show peek)
- Long press note → Multi-select mode
- Pinch on canvas → Zoom
- Two-finger swipe → Pan canvas

---

### 2. Large Mobile (640–768px) — Phablet / Large Phone

Similar to small mobile but with slightly more room:
- Slightly wider toolbar with labels on some buttons
- Note list cards are slightly wider
- Can show 2 columns in grid view (vs 1 on small mobile)
- Floating sidebar (sheet from left edge)

---

### 3. Tablet Portrait (768–1024px) — iPad / Android Tablet

```
┌────────────────────────────────────┐
│           TOP BAR                  │  56px
├──────────┬─────────────────────────┤
│          │                         │
│ SIDEBAR  │      NOTE LIST          │
│ (240px)  │      or                 │
│ Collapsed│      EDITOR             │
│ by default│     (Full width)       │
│          │                         │
└──────────┴─────────────────────────┘
```

**Layout Details:**
- Sidebar: Hidden by default, slide in via hamburger button
- Content: Full width for note list OR editor (not both)
- Note list grid: 2 columns
- Toolbar: Full toolbar visible
- Handwriting: S-Pen / Apple Pencil optimized

---

### 4. Tablet Landscape (1024–1280px) — iPad Landscape, Small Laptop

```
┌──────────────────────────────────────────────────────┐
│                      TOP BAR                         │  56px
├──────────┬──────────────┬──────────────────────────── ┤
│          │              │                             │
│ SIDEBAR  │  NOTE LIST   │      EDITOR                 │
│ (60px    │  (280px)     │      (flex-1)               │
│ icon     │              │                             │
│ rail)    │              │                             │
│          │              │                             │
└──────────┴──────────────┴─────────────────────────────┘
```

**Layout Details:**
- Sidebar: Collapsed to icon rail (60px)
- Three-panel layout visible simultaneously
- Editor panel: Comfortable reading width (600–800px content)
- Note list: 1 column list view (default), toggle to grid
- Hover states active on all elements
- Keyboard shortcuts available and visible in tooltips

---

### 5. Desktop (1280–1536px) — Laptop, Standard Monitor

```
┌────────────────────────────────────────────────────────────────────┐
│                           TOP BAR                                  │  48px
├────────────┬──────────────────┬──────────────────────────────────── ┤
│            │                  │                                     │
│  SIDEBAR   │   NOTE LIST      │         EDITOR                      │
│  (260px)   │   (300px)        │         (flex-1)                    │
│  Full      │                  │                                     │
│  expanded  │  Sortable        │  Content max-width: 720px          │
│            │  Filterable      │  Centered in panel                  │
│  Libraries │  Searchable      │                                     │
│  Notebooks │                  │  Right panel (optional):            │
│  Tags      │                  │  AI Chat / Version History          │
│  Smart     │                  │  (300px, toggleable)                │
│  Folders   │                  │                                     │
└────────────┴──────────────────┴─────────────────────────────────────┘
```

**Layout Details:**
- Full three-panel layout
- Sidebar: Fully expanded with labels
- Editor: Comfortable prose width (72 chars / 720px max)
- Optional right panel: AI assistant, comments, version history
- Context menus everywhere (right-click)
- All keyboard shortcuts active
- Drag and drop for everything

---

### 6. Large Desktop (> 1536px) — Wide Monitor, 4K Display

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              TOP BAR                                             │
├────────────┬────────────────────┬────────────────────────────┬───────────────── ┤
│            │                    │                             │                  │
│  SIDEBAR   │   NOTE LIST        │         EDITOR              │  CONTEXT PANEL   │
│  (280px)   │   (340px)          │         (flex-1)            │  (320px)         │
│            │                    │   Content: max 800px        │                  │
│            │   2-column grid    │   Generous margins          │  AI Assistant    │
│            │   view by default  │                             │  or              │
│            │                    │                             │  Version History │
│            │                    │                             │  or              │
│            │                    │                             │  Collaborators   │
└────────────┴────────────────────┴─────────────────────────────┴──────────────────┘
```

---

## Touch vs Mouse/Keyboard Interaction Modes

### Auto-Detection
```typescript
// Detect input modality
const isTouch = window.matchMedia('(pointer: coarse)').matches;
const hasMouse = window.matchMedia('(hover: hover)').matches;
const hasStylusSupport = 'ontouchstart' in window;

// Apply different UX:
// Touch: Larger targets, swipe gestures, no hover states
// Mouse: Smaller targets, hover states, right-click menus
// Stylus: Palm rejection, pressure sensitivity, tilt support
```

### Touch-Specific UX
- All tap targets: minimum 44×44px
- No hover-dependent features
- Long press replaces right-click (context menu)
- Swipe gestures for navigation
- Pull-to-refresh for note list
- Scroll: Smooth momentum scrolling (iOS native feel)
- Haptic feedback on key actions (mobile)

### Mouse/Keyboard-Specific UX
- Hover states on all interactive elements
- Right-click context menus
- Cursor: Changes appropriately (text, crosshair, grab, etc.)
- Drag and drop everywhere
- Keyboard shortcuts with visible hints in tooltips
- Multi-select: Shift-click, Ctrl/Cmd-click range selection

---

## Stylus Optimization (Tablet)

### Supported Styluses
| Device | Stylus | Features |
|--------|--------|---------|
| iPad | Apple Pencil 1, 2, 3 | Pressure, tilt, hover |
| Samsung Galaxy Tab | S Pen | Pressure, tilt, hover, air actions |
| Microsoft Surface | Surface Pen | Pressure, tilt, eraser button |
| Generic Android | USI 2.0 Stylus | Pressure |
| Chromebook | USI 2.0 Stylus | Pressure |

### Stylus-Specific Features
- **Wrist rejection:** Active when stylus detected
- **Palm rejection zone:** Configurable width
- **Hover preview:** See cursor before stylus touches screen
- **Pressure curves:** Customize sensitivity (3 presets + custom)
- **Button mapping:** Side button → eraser or color picker
- **Air actions** (S-Pen): Wave gestures without touching screen
- **Haptic feedback:** Feel brush strokes (device support required)

---

## Safe Area & Notch Handling

```css
/* Handle iPhone notch and home bar */
.app-shell {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

/* Bottom navigation bar avoids home bar */
.bottom-nav {
  padding-bottom: max(env(safe-area-inset-bottom), 8px);
}

/* Full-screen canvas: must avoid unsafe areas */
.canvas-fullscreen {
  width: calc(100dvw - env(safe-area-inset-left) - env(safe-area-inset-right));
  height: calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom));
}
```

---

## Dynamic Viewport Height

```css
/* Use dvh instead of vh for mobile browser chrome */
.full-height {
  height: 100dvh;   /* Dynamic viewport height — excludes browser chrome */
  min-height: 100dvh;
}

/* Sidebar height accounts for mobile browser UI */
.sidebar {
  height: 100dvh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
```

---

## Split Screen Support

### iPad Split View
- App works in 1/4, 1/3, 1/2, 2/3, full screen
- Adapts layout based on available width
- 1/4 width → just note list, no sidebar
- 1/2 width → note list only or editor only
- 2/3 width → two panels (sidebar + list or list + editor)

### Android Split Screen
- Same adaptive layout as iPad split view
- Supports drag-and-drop between split apps

### Windows Snap Layouts
- Works in any window size down to 320px wide
- Snap Layouts integration (Windows 11)
- Title bar shows snap layout options

---

## Orientation Handling

```typescript
// Listen for orientation changes
screen.orientation.addEventListener('change', () => {
  const orientation = screen.orientation.type;
  // 'portrait-primary', 'landscape-primary', etc.

  if (orientation.includes('landscape') && isMobileDevice) {
    // Show simplified two-panel: list + editor
    // Hide sidebar (hamburger to open)
    setLayout('mobile-landscape');
  } else if (orientation.includes('portrait') && isMobileDevice) {
    // Single panel with bottom nav
    setLayout('mobile-portrait');
  }
});
```

### Canvas in Different Orientations
- Canvas auto-rotates content when device rotates
- Optional: Lock canvas orientation per notebook (good for templates)
- PDF imported pages: Respect original PDF orientation

---

## Performance for Each Device Class

### Low-End Mobile (2GB RAM, slow CPU)
- Reduce animation complexity (simpler easing, fewer animations)
- Disable canvas blur effects
- Limit note list virtualization overscan to 5 items
- Reduce max concurrent sync operations
- Simpler stroke rendering (no perfect-freehand, basic cubic Bezier)
- Detection: `navigator.deviceMemory < 4 || navigator.hardwareConcurrency < 4`

### Mid-Range Device (4GB RAM)
- Standard full feature set
- All animations enabled
- Full canvas rendering pipeline

### High-End Device (8GB+ RAM, powerful GPU)
- Enable extra effects: glass morphism, backdrop blur
- Higher canvas resolution (devicePixelRatio-aware)
- Prefetch more content (larger cache)
- Larger animation batches

```typescript
// Device tier detection
function getDeviceTier(): 'low' | 'mid' | 'high' {
  const memory = navigator.deviceMemory ?? 4;       // GB
  const cores = navigator.hardwareConcurrency ?? 4;

  if (memory >= 8 && cores >= 8) return 'high';
  if (memory >= 4 && cores >= 4) return 'mid';
  return 'low';
}
```

---

## Print Styles

```css
@media print {
  /* Hide app chrome */
  .sidebar, .toolbar, .bottom-nav, .header { display: none !important; }

  /* Show only note content */
  .note-content {
    max-width: none;
    margin: 0;
    padding: 0;
  }

  /* Page breaks between notes */
  .note-page { page-break-after: always; }

  /* Don't print backgrounds */
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  /* Force show URL for links */
  a[href]::after { content: " (" attr(href) ")"; }

  /* Canvas: Export as image */
  .canvas-layer { width: 100% !important; height: auto !important; }
}
```

---

## Tablet-Specific Features

### Apple Pencil Hover (Pencil Pro)
- Show cursor 12mm above screen
- Show color/tool preview before drawing
- Hover tap to change tool

### S-Pen Air Actions
- Swipe left: Previous page
- Swipe right: Next page
- Circle: Select tool
- Hold button: Eraser

### Stage Manager (iPadOS)
- App works as resizable window
- Multi-window: Open multiple notes simultaneously
- Drag notes between windows
- Each window remembers its own scroll position

### External Keyboard Support (iPad + Keyboard Folio)
- Full keyboard shortcut support
- Tab navigation between panels
- Arrow key navigation in note list
- Escape: Dismiss modals/drawers
- Return: Open selected note
