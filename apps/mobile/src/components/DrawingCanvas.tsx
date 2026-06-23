import React, { useRef, useMemo } from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';
import Svg, { Path, Circle, Line, G, Rect } from 'react-native-svg';
import { useDrawing, Stroke, StrokePoint } from '../context/DrawingContext';
import { useTheme } from '../context/ThemeContext';
import { PEN_TOOLS, PenToolType } from '../constants/penTools';
import { generateId } from '../utils/noteUtils';

interface DrawingCanvasProps {
  width: number;
  height: number;
}

// ─── Path generators ──────────────────────────────────────────────────────────

function smoothPath(points: StrokePoint[]): string {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y} l 0.01 0.01`;
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const mx = ((prev.x + curr.x) / 2).toFixed(1);
    const my = ((prev.y + curr.y) / 2).toFixed(1);
    d += ` Q ${prev.x.toFixed(1)} ${prev.y.toFixed(1)} ${mx} ${my}`;
  }
  const last = points[points.length - 1];
  return d + ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
}

function variableWidthPath(points: StrokePoint[], baseW: number, tool: PenToolType): string {
  if (points.length < 2) {
    const p = points[0]; const r = baseW / 2;
    return `M ${p.x - r} ${p.y} A ${r} ${r} 0 1 0 ${p.x + r} ${p.y} A ${r} ${r} 0 1 0 ${p.x - r} ${p.y}`;
  }
  const n = points.length;
  const widths = points.map((p, idx) => {
    let w = baseW;
    if (idx > 0) {
      const prev = points[idx - 1];
      const dt = Math.max(1, p.timestamp - prev.timestamp);
      const speed = Math.hypot(p.x - prev.x, p.y - prev.y) / dt;
      if (tool === 'fountain' || tool === 'ink') {
        w = baseW * Math.max(0.3, 1.4 - speed * 0.05);
      } else if (tool === 'brush') {
        w = baseW * (0.5 + p.pressure * 0.5);
      }
    }
    if (tool === 'fountain' || tool === 'ink') {
      const sp = idx / Math.min(8, n * 0.2);
      const ep = (n - 1 - idx) / Math.min(8, n * 0.2);
      if (sp < 1) w *= (0.15 + sp * 0.85);
      if (ep < 1) w *= (0.15 + ep * 0.85);
    }
    return Math.max(0.4, w);
  });

  const left: { x: number; y: number }[] = [];
  const right: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const p = points[i]; const half = widths[i] / 2;
    let angle: number;
    if (i === 0) angle = Math.atan2(points[1].y - p.y, points[1].x - p.x);
    else if (i === n - 1) angle = Math.atan2(p.y - points[i-1].y, p.x - points[i-1].x);
    else angle = Math.atan2(points[i+1].y - points[i-1].y, points[i+1].x - points[i-1].x);
    const perp = angle + Math.PI / 2;
    left.push({ x: p.x + Math.cos(perp) * half, y: p.y + Math.sin(perp) * half });
    right.push({ x: p.x - Math.cos(perp) * half, y: p.y - Math.sin(perp) * half });
  }

  let d = `M ${left[0].x.toFixed(1)} ${left[0].y.toFixed(1)}`;
  for (let i = 1; i < left.length; i++) {
    const prev = left[i-1]; const curr = left[i];
    d += ` Q ${prev.x.toFixed(1)} ${prev.y.toFixed(1)} ${((prev.x+curr.x)/2).toFixed(1)} ${((prev.y+curr.y)/2).toFixed(1)}`;
  }
  d += ` L ${left[left.length-1].x.toFixed(1)} ${left[left.length-1].y.toFixed(1)}`;
  for (let i = right.length - 1; i >= 0; i--) {
    const curr = right[i];
    if (i === right.length - 1) d += ` L ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
    else {
      const next = right[i+1];
      d += ` Q ${next.x.toFixed(1)} ${next.y.toFixed(1)} ${((next.x+curr.x)/2).toFixed(1)} ${((next.y+curr.y)/2).toFixed(1)}`;
    }
  }
  return d + ' Z';
}

