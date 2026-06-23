# Ishu Notes — Custom Themes & Personalization

## Philosophy

Your note-taking app should feel like *yours*. Ishu Notes lets you customize everything — from accent colors and typography to canvas paper textures and icon styles — so the app matches your personality and workflow.

---

## Theme System

### Built-In Themes

| Theme Name | Base | Accent | Feel |
|-----------|------|--------|------|
| **Indigo Dream** (Default) | White / Gray-950 | #6366f1 Indigo | Modern, clean |
| **Midnight** | Gray-950 | #818cf8 Soft Indigo | Deep dark mode |
| **Rose Gold** | Warm white | #f43f5e Rose | Elegant, warm |
| **Forest** | Warm white | #22c55e Green | Nature, calm |
| **Ocean** | Cool white | #0ea5e9 Sky Blue | Fresh, focused |
| **Sunset** | Warm white | #f97316 Orange | Energetic |
| **Lavender** | Light purple tint | #a855f7 Purple | Soft, creative |
| **Monochrome** | White | #374151 Dark Gray | Distraction-free |
| **Sepia** | Warm paper | #92400e Brown | Classic paper |
| **Noir** | Pure black | #e5e7eb Light Gray | OLED battery saver |
| **Sakura** | Soft pink | #ec4899 Pink | Playful |
| **Mint** | Fresh white | #14b8a6 Teal | Productivity |
| **Charcoal** | Gray-800 | #6366f1 Indigo | Dark + color |
| **Solarized Dark** | #002b36 | #268bd2 | Developer classic |
| **Nord** | #2e3440 | #88c0d0 | Nordic minimal |
| **Dracula** | #282a36 | #bd93f9 | Developer favorite |
| **Catppuccin Mocha** | #1e1e2e | #cba6f7 | Aesthetic dark |
| **Gruvbox Dark** | #282828 | #fabd2f Yellow | Retro warm |

### Theme Application Scope
Each theme controls:
- Background colors (app shell, cards, modals)
- Text colors (primary, secondary, muted, placeholder)
- Accent color (buttons, links, active states, highlights)
- Border colors
- Shadow styles
- Canvas paper color
- Input backgrounds
- Sidebar colors
- Scrollbar styling

---

## Custom Theme Builder (Pro)

### Theme Builder UI

```
Settings → Appearance → Custom Themes → [Create Theme]

┌─────────────────────────────────────────────────────────────────┐
│  🎨 Create Custom Theme                              [Save]     │
├──────────────────────┬──────────────────────────────────────────┤
│                      │  PREVIEW                                 │
│  COLORS              │  ┌─────────────────────────────────────┐ │
│                      │  │ Sidebar  │  Note List  │  Editor   │ │
│  Background:         │  │          │             │           │ │
│  [████] #ffffff      │  │ 📝 Note 1│ Note Title  │ # Heading │ │
│                      │  │ 📝 Note 2│ excerpt...  │ Body text │ │
│  Surface:            │  │ 📝 Note 3│             │ **bold**  │ │
│  [████] #f8fafc      │  └─────────────────────────────────────┘ │
│                      │                                          │
│  Accent:             │  BASE                                    │
│  [████] #6366f1      │    [○] Light    [●] Dark   [○] Auto     │
│                      │                                          │
│  Text Primary:       │  FONT                                    │
│  [████] #1e293b      │    [Inter ▼]    Size: [16px ▼]          │
│                      │                                          │
│  Text Secondary:     │  CANVAS PAPER                            │
│  [████] #64748b      │    [○] White  [●] Cream  [○] Gray       │
│                      │    [○] Black  [○] Custom color           │
│  Border:             │                                          │
│  [████] #e2e8f0      │  BORDER RADIUS                           │
│                      │    Compact [──●──────] Rounded           │
│  [+ Add color var]   │                                          │
└──────────────────────┴──────────────────────────────────────────┘

  Name: [My Custom Theme_______]

  [Preview on device]     [Export theme]     [Cancel]   [Save]
```

### CSS Variables System

```css
/* Each theme is a set of CSS variables */
:root[data-theme="custom-user-abc"] {
  --color-background:        #ffffff;
  --color-surface:           #f8fafc;
  --color-surface-raised:    #ffffff;
  --color-surface-overlay:   rgba(255,255,255,0.95);

  --color-accent:            #6366f1;
  --color-accent-hover:      #4f46e5;
  --color-accent-muted:      #e0e7ff;
  --color-accent-fg:         #ffffff;

  --color-text-primary:      #1e293b;
  --color-text-secondary:    #64748b;
  --color-text-muted:        #94a3b8;
  --color-text-placeholder:  #cbd5e1;
  --color-text-inverse:      #ffffff;

  --color-border:            #e2e8f0;
  --color-border-strong:     #cbd5e1;

  --color-danger:            #ef4444;
  --color-warning:           #f59e0b;
  --color-success:           #22c55e;
  --color-info:              #3b82f6;

  --radius-sm:               4px;
  --radius-md:               8px;
  --radius-lg:               12px;
  --radius-xl:               16px;
  --radius-full:             9999px;

  --shadow-sm:               0 1px 2px rgba(0,0,0,0.05);
  --shadow-md:               0 4px 6px rgba(0,0,0,0.07);
  --shadow-lg:               0 10px 15px rgba(0,0,0,0.10);

  --font-family-sans:        'Inter', system-ui, sans-serif;
  --font-family-serif:       'Lora', Georgia, serif;
  --font-family-mono:        'JetBrains Mono', monospace;
  --font-family-handwriting: 'Caveat', cursive;

  --canvas-paper-color:      #fffef9;
  --canvas-line-color:       #e5e7eb;
  --canvas-dot-color:        #d1d5db;
}
```

