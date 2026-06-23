# Ishu Notes — Deployment & DevOps

## Infrastructure Overview

```
Production Stack:

Users
  │ HTTPS
  ▼
Cloudflare (CDN + WAF + DDoS Protection)
  │
  ▼
Load Balancer (Nginx)
  ├── Static Assets → CDN Cache (React app, fonts, images)
  ├── /api/* → API Server cluster (Node.js/Express)
  └── /ws/* → WebSocket servers (Socket.IO)
       │
       ├── PostgreSQL 16 (Primary + Read Replica)
       ├── Redis 7 (Cache + Pub/Sub cluster)
       └── Object Storage (Media files)
```

---

## Environments

| Environment | Purpose | URL | Auto-Deploy |
|------------|---------|-----|------------|
| Development | Local dev | localhost | No |
| Preview | PR review | pr-{n}.preview.ishunotes.com | Yes (per PR) |
| Staging | Pre-production | staging.ishunotes.com | Yes (main branch) |
| Production | Live users | app.ishunotes.com | Manual approval |

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  # ─── CHECK PHASE ───────────────────────────────────────────
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '24', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm run lint
      - run: pnpm run typecheck

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: ishu_notes_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm run test:unit
      - run: pnpm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost/ishu_notes_test

  # ─── BUILD PHASE ──────────────────────────────────────────
  build:
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @workspace/api-spec run codegen
      - run: pnpm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: |
            artifacts/api-server/dist/
            artifacts/web-app/dist/

  # ─── E2E TESTS ────────────────────────────────────────────
  e2e:
    needs: [build]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  # ─── SECURITY SCAN ────────────────────────────────────────
  security:
    needs: [build]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm audit --audit-level=high
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  # ─── DEPLOY PREVIEW ───────────────────────────────────────
  deploy-preview:
    if: github.event_name == 'pull_request'
    needs: [build]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Deploy PR preview..."
      # Deploy to preview environment

  # ─── DEPLOY STAGING ───────────────────────────────────────
  deploy-staging:
    if: github.ref == 'refs/heads/main'
    needs: [build, e2e, security]
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - run: echo "Deploy to staging..."

  # ─── DEPLOY PRODUCTION ────────────────────────────────────
  deploy-production:
    needs: [deploy-staging]
    runs-on: ubuntu-latest
    environment: production  # Requires manual approval
    steps:
      - run: echo "Deploy to production..."
```

---

## Docker Configuration

### API Server Dockerfile

```dockerfile
# Multi-stage build for small production image
FROM node:24-alpine AS base
RUN npm install -g pnpm@9

# ─── Dependencies ───────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY lib/*/package.json ./lib/*/
RUN pnpm install --frozen-lockfile --filter @workspace/api-server...

# ─── Build ──────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/artifacts/api-server/node_modules ./artifacts/api-server/node_modules
COPY . .
RUN pnpm --filter @workspace/api-server run build

# ─── Production Image ────────────────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 ishu

# Copy built files
COPY --from=builder --chown=ishu:nodejs /app/artifacts/api-server/dist ./dist
COPY --from=builder --chown=ishu:nodejs /app/artifacts/api-server/package.json ./

RUN npm install --production

USER ishu

EXPOSE 5000
CMD ["node", "dist/index.js"]
```

### Docker Compose (Development)

```yaml
# docker-compose.dev.yml
version: '3.9'

services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: ishu_notes_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: devpassword
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  api-server:
    build:
      context: .
      dockerfile: artifacts/api-server/Dockerfile.dev
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - "5000:5000"
    environment:
      DATABASE_URL: postgresql://postgres:devpassword@postgres/ishu_notes_dev
      REDIS_URL: redis://redis:6379
      NODE_ENV: development
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
  redis_data:
```

---

## Database Migrations

### Migration Strategy (Drizzle Migrations)

```typescript
// lib/db/drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
```

### Migration Commands
```bash
# Generate migration from schema changes
pnpm --filter @workspace/db run generate

# Push to dev database (without migration file)
pnpm --filter @workspace/db run push

