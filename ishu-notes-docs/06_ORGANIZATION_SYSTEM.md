# Ishu Notes — Organization & Management System

## Overview

A powerful, flexible organization system that combines the folder hierarchy of Apple Notes, the database views of Notion, and the tagging power of NoteWise — all working seamlessly offline and online.

---

## Structural Hierarchy

```
Workspace (User Account)
└── Libraries (top-level containers)
    ├── Personal Library
    ├── Work Library
    ├── School Library
    └── [Custom Libraries...]
        └── Notebooks (collections of pages/notes)
            ├── Notebook: Math Class
            ├── Notebook: Meeting Notes
            └── [Custom Notebooks...]
                └── Sections (optional grouping within notebook)
                    ├── Section: Chapter 1
                    └── [Custom Sections...]
                        └── Pages (individual notes)
                            ├── Page 1
                            ├── Page 2
                            └── [Unlimited Pages...]
```

### Nesting Depth
- Libraries: Up to 10 per account (free: 3)
- Notebooks per Library: Unlimited
- Sections per Notebook: Unlimited
- Pages per Section: Unlimited
- Nesting: Up to 10 levels of page-within-page (Notion-style)

---

## Notebook Features

### Notebook Properties
```typescript
interface Notebook {
  id: string;
  title: string;
  description: string;
  coverImage: string | null;    // Photo or gradient
  coverColor: string;           // Solid color option
  coverEmoji: string;           // Emoji icon
  defaultTemplate: PageTemplate;
  pageSize: PageSize;           // A4, A5, Letter, Custom
  pageOrientation: 'portrait' | 'landscape';
  tags: string[];
  isShared: boolean;
  sharePermission: 'view' | 'comment' | 'edit';
  isLocked: boolean;
  lockType: 'pin' | 'password' | 'biometric';
  sortOrder: 'manual' | 'created' | 'modified' | 'alphabetical';
  viewMode: 'continuous' | 'paginated' | 'grid';
  createdAt: Date;
  modifiedAt: Date;
  pageCount: number;
  wordCount: number;
  isFavorite: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  color: NoteColor;             // Color coding for sidebar
  parentLibraryId: string;
}
```

### Notebook Views

#### 1. Page Grid View (GoodNotes-style)
- Thumbnail preview of each page
- Multi-select for bulk operations
- Drag to reorder pages
- Right-click context menu

#### 2. Page List View (Apple Notes-style)
- Page title, modified date, preview text
- Search within notebook
- Sort by modified, created, alphabetical

#### 3. Continuous Scroll View
- All pages scrolled vertically like one long document
- Page separators with page numbers
- Jump to page via mini-map on right

#### 4. Presentation View
- Full-screen page display
- Navigate with swipe or arrow keys
- Laser pointer tool
- Annotation overlay

---

## Smart Folders / Collections (Apple Notes-style)

### Built-in Smart Folders
| Name | Filter Criteria |
|------|----------------|
| All Notes | Every note in all libraries |
| Recent | Modified in last 7 days |
| Flagged | Notes with flag/star marker |
| Pinned | Pinned notes |
| Shared With Me | Notes others shared |
| With Attachments | Notes containing files/images |
| With Handwriting | Notes with canvas strokes |
| Locked | Password-protected notes |
| Archived | Archived notes |
| Trash | Recently deleted (30-day retention) |
| Today's Notes | Created today |

### Custom Smart Folders
Build complex filters:
```
Filter Builder:
┌─────────────────────────────────────┐
│ Show notes where:                   │
│                                     │
│ [Tag] [is] [Work] [AND]             │
│ [Modified] [after] [7 days ago] [AND│
│ [Has attachment] [is] [true]        │
│                                     │
│ Sort by: [Modified ▼] [Descending ▼]│
└─────────────────────────────────────┘
```

**Available Filter Properties:**
- Title (contains, starts with, ends with, regex)
- Content (full-text search)
- Tag (is, is not, contains any, contains all)
- Created date (before, after, between)
- Modified date (before, after, between)
- Notebook (is, is not)
- Library (is, is not)
- Has attachment (true/false)
- Has handwriting (true/false)
- Has audio (true/false)
- Is shared (true/false)
- Is locked (true/false)
- Is flagged (true/false)
- Word count (greater than, less than)
- Character count
- Author (for collaboration)

---

## Tagging System

### Tag Structure
```
Tags:
├── work
│   ├── work/meeting
│   ├── work/project-alpha
│   └── work/follow-up
├── personal
│   ├── personal/journal
│   └── personal/health
├── study
│   ├── study/math
│   └── study/physics
└── #urgent (special flag)
```

### Tag Features
- **Inline Tagging:** Type `#tagname` anywhere in note
- **Auto-complete:** Shows existing tags as you type
- **Bulk Tagging:** Select multiple notes → add/remove tags
- **Tag Colors:** 20 color options per tag
- **Tag Emoji:** Assign emoji to any tag
- **Nested Tags:** Unlimited nesting with `/` separator
- **Tag Rename:** Renames across all notes instantly
- **Tag Merge:** Merge two tags into one
- **Tag Delete:** With confirmation, removes from all notes
- **Tag Statistics:** Count of notes per tag
- **Tag Cloud View:** Visual bubble chart of tag usage

---

## Note Properties & Metadata

