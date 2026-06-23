# Ishu Notes — System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER (Browser / PWA)                    │
│                                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ React UI │  │ Canvas   │  │ Editor   │  │ Offline  │  │  Auth   │ │
│  │ (Zustand)│  │ (Konva)  │  │ (TipTap) │  │ (Dexie)  │  │ (Clerk) │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │              │              │              │              │      │
│  ┌────▼──────────────▼──────────────▼──────────────▼─────────────▼───┐ │
│  │                     TanStack Query (Cache + Sync)                  │ │
│  └────────────────────────────┬───────────────────────────────────────┘ │
│                               │                                          │
│  ┌────────────────────────────▼───────────────────────────────────────┐ │
│  │            Service Worker (Workbox) — Offline Interceptor          │ │
│  └────────────────────────────┬───────────────────────────────────────┘ │
└───────────────────────────────┼─────────────────────────────────────────┘
                                │ HTTPS / WebSocket
┌───────────────────────────────▼─────────────────────────────────────────┐
│                         API GATEWAY LAYER                               │
│                    Express 5 + Rate Limiting + CORS                     │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  ┌───────────────┐  │
│  │  REST API   │  │ WebSocket   │  │ File Upload│  │  Auth Routes  │  │
│  │  /api/v1    │  │ (Socket.IO) │  │ /api/files │  │  (Clerk SDK)  │  │
│  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘  └───────┬───────┘  │
└─────────┼────────────────┼───────────────┼──────────────────┼───────────┘
          │                │               │                  │
┌─────────▼────────────────▼───────────────▼──────────────────▼───────────┐
│                         SERVICE LAYER                                   │
│                                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │
│  │  Notes   │  │ Notebook │  │  Sync    │  │   AI     │  │  Media  │  │
│  │ Service  │  │ Service  │  │ Service  │  │ Service  │  │ Service │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └─────────┘  │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────────┐
│                         DATA LAYER                                      │
│                                                                         │
│  ┌──────────────┐  ┌──────────┐  ┌───────────────┐  ┌───────────────┐  │
│  │  PostgreSQL  │  │  Redis   │  │ Object Storage│  │   PGVector    │  │
│  │  (Drizzle)   │  │ (Cache)  │  │  (Files/Media)│  │  (AI Search)  │  │
│  └──────────────┘  └──────────┘  └───────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Component Architecture Pattern

```
src/
├── app/                          # App shell & routing
│   ├── providers/               # React context providers
│   │   ├── QueryProvider.tsx    # TanStack Query
│   │   ├── ThemeProvider.tsx    # Dark/Light mode
│   │   ├── OfflineProvider.tsx  # Offline status
│   │   └── AuthProvider.tsx     # Clerk auth
│   ├── layouts/                 # Page layouts
│   │   ├── AppLayout.tsx        # Main app shell (sidebar + content)
│   │   ├── EditorLayout.tsx     # Full-screen editor
│   │   └── AuthLayout.tsx       # Auth pages
│   └── routes/                  # Route definitions
│
├── features/                     # Feature-based modules
│   ├── notes/                   # Note management
│   │   ├── components/          # Note-specific components
│   │   ├── hooks/               # Note-specific hooks
│   │   ├── store/               # Zustand store slice
│   │   └── api/                 # TanStack Query hooks
│   ├── handwriting/             # Canvas & drawing
│   ├── editor/                  # Rich text editor
│   ├── notebooks/               # Notebook management
│   ├── search/                  # Search system
│   ├── sync/                    # Offline sync
│   ├── ai/                      # AI features
│   ├── media/                   # Images, audio, video
│   └── collaboration/           # Real-time features
│
├── shared/                       # Shared across features
│   ├── components/              # Generic UI components
│   ├── hooks/                   # Generic hooks
│   ├── utils/                   # Utility functions
│   ├── types/                   # TypeScript types
│   └── constants/               # App constants
│
├── lib/                          # Third-party library configs
│   ├── konva/                   # Canvas setup
│   ├── tiptap/                  # Editor extensions
│   ├── dexie/                   # IndexedDB schema
│   └── yjs/                     # CRDT setup
│
└── workers/                      # Web Workers
    ├── ocr.worker.ts            # Tesseract OCR
    ├── sync.worker.ts           # Background sync
    └── search.worker.ts         # Full-text search indexing
```

---

## Backend Architecture

### Service Layer Design

```
artifacts/api-server/src/
├── routes/                       # Express route handlers
│   ├── notes/
│   │   ├── index.ts             # Route registration
│   │   ├── create.ts            # POST /api/v1/notes
│   │   ├── read.ts              # GET /api/v1/notes/:id
│   │   ├── update.ts            # PATCH /api/v1/notes/:id
│   │   ├── delete.ts            # DELETE /api/v1/notes/:id
│   │   └── list.ts              # GET /api/v1/notes
│   ├── notebooks/
│   ├── pages/
│   ├── files/
│   ├── sync/
│   ├── ai/
│   ├── search/
│   └── collaboration/
│
├── services/                     # Business logic
│   ├── NoteService.ts
│   ├── NotebookService.ts
│   ├── SyncService.ts
│   ├── AIService.ts
│   ├── SearchService.ts
│   ├── MediaService.ts
│   ├── CollaborationService.ts
│   └── ExportService.ts
│
├── middleware/                    # Express middleware
│   ├── auth.ts                  # Clerk auth verification
│   ├── rateLimit.ts             # Rate limiting per user
│   ├── validate.ts              # Zod request validation
│   ├── logger.ts                # Request logging
│   ├── errorHandler.ts          # Centralized error handling
│   └── upload.ts                # File upload middleware
│
├── lib/                          # Infrastructure
│   ├── db.ts                    # Drizzle PostgreSQL connection
│   ├── redis.ts                 # Redis connection
│   ├── storage.ts               # Object storage client
│   ├── ai.ts                    # AI SDK setup
│   └── websocket.ts             # Socket.IO setup
│
└── workers/                      # Background jobs
    ├── syncWorker.ts            # Process sync queue
    ├── ocrWorker.ts             # Process OCR jobs
    └── exportWorker.ts          # Process export jobs
```

