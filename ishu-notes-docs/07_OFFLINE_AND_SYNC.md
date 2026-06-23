# Ishu Notes — Offline-First Architecture & Sync System

## Core Philosophy

Ishu Notes is **offline-first by design**. This means:
- The app works **100% without internet**
- Every feature available online is available offline
- Sync happens automatically in the background when connection is restored
- Users never see a "you are offline" error — they just keep working

---

## Offline Storage Stack

### Browser-Side (Client)
```
┌─────────────────────────────────────────────────────────┐
│                  Client Storage Stack                   │
├─────────────────────────────────────────────────────────┤
│ Dexie.js (IndexedDB)          — All notes, media refs  │
│ Cache API (Service Worker)    — API responses, assets  │
│ LocalStorage                  — App settings, prefs    │
│ SessionStorage                — Temp UI state          │
│ OPFS (Origin Private FS)      — Large media files      │
└─────────────────────────────────────────────────────────┘
```

### IndexedDB Schema (via Dexie.js)

```typescript
class IshuNotesDB extends Dexie {
  notes!: Table<Note>;
  notebooks!: Table<Notebook>;
  pages!: Table<Page>;
  strokes!: Table<StrokeCollection>;
  media!: Table<MediaFile>;
  tags!: Table<Tag>;
  syncQueue!: Table<SyncOperation>;
  deletedItems!: Table<DeletedItem>;
  userSettings!: Table<UserSettings>;
  collaborators!: Table<Collaborator>;
  searchIndex!: Table<SearchIndexEntry>;
  
  constructor() {
    super('IshuNotesDB');
    this.version(1).stores({
      notes:       '++id, notebookId, modifiedAt, *tags, isDeleted',
      notebooks:   '++id, libraryId, modifiedAt, position',
      pages:       '++id, notebookId, sectionId, position',
      strokes:     '++id, pageId, layerId',
      media:       '++id, noteId, type, uploadedAt',
      tags:        '++id, name, &slug',
      syncQueue:   '++id, operation, entityType, entityId, timestamp, retryCount',
      deletedItems:'++id, entityType, originalId, deletedAt',
      userSettings:'id',
      collaborators:'++id, noteId, userId',
      searchIndex: '++id, noteId, content',
    });
  }
}
```

---

## Service Worker Architecture

### Workbox Strategy Map
```
Request URL Pattern          → Cache Strategy
─────────────────────────────────────────────────────────
/api/v1/notes/*              → StaleWhileRevalidate (5 min TTL)
/api/v1/notebooks/*          → StaleWhileRevalidate (5 min TTL)
/api/v1/files/*              → CacheFirst (24 hour TTL)
/api/v1/user/*               → NetworkFirst (1 min TTL)
/static/* (assets)           → CacheFirst (30 day TTL, versioned)
/fonts/*                     → CacheFirst (365 day TTL)
*.woff2, *.woff              → CacheFirst (365 day TTL)
*.png, *.jpg, *.webp         → StaleWhileRevalidate (7 day TTL)
/ (app shell)                → NetworkFirst → CacheFirst fallback
/api/* (failed)              → Offline Queue (Background Sync)
```

### Service Worker Lifecycle
```javascript
// sw.js (managed by Workbox)

// 1. INSTALL — cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then(cache => 
      cache.addAll(APP_SHELL_URLS)
    )
  );
  self.skipWaiting();
});

// 2. ACTIVATE — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(cleanOldCaches());
  self.clients.claim();
});

// 3. FETCH — intercept requests
self.addEventListener('fetch', (event) => {
  const strategy = getStrategyForRequest(event.request);
  event.respondWith(strategy.handle(event.request));
});

// 4. BACKGROUND SYNC — flush queued writes
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notes') {
    event.waitUntil(flushSyncQueue());
  }
});

// 5. PERIODIC BACKGROUND SYNC — keep data fresh
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'refresh-notes') {
    event.waitUntil(refreshNoteData());
  }
});

// 6. PUSH NOTIFICATIONS — collaboration alerts
self.addEventListener('push', (event) => {
  const data = event.data.json();
  event.waitUntil(showNotification(data));
});
```

---

## Conflict Resolution System

### CRDT-Based Conflict Resolution (Yjs)

Yjs (Y.js) provides **conflict-free replicated data types (CRDTs)** that automatically merge concurrent edits without data loss.

```
Device A (offline for 2 hours)         Device B (online)
│                                       │
│ User edits paragraph 2                │ User edits paragraph 3
│ adds new paragraph 5                  │ deletes paragraph 1
│                                       │
│  ← Both devices reconnect →          │
│                                       │
│  Yjs CRDT Merge:                      │
│  - Paragraph 2 from A ✓               │
│  - Paragraph 3 from B ✓               │
│  - Paragraph 5 from A ✓               │
│  - Paragraph 1 deleted (B) ✓          │
│  - NO conflicts, NO data loss         │
└───────────────────────────────────────┘
```

### Vector Clock System
```typescript
interface VectorClock {
  [deviceId: string]: number;  // Logical timestamp per device
}

// Example:
const clock: VectorClock = {
  "device-iphone-123": 45,
  "device-macbook-456": 23,
  "device-android-789": 67,
};

// Before any write: increment own clock
function incrementClock(clock: VectorClock, myDeviceId: string): VectorClock {
  return { ...clock, [myDeviceId]: (clock[myDeviceId] ?? 0) + 1 };
}

// Merge clocks when receiving remote update
function mergeClock(local: VectorClock, remote: VectorClock): VectorClock {
  const result: VectorClock = { ...local };
  for (const [deviceId, time] of Object.entries(remote)) {
    result[deviceId] = Math.max(result[deviceId] ?? 0, time);
  }
  return result;
}
```

