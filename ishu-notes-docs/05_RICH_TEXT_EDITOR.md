# Ishu Notes — Rich Text Editor System

## Overview

The rich text editor is built on TipTap 2 (backed by ProseMirror), providing a powerful block-based editing experience that rivals Notion while remaining fast, offline-capable, and mobile-friendly.

---

## Editor Modes

### 1. WYSIWYG Mode (Default)
- Visual editing — what you see is what you get
- Toolbar-based formatting
- Click-to-edit inline elements
- Drag-and-drop blocks

### 2. Markdown Mode
- Live markdown rendering as you type
- Syntax shortcuts: `**bold**`, `_italic_`, `# heading`, etc.
- Toggle between raw markdown and rendered view
- Full CommonMark + GFM compatibility

### 3. Distraction-Free Mode
- Hides all chrome — just the text
- Minimal floating toolbar appears on selection
- Focus mode highlights active paragraph (dims others)
- Typewriter mode: active line always centered

### 4. Split Mode
- Left: Markdown source
- Right: Rendered preview
- Synchronized scrolling

---

## Block Types (Notion-Inspired + Extended)

### Text Blocks
| Block Type | Shortcut | Description |
|------------|----------|-------------|
| Paragraph | Default | Standard text block |
| Heading 1 | `# ` + space | Large heading |
| Heading 2 | `## ` + space | Medium heading |
| Heading 3 | `### ` + space | Small heading |
| Heading 4 | `#### ` + space | Smaller heading |
| Heading 5 | `##### ` + space | Even smaller |
| Heading 6 | `###### ` + space | Smallest heading |
| Quote | `> ` + space | Block quotation |
| Callout | `/callout` | Info/Warning/Tip/Danger styled box |
| Code Block | ` ``` ` + enter | Syntax-highlighted code |
| Math Block | `/math` or `$$` | LaTeX equation (KaTeX rendering) |
| Inline Math | `$` formula `$` | Inline LaTeX formula |
| Horizontal Rule | `---` + enter | Divider line |

### List Blocks
| Block Type | Shortcut | Description |
|------------|----------|-------------|
| Bullet List | `- ` + space | Unordered list |
| Numbered List | `1. ` + space | Ordered list |
| Checklist | `[] ` + space | Interactive checkboxes |
| Toggle List | `/toggle` | Collapsible nested content |
| Task List | `/task` | Checklist with assignees and due dates |
| Nested Lists | Tab / Shift+Tab | Up to 10 nesting levels |

### Media Blocks
| Block Type | Command | Description |
|------------|---------|-------------|
| Image | `/image` | Upload or embed image |
| Video | `/video` | Upload or YouTube/Vimeo embed |
| Audio | `/audio` | Voice note or audio file |
| File | `/file` | Attach any file type |
| Drawing | `/draw` | Inline handwriting canvas |
| Embed | `/embed` | iFrame embed (YouTube, Figma, CodePen) |
| Gallery | `/gallery` | Multi-image grid layout |
| Carousel | `/carousel` | Swipeable image slideshow |

### Structural Blocks
| Block Type | Command | Description |
|------------|---------|-------------|
| Divider | `/divider` | Visual horizontal separator |
| Columns | `/columns` | 2 or 3 column layout |
| Table | `/table` | Fully-featured data table |
| Database | `/database` | Notion-style database view |
| Kanban Board | `/kanban` | Card-based task board |
| Calendar | `/calendar` | Monthly/weekly calendar view |
| Timeline | `/timeline` | Horizontal timeline with events |
| Mind Map | `/mindmap` | Interactive mind map canvas |

### Reference Blocks
| Block Type | Command | Description |
|------------|---------|-------------|
| Link Preview | Paste URL | Auto-unfurl rich link cards |
| Note Reference | `@` + note name | Embed reference to another note |
| Mention | `@` + person | Mention a collaborator |
| Tag | `#` + tag name | Add searchable tag |
| Bookmark | `/bookmark` | Save URL with preview thumbnail |
| Table of Contents | `/toc` | Auto-generated from headings |
| Backlinks | Auto | Auto-shows what links to this note |