# Run migrations in production
pnpm --filter @workspace/db run migrate

# View migration status
pnpm --filter @workspace/db run migrate:status
```

### Migration Safety Rules
1. **Never delete columns** — mark as deprecated, delete in next major version
2. **Never rename columns** — add new column, migrate data, mark old as deprecated
3. **Always add columns as nullable** or with default value
4. **Test migrations** on production copy before applying
5. **Rollback plan** required for every migration

---

## Monitoring & Alerting

### Health Checks

```typescript
// GET /api/v1/health (detailed)
router.get('/health', async (req, res) => {
  const checks = await Promise.allSettled([
    checkDatabase(),
    checkRedis(),
    checkStorage(),
    checkAI(),
  ]);

  const status = checks.every(c => c.status === 'fulfilled')
    ? 'healthy' : 'degraded';

  res.status(status === 'healthy' ? 200 : 503).json({
    status,
    version: process.env.npm_package_version,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      database:  checks[0].status === 'fulfilled' ? 'healthy' : 'unhealthy',
      redis:     checks[1].status === 'fulfilled' ? 'healthy' : 'unhealthy',
      storage:   checks[2].status === 'fulfilled' ? 'healthy' : 'unhealthy',
      ai:        checks[3].status === 'fulfilled' ? 'healthy' : 'unhealthy',
    },
  });
});
```

### Error Tracking (Sentry)
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of transactions
  profilesSampleRate: 0.1,
  integrations: [
    Sentry.httpIntegration(),
    Sentry.expressIntegration(),
    Sentry.postgresIntegration(),
    Sentry.redisIntegration(),
  ],
});
```

### Uptime Monitoring
- Uptime Robot or Betterstack: Ping `/api/v1/health` every minute
- Alert channels: Email, Slack, PagerDuty
- SLA target: 99.9% uptime (8.7 hours downtime/year maximum)

### Performance Monitoring (APM)
```
Metrics tracked:
  - API response time (p50, p95, p99)
  - Database query time
  - Redis cache hit rate
  - Error rate per endpoint
  - Active WebSocket connections
  - Queue length (sync operations)
  - AI API latency
  - Storage bandwidth

Dashboards: Grafana
Data source: Prometheus
Alerts: PagerDuty (critical) / Slack (warning)
```

---

## Secrets Management

### Environment Variables Required

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/ishu_notes

# Redis
REDIS_URL=redis://user:pass@host:6379

# Auth (Clerk)
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...

# Storage
REPLIT_OBJECT_STORAGE_BUCKET=...
REPLIT_OBJECT_STORAGE_KEY=...

# AI (via Replit AI Integrations)
REPLIT_AI_API_KEY=...

# Session
SESSION_SECRET=... (min 32 chars, random)

# App
NODE_ENV=production
PORT=5000
API_BASE_URL=https://api.ishunotes.com

# Monitoring
SENTRY_DSN=https://...@sentry.io/...

# Email (for notifications)
SMTP_HOST=smtp.postmarkapp.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
FROM_EMAIL=noreply@ishunotes.com
```

---

## Rollback Strategy

### Deployment Rollback

```bash
# Quick rollback to previous version
./scripts/rollback.sh --env production --version v1.2.3

# What the script does:
# 1. Switch load balancer to previous container version
# 2. Run rollback migrations (if any)
# 3. Clear Redis cache (in case of schema changes)
# 4. Verify health check passes
# 5. Notify team via Slack
```

### Database Rollback
- Every migration generates a rollback script
- Run: `pnpm --filter @workspace/db run migrate:rollback`
- Emergency: Point-in-time recovery from PostgreSQL backup (15-min granularity)

---

## Performance Testing

### Load Testing (K6)

```javascript
// k6/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Hold at 100 users
    { duration: '2m', target: 500 },  // Ramp up to 500 users
    { duration: '5m', target: 500 },  // Hold at 500 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'],    // Error rate < 1%
  },
};

export default function() {
  const res = http.get('https://staging.ishunotes.com/api/v1/notes', {
    headers: { Authorization: `Bearer ${__ENV.TEST_TOKEN}` },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```
