# Ishu Notes — Data Migration, Versioning & Compatibility

## Overview

Data is the most important thing in a note-taking app. Ishu Notes guarantees: **no data loss, ever**. This document covers how data is versioned, how migrations work, backward compatibility strategies, and how users can import from or export to any other app at any time.

---

## Version History System

### How Versioning Works

Every note keeps a complete history of changes:

```
Note "Meeting Notes"
  │
  ├── v47 (current)  — June 22, 2026, 14:30  — "Added action items"
  ├── v46            — June 22, 2026, 13:15  — "Corrected typo"
  ├── v45            — June 22, 2026, 09:00  — "Initial draft"
  ├── v44            — June 21, 2026, 18:00  — "Updated agenda"
  │   ...
  └── v1             — June 15, 2026, 10:00  — "Created"
```

### Version Storage Strategy

```typescript
// Versions stored as JSON patches (RFC 6902), not full copies
// This drastically reduces storage

interface NoteVersion {
  id: string;
  noteId: string;
  version: number;
  
  // Store as diff from previous version (efficient)
  patch: JsonPatch[];          // RFC 6902 JSON Patch operations
  
  // Metadata
  userId: string;              // Who made this change
  deviceId: string;            // Which device
  changeDescription: string;   // Auto-generated description
  wordCountDelta: number;      // How many words added/removed
  
  createdAt: Date;
}

// JSON Patch example (add one sentence to paragraph)
const patch: JsonPatch[] = [
  {
    op: 'add',
    path: '/content/0/content/3',
    value: { type: 'text', text: 'New sentence added here.' }
  }
];

// Reconstruct any version: apply patches sequentially from v1
function reconstructVersion(noteId: string, targetVersion: number): NoteContent {
  const v1 = getVersion(noteId, 1).fullContent;
  const patches = getPatchesBetween(noteId, 1, targetVersion);
  return patches.reduce((content, patch) => applyPatch(content, patch), v1);
}
```

### Version Retention Policy

| Plan | Retention | Storage |
|------|-----------|---------|
| Free | Last 30 versions | ~5 MB/note |
| Pro | 90 days of history | Unlimited |
| Team | 1 year of history | Unlimited |
| Enterprise | Custom (1-7 years) | Custom |

---

## Version History UI

### Accessing Version History

```
Editor → ⋮ menu → Version History
OR
Editor → [version] badge in bottom bar → Click
```

### Version History Panel

```
┌────────────────────────────────────────────────────────────────────┐
│  Version History — Meeting Notes                         [Close ✕] │
├──────────────────────────────────────────────────────────────────── ┤
│                                                                     │
│  FILTER: [All changes ▼]   [All authors ▼]   [Date range ▼]       │
│                                                                     │
│  TODAY                                                              │
│  ● v47  14:30  You                  "Added action items"           │
│    v46  13:15  You                  "Fixed typo in intro"          │
│    v45  09:00  Priya Singh          "Added agenda section"         │
│                                                                     │
│  YESTERDAY                                                          │
│    v44  18:00  You                  "+45 words"                    │
│    v43  15:30  Raj Sharma           "Updated budget section"       │
│    v42  11:00  You                  "Created note"                 │
│                                                                     │
│  ── Auto-saves (minor) ──────────────────────────────────          │
│    v41  June 20, 22:15  You         "+12 words"                    │
│    v40  June 20, 21:30  You         "−5 words"                     │
│                                                                     │
├──────────────────────────────────────────────────────────────────── ┤
│  Selected: v45 (June 22, 09:00 — Priya Singh)                     │
│                                                                     │
│  PREVIEW:                                                           │
│  [Note content at v45 shown here]                                  │
│                                                                     │
│  [Compare with current ▼]  [Restore this version]  [Copy content] │
└────────────────────────────────────────────────────────────────────┘
```

