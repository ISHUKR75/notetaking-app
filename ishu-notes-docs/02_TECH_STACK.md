# Ishu Notes — Complete Technology Stack

## Overview

Ishu Notes uses a cutting-edge, battle-tested technology stack chosen for maximum performance, offline capability, cross-platform compatibility, and developer productivity. Every library has been selected after evaluating 3+ alternatives.

---

## Frontend Core

### Framework & Language
| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **React** | 18.3+ | UI Component Framework | Concurrent rendering, Suspense, best ecosystem |
| **TypeScript** | 5.9+ | Type Safety | Catch bugs at compile time, better DX |
| **Vite** | 6.x | Build Tool | Fastest HMR, ESM-native, excellent plugin ecosystem |
| **React Router v7** | 7.x | Client-Side Routing | File-based routing, loader/action pattern |

### State Management
| Technology | Version | Purpose |
|------------|---------|---------|
| **Zustand** | 5.x | Global UI State (toolbar, sidebar, theme) |
| **TanStack Query v5** | 5.x | Server State, caching, background sync |
| **Jotai** | 2.x | Atomic state for editor granular updates |
| **Immer** | 10.x | Immutable state updates for complex note trees |
| **Valtio** | 2.x | Proxy-based state for canvas/drawing layer |

### Canvas & Handwriting Engine
| Technology | Version | Purpose |
|------------|---------|---------|
| **Konva.js** | 9.x | 2D Canvas rendering (shapes, images, text) |
| **React-Konva** | 18.x | React bindings for Konva |
| **Perfect Freehand** | 1.x | Pressure-sensitive stroke rendering algorithm |
| **Rough.js** | 4.x | Sketch-style shape rendering |
| **Paper.js** | 0.12.x | Vector graphics scripting framework |
| **Fabric.js** | 6.x | Interactive object canvas library |
| **Signature Pad** | 4.x | Smooth signature/handwriting capture |
| **PointerEvents API** | Native | Stylus pressure/tilt data capture |
| **WebGL** (via Three.js) | 0.170+ | Hardware-accelerated rendering fallback |

### Rich Text Editor
| Technology | Version | Purpose |
|------------|---------|---------|
| **TipTap** | 2.x | Primary rich text editor framework |
| **ProseMirror** | 1.x | Underlying document model for TipTap |
| **TipTap Extensions (all)** | 2.x | Tables, mentions, code blocks, etc. |
| **CodeMirror 6** | 6.x | Code block syntax highlighting |
| **Shiki** | 1.x | Server-side syntax highlighting |
| **Marked** | 13.x | Markdown parsing |
| **Remark + Rehype** | Latest | Markdown/HTML transformation pipeline |
| **KaTeX** | 0.16.x | Mathematical formula rendering (LaTeX) |
| **Mermaid.js** | 11.x | Diagram and flowchart rendering |

### UI Component Library & Styling
| Technology | Version | Purpose |
|------------|---------|---------|
| **Tailwind CSS** | 4.x | Utility-first CSS framework |
| **shadcn/ui** | Latest | Accessible base components |
| **Radix UI** | 1.x | Headless accessible primitives |
| **Framer Motion** | 12.x | Animations and micro-interactions |
| **Lottie React** | 2.x | Complex animation playback |
| **GSAP** | 3.x | Timeline animations, scroll triggers |
| **React Spring** | 9.x | Physics-based animations |
| **CSS Houdini** | Native | Advanced CSS paint worklets |
| **Lucide React** | 0.4x | Icon library (500+ icons) |
| **Heroicons** | 2.x | Additional icon set |
| **Phosphor Icons** | 2.x | Additional icon set for variety |
| **Emoji Mart** | 5.x | Emoji picker component |
| **React Color** | 2.x | Color picker for pen/highlight tools |
| **Colorjs** | 1.x | Color manipulation and conversion |

### Drag & Drop and Interaction
| Technology | Version | Purpose |
|------------|---------|---------|
| **DnD Kit** | 6.x | Drag-and-drop for note organization |
| **React Beautiful DnD** | 13.x | Page reordering within notebooks |
| **Interact.js** | 1.x | Resizable/draggable UI panels |
| **Hammer.js** | 2.x | Touch gesture recognition |
| **use-gesture** | 10.x | React hook for all gesture types |
| **Scroll Into View** | 3.x | Smart scroll management |

### Virtual Rendering
| Technology | Version | Purpose |
|------------|---------|---------|
| **TanStack Virtual** | 3.x | Virtualized lists for large note collections |
| **React Window** | 1.x | Large list rendering fallback |
| **Intersection Observer API** | Native | Lazy loading images/sections |

---

## Backend Core

### Runtime & Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 24.x | JavaScript Runtime |
| **Express 5** | 5.x | HTTP Server Framework |
| **Fastify** | 4.x | Alternative high-performance routes |
| **TypeScript** | 5.9+ | Type-safe server code |
| **Zod** | 4.x | Runtime schema validation |
| **ts-node** | 10.x | TypeScript execution in Node |

