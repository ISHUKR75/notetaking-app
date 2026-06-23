/**
 * DrawingCanvas — Premium handwriting canvas inspired by GoodNotes 6 & Apple Notes
 *
 * Architecture:
 *  - Web: HTML5 Canvas overlay for live drawing (zero React re-renders per stroke)
 *        + SVG layer for completed strokes
 *  - Native: RAF-batched SVG rendering (max 60fps state updates)
 *
 * Key features:
 *  - Catmull-Rom spline smoothing (buttery curves)
 *  - Speed-sensitive pressure simulation
 *  - Realistic pencil graphite texture
 *  - Proper eraser (uses page background color)
 *  - 14 pen/brush types
 */

import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, Platform, PanResponder } from 'react-native';
import Svg, { Path, Circle, Line, G, Rect, Ellipse } from 'react-native-svg';
import { useDrawing, Stroke, StrokePoint } from '../context/DrawingContext';
import { useTheme } from '../context/ThemeContext';
import { PenToolType } from '../constants/penTools';
import { generateId } from '../utils/noteUtils';

interface DrawingCanvasProps {
  width: number;
  height: number;
  pageBgColor?: string;
}

// ─── Math helpers ──────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

// ─── Catmull-Rom spline interpolation ─────────────────────────────────────────
// Produces buttery-smooth curves that pass through all input points