### Diff View (Compare Versions)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Comparing: v45 (left) ←→ v47 current (right)                     │
│  Author: You | Time: 14:30 | +42 words                            │
├──────────────────────────────┬──────────────────────────────────── ┤
│  Version 45                  │  Version 47 (current)               │
│  June 22, 09:00              │  June 22, 14:30                     │
├──────────────────────────────┼──────────────────────────────────── ┤
│  # Meeting Notes             │  # Meeting Notes                    │
│                              │                                     │
│  Agenda:                     │  Agenda:                            │
│  - Q3 Review                 │  - Q3 Review                        │
│  - Budget                    │  - Budget                           │
│                              │  - Marketing Plan ←[ADDED]         │
│                              │                                     │
│  Notes:                      │  Notes:                             │
│  [REMOVED] ~~Old paragraph~~ │  New revised paragraph here         │
│                              │                                     │
│                              │  ## Action Items ←[ADDED SECTION]  │
│                              │  - [ ] Priya: Slides by Fri        │
│                              │  - [ ] Raj: Review contract        │
└──────────────────────────────┴──────────────────────────────────── ┘

  Added:   [██████ +42 words] (green)
  Removed: [█ -8 words] (red)

  [Restore v45 →]  [Keep current]  [Merge both →]
```

---

## Database Schema Migrations (Drizzle ORM)

### Migration Workflow

```
Developer makes schema change
        │
        ▼
pnpm --filter @workspace/db run generate
        │
        ▼ (creates)
migrations/
  0001_initial_schema.sql
  0002_add_ai_summaries.sql
  0003_add_pgvector.sql ← new migration
        │
        ▼
pnpm --filter @workspace/db run migrate
        │
        ▼ (runs in production safely)
```

### Migration Safety Rules

```typescript
// RULE 1: Never drop columns in a migration — mark deprecated instead
// BAD:
ALTER TABLE pages DROP COLUMN old_body;

// GOOD:
ALTER TABLE pages ADD COLUMN body_text_deprecated boolean DEFAULT true;
-- Remove in next major version (6 months later)

// RULE 2: Always add columns with defaults or as nullable
// BAD:
ALTER TABLE pages ADD COLUMN word_count integer NOT NULL;

// GOOD:
ALTER TABLE pages ADD COLUMN word_count integer DEFAULT 0;

// RULE 3: For large tables, use concurrent index creation
CREATE INDEX CONCURRENTLY idx_pages_user_id ON pages(user_id);
-- vs (blocks writes):
CREATE INDEX idx_pages_user_id ON pages(user_id);

// RULE 4: Test on production copy before applying
// Staging must mirror production data size and distribution

// RULE 5: Every migration must have a rollback
-- Up migration: 0003_add_vector.sql
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE ai_summaries ADD COLUMN embedding vector(1536);

-- Down migration: 0003_add_vector.down.sql
ALTER TABLE ai_summaries DROP COLUMN embedding;
```

### Migration Tracking Table

```sql
-- Drizzle tracks migrations in this table
CREATE TABLE drizzle_migrations (
  id         serial PRIMARY KEY,
  hash       text NOT NULL,
  created_at bigint
);

-- Check migration status
SELECT * FROM drizzle_migrations ORDER BY created_at;
```

---

## App Data Format Versioning

### Ishu Notes Backup Format (.isnbak)

```json
{
  "formatVersion": 3,
  "appVersion": "1.2.0",
  "exportedAt": "2026-06-22T15:00:00Z",
  "userId": "user_abc123",
  "checksum": "sha256:abc123...",
  
  "libraries": [
    {
      "id": "lib_1",
      "title": "Personal",
      "notebooks": [
        {
          "id": "nb_1",
          "title": "Journal",
          "pages": [
            {
              "id": "page_1",
              "title": "Day 1",
              "contentVersion": 2,
              "bodyJson": { "type": "doc", "content": [] },
              "strokes": [...],
              "media": [...]
            }
          ]
        }
      ]
    }
  ],
  
  "tags": [...],
  "templates": [...],
  "settings": {...}
}
```

### Format Version Compatibility

| App Version | Format Version | Reads | Writes |
|-------------|---------------|-------|-------|
| 1.0.x | v1 | v1 | v1 |
| 1.1.x | v2 | v1, v2 | v2 |
| 1.2.x | v3 | v1, v2, v3 | v3 |
| 2.0.x | v4 | v2, v3, v4 | v4 |

**Backward compatibility:** Always read 2 previous major format versions.
**Forward compatibility:** Gracefully ignore unknown fields (never crash).

### TipTap Document Version

```typescript
// TipTap editor content version tracking
interface EditorDocument {
  type: 'doc';
  version: number;    // 1, 2, 3...
  content: Node[];
}

