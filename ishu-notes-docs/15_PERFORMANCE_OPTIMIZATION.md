# Ishu Notes — Performance Optimization Strategy

## Performance Goals

| Metric | Target | Measurement Tool |
|--------|--------|-----------------|
| First Contentful Paint (FCP) | < 1.0s | Lighthouse |
| Largest Contentful Paint (LCP) | < 2.5s | Lighthouse |
| Time to Interactive (TTI) | < 3.5s | Lighthouse |
| Cumulative Layout Shift (CLS) | < 0.1 | Lighthouse |
| First Input Delay (FID) | < 100ms | Real User Monitoring |
| Interaction to Next Paint (INP) | < 200ms | Chrome UX Report |
| Handwriting latency | < 16ms | Custom measurement |
| Note open time | < 300ms | Custom measurement |
| Search results | < 200ms | Custom measurement |
| Sync operation | < 500ms | Custom measurement |
| Canvas page switch | < 100ms | Custom measurement |
| Lighthouse Score | 90+ | Lighthouse |

---

## Frontend Performance

### Code Splitting & Lazy Loading

```typescript
// Route-based code splitting (React Router + Vite)
const routes = [
  {
    path: '/',
    component: lazy(() => import('./pages/Dashboard')),
  },
  {
    path: '/note/:id',
    component: lazy(() => import('./pages/NoteEditor')),
  },
  {
    path: '/notebook/:id',
    component: lazy(() => import('./pages/Notebook')),
  },
  {
    path: '/settings',
    component: lazy(() => import('./pages/Settings')),
  },
];

// Feature-based code splitting
// Heavy libraries only loaded when needed:
const CanvasEditor = lazy(() =>
  import('./features/handwriting/CanvasEditor')
  // Konva.js (~400KB) only loaded for canvas pages
);

const AIChatPanel = lazy(() =>
  import('./features/ai/AIChatPanel')
  // AI SDK only loaded when AI panel opened
);

const ExportModal = lazy(() =>
  import('./features/export/ExportModal')
  // pdf-lib, xlsx only loaded when export triggered
);

const CollaborationOverlay = lazy(() =>
  import('./features/collaboration/CollaborationOverlay')
  // Yjs + Socket.IO only loaded when sharing active
);
```

### Bundle Size Optimization

```javascript
// vite.config.ts — Optimized chunking
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks grouped logically
          'react-vendor':    ['react', 'react-dom', 'react-router-dom'],
          'editor-vendor':   ['@tiptap/react', '@tiptap/starter-kit'],
          'canvas-vendor':   ['konva', 'react-konva', 'perfect-freehand'],
          'motion-vendor':   ['framer-motion'],
          'query-vendor':    ['@tanstack/react-query'],
          'ai-vendor':       ['openai', 'langchain'],
          'collab-vendor':   ['yjs', 'y-websocket'],
          'ui-vendor':       ['@radix-ui/react-dialog', '@radix-ui/react-popover'],
          'crypto-vendor':   ['libsodium-wrappers', 'tweetnacl'],
        },
      },
    },
    // Remove console.* in production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
});
```

### Asset Optimization

#### Images
- **Format:** WebP with AVIF fallback (via `<picture>` element)
- **Responsive images:** `srcset` and `sizes` for all images
- **Lazy loading:** All images below fold use `loading="lazy"`
- **Blur-up placeholders:** Base64 tiny placeholder while full image loads
- **CDN:** All static assets served from CDN edge nodes

```html
<picture>
  <source type="image/avif" srcset="image-400.avif 400w, image-800.avif 800w" />
  <source type="image/webp" srcset="image-400.webp 400w, image-800.webp 800w" />
  <img src="image-400.jpg" loading="lazy" decoding="async"
       srcset="image-400.jpg 400w, image-800.jpg 800w"
       sizes="(max-width: 640px) 400px, 800px"
       width="800" height="600" alt="..." />
</picture>
```

#### Fonts
```html
<!-- Preload critical fonts -->
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin />

<!-- Font display: swap for body, optional for decorative -->
<style>
  @font-face {
    font-family: 'Inter var';
    src: url('/fonts/inter-var.woff2') format('woff2');
    font-display: swap;
    font-weight: 100 900;
  }
</style>
```

