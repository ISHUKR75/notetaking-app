---
name: Note editor architecture
description: How the note editor [id].tsx is structured and its key patterns
---

The note editor (`app/notes/[id].tsx`) has three view modes:
- `edit` — TextInput-based writing with format bar
- `preview` — Custom native markdown renderer (no deps, pure RN)
- `draw` — DrawingCanvas + PenToolbar

**Markdown renderer** is a custom `renderMarkdownLine` function — no third-party markdown lib needed. Handles: h1/h2/h3, bold, italic, underline, strikethrough, code, blockquote, checkboxes, bullets, numbered lists, HR.

**Focus mode** hides the header, format bar, and status bar — only the title and content are visible. Togglable from the "..." more menu.

**Why:** Native markdown libs add significant bundle size and have web compatibility issues. The custom renderer is fast, fully controllable, and works on all platforms.

**How to apply:** When adding new markdown elements, add a new branch in `renderMarkdownLine`. The preview component is `MarkdownPreview` at the top of [id].tsx.