// Migration function when opening old document format
function migrateDocumentVersion(doc: EditorDocument): EditorDocument {
  if (doc.version === 1) {
    // v1 → v2: Convert 'heading' to 'customHeading' with level property
    doc = migrateV1toV2(doc);
  }
  if (doc.version === 2) {
    // v2 → v3: Add 'id' field to all block nodes
    doc = migrateV2toV3(doc);
  }
  return doc;
}
```

---

## Import System — Detailed

### Import Pipeline

```
User selects source app / file
        │
        ▼
ImportWizard.tsx opens
        │
        ▼
File/API access (OAuth or file picker)
        │
        ▼
Parser (app-specific):
  NotionParser → converts to Ishu Notes JSON
  EvernoteParser → .enex → Ishu Notes JSON
  ObsidianParser → .md files → Ishu Notes JSON
        │
        ▼
Validation layer (check for corrupt data)
        │
        ▼
Preview (show what will be imported)
        │
        ▼
User confirms → Import begins
        │
        ▼ (background job, shows progress)
Create libraries/notebooks/pages in DB
Upload media files to storage
Index content for search
        │
        ▼
Import complete notification
```

### Parser Implementations

```typescript
// Notion import via API
class NotionParser {
  async import(accessToken: string, pageIds: string[]) {
    const notion = new Client({ auth: accessToken });
    
    for (const pageId of pageIds) {
      const page = await notion.pages.retrieve({ page_id: pageId });
      const blocks = await notion.blocks.children.list({ block_id: pageId });
      
      // Convert Notion blocks → TipTap JSON
      const tiptapContent = this.convertNotionBlocks(blocks.results);
      
      // Handle nested pages recursively
      const childPages = blocks.results.filter(b => b.type === 'child_page');
      
      await createPage({
        title: this.extractTitle(page),
        bodyJson: tiptapContent,
        notebookId: this.mapNotionDatabaseToNotebook(page),
        tags: this.extractTags(page.properties),
        createdAt: new Date(page.created_time),
        updatedAt: new Date(page.last_edited_time),
      });
    }
  }
  
  private convertNotionBlocks(blocks: NotionBlock[]): TipTapNode {
    // Map each Notion block type to TipTap equivalent
    return {
      type: 'doc',
      content: blocks.map(block => {
        switch (block.type) {
          case 'paragraph':    return this.convertParagraph(block);
          case 'heading_1':   return this.convertHeading(block, 1);
          case 'heading_2':   return this.convertHeading(block, 2);
          case 'heading_3':   return this.convertHeading(block, 3);
          case 'bulleted_list_item': return this.convertBullet(block);
          case 'numbered_list_item': return this.convertNumbered(block);
          case 'to_do':       return this.convertCheckbox(block);
          case 'toggle':      return this.convertToggle(block);
          case 'code':        return this.convertCode(block);
          case 'quote':       return this.convertQuote(block);
          case 'callout':     return this.convertCallout(block);
          case 'table':       return this.convertTable(block);
          case 'image':       return this.convertImage(block);
          case 'divider':     return { type: 'horizontalRule' };
          default:            return this.convertUnknown(block);
        }
      })
    };
  }
}
```

---

## Data Integrity Guarantees

### Checksums on Backup Files

```typescript
// Every backup file has a SHA-256 checksum
async function createBackup(userId: string): Promise<BackupFile> {
  const data = await exportAllUserData(userId);
  const json = JSON.stringify(data);
  
  const checksum = crypto
    .createHash('sha256')
    .update(json)
    .digest('hex');

  return {
    ...data,
    checksum: `sha256:${checksum}`,
    exportedAt: new Date().toISOString(),
  };
}

