/**
 * DrawingCanvas — GoodNotes 6 / Samsung Notes quality handwriting engine
 *
 * Architecture:
 *  Web:    HTML5 Canvas overlay for the LIVE stroke (zero React re-renders per frame)
 *          SVG for completed strokes (React manages history)
 *  Native: setNativeProps on SVG Path for live stroke + PanResponder
 *
 * Key algorithms:
 *  - Catmull-Rom spline smoothing (buttery curves)
 *  - Perfect-freehand-style variable-width strokes
 *  - Speed-based pressure simulation
 *  - Realistic graphite pencil texture
 *  - Eraser paints the page background color (not white)
 */

import React, {
  useRef, useEffect, useCallback, useMemo,
  memo, useState,
} from 'react';
import {
  View, StyleSheet, Platform, PanResponder, findNodeHandle,
} from 'react-native';
import Svg, {
  Path, Circle, Line, G, Rect, Ellipse, Defs,
  LinearGradient, Stop, ClipPath,
} from 'react-native-svg';
import { useDrawing, Stroke, StrokePoint } from '../context/DrawingContext';
import { useTheme } from '../context/ThemeContext';
import { PenToolType, PEN_TOOLS } from '../constants/penTools';
import { generateId } from '../utils/noteUtils';

export interface DrawingCanvasProps {
  width: number;
  height: number;
  pageBgColor?: string;
  style?: any;
}

// ─── Math / geometry helpers ──────────────────────────────────────────────────

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ─── Catmull-Rom spline (passes through all input points) ────────────────────