### Conflict Types & Resolution Strategies

| Conflict Type | Detection | Resolution |
|--------------|-----------|------------|
| Text edits (concurrent) | Yjs CRDT | Automatic merge (character-level) |
| Title renamed on both devices | Hash comparison | Last-write-wins with user notification |
| Note moved to different notebook | Vector clock | Show user both options, let them choose |
| Note deleted on A, edited on B | Deletion marker check | Restore with "someone deleted this" warning |
| New stroke on both offline devices | UUID-keyed strokes | Both strokes kept (additive) |
| Note locked on A, edit on B | Lock timestamp | Lock takes precedence, show error to B |
| Property edited in database view | Field-level CRDT | Last write per field wins |

### Conflict UI
When automated resolution fails, show conflict resolution UI:
```
⚠️ Conflict Detected — "Meeting Notes" was edited on 2 devices

┌──────────────────────┬──────────────────────┐
│   Your Version        │   Other Version       │
│   (iPhone, 2h ago)    │   (MacBook, 1h ago)   │
├──────────────────────┼──────────────────────┤
│ - Action item 1      │ - Action item 1      │
│ + Action item 2      │ + NEW item added     │
│   unchanged text     │   unchanged text     │
└──────────────────────┴──────────────────────┘

[Keep Mine] [Keep Theirs] [Keep Both — Merge]
```

---

## Sync Queue System

### Sync Operation Types
```typescript
type SyncOperationType =
  | 'CREATE_NOTE'
  | 'UPDATE_NOTE'
  | 'DELETE_NOTE'
  | 'CREATE_NOTEBOOK'
  | 'UPDATE_NOTEBOOK'
  | 'DELETE_NOTEBOOK'
  | 'ADD_STROKE'
  | 'DELETE_STROKE'
  | 'UPLOAD_MEDIA'
  | 'DELETE_MEDIA'
  | 'ADD_TAG'
  | 'REMOVE_TAG'
  | 'MOVE_NOTE'
  | 'SHARE_NOTE'
  | 'UPDATE_SETTINGS';

interface SyncOperation {
  id: string;
  operation: SyncOperationType;
  entityType: 'note' | 'notebook' | 'page' | 'stroke' | 'media';
  entityId: string;
  payload: object;           // The data to sync
  deviceId: string;
  timestamp: number;         // When the operation happened locally
  vectorClock: VectorClock;
  retryCount: number;        // How many times sync has been attempted
  maxRetries: number;        // Default: 5
  nextRetryAt: number;       // Exponential backoff timestamp
  error: string | null;      // Last error message if failed
}
```

### Sync Queue Processing
```
Every time network becomes available:
     │
     ▼
Read all pending operations from IndexedDB (syncQueue table)
Sort by: timestamp ASC (oldest first)
     │
     ▼
For each operation:
     │
     ├─ Attempt API call
     │       │
     │       ├── SUCCESS → Remove from queue, update local record
     │       │
     │       └── FAILURE → 
     │               │
     │               ├── Retry-able error (500, timeout) →
     │               │   increment retryCount
     │               │   schedule with exponential backoff
     │               │   (1s, 2s, 4s, 8s, 16s, max 5 min)
     │               │
     │               └── Non-retry error (401, 403, 422) →
     │                   Mark as failed, notify user
     │
     ▼
After all processed: Update UI sync status indicator
```

---

## Online/Offline Detection

### Multi-Signal Detection
```typescript
class ConnectivityMonitor {
  private isOnline: boolean = navigator.onLine;
  
  // Signal 1: Navigator API
  private setupNavigatorEvents() {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }
  
  // Signal 2: Periodic API ping (more reliable)
  private async pingServer(): Promise<boolean> {
    try {
      const response = await fetch('/api/v1/ping', {
        method: 'HEAD',
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),  // 3 second timeout
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  // Signal 3: Network Information API
  private checkNetworkInfo() {
    const connection = (navigator as any).connection;
    if (connection) {
      // effectiveType: '2g' | '3g' | '4g' | 'slow-2g'
      // downlink: Mbps
      // rtt: ms round-trip time
      return connection.effectiveType !== 'slow-2g';
    }
    return true;
  }
}
```

### Sync Status Indicator (UI)
```
States shown in bottom bar:
  ✅ All synced          — All changes saved to cloud
  🔄 Syncing...          — Currently uploading changes (count shown)
  ⏸ 3 changes pending   — Offline, will sync when connected
  ⚠️ Sync error (1)      — One operation failed, tap to retry
  📵 Offline mode        — No connection, full offline mode active
  🔒 E2E Encrypted       — End-to-end encryption active
```

---

## Data Integrity & Recovery

### Automatic Backup Schedule
| Backup Type | Frequency | Retention | Storage |
|-------------|-----------|-----------|---------|
| Auto-save (local) | Every 2 seconds | Permanent | IndexedDB |
| Incremental cloud | Every 5 minutes | 30 days | Object Storage |
| Daily snapshot | Once per day | 90 days | Object Storage |
| Weekly archive | Once per week | 1 year | Object Storage |
| Manual backup | On demand | Until deleted | Object Storage |

### Backup Export Formats
- **Ishu Notes Backup (.isnbak)** — Proprietary full-fidelity format
- **Markdown ZIP** — All notes as .md files in folder structure
- **PDF Bundle** — All notes exported as PDFs
- **JSON Export** — Full data in JSON format
- **HTML Archive** — Static HTML files for each note

### Recovery Options
- Restore from daily snapshot (select date)
- Restore individual note version history
- Undo sync (revert last sync if it caused issues)
- Emergency recovery mode (restore from oldest backup)
