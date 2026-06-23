# Ishu Notes — Search & Discovery System

## Overview

Ishu Notes provides a multi-layer search system — from instant title search to deep semantic AI search that understands the meaning of your query, not just the keywords.

---

## Search Architecture

```
User Query
    │
    ├──► Layer 1: In-Memory Index (< 5ms)
    │    Fast fuzzy search on note titles
    │    Uses Fuse.js for fuzzy matching
    │
    ├──► Layer 2: Full-Text Search (< 50ms)
    │    PostgreSQL tsvector full-text search
    │    Searches: title + body text + tags
    │    Highlights matching snippets
    │
    ├──► Layer 3: Handwriting OCR Search (< 100ms)
    │    Searches recognized handwriting text
    │    Stored alongside strokes in DB
    │
    └──► Layer 4: Semantic AI Search (< 500ms)
         PGVector cosine similarity search
         Finds conceptually related notes
         Uses text-embedding-3-small model
```

---

## Search UI

### Search Bar (Command Palette Style)

Press `Ctrl/Cmd + F` anywhere → opens search:

```
┌──────────────────────────────────────────────────────────────────┐
│ 🔍  Search your notes...                              ⌘F  [ESC] │
├──────────────────────────────────────────────────────────────────┤
│ RECENT SEARCHES                                                  │
│   🕐 machine learning                                            │
│   🕐 meeting notes june                                          │
│   🕐 #work                                                       │
├──────────────────────────────────────────────────────────────────┤
│ QUICK ACTIONS                                                    │
│   ✏️  New Note                                    Ctrl+N         │
│   📓  New Notebook                               Ctrl+Shift+N   │
│   ⚙️  Settings                                   Ctrl+,         │
└──────────────────────────────────────────────────────────────────┘
```

After typing query:

```
┌──────────────────────────────────────────────────────────────────┐
│ 🔍  machine learning                            [✕] [🤖 AI] [⚙] │
├──────────────────────────────────────────────────────────────────┤
│ Filter: [All ▼] [Date ▼] [Type ▼] [Notebook ▼] [Tag ▼]        │
├──────────────────────────────────────────────────────────────────┤
│ NOTES (12 results)                                               │
│                                                                  │
│ 📝 Introduction to Machine Learning                             │
│    Work Notes > AI Research                                      │
│    "...supervised <mark>machine learning</mark> algorithms..."  │
│    Modified: 2 days ago                              #ai #study  │
│                                                                  │
│ 📝 ML Model Deployment Notes                                    │
│    Work Notes > Projects                                         │
│    "...deploying <mark>machine learning</mark> models to..."    │
│    Modified: 1 week ago                              #work #ml   │
│                                                                  │
│ ─── Handwriting (3 matches) ───                                 │
│                                                                  │
│ ✏️ [Handwritten page thumbnail]                                  │
│    Math Notes > Chapter 5                                        │
│    Recognized text: "<mark>machine learning</mark> gradient..."  │
│    Modified: 3 weeks ago                                         │
│                                                                  │
│ ─── Semantic matches (4 results) ───                            │
│ [AI] Deep Learning Study Guide        ↗ 94% similar             │
│ [AI] Neural Network Architecture      ↗ 87% similar             │
└──────────────────────────────────────────────────────────────────┘
```

---

## Full-Text Search Implementation

### PostgreSQL Full-Text Search

```sql
-- Search index column (maintained by triggers)
ALTER TABLE pages ADD COLUMN search_vector tsvector;

-- Create index for fast search
CREATE INDEX idx_pages_search ON pages USING GIN(search_vector);

-- Trigger to update search_vector on content change
CREATE OR REPLACE FUNCTION update_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.body_text, '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(NEW.tags, ' ')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pages_search_vector_update
  BEFORE INSERT OR UPDATE ON pages
  FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- Search query with ranking
SELECT
  id,
  title,
  ts_headline('english', body_text, query, 'MaxWords=20, MinWords=5') as excerpt,
  ts_rank_cd(search_vector, query) as rank
FROM pages,
  to_tsquery('english', 'machine & learning') AS query
WHERE
  user_id = $1
  AND is_trashed = false
  AND search_vector @@ query
ORDER BY rank DESC
LIMIT 20;
```

### Multi-Language Search

```sql
-- Support Hindi search
CREATE INDEX idx_pages_search_hindi ON pages
  USING GIN(to_tsvector('simple', body_text));

-- Fall back to 'simple' configuration for unsupported languages
-- 'simple': just lowercases and removes punctuation
```

---

## Instant Search (Client-Side)

For the note title search that appears as you type:

```typescript
import Fuse from 'fuse.js';

// Initialize Fuse.js index on app load
const fuseIndex = new Fuse(notes, {
  keys: [
    { name: 'title', weight: 2.0 },
    { name: 'tags', weight: 1.5 },
    { name: 'notebookTitle', weight: 0.5 },
  ],
  threshold: 0.4,        // Fuzzy match tolerance (0 = exact, 1 = anything)
  distance: 100,         // Characters to search
  includeScore: true,
  includeMatches: true,  // For highlighting
  ignoreLocation: true,  // Search entire string
});

function searchLocal(query: string) {
  return fuseIndex.search(query, { limit: 20 });
}
```

---

## Semantic Search (AI-Powered)

### Vector Embedding Pipeline

```
When note is created/updated:
         │
         ▼ (async, non-blocking)
Extract text content
         │
         ▼
Generate embedding:
  OpenAI text-embedding-3-small
  Input: title + first 500 chars of body
  Output: 1536-dimensional float vector
         │
         ▼
Store in pgvector:
  UPDATE ai_summaries
  SET embedding = $vector
  WHERE page_id = $noteId
```

