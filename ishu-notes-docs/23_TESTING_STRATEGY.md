# Ishu Notes — Testing Strategy

## Testing Philosophy

**"Test confidence, not coverage."** We don't chase 100% code coverage — we chase confidence that users can create, edit, organize, and sync notes without problems. Every critical user journey has an automated test.

---

## Testing Pyramid

```
         /\
        /E2E\        ← 50 critical user journeys (Playwright)
       /──────\
      / Integ  \     ← 200 integration tests (API routes + DB)
     /──────────\
    /    Unit    \   ← 800+ unit tests (Vitest)
   /──────────────\
```

---

## Unit Tests (Vitest)

### What to Unit Test
- Utility functions (date formatting, string manipulation)
- Sync queue logic (conflict detection, operation ordering)
- Stroke processing algorithms (point smoothing, bounds calculation)
- Rich text serialization (JSON → Markdown, JSON → HTML)
- Search ranking algorithm
- Vector clock merge logic
- Offline queue flush logic
- Permission checking functions
- Encryption/decryption helpers

### Test File Structure
```
src/
├── features/
│   ├── handwriting/
│   │   ├── strokeUtils.ts
│   │   └── strokeUtils.test.ts       ← co-located tests
│   ├── sync/
│   │   ├── conflictResolver.ts
│   │   └── conflictResolver.test.ts
│   └── search/
│       ├── searchRanker.ts
│       └── searchRanker.test.ts
└── shared/
    └── utils/
        ├── dateUtils.ts
        └── dateUtils.test.ts
```

### Example Unit Tests

```typescript
// conflictResolver.test.ts
import { describe, it, expect } from 'vitest';
import { mergeVectorClocks, detectConflict } from './conflictResolver';

describe('VectorClock', () => {
  it('merges two clocks by taking max of each device', () => {
    const clockA = { 'device-1': 5, 'device-2': 3 };
    const clockB = { 'device-1': 4, 'device-2': 7, 'device-3': 2 };
    
    const merged = mergeVectorClocks(clockA, clockB);
    
    expect(merged).toEqual({
      'device-1': 5,   // max(5, 4) = 5
      'device-2': 7,   // max(3, 7) = 7
      'device-3': 2,   // 0 vs 2 = 2
    });
  });

  it('detects conflict when clocks are concurrent', () => {
    const local  = { 'device-1': 5, 'device-2': 3 };
    const remote = { 'device-1': 4, 'device-2': 6 };
    // Neither dominates — concurrent edits = conflict
    
    expect(detectConflict(local, remote)).toBe(true);
  });

  it('detects no conflict when remote dominates local', () => {
    const local  = { 'device-1': 3, 'device-2': 2 };
    const remote = { 'device-1': 5, 'device-2': 4 };
    // Remote is strictly ahead — no conflict
    
    expect(detectConflict(local, remote)).toBe(false);
  });
});
```

```typescript
// strokeUtils.test.ts
import { describe, it, expect } from 'vitest';
import { simplifyStroke, calculateBounds } from './strokeUtils';

describe('strokeUtils', () => {
  describe('simplifyStroke', () => {
    it('removes redundant collinear points', () => {
      const points = [
        { x: 0, y: 0, pressure: 0.5, t: 0 },
        { x: 5, y: 0, pressure: 0.5, t: 16 },   // Collinear — should be removed
        { x: 10, y: 0, pressure: 0.5, t: 32 },
      ];
      
      const simplified = simplifyStroke(points, { epsilon: 1.0 });
      expect(simplified).toHaveLength(2); // Start + end only
    });

    it('preserves turning points', () => {
      const points = [
        { x: 0, y: 0, pressure: 0.5, t: 0 },
        { x: 50, y: 50, pressure: 0.8, t: 50 }, // Turn point
        { x: 100, y: 0, pressure: 0.5, t: 100 },
      ];
      
      const simplified = simplifyStroke(points, { epsilon: 1.0 });
      expect(simplified).toHaveLength(3);
    });
  });

  describe('calculateBounds', () => {
    it('calculates correct bounding box for stroke', () => {
      const points = [
        { x: 10, y: 20, pressure: 0.5, t: 0 },
        { x: 100, y: 5, pressure: 0.5, t: 16 },
        { x: 50, y: 80, pressure: 0.5, t: 32 },
      ];
      
      const bounds = calculateBounds(points);
      expect(bounds).toEqual({ minX: 10, minY: 5, maxX: 100, maxY: 80 });
    });
  });
});
```

---

## Integration Tests (API)

### What to Integration Test
- Every API endpoint (happy path + error cases)
- Database operations (CRUD)
- Authentication middleware
- Rate limiting behavior
- Sync conflict resolution
- File upload handling
- WebSocket events

### Setup