---

## Text Formatting

### Inline Formatting
| Format | Keyboard | Markdown | Description |
|--------|----------|----------|-------------|
| **Bold** | Ctrl+B | `**text**` | Bold weight |
| *Italic* | Ctrl+I | `_text_` | Italic style |
| ~~Strikethrough~~ | Ctrl+Shift+S | `~~text~~` | Strikethrough |
| `Code` | Ctrl+` | `` `text` `` | Inline monospace code |
| Underline | Ctrl+U | (no markdown) | Underline |
| Superscript | Ctrl+. | `text^1^` | Superscript notation |
| Subscript | Ctrl+, | `text~1~` | Subscript notation |
| Highlight | Ctrl+H | `==text==` | Text highlight (12 colors) |
| Comment | Ctrl+Alt+C | (no markdown) | Inline annotation |
| Link | Ctrl+K | `[text](url)` | Hyperlink |
| Spoiler | (menu only) | `||text||` | Hidden until clicked |
| Small Caps | (menu only) | (no markdown) | Small capitals |

### Text Colors
- **Foreground Colors:** 16 preset colors + custom color picker (full HSL/RGB/HEX)
- **Background Colors (Highlight):** 12 highlight colors
- **Gradient Text:** Start color → End color (premium feature)

### Font Options
- **Font Family:** System fonts + Google Fonts integration (1,000+ fonts)
  - Default: Inter (clean sans-serif)
  - Serif: Merriweather, Lora, Playfair Display
  - Monospace: Fira Code, JetBrains Mono, Source Code Pro
  - Handwritten: Caveat, Dancing Script, Pacifico
  - Custom: Upload any .woff2 font file
- **Font Size:** 8px — 120px (or type any value)
- **Line Height:** 1.0 — 3.0 (0.1 increments)
- **Letter Spacing:** -5px — +20px
- **Text Align:** Left, Center, Right, Justify, Distribute
- **Text Direction:** LTR, RTL (full Arabic/Hebrew support)

---

## Table System (Advanced)

### Table Features
- Create: `/table` then specify rows × columns (up to 50×50)
- **Cell Operations:**
  - Merge cells (multi-select → merge)
  - Split cells
  - Add/remove rows (before/after)
  - Add/remove columns (left/right)
- **Cell Formatting:**
  - Background color per cell
  - Text alignment per cell
  - Bold/italic header row
  - Borders: None / Inner / Outer / All / Custom
- **Data Operations:**
  - Sort by column (A-Z, Z-A, numeric)
  - Filter rows by cell value
  - Freeze first row/column
  - Resize columns (drag header edge)
- **Export:** Copy as Markdown table, export to CSV, export to Excel

---

## Code Block System

### Supported Languages (200+ via CodeMirror 6)
- JavaScript, TypeScript, JSX, TSX
- Python, Ruby, Go, Rust, Java, Kotlin
- C, C++, C#, Swift, Objective-C
- HTML, CSS, SCSS, Less, PostCSS
- SQL, GraphQL, JSON, YAML, TOML, XML
- Shell/Bash, PowerShell, Zsh
- Markdown, LaTeX, Dockerfile
- And 180+ more...

### Code Block Features
- **Syntax Highlighting** with 20+ themes (Dracula, Nord, Monokai, GitHub, VS Code, One Dark, etc.)
- **Line Numbers** toggle
- **Copy Button** (one-click copy all code)
- **Run Button** (for JavaScript — executes in sandboxed iframe)
- **Language Auto-detection** (when no language specified)
- **Word Wrap** toggle
- **Diff View** (show added/removed lines)
- **Line Highlighting** (e.g., highlight line 3-5 as important)

---

## Mathematical Expressions (KaTeX)

### Inline Math
Type `$` formula `$` → renders inline LaTeX

### Block Math
Type `$$` on new line → full-width equation block

### Supported KaTeX Functions
- Fractions, roots, exponents, integrals
- Matrices and vectors
- Greek letters (α, β, γ, Σ, Π, etc.)
- Mathematical operators (≤, ≥, ≠, ∞, ∂, ∇, etc.)
- Aligned equations
- Case expressions
- Physics and chemistry notation
- Full KaTeX v0.16 support

### Math Toolbar
- Symbol picker (click to insert)
- Template library (common formulas)
- Equation history (recently used)
- Export as PNG image

---

## Slash Command Menu

When user types `/` on a new line, show searchable command menu:

```
/  ──► [ Search blocks... ]

