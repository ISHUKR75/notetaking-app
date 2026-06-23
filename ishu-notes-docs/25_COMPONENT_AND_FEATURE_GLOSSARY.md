# Ishu Notes — Complete Component & Feature Glossary

## Purpose

This document is the single reference for every UI component, feature module, and system entity in Ishu Notes. Every developer, designer, and product manager uses these exact names consistently across code, docs, design, and communication.

---

## Core Concepts

| Term | Definition |
|------|------------|
| **Workspace** | The user's entire account — contains all libraries |
| **Library** | Top-level container (e.g., "Personal", "Work", "School") |
| **Notebook** | A collection of pages, like a physical notebook |
| **Section** | An optional grouping inside a notebook (like tabbed dividers) |
| **Page** | A single note — the atomic unit of content |
| **Block** | A unit of content within a page (paragraph, heading, image, etc.) |
| **Stroke** | A single handwriting path drawn on the canvas |
| **Layer** | A drawing plane within a canvas page |
| **Template** | A reusable background pattern for canvas pages |
| **Tag** | A keyword label attached to notes for organization |
| **Smart Folder** | A dynamic collection based on filter criteria |
| **Sync Queue** | A list of pending offline operations awaiting upload |

---

## UI Components

### Layout Components

| Component | Location | Description |
|-----------|----------|-------------|
| `AppShell` | `src/app/layouts/AppLayout.tsx` | Main 3-panel layout wrapper |
| `Sidebar` | `src/features/navigation/Sidebar.tsx` | Left navigation panel |
| `NoteListPanel` | `src/features/notes/NoteListPanel.tsx` | Middle panel showing note list |
| `EditorPanel` | `src/features/editor/EditorPanel.tsx` | Right panel with active note editor |
| `TopBar` | `src/shared/components/TopBar.tsx` | Header with search and user menu |
| `BottomNav` | `src/shared/components/BottomNav.tsx` | Mobile bottom tab navigation |
| `ContextPanel` | `src/features/ai/ContextPanel.tsx` | Optional right panel (AI, comments) |
| `CommandPalette` | `src/shared/components/CommandPalette.tsx` | Cmd+K universal search overlay |
| `QuickNoteModal` | `src/features/notes/QuickNoteModal.tsx` | Quick note creation modal |

---

### Editor Components

| Component | Description |
|-----------|-------------|
| `RichTextEditor` | TipTap-based WYSIWYG editor |
| `EditorToolbar` | Fixed toolbar for text formatting |
| `FloatingToolbar` | Appears on text selection |
| `SlashCommandMenu` | Block insertion menu (triggered by /) |
| `BlockHandle` | Drag handle (⠿) left of each block |
| `BlockOptionsMenu` | Context menu for block operations |
| `LinkEditor` | Inline link editing popover |
| `ColorPicker` | Color selection for text and highlights |
| `EmojiPicker` | Emoji insertion popup |
| `MentionSuggestions` | @mention autocomplete dropdown |
| `TagSuggestions` | #tag autocomplete dropdown |
| `ImageBlock` | Embedded image with caption |
| `VideoBlock` | Embedded video player |
| `AudioBlock` | Embedded audio player with waveform |
| `FileBlock` | File attachment display |
| `CodeBlock` | Syntax-highlighted code display |
| `MathBlock` | KaTeX equation renderer |
| `TableBlock` | Interactive table with toolbar |
| `CalloutBlock` | Styled info/warning/tip/danger box |
| `ToggleBlock` | Collapsible content block |
| `ChecklistBlock` | Interactive checkbox list |
| `DatabaseBlock` | Embedded Notion-style database |
| `EmbedBlock` | iFrame embed for external content |
| `DrawingBlock` | Inline handwriting canvas |
| `TOCBlock` | Auto-generated table of contents |
| `BacklinksPanel` | Shows what notes link to this page |

---

### Canvas Components