#### Icons
- Sprite SVG (single HTTP request for all icons)
- Or inline SVG (zero HTTP requests for critical icons)
- Dynamic import for large icon sets

---

## Canvas Performance

### Rendering Pipeline Optimization

```typescript
class CanvasRenderer {
  private offscreenCanvas: OffscreenCanvas;
  private worker: Worker;
  private rafId: number | null = null;
  private dirtyRegions: DOMRect[] = [];
  private isRendering = false;

  // Only re-render what changed
  markDirty(rect: DOMRect) {
    this.dirtyRegions.push(rect);
    this.scheduleRender();
  }

  private scheduleRender() {
    if (this.rafId) return; // Already scheduled
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.flushDirtyRegions();
    });
  }

  private flushDirtyRegions() {
    if (this.dirtyRegions.length === 0) return;
    const merged = this.mergeDirtyRegions(this.dirtyRegions);
    this.dirtyRegions = [];
    this.renderRegion(merged);
  }
}
```

### Stroke Rendering Optimization
1. **Point decimation:** Remove redundant points (Ramer-Douglas-Peucker algorithm)
2. **Stroke caching:** Convert finished strokes to bitmap (rasterization)
3. **Viewport culling:** Only render strokes within current viewport
4. **LOD rendering:** At < 50% zoom, render simplified paths
5. **Worker rendering:** Heavy rendering in OffscreenCanvas Web Worker

### Canvas Memory Management
```typescript
// LRU cache for rasterized stroke bitmaps
const strokeBitmapCache = new LRUCache<string, ImageBitmap>({
  max: 100,           // Max 100 cached bitmaps
  maxSize: 50_000_000, // Max 50MB total
  sizeCalculation: (bitmap) => bitmap.width * bitmap.height * 4,
  dispose: (bitmap) => bitmap.close(), // Free GPU memory
});
```

---

## Data & State Performance

### React Rendering Optimization

```typescript
// Use React.memo for expensive components
const NoteCard = React.memo(({ note }: { note: Note }) => {
  return <div>...</div>;
}, (prev, next) => prev.note.id === next.note.id && prev.note.updatedAt === next.note.updatedAt);

// Coarse-grained selectors with Zustand
// BAD: Subscribe to whole store (re-renders on any change)
const store = useAppStore();

// GOOD: Subscribe to specific slice only
const sidebarOpen = useAppStore(state => state.ui.sidebarOpen);
const activeNoteId = useAppStore(state => state.ui.activeNoteId);

// Separate selectors for frequently vs rarely changing data
```

### List Virtualization (TanStack Virtual)
```typescript
// For note lists with 10,000+ notes
const rowVirtualizer = useVirtualizer({
  count: notes.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 72,         // Estimated row height
  overscan: 10,                    // Render 10 items outside viewport
  measureElement: (el) =>          // Accurate measurement
    el.getBoundingClientRect().height,
});

// Only renders ~15-20 items at a time, regardless of list size
```

### Database Query Optimization

```typescript
// Paginated note list (never load all notes at once)
const useNoteList = (notebookId: string) =>
  useInfiniteQuery({
    queryKey: ['notes', notebookId],
    queryFn: ({ pageParam = 0 }) =>
      api.get(`/notes?notebook=${notebookId}&offset=${pageParam}&limit=50`),
    getNextPageParam: (lastPage) => lastPage.nextOffset,
  });

// Prefetch next page before user reaches bottom
useEffect(() => {
  if (isNearBottom) queryClient.prefetchInfiniteQuery(...);
}, [scrollPosition]);
```

### Debouncing & Throttling
```typescript
// Auto-save: debounced (wait 500ms after last keystroke)
const debouncedSave = useDebouncedCallback(
  (content) => saveNote(content),
  500,
);

// Scroll position: throttled (max 60fps = 16ms)
const throttledScrollHandler = useThrottledCallback(
  handleScroll,
  16,
);

// Search: debounced (wait 200ms after typing stops)
const debouncedSearch = useDebouncedCallback(
  performSearch,
  200,
);

// Canvas point capture: requestAnimationFrame (16ms)
const onPointerMove = (e: PointerEvent) => {
  pendingPoints.push({ x: e.x, y: e.y, pressure: e.pressure });
  // Batch into single rAF call
  if (!rafPending) {
    rafPending = true;
    requestAnimationFrame(() => {
      processPoints(pendingPoints.splice(0));
      rafPending = false;
    });
  }
};
```