function calligraphyPath(points: StrokePoint[], width: number): string {
  if (points.length < 2) return '';
  return points.slice(0, -1).map((p1, i) => {
    const p2 = points[i + 1];
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const nib = angle + Math.PI / 4;
    const hw = (width * (0.4 + 0.6 * Math.abs(Math.sin(angle)))) / 2;
    const dx = Math.cos(nib) * hw; const dy = Math.sin(nib) * hw;
    return `M ${(p1.x+dx).toFixed(1)} ${(p1.y+dy).toFixed(1)} L ${(p2.x+dx).toFixed(1)} ${(p2.y+dy).toFixed(1)} L ${(p2.x-dx).toFixed(1)} ${(p2.y-dy).toFixed(1)} L ${(p1.x-dx).toFixed(1)} ${(p1.y-dy).toFixed(1)} Z`;
  }).join(' ');
}

function pixelPath(points: StrokePoint[], width: number): string {
  const size = Math.max(2, Math.round(width));
  const seen = new Set<string>();
  return points.reduce((acc, p) => {
    const px = Math.round(p.x / size) * size;
    const py = Math.round(p.y / size) * size;
    const key = `${px},${py}`;
    if (!seen.has(key)) { seen.add(key); acc += `M ${px} ${py} h ${size} v ${size} h ${-size} Z `; }
    return acc;
  }, '');
}

// ─── Template Background ──────────────────────────────────────────────────────