function catmullRom(pts: StrokePoint[], steps = 6, tension = 0.5): StrokePoint[] {
  if (pts.length < 3) return pts;
  const out: StrokePoint[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[Math.min(pts.length - 1, i + 1)];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push({
        x: tension * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: tension * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
        pressure: lerp(p1.pressure, p2.pressure, t),
        timestamp: lerp(p1.timestamp, p2.timestamp, t),
      });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// ─── SVG path string from points ──────────────────────────────────────────────

function toSvgPath(pts: StrokePoint[]): string {
  if (!pts.length) return '';
  if (pts.length === 1) {
    return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} l 0.01 0.01`;
  }
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const cp = pts[i];
    const nx = pts[i + 1];
    d += ` Q ${cp.x.toFixed(1)} ${cp.y.toFixed(1)} ${((cp.x + nx.x) / 2).toFixed(1)} ${((cp.y + nx.y) / 2).toFixed(1)}`;
  }
  return d + ` L ${pts[pts.length - 1].x.toFixed(1)} ${pts[pts.length - 1].y.toFixed(1)}`;
}

function smoothPath(pts: StrokePoint[]): string {
  if (pts.length < 3) return toSvgPath(pts);
  return toSvgPath(catmullRom(pts));
}

// ─── Variable-width filled polygon (fountain / brush / ink) ──────────────────

function strokeWidth(p: StrokePoint, prev: StrokePoint, base: number, tool: PenToolType, idx: number, total: number): number {
  const dt = Math.max(1, p.timestamp - prev.timestamp + 1);
  const speed = dist(p, prev) / dt;
  let w = base;

  if (tool === 'fountain' || tool === 'ink') {
    w = base * clamp(1.6 - speed * 0.045, 0.12, 1.6);
    const taper = Math.min(1, idx / 12) * Math.min(1, (total - 1 - idx) / 12);
    w = w * taper * 0.9 + w * 0.1;
  } else if (tool === 'brush') {
    const pres = clamp(p.pressure || 0.5, 0, 1);
    w = base * (0.2 + pres * 0.8);
    const taper = Math.min(1, idx / 8) * Math.min(1, (total - 1 - idx) / 8);
    w = w * taper * 0.75 + w * 0.25;
  } else if (tool === 'pencil') {
    w = base * clamp(1.35 - speed * 0.032, 0.3, 1.35);
  }
  return Math.max(0.15, w);
}

function variableWidthPath(rawPts: StrokePoint[], base: number, tool: PenToolType): string {
  if (rawPts.length < 2) {
    const p = rawPts[0] || { x: 0, y: 0 };
    const r = base / 2;
    return `M ${p.x - r} ${p.y} A ${r} ${r} 0 1 0 ${p.x + r} ${p.y} A ${r} ${r} 0 1 0 ${p.x - r} ${p.y}`;
  }
  const pts = rawPts.length > 3 ? catmullRom(rawPts) : rawPts;
  const n = pts.length;
  const widths = pts.map((p, i) => i === 0 ? base * 0.05 : strokeWidth(p, pts[i - 1], base, tool, i, n));

  const left: { x: number; y: number }[] = [];
  const right: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const half = widths[i] / 2;
    const angle = i === 0
      ? Math.atan2(pts[1].y - p.y, pts[1].x - p.x)
      : i === n - 1
        ? Math.atan2(p.y - pts[i - 1].y, p.x - pts[i - 1].x)
        : Math.atan2(pts[i + 1].y - pts[i - 1].y, pts[i + 1].x - pts[i - 1].x);
    const perp = angle + Math.PI / 2;
    left.push({ x: p.x + Math.cos(perp) * half, y: p.y + Math.sin(perp) * half });
    right.push({ x: p.x - Math.cos(perp) * half, y: p.y - Math.sin(perp) * half });
  }

  const quad = (arr: { x: number; y: number }[], rev = false) => {
    const a = rev ? [...arr].reverse() : arr;
    let s = `L ${a[0].x.toFixed(1)} ${a[0].y.toFixed(1)}`;
    for (let i = 1; i < a.length; i++) {
      const pv = a[i - 1]; const cu = a[i];
      s += ` Q ${pv.x.toFixed(1)} ${pv.y.toFixed(1)} ${((pv.x + cu.x) / 2).toFixed(1)} ${((pv.y + cu.y) / 2).toFixed(1)}`;
    }
    return s;
  };

  return `M ${left[0].x.toFixed(1)} ${left[0].y.toFixed(1)} ${quad(left)} ${quad(right, true)} Z`;
}

// ─── Calligraphy path ─────────────────────────────────────────────────────────

function calligraphyPath(pts: StrokePoint[], w: number): string {
  if (pts.length < 2) return '';
  const smooth = pts.length > 3 ? catmullRom(pts) : pts;
  return smooth.slice(0, -1).map((p1, i) => {
    const p2 = smooth[i + 1];
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const nib = angle + Math.PI / 4;
    const hw = (w * (0.28 + 0.72 * Math.abs(Math.sin(angle)))) / 2;
    const dx = Math.cos(nib) * hw;
    const dy = Math.sin(nib) * hw;
    return `M ${(p1.x + dx).toFixed(1)} ${(p1.y + dy).toFixed(1)} L ${(p2.x + dx).toFixed(1)} ${(p2.y + dy).toFixed(1)} L ${(p2.x - dx).toFixed(1)} ${(p2.y - dy).toFixed(1)} L ${(p1.x - dx).toFixed(1)} ${(p1.y - dy).toFixed(1)} Z`;
  }).join(' ');
}

// ─── Arrow head ───────────────────────────────────────────────────────────────

function arrowHead(x1: number, y1: number, x2: number, y2: number, sz: number): string {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const s = Math.PI / 5.5;
  return `M ${(x2 - sz * Math.cos(a - s)).toFixed(1)} ${(y2 - sz * Math.sin(a - s)).toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)} L ${(x2 - sz * Math.cos(a + s)).toFixed(1)} ${(y2 - sz * Math.sin(a + s)).toFixed(1)}`;
}

// ─── Web Canvas 2D rendering ──────────────────────────────────────────────────

function drawStrokeOnCanvas(
  ctx: CanvasRenderingContext2D,
  pts: StrokePoint[],
  tool: PenToolType,
  color: string,
  width: number,
  opacity: number,
  bgColor: string,
) {
  if (pts.length < 2) return;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const smooth = pts.length > 3 ? catmullRom(pts) : pts;

  const drawLine = (points: StrokePoint[], lw: number, col: string, alpha: number, dash?: number[]) => {
    ctx.save();
    ctx.globalAlpha = clamp(alpha, 0, 1);
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
    ctx.restore();
  };

  if (tool === 'eraser') {
    drawLine(smooth, width * 2.5, bgColor, 1);
    return;
  }

  if (tool === 'pencil') {
    // Realistic graphite: soft outer + sharp core + grain dots
    drawLine(smooth, width * 1.3, color, opacity * 0.15);
    drawLine(smooth, width * 0.7, color, opacity * 0.88);
    const g1 = smooth.map(p => ({ ...p, x: p.x + 0.6, y: p.y - 0.5 }));
    const g2 = smooth.map(p => ({ ...p, x: p.x - 0.5, y: p.y + 0.6 }));
    const g3 = smooth.map(p => ({ ...p, x: p.x + 0.3, y: p.y + 0.4 }));
    drawLine(g1, width * 0.45, color, opacity * 0.17, [7, 3]);
    drawLine(g2, width * 0.38, color, opacity * 0.14, [3, 7]);
    drawLine(g3, width * 0.32, color, opacity * 0.11, [9, 2]);
    // Grain speckles
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity * 0.12;
    for (let i = 0; i < smooth.length; i += 2) {
      const p = smooth[i];
      const scatter = (width * 0.6);
      const sx = p.x + (Math.sin(i * 7919) * 0.5 + 0.5 - 0.5) * scatter;
      const sy = p.y + (Math.sin(i * 6271) * 0.5 + 0.5 - 0.5) * scatter * 0.7;
      ctx.beginPath();
      ctx.arc(sx, sy, width * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  if (tool === 'neon') {
    drawLine(smooth, width * 10, color, opacity * 0.03);
    drawLine(smooth, width * 6, color, opacity * 0.07);
    drawLine(smooth, width * 3.5, color, opacity * 0.13);
    drawLine(smooth, width * 2, color, opacity * 0.85);
    drawLine(smooth, width * 0.45, '#ffffff', 0.75);
    return;
  }

  if (tool === 'watercolor') {
    [
      [2.5, 0.22, -1.2, 1.2], [1.9, 0.32, 1.1, -1.1],
      [1.4, 0.42, -0.6, 0.2], [1.0, 0.52, 0.6, 0.6],
      [0.6, 0.62, 0, 0],
    ].forEach(([sc, op, dx, dy]) => {
      const shifted = smooth.map(p => ({ ...p, x: p.x + dx, y: p.y + dy }));
      drawLine(shifted, width * sc, color, opacity * op);
    });
    return;
  }

  if (tool === 'airbrush') {
    drawLine(smooth, width * 3.5, color, opacity * 0.06);
    drawLine(smooth, width * 2.5, color, opacity * 0.10);
    drawLine(smooth, width * 1.8, color, opacity * 0.17);
    drawLine(smooth, width * 1.1, color, opacity * 0.28);
    drawLine(smooth, width * 0.55, color, opacity * 0.45);
    // Spatter dots
    ctx.save();
    ctx.fillStyle = color;
    for (let i = 0; i < smooth.length; i += 3) {
      const p = smooth[i];
      for (let d = 0; d < 6; d++) {
        const ang = (d / 6) * Math.PI * 2;
        const r = width * 0.4 * (0.4 + Math.sin(i * 1009 + d) * 0.5 + 0.5);
        ctx.globalAlpha = opacity * 0.08;
        ctx.beginPath();
        ctx.arc(p.x + Math.cos(ang) * r * 2, p.y + Math.sin(ang) * r * 2, width * 0.06, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    return;
  }

  if (tool === 'chalk') {
    const dust = smooth.map((p, i) => ({
      ...p,
      x: p.x + ((i * 7919) % 97) / 97 * width * 0.6 - width * 0.3,
      y: p.y + ((i * 6271) % 83) / 83 * width * 0.5 - width * 0.25,
    }));
    drawLine(dust, width * 0.9, color, opacity * 0.25, [2, 5]);
    drawLine(smooth, width * 1.3, color, opacity * 0.20, [4, 3]);
    drawLine(smooth, width * 0.7, color, opacity * 0.75);
    drawLine(smooth, width * 0.15, '#ffffff', 0.28, [6, 8]);
    return;
  }

  if (tool === 'crayon') {
    [-0.55, -0.28, 0, 0.28, 0.55, 0.82].forEach((off, i) => {
      const shifted = smooth.map(p => ({
        ...p,
        x: p.x + off * width * 0.55,
        y: p.y + off * width * 0.18,
      }));
      drawLine(shifted, width * 0.38, color, (0.38 + i * 0.07) * opacity);
    });
    return;
  }

  if (tool === 'highlighter') {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'round';
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(smooth[0].x, smooth[0].y);
    smooth.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (tool === 'brush' || tool === 'fountain' || tool === 'ink') {
    // Variable-width polygon
    const n = smooth.length;
    const widths = smooth.map((p, i) => i === 0 ? width * 0.05 : strokeWidth(p, smooth[i - 1], width, tool, i, n));
    const left: { x: number; y: number }[] = [];
    const right: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) {
      const p = smooth[i];
      const half = widths[i] / 2;
      const angle = i === 0
        ? Math.atan2(smooth[1].y - p.y, smooth[1].x - p.x)
        : i === n - 1
          ? Math.atan2(p.y - smooth[i - 1].y, p.x - smooth[i - 1].x)
          : Math.atan2(smooth[i + 1].y - smooth[i - 1].y, smooth[i + 1].x - smooth[i - 1].x);
      const perp = angle + Math.PI / 2;
      left.push({ x: p.x + Math.cos(perp) * half, y: p.y + Math.sin(perp) * half });
      right.push({ x: p.x - Math.cos(perp) * half, y: p.y - Math.sin(perp) * half });
    }
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(left[0].x, left[0].y);
    left.forEach((p, i) => { if (i > 0) ctx.lineTo(p.x, p.y); });
    [...right].reverse().forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }

  if (tool === 'pixel') {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    const gridSz = Math.round(width);
    smooth.forEach(p => {
      const gx = Math.round(p.x / gridSz) * gridSz;
      const gy = Math.round(p.y / gridSz) * gridSz;
      ctx.fillRect(gx - gridSz / 2, gy - gridSz / 2, gridSz, gridSz);
    });
    ctx.restore();
    return;
  }

  // Default (ballpoint, marker)
  drawLine(smooth, width, color, opacity);
}

// ─── Template Background (SVG) ────────────────────────────────────────────────

const TemplateBackground = memo(function TemplateBackground({
  template, width, height, lineColor, dotColor,
}: {
  template: string; width: number; height: number; lineColor: string; dotColor: string;
}) {
  const els: React.ReactElement[] = [];

  switch (template) {
    case 'lined':
    case 'wide-ruled': {
      const sp = 32;
      els.push(<Line key="mg" x1={60} y1={0} x2={60} y2={height} stroke="#f87171" strokeWidth={1} opacity={0.35} />);
      for (let y = sp + 24; y < height; y += sp)
        els.push(<Line key={`l_${y}`} x1={0} y1={y} x2={width} y2={y} stroke={lineColor} strokeWidth={0.8} opacity={0.55} />);
      break;
    }
    case 'narrow-ruled': {
      const sp = 22;
      els.push(<Line key="mg" x1={60} y1={0} x2={60} y2={height} stroke="#f87171" strokeWidth={1} opacity={0.35} />);
      for (let y = sp + 24; y < height; y += sp)
        els.push(<Line key={`l_${y}`} x1={0} y1={y} x2={width} y2={y} stroke={lineColor} strokeWidth={0.7} opacity={0.5} />);
      break;
    }
    case 'college-ruled': {
      const sp = 26;
      els.push(<Line key="mg1" x1={60} y1={0} x2={60} y2={height} stroke="#f87171" strokeWidth={1.2} opacity={0.4} />);
      els.push(<Line key="mg2" x1={62} y1={0} x2={62} y2={height} stroke="#f87171" strokeWidth={0.5} opacity={0.2} />);
      for (let y = sp + 24; y < height; y += sp)
        els.push(<Line key={`l_${y}`} x1={0} y1={y} x2={width} y2={y} stroke={lineColor} strokeWidth={0.75} opacity={0.52} />);
      break;
    }
    case 'dotted':
    case 'dot-grid': {
      const sp = 20;
      for (let xi = 0; xi * sp < width; xi++)
        for (let yi = 0; yi * sp < height; yi++)
          els.push(<Circle key={`d_${xi}_${yi}`} cx={xi * sp + 10} cy={yi * sp + 10} r={1.2} fill={dotColor} opacity={0.65} />);
      break;
    }
    case 'bullet-journal': {
      for (let xi = 0; xi * 20 < width; xi++)
        for (let yi = 0; yi * 20 < height; yi++)
          els.push(<Circle key={`bj_${xi}_${yi}`} cx={xi * 20 + 10} cy={yi * 20 + 10} r={1.5} fill={dotColor} opacity={0.55} />);
      break;
    }
    case 'grid':
    case 'graph': {
      const sp = 20;
      for (let xi = 0; xi * sp <= width; xi++)
        els.push(<Line key={`gv_${xi}`} x1={xi * sp} y1={0} x2={xi * sp} y2={height} stroke={lineColor} strokeWidth={0.5} opacity={0.42} />);
      for (let yi = 0; yi * sp <= height; yi++)
        els.push(<Line key={`gh_${yi}`} x1={0} y1={yi * sp} x2={width} y2={yi * sp} stroke={lineColor} strokeWidth={0.5} opacity={0.42} />);
      break;
    }
    case 'sketch': {
      const sp = 25;
      for (let xi = 0; xi * sp <= width; xi++)
        els.push(<Line key={`sv_${xi}`} x1={xi * sp} y1={0} x2={xi * sp} y2={height} stroke={lineColor} strokeWidth={0.4} opacity={0.22} />);
      for (let yi = 0; yi * sp <= height; yi++)
        els.push(<Line key={`sh_${yi}`} x1={0} y1={yi * sp} x2={width} y2={yi * sp} stroke={lineColor} strokeWidth={0.4} opacity={0.22} />);
      break;
    }
    case 'math': {
      for (let xi = 0; xi * 10 <= width; xi++) {
        const maj = xi % 5 === 0;
        els.push(<Line key={`mv_${xi}`} x1={xi * 10} y1={0} x2={xi * 10} y2={height} stroke={lineColor} strokeWidth={maj ? 0.65 : 0.25} opacity={maj ? 0.5 : 0.28} />);
      }
      for (let yi = 0; yi * 10 <= height; yi++) {
        const maj = yi % 5 === 0;
        els.push(<Line key={`mh_${yi}`} x1={0} y1={yi * 10} x2={width} y2={yi * 10} stroke={lineColor} strokeWidth={maj ? 0.65 : 0.25} opacity={maj ? 0.5 : 0.28} />);
      }
      break;
    }
    case 'isometric': {
      const d = 30;
      const h = d * Math.sin(Math.PI / 3);
      const rows = Math.ceil(height / h) + 3;
      const cols = Math.ceil(width / d) + 3;
      for (let r = -2; r < rows; r++) {
        for (let c = -2; c < cols; c++) {
          const x = c * d + (r % 2 === 0 ? 0 : d / 2);
          const y = r * h;
          els.push(
            <Line key={`ia_${r}_${c}`} x1={x} y1={y} x2={x + d} y2={y} stroke={lineColor} strokeWidth={0.5} opacity={0.38} />,
            <Line key={`ib_${r}_${c}`} x1={x} y1={y} x2={x + d / 2} y2={y + h} stroke={lineColor} strokeWidth={0.5} opacity={0.38} />,
            <Line key={`ic_${r}_${c}`} x1={x + d} y1={y} x2={x + d / 2} y2={y + h} stroke={lineColor} strokeWidth={0.5} opacity={0.38} />,
          );
        }
      }
      break;
    }
    case 'hexagonal': {
      const sz = 20;
      const hx = sz * 2;
      const hy = Math.sqrt(3) * sz;
      const rows = Math.ceil(height / hy) + 2;
      const cols = Math.ceil(width / (hx * 0.75)) + 2;
      for (let r = -1; r < rows; r++) {
        for (let c = -1; c < cols; c++) {
          const cx = c * hx * 0.75;
          const cy = r * hy + (c % 2 === 0 ? 0 : hy / 2);
          const pts = Array.from({ length: 6 }).map((_, i) => {
            const a = (Math.PI / 180) * (60 * i - 30);
            return `${(cx + sz * Math.cos(a)).toFixed(1)},${(cy + sz * Math.sin(a)).toFixed(1)}`;
          }).join(' ');
          els.push(<Path key={`hex_${r}_${c}`} d={`M ${pts} Z`} fill="none" stroke={lineColor} strokeWidth={0.5} opacity={0.38} />);
        }
      }
      break;
    }
    case 'cornell': {
      const cw = width * 0.28;
      const sh = height * 0.78;
      const lineH = 28;
      for (let y = lineH; y < height; y += lineH)
        els.push(<Line key={`co_${y}`} x1={0} y1={y} x2={width} y2={y} stroke={lineColor} strokeWidth={0.6} opacity={0.38} />);
      els.push(
        <Line key="cv" x1={cw} y1={0} x2={cw} y2={sh} stroke="#f87171" strokeWidth={1.2} opacity={0.45} />,
        <Line key="ch" x1={0} y1={sh} x2={width} y2={sh} stroke="#f87171" strokeWidth={1.2} opacity={0.45} />,
      );
      break;
    }
    case 'music': {
      const sH = 8;
      let y = 40;
      let rowIdx = 0;
      while (y + sH * 4 < height - 20) {
        for (let i = 0; i < 5; i++)
          els.push(<Line key={`mu_${rowIdx}_${i}`} x1={20} y1={y + i * sH} x2={width - 20} y2={y + i * sH} stroke={lineColor} strokeWidth={0.8} opacity={0.65} />);
        y += sH * 4 + 50;
        rowIdx++;
      }
      break;
    }
    case 'daily-planner': {
      const cw = width * 0.22;
      const hH = (height - 80) / 12;
      els.push(<Line key="tc" x1={cw} y1={80} x2={cw} y2={height - 20} stroke={lineColor} strokeWidth={0.8} opacity={0.4} />);
      for (let i = 0; i <= 12; i++)
        els.push(<Line key={`dp_${i}`} x1={0} y1={80 + i * hH} x2={width} y2={80 + i * hH} stroke={lineColor} strokeWidth={i % 2 === 0 ? 0.8 : 0.4} opacity={0.4} />);
      break;
    }
    case 'weekly-planner': {
      const cw = (width - 40) / 7;
      for (let i = 0; i <= 7; i++)
        els.push(<Line key={`wpc_${i}`} x1={40 + i * cw} y1={0} x2={40 + i * cw} y2={height} stroke={lineColor} strokeWidth={0.8} opacity={0.4} />);
      els.push(<Line key="wph" x1={0} y1={60} x2={width} y2={60} stroke={lineColor} strokeWidth={1} opacity={0.5} />);
      break;
    }
    case 'monthly-calendar': {
      const cw = width / 7;
      const ch = (height - 60) / 5;
      for (let i = 0; i <= 7; i++)
        els.push(<Line key={`mc_${i}`} x1={i * cw} y1={60} x2={i * cw} y2={height} stroke={lineColor} strokeWidth={0.8} opacity={0.4} />);
      for (let i = 0; i <= 5; i++)
        els.push(<Line key={`mr_${i}`} x1={0} y1={60 + i * ch} x2={width} y2={60 + i * ch} stroke={lineColor} strokeWidth={0.8} opacity={0.4} />);
      els.push(<Line key="mht" x1={0} y1={60} x2={width} y2={60} stroke={lineColor} strokeWidth={1.2} opacity={0.5} />);
      break;
    }
    case 'kanban': {
      const cw = width / 3;
      for (let i = 1; i < 3; i++)
        els.push(<Line key={`kb_${i}`} x1={i * cw} y1={0} x2={i * cw} y2={height} stroke={lineColor} strokeWidth={1} opacity={0.35} />);
      els.push(<Line key="kbh" x1={0} y1={55} x2={width} y2={55} stroke={lineColor} strokeWidth={1} opacity={0.4} />);
      break;
    }
    case 'storyboard': {
      const cols = 3; const rows = 2; const pad = 12;
      const cw = (width - pad * (cols + 1)) / cols;
      const ch = (height - pad * (rows + 1) - 60) / rows;
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
          els.push(<Rect key={`sb_${r}_${c}`} x={pad + c * (cw + pad)} y={60 + pad + r * (ch + pad)} width={cw} height={ch} fill="none" stroke={lineColor} strokeWidth={1} opacity={0.5} rx={4} />);
      break;
    }
    case 'habit-tracker': {
      const habits = 10;
      const days = 31;
      const rh = (height - 40) / (habits + 1);
      const cw = (width - 80) / days;
      for (let r = 0; r <= habits + 1; r++)
        els.push(<Line key={`ht_r_${r}`} x1={80} y1={40 + r * rh} x2={width} y2={40 + r * rh} stroke={lineColor} strokeWidth={r === 0 ? 1 : 0.5} opacity={r === 0 ? 0.6 : 0.3} />);
      for (let c = 0; c <= days; c++)
        els.push(<Line key={`ht_c_${c}`} x1={80 + c * cw} y1={40} x2={80 + c * cw} y2={height} stroke={lineColor} strokeWidth={0.5} opacity={0.3} />);
      break;
    }
    case 'timeline': {
      const mid = height / 2;
      els.push(<Line key="tl" x1={20} y1={mid} x2={width - 20} y2={mid} stroke={lineColor} strokeWidth={1.5} opacity={0.55} />);
      const points = 8;
      for (let i = 0; i < points; i++) {
        const x = 20 + (i + 0.5) * (width - 40) / points;
        els.push(
          <Circle key={`tlp_${i}`} cx={x} cy={mid} r={5} fill="none" stroke={lineColor} strokeWidth={1.2} opacity={0.55} />,
          <Line key={`tll_${i}`} x1={x} y1={i % 2 === 0 ? mid - 40 : mid + 10} x2={x} y2={i % 2 === 0 ? mid - 10 : mid + 40} stroke={lineColor} strokeWidth={0.7} opacity={0.4} />,
        );
      }
      break;
    }
    case 'staff':
    case 'guitar-tabs': {
      if (template === 'guitar-tabs') {
        const sH = 10;
        let y = 50;
        let tabIdx = 0;
        while (y + sH * 5 < height - 20) {
          for (let i = 0; i < 6; i++)
            els.push(<Line key={`gt_${tabIdx}_${i}`} x1={20} y1={y + i * sH} x2={width - 20} y2={y + i * sH} stroke={lineColor} strokeWidth={i === 0 || i === 5 ? 1 : 0.7} opacity={0.65} />);
          y += sH * 5 + 60;
          tabIdx++;
        }
      } else {
        const sH = 8;
        let y = 40;
        let staffIdx = 0;
        while (y + sH * 4 < height - 20) {
          for (let i = 0; i < 5; i++)
            els.push(<Line key={`st_${staffIdx}_${i}`} x1={20} y1={y + i * sH} x2={width - 20} y2={y + i * sH} stroke={lineColor} strokeWidth={0.8} opacity={0.65} />);
          y += sH * 4 + 50;
          staffIdx++;
        }
      }
      break;
    }
    default: break;
  }

  return <G>{els}</G>;
});

// ─── SVG Stroke Renderer (one completed stroke) ───────────────────────────────

const StrokeRenderer = memo(function StrokeRenderer({ stroke, bgColor }: { stroke: Stroke; bgColor: string }) {
  const { tool, color, width, opacity, points } = stroke;
  if (!points.length) return null;

  const s = points[0];
  const e = points[points.length - 1];

  if (tool === 'line-shape') return <Line x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke={color} strokeWidth={width} strokeLinecap="round" opacity={opacity} />;

  if (tool === 'arrow-shape') {
    const hs = Math.max(width * 5, 14);
    return (
      <G opacity={opacity}>
        <Line x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke={color} strokeWidth={width} strokeLinecap="round" />
        <Path d={arrowHead(s.x, s.y, e.x, e.y, hs)} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
      </G>
    );
  }

  if (tool === 'circle-shape') {
    const cx = (s.x + e.x) / 2; const cy = (s.y + e.y) / 2;
    return <Ellipse cx={cx} cy={cy} rx={Math.max(1, Math.abs(e.x - s.x) / 2)} ry={Math.max(1, Math.abs(e.y - s.y) / 2)} fill="none" stroke={color} strokeWidth={width} opacity={opacity} />;
  }

  if (tool === 'rect-shape') {
    const x = Math.min(s.x, e.x); const y = Math.min(s.y, e.y);
    return <Rect x={x} y={y} width={Math.max(1, Math.abs(e.x - s.x))} height={Math.max(1, Math.abs(e.y - s.y))} fill="none" stroke={color} strokeWidth={width} rx={3} opacity={opacity} />;
  }

  if (tool === 'eraser') return <Path d={smoothPath(points)} fill="none" stroke={bgColor} strokeWidth={width * 2.5} strokeLinecap="round" strokeLinejoin="round" opacity={1} />;

  if (tool === 'neon') {
    const d = smoothPath(points);
    return (
      <G>
        <Path d={d} fill="none" stroke={color} strokeWidth={width * 10} strokeLinecap="round" strokeLinejoin="round" opacity={0.03} />
        <Path d={d} fill="none" stroke={color} strokeWidth={width * 6} strokeLinecap="round" strokeLinejoin="round" opacity={0.06} />
        <Path d={d} fill="none" stroke={color} strokeWidth={width * 3.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.12} />
        <Path d={d} fill="none" stroke={color} strokeWidth={width * 2} strokeLinecap="round" strokeLinejoin="round" opacity={opacity * 0.9} />
        <Path d={d} fill="none" stroke="#ffffff" strokeWidth={width * 0.4} strokeLinecap="round" strokeLinejoin="round" opacity={0.72} />
      </G>
    );
  }

  if (tool === 'watercolor') {
    return (
      <G>
        {[[2.5, 0.22, -1.2, 1.2], [1.9, 0.32, 1.1, -1.1], [1.4, 0.42, -0.6, 0.2], [1.0, 0.52, 0.6, 0.6], [0.6, 0.62, 0, 0]].map(([sc, op, dx, dy], i) => {
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
        {[[3.5, 0.06], [2.5, 0.10], [1.8, 0.17], [1.1, 0.28], [0.55, 0.45]].map(([sc, op], i) =>
          <Path key={i} d={d} fill="none" stroke={color} strokeWidth={width * sc} strokeLinecap="round" strokeLinejoin="round" opacity={opacity * op} />
        )}
      </G>
    );
  }

  if (tool === 'highlighter') return <Path d={smoothPath(points)} fill="none" stroke={color} strokeWidth={width} strokeLinecap="square" strokeLinejoin="round" opacity={opacity} />;
  if (tool === 'marker') return <Path d={smoothPath(points)} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" opacity={opacity} />;

  if (tool === 'chalk') {
    const d = smoothPath(points);
    const dust = points.map((p, i) => ({ ...p, x: p.x + ((i * 7919) % 97) / 97 * width * 0.6 - width * 0.3, y: p.y + ((i * 6271) % 83) / 83 * width * 0.5 - width * 0.25 }));
    return (
      <G opacity={opacity}>
        <Path d={smoothPath(dust)} fill="none" stroke={color} strokeWidth={width * 0.9} strokeLinecap="round" strokeLinejoin="round" opacity={0.25} strokeDasharray="2,5" />
        <Path d={d} fill="none" stroke={color} strokeWidth={width * 1.3} strokeLinecap="round" strokeLinejoin="round" opacity={0.20} strokeDasharray="4,3" />
        <Path d={d} fill="none" stroke={color} strokeWidth={width * 0.7} strokeLinecap="round" strokeLinejoin="round" opacity={0.75} />
        <Path d={d} fill="none" stroke="#ffffff" strokeWidth={width * 0.15} strokeLinecap="round" strokeLinejoin="round" opacity={0.25} strokeDasharray="6,8" />
      </G>
    );
  }

  if (tool === 'crayon') {
    return (
      <G opacity={opacity}>
        {([-0.55, -0.28, 0, 0.28, 0.55, 0.82] as number[]).map((off, i) => {
          const shifted = points.map(p => ({ ...p, x: p.x + off * width * 0.55, y: p.y + off * width * 0.18 }));
          return <Path key={i} d={smoothPath(shifted)} fill="none" stroke={color} strokeWidth={width * 0.38} strokeLinecap="round" strokeLinejoin="round" opacity={0.38 + i * 0.07} />;
        })}
      </G>
    );
  }

  // ── Pencil: realistic graphite texture ──────────────────────────────────────
  if (tool === 'pencil') {
    const d = smoothPath(points);
    const g1 = points.map(p => ({ ...p, x: p.x + 0.6, y: p.y - 0.5 }));
    const g2 = points.map(p => ({ ...p, x: p.x - 0.5, y: p.y + 0.6 }));
    const g3 = points.map(p => ({ ...p, x: p.x + 0.3, y: p.y + 0.4 }));
    return (
      <G opacity={opacity}>
        <Path d={d} fill="none" stroke={color} strokeWidth={width * 1.3} strokeLinecap="round" strokeLinejoin="round" opacity={0.15} />
        <Path d={d} fill="none" stroke={color} strokeWidth={width * 0.68} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
        <Path d={smoothPath(g1)} fill="none" stroke={color} strokeWidth={width * 0.45} strokeLinecap="round" strokeLinejoin="round" opacity={0.17} strokeDasharray="7,3" />
        <Path d={smoothPath(g2)} fill="none" stroke={color} strokeWidth={width * 0.38} strokeLinecap="round" strokeLinejoin="round" opacity={0.14} strokeDasharray="3,7" />
        <Path d={smoothPath(g3)} fill="none" stroke={color} strokeWidth={width * 0.32} strokeLinecap="round" strokeLinejoin="round" opacity={0.11} strokeDasharray="9,2" />
      </G>
    );
  }

  if (tool === 'pixel') {
    // Render as series of squares
    const smooth = points.length > 3 ? catmullRom(points) : points;
    const gridSz = Math.round(width);
    const seen = new Set<string>();
    const squares: React.ReactElement[] = [];
    smooth.forEach(p => {
      const gx = Math.round(p.x / gridSz) * gridSz;
      const gy = Math.round(p.y / gridSz) * gridSz;
      const key = `${gx}_${gy}`;
      if (!seen.has(key)) {
        seen.add(key);
        squares.push(<Rect key={key} x={gx - gridSz / 2} y={gy - gridSz / 2} width={gridSz} height={gridSz} fill={color} opacity={opacity} />);
      }
    });
    return <G>{squares}</G>;
  }

  if (tool === 'calligraphy') return <Path d={calligraphyPath(points, width)} fill={color} opacity={opacity} />;
  if (tool === 'brush' || tool === 'fountain' || tool === 'ink') return <Path d={variableWidthPath(points, width, tool)} fill={color} opacity={opacity} />;

  // Ballpoint / default
  return <Path d={smoothPath(points)} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" opacity={opacity} />;
});

// ─── Main DrawingCanvas Component ────────────────────────────────────────────

export function DrawingCanvas({ width, height, pageBgColor, style }: DrawingCanvasProps) {
  const { colors, isDark } = useTheme();
  const {
    activeTool, penColor, penWidth, penOpacity,
    strokes, currentStroke,
    addStroke, updateCurrentStroke,
    isErasing, selectedTemplate,
  } = useDrawing();

  const bgColor = pageBgColor || (isDark ? '#1a1a2e' : '#ffffff');
  const tool_ = (isErasing ? 'eraser' : activeTool) as PenToolType;
  const color_ = isErasing ? bgColor : penColor;

  // ── Refs (avoid re-renders during live stroke) ─────────────────────────────
  const currentPtsRef = useRef<StrokePoint[]>([]);
  const strokeIdRef = useRef('');
  const lastTRef = useRef(0);
  const isDownRef = useRef(false);
  const rafRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const pendingRef = useRef(false);

  // For web: canvas overlay
  const liveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<View>(null);
  const isWeb = Platform.OS === 'web';

  const isShape = (t: string) =>
    t === 'line-shape' || t === 'circle-shape' || t === 'rect-shape' || t === 'arrow-shape';

  // ── Flush current stroke to canvas (web) ──────────────────────────────────
  const flushCanvas = useCallback(() => {
    pendingRef.current = false;
    const pts = currentPtsRef.current;
    if (!isDownRef.current || pts.length < 2) return;
    const canvas = liveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawStrokeOnCanvas(ctx, pts, tool_, color_, penWidth, penOpacity, bgColor);
  }, [tool_, color_, penWidth, penOpacity, bgColor]);

  const scheduleFlush = useCallback(() => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    rafRef.current = requestAnimationFrame(flushCanvas);
  }, [flushCanvas]);

  // ── Commit stroke when finger/pen lifts ───────────────────────────────────
  const commitStroke = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    pendingRef.current = false;

    const pts = currentPtsRef.current;
    if (pts.length > 0) {
      // Clear the live canvas overlay
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

  // ── Web: set up HTML5 Canvas overlay ─────────────────────────────────────
  useEffect(() => {
    if (!isWeb) return;

    // Get DOM element from the View ref
    // In React Native Web, refs on View give the underlying div element
    const viewNode = containerRef.current as any;
    if (!viewNode) return;

    // Try multiple ways to get the DOM element
    let dom: HTMLDivElement | null = null;
    if (viewNode.style !== undefined) {
      // Direct DOM element (React Native Web v0.19+)
      dom = viewNode as HTMLDivElement;
    } else if (typeof findNodeHandle === 'function') {
      // Fallback: find via React Node Handle
      const nativeTag = findNodeHandle(viewNode);
      if (nativeTag) {
        dom = document.querySelector(`[data-tag="${nativeTag}"]`) as HTMLDivElement;
      }
    }

    // Last resort: use querySelector with nativeID
    if (!dom) {
      dom = document.querySelector('[data-native-id="drawing-canvas-container"]') as HTMLDivElement
        || document.querySelector('[nativeid="drawing-canvas-container"]') as HTMLDivElement;
    }
    // Final fallback: search by aria/data attributes React Native Web may use
    if (!dom) {
      const all = document.querySelectorAll('div');
      for (const el of Array.from(all)) {
        if ((el as any).__reactFiber && (el as any).__reactFiber.memoizedProps?.nativeID === 'drawing-canvas-container') {
          dom = el as HTMLDivElement;
          break;
        }
      }
    }

    if (!dom) return;

    // Ensure relative positioning
    const prevPos = dom.style.position;
    dom.style.position = 'relative';
    dom.style.overflow = 'hidden';

    // Create the canvas overlay
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    Object.assign(canvas.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: `${width}px`,
      height: `${height}px`,
      touchAction: 'none',
      cursor: isErasing ? 'cell' : 'crosshair',
      zIndex: '20',
      borderRadius: 'inherit',
    });
    dom.appendChild(canvas);
    liveCanvasRef.current = canvas;

    const getPos = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const scaleX = width / r.width;
      const scaleY = height / r.height;
      return {
        x: (e.clientX - r.left) * scaleX,
        y: (e.clientY - r.top) * scaleY,
        pressure: e.pressure > 0 ? e.pressure : 0.5,
      };
    };

    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      canvas.setPointerCapture(e.pointerId);
      isDownRef.current = true;
      strokeIdRef.current = generateId();
      lastTRef.current = Date.now();
      const { x, y, pressure } = getPos(e);
      currentPtsRef.current = [{ x, y, pressure, timestamp: 0 }];
    };

    const onMove = (e: PointerEvent) => {
      if (!isDownRef.current) return;
      e.preventDefault();
      const { x, y, pressure } = getPos(e);
      const pts = currentPtsRef.current;
      const prev = pts[pts.length - 1];
      const minDist = isShape(tool_) ? 0 : 1.5;
      if (prev && Math.hypot(x - prev.x, y - prev.y) < minDist) return;

      const now = Date.now();
      const dt = now - lastTRef.current;
      lastTRef.current = now;
      const pt = { x, y, pressure, timestamp: dt };

      if (isShape(tool_)) {
        currentPtsRef.current = [pts[0], pt];
      } else {
        // Use mutation for performance (avoid spread)
        currentPtsRef.current = [...pts, pt];
      }
      scheduleFlush();
    };

    const onUp = (e: PointerEvent) => {
      if (!isDownRef.current) return;
      commitStroke();
    };

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
      if (dom && dom.contains(canvas)) dom.removeChild(canvas);
      dom!.style.position = prevPos;
      liveCanvasRef.current = null;
    };
  }, [width, height, isWeb, tool_, color_, penWidth, penOpacity, bgColor, isErasing, scheduleFlush, commitStroke]);

  // Update canvas size + cursor on changes
  useEffect(() => {
    if (liveCanvasRef.current) {
      liveCanvasRef.current.width = width;
      liveCanvasRef.current.height = height;
      liveCanvasRef.current.style.width = `${width}px`;
      liveCanvasRef.current.style.height = `${height}px`;
      liveCanvasRef.current.style.cursor = isErasing ? 'cell' : 'crosshair';
    }
  }, [width, height, isErasing]);

  // ── Native: PanResponder ──────────────────────────────────────────────────
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
        updateCurrentStroke({
          id: strokeIdRef.current, tool: tool_, color: color_,
          width: penWidth, opacity: penOpacity,
          points: [{ x, y, pressure, timestamp: 0 }], isComplete: false,
        });
      },
      onPanResponderMove: (evt: any) => {
        if (!isDownRef.current) return;
        const { locationX: x, locationY: y } = evt.nativeEvent;
        const pts = currentPtsRef.current;
        const prev = pts[pts.length - 1];
        if (prev && Math.hypot(x - prev.x, y - prev.y) < 2) return;
        const now = Date.now();
        const dt = now - lastTRef.current;
        lastTRef.current = now;
        const pressure = (evt.nativeEvent as any).force || 0.5;
        const pt = { x, y, pressure, timestamp: dt };
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

  const lineColor = isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.14)';
  const dotColor = isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.20)';

  // Eraser cursor position
  const eraserPt = isErasing && currentStroke?.points.length
    ? currentStroke.points[currentStroke.points.length - 1] : null;

  return (
    <View
      ref={containerRef}
      nativeID="drawing-canvas-container"
      style={[styles.canvas, { width, height, backgroundColor: bgColor }, style]}
      {...(panResponder ? panResponder.panHandlers : {})}
    >
      <Svg
        width={width}
        height={height}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Rect x={0} y={0} width={width} height={height} fill={bgColor} />

        {/* Template background */}
        <TemplateBackground
          template={selectedTemplate}
          width={width}
          height={height}
          lineColor={lineColor}
          dotColor={dotColor}
        />

        {/* Completed strokes */}
        {strokes.map(s => (
          <StrokeRenderer key={s.id} stroke={s} bgColor={bgColor} />
        ))}

        {/* Current stroke (native only — web uses canvas overlay) */}
        {!isWeb && currentStroke && currentStroke.points.length > 0 && (
          <StrokeRenderer stroke={currentStroke} bgColor={bgColor} />
        )}

        {/* Eraser cursor ring */}
        {eraserPt && !isWeb && (
          <G>
            <Circle cx={eraserPt.x} cy={eraserPt.y} r={penWidth * 1.3} fill={bgColor} opacity={0.6} />
            <Circle cx={eraserPt.x} cy={eraserPt.y} r={penWidth * 1.3} fill="none" stroke={lineColor} strokeWidth={1.5} opacity={0.9} strokeDasharray="3,2" />
          </G>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    overflow: 'hidden',
  },
});