---

## Backend Performance

### Database Query Optimization

```sql
-- Use partial indexes for common filtered queries
CREATE INDEX idx_pages_active ON pages(notebook_id, updated_at DESC)
WHERE is_trashed = false AND is_archived = false;

-- Covering indexes to avoid table lookups
CREATE INDEX idx_notes_list ON pages(user_id, updated_at DESC)
INCLUDE (title, body_text, tags, is_flagged, color);

-- Materialized view for notebook statistics (refreshed periodically)
CREATE MATERIALIZED VIEW notebook_stats AS
SELECT
  notebook_id,
  COUNT(*) as page_count,
  SUM(word_count) as total_words,
  MAX(updated_at) as last_modified,
  array_agg(DISTINCT unnest(tags)) as all_tags
FROM pages
WHERE is_trashed = false
GROUP BY notebook_id;

CREATE UNIQUE INDEX ON notebook_stats(notebook_id);

-- Refresh every 5 minutes
SELECT cron.schedule('refresh-notebook-stats', '*/5 * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY notebook_stats');
```

### Redis Caching Strategy
```typescript
// Cache note lists (invalidate on any write)
const NOTE_LIST_TTL = 300; // 5 minutes

async function getNoteList(userId: string, notebookId: string): Promise<Page[]> {
  const cacheKey = `notes:${userId}:${notebookId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const notes = await db.query.pages.findMany({
    where: and(eq(pages.userId, userId), eq(pages.notebookId, notebookId)),
    orderBy: desc(pages.updatedAt),
  });

  await redis.setex(cacheKey, NOTE_LIST_TTL, JSON.stringify(notes));
  return notes;
}

// Invalidate on write
async function updateNote(id: string, userId: string, data: Partial<Page>) {
  await db.update(pages).set(data).where(eq(pages.id, id));
  const note = await db.query.pages.findFirst({ where: eq(pages.id, id) });
  // Invalidate list cache for this notebook
  await redis.del(`notes:${userId}:${note.notebookId}`);
}
```

### Connection Pooling
```typescript
// PostgreSQL connection pool
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,           // Max 20 concurrent connections
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
});
```

---

## PWA Performance

### App Shell Architecture
```
App Shell (static, cached on install):
├── index.html (~4KB)
├── app-shell.css (~20KB gzipped)
├── vendor-react.js (~130KB gzipped)
├── app-router.js (~15KB gzipped)
└── icons/ (12 sizes)

Total App Shell: ~175KB gzipped
→ Cached by Service Worker → Instant subsequent loads
```

### Resource Hints
```html
<!-- Critical path resources -->
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://api.ishunotes.com">
<link rel="dns-prefetch" href="https://storage.ishunotes.com">

<!-- Prefetch next likely navigation -->
<link rel="prefetch" href="/note/editor-chunk.js">
<link rel="prefetch" href="/settings-chunk.js">
```

---

## Monitoring & Profiling

### Real User Monitoring (RUM)
```typescript
// Capture Core Web Vitals in production
import { onCLS, onFID, onFCP, onLCP, onTTFB, onINP } from 'web-vitals';

function sendToAnalytics(metric: Metric) {
  // Send to self-hosted analytics (PostHog)
  posthog.capture('web_vitals', {
    metric_name: metric.name,
    metric_value: metric.value,
    metric_rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
    page_path: window.location.pathname,
    connection_type: navigator.connection?.effectiveType,
  });
}

onCLS(sendToAnalytics);
onFID(sendToAnalytics);
onFCP(sendToAnalytics);
onLCP(sendToAnalytics);
onTTFB(sendToAnalytics);
onINP(sendToAnalytics);
```

### Performance Budget Enforcement
```javascript
// Fail build if bundles exceed size budget
// vite-bundle-visualizer + custom plugin
const performanceBudget = {
  'react-vendor':  { maxSize: '150KB' },
  'editor-vendor': { maxSize: '200KB' },
  'canvas-vendor': { maxSize: '250KB' },
  'app':           { maxSize: '100KB' },
  // Total initial load: < 700KB gzipped
};
```