function TemplateBackground({ template, width, height, lineColor, dotColor }: {
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
          els.push(<Circle key={`${x}-${y}`} cx={x} cy={y} r={1.2} fill={dotColor} opacity={0.6} />);
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
            <Line key={`a${row}${col}`} x1={x} y1={y} x2={x+d} y2={y} stroke={lineColor} strokeWidth={0.5} opacity={0.38} />,
            <Line key={`b${row}${col}`} x1={x} y1={y} x2={x+d/2} y2={y+h} stroke={lineColor} strokeWidth={0.5} opacity={0.38} />,
            <Line key={`c${row}${col}`} x1={x+d} y1={y} x2={x+d/2} y2={y+h} stroke={lineColor} strokeWidth={0.5} opacity={0.38} />,
          );
        }
      break;
    }
    case 'hexagonal': {
      const size = 20; const hx = size * 2; const hy = Math.sqrt(3) * size;
      for (let row = -1; row < height / hy + 1; row++)
        for (let col = -1; col < width / (hx * 0.75) + 1; col++) {
          const cx = col * hx * 0.75; const cy = row * hy + (col % 2 === 0 ? 0 : hy / 2);
          const pts = Array.from({ length: 6 }).map((_, i) => {
            const a = (Math.PI / 180) * (60 * i - 30);
            return `${(cx + size * Math.cos(a)).toFixed(1)},${(cy + size * Math.sin(a)).toFixed(1)}`;
          }).join(' ');
          els.push(<Path key={`h${row}${col}`} d={`M ${pts} Z`} fill="none" stroke={lineColor} strokeWidth={0.5} opacity={0.38} />);
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
        for (let i = 0; i < 5; i++) els.push(<Line key={`s${y}${i}`} x1={20} y1={y+i*sH} x2={width-20} y2={y+i*sH} stroke={lineColor} strokeWidth={0.8} opacity={0.65} />);
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
}

// ─── Stroke renderer ──────────────────────────────────────────────────────────

function StrokeRenderer({ stroke }: { stroke: Stroke }) {
  const { tool, color, width, opacity, points } = stroke;
  if (!points.length) return null;

  if (tool === 'eraser') {
    return <Path d={smoothPath(points)} fill="none" stroke="white" strokeWidth={width * 2.5} strokeLinecap="round" strokeLinejoin="round" opacity={1} />;
  }
  if (tool === 'neon') {
    const d = smoothPath(points);
    return (
      <G>
        <Path d={d} fill="none" stroke={color} strokeWidth={width * 4} strokeLinecap="round" strokeLinejoin="round" opacity={0.12} />
        <Path d={d} fill="none" stroke={color} strokeWidth={width * 2.2} strokeLinecap="round" strokeLinejoin="round" opacity={0.22} />
        <Path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" opacity={opacity} />
        <Path d={d} fill="none" stroke="white" strokeWidth={width * 0.25} strokeLinecap="round" strokeLinejoin="round" opacity={0.65} />
      </G>
    );
  }
  if (tool === 'watercolor') {
    const d = smoothPath(points);
    return (
      <G>
        <Path d={d} fill="none" stroke={color} strokeWidth={width * 1.8} strokeLinecap="round" strokeLinejoin="round" opacity={opacity * 0.35} />
        <Path d={d} fill="none" stroke={color} strokeWidth={width * 1.1} strokeLinecap="round" strokeLinejoin="round" opacity={opacity * 0.55} />
        <Path d={d} fill="none" stroke={color} strokeWidth={width * 0.5} strokeLinecap="round" strokeLinejoin="round" opacity={opacity * 0.75} />
      </G>
    );
  }
  if (tool === 'airbrush') {
    const d = smoothPath(points);
    return (
      <G>
        <Path d={d} fill="none" stroke={color} strokeWidth={width * 2.5} strokeLinecap="round" strokeLinejoin="round" opacity={opacity * 0.15} />
        <Path d={d} fill="none" stroke={color} strokeWidth={width * 1.5} strokeLinecap="round" strokeLinejoin="round" opacity={opacity * 0.25} />
        <Path d={d} fill="none" stroke={color} strokeWidth={width * 0.7} strokeLinecap="round" strokeLinejoin="round" opacity={opacity * 0.5} />
      </G>
    );
  }
  if (tool === 'highlighter' || tool === 'marker') {
    return <Path d={smoothPath(points)} fill="none" stroke={color} strokeWidth={width} strokeLinecap={tool === 'highlighter' ? 'square' : 'round'} strokeLinejoin="round" opacity={opacity} />;
  }
  if (tool === 'chalk') {
    const d = smoothPath(points);
    return (
      <G opacity={opacity}>
        <Path d={d} fill="none" stroke={color} strokeWidth={width * 1.1} strokeLinecap="round" strokeLinejoin="round" opacity={0.35} strokeDasharray="3,2" />
        <Path d={d} fill="none" stroke={color} strokeWidth={width * 0.6} strokeLinecap="round" strokeLinejoin="round" opacity={0.75} />
        <Path d={d} fill="none" stroke="white" strokeWidth={width * 0.12} strokeLinecap="round" strokeLinejoin="round" opacity={0.3} />
      </G>
    );
  }
  if (tool === 'crayon') {
    const offsets = [-0.4, -0.15, 0.15, 0.4];
    return (
      <G opacity={opacity}>
        {offsets.map((off, i) => {
          const shifted = points.map(p => ({ ...p, x: p.x + off * width, y: p.y + off * 0.3 * width }));
          return <Path key={i} d={smoothPath(shifted)} fill="none" stroke={color} strokeWidth={width * 0.45} strokeLinecap="round" strokeLinejoin="round" opacity={0.55 + i * 0.08} />;
        })}
      </G>
    );
  }
  if (tool === 'pencil') {
    const d = smoothPath(points);
    return (
      <G opacity={opacity}>
        <Path d={d} fill="none" stroke={color} strokeWidth={width * 1.3} strokeLinecap="round" strokeLinejoin="round" opacity={0.28} strokeDasharray="4,1" />
        <Path d={d} fill="none" stroke={color} strokeWidth={width * 0.6} strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
      </G>
    );
  }
  if (tool === 'calligraphy') {
    return <Path d={calligraphyPath(points, width)} fill={color} opacity={opacity} />;
  }
  if (tool === 'pixel') {
    return <Path d={pixelPath(points, width)} fill={color} opacity={opacity} />;
  }
  if (tool === 'brush' || tool === 'fountain' || tool === 'ink') {
    return <Path d={variableWidthPath(points, width, tool)} fill={color} opacity={opacity} />;
  }
  return <Path d={smoothPath(points)} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" opacity={opacity} />;
}

// ─── Main Canvas ──────────────────────────────────────────────────────────────

export function DrawingCanvas({ width, height }: DrawingCanvasProps) {
  const { colors, isDark } = useTheme();
  const {
    activeTool, penColor, penWidth, penOpacity,
    strokes, currentStroke,
    addStroke, updateCurrentStroke,
    isErasing, selectedTemplate,
  } = useDrawing();

  const currentPointsRef = useRef<StrokePoint[]>([]);
  const strokeIdRef = useRef<string>('');
  const lastTsRef = useRef<number>(0);
  const isDownRef = useRef(false);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      isDownRef.current = true;
      strokeIdRef.current = generateId();
      lastTsRef.current = Date.now();
      const { locationX: x, locationY: y } = evt.nativeEvent;
      const force = (evt.nativeEvent as any).force || 0.5;
      const pt: StrokePoint = { x, y, pressure: force, timestamp: 0 };
      currentPointsRef.current = [pt];
      updateCurrentStroke({
        id: strokeIdRef.current,
        tool: isErasing ? 'eraser' : activeTool,
        color: isErasing ? 'eraser' : penColor,
        width: penWidth,
        opacity: penOpacity,
        points: [pt],
        isComplete: false,
      });
    },
    onPanResponderMove: (evt) => {
      if (!isDownRef.current) return;
      const { locationX: x, locationY: y } = evt.nativeEvent;
      const prev = currentPointsRef.current[currentPointsRef.current.length - 1];
      if (prev && Math.hypot(x - prev.x, y - prev.y) < 1.5) return;
      const now = Date.now();
      const dt = now - lastTsRef.current;
      lastTsRef.current = now;
      const force = (evt.nativeEvent as any).force || 0.5;
      const pt: StrokePoint = { x, y, pressure: force, timestamp: dt };
      currentPointsRef.current = [...currentPointsRef.current, pt];
      updateCurrentStroke({
        id: strokeIdRef.current,
        tool: isErasing ? 'eraser' : activeTool,
        color: isErasing ? 'eraser' : penColor,
        width: penWidth,
        opacity: penOpacity,
        points: currentPointsRef.current,
        isComplete: false,
      });
    },
    onPanResponderRelease: () => {
      if (!isDownRef.current) return;
      isDownRef.current = false;
      if (currentPointsRef.current.length > 0) {
        addStroke({
          id: strokeIdRef.current,
          tool: isErasing ? 'eraser' : activeTool,
          color: isErasing ? 'eraser' : penColor,
          width: penWidth,
          opacity: penOpacity,
          points: currentPointsRef.current,
          isComplete: true,
        });
      }
      updateCurrentStroke(null);
      currentPointsRef.current = [];
    },
    onPanResponderTerminate: () => {
      isDownRef.current = false;
      if (currentPointsRef.current.length > 0) {
        addStroke({
          id: strokeIdRef.current,
          tool: isErasing ? 'eraser' : activeTool,
          color: isErasing ? 'eraser' : penColor,
          width: penWidth,
          opacity: penOpacity,
          points: currentPointsRef.current,
          isComplete: true,
        });
      }
      updateCurrentStroke(null);
      currentPointsRef.current = [];
    },
  }), [activeTool, penColor, penWidth, penOpacity, isErasing, addStroke, updateCurrentStroke]);

  const lineColor = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.16)';
  const dotColor = isDark ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.22)';
  const canvasBg = colors.canvasBg;

  const lastEraserPt = isErasing && currentStroke?.points.length
    ? currentStroke.points[currentStroke.points.length - 1] : null;

  return (
    <View style={[styles.canvas, { width, height, backgroundColor: canvasBg }]} {...panResponder.panHandlers}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={width} height={height} fill={canvasBg} />
        <TemplateBackground template={selectedTemplate} width={width} height={height} lineColor={lineColor} dotColor={dotColor} />
        {strokes.map(s => <StrokeRenderer key={s.id} stroke={s} />)}
        {currentStroke && currentStroke.points.length > 0 && <StrokeRenderer stroke={currentStroke} />}
        {lastEraserPt && (
          <Circle cx={lastEraserPt.x} cy={lastEraserPt.y} r={penWidth * 1.5} fill="none" stroke={lineColor} strokeWidth={1.5} opacity={0.8} />
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { overflow: 'hidden' },
});