| Component | Description |
|-----------|-------------|
| `CanvasEditor` | Main Konva.js canvas wrapper |
| `CanvasLayer` | Individual drawing layer |
| `StrokeRenderer` | Renders strokes using Perfect Freehand |
| `PenTool` | Active pen tool with current settings |
| `EraserTool` | Pixel or stroke eraser |
| `LassoTool` | Freeform selection tool |
| `SelectionTool` | Rectangle selection |
| `ShapeTools` | Line, circle, rectangle, arrow tools |
| `StickyNote` | Canvas-positioned sticky note annotation |
| `HandwritingToolbar` | Canvas-specific tool palette |
| `PenSettingsPanel` | Color, width, opacity, pressure settings |
| `LayerPanel` | Layer management sidebar |
| `PageMiniMap` | Thumbnail overview of all pages |
| `PageThumbnailGrid` | Grid of page previews |
| `TemplateSelector` | Choose page background template |
| `CanvasZoomControl` | Zoom percentage + fit buttons |

---

### Navigation Components

| Component | Description |
|-----------|-------------|
| `LibraryItem` | Library row in sidebar |
| `NotebookItem` | Notebook row in sidebar (expandable) |
| `SectionItem` | Section row under notebook |
| `SmartFolderItem` | Smart folder row |
| `TagItem` | Tag row with color and count |
| `Breadcrumb` | Path navigation above editor |
| `NoteCard` | Note preview card (list or grid) |
| `NoteListItem` | Compact note row for list view |
| `NoteGalleryCard` | Large card with cover image |
| `SortBar` | Sort and view mode controls |
| `FilterBar` | Quick filter chips |
| `SelectionBar` | Shows count + actions when notes selected |

---

### Collaboration Components

| Component | Description |
|-----------|-------------|
| `CollaboratorAvatars` | Row of avatars for active users |
| `LiveCursor` | Another user's cursor position |
| `PresenceIndicator` | Colored dot showing online status |
| `ShareModal` | Modal for sharing note/notebook |
| `ShareLinkPanel` | Generate and manage share links |
| `CollaboratorsList` | List of current collaborators with permissions |
| `CommentThread` | Threaded comment sidebar |
| `InlineComment` | Comment anchored to text selection |
| `CommentBubble` | Comment annotation on canvas |
| `ConflictResolver` | UI for manual conflict resolution |
| `ActivityFeed` | Log of recent changes by collaborators |

---

### AI Components

| Component | Description |
|-----------|-------------|
| `AIChatPanel` | Floating AI assistant sidebar |
| `AICommandBar` | /ai command inline palette |
| `RewriteMenu` | Dropdown for rewrite options |
| `SummarizeButton` | One-click note summarization |
| `FlashcardDeck` | Flashcard study interface |
| `FlashcardCard` | Individual flashcard (front + back) |
| `QuizInterface` | Generated quiz display |
| `SpacedRepetitionScheduler` | Study scheduling UI |
| `AIAutoComplete` | Ghost text autocomplete overlay |
| `OCROverlay` | Recognized text layer on canvas |
| `OCRCorrectionPopup` | Correct misrecognized handwriting |
| `SemanticSearchResults` | AI similarity search results section |
| `AskYourNotesPanel` | RAG-powered Q&A interface |
| `TranslationPanel` | Side-by-side translation view |

---

### Settings Components

| Component | Description |
|-----------|-------------|
| `SettingsModal` | Full settings overlay |
| `AppearanceSettings` | Theme, font, density settings |
| `EditorSettings` | Default editor behavior settings |
| `HandwritingSettings` | Pen defaults, wrist rejection |
| `SyncSettings` | Sync frequency, Wi-Fi only |
| `NotificationSettings` | Notification preferences |
| `SecuritySettings` | Password, biometric, E2EE |
| `StorageSettings` | Usage display and management |
| `ShortcutsSettings` | Keyboard shortcut customization |
| `AccountSettings` | Profile, email, subscription |
| `BillingSettings` | Plan, payment, invoices |
| `ReferralSettings` | Referral link and tracking |
| `ExportSettings` | Default export preferences |
| `ImportWizard` | Step-by-step import flow |

---

### Utility Components