function catmullRomSmooth(pts: StrokePoint[], tension = 0.5): StrokePoint[] {
  if (pts.length < 3) return pts;
  const out: StrokePoint[] = [];
  const steps = 6; // interpolation steps between control points

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[Math.min(pts.length - 1, i + 1)];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const x =
        tension * (
          (2 * p1.x) +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
        );
      const y =
        tension * (
          (2 * p1.y) +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
        );
      out.push({ x, y, pressure: lerp(p1.pressure, p2.pressure, t), timestamp: lerp(p1.timestamp, p2.timestamp, t) });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// ─── SVG path generators ────────────────────────────────────────────────────

function toSvgPath(pts: StrokePoint[]): string {
  if (!pts.length) return '';
  if (pts.length === 1) return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} l 0.01 0.01`;
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const cp = pts[i];
    const nx = pts[i + 1];
    const mx = ((cp.x + nx.x) / 2).toFixed(1);
    const my = ((cp.y + nx.y) / 2).toFixed(1);
    d += ` Q ${cp.x.toFixed(1)} ${cp.y.toFixed(1)} ${mx} ${my}`;
  }
  const last = pts[pts.length - 1];
  return d + ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
}

function smoothPath(pts: StrokePoint[]): string {
  return toSvgPath(pts.length > 3 ? catmullRomSmooth(pts) : pts);
}

// ─── Variable-width path (fountain / brush / ink) ────────────────────────────

function variableWidthPath(rawPts: StrokePoint[], baseW: number, tool: PenToolType): string {
  if (rawPts.length < 2) {
    const p = rawPts[0] || { x: 0, y: 0 };
    const r = baseW / 2;
    return `M ${p.x - r} ${p.y} A ${r} ${r} 0 1 0 ${p.x + r} ${p.y} A ${r} ${r} 0 1 0 ${p.x - r} ${p.y}`;
  }

  const pts = catmullRomSmooth(rawPts);
  const n = pts.length;

  // Compute width at each point
  const widths = pts.map((p, idx) => {
    if (idx === 0) return baseW * 0.1;
    const prev = pts[idx - 1];
    const dt = Math.max(1, p.timestamp - prev.timestamp);
    const dist = Math.hypot(p.x - prev.x, p.y - prev.y);
    const speed = dist / dt;

    let w = baseW;
    if (tool === 'fountain' || tool === 'ink') {
      w = baseW * Math.max(0.15, 1.5 - speed * 0.045);
      const sp = Math.min(1, idx / 10);
      const ep = Math.min(1, (n - 1 - idx) / 10);
      w *= sp * 0.9 + 0.1;
      w *= ep * 0.9 + 0.1;
    } else if (tool === 'brush') {
      w = baseW * (0.25 + (p.pressure || 0.5) * 0.75);
      const sp = Math.min(1, idx / 6);
      const ep = Math.min(1, (n - 1 - idx) / 6);
      w *= sp * 0.75 + 0.25;
      w *= ep * 0.75 + 0.25;
    } else if (tool === 'pencil') {
      w = baseW * Math.max(0.35, 1.3 - speed * 0.03);
    }
    return Math.max(0.2, w);
  });

  // Generate left/right border points
  const left: { x: number; y: number }[] = [];
  const right: { x: number; y: number }[] = [];

  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const half = widths[i] / 2;
    let angle: number;
    if (i === 0) angle = Math.atan2(pts[1].y - p.y, pts[1].x - p.x);
    else if (i === n - 1) angle = Math.atan2(p.y - pts[i - 1].y, p.x - pts[i - 1].x);
    else angle = Math.atan2(pts[i + 1].y - pts[i - 1].y, pts[i + 1].x - pts[i - 1].x);
    const perp = angle + Math.PI / 2;
    left.push({ x: p.x + Math.cos(perp) * half, y: p.y + Math.sin(perp) * half });
    right.push({ x: p.x - Math.cos(perp) * half, y: p.y - Math.sin(perp) * half });
  }

  // Build filled polygon
  let d = `M ${left[0].x.toFixed(1)} ${left[0].y.toFixed(1)}`;
  for (let i = 1; i < left.length; i++) {
    const pv = left[i - 1];
    const cu = left[i];
    d += ` Q ${pv.x.toFixed(1)} ${pv.y.toFixed(1)} ${((pv.x + cu.x) / 2).toFixed(1)} ${((pv.y + cu.y) / 2).toFixed(1)}`;
  }
  d += ` L ${left[left.length - 1].x.toFixed(1)} ${left[left.length - 1].y.toFixed(1)}`;
  for (let i = right.length - 1; i >= 0; i--) {
    const cu = right[i];
    if (i === right.length - 1) d += ` L ${cu.x.toFixed(1)} ${cu.y.toFixed(1)}`;
    else {
      const nx = right[i + 1];
      d += ` Q ${nx.x.toFixed(1)} ${nx.y.toFixed(1)} ${((nx.x + cu.x) / 2).toFixed(1)} ${((nx.y + cu.y) / 2).toFixed(1)}`;
    }
  }
  return d + ' Z';
}

// ─── Calligraphy path ─────────────────────────────────────────────────────────

function calligraphyPath(pts: StrokePoint[], width: number): string {
  if (pts.length < 2) return '';
  const smooth = catmullRomSmooth(pts);
  return smooth.slice(0, -1).map((p1, i) => {
    const p2 = smooth[i + 1];
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const nib = angle + Math.PI / 4;
    const hw = (width * (0.3 + 0.7 * Math.abs(Math.sin(angle)))) / 2;
    const dx = Math.cos(nib) * hw;
    const dy = Math.sin(nib) * hw;
    return `M ${(p1.x + dx).toFixed(1)} ${(p1.y + dy).toFixed(1)} L ${(p2.x + dx).toFixed(1)} ${(p2.y + dy).toFixed(1)} L ${(p2.x - dx).toFixed(1)} ${(p2.y - dy).toFixed(1)} L ${(p1.x - dx).toFixed(1)} ${(p1.y - dy).toFixed(1)} Z`;
  }).join(' ');
}

// ─── Arrow head ───────────────────────────────────────────────────────────────

function arrowHeadPath(x1: number, y1: number, x2: number, y2: number, size: number): string {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const spread = Math.PI / 5.5;
  const ax1 = x2 - size * Math.cos(angle - spread);
  const ay1 = y2 - size * Math.sin(angle - spread);
  const ax2 = x2 - size * Math.cos(angle + spread);
  const ay2 = y2 - size * Math.sin(angle + spread);
  return `M ${ax1.toFixed(1)} ${ay1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)} L ${ax2.toFixed(1)} ${ay2.toFixed(1)}`;
}

// ─── HTML5 Canvas stroke drawing (web only) ───────────────────────────────────

function drawToCanvas(
  ctx: CanvasRenderingContext2D,
  pts: StrokePoint[],
  tool: PenToolType,
  color: string,
  width: number,
  opacity: number,
  bgColor: string,
) {
  if (pts.length < 1) return;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  if (pts.length < 2) return;

  const smooth = catmullRomSmooth(pts);

  ctx.save();

  const drawSmoothLine = (points: StrokePoint[], lw: number, col: string, alpha: number, dash?: number[]) => {
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (dash) ctx.setLineDash(dash); else ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 1; i++) {
      const cp = points[i];
      const nx = points[i + 1];
      ctx.quadraticCurveTo(cp.x, cp.y, (cp.x + nx.x) / 2, (cp.y + nx.y) / 2);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  if (tool === 'eraser') {
    drawSmoothLine(smooth, width * 2.5, bgColor, 1);
  } else if (tool === 'pencil') {
    // Realistic graphite: multiple semi-transparent layers with grain
    drawSmoothLine(smooth, width * 1.1, color, opacity * 0.22);
    drawSmoothLine(smooth, width * 0.6, color, opacity * 0.85);
    // Grain texture with slight offsets
    const g1 = smooth.map(p => ({ ...p, x: p.x + 0.5, y: p.y - 0.4 }));
    const g2 = smooth.map(p => ({ ...p, x: p.x - 0.4, y: p.y + 0.5 }));
    const g3 = smooth.map(p => ({ ...p, x: p.x + 0.3, y: p.y + 0.3 }));
    drawSmoothLine(g1, width * 0.4, color, opacity * 0.16, [6, 3]);
    drawSmoothLine(g2, width * 0.35, color, opacity * 0.13, [3, 6]);
    drawSmoothLine(g3, width * 0.3, color, opacity * 0.10, [7, 2]);
  } else if (tool === 'highlighter') {
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(smooth[0].x, smooth[0].y);
    smooth.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();
  } else if (tool === 'marker') {
    drawSmoothLine(smooth, width, color, opacity);
  } else if (tool === 'neon') {
    drawSmoothLine(smooth, width * 8, color, opacity * 0.04);
    drawSmoothLine(smooth, width * 5, color, opacity * 0.08);
    drawSmoothLine(smooth, width * 3, color, opacity * 0.16);
    drawSmoothLine(smooth, width * 1.5, color, opacity * 0.9);
    drawSmoothLine(smooth, width * 0.4, '#ffffff', 0.7);
  } else if (tool === 'watercolor') {
    [[2.2, 0.28, -1, 1], [1.7, 0.36, 1, -1], [1.3, 0.44, -0.5, 0], [0.9, 0.55, 0.5, 0.5], [0.5, 0.65, 0, 0]].forEach(([sc, op, dx, dy]) => {
      const shifted = smooth.map(p => ({ ...p, x: p.x + dx, y: p.y + dy }));
      drawSmoothLine(shifted, width * sc, color, opacity * op);
    });
  } else if (tool === 'airbrush') {
    drawSmoothLine(smooth, width * 3, color, opacity * 0.08);
    drawSmoothLine(smooth, width * 2, color, opacity * 0.14);
    drawSmoothLine(smooth, width * 1.2, color, opacity * 0.22);
    drawSmoothLine(smooth, width * 0.6, color, opacity * 0.42);
  } else if (tool === 'chalk') {
    const dust = smooth.map((p, i) => ({ ...p, x: p.x + ((i * 7919) % 100) / 100 * width * 0.5 - width * 0.25, y: p.y + ((i * 6271) % 100) / 100 * width * 0.4 - width * 0.2 }));
    drawSmoothLine(dust, width * 0.8, color, opacity * 0.28, [2, 4]);
    drawSmoothLine(smooth, width * 1.2, color, opacity * 0.22, [4, 3]);
    drawSmoothLine(smooth, width * 0.65, color, opacity * 0.72);
    drawSmoothLine(smooth, width * 0.12, '#ffffff', 0.22, [5, 7]);
  } else if (tool === 'crayon') {
    [-0.5, -0.25, 0, 0.25, 0.5, 0.75].forEach((off, i) => {
      const shifted = smooth.map(p => ({ ...p, x: p.x + off * width * 0.55, y: p.y + off * 0.2 * width }));
      drawSmoothLine(shifted, width * 0.38, color, (0.42 + i * 0.06) * opacity);
    });
  } else if (tool === 'brush' || tool === 'fountain' || tool === 'ink') {
    // Variable-width: draw as filled polygon on canvas
    const n = smooth.length;
    const widths = smooth.map((p, idx) => {
      if (idx === 0) return width * 0.1;
      const prev = smooth[idx - 1];
      const dt = Math.max(1, p.timestamp - prev.timestamp);
      const speed = Math.hypot(p.x - prev.x, p.y - prev.y) / dt;
      let w = width;
      if (tool === 'fountain' || tool === 'ink') {
        w = width * Math.max(0.15, 1.5 - speed * 0.045);
        const sp = Math.min(1, idx / 10);
        const ep = Math.min(1, (n - 1 - idx) / 10);
        w *= sp * 0.9 + 0.1;
        w *= ep * 0.9 + 0.1;
      } else {
        w = width * (0.25 + (p.pressure || 0.5) * 0.75);
        const sp = Math.min(1, idx / 6);
        const ep = Math.min(1, (n - 1 - idx) / 6);
        w *= sp * 0.75 + 0.25;
        w *= ep * 0.75 + 0.25;
      }
      return Math.max(0.2, w);
    });

    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.beginPath();
    const left: { x: number; y: number }[] = [];
    const right: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) {
      const p = smooth[i];
      const half = widths[i] / 2;
      let angle = i === 0 ? Math.atan2(smooth[1].y - p.y, smooth[1].x - p.x)
        : i === n - 1 ? Math.atan2(p.y - smooth[i - 1].y, p.x - smooth[i - 1].x)
        : Math.atan2(smooth[i + 1].y - smooth[i - 1].y, smooth[i + 1].x - smooth[i - 1].x);
      const perp = angle + Math.PI / 2;
      left.push({ x: p.x + Math.cos(perp) * half, y: p.y + Math.sin(perp) * half });
      right.push({ x: p.x - Math.cos(perp) * half, y: p.y - Math.sin(perp) * half });
    }
    ctx.moveTo(left[0].x, left[0].y);
    left.forEach(p => ctx.lineTo(p.x, p.y));
    [...right].reverse().forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fill();
  } else {
    // Ballpoint / default
    drawSmoothLine(smooth, width, color, opacity);
  }

  ctx.restore();
}

// ─── Template Background (SVG) ────────────────────────────────────────────────

const TemplateBackground = React.memo(function TemplateBackground({
  template, width, height, lineColor, dotColor,
}: {
  template: string; width: number; height: number; lineColor: string; dotColor: string;
}) {
  const els: React.ReactElement[] = [];
  switch (template) {
    case 'lined':
    case 'narrow-ruled': {
      const sp = template === 'lined' ? 32 : 22;
      els.push(<Line key="mg" x1={60} y1={0} x2={60} y2={height} stroke="#f87171" strokeWidth={1} opacity={0.35} />);
      for (let y = sp + 24; y < height; y += sp)
        els.push(<Line key={y} x1={0} y1={y} x2={width} y2={y} stroke={lineColor} strokeWidth={0.8} opacity={0.55} />);
      break;
    }
    case 'dotted':
    case 'bullet-journal': {
      for (let x = 20; x < width; x += 20)
        for (let y = 20; y < height; y += 20)
          els.push(<Circle key={`${x}-${y}`} cx={x} cy={y} r={1.3} fill={dotColor} opacity={0.6} />);
      break;
    }
    case 'grid':
    case 'sketch': {
      const sp = template === 'sketch' ? 25 : 20;
      const op = template === 'sketch' ? 0.22 : 0.42;
      for (let x = 0; x <= width; x += sp) els.push(<Line key={`vx${x}`} x1={x} y1={0} x2={x} y2={height} stroke={lineColor} strokeWidth={0.5} opacity={op} />);
      for (let y = 0; y <= height; y += sp) els.push(<Line key={`hy${y}`} x1={0} y1={y} x2={width} y2={y} stroke={lineColor} strokeWidth={0.5} opacity={op} />);
      break;
    }
    case 'math': {
      for (let x = 0; x <= width; x += 10) {
        const maj = (x / 10) % 5 === 0;
        els.push(<Line key={`mx${x}`} x1={x} y1={0} x2={x} y2={height} stroke={lineColor} strokeWidth={maj ? 0.6 : 0.25} opacity={maj ? 0.5 : 0.28} />);
      }
      for (let y = 0; y <= height; y += 10) {
        const maj = (y / 10) % 5 === 0;
        els.push(<Line key={`my${y}`} x1={0} y1={y} x2={width} y2={y} stroke={lineColor} strokeWidth={maj ? 0.6 : 0.25} opacity={maj ? 0.5 : 0.28} />);
      }
      break;
    }
    case 'isometric': {
      const d = 30; const h = d * Math.sin(Math.PI / 3);
      for (let row = -2; row < height / h + 2; row++)
        for (let col = -2; col < width / d + 2; col++) {
          const x = col * d + (row % 2 === 0 ? 0 : d / 2); const y = row * h;
          els.push(
            <Line key={`a${row}${col}`} x1={x} y1={y} x2={x + d} y2={y} stroke={lineColor} strokeWidth={0.5} opacity={0.38} />,
            <Line key={`b${row}${col}`} x1={x} y1={y} x2={x + d / 2} y2={y + h} stroke={lineColor} strokeWidth={0.5} opacity={0.38} />,
            <Line key={`c${row}${col}`} x1={x + d} y1={y} x2={x + d / 2} y2={y + h} stroke={lineColor} strokeWidth={0.5} opacity={0.38} />,
          );
        }
      break;
    }
    case 'hexagonal': {
      const size = 20; const hx = size * 2; const hy = Math.sqrt(3) * size;
      for (let row = -1; row < height / hy + 1; row++)
        for (let col = -1; col < width / (hx * 0.75) + 1; col++) {
          const cx = col * hx * 0.75; const cy = row * hy + (col % 2 === 0 ? 0 : hy / 2);
          const pStr = Array.from({ length: 6 }).map((_, i) => {
            const a = (Math.PI / 180) * (60 * i - 30);
            return `${(cx + size * Math.cos(a)).toFixed(1)},${(cy + size * Math.sin(a)).toFixed(1)}`;
          }).join(' ');
          els.push(<Path key={`h${row}${col}`} d={`M ${pStr} Z`} fill="none" stroke={lineColor} strokeWidth={0.5} opacity={0.38} />);
        }
      break;
    }
    case 'cornell': {
      const cw = width * 0.28; const sh = height * 0.78;
      for (let y = 32; y < height; y += 28) els.push(<Line key={`cl${y}`} x1={0} y1={y} x2={width} y2={y} stroke={lineColor} strokeWidth={0.6} opacity={0.38} />);
      els.push(
        <Line key="cuev" x1={cw} y1={0} x2={cw} y2={sh} stroke="#f87171" strokeWidth={1.2} opacity={0.4} />,
        <Line key="sumh" x1={0} y1={sh} x2={width} y2={sh} stroke="#f87171" strokeWidth={1.2} opacity={0.4} />,
      );
      break;
    }
    case 'music': {
      const sH = 8; let y = 40;
      while (y + sH * 4 < height - 20) {
        for (let i = 0; i < 5; i++) els.push(<Line key={`s${y}${i}`} x1={20} y1={y + i * sH} x2={width - 20} y2={y + i * sH} stroke={lineColor} strokeWidth={0.8} opacity={0.65} />);
        y += sH * 4 + 50;
      }
      break;
    }
    case 'daily-planner': {
      const cw = width * 0.22;
      els.push(<Line key="tc" x1={cw} y1={80} x2={cw} y2={height - 20} stroke={lineColor} strokeWidth={0.8} opacity={0.4} />);
      const hH = (height - 80) / 12;
      for (let i = 0; i <= 12; i++) els.push(<Line key={`hr${i}`} x1={0} y1={80 + i * hH} x2={width} y2={80 + i * hH} stroke={lineColor} strokeWidth={i % 2 === 0 ? 0.8 : 0.4} opacity={0.4} />);
      break;
    }
    case 'weekly-planner': {
      const cw = (width - 40) / 7;
      for (let i = 0; i <= 7; i++) els.push(<Line key={`wc${i}`} x1={40 + i * cw} y1={0} x2={40 + i * cw} y2={height} stroke={lineColor} strokeWidth={0.8} opacity={0.4} />);
      els.push(<Line key="wh" x1={0} y1={60} x2={width} y2={60} stroke={lineColor} strokeWidth={1} opacity={0.5} />);
      break;
    }
    case 'kanban': {
      const cw = width / 3;
      for (let i = 1; i < 3; i++) els.push(<Line key={`kc${i}`} x1={i * cw} y1={0} x2={i * cw} y2={height} stroke={lineColor} strokeWidth={1} opacity={0.35} />);
      els.push(<Line key="kh" x1={0} y1={55} x2={width} y2={55} stroke={lineColor} strokeWidth={1} opacity={0.4} />);
      break;
    }
    case 'storyboard': {
      const cols = 3; const rows = 2; const pad = 12;
      const cw = (width - pad * (cols + 1)) / cols;
      const ch = (height - pad * (rows + 1) - 60) / rows;
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
          els.push(<Rect key={`sb${r}${c}`} x={pad + c * (cw + pad)} y={60 + pad + r * (ch + pad)} width={cw} height={ch} fill="none" stroke={lineColor} strokeWidth={1} opacity={0.5} rx={4} />);
      break;
    }
    default: break;
  }
  return <G>{els}</G>;
});

// ─── SVG Stroke Renderer (completed strokes) ──────────────────────────────────

const StrokeRenderer = React.memo(function StrokeRenderer({ stroke, bgColor }: { stroke: Stroke; bgColor: string }) {
  const { tool, color, width, opacity, points } = stroke;
  if (!points.length) return null;

  const start = points[0];
  const end = points[points.length - 1];

  if (tool === 'line-shape') {
    return <Line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={color} strokeWidth={width} strokeLinecap="round" opacity={opacity} />;
  }
  if (tool === 'arrow-shape') {
    const hs = Math.max(width * 5, 14);
    return (
      <G opacity={opacity}>
        <Line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={color} strokeWidth={width} strokeLinecap="round" />
        <Path d={arrowHeadPath(start.x, start.y, end.x, end.y, hs)} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
      </G>
    );
  }
  if (tool === 'circle-shape') {
    const cx = (start.x + end.x) / 2; const cy = (start.y + end.y) / 2;
    const rx = Math.max(1, Math.abs(end.x - start.x) / 2);
    const ry = Math.max(1, Math.abs(end.y - start.y) / 2);
    return <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={color} strokeWidth={width} opacity={opacity} />;
  }
  if (tool === 'rect-shape') {
    const x = Math.min(start.x, end.x); const y = Math.min(start.y, end.y);
    const w = Math.abs(end.x - start.x); const h = Math.abs(end.y - start.y);
    return <Rect x={x} y={y} width={Math.max(1, w)} height={Math.max(1, h)} fill="none" stroke={color} strokeWidth={width} rx={3} opacity={opacity} />;
  }

  // Eraser — paint over with bg color
  if (tool === 'eraser') {
    return <Path d={smoothPath(points)} fill="none" stroke={bgColor} strokeWidth={width * 2.5} strokeLinecap="round" strokeLinejoin="round" opacity={1} />;
  }

  if (tool === 'neon') {
    const d = smoothPath(points);
    return (
      <G>
        <Path d={d} fill="none" stroke={color} strokeWidth={width * 8} strokeLinecap="round" strokeLinejoin="round" opacity={0.04} />
        <Path d={d} fill="none" stroke={color} strokeWidth={width * 5} strokeLinecap="round" strokeLinejoin="round" opacity={0.08} />
        <Path d={d} fill="none" stroke={color} strokeWidth={width * 3} strokeLinecap="round" strokeLinejoin="round" opacity={0.16} />
        <Path d={d} fill="none" stroke={color} strokeWidth={width * 1.5} strokeLinecap="round" strokeLinejoin="round" opacity={opacity * 0.92} />
        <Path d={d} fill="none" stroke="#fff" strokeWidth={width * 0.3} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
      </G>
    );
  }

  if (tool === 'watercolor') {
    return (
      <G>
        {[[2.2, 0.28, -1, 1], [1.7, 0.36, 1, -1], [1.3, 0.44, -0.5, 0], [0.9, 0.55, 0.5, 0.5], [0.5, 0.65, 0, 0]].map(([sc, op, dx, dy], i) => {
          const shifted = points.map(p => ({ ...p, x: p.x + dx, y: p.y + dy }));
          return <Path key={i} d={smoothPath(shifted)} fill="none" stroke={color} strokeWidth={width * sc} strokeLinecap="round" strokeLinejoin="round" opacity={opacity * op} />;
        })}
      </G>
    );
  }

  if (tool === 'airbrush') {
    const d = smoothPath(points);
    return (
      <G>
        {[[3, 0.08], [2, 0.14], [1.2, 0.24], [0.7, 0.42]].map(([sc, op], i) =>
          <Path key={i} d={d} fill="none" stroke={color} strokeWidth={width * sc} strokeLinecap="round" strokeLinejoin="round" opacity={opacity * op} />
        )}
      </G>
    );
  }

  if (tool === 'highlighter' || tool === 'marker') {
    return <Path d={smoothPath(points)} fill="none" stroke={color} strokeWidth={width} strokeLinecap={tool === 'highlighter' ? 'square' : 'round'} strokeLinejoin="round" opacity={opacity} />;
  }

  if (tool === 'chalk') {
    const d = smoothPath(points);
    const dust = points.map((p, i) => ({ ...p, x: p.x + ((i * 7919) % 100) / 100 * width * 0.5 - width * 0.25, y: p.y + ((i * 6271) % 100) / 100 * width * 0.4 - width * 0.2 }));
    return (
      <G opacity={opacity}>
        <Path d={smoothPath(dust)} fill="none" stroke={color} strokeWidth={width * 0.8} strokeLinecap="round" strokeLinejoin="round" opacity={0.28} strokeDasharray="2,3" />
        <Path d={d} fill="none" stroke={color} strokeWidth={width * 1.2} strokeLinecap="round" strokeLinejoin="round" opacity={0.22} strokeDasharray="4,2" />
        <Path d={d} fill="none" stroke={color} strokeWidth={width * 0.65} strokeLinecap="round" strokeLinejoin="round" opacity={0.72} />
        <Path d={d} fill="none" stroke="#fff" strokeWidth={width * 0.12} strokeLinecap="round" strokeLinejoin="round" opacity={0.22} strokeDasharray="5,7" />
      </G>
    );
  }

  if (tool === 'crayon') {
    return (
      <G opacity={opacity}>
        {([-0.5, -0.25, 0, 0.25, 0.5, 0.75] as number[]).map((off, i) => {
          const shifted = points.map(p => ({ ...p, x: p.x + off * width * 0.55, y: p.y + off * 0.2 * width }));
          return <Path key={i} d={smoothPath(shifted)} fill="none" stroke={color} strokeWidth={width * 0.38} strokeLinecap="round" strokeLinejoin="round" opacity={0.42 + i * 0.06} />;
        })}
      </G>
    );
  }

  // ── Pencil — realistic graphite texture ────────────────────────────────────
  if (tool === 'pencil') {
    const d = smoothPath(points);
    const g1 = points.map(p => ({ ...p, x: p.x + 0.5, y: p.y - 0.4 }));
    const g2 = points.map(p => ({ ...p, x: p.x - 0.4, y: p.y + 0.5 }));
    const g3 = points.map(p => ({ ...p, x: p.x + 0.3, y: p.y + 0.3 }));
    return (
      <G opacity={opacity}>
        {/* Soft halo */}
        <Path d={d} fill="none" stroke={color} strokeWidth={width * 1.1} strokeLinecap="round" strokeLinejoin="round" opacity={0.18} />
        {/* Main graphite core */}
        <Path d={d} fill="none" stroke={color} strokeWidth={width * 0.62} strokeLinecap="round" strokeLinejoin="round" opacity={0.88} />
        {/* Grain texture */}
        <Path d={smoothPath(g1)} fill="none" stroke={color} strokeWidth={width * 0.42} strokeLinecap="round" strokeLinejoin="round" opacity={0.15} strokeDasharray="6,3" />
        <Path d={smoothPath(g2)} fill="none" stroke={color} strokeWidth={width * 0.38} strokeLinecap="round" strokeLinejoin="round" opacity={0.12} strokeDasharray="3,6" />
        <Path d={smoothPath(g3)} fill="none" stroke={color} strokeWidth={width * 0.32} strokeLinecap="round" strokeLinejoin="round" opacity={0.10} strokeDasharray="7,2" />
      </G>
    );
  }

  if (tool === 'calligraphy') {
    return <Path d={calligraphyPath(points, width)} fill={color} opacity={opacity} />;
  }

  if (tool === 'brush' || tool === 'fountain' || tool === 'ink') {
    return <Path d={variableWidthPath(points, width, tool)} fill={color} opacity={opacity} />;
  }

  // Ballpoint / default
  return <Path d={smoothPath(points)} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" opacity={opacity} />;
});

// ─── Main DrawingCanvas ────────────────────────────────────────────────────────

export function DrawingCanvas({ width, height, pageBgColor }: DrawingCanvasProps) {
  const { colors, isDark } = useTheme();
  const {
    activeTool, penColor, penWidth, penOpacity,
    strokes, currentStroke,
    addStroke, updateCurrentStroke,
    isErasing, selectedTemplate,
  } = useDrawing();

  const bgColor = pageBgColor || colors.canvasBg || (isDark ? '#1a1a1a' : '#ffffff');

  // -- Refs (no re-renders during stroke) --
  const currentPtsRef = useRef<StrokePoint[]>([]);
  const strokeIdRef = useRef('');
  const lastTRef = useRef(0);
  const isDownRef = useRef(false);
  const rafRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const pendingRef = useRef(false);

  // Web canvas ref
  const liveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerDomRef = useRef<HTMLDivElement | null>(null);
  const isWeb = Platform.OS === 'web';

  const tool_ = (isErasing ? 'eraser' : activeTool) as PenToolType;
  const color_ = isErasing ? bgColor : penColor;
  const isShape = (t: string) => ['line-shape', 'circle-shape', 'rect-shape', 'arrow-shape'].includes(t);

  // -- RAF-batched canvas update --
  const flushToCanvas = useCallback(() => {
    pendingRef.current = false;
    const pts = currentPtsRef.current;
    if (!isDownRef.current || pts.length < 2) return;
    const canvas = liveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawToCanvas(ctx, pts, tool_, color_, penWidth, penOpacity, bgColor);
  }, [tool_, color_, penWidth, penOpacity, bgColor]);

  const scheduleFrame = useCallback(() => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    rafRef.current = requestAnimationFrame(flushToCanvas);
  }, [flushToCanvas]);

  const commitStroke = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    pendingRef.current = false;
    const pts = currentPtsRef.current;
    if (pts.length > 0) {
      if (liveCanvasRef.current) {
        const ctx = liveCanvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, liveCanvasRef.current.width, liveCanvasRef.current.height);
      }
      addStroke({
        id: strokeIdRef.current,
        tool: tool_,
        color: color_,
        width: penWidth,
        opacity: penOpacity,
        points: [...pts],
        isComplete: true,
      });
    }
    updateCurrentStroke(null);
    currentPtsRef.current = [];
    isDownRef.current = false;
  }, [tool_, color_, penWidth, penOpacity, addStroke, updateCurrentStroke]);

  // -- Web: pointer events on canvas overlay --
  useEffect(() => {
    if (!isWeb) return;
    const dom = containerDomRef.current;
    if (!dom) return;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    Object.assign(canvas.style, {
      position: 'absolute', top: '0', left: '0',
      width: width + 'px', height: height + 'px',
      touchAction: 'none', cursor: 'crosshair',
      zIndex: '10', pointerEvents: 'all',
    });
    dom.style.position = 'relative';
    dom.appendChild(canvas);
    liveCanvasRef.current = canvas;

    const rect = () => canvas.getBoundingClientRect();

    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      isDownRef.current = true;
      strokeIdRef.current = generateId();
      lastTRef.current = Date.now();
      const r = rect();
      currentPtsRef.current = [{ x: e.clientX - r.left, y: e.clientY - r.top, pressure: e.pressure || 0.5, timestamp: 0 }];
    };

    const onMove = (e: PointerEvent) => {
      if (!isDownRef.current) return;
      e.preventDefault();
      const r = rect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const pts = currentPtsRef.current;
      const prev = pts[pts.length - 1];
      if (prev && Math.hypot(x - prev.x, y - prev.y) < 1.5) return;
      const now = Date.now();
      const dt = now - lastTRef.current;
      lastTRef.current = now;
      const pt = { x, y, pressure: e.pressure || 0.5, timestamp: dt };
      if (isShape(tool_)) {
        currentPtsRef.current = [pts[0], pt];
      } else {
        currentPtsRef.current.push(pt);
      }
      scheduleFrame();
    };

    const onUp = () => { if (isDownRef.current) commitStroke(); };

    canvas.addEventListener('pointerdown', onDown, { passive: false });
    canvas.addEventListener('pointermove', onMove, { passive: false });
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('lostpointercapture', onUp);

    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('lostpointercapture', onUp);
      if (dom.contains(canvas)) dom.removeChild(canvas);
      liveCanvasRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, isWeb]);

  // Update canvas dimensions on resize
  useEffect(() => {
    if (liveCanvasRef.current) {
      liveCanvasRef.current.width = width;
      liveCanvasRef.current.height = height;
      Object.assign(liveCanvasRef.current.style, { width: width + 'px', height: height + 'px' });
    }
  }, [width, height]);

  // -- Native: PanResponder --
  const panResponder = useMemo(() => {
    if (isWeb) return null;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: any) => {
        isDownRef.current = true;
        strokeIdRef.current = generateId();
        lastTRef.current = Date.now();
        const { locationX: x, locationY: y } = evt.nativeEvent;
        const pressure = (evt.nativeEvent as any).force || 0.5;
        currentPtsRef.current = [{ x, y, pressure, timestamp: 0 }];
        updateCurrentStroke({ id: strokeIdRef.current, tool: tool_, color: color_, width: penWidth, opacity: penOpacity, points: [{ x, y, pressure, timestamp: 0 }], isComplete: false });
      },
      onPanResponderMove: (evt: any) => {
        if (!isDownRef.current) return;
        const { locationX: x, locationY: y } = evt.nativeEvent;
        const pts = currentPtsRef.current;
        const prev = pts[pts.length - 1];
        if (prev && Math.hypot(x - prev.x, y - prev.y) < 2) return;
        const now = Date.now();
        const pressure = (evt.nativeEvent as any).force || 0.5;
        const pt = { x, y, pressure, timestamp: now - lastTRef.current };
        lastTRef.current = now;
        if (isShape(tool_)) {
          currentPtsRef.current = [pts[0], pt];
        } else {
          currentPtsRef.current = [...pts, pt];
        }
        if (!pendingRef.current) {
          pendingRef.current = true;
          rafRef.current = requestAnimationFrame(() => {
            pendingRef.current = false;
            updateCurrentStroke({
              id: strokeIdRef.current, tool: tool_, color: color_,
              width: penWidth, opacity: penOpacity,
              points: [...currentPtsRef.current], isComplete: false,
            });
          });
        }
      },
      onPanResponderRelease: () => { commitStroke(); },
      onPanResponderTerminate: () => { commitStroke(); },
    });
  }, [isWeb, tool_, color_, penWidth, penOpacity, updateCurrentStroke, commitStroke]);

  const lineColor = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.15)';
  const dotColor = isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.20)';

  const lastEraserPt = isErasing && currentStroke?.points.length
    ? currentStroke.points[currentStroke.points.length - 1] : null;

  return (
    <View
      // On web, React Native Web renders this as a <div>, so we can attach the canvas child
      ref={isWeb ? (containerDomRef as any) : undefined}
      style={[styles.canvas, { width, height, backgroundColor: bgColor }]}
      {...(panResponder ? panResponder.panHandlers : {})}
    >
      <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Rect x={0} y={0} width={width} height={height} fill={bgColor} />
        <TemplateBackground template={selectedTemplate} width={width} height={height} lineColor={lineColor} dotColor={dotColor} />
        {strokes.map(s => <StrokeRenderer key={s.id} stroke={s} bgColor={bgColor} />)}
        {/* Native only: render current stroke in SVG */}
        {!isWeb && currentStroke && currentStroke.points.length > 0 && (
          <StrokeRenderer stroke={currentStroke} bgColor={bgColor} />
        )}
        {/* Eraser cursor */}
        {lastEraserPt && (
          <G>
            <Circle cx={lastEraserPt.x} cy={lastEraserPt.y} r={penWidth * 1.5} fill={bgColor} opacity={0.4} />
            <Circle cx={lastEraserPt.x} cy={lastEraserPt.y} r={penWidth * 1.5} fill="none" stroke={lineColor} strokeWidth={1.5} opacity={0.9} />
          </G>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { overflow: 'hidden' },
});
