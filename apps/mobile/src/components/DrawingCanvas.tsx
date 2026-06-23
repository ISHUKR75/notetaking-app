import React, { useRef, useCallback, useState } from 'react';
import { View, StyleSheet, PanResponder, Platform } from 'react-native';
import Svg, { Path, Circle, Line, G } from 'react-native-svg';
import { useDrawing, Stroke, StrokePoint } from '../context/DrawingContext';
import { useTheme } from '../context/ThemeContext';
import { PEN_TOOLS } from '../constants/penTools';
import { generateId } from '../utils/noteUtils';

interface DrawingCanvasProps {
  width: number;
  height: number;
}

function getStrokePath(points: StrokePoint[], width: number): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x} ${p.y} L ${p.x + 0.1} ${p.y + 0.1}`;
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const mx = (prev.x + curr.x) / 2;
    const my = (prev.y + curr.y) / 2;
    d += ` Q ${prev.x} ${prev.y} ${mx} ${my}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

function getCalligraphyPath(points: StrokePoint[], width: number): string {
  if (points.length < 2) return getStrokePath(points, width);
  const paths: string[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const perpAngle = angle + Math.PI / 2;
    const h = width * Math.abs(Math.sin(angle)) + width * 0.3;
    const v = width * Math.abs(Math.cos(angle)) + width * 0.3;
    const dx = Math.cos(perpAngle) * (h / 2);
    const dy = Math.sin(perpAngle) * (v / 2);
    const x1a = p1.x + dx, y1a = p1.y + dy;
    const x1b = p1.x - dx, y1b = p1.y - dy;
    const x2a = p2.x + dx, y2a = p2.y + dy;
    const x2b = p2.x - dx, y2b = p2.y - dy;
    paths.push(`M ${x1a} ${y1a} L ${x2a} ${y2a} L ${x2b} ${y2b} L ${x1b} ${y1b} Z`);
  }
  return paths.join(' ');
}

function renderTemplateLines(template: string, width: number, height: number, lineColor: string) {
  const elements: React.ReactElement[] = [];
  if (template === 'lined') {
    const spacing = 32;
    for (let y = spacing; y < height; y += spacing) {
      elements.push(
        <Line key={y} x1={0} y1={y} x2={width} y2={y} stroke={lineColor} strokeWidth={0.8} opacity={0.6} />
      );
    }
  } else if (template === 'dotted') {
    const spacing = 24;
    for (let y = spacing; y < height; y += spacing) {
      for (let x = spacing; x < width; x += spacing) {
        elements.push(<Circle key={`${x}-${y}`} cx={x} cy={y} r={1.2} fill={lineColor} opacity={0.6} />);
      }
    }
  } else if (template === 'grid') {
    const spacing = 24;
    for (let y = spacing; y < height; y += spacing) {
      elements.push(<Line key={`h${y}`} x1={0} y1={y} x2={width} y2={y} stroke={lineColor} strokeWidth={0.6} opacity={0.5} />);
    }
    for (let x = spacing; x < width; x += spacing) {
      elements.push(<Line key={`v${x}`} x1={x} y1={0} x2={x} y2={height} stroke={lineColor} strokeWidth={0.6} opacity={0.5} />);
    }
  } else if (template === 'cornell') {
    const marginX = width * 0.28;
    const summaryY = height * 0.8;
    const spacing = 32;
    elements.push(<Line key="vline" x1={marginX} y1={0} x2={marginX} y2={summaryY} stroke={lineColor} strokeWidth={1} opacity={0.5} />);
    elements.push(<Line key="hline" x1={0} y1={summaryY} x2={width} y2={summaryY} stroke={lineColor} strokeWidth={1} opacity={0.5} />);
    for (let y = spacing; y < height; y += spacing) {
      elements.push(<Line key={`hl${y}`} x1={0} y1={y} x2={width} y2={y} stroke={lineColor} strokeWidth={0.5} opacity={0.3} />);
    }
  } else if (template === 'music') {
    const staffHeight = 8;
    const staffGap = 50;
    let y = 40;
    while (y + staffHeight * 4 < height) {
      for (let i = 0; i < 5; i++) {
        elements.push(<Line key={`s${y}${i}`} x1={20} y1={y + i * staffHeight} x2={width - 20} y2={y + i * staffHeight} stroke={lineColor} strokeWidth={0.8} opacity={0.7} />);
      }
      y += staffHeight * 4 + staffGap;
    }
  } else if (template === 'isometric') {
    const sp = 28;
    const h = sp * Math.sqrt(3) / 2;
    for (let row = 0; row * h < height + sp; row++) {
      for (let col = -1; col * sp < width + sp; col++) {
        const ox = col * sp + (row % 2 === 0 ? 0 : sp / 2);
        const oy = row * h;
        elements.push(<Line key={`il${row}${col}`} x1={ox} y1={oy} x2={ox + sp} y2={oy} stroke={lineColor} strokeWidth={0.6} opacity={0.4} />);
        elements.push(<Line key={`ir${row}${col}`} x1={ox} y1={oy} x2={ox + sp / 2} y2={oy + h} stroke={lineColor} strokeWidth={0.6} opacity={0.4} />);
        elements.push(<Line key={`il2${row}${col}`} x1={ox + sp} y1={oy} x2={ox + sp / 2} y2={oy + h} stroke={lineColor} strokeWidth={0.6} opacity={0.4} />);
      }
    }
  }
  return elements;
}