Recently Used:
  📝 Text      • Basic paragraph
  📋 Checklist • Todo list
  🖼 Image     • Upload image

Text Blocks:
  H1, H2, H3, H4, H5, H6
  Quote, Callout, Code, Math

Lists:
  Bullet, Numbered, Checklist, Toggle, Task

Media:
  Image, Video, Audio, File, Drawing, Embed, Gallery

Structure:
  Table, Columns, Divider, Database, Kanban, Calendar

Advanced:
  TOC, Mind Map, Timeline, Graph, Formula
```

---

## Clipboard & Paste Handling

### Smart Paste
- **Plain text:** Paste as-is, preserving whitespace
- **Rich text (from Word/Google Docs):** Convert to blocks, preserve formatting
- **Markdown:** Auto-convert to visual blocks
- **URL:** Offer choices: plain URL / rich link card / embed
- **Image:** Paste directly from clipboard
- **Table (Excel/Sheets):** Convert to table block
- **Code:** Detect language and create code block
- **HTML:** Sanitize and convert to blocks

---

## Mentions & References System

### @Mentions
- `@person` — mention a collaborator (sends notification)
- `@note` — link to another note (creates backlink)
- `@date` — insert formatted date or date picker
- `@page` — reference a specific page in a notebook

### #Tags System
- Type `#` followed by tag name
- Auto-complete from existing tags
- Create new tags inline
- Tags are searchable and filterable
- Tag cloud view in sidebar
- Tag hierarchy (parent/child tags via `#category/subcategory`)

---

## Editor Keyboard Shortcuts (Full List)

### Formatting
| Action | Shortcut |
|--------|----------|
| Bold | Ctrl/Cmd + B |
| Italic | Ctrl/Cmd + I |
| Underline | Ctrl/Cmd + U |
| Strikethrough | Ctrl/Cmd + Shift + S |
| Inline code | Ctrl/Cmd + ` |
| Highlight | Ctrl/Cmd + H |
| Link | Ctrl/Cmd + K |
| Superscript | Ctrl/Cmd + . |
| Subscript | Ctrl/Cmd + , |
| Clear formatting | Ctrl/Cmd + \ |

### Blocks
| Action | Shortcut |
|--------|----------|
| Heading 1 | Ctrl/Cmd + Alt + 1 |
| Heading 2 | Ctrl/Cmd + Alt + 2 |
| Heading 3 | Ctrl/Cmd + Alt + 3 |
| Bullet list | Ctrl/Cmd + Shift + 8 |
| Numbered list | Ctrl/Cmd + Shift + 7 |
| Checklist | Ctrl/Cmd + Shift + 9 |
| Code block | Ctrl/Cmd + Alt + C |
| Quote | Ctrl/Cmd + Shift + > |
| Divider | --- + Enter |

### Navigation
| Action | Shortcut |
|--------|----------|
| Find | Ctrl/Cmd + F |
| Find & Replace | Ctrl/Cmd + H |
| Go to line | Ctrl/Cmd + G |
| Select all | Ctrl/Cmd + A |
| Duplicate block | Ctrl/Cmd + D |
| Move block up | Alt + Shift + ↑ |
| Move block down | Alt + Shift + ↓ |
| Indent | Tab |
| Outdent | Shift + Tab |