| Component | Description |
|-----------|-------------|
| `SearchBar` | Global search input |
| `SearchResultList` | Search results with highlights |
| `SearchFilterPanel` | Advanced search filters |
| `SyncStatusBar` | Bottom bar with sync state |
| `SyncStatusIndicator` | Small icon showing sync state |
| `OfflineBanner` | Banner when no connection |
| `UpgradePrompt` | Non-blocking premium feature nudge |
| `EmptyState` | Illustrated empty state with CTA |
| `LoadingSkeleton` | Placeholder during data load |
| `Toast` | Ephemeral notification (Sonner) |
| `Tooltip` | Hover explanation for UI elements |
| `ContextMenu` | Right-click menu |
| `ConfirmDialog` | Confirmation for destructive actions |
| `ProgressBar` | Upload/sync progress indicator |
| `ColorLabel` | Colored dot for note color coding |
| `TagChip` | Pill badge for tags |
| `DateBadge` | Formatted relative date display |
| `WordCount` | Live word/character counter |
| `AvatarGroup` | Clustered user avatars |
| `UserAvatar` | Single user avatar with fallback initials |
| `KeyboardHint` | Shows keyboard shortcut in tooltip |
| `VirtualList` | Virtualized infinite scroll list |

---

## Feature Modules

### Core Features

| Module | Package | Description |
|--------|---------|-------------|
| `notes` | `features/notes` | Note CRUD and metadata |
| `notebooks` | `features/notebooks` | Notebook management |
| `libraries` | `features/libraries` | Library (top-level container) |
| `pages` | `features/pages` | Page system within notebooks |
| `editor` | `features/editor` | Rich text editing (TipTap) |
| `handwriting` | `features/handwriting` | Canvas and pen tools |
| `organization` | `features/organization` | Tags, smart folders, hierarchy |
| `search` | `features/search` | Full-text + semantic search |
| `sync` | `features/sync` | Offline queue + conflict resolution |
| `collaboration` | `features/collaboration` | Real-time multi-user editing |
| `media` | `features/media` | Image, audio, video, file handling |
| `ai` | `features/ai` | AI writing and organization tools |
| `export` | `features/export` | Export to all formats |
| `import` | `features/import` | Import from external apps |
| `auth` | `features/auth` | Authentication (Clerk) |
| `settings` | `features/settings` | User preferences |
| `templates` | `features/templates` | Page template library |
| `notifications` | `features/notifications` | In-app + push notifications |
| `billing` | `features/billing` | Subscription and payments |

---

## Data Types

### Core Types

```typescript
// Every major entity in the system
type EntityType =
  | 'library'
  | 'notebook'
  | 'section'
  | 'page'         // = Note
  | 'stroke'
  | 'media'
  | 'tag'
  | 'template'
  | 'comment'
  | 'collaborator'
  | 'version';

// Pen tool names (canonical)
type PenTool =
  | 'ballpoint'
  | 'fountain'
  | 'brush'
  | 'calligraphy'
  | 'ink-brush'
  | 'chalk'
  | 'neon'
  | 'airbrush'
  | 'watercolor'
  | 'marker'
  | 'pencil'
  | 'custom';

// Content types for pages
type ContentType =
  | 'rich-text'
  | 'handwriting'
  | 'mixed'
  | 'voice'
  | 'pdf'
  | 'database'
  | 'web-clip';

// Permission levels
type Permission =
  | 'view'
  | 'comment'
  | 'edit'
  | 'admin'
  | 'owner';

// Note color labels (12 options)
type NoteColor =
  | 'none'
  | 'red' | 'orange' | 'yellow' | 'green'
  | 'teal' | 'blue' | 'purple' | 'pink'
  | 'brown' | 'gray' | 'black';

// Sync operation types
type SyncOperation =
  | 'create' | 'update' | 'delete'
  | 'move' | 'share' | 'lock';

// AI feature types
type AIFeature =
  | 'autocomplete' | 'rewrite' | 'summarize'
  | 'translate' | 'flashcards' | 'quiz'
  | 'ocr' | 'chat' | 'semantic-search'
  | 'auto-tag' | 'ask-notes';

// Export formats
type ExportFormat =
  | 'pdf' | 'markdown' | 'html' | 'docx'
  | 'epub' | 'txt' | 'svg' | 'png'
  | 'csv' | 'json' | 'latex' | 'isnbak';

// View modes
type ViewMode =
  | 'list' | 'grid' | 'gallery'
  | 'continuous' | 'paginated'
  | 'kanban' | 'table' | 'calendar'
  | 'timeline' | 'graph';
```

---

## API Route Naming Convention