---

## Typography Customization

### Font Families Available

**Sans-serif (Default):**
- Inter (default — great legibility)
- Plus Jakarta Sans (modern, slightly rounded)
- DM Sans (friendly, geometric)
- Nunito (rounded, soft)
- Poppins (geometric, modern)
- Outfit (clean, minimal)

**Serif:**
- Lora (elegant, literary)
- Playfair Display (classic editorial)
- Source Serif 4 (readable, scholarly)
- Merriweather (excellent for long reading)

**Monospace (for code blocks):**
- JetBrains Mono (default for code)
- Fira Code (ligatures)
- Cascadia Code (Microsoft, ligatures)
- Source Code Pro

**Handwriting:**
- Caveat (natural handwriting)
- Dancing Script (elegant script)
- Patrick Hand (print handwriting)
- Architects Daughter (casual)
- Kalam (Indian-style handwriting)

**Dyslexia-Friendly:**
- OpenDyslexic
- Lexie Readable
- Atkinson Hyperlegible

### Font Size & Spacing

```
Text Size:
  XS (12px) | S (14px) | M (16px) ← default | L (18px) | XL (20px) | XXL (24px)

Line Height:
  Tight (1.3) | Normal (1.6) ← default | Relaxed (1.8) | Loose (2.0)

Letter Spacing:
  Tight (-0.05em) | Normal (0) ← default | Wide (0.05em) | Wider (0.1em)

Paragraph Spacing:
  Small (0.5em) | Medium (1em) ← default | Large (1.5em) | XL (2em)
```

---

## Icon Packs (App Icons)

### Alternate App Icons (iOS 10.3+ and Android)

```
Available App Icons:
  ✏️ Classic (default indigo pen)
  🖊️ Fountain (dark, elegant)
  📒 Notebook (green notebook)
  ⭐ Gold (premium gold accent)
  🌙 Night (dark moon)
  🌸 Blossom (pink sakura)
  🔮 Crystal (glass effect)
  🎨 Artist (paint palette)
  💎 Diamond (black diamond)
  🌿 Minimal (white + green dot)
```

Change in: Settings → Appearance → App Icon

---

## Canvas Customization

### Paper Templates (100+)

**Blank:**
- Pure white
- Cream / off-white (warm)
- Gray (low-eye-strain)
- Black (OLED)

**Lined:**
- College ruled (narrow lines)
- Wide ruled (wider lines)
- Feint ruled (very faint lines)
- Dot grid (dots at 5mm intervals)
- Isometric dot grid (for 3D drawing)

**Grid:**
- Small grid (5mm squares)
- Large grid (10mm squares)
- Engineering grid (1mm + 5mm major)
- Hexagonal grid
- Triangular grid

**Specialized:**
- Cornell Notes (lecture format with margin)
- Bullet Journal (dotted + monthly/weekly)
- Music staff (5-line music staves)
- Comic panels (6 panel layout)
- Storyboard (film/animation panels)
- Kanban columns (3-column task board)
- Mind map (radial lines from center)
- Calendar (monthly/weekly view)
- Reading log (book title, date, notes)
- Fitness log (workout + diet tracking)
- Recipe template
- Budget template
- Language learning (vocab table)
- Chemistry molecular grid
- Architectural blueprint grid
- Project Gantt chart template

### Custom Paper Upload (Pro)
- Upload any image as paper background
- PDF page as background (for forms)
- Set opacity of background (so ink is visible)

---

## UI Density Settings

```
Layout Density:
  [●] Comfortable   Large spacing, easier on eyes
  [ ] Standard      Default balanced spacing
  [ ] Compact       More notes visible, tighter spacing

Note Card Style:
  [●] Default       Title + excerpt + metadata
  [ ] Minimal       Title only
  [ ] Rich          Title + excerpt + tags + preview image

Sidebar Width:
  Narrow [───●─────────────] Wide
```

---

## Theme Sharing & Import/Export

### Export Theme
```json
{
  "version": 1,
  "name": "My Purple Dream",
  "author": "Ishu",
  "colors": {
    "background": "#f5f0ff",
    "accent": "#7c3aed"
  },
  "font": "Poppins",
  "radius": "rounded",
  "paper": "#faf8ff"
}
```
Exported as `.isntheme` file — shareable via URL or file.

### Community Theme Gallery (Pro)
- Browse and install themes made by other users
- Rate and favorite themes
- Submit your own themes
- Featured themes curated by team