---

## Data Flow Architecture

### Note Creation Flow

```
User Types/Draws
      │
      ▼
Editor Component (TipTap / Konva)
      │ onChange event (debounced 500ms)
      ▼
Local Zustand Store (instant UI update)
      │
      ├──► IndexedDB (Dexie) — Immediate local persistence
      │
      └──► Sync Queue
               │ (if online)
               ▼
          TanStack Query Mutation
               │
               ▼
          API: PATCH /api/v1/notes/:id
               │
               ▼
          Express Route Handler
               │
               ├──► Zod Validation
               │
               ├──► NoteService.update()
               │
               └──► PostgreSQL via Drizzle
```

### Offline → Online Sync Flow

```
Device Offline
      │
      ▼
All writes → IndexedDB (Dexie) + Sync Queue
      │
Device comes Online
      │
      ▼
Service Worker detects connection
      │
      ▼
Background Sync API fires
      │
      ▼
SyncService reads queue from IndexedDB
      │
      ▼
For each queued operation:
      │
      ├── Check server version (vector clock comparison)
      │
      ├── If no conflict → Apply operation to server
      │
      └── If conflict → CRDT merge via Yjs (auto-resolve)
               │
               ▼
          Merged state saved to both IndexedDB + PostgreSQL
```

---

## State Management Architecture

### Zustand Store Structure

```typescript
// Global app state — split into named slices
interface AppStore {
  // UI State
  ui: {
    sidebarOpen: boolean;
    theme: 'light' | 'dark' | 'system';
    activeNoteId: string | null;
    editorMode: 'text' | 'handwriting' | 'mixed';
    fullscreen: boolean;
    panelSizes: PanelSizes;
  };

  // Toolbar State  
  toolbar: {
    activeTool: Tool;
    penConfig: PenConfiguration;
    selectedColor: string;
    strokeWidth: number;
    opacity: number;
    history: HistoryEntry[];
    historyIndex: number;
  };

  // Notebook/Note Navigation
  navigation: {
    currentNotebookId: string | null;
    currentPageIndex: number;
    breadcrumbs: Breadcrumb[];
    viewMode: 'list' | 'grid' | 'gallery' | 'tree';
    sortBy: SortField;
    filterTags: string[];
  };

  // Selection State (for drag/copy operations)
  selection: {
    selectedNoteIds: Set<string>;
    selectionMode: boolean;
    clipboardContent: ClipboardContent | null;
  };

  // Collaboration State
  collaboration: {
    activeUsers: CollaborationUser[];
    cursors: Map<string, CursorPosition>;
    isConnected: boolean;
  };

  // Offline State
  offline: {
    isOnline: boolean;
    pendingSyncCount: number;
    lastSyncTime: Date | null;
    syncStatus: 'idle' | 'syncing' | 'error';
  };
}
```

---

## Security Architecture

```
Request Flow with Security Layers:

Client → [TLS 1.3] → CDN → [WAF] → API Gateway
                                         │
                              [Rate Limiter] → [Helmet.js Headers]
                                         │
                              [Clerk Auth Middleware]
                                         │
                              [Zod Input Validation]
                                         │
                              [Service Layer]
                                         │
                              [Parameterized Queries (Drizzle)]
                                         │
                              [PostgreSQL Row-Level Security]
```

### Data Encryption Strategy

```
At Rest:
  - PostgreSQL: AES-256 encryption (database level)
  - Object Storage: AES-256-GCM per-file encryption
  - Client IndexedDB: WebCrypto API (AES-GCM) for sensitive notes

In Transit:
  - TLS 1.3 minimum enforced
  - Certificate pinning (mobile)
  - HSTS headers

End-to-End (Optional Premium Feature):
  - Client generates keypair (X25519)
  - Note content encrypted with XChaCha20-Poly1305 before upload
  - Server never sees plaintext
  - Key derivation via Argon2id from user passphrase
```

---

## Scalability Architecture

### Horizontal Scaling Strategy

```
                    ┌─────────────┐
                    │  Load Balancer │
                    │   (Nginx)   │
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ API Node │    │ API Node │    │ API Node │
    │  Instance│    │  Instance│    │  Instance│
    └────┬─────┘    └────┬─────┘    └────┬─────┘
         │               │               │
         └───────────────┼───────────────┘
                         ▼
              ┌─────────────────────┐
              │     Redis Cluster   │
              │  (Session + Cache)  │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │  PostgreSQL Primary │
              │    + Read Replicas  │
              └─────────────────────┘
```

### Caching Strategy (Multi-Layer)

| Layer | Technology | TTL | What's Cached |
|-------|-----------|-----|---------------|
| Browser Memory | TanStack Query | 5 min | Active note data |
| Browser Storage | IndexedDB | Permanent | All note content |
| CDN | Cloudflare | 1 hour | Static assets |
| Application | Redis | 15 min | User note lists |
| Database | PostgreSQL | Query cache | Frequent queries |