### Core Properties (all notes)
```typescript
interface Note {
  // Identity
  id: string;
  title: string;
  
  // Content
  contentType: 'rich-text' | 'handwriting' | 'mixed' | 'voice';
  bodyJson: object;       // TipTap JSON content
  strokes: Stroke[];      // Handwriting strokes
  
  // Organization
  notebookId: string;
  sectionId: string | null;
  parentNoteId: string | null;  // For nested pages
  position: number;             // Manual sort order
  tags: string[];
  
  // Status
  isFlagged: boolean;
  isPinned: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  isLocked: boolean;
  isFavorite: boolean;
  
  // Visual
  color: NoteColor;           // 12 color options
  emoji: string | null;       // Custom emoji icon
  coverImage: string | null;  // Custom cover image
  
  // Dates
  createdAt: Date;
  modifiedAt: Date;
  viewedAt: Date;
  trashedAt: Date | null;
  
  // Statistics
  wordCount: number;
  charCount: number;
  readingTime: number;        // Minutes
  strokeCount: number;
  mediaCount: number;
  
  // Collaboration
  ownerId: string;
  collaborators: Collaborator[];
  lastEditedBy: string;
  
  // Sync
  version: number;
  syncVector: VectorClock;
  deviceId: string;
}
```

### Custom Properties (Notion-style Databases)
When note is in a Database:
| Property Type | Description |
|--------------|-------------|
| Text | Single/multi-line text |
| Number | Integer or decimal with unit |
| Select | Single choice from options |
| Multi-Select | Multiple choices |
| Checkbox | Boolean true/false |
| Date | Date and optional time |
| Date Range | Start and end date |
| Person | Mention a collaborator |
| URL | Hyperlink |
| Email | Email address |
| Phone | Phone number |
| Formula | Calculated field (like spreadsheet) |
| Relation | Link to another database |
| Rollup | Aggregate related records |
| Created Time | Auto-timestamp |
| Last Edited Time | Auto-timestamp |
| Created By | Auto-author |
| Last Edited By | Auto-author |
| File | Attached file |
| Rating | 1-5 star rating |
| Progress | 0-100% slider |

---

## Database Views (Notion-inspired)

Each database can have multiple views simultaneously:

### 1. Table View
- Spreadsheet-like grid
- Sort by any column
- Filter rows
- Group by property
- Sum/count/avg for numeric columns
- Resize columns
- Freeze columns
- Hide/show columns

### 2. Board View (Kanban)
- Cards grouped by Select property
- Drag between columns
- Collapse columns
- Count per column
- WIP limits
- Card color by property

### 3. Gallery View
- Card with cover image thumbnail
- Masonry or grid layout
- Show/hide properties
- Custom card size

### 4. List View
- Minimal one-line per item
- Expandable rows
- Quick edit inline
- Compact or comfortable density

### 5. Calendar View
- Monthly / Weekly / Daily
- Events from Date property
- Drag to reschedule
- Multi-day events

### 6. Timeline View (Gantt-style)
- Horizontal timeline
- Date range bars
- Grouping
- Dependencies (arrows between tasks)
- Today line indicator

### 7. Graph / Network View (NoteWise-inspired)
- Notes as nodes
- Links as edges
- Interactive pan + zoom
- Color by tag or notebook
- Cluster by similarity

---

## Search System

### Search Capabilities
1. **Full-Text Search** — Searches note title + body content
2. **Tag Search** — `#tagname` in search bar
3. **Property Search** — `author:John`, `created:today`
4. **Handwriting OCR Search** — Searches recognized handwriting text
5. **Semantic Search** (AI) — "find notes about project planning" → finds conceptually similar notes
6. **Regex Search** — `/pattern/` syntax for power users

### Search Filters
```
Advanced Search Panel:
┌─────────────────────────────────────────────┐
│ 🔍 [search query here                      ] │
│                                             │
│ In: [All Libraries ▼]  [All Notebooks ▼]   │
│ Type: [All ▼]  Has: [Any content ▼]        │
│ Date: [Any time ▼]  Author: [Anyone ▼]     │
│ Tag: [Select tags...]                       │
│                                             │
│ [Clear] ─────────────── [Search →]         │
└─────────────────────────────────────────────┘
```

### Search Results
- Highlighted matching text snippets
- Grouped by notebook
- Sort by relevance / date / title
- Quick preview on hover
- Keyboard navigation (↑↓ arrows)
- Recent searches history (last 50)

---

## Bulk Operations

### Multi-Select Actions
Select multiple notes → context menu:
- Move to notebook
- Copy to notebook
- Add tags
- Remove tags
- Change color
- Lock / Unlock
- Archive
- Restore from archive
- Delete permanently
- Export as ZIP
- Merge into one note
- Share all
- Print all

---

## Trash System

### Trash Behavior
- Notes moved to trash are retained for **30 days**
- After 30 days: permanently deleted
- Recover individual notes from trash
- Empty trash (permanently delete all)
- Trash shows: deleted date, original location, note preview
- Note in trash: not searchable, not accessible by collaborators

### Recovery
- Restore to original location (if still exists)
- Restore to new location (if original notebook deleted)
- Bulk restore all in trash
- Timeline: Shows when deletion will be permanent

---

## Import & Integration

### Import Sources
| Source | Format | Feature |
|--------|--------|---------|
| Notion | API + ZIP export | Full block structure |
| Evernote | ENEX format | Notes + attachments |
| Apple Notes | CloudKit export | Text + images |
| OneNote | HTML/DOCX export | Text + images |
| Google Keep | JSON export | Text + images |
| Bear | BearNote format | Markdown + attachments |
| Obsidian | Markdown vault | Full markdown + links |
| Plain Markdown | .md files | Full markdown |
| Word (.docx) | Native | Text + images |
| PDF | Native | Annotatable import |
| Images | jpg/png/webp/heic | OCR available |
| Text files | .txt | Plain text |
| HTML | .html | Converted to blocks |