```typescript
// tests/setup.ts
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createApp } from '../src/app';
import supertest from 'supertest';

let app: Express;
let db: DrizzleDB;
let pool: Pool;

beforeAll(async () => {
  pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  db = drizzle(pool);
  await migrate(db, { migrationsFolder: './migrations' });
  app = createApp({ db });
});

beforeEach(async () => {
  // Start transaction (rolled back after each test)
  await pool.query('BEGIN');
});

afterEach(async () => {
  // Rollback transaction (clean state between tests)
  await pool.query('ROLLBACK');
});

afterAll(async () => {
  await pool.end();
});

export { app, db };
```

### Example API Tests

```typescript
// tests/api/notes.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../setup';
import { createTestUser, createTestToken } from '../helpers';

describe('Notes API', () => {
  let token: string;
  let userId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user.id;
    token = createTestToken(userId);
  });

  describe('GET /api/v1/notes', () => {
    it('returns empty array for new user', async () => {
      const res = await request(app)
        .get('/api/v1/notes')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.notes).toHaveLength(0);
      expect(res.body.meta.total).toBe(0);
    });

    it('filters by notebook ID', async () => {
      // Create 2 notes in different notebooks
      await createTestNote({ userId, notebookId: 'nb-1' });
      await createTestNote({ userId, notebookId: 'nb-2' });

      const res = await request(app)
        .get('/api/v1/notes?notebookId=nb-1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.notes).toHaveLength(1);
      expect(res.body.data.notes[0].notebookId).toBe('nb-1');
    });

    it('returns 401 without auth token', async () => {
      const res = await request(app).get('/api/v1/notes');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/notes', () => {
    it('creates note with valid data', async () => {
      const notebookId = 'nb-test-123';

      const res = await request(app)
        .post('/api/v1/notes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Test Note',
          notebookId,
          contentType: 'rich-text',
          bodyJson: { type: 'doc', content: [] },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Test Note');
      expect(res.body.data.notebookId).toBe(notebookId);
      expect(res.body.data.id).toBeDefined();
    });

    it('returns 422 when title is missing', async () => {
      const res = await request(app)
        .post('/api/v1/notes')
        .set('Authorization', `Bearer ${token}`)
        .send({ notebookId: 'nb-test', contentType: 'rich-text' });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('cannot access another user\'s notebook', async () => {
      const otherUser = await createTestUser();
      const otherToken = createTestToken(otherUser.id);

      // Create note as user 1
      const createRes = await request(app)
        .post('/api/v1/notes')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Private Note', notebookId: 'nb-mine', contentType: 'rich-text' });

      const noteId = createRes.body.data.id;

      // Try to read it as user 2
      const readRes = await request(app)
        .get(`/api/v1/notes/${noteId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(readRes.status).toBe(404); // Not found (not 403, to avoid info leakage)
    });
  });

  describe('PATCH /api/v1/notes/:id (Sync)', () => {
    it('detects sync conflict when vector clocks are concurrent', async () => {
      // Create a note
      const note = await createTestNote({ userId });

      // Simulate concurrent edit (different devices)
      const res = await request(app)
        .patch(`/api/v1/notes/${note.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Updated Title',
          vectorClock: { 'device-old': 2 }, // Stale clock
          deviceId: 'device-b',
        });

      // If server has newer version, should return conflict
      expect([200, 409]).toContain(res.status);
    });
  });
});
```

---

## End-to-End Tests (Playwright)

### Critical User Journeys (50 tests)

#### Category 1: Authentication (5 tests)
1. ✅ Sign up with email
2. ✅ Sign in with email
3. ✅ Sign in with Google OAuth
4. ✅ Magic link login
5. ✅ Sign out and session clear

#### Category 2: Note CRUD (10 tests)
6. ✅ Create new note from home screen
7. ✅ Type content in rich text editor
8. ✅ Apply text formatting (bold, italic, heading)
9. ✅ Insert and display image
10. ✅ Create checklist and check items
11. ✅ Create table and add data
12. ✅ Auto-save (navigate away, come back, content preserved)
13. ✅ Delete note (moves to trash)
14. ✅ Restore note from trash
15. ✅ Permanently delete note

#### Category 3: Handwriting (8 tests)
16. ✅ Draw strokes with mouse (simulating touch)
17. ✅ Switch pen types
18. ✅ Change pen color
19. ✅ Erase strokes
20. ✅ Undo/redo stroke history
21. ✅ Lasso select and move strokes
22. ✅ Add new page to notebook
23. ✅ Navigate between pages

#### Category 4: Organization (7 tests)
24. ✅ Create new notebook
25. ✅ Move note to different notebook
26. ✅ Add tags to note
27. ✅ Filter notes by tag
28. ✅ Create custom smart folder
29. ✅ Archive and unarchive note
30. ✅ Pin note to top

#### Category 5: Search (5 tests)
31. ✅ Search by keyword finds correct note
32. ✅ Search filters by notebook
33. ✅ Tag search (#tagname)
34. ✅ No results state shown
35. ✅ Recent searches appear

#### Category 6: Export (5 tests)
36. ✅ Export note as PDF
37. ✅ Export note as Markdown
38. ✅ Export notebook as ZIP
39. ✅ Export includes images
40. ✅ Export includes handwriting

#### Category 7: Offline (5 tests)
41. ✅ Note created offline is persisted
42. ✅ Edit offline, sync when online
43. ✅ App loads with cached data when offline
44. ✅ Sync status indicator shows correctly
45. ✅ Search works offline

#### Category 8: Responsive (5 tests)
46. ✅ Mobile layout renders correctly (375px)
47. ✅ Tablet layout renders correctly (768px)
48. ✅ Desktop layout renders correctly (1280px)
49. ✅ Note editor accessible on mobile
50. ✅ Keyboard navigation works on desktop

### Playwright Config

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'safari',   use: { ...devices['Desktop Safari'] } },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'iPad',
      use: { ...devices['iPad Pro 11'] },
    },
  ],
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Example E2E Test

```typescript
// tests/e2e/note-creation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Note Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loginAsTestUser(page);
  });

  test('can create and edit a rich text note', async ({ page }) => {
    // Create new note
    await page.keyboard.press('Control+n');
    
    // Wait for editor to be ready
    const editor = page.getByRole('textbox', { name: 'Note content' });
    await expect(editor).toBeVisible();

    // Type title
    await page.getByPlaceholder('Untitled').fill('My Test Note');

    // Type content
    await editor.click();
    await page.keyboard.type('This is my first note content.');

    // Apply bold
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Control+b');

    // Wait for auto-save
    await expect(page.getByText('Saved')).toBeVisible({ timeout: 5000 });

    // Navigate away and back
    await page.getByRole('link', { name: 'All Notes' }).click();
    await page.getByText('My Test Note').click();

    // Verify content preserved
    await expect(editor).toContainText('This is my first note content.');
  });

  test('works offline', async ({ page, context }) => {
    // Create note while online
    await page.keyboard.press('Control+n');
    await page.getByPlaceholder('Untitled').fill('Offline Note');
    await page.getByRole('textbox', { name: 'Note content' }).fill('Online content');
    await expect(page.getByText('Saved')).toBeVisible();

    // Go offline
    await context.setOffline(true);
    await expect(page.getByText('Offline mode')).toBeVisible();

    // Edit while offline
    await page.getByRole('textbox', { name: 'Note content' }).fill('Offline content added');

    // Navigate away and back (should use local cache)
    await page.getByRole('link', { name: 'All Notes' }).click();
    await page.getByText('Offline Note').click();

    // Verify offline content preserved
    await expect(page.getByText('Offline content added')).toBeVisible();

    // Go online
    await context.setOffline(false);
    await expect(page.getByText('All synced')).toBeVisible({ timeout: 10000 });
  });
});
```

---

## Visual Regression Testing (Chromatic + Storybook)

### Storybook Stories
Every UI component has stories for:
- Default state
- Loading state
- Empty state
- Error state
- Dark mode variant
- Mobile size variant

```typescript
// NoteCard.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { NoteCard } from './NoteCard';

const meta: Meta<typeof NoteCard> = {
  component: NoteCard,
  parameters: { layout: 'padded' },
};
export default meta;

export const Default: StoryObj<typeof NoteCard> = {
  args: {
    note: {
      id: 'note-1',
      title: 'Meeting Notes — Q3 Planning',
      excerpt: 'Discussed quarterly targets and marketing...',
      tags: ['work', 'meeting'],
      color: 'blue',
      wordCount: 342,
      isFlagged: false,
      isPinned: false,
      updatedAt: new Date('2026-06-22T14:00:00Z'),
    },
  },
};

export const Pinned: StoryObj<typeof NoteCard> = {
  args: { ...Default.args, note: { ...Default.args.note, isPinned: true } },
};

export const DarkMode: StoryObj<typeof NoteCard> = {
  parameters: { backgrounds: { default: 'dark' } },
  args: Default.args,
};
```

---

## Performance Testing

### Lighthouse CI

```yaml
# .lighthouserc.yaml
ci:
  collect:
    url:
      - 'http://localhost:3000/'
      - 'http://localhost:3000/notes'
    numberOfRuns: 3
  assert:
    assertions:
      'categories:performance':   ['warn', { minScore: 0.85 }]
      'categories:accessibility': ['error', { minScore: 0.95 }]
      'categories:seo':           ['warn', { minScore: 0.85 }]
      'first-contentful-paint':   ['warn', { maxNumericValue: 2000 }]
      'largest-contentful-paint': ['error', { maxNumericValue: 3000 }]
      'interactive':              ['error', { maxNumericValue: 5000 }]
  upload:
    target: 'lhci'
    serverBaseUrl: 'https://lhci.internal.ishunotes.com'
```
