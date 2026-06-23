# Ishu Notes — Handwriting Engine & Drawing System

## Overview

The handwriting engine is the most critical and differentiating feature of Ishu Notes. It must deliver a near-native writing experience that rivals GoodNotes 6, Samsung Notes, and Apple Notes on iPad.

---

## Pen & Pencil Tool Types

### 1. Ballpoint Pen
- **Behavior:** Consistent line width regardless of pressure
- **Opacity:** Fully opaque
- **Texture:** Clean, smooth edges
- **Best For:** Everyday note-taking, signatures
- **Configuration:**
  - Width: 0.5px — 20px
  - Color: Full color picker
  - Opacity: 10% — 100%
  - Corner Style: Round / Square

### 2. Fountain Pen
- **Behavior:** Variable width based on speed (slow = thick, fast = thin)
- **Pressure Simulation:** If no stylus, simulates based on stroke velocity
- **Texture:** Slightly wet ink look with feathering
- **Best For:** Calligraphy, decorative writing
- **Configuration:**
  - Base Width: 1px — 30px
  - Variation Factor: 1x — 5x (how much width varies)
  - Color: Full color picker
  - Ink Flow: Dry / Normal / Wet

### 3. Brush Pen (Soft Brush)
- **Behavior:** Very pressure-sensitive, wide variation in line width
- **Texture:** Soft, paint-brush-like edges with texture
- **Best For:** Artistic notes, emphasis, headings
- **Configuration:**
  - Min Width: 1px
  - Max Width: 80px
  - Hardness: 0% (completely soft) — 100% (sharp)
  - Texture Intensity: 0% — 100%

### 4. Pencil
- **Behavior:** Textured, rough edges simulating graphite on paper
- **Pressure:** Lighter pressure = lighter, more textured strokes
- **Texture:** Grain texture with randomized edge pixels
- **Features:**
  - Smudge simulation
  - Build-up effect (draw over same area = darker)
  - Angle simulation (tilt for broad strokes)
- **Configuration:**
  - Hardness: 2H — 8B equivalent grades
  - Width: 0.5px — 15px
  - Opacity: 20% — 90%

### 5. Marker / Highlighter
- **Behavior:** Semi-transparent, flat color
- **Features:**
  - Text-aware highlighting (snap to text lines)
  - 6 preset highlight colors + custom
  - No blending (writes over existing highlights clean)
- **Configuration:**
  - Width: 5px — 40px
  - Opacity: 30% — 70%
  - Colors: Yellow, Green, Blue, Pink, Orange, Purple + custom

### 6. Calligraphy Pen (Flat Nib)
- **Behavior:** Flat nib produces thick/thin based on direction
- **Physics:** Horizontal strokes thin, vertical strokes thick
- **Best For:** Headers, decorative text, formal notes
- **Configuration:**
  - Nib Angle: 0° — 90°
  - Width: 2px — 25px

### 7. Ink Brush (Asian Calligraphy)
- **Behavior:** Rich ink simulation with spread and bleed
- **Features:**
  - Ink dry-out effect (start wet, end dry)
  - Direction-sensitive spreading
  - Paper texture interaction
- **Configuration:**
  - Ink Amount: 0% — 100%
  - Spread: 0% — 80%
  - Dry Rate: Fast / Normal / Slow

### 8. Chalk
- **Behavior:** Rough, crumbly texture on dark backgrounds
- **Texture:** Random pixel dropout for chalk dust effect
- **Best For:** Dark/blackboard theme notes
- **Configuration:**
  - Width: 3px — 30px
  - Roughness: Low / Medium / High / Extreme

### 9. Neon Glow Pen
- **Behavior:** Semi-transparent bright color with glow effect
- **Effects:** CSS filter: blur() + brightness() on stroke
- **Best For:** Digital art, fun highlighting
- **Colors:** Preset neon palette (10 colors)

### 10. Custom Pen (User-Defined)
- All parameters exposed for full customization
- Save as custom preset with name
- Up to 20 saved custom pen presets

