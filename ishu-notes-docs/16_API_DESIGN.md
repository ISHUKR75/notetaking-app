# Ishu Notes — Complete API Design (OpenAPI / REST)

## API Overview

- **Base URL:** `/api/v1`
- **Format:** JSON (application/json)
- **Auth:** Bearer token (Clerk JWT) in Authorization header
- **Versioning:** URL path versioning (`/v1/`, `/v2/`)
- **Pagination:** Cursor-based for lists
- **Rate Limiting:** Per-user, per-endpoint (see Security doc)

---

## Authentication Headers

```http
Authorization: Bearer {clerk_jwt_token}
Content-Type: application/json
X-Device-ID: {unique_device_identifier}
X-Client-Version: 1.0.0
```

---

## Standard Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "total": 145,
    "page": 1,
    "hasMore": true,
    "cursor": "eyJpZCI6IjEyMyJ9"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "NOTE_NOT_FOUND",
    "message": "The requested note does not exist or you don't have access.",
    "field": null,
    "statusCode": 404
  }
}
```

---

## Health & Status

### `GET /api/v1/health`
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-06-22T10:30:00Z",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "storage": "healthy",
    "ai": "healthy"
  }
}
```

---

## Notes / Pages API

### `GET /api/v1/notes`
List notes with filtering and pagination.

**Query Parameters:**
```
notebookId      string    Filter by notebook
sectionId       string    Filter by section  
libraryId       string    Filter by library
tags            string[]  Filter by tags (comma-separated)
contentType     string    'rich-text' | 'handwriting' | 'mixed' | 'voice'
isFlagged       boolean   Only flagged notes
isPinned        boolean   Only pinned notes
isFavorite      boolean   Only favorites
isArchived      boolean   Include archived (default: false)
isTrashed       boolean   Include trashed (default: false)
search          string    Full-text search query
sortBy          string    'modified' | 'created' | 'title' | 'manual'
sortDir         string    'asc' | 'desc'
cursor          string    Pagination cursor
limit           number    1-100 (default: 50)
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "notes": [
      {
        "id": "note_abc123",
        "title": "Meeting Notes — June 22",
        "excerpt": "Discussed Q3 goals and...",
        "contentType": "mixed",
        "notebookId": "nb_xyz789",
        "tags": ["work", "meeting"],
        "color": "blue",
        "emoji": "📋",
        "wordCount": 342,
        "isFlagged": false,
        "isPinned": true,
        "isFavorite": false,
        "isShared": true,
        "hasHandwriting": false,
        "hasMedia": true,
        "createdAt": "2026-06-22T09:00:00Z",
        "updatedAt": "2026-06-22T14:30:00Z",
        "lastEditedBy": {
          "id": "user_def456",
          "displayName": "Priya Singh",
          "avatarUrl": "https://..."
        }
      }
    ]
  },
  "meta": {
    "total": 145,
    "hasMore": true,
    "cursor": "eyJpZCI6Im5vdGVfYWJjMTIzIn0="
  }
}
```

---

### `POST /api/v1/notes`
Create a new note.

**Request Body:**
```json
{
  "title": "New Meeting Note",
  "notebookId": "nb_xyz789",
  "sectionId": "sec_abc123",
  "contentType": "rich-text",
  "bodyJson": { "type": "doc", "content": [] },
  "tags": ["work"],
  "color": "none",
  "emoji": null,
  "templateId": "tpl_cornell",
  "position": 0
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "note_newid123",
    "title": "New Meeting Note",
    "notebookId": "nb_xyz789",
    "createdAt": "2026-06-22T15:00:00Z",
    "updatedAt": "2026-06-22T15:00:00Z",
    "version": 1
  }
}
```

---

