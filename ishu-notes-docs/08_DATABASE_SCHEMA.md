# Ishu Notes — Complete Database Schema

## Database: PostgreSQL 16 with Drizzle ORM

---

## Schema Diagram (Entity Relationship)

```
users ──── libraries ──── notebooks ──── sections ──── pages
  │              │              │                          │
  │         user_settings   notebook_templates          strokes
  │                             │                          │
  │                        notebook_shares             page_media
  │                                                        │
  ├── notes (inline notes)                           page_backlinks
  │      │
  │   note_tags ── tags
  │   note_media
  │   note_versions
  │   note_comments
  │   note_shares
  │
  ├── ai_summaries
  ├── search_vectors
  └── sync_operations
```

---

## Tables — Full Schema

### `users` Table
```sql
CREATE TABLE users (
  id              TEXT PRIMARY KEY,                    -- Clerk user ID
  email           TEXT NOT NULL UNIQUE,
  display_name    TEXT NOT NULL,
  avatar_url      TEXT,
  plan            TEXT NOT NULL DEFAULT 'free',        -- 'free' | 'pro' | 'enterprise'
  plan_expires_at TIMESTAMPTZ,
  storage_used    BIGINT NOT NULL DEFAULT 0,           -- bytes
  storage_limit   BIGINT NOT NULL DEFAULT 5368709120,  -- 5GB free
  locale          TEXT NOT NULL DEFAULT 'en',
  timezone        TEXT NOT NULL DEFAULT 'UTC',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `user_settings` Table
```sql
CREATE TABLE user_settings (
  user_id                    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme                      TEXT NOT NULL DEFAULT 'system',         -- 'light' | 'dark' | 'system'
  font_family                TEXT NOT NULL DEFAULT 'inter',
  font_size                  INTEGER NOT NULL DEFAULT 16,
  line_height                DECIMAL NOT NULL DEFAULT 1.6,
  editor_width               TEXT NOT NULL DEFAULT 'comfortable',    -- 'narrow' | 'comfortable' | 'wide' | 'full'
  default_note_color         TEXT NOT NULL DEFAULT 'none',
  default_pen_tool           TEXT NOT NULL DEFAULT 'ballpoint',
  default_pen_color          TEXT NOT NULL DEFAULT '#000000',
  default_pen_width          DECIMAL NOT NULL DEFAULT 2.0,
  spell_check_enabled        BOOLEAN NOT NULL DEFAULT true,
  auto_save_interval         INTEGER NOT NULL DEFAULT 2000,          -- ms
  handwriting_recognition    BOOLEAN NOT NULL DEFAULT true,
  ai_suggestions             BOOLEAN NOT NULL DEFAULT true,
  sync_on_wifi_only          BOOLEAN NOT NULL DEFAULT false,
  biometric_lock             BOOLEAN NOT NULL DEFAULT false,
  e2e_encryption             BOOLEAN NOT NULL DEFAULT false,
  sidebar_collapsed          BOOLEAN NOT NULL DEFAULT false,
  show_word_count            BOOLEAN NOT NULL DEFAULT true,
  default_view_mode          TEXT NOT NULL DEFAULT 'list',           -- 'list' | 'grid' | 'gallery'
  keyboard_shortcuts         JSONB NOT NULL DEFAULT '{}',
  custom_themes              JSONB NOT NULL DEFAULT '[]',
  toolbar_configuration      JSONB NOT NULL DEFAULT '{}',
  notification_preferences   JSONB NOT NULL DEFAULT '{}',
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `libraries` Table
```sql
CREATE TABLE libraries (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  color       TEXT NOT NULL DEFAULT '#6366f1',
  emoji       TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_libraries_user_id ON libraries(user_id);
```

### `notebooks` Table
```sql
CREATE TABLE notebooks (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id          TEXT NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  description         TEXT,
  cover_type          TEXT NOT NULL DEFAULT 'color',     -- 'color' | 'gradient' | 'image' | 'emoji'
  cover_color         TEXT NOT NULL DEFAULT '#6366f1',
  cover_gradient      JSONB,                             -- {from, to, angle}
  cover_image_url     TEXT,
  cover_emoji         TEXT,
  default_template_id TEXT REFERENCES page_templates(id),
  page_size           TEXT NOT NULL DEFAULT 'a4',        -- 'a4' | 'a5' | 'letter' | 'custom'
  page_width          DECIMAL,                           -- for custom page size
  page_height         DECIMAL,
  page_orientation    TEXT NOT NULL DEFAULT 'portrait',  -- 'portrait' | 'landscape'
  view_mode           TEXT NOT NULL DEFAULT 'continuous',-- 'continuous' | 'paginated' | 'grid'
  sort_order          TEXT NOT NULL DEFAULT 'manual',
  tags                TEXT[] NOT NULL DEFAULT '{}',
  is_shared           BOOLEAN NOT NULL DEFAULT false,
  is_locked           BOOLEAN NOT NULL DEFAULT false,
  lock_type           TEXT,                              -- 'pin' | 'password' | 'biometric'
  lock_hash           TEXT,                              -- hashed PIN/password
  is_favorite         BOOLEAN NOT NULL DEFAULT false,
  is_archived         BOOLEAN NOT NULL DEFAULT false,
  is_trashed          BOOLEAN NOT NULL DEFAULT false,
  trashed_at          TIMESTAMPTZ,
  page_count          INTEGER NOT NULL DEFAULT 0,
  position            INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notebooks_library_id ON notebooks(library_id);
CREATE INDEX idx_notebooks_user_id ON notebooks(user_id);
CREATE INDEX idx_notebooks_is_trashed ON notebooks(is_trashed);
CREATE INDEX idx_notebooks_tags ON notebooks USING GIN(tags);
```

### `sections` Table
```sql
CREATE TABLE sections (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id TEXT NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  color       TEXT,
  emoji       TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  is_collapsed BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sections_notebook_id ON sections(notebook_id);
```

### `pages` Table (Main Note Table)
```sql
CREATE TABLE pages (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id       TEXT NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  section_id        TEXT REFERENCES sections(id) ON DELETE SET NULL,
  parent_page_id    TEXT REFERENCES pages(id) ON DELETE CASCADE,  -- for nested pages
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Content
  title             TEXT NOT NULL DEFAULT 'Untitled',
  content_type      TEXT NOT NULL DEFAULT 'mixed',    -- 'rich-text' | 'handwriting' | 'mixed' | 'voice'
  body_json         JSONB,                            -- TipTap JSON document
  body_text         TEXT,                             -- Plain text extracted for search
  body_markdown     TEXT,                             -- Markdown export cache
  
  -- Page Configuration
  template_id       TEXT REFERENCES page_templates(id),
  background_type   TEXT NOT NULL DEFAULT 'template', -- 'blank' | 'template' | 'color' | 'image'
  background_value  TEXT,                             -- color hex or template ID
  
  -- Metadata
  word_count        INTEGER NOT NULL DEFAULT 0,
  char_count        INTEGER NOT NULL DEFAULT 0,
  stroke_count      INTEGER NOT NULL DEFAULT 0,
  media_count       INTEGER NOT NULL DEFAULT 0,
  reading_time_min  DECIMAL NOT NULL DEFAULT 0,
  
  -- Status flags
  is_flagged        BOOLEAN NOT NULL DEFAULT false,
  is_pinned         BOOLEAN NOT NULL DEFAULT false,
  is_favorite       BOOLEAN NOT NULL DEFAULT false,
  is_archived       BOOLEAN NOT NULL DEFAULT false,
  is_trashed        BOOLEAN NOT NULL DEFAULT false,
  is_locked         BOOLEAN NOT NULL DEFAULT false,
  lock_type         TEXT,
  lock_hash         TEXT,
  
  -- Visual
  color             TEXT,                             -- note color label
  emoji             TEXT,                             -- custom icon
  cover_image_url   TEXT,                             -- cover image
  
  -- Organization
  position          INTEGER NOT NULL DEFAULT 0,
  depth             INTEGER NOT NULL DEFAULT 0,       -- nesting level
  tags              TEXT[] NOT NULL DEFAULT '{}',
  
  -- Collaboration
  is_shared         BOOLEAN NOT NULL DEFAULT false,
  
  -- Sync
  version           INTEGER NOT NULL DEFAULT 1,
  device_id         TEXT,                             -- last edit device
  
  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  viewed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trashed_at        TIMESTAMPTZ,
  last_edited_by    TEXT REFERENCES users(id)
);

CREATE INDEX idx_pages_notebook_id ON pages(notebook_id);
CREATE INDEX idx_pages_section_id ON pages(section_id);
CREATE INDEX idx_pages_user_id ON pages(user_id);
CREATE INDEX idx_pages_parent_page_id ON pages(parent_page_id);
CREATE INDEX idx_pages_is_trashed ON pages(is_trashed);
CREATE INDEX idx_pages_updated_at ON pages(updated_at DESC);
CREATE INDEX idx_pages_tags ON pages USING GIN(tags);
CREATE INDEX idx_pages_body_text ON pages USING GIN(to_tsvector('english', body_text));
```

### `strokes` Table (Handwriting Data)
```sql
CREATE TABLE strokes (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id       TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  layer_id      TEXT NOT NULL DEFAULT 'default',
  tool_type     TEXT NOT NULL,                  -- pen type
  color         TEXT NOT NULL,
  width         DECIMAL NOT NULL,
  opacity       DECIMAL NOT NULL DEFAULT 1.0,
  points        JSONB NOT NULL,                 -- [{x,y,pressure,tiltX,tiltY,t}]
  bounds        JSONB NOT NULL,                 -- {minX,minY,maxX,maxY}
  transform     JSONB,                          -- 2D transform matrix
  is_erased     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_strokes_page_id ON strokes(page_id);
CREATE INDEX idx_strokes_layer_id ON strokes(layer_id);
CREATE INDEX idx_strokes_bounds ON strokes USING GIN(bounds);
```

### `page_media` Table
```sql
CREATE TABLE page_media (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id       TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL REFERENCES users(id),
  media_type    TEXT NOT NULL,                  -- 'image' | 'video' | 'audio' | 'file' | 'drawing'
  file_name     TEXT NOT NULL,
  file_size     BIGINT NOT NULL,
  mime_type     TEXT NOT NULL,
  storage_url   TEXT NOT NULL,
  thumbnail_url TEXT,
  ocr_text      TEXT,                           -- Extracted text from image
  duration_sec  DECIMAL,                        -- For audio/video
  width_px      INTEGER,
  height_px     INTEGER,
  position      JSONB,                          -- {x, y, width, height} in note
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_page_media_page_id ON page_media(page_id);
```

### `tags` Table
```sql
CREATE TABLE tags (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#6366f1',
  emoji       TEXT,
  parent_id   TEXT REFERENCES tags(id) ON DELETE SET NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, slug)
);

CREATE INDEX idx_tags_user_id ON tags(user_id);
```

### `page_versions` Table (Version History)
```sql
CREATE TABLE page_versions (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id     TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  version_num INTEGER NOT NULL,
  body_json   JSONB,
  body_text   TEXT,
  stroke_data JSONB,                            -- Snapshot of strokes at this version
  edited_by   TEXT NOT NULL REFERENCES users(id),
  change_summary TEXT,                          -- AI-generated summary of what changed
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(page_id, version_num)
);

CREATE INDEX idx_page_versions_page_id ON page_versions(page_id);
```

### `collaborators` Table
```sql
CREATE TABLE collaborators (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,                    -- 'notebook' | 'page'
  entity_id   TEXT NOT NULL,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_by  TEXT NOT NULL REFERENCES users(id),
  permission  TEXT NOT NULL DEFAULT 'view',     -- 'view' | 'comment' | 'edit' | 'admin'
  status      TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'accepted' | 'declined'
  share_token TEXT UNIQUE,                      -- for link sharing
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(entity_type, entity_id, user_id)
);
```

### `comments` Table
```sql
CREATE TABLE comments (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id       TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL REFERENCES users(id),
  parent_id     TEXT REFERENCES comments(id) ON DELETE CASCADE,
  body          TEXT NOT NULL,
  selection_ref JSONB,                          -- What text/area is commented on
  is_resolved   BOOLEAN NOT NULL DEFAULT false,
  resolved_by   TEXT REFERENCES users(id),
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `page_templates` Table
```sql
CREATE TABLE page_templates (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        TEXT REFERENCES users(id) ON DELETE CASCADE,  -- NULL = system template
  title          TEXT NOT NULL,
  category       TEXT NOT NULL,
  thumbnail_url  TEXT,
  background_url TEXT,
  svg_url        TEXT,
  page_size      TEXT NOT NULL DEFAULT 'a4',
  orientation    TEXT NOT NULL DEFAULT 'portrait',
  is_public      BOOLEAN NOT NULL DEFAULT false,
  is_system      BOOLEAN NOT NULL DEFAULT false,
  usage_count    INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `sync_operations` Table (Offline Sync Queue — Server-side record)
```sql
CREATE TABLE sync_operations (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id     TEXT NOT NULL,
  operation     TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     TEXT NOT NULL,
  payload       JSONB NOT NULL,
  vector_clock  JSONB NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',   -- 'pending' | 'applied' | 'conflicted' | 'failed'
  conflict_data JSONB,
  applied_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_ops_user_id ON sync_operations(user_id);
CREATE INDEX idx_sync_ops_status ON sync_operations(status);
```

### `ai_summaries` Table
```sql
CREATE TABLE ai_summaries (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id     TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  summary     TEXT NOT NULL,
  key_points  TEXT[] NOT NULL DEFAULT '{}',
  topics      TEXT[] NOT NULL DEFAULT '{}',
  sentiment   TEXT,                             -- 'positive' | 'negative' | 'neutral'
  embedding   vector(1536),                     -- pgvector embedding for semantic search
  model_used  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(page_id)
);

CREATE INDEX idx_ai_summaries_embedding ON ai_summaries USING ivfflat(embedding vector_cosine_ops);
```

---

## Row-Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE strokes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notes
CREATE POLICY pages_owner ON pages
  USING (user_id = auth.uid());

-- Collaborators can see shared notes
CREATE POLICY pages_collaborator ON pages
  USING (
    id IN (
      SELECT entity_id FROM collaborators
      WHERE user_id = auth.uid()
        AND entity_type = 'page'
        AND status = 'accepted'
    )
  );
```