---

## Eraser Tools

### 1. Stroke Eraser
- Removes entire strokes when touched
- Most efficient for handwriting cleanup
- Configurable size: 5px — 200px

### 2. Pixel Eraser
- Removes only the pixels touched (partial stroke removal)
- More precise but slower
- Size: 1px — 100px

### 3. Lasso Eraser
- Draw a selection, delete all strokes inside
- Hold shift to add to selection

### 4. Area Clear
- Tap and drag a rectangle to clear everything inside

---

## Selection & Manipulation Tools

### Lasso Selection Tool (Critical Feature)
```
Capabilities:
├── Freeform lasso (draw custom shape)
├── Rectangle select
├── Select by color similarity
├── Select all strokes on page
└── Select strokes in range (swipe to select rows)

After Selection:
├── Move (drag)
├── Resize (8 handle points)
├── Rotate (rotation handle)
├── Scale (with/without aspect ratio lock)
├── Copy → Paste (same page, different page, different notebook)
├── Cut
├── Delete
├── Change pen properties (recolor, resize)
├── Convert to text (OCR)
├── Group/ungroup
└── Send to back / Bring to front (Z-order)
```

### Transform Operations
- **Move:** Drag to reposition
- **Scale:** Pinch gesture or handles
- **Rotate:** Two-finger rotation or handle
- **Flip:** Horizontal and vertical flip
- **Skew:** Advanced transform handle
- **Warp:** Mesh-based warp (advanced)

---

## Pressure & Tilt Simulation

### Stylus Support (Pointer Events API)
```typescript
interface StylusData {
  pressure: number;       // 0.0 — 1.0
  tiltX: number;          // -90° — 90°  
  tiltY: number;          // -90° — 90°
  twist: number;          // 0° — 359°
  altitudeAngle: number;  // 0 (parallel) — π/2 (perpendicular)
  azimuthAngle: number;   // 0 — 2π
  pointerType: 'stylus' | 'touch' | 'mouse';
  tangentialPressure: number; // -1 — 1
}
```

### Touch Simulation (No Stylus)
When no stylus is detected, simulate pressure using:
- **Stroke velocity** → inversely mapped to width (slower = more pressure)
- **Stroke acceleration** → abrupt direction changes = increased pressure
- **Touch area** (if available) → larger contact = more pressure

### Wrist Rejection
```
Algorithm:
1. Detect simultaneous touch points
2. If 2+ points detected during stylus input → classify as palm
3. Palm rejection zone: configurable from palm edge
4. Timeout: 300ms — any touches < 300ms after stylus = ignored
5. Prediction: Use motion vector to predict palm placement
```

---

## Stroke Rendering Pipeline

```
Input Event (pointerdown / pointermove / pointerup)
         │
         ▼
Coordinate Normalization
(DPI-correct, zoom-aware pixel coordinates)
         │
         ▼
Point Smoothing
(Catmull-Rom spline interpolation, 3-point lookahead)
         │
         ▼
Pressure Processing
(Apply pen-specific pressure curve mapping)
         │
         ▼
Perfect Freehand Algorithm
(Generate variable-width polygon from points + pressure)
         │
         ▼
Konva.js Path Rendering
(Render filled SVG path on canvas layer)
         │
         ▼
Incremental Update
(Only re-render dirty region, not full canvas)
         │
         ▼
IndexedDB Persistence
(Store stroke as structured data, not pixels)
```

### Stroke Data Model
```typescript
interface Stroke {
  id: string;
  toolType: PenTool;
  color: string;          // hex or rgba
  width: number;          // base width in logical pixels
  opacity: number;        // 0.0 — 1.0
  points: StrokePoint[];  // ordered array
  bounds: BoundingBox;    // for spatial indexing
  layerId: string;
  pageId: string;
  createdAt: number;      // Unix ms timestamp
  isErased: boolean;
  transform: Matrix2D;    // any applied transforms
}

interface StrokePoint {
  x: number;
  y: number;
  pressure: number;   // 0.0 — 1.0
  tiltX: number;
  tiltY: number;
  timestamp: number;  // ms since stroke start
}
```