```
/api/v1/{resource}              → Collection operations
/api/v1/{resource}/{id}         → Single resource operations
/api/v1/{resource}/{id}/{action} → Custom actions

Examples:
  GET    /api/v1/notes                → List notes
  POST   /api/v1/notes                → Create note
  GET    /api/v1/notes/:id            → Get note
  PATCH  /api/v1/notes/:id            → Update note
  DELETE /api/v1/notes/:id            → Soft-delete note
  POST   /api/v1/notes/:id/restore    → Restore from trash
  POST   /api/v1/notes/:id/duplicate  → Duplicate note
  POST   /api/v1/notes/:id/move       → Move to notebook
  POST   /api/v1/notes/:id/share      → Share note
  POST   /api/v1/notes/:id/lock       → Lock note

  GET    /api/v1/notebooks/:id/pages  → Pages in notebook
  GET    /api/v1/pages/:id/strokes    → Strokes on page
  POST   /api/v1/search               → Search
  POST   /api/v1/sync                 → Sync batch
  POST   /api/v1/ai/summarize         → AI summarize
  POST   /api/v1/files/upload         → Upload media
```

---

## Error Code Reference

```typescript
// All error codes used in the API
const ERROR_CODES = {
  // Auth
  UNAUTHORIZED:           'UNAUTHORIZED',
  FORBIDDEN:              'FORBIDDEN',
  SESSION_EXPIRED:        'SESSION_EXPIRED',

  // Notes
  NOTE_NOT_FOUND:         'NOTE_NOT_FOUND',
  NOTE_LOCKED:            'NOTE_LOCKED',
  NOTE_DELETED:           'NOTE_DELETED',

  // Notebooks
  NOTEBOOK_NOT_FOUND:     'NOTEBOOK_NOT_FOUND',
  NOTEBOOK_LOCKED:        'NOTEBOOK_LOCKED',

  // Sync
  SYNC_CONFLICT:          'SYNC_CONFLICT',
  SYNC_QUEUE_FULL:        'SYNC_QUEUE_FULL',
  STALE_VERSION:          'STALE_VERSION',

  // Validation
  VALIDATION_ERROR:       'VALIDATION_ERROR',
  INVALID_CONTENT_TYPE:   'INVALID_CONTENT_TYPE',

  // Storage
  STORAGE_LIMIT_EXCEEDED: 'STORAGE_LIMIT_EXCEEDED',
  FILE_TOO_LARGE:         'FILE_TOO_LARGE',
  UNSUPPORTED_FILE_TYPE:  'UNSUPPORTED_FILE_TYPE',

  // AI
  AI_UNAVAILABLE:         'AI_UNAVAILABLE',
  AI_RATE_LIMIT:          'AI_RATE_LIMIT',
  AI_CONTENT_POLICY:      'AI_CONTENT_POLICY',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED:    'RATE_LIMIT_EXCEEDED',

  // Server
  INTERNAL_ERROR:         'INTERNAL_ERROR',
  DATABASE_ERROR:         'DATABASE_ERROR',
  SERVICE_UNAVAILABLE:    'SERVICE_UNAVAILABLE',
} as const;
```

---

## Event Names (Analytics & Logging)