### Vector Search Query

```sql
-- Find similar notes using cosine similarity
SELECT
  p.id,
  p.title,
  p.body_text,
  1 - (a.embedding <=> $query_embedding) as similarity
FROM pages p
JOIN ai_summaries a ON a.page_id = p.id
WHERE
  p.user_id = $userId
  AND p.is_trashed = false
  AND 1 - (a.embedding <=> $query_embedding) > 0.75  -- Similarity threshold
ORDER BY a.embedding <=> $query_embedding  -- Closest vectors first
LIMIT 10;
```

### Query Flow

```typescript
async function semanticSearch(userId: string, query: string) {
  // 1. Embed the query
  const queryEmbedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });

  // 2. Vector similarity search in PostgreSQL
  const results = await db.execute(sql`
    SELECT p.id, p.title, p.body_text,
           1 - (a.embedding <=> ${queryEmbedding.data[0].embedding}::vector) as similarity
    FROM pages p
    JOIN ai_summaries a ON a.page_id = p.id
    WHERE p.user_id = ${userId}
    AND p.is_trashed = false
    AND 1 - (a.embedding <=> ${queryEmbedding.data[0].embedding}::vector) > 0.75
    ORDER BY similarity DESC
    LIMIT 10
  `);

  return results.rows;
}
```

---

## Search Query Syntax

### Advanced Search Operators

| Operator | Example | Meaning |
|----------|---------|---------|
| Plain text | `machine learning` | Notes containing both words |
| Quoted phrase | `"machine learning"` | Exact phrase match |
| AND | `python AND tutorial` | Must have both |
| OR | `python OR javascript` | Either word |
| NOT / minus | `notes -draft` | Has "notes", not "draft" |
| Tag filter | `#work` | Notes with "work" tag |
| Notebook | `in:work-notes` | Search within specific notebook |
| Author | `by:priya` | Notes edited by Priya |
| Date | `created:today` | Created today |
| Date range | `modified:2026-06-01..2026-06-22` | Modified in date range |
| Has | `has:image` | Notes with images |
| Has | `has:audio` | Notes with audio |
| Has | `has:drawing` | Notes with handwriting |
| Is | `is:shared` | Shared notes |
| Is | `is:pinned` | Pinned notes |
| Is | `is:flagged` | Flagged notes |
| Word count | `words:>500` | Notes with 500+ words |
| Regex | `/machine.learning/i` | Regular expression |
| Field | `title:meeting` | Search only in title |

### Example Complex Query
```
#work in:projects modified:2026-06 has:image -draft
```
→ Work-tagged notes, in Projects notebook, modified in June 2026, with images, not marked draft

---

## Handwriting Search

### OCR Search Index

```typescript
// After OCR recognition, store indexed text
interface HandwritingIndex {
  pageId: string;
  strokeRegionId: string;   // Which area of the page
  recognizedText: string;
  confidence: number;
  bounds: BoundingBox;      // Where on page this text appears
  language: string;
  createdAt: Date;
}

// Search returns both typed content AND handwriting
async function searchHandwriting(userId: string, query: string) {
  const results = await db.execute(sql`
    SELECT
      p.id as page_id,
      p.title,
      h.recognized_text,
      h.bounds,
      h.confidence,
      ts_rank_cd(to_tsvector('english', h.recognized_text), plainto_tsquery($query)) as rank
    FROM pages p
    JOIN handwriting_index h ON h.page_id = p.id
    WHERE
      p.user_id = ${userId}
      AND to_tsvector('english', h.recognized_text) @@ plainto_tsquery(${query})
    ORDER BY rank DESC
    LIMIT 10
  `);

  return results.rows;
}
```

---

## Search Filters Panel

```
Advanced Filters (expandable):
┌─────────────────────────────────────────────────────────────┐
│ CONTENT TYPE                                                │
│   [✓] Text    [✓] Handwriting    [✓] Voice   [✓] Mixed    │
│                                                             │
│ DATE RANGE                                                  │
│   [Today][Yesterday][This week][This month][Custom range]  │
│                                                             │
│ NOTEBOOK                                                    │
│   [All] [Personal] [Work] [School] [...]                   │
│                                                             │
│ TAGS                                                        │
│   [+ Add tag filter]                                        │
│   ● work  ● meeting  [× remove]                            │
│                                                             │
│ STATUS                                                      │
│   [○] Pinned   [○] Flagged   [○] Shared   [○] Locked     │
│                                                             │
│ CONTAINS                                                    │
│   [○] Images   [○] Audio   [○] Files   [○] Links          │
│                                                             │
│ [Reset Filters] ────────────────── [Apply →]               │
└─────────────────────────────────────────────────────────────┘
```

---

## Recent Searches & History

```typescript
// Last 50 searches stored in localStorage
interface SearchHistory {
  query: string;
  filters: SearchFilters;
  resultCount: number;
  searchedAt: number;
}

// Clear individual or all history
// Suggestion: Show in command palette when bar is empty
```

---

## Search Performance Optimization

### Index Warm-up
- Build client-side Fuse.js index on app init (background)
- Index loaded from IndexedDB cache (no re-download)
- Incremental updates: Only re-index changed notes

### Request Optimization
- Debounce: 200ms after last keystroke before server call
- Cancel: Abort previous request when new query typed
- Stale-while-revalidate: Show cached results immediately, update in background
- Cursor-based pagination (no OFFSET for performance)

### Search Result Ranking (Composite Score)
```
Final Rank = 
  (full_text_relevance × 0.40) +
  (recency_score × 0.25) +
  (tag_match_bonus × 0.15) +
  (title_match_bonus × 0.10) +
  (semantic_similarity × 0.10)
```