// Verify checksum on import
function verifyBackupIntegrity(backup: BackupFile): boolean {
  const { checksum, ...data } = backup;
  const computed = `sha256:${crypto
    .createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex')}`;
  return computed === checksum;
}
```

### Database Transaction Safety

```typescript
// All multi-step operations use database transactions
async function moveNoteToNotebook(
  noteId: string,
  targetNotebookId: string,
  userId: string
) {
  await db.transaction(async (tx) => {
    // 1. Verify ownership
    const note = await tx.query.pages.findFirst({
      where: and(eq(pages.id, noteId), eq(pages.userId, userId))
    });
    if (!note) throw new Error('NOTE_NOT_FOUND');

    // 2. Update note
    await tx.update(pages)
      .set({ notebookId: targetNotebookId })
      .where(eq(pages.id, noteId));

    // 3. Log the operation for sync
    await tx.insert(syncLog).values({
      operation: 'MOVE_NOTE',
      entityId: noteId,
      payload: { from: note.notebookId, to: targetNotebookId },
    });

    // If ANY step fails → entire transaction rolled back
    // Data is never in an inconsistent state
  });
}
```

---

## Disaster Recovery

### Backup Schedule (Production)

| Backup Type | Frequency | Retention | Storage |
|-------------|-----------|-----------|---------|
| Full DB dump | Daily (2 AM UTC) | 30 days | S3 + Glacier |
| WAL streaming | Continuous | 7 days | S3 |
| Point-in-time | Available any 15-min window | 7 days | RDS native |
| User exports | On-demand | User controls | User storage |

### Recovery Time Objectives

| Scenario | RTO | RPO |
|----------|-----|-----|
| Server crash (auto-restart) | < 1 min | 0 (in-memory) |
| DB corruption (replica failover) | < 5 min | < 1 sec (WAL) |
| AZ failure (multi-AZ failover) | < 2 min | < 1 sec |
| Region failure (cross-region) | < 30 min | < 15 min |
| Ransomware (restore from Glacier) | < 4 hours | < 24 hours |

### User Data Deletion (GDPR Right to Erasure)

```typescript
// Complete data deletion within 30 days of request
async function deleteUserData(userId: string) {
  await db.transaction(async (tx) => {
    // 1. Delete all strokes
    await tx.delete(strokes).where(eq(strokes.userId, userId));

    // 2. Delete all pages
    await tx.delete(pages).where(eq(pages.userId, userId));

    // 3. Delete notebooks, libraries, tags
    await tx.delete(notebooks).where(eq(notebooks.userId, userId));
    await tx.delete(libraries).where(eq(libraries.userId, userId));
    await tx.delete(tags).where(eq(tags.userId, userId));

    // 4. Delete media files from storage
    const mediaFiles = await tx.query.media.findMany({
      where: eq(media.userId, userId)
    });
    await deleteFromStorage(mediaFiles.map(m => m.storageKey));
    await tx.delete(media).where(eq(media.userId, userId));

    // 5. Delete AI data (embeddings, summaries)
    await tx.delete(aiSummaries).where(eq(aiSummaries.userId, userId));

    // 6. Delete user account
    await tx.delete(users).where(eq(users.id, userId));

    // 7. Log deletion for compliance audit
    await auditLog.recordDeletion(userId, new Date());
  });

  // 8. Purge CDN cache
  await cdn.purgeUserContent(userId);
}
```
