# Ishu Notes — Export & Import System

## Overview

Ishu Notes supports the most comprehensive export and import system of any note-taking app — ensuring zero vendor lock-in and maximum interoperability with every major format and platform.

---

## Export System

### Export Scope Options
1. **Single Note** — Export one page
2. **Multiple Notes** — Export selected notes as bundle
3. **Entire Notebook** — Export full notebook
4. **Section Export** — Export one section within a notebook
5. **Full Account Backup** — Complete data export with all libraries

---

## Export Formats

### 1. PDF Export (Most Important)

#### PDF Options
```
PDF Export Settings:
┌─────────────────────────────────────────────────────┐
│ Export: [Single Note ▼]                             │
│                                                     │
│ Page Size:     [A4 ▼] [Letter] [A3] [Custom...]   │
│ Orientation:   [Portrait ▼] [Landscape]            │
│ Margin:        [Normal ▼] [Narrow] [Wide] [None]   │
│                                                     │
│ Content:                                            │
│ ☑ Include handwriting                              │
│ ☑ Include typed text                               │
│ ☑ Include images                                   │
│ ☑ Include template/background                      │
│ ☐ Include comments                                  │
│ ☑ Include attachments list                         │
│                                                     │
│ Header/Footer:                                      │
│ ☑ Page numbers                                     │
│ ☐ Date exported                                    │
│ ☐ Note title in header                             │
│ ☐ Custom header/footer text                        │
│                                                     │
│ Quality: [High ▼] [Medium] [Low (smaller file)]   │
│                                                     │
│ Security:                                           │
│ ☐ Password protect PDF                             │
│ ☐ Prevent printing                                 │
│ ☐ Prevent copying text                             │
│                                                     │
│ [Cancel] ──────────────────── [Export PDF →]      │
└─────────────────────────────────────────────────────┘
```

#### PDF Types
- **Standard PDF** — All content as expected
- **PDF/A** — Archival format (ISO 19005 compliant)
- **Searchable PDF** — OCR layer for handwritten pages
- **Annotated PDF** — Comments embedded as PDF annotations
- **Interactive PDF** — Checkboxes remain interactive

---

### 2. Markdown Export (.md)

- Pure CommonMark Markdown output
- GitHub Flavored Markdown (GFM) option
- Handwriting exported as embedded PNG images
- Tables exported in GFM table syntax
- Images saved to `/assets/` subfolder
- Math blocks exported as LaTeX ($$...$$)
- Code blocks with language tags preserved
- YAML frontmatter option:
```yaml
---
title: Meeting Notes — June 22
created: 2026-06-22T10:30:00Z
modified: 2026-06-22T14:45:00Z
tags: [work, meeting, q2]
author: Ishu
---
```

---

### 3. HTML Export (.html)

- Self-contained single HTML file (images embedded as base64)
- Or: HTML + assets folder
- Styles included inline or as linked CSS
- Dark mode toggle in exported HTML
- Mobile responsive
- Print-friendly CSS
- All links preserved and clickable
- Syntax highlighting preserved

---

### 4. Microsoft Word (.docx)

- Full document with formatting preserved
- Headings mapped to Word styles
- Tables → Word tables
- Images embedded
- Lists → Word lists
- Bold/italic/underline preserved
- Handwriting → embedded image at position
- Code blocks → Word code style (Courier New)
- Comments → Word review comments (optional)

---

### 5. Plain Text (.txt)

- UTF-8 encoded plain text
- Heading markers preserved (or stripped)
- Tables converted to plain text grids
- Code blocks preserved with language comment
- Handwriting annotation: `[Handwritten content: {OCR text}]`
- Images: `[Image: {filename}]`

---

### 6. SVG Export (.svg)

- For handwriting pages: pure vector output
- Strokes exported as SVG paths
- Perfect quality at any zoom level
- Editable in Inkscape, Illustrator, Figma
- Text boxes as SVG text elements
- Templates as background SVG

---

### 7. PNG / JPEG Export

- Rasterized page export
- DPI options: 72, 150, 300, 600 dpi
- PNG: Transparent background option
- JPEG: Quality 60-100%
- WebP option for smaller file size
- Multi-page → ZIP of numbered images

---

### 8. Evernote Format (.enex)

- Compatible with Evernote import
- Preserves: Title, content, creation date, tags
- Images embedded in ENEX XML format
- Attachments included

---

### 9. Notion Format (JSON)

- Notion block structure JSON
- Can be reimported into Notion via API
- Preserves block types, properties, children

---

### 10. Obsidian Vault Export

- Markdown files in folder structure
- Backlinks preserved as `[[note title]]` syntax
- Tags preserved as `#tag` inline
- Images in `/attachments/` folder
- Compatible with Obsidian directly

---

### 11. LaTeX Export (.tex)

- Academic document format
- Headings → \section, \subsection
- Math blocks → LaTeX equations
- Tables → tabular environment
- Images → \includegraphics
- Code → lstlisting environment
- Bibliography support (BibTeX)

