---
name: Drawing canvas architecture
description: How DrawingCanvas works on web vs native, and key performance decisions
---

## Web approach (HTML5 Canvas overlay)
- `containerDomRef` ref on the outer View (React Native Web renders View as div)
- In useEffect, create a `<canvas>` element, append it as child of the div
- All pointer events (pointerdown/move/up) go directly to the canvas DOM element
- `drawToCanvas()` called inside RAF — zero React re-renders during live stroke
- On `pointerup`: stroke is finalized and added to SVG via `addStroke()` (one React update per completed stroke)
- Canvas is cleared after each stroke commit

## Native approach (SVG + PanResponder + RAF)
- PanResponder handles touch events
- Points accumulated in `currentPtsRef.current` (ref, not state)
- RAF-batched: `requestAnimationFrame()` batches state updates to max 60fps
- SVG renders completed strokes + current stroke

## Eraser
- Eraser paints over strokes using `bgColor` (page background), NOT hardcoded white
- `pageBgColor` prop MUST be passed from [id].tsx: `pageBackground !== 'transparent' ? pageBackground : undefined`
- DrawingContext eraser also removes strokes via spatial proximity check

## Pencil texture
- Multiple SVG path layers with slight offsets and varying opacity + strokeDasharray
- Core: `strokeWidth * 0.62`, opacity 0.88
- Halo: `strokeWidth * 1.1`, opacity 0.18
- 3 grain layers with dashes at offsets (0.5,-0.4), (-0.4,0.5), (0.3,0.3)
- On canvas: same technique using multiple ctx.stroke() calls

## Catmull-Rom smoothing
- Tension 0.5, 6 steps between control points
- Applied to ALL tools before path generation
- `catmullRomSmooth(pts)` → `toSvgPath(smoothed)` → rendered

**Why:** SVG re-renders on every pointermove caused severe lag; Canvas bypasses React entirely for the live stroke, giving 60fps buttery drawing like GoodNotes/Excalidraw