---

## Undo / Redo System

### Multi-Level History
- **Depth:** 500 undo steps
- **Per-page:** Each page has independent history
- **Operations tracked:**
  - Stroke added
  - Stroke erased
  - Strokes moved/resized
  - Text inserted/deleted
  - Image added/resized
  - Layer change
  - Page operations

### History Storage
- Memory: Last 50 operations in memory
- Disk (IndexedDB): Full 500-operation history
- Compression: Repeated operations compressed
- Branch: After undo + new action, creates new branch

---

## Canvas Architecture

### Layer System (GoodNotes-inspired)
```
Page Layers (bottom to top):
├── Background Layer (template, can't draw)
├── PDF Layer (imported document, locked)
├── Image Layer (photos, stickers)
├── Handwriting Layer 1 (default drawing layer)
├── Handwriting Layer 2 (optional extra)
├── Handwriting Layer 3 (optional extra)
├── Text Layer (typed text boxes)
├── Annotation Layer (highlights, underlines)
└── Selection Layer (temporary, not saved)
```

### Layer Operations
- Add / remove / rename layers
- Reorder via drag
- Lock layers (prevent accidental edits)
- Toggle visibility
- Change opacity
- Merge layers
- Duplicate layers
- Export single layer as PNG/SVG

---

## Performance Optimization

### Rendering Optimization Strategies

1. **Stroke Culling** — Only render strokes within viewport
2. **Level of Detail (LOD)** — At low zoom, use simplified paths
3. **Rasterization Cache** — Convert old strokes to bitmap for performance
4. **Web Worker Rendering** — Offscreen canvas in worker thread
5. **RequestAnimationFrame** — Sync rendering to display refresh rate
6. **Pointer Event Coalescing** — Process batched pointer events efficiently
7. **Spatial Indexing (R-Tree)** — Fast hit-testing for selection and erasure

### Target Performance Metrics
| Operation | Target Latency |
|-----------|---------------|
| Stroke start (first pixel) | < 16ms |
| Stroke continuation | < 8ms (120fps) |
| Full page re-render | < 100ms |
| Undo/Redo | < 50ms |
| Lasso selection | < 100ms |
| Page zoom animation | 60fps |
| Page switch | < 200ms |

---

## Shape Recognition

### Supported Shapes (Samsung Notes-style)
| Shape | Recognition Accuracy |
|-------|---------------------|
| Circle / Ellipse | 95% |
| Rectangle / Square | 97% |
| Triangle | 94% |
| Line / Arrow | 98% |
| Star | 90% |
| Heart | 88% |
| Cloud | 85% |
| Polygon (N-sided) | 87% |

### Recognition Algorithm
1. Capture stroke points
2. Analyze point distribution and curvature
3. Template matching against shape library
4. If confidence > 85% → show "convert to shape?" prompt
5. User accepts → stroke replaced with perfect vector shape
6. User rejects → keep freehand stroke

---

## Paper Templates (100+ Built-in)

### Template Categories
- **Writing:** Wide ruled, narrow ruled, college ruled, dot grid, blank
- **Planning:** Daily planner, weekly planner, monthly calendar, habit tracker
- **Math:** Graph paper (2mm, 4mm, 5mm), Cartesian, Isometric grid
- **Music:** Staff paper (treble, bass, grand staff, guitar tablature)
- **Art:** Watercolor guide, figure proportion, architectural grid, storyboard
- **Learning:** Cornell notes, mind map blank, Kanban blank, timeline
- **Business:** Meeting notes, agenda, project plan, SWOT analysis
- **Custom:** Upload any image as custom template

### Custom Template Creation
1. Design in any image editor
2. Upload as PNG/PDF
3. Set as page template
4. Share with community template library