### Database Layer
| Technology | Version | Purpose |
|------------|---------|---------|
| **PostgreSQL** | 16.x | Primary relational database |
| **Drizzle ORM** | 0.31+ | Type-safe SQL query builder |
| **Redis** | 7.x | Caching, pub/sub for real-time features |
| **SQLite (via better-sqlite3)** | 9.x | Embedded DB for offline-first PWA |
| **IndexedDB (via Dexie.js)** | 4.x | Browser-side storage for offline notes |
| **localForage** | 1.x | Abstraction over IndexedDB/WebSQL/localStorage |
| **PGVector** | 0.7.x | Vector embeddings for AI semantic search |

### Authentication & Security
| Technology | Version | Purpose |
|------------|---------|---------|
| **Clerk** | 5.x | Authentication (OAuth, magic link, passkeys) |
| **Jose** | 5.x | JWT handling |
| **Argon2** | 0.31.x | Password hashing (if local auth added) |
| **Helmet.js** | 8.x | HTTP security headers |
| **CORS** | 2.x | Cross-origin resource sharing |
| **Rate Limiter Flexible** | 5.x | API rate limiting |
| **Crypto (Node built-in)** | Native | E2E encryption helpers |
| **tweetnacl-js** | 1.x | Client-side encryption library |
| **libsodium-wrappers** | 0.7.x | Modern encryption (XChaCha20-Poly1305) |

### Real-Time & Sync
| Technology | Version | Purpose |
|------------|---------|---------|
| **Socket.IO** | 4.x | Real-time collaboration WebSockets |
| **Yjs** | 13.x | CRDT-based conflict-free collaborative editing |
| **y-websocket** | 2.x | Yjs WebSocket provider |
| **y-indexeddb** | 9.x | Yjs offline persistence |
| **Automerge** | 2.x | Alternative CRDT implementation |
| **PartyKit** | Latest | Edge-based real-time infrastructure |

### File Storage & Processing
| Technology | Version | Purpose |
|------------|---------|---------|
| **Replit Object Storage** | Latest | File/media storage |
| **Sharp** | 0.33.x | Server-side image processing |
| **Multer** | 2.x | File upload handling |
| **pdf-lib** | 1.x | PDF generation and manipulation |
| **pdf.js** | 4.x | PDF rendering in browser |
| **Mammoth.js** | 1.x | DOCX to HTML conversion |
| **xlsx** | 0.18.x | Excel file support |
| **Archiver** | 7.x | ZIP file creation for exports |
| **Jimp** | 1.x | Image manipulation in Node.js |

---

## AI & Machine Learning

| Technology | Version | Purpose |
|------------|---------|---------|
| **OpenAI API** (via Replit AI) | Latest | Text generation, summarization, chat |
| **Anthropic Claude** (via Replit AI) | Latest | Advanced reasoning, long context notes |
| **Tesseract.js** | 5.x | OCR — handwriting and document text recognition |
| **ml5.js** | 1.x | Client-side ML (gesture recognition) |
| **TensorFlow.js** | 4.x | On-device ML models |
| **Transformers.js** | 3.x | In-browser NLP models (summarization) |
| **LangChain.js** | 0.2.x | AI agent orchestration for smart features |
| **pgvector** | 0.7.x | Semantic vector search for AI note discovery |
| **sentence-transformers** (API) | Latest | Text embedding generation |

---

## Offline & PWA

| Technology | Version | Purpose |
|------------|---------|---------|
| **Workbox** | 7.x | Service Worker management |
| **vite-plugin-pwa** | 0.20.x | Automatic PWA setup with Vite |
| **Background Sync API** | Native | Queue sync operations for offline |
| **Cache API** | Native | Cache API responses and assets |
| **IndexedDB** (via Dexie.js) | 4.x | Local note/media storage |
| **Broadcast Channel API** | Native | Cross-tab communication |
| **Web Locks API** | Native | Prevent concurrent writes |
| **Periodic Background Sync** | Native | Background sync when app not active |

---

## Testing

| Technology | Version | Purpose |
|------------|---------|---------|
| **Vitest** | 2.x | Unit and integration testing |
| **Playwright** | 1.x | End-to-end browser testing |
| **Testing Library** | 16.x | Component testing |
| **MSW (Mock Service Worker)** | 2.x | API mocking for tests |
| **Storybook** | 8.x | Component development and visual testing |
| **Chromatic** | Latest | Visual regression testing |
| **K6** | 0.50+ | Performance and load testing |

---

## DevOps & Tooling

| Technology | Version | Purpose |
|------------|---------|---------|
| **pnpm** | 9.x | Fast package manager with workspaces |
| **ESLint** | 9.x | Linting with flat config |
| **Prettier** | 3.x | Code formatting |
| **Husky** | 9.x | Git hooks |
| **Lint-Staged** | 15.x | Run linters on staged files |
| **Commitlint** | 19.x | Enforce commit message convention |
| **Turborepo** | 2.x | Monorepo build orchestration |
| **esbuild** | 0.24.x | Fast bundling for server code |
| **Rollup** | 4.x | Library bundling |

---

## Monitoring & Analytics

| Technology | Purpose |
|------------|---------|
| **Sentry** | Error tracking and performance monitoring |
| **PostHog** | Privacy-first product analytics |
| **Web Vitals** | Core performance metrics collection |
| **Prometheus** | Server metrics |
| **Grafana** | Metrics visualization |

---

## Total Library Count: 80+ packages carefully selected for maximum capability