---

### 12. EPUB Export (.epub)

- eBook format for reading on Kindle, Apple Books
- Full book from notebook
- Chapter-per-page option
- Table of contents generated from headings
- Cover image customizable
- Author, publisher metadata fields
- EPUB 3.0 format (modern)

---

### 13. Ishu Notes Backup Format (.isnbak)

Proprietary lossless format (ZIP-based):
```
notebook-backup.isnbak (ZIP)
├── manifest.json          # Metadata and version
├── notes/
│   ├── {id}.json          # Note content (TipTap JSON)
│   └── {id}-strokes.json  # Stroke data
├── media/
│   ├── {media-id}.jpg
│   └── {media-id}.mp3
├── templates/
│   └── custom-template.png
└── settings.json          # User preferences
```

Features:
- 100% lossless — no data lost
- Can restore to any Ishu Notes account
- Encrypted backup option (AES-256-GCM)
- Incrementally updatable (only export changes)

---

### 14. CSV Export (For Database Views)

- Database pages exported as CSV
- All custom properties as columns
- Compatible with Excel, Google Sheets
- UTF-8 BOM encoding option for Excel compatibility

---

## Export in Bulk

### Batch Export UI
```
Select notes for export → Click "Export" → Choose format
     │
     ▼
For multiple notes:
  Each note → separate file (numbered)
  OR
  All notes → combined into one PDF/EPUB

For Markdown/HTML → ZIP file download
```

---

## Import System

### Supported Import Sources

#### 1. Notion
**Method:** Notion API (with authorization) or Notion ZIP export

Import Supports:
- All block types (text, headings, lists, tables, callouts, code, images)
- Page hierarchy (nested pages preserved)
- Database with all property types
- Tags and categories
- Attached files and images
- Page cover images and icons (emoji, custom)
- Creation and modification dates
- Comments (converted to Ishu Notes comments)

**Steps:**
1. Go to Settings → Import → Notion
2. Click "Connect Notion Account"
3. Select pages to import (or import all)
4. Choose target library/notebook
5. Monitor import progress

---

#### 2. Evernote (.enex)
- Export from Evernote as .enex file
- Import entire notebooks or selected notes
- Preserves: Content, tags, attachments, creation date
- Handwriting in Evernote: imported as image

---

#### 3. Apple Notes
- Export from Apple Notes as .zip
- Compatible with macOS Notes export
- Preserves: Text, lists, images, attachments, folders

---

#### 4. Google Keep
- Export from Google Takeout as JSON
- Preserves: Title, text, labels (tags), images, color
- Lists → Checklist blocks

---

#### 5. Obsidian Vault
- Drag and drop vault folder OR select folder
- Markdown files → Rich text notes
- `[[wikilinks]]` → Ishu Notes backlinks
- `#tags` → Ishu Notes tags
- `/attachments/` folder → Media library
- Folder structure → Library/Notebook hierarchy

---

#### 6. OneNote
- Import from OneNote via Microsoft account
- OR import exported OneNote packages (.onepkg)
- Preserves: Sections, pages, text, images, ink

---

#### 7. Bear Notes
- Import Bear backup files (.bearbak)
- Markdown with Bear extensions supported
- Bear-specific tags preserved

---

#### 8. Plain Markdown Files
- Individual .md files or ZIP of .md files
- Auto-detect frontmatter (YAML, TOML)
- Map frontmatter fields to note properties
- Images referenced relatively → imported to media library

---

#### 9. Word Documents (.docx)
- Headers → Heading blocks
- Tables → Table blocks
- Lists → List blocks
- Images → Embedded images
- Comments → Note comments
- Track changes: Show as version history

---

#### 10. PDF Documents
- PDF imported as annotatable document
- OCR text extracted (if enabled)
- Each PDF page → one canvas page
- Existing PDF annotations → preserved as canvas strokes

---

#### 11. Images (with OCR)
- JPG, PNG, WebP, HEIC, GIF
- OCR extracts text (optional)
- Creates note with image + extracted text
- Batch image import → creates note per image or combined note

---

## Import Progress UI

```
Importing from Notion (47 pages)...

[████████████████░░░░░░░░░░░░░░] 53%

  ✅ Project Overview
  ✅ Meeting Notes (12 sub-pages)
  🔄 Research Database (importing...)
  ⏳ Design Assets (waiting...)

Estimated time remaining: 2 minutes

[Cancel] ────────────────── [Import in Background]
```

---

## Migration Safety

### Before Import
- Estimate storage space required
- Preview first 5 notes before full import
- Warn about unsupported features
- Option to create new library vs. import into existing

### During Import
- Non-blocking: Continue using app while import runs
- Checkpointing: Resume interrupted imports
- Error log: Track any notes that failed to import

### After Import
- Summary report: X notes imported, Y failed, Z skipped
- Failed imports: Download error log with reasons
- Undo import: Revert entire import within 24 hours