export function DrawingCanvas({ width, height }: DrawingCanvasProps) {
  const { colors, isDark } = useTheme();
  const {
    activeTool, penColor, penWidth, penOpacity,
    strokes, currentStroke,
    addStroke, updateCurrentStroke,
    isErasing, selectedTemplate,
  } = useDrawing();

  const currentPoints = useRef<StrokePoint[]>([]);
  const strokeId = useRef<string>('');
  const lastTimestamp = useRef<number>(0);

  const lineColor = isDark ? colors.canvasBgLine : colors.canvasBgLine;
  const tool = PEN_TOOLS.find(t => t.id === activeTool);

  const getEffectiveWidth = useCallback((points: StrokePoint[], idx: number) => {
    if (!tool?.pressureSensitive || points.length < 2) return penWidth;
    const p = points[idx];
    const velocity = idx > 0
      ? Math.hypot(p.x - points[idx - 1].x, p.y - points[idx - 1].y) / Math.max(1, p.timestamp - points[idx - 1].timestamp)
      : 1;
    const pressure = Math.max(0.2, 1 - velocity * 0.04);
    return penWidth * (0.4 + pressure * 0.6);
  }, [tool, penWidth]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        strokeId.current = generateId();
        const now = Date.now();
        lastTimestamp.current = now;
        const pt: StrokePoint = { x: locationX, y: locationY, pressure: 0.5, timestamp: 0 };
        currentPoints.current = [pt];
        const stroke: Stroke = {
          id: strokeId.current,
          tool: activeTool,
          color: isErasing ? 'eraser' : penColor,
          width: penWidth,
          opacity: penOpacity,
          points: [pt],
          isComplete: false,
        };
        updateCurrentStroke(stroke);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const now = Date.now();
        const dt = now - lastTimestamp.current;
        const prev = currentPoints.current[currentPoints.current.length - 1];
        if (prev && Math.hypot(locationX - prev.x, locationY - prev.y) < 2) return;
        const pt: StrokePoint = {
          x: locationX, y: locationY,
          pressure: 0.5,
          timestamp: dt,
        };
        lastTimestamp.current = now;
        currentPoints.current = [...currentPoints.current, pt];
        updateCurrentStroke({
          id: strokeId.current,
          tool: activeTool,
          color: isErasing ? 'eraser' : penColor,
          width: penWidth,
          opacity: penOpacity,
          points: [...currentPoints.current],
          isComplete: false,
        });
      },
      onPanResponderRelease: () => {
        const finalStroke: Stroke = {
          id: strokeId.current,
          tool: activeTool,
          color: isErasing ? 'eraser' : penColor,
          width: penWidth,
          opacity: penOpacity,
          points: [...currentPoints.current],
          isComplete: true,
        };
        addStroke(finalStroke);
        updateCurrentStroke(null);
        currentPoints.current = [];
      },
    })
  ).current;

  const renderStroke = useCallback((stroke: Stroke) => {
    if (!stroke.points.length) return null;
    const key = stroke.id;

    if (stroke.tool === 'eraser') {
      const d = getStrokePath(stroke.points, stroke.width);
      return (
        <Path
          key={key}
          d={d}
          stroke={colors.canvasBg}
          strokeWidth={stroke.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
    }

    if (stroke.tool === 'marker') {
      const d = getStrokePath(stroke.points, stroke.width);
      return (
        <Path
          key={key}
          d={d}
          stroke={stroke.color}
          strokeWidth={stroke.width}
          strokeLinecap="square"
          strokeLinejoin="round"
          fill="none"
          opacity={stroke.opacity * 0.5}
        />
      );
    }

    if (stroke.tool === 'calligraphy') {
      const d = getCalligraphyPath(stroke.points, stroke.width);
      return <Path key={key} d={d} fill={stroke.color} opacity={stroke.opacity} />;
    }

    if (stroke.tool === 'pencil') {
      const d = getStrokePath(stroke.points, stroke.width);
      return (
        <G key={key}>
          <Path d={d} stroke={stroke.color} strokeWidth={stroke.width * 1.2} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={stroke.opacity * 0.3} />
          <Path d={d} stroke={stroke.color} strokeWidth={stroke.width * 0.7} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={stroke.opacity * 0.7} />
        </G>
      );
    }

    if (stroke.tool === 'brush') {
      const d = getStrokePath(stroke.points, stroke.width);
      return (
        <G key={key}>
          <Path d={d} stroke={stroke.color} strokeWidth={stroke.width * 1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={stroke.opacity * 0.3} />
          <Path d={d} stroke={stroke.color} strokeWidth={stroke.width * 0.8} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={stroke.opacity * 0.8} />
        </G>
      );
    }

    if (stroke.tool === 'neon') {
      const d = getStrokePath(stroke.points, stroke.width);
      return (
        <G key={key}>
          <Path d={d} stroke={stroke.color} strokeWidth={stroke.width * 3} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.15} />
          <Path d={d} stroke={stroke.color} strokeWidth={stroke.width * 1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.4} />
          <Path d={d} stroke={stroke.color} strokeWidth={stroke.width * 0.6} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.9} />
        </G>
      );
    }

    if (stroke.tool === 'chalk') {
      const d = getStrokePath(stroke.points, stroke.width);
      return (
        <G key={key}>
          <Path d={d} stroke={stroke.color} strokeWidth={stroke.width * 1.1} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={stroke.opacity * 0.4} strokeDasharray="2,1" />
          <Path d={d} stroke={stroke.color} strokeWidth={stroke.width * 0.6} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={stroke.opacity * 0.8} />
        </G>
      );
    }

    if (stroke.tool === 'fountain') {
      if (stroke.points.length < 2) {
        const p = stroke.points[0];
        return <Circle key={key} cx={p.x} cy={p.y} r={stroke.width / 2} fill={stroke.color} opacity={stroke.opacity} />;
      }
      const paths: string[] = [];
      for (let i = 0; i < stroke.points.length - 1; i++) {
        const p1 = stroke.points[i];
        const p2 = stroke.points[i + 1];
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;
        paths.push(`M ${p1.x} ${p1.y} Q ${p1.x} ${p1.y} ${mx} ${my}`);
      }
      return (
        <Path
          key={key}
          d={paths.join(' ')}
          stroke={stroke.color}
          strokeWidth={stroke.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={stroke.opacity}
        />
      );
    }

    const d = getStrokePath(stroke.points, stroke.width);
    return (
      <Path
        key={key}
        d={d}
        stroke={stroke.color}
        strokeWidth={stroke.width}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={stroke.opacity}
      />
    );
  }, [colors, penColor, penWidth, penOpacity]);

  return (
    <View
      style={[styles.canvas, { width, height, backgroundColor: colors.canvasBg }]}
      {...panResponder.panHandlers}
    >
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        {renderTemplateLines(selectedTemplate, width, height, lineColor)}
        {strokes.map(s => renderStroke(s))}
        {currentStroke && renderStroke(currentStroke)}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { overflow: 'hidden' },
});