### `GET /api/v1/notes/:id`
Get full note content.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "note_abc123",
    "title": "Meeting Notes — June 22",
    "contentType": "mixed",
    "bodyJson": { "type": "doc", "content": [ ... ] },
    "notebookId": "nb_xyz789",
    "sectionId": "sec_abc",
    "tags": ["work", "meeting"],
    "color": "blue",
    "emoji": "📋",
    "wordCount": 342,
    "charCount": 1840,
    "readingTimeMin": 2,
    "strokeCount": 0,
    "mediaCount": 3,
    "isFlagged": false,
    "isPinned": true,
    "isFavorite": false,
    "isLocked": false,
    "isShared": true,
    "collaborators": [
      {
        "userId": "user_def456",
        "displayName": "Priya Singh",
        "permission": "edit",
        "avatarUrl": "https://..."
      }
    ],
    "version": 47,
    "createdAt": "2026-06-22T09:00:00Z",
    "updatedAt": "2026-06-22T14:30:00Z",
    "viewedAt": "2026-06-22T14:31:00Z",
    "lastEditedBy": {
      "id": "user_me123",
      "displayName": "Ishu"
    }
  }
}
```

---

### `PATCH /api/v1/notes/:id`
Update note content or metadata.

**Request Body (all fields optional):**
```json
{
  "title": "Updated Title",
  "bodyJson": { "type": "doc", "content": [ ... ] },
  "tags": ["work", "meeting", "q2"],
  "color": "green",
  "isFlagged": true,
  "isPinned": false,
  "isFavorite": true,
  "position": 2,
  "deviceId": "device_iphone_123",
  "vectorClock": { "device_iphone_123": 48 }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "note_abc123",
    "version": 48,
    "updatedAt": "2026-06-22T15:05:00Z",
    "conflict": false
  }
}
```

**Conflict Response:** `409 Conflict`
```json
{
  "success": false,
  "error": {
    "code": "SYNC_CONFLICT",
    "message": "This note was modified by another device.",
    "conflict": {
      "serverVersion": 47,
      "serverUpdatedAt": "2026-06-22T15:03:00Z",
      "serverBodyJson": { ... },
      "serverVectorClock": { ... }
    }
  }
}
```

---

### `DELETE /api/v1/notes/:id`
Move note to trash (soft delete).

**Response:** `200 OK`
```json
{ "success": true, "data": { "trashedAt": "2026-06-22T15:10:00Z" } }
```

### `DELETE /api/v1/notes/:id/permanent`
Permanently delete note (from trash only).

---

### `POST /api/v1/notes/:id/restore`
Restore note from trash.

### `POST /api/v1/notes/:id/duplicate`
Duplicate a note.

### `POST /api/v1/notes/:id/move`
Move note to different notebook.
```json
{ "notebookId": "nb_new", "sectionId": "sec_new", "position": 0 }
```

---

## Notebooks API

### `GET /api/v1/notebooks`
List all notebooks for the user.

### `POST /api/v1/notebooks`
Create new notebook.
```json
{
  "libraryId": "lib_abc",
  "title": "Math Class",
  "coverType": "color",
  "coverColor": "#6366f1",
  "defaultTemplateId": "tpl_cornell",
  "pageSize": "a4",
  "tags": ["school", "math"]
}
```

### `GET /api/v1/notebooks/:id`
Get notebook details and page list.

### `PATCH /api/v1/notebooks/:id`
Update notebook properties.

### `DELETE /api/v1/notebooks/:id`
Delete notebook (moves all pages to trash).

### `GET /api/v1/notebooks/:id/pages`
Get all pages in notebook (with pagination).

---

## Strokes API (Handwriting)

### `GET /api/v1/pages/:pageId/strokes`
Get all strokes for a canvas page.

**Response:**
```json
{
  "success": true,
  "data": {
    "strokes": [
      {
        "id": "stroke_xyz",
        "toolType": "ballpoint",
        "color": "#1a1a1a",
        "width": 2.0,
        "opacity": 1.0,
        "layerId": "default",
        "points": [
          { "x": 100.5, "y": 200.3, "pressure": 0.75, "tiltX": 0, "tiltY": 0, "t": 0 },
          { "x": 105.2, "y": 198.1, "pressure": 0.80, "tiltX": 2, "tiltY": -1, "t": 16 }
        ],
        "bounds": { "minX": 100, "minY": 196, "maxX": 200, "maxY": 210 },
        "isErased": false,
        "createdAt": "2026-06-22T10:00:00Z"
      }
    ],
    "pageVersion": 23
  }
}
```

### `POST /api/v1/pages/:pageId/strokes`
Add new strokes (batch).
```json
{
  "strokes": [ { ... stroke data ... } ],
  "deviceId": "device_iphone_123",
  "vectorClock": { "device_iphone_123": 24 }
}
```

### `DELETE /api/v1/pages/:pageId/strokes`
Erase strokes by ID.
```json
{ "strokeIds": ["stroke_a", "stroke_b"] }
```

### `PATCH /api/v1/pages/:pageId/strokes/transform`
Apply transform to strokes.
```json
{
  "strokeIds": ["stroke_a"],
  "transform": { "matrix": [1, 0, 0, 1, 50, 100] }
}
```

---

## Search API

### `GET /api/v1/search`
Full-text search across all notes.

**Query Parameters:**
```
q           string  Search query (required)
scope       string  'all' | 'notebook:{id}' | 'library:{id}'
type        string  'text' | 'handwriting' | 'all'
tags        string  Comma-separated tag filter
dateFrom    string  ISO date filter start
dateTo      string  ISO date filter end
limit       number  1-50 (default: 20)
cursor      string  Pagination cursor
semantic    boolean Enable semantic AI search (default: false)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "noteId": "note_abc",
        "title": "Meeting Notes",
        "highlights": [
          { "text": "...discussed <mark>machine learning</mark> models...", "field": "body" }
        ],
        "score": 0.95,
        "notebookTitle": "Work Notes",
        "updatedAt": "2026-06-22T14:00:00Z",
        "tags": ["work"]
      }
    ],
    "total": 12,
    "queryTime": 45
  }
}
```

---

## Sync API

### `POST /api/v1/sync`
Submit batch of offline operations.

**Request Body:**
```json
{
  "operations": [
    {
      "id": "op_local_uuid",
      "operation": "UPDATE_NOTE",
      "entityId": "note_abc123",
      "payload": { "title": "Updated Title", "bodyJson": { ... } },
      "vectorClock": { "device_iphone": 48 },
      "timestamp": 1750592400000
    }
  ],
  "deviceId": "device_iphone_123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "applied": ["op_local_uuid"],
    "conflicts": [],
    "failed": []
  }
}
```

### `GET /api/v1/sync/changes`
Get server changes since last sync.

**Query Parameters:**
```
since       number  Unix timestamp of last sync
deviceId    string  Exclude operations from this device
```

---

## AI API

### `POST /api/v1/ai/summarize`
Summarize a note.
```json
{
  "noteId": "note_abc123",
  "summaryType": "key-points",  // 'tldr' | 'key-points' | 'executive' | 'study'
  "maxLength": 200
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": "...",
    "keyPoints": ["Point 1", "Point 2", "Point 3"],
    "topics": ["machine learning", "project planning"],
    "sentiment": "neutral",
    "modelUsed": "claude-3-5-haiku"
  }
}
```

### `POST /api/v1/ai/rewrite`
Rewrite selected text.
```json
{
  "text": "original text here",
  "mode": "formal",  // 'formal' | 'casual' | 'shorter' | 'longer' | 'fix-grammar' | 'improve-flow'
  "context": "optional surrounding context for better results"
}
```

### `POST /api/v1/ai/complete`
Auto-complete from cursor position.
```json
{
  "context": "Last 500 chars of note content before cursor",
  "mode": "continue"  // 'continue' | 'complete-sentence'
}
```

### `POST /api/v1/ai/flashcards`
Generate flashcards from note content.
```json
{
  "noteId": "note_abc123",
  "count": 10,  // Desired number of flashcards
  "mode": "question-answer"  // 'question-answer' | 'term-definition' | 'multiple-choice'
}
```

### `POST /api/v1/ai/chat`
Chat with AI about a note.
```json
{
  "noteId": "note_abc123",
  "message": "What are the main action items from this meeting?",
  "history": [
    { "role": "user", "content": "Previous question" },
    { "role": "assistant", "content": "Previous answer" }
  ]
}
```

### `POST /api/v1/ai/search-semantic`
Semantic search using AI embeddings.
```json
{
  "query": "notes about machine learning in production",
  "limit": 10
}
```

### `POST /api/v1/ai/ocr`
Perform OCR on an image or handwriting page.
```json
{
  "pageId": "page_abc123",  // OR
  "imageUrl": "https://storage.../image.png",
  "language": "auto"  // or specific language code
}
```

---

## Files & Media API

### `POST /api/v1/files/upload`
Upload a media file.

**Request:** `multipart/form-data`
```
file:      binary (max 10MB free, 100MB pro)
noteId:    string
mediaType: 'image' | 'audio' | 'video' | 'file'
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "media_abc123",
    "url": "https://storage.../file.jpg",
    "thumbnailUrl": "https://storage.../file-thumb.jpg",
    "fileName": "photo.jpg",
    "fileSize": 2048000,
    "mimeType": "image/jpeg",
    "width": 1920,
    "height": 1080
  }
}
```

### `DELETE /api/v1/files/:id`
Delete a media file.

---

## WebSocket Events (Socket.IO)

### Connection
```javascript
const socket = io('/api/v1/collab', {
  auth: { token: clerkToken },
  query: { noteId: 'note_abc123' }
});
```

### Events (Client → Server)
```javascript
socket.emit('join-note', { noteId });
socket.emit('leave-note', { noteId });
socket.emit('update-presence', { cursor, isHandwriting });
socket.emit('yjs-update', { update: Uint8Array });        // CRDT update
socket.emit('awareness-update', { update: Uint8Array }); // Presence update
```

### Events (Server → Client)
```javascript
socket.on('user-joined', ({ userId, displayName, color }));
socket.on('user-left', ({ userId }));
socket.on('presence-update', ({ userId, cursor }));
socket.on('yjs-update', ({ update: Uint8Array }));       // CRDT sync
socket.on('awareness-update', ({ update: Uint8Array })); // Presence sync
socket.on('note-locked', ({ lockedBy, lockType }));
socket.on('note-unlocked', {});
socket.on('conflict-detected', ({ conflictData }));
```

---

## Rate Limit Headers

All responses include rate limit info:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1750592460
Retry-After: 60  (only on 429 responses)
```

---

## Error Codes Reference

| Code | HTTP | Description |
|------|------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing auth token |
| `FORBIDDEN` | 403 | No permission for this resource |
| `NOTE_NOT_FOUND` | 404 | Note doesn't exist |
| `NOTEBOOK_NOT_FOUND` | 404 | Notebook doesn't exist |
| `VALIDATION_ERROR` | 422 | Request body validation failed |
| `SYNC_CONFLICT` | 409 | Version conflict detected |
| `STORAGE_LIMIT_EXCEEDED` | 413 | User storage quota exceeded |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `AI_UNAVAILABLE` | 503 | AI service temporarily unavailable |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