```typescript
// PostHog analytics events
const ANALYTICS_EVENTS = {
  // Notes
  NOTE_CREATED:           'note_created',
  NOTE_EDITED:            'note_edited',
  NOTE_DELETED:           'note_deleted',
  NOTE_SHARED:            'note_shared',
  NOTE_EXPORTED:          'note_exported',
  NOTE_LOCKED:            'note_locked',

  // Handwriting
  STROKE_DRAWN:           'stroke_drawn',
  PEN_TYPE_CHANGED:       'pen_type_changed',
  CANVAS_OCR_RUN:         'canvas_ocr_run',

  // AI
  AI_FEATURE_USED:        'ai_feature_used',
  AI_SUMMARY_GENERATED:   'ai_summary_generated',
  AI_FLASHCARD_CREATED:   'ai_flashcard_created',
  AI_CHAT_MESSAGE_SENT:   'ai_chat_message_sent',
  ASK_NOTES_QUERY:        'ask_notes_query',

  // Collaboration
  NOTE_INVITE_SENT:       'note_invite_sent',
  NOTE_COLLAB_SESSION:    'note_collab_session_started',
  COMMENT_ADDED:          'comment_added',

  // Organization
  TAG_CREATED:            'tag_created',
  SMART_FOLDER_CREATED:   'smart_folder_created',
  NOTEBOOK_CREATED:       'notebook_created',

  // Sync
  SYNC_COMPLETED:         'sync_completed',
  SYNC_CONFLICT_DETECTED: 'sync_conflict_detected',
  SYNC_CONFLICT_RESOLVED: 'sync_conflict_resolved',
  OFFLINE_OPERATION:      'offline_operation_queued',

  // Premium
  UPGRADE_PROMPT_SHOWN:   'upgrade_prompt_shown',
  UPGRADE_STARTED:        'upgrade_started',
  SUBSCRIPTION_CREATED:   'subscription_created',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',

  // Search
  SEARCH_PERFORMED:       'search_performed',
  SEMANTIC_SEARCH_USED:   'semantic_search_used',

  // Onboarding
  ONBOARDING_STARTED:     'onboarding_started',
  ONBOARDING_COMPLETED:   'onboarding_completed',
  FIRST_NOTE_CREATED:     'first_note_created',
  FIRST_STROKE_DRAWN:     'first_stroke_drawn',
} as const;
```

---

## File Naming Conventions

```
Components:     PascalCase   → NoteCard.tsx, HandwritingToolbar.tsx
Hooks:          camelCase    → useNoteEditor.ts, useCanvasRenderer.ts
Utilities:      camelCase    → strokeUtils.ts, dateFormatter.ts
Types:          PascalCase   → Note.ts, Stroke.ts (in types/)
Constants:      UPPER_SNAKE  → API_BASE_URL, MAX_STROKE_POINTS
Tests:          {name}.test.ts → NoteCard.test.tsx, strokeUtils.test.ts
Stories:        {name}.stories.tsx → NoteCard.stories.tsx
API routes:     camelCase    → createNote.ts, listNotebooks.ts
DB schema:      camelCase    → pages.ts, strokes.ts (in schema/)
Migrations:     {timestamp}_{description}.sql
```

---

## Glossary Quick Reference (A–Z)

| Term | Meaning |
|------|---------|
| **Ask Your Notes** | RAG-powered AI Q&A over all notes |
| **Block** | A content unit in rich text editor |
| **Breadcrumb** | Navigation path showing current location |
| **Canvas** | The drawing surface for handwriting |
| **CRDT** | Conflict-free Replicated Data Type (Yjs) |
| **Database View** | Notion-style spreadsheet of notes |
| **Dexie.js** | IndexedDB wrapper for offline storage |
| **E2EE** | End-to-end encryption (optional premium) |
| **Gallery View** | Card-based note display with cover images |
| **Handwriting** | Canvas-based freehand drawing/writing |
| **IndexedDB** | Browser database for offline note storage |
| **Lasso** | Freeform selection tool on canvas |
| **Layer** | A drawing plane within canvas page |
| **Library** | Top-level note container (Personal/Work/etc.) |
| **Mixed Mode** | Page with both handwriting and typed text |
| **Notebook** | Collection of pages (like physical notebook) |
| **OCR** | Optical Character Recognition (text from images/handwriting) |
| **Page** | A single note — atomic content unit |
| **PGVector** | PostgreSQL extension for vector/AI search |
| **RAG** | Retrieval-Augmented Generation (AI + your notes) |
| **Section** | Divider/grouping within a notebook |
| **Service Worker** | Browser background script powering offline |
| **Smart Folder** | Dynamic note collection based on filters |
| **Stroke** | A single pen/pencil path on canvas |
| **Sync Queue** | List of offline operations pending upload |
| **Tag** | Keyword label for organizing notes |
| **Template** | Reusable background for canvas pages |
| **TipTap** | Rich text editor framework (ProseMirror-based) |
| **Toolbar** | Tool palette for formatting or drawing tools |
| **Vector Clock** | Logical timestamp system for sync conflict detection |
| **Workspace** | User's entire account containing all libraries |
| **Yjs** | CRDT library for conflict-free collaborative editing |
| **Zod** | TypeScript schema validation library |
