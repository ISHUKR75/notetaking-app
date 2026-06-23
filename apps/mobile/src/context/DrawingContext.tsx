/**
 * DrawingContext — State management for the handwriting canvas
 *
 * Key design decisions:
 * - Strokes stored as structured data (not pixels) for infinite zoom & lossless export
 * - History capped at 200 steps to prevent memory bloat
 * - Eraser uses spatial proximity check (not pixel-perfect) for performance
 * - loadStrokes() resets history (called when switching notes)
 */

import React, { createContext, useContext, useState, useCallback, useMemo, useRef, ReactNode } from 'react';
import { PenToolType, DEFAULT_PEN_COLORS } from '../constants/penTools';

export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
}

export interface Stroke {
  id: string;
  tool: PenToolType;
  color: string;
  width: number;
  opacity: number;
  points: StrokePoint[];
  isComplete: boolean;
}

interface DrawingContextValue {
  activeTool: PenToolType;
  setActiveTool: (tool: PenToolType) => void;
  penColor: string;
  setPenColor: (color: string) => void;
  penWidth: number;
  setPenWidth: (width: number) => void;
  penOpacity: number;
  setPenOpacity: (opacity: number) => void;
  strokes: Stroke[];
  currentStroke: Stroke | null;
  addStroke: (stroke: Stroke) => void;
  updateCurrentStroke: (stroke: Stroke | null) => void;
  undo: () => void;
  redo: () => void;
  clearAll: () => void;
  canUndo: boolean;
  canRedo: boolean;
  history: Stroke[][];
  historyIndex: number;
  showColorPicker: boolean;
  setShowColorPicker: (show: boolean) => void;
  showPenSettings: boolean;
  setShowPenSettings: (show: boolean) => void;
  showToolbar: boolean;
  setShowToolbar: (show: boolean) => void;
  selectedTemplate: string;
  setSelectedTemplate: (t: string) => void;
  zoom: number;
  setZoom: (z: number) => void;
  panOffset: { x: number; y: number };
  setPanOffset: (offset: { x: number; y: number }) => void;
  isErasing: boolean;
  loadStrokes: (strokes: Stroke[]) => void;
}

const MAX_HISTORY = 200;

const DrawingContext = createContext<DrawingContextValue | null>(null);

export function DrawingProvider({ children }: { children: ReactNode }) {
  const [activeTool, setActiveTool] = useState<PenToolType>('ballpoint');
  const [penColor, setPenColor] = useState(DEFAULT_PEN_COLORS[0]);
  const [penWidth, setPenWidth] = useState(3);
  const [penOpacity, setPenOpacity] = useState(1.0);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [history, setHistory] = useState<Stroke[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showPenSettings, setShowPenSettings] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState('blank');
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // Use refs to avoid stale closures in callbacks
  const activeToolRef = useRef(activeTool);
  const historyRef = useRef(history);
  const historyIndexRef = useRef(historyIndex);

  activeToolRef.current = activeTool;
  historyRef.current = history;
  historyIndexRef.current = historyIndex;

  const isErasing = activeTool === 'eraser';

  const addStroke = useCallback((stroke: Stroke) => {
    setStrokes(prev => {
      let next: Stroke[];
      if (activeToolRef.current === 'eraser') {
        // Remove strokes that overlap with the eraser path
        next = prev.filter(s => !strokesOverlap(s, stroke));
      } else {
        next = [...prev, stroke];
      }

      // Update history with cap
      const currentHistory = historyRef.current;
      const currentIndex = historyIndexRef.current;
      const trimmed = currentHistory.slice(0, currentIndex + 1);
      const newHistory = [...trimmed, next].slice(-MAX_HISTORY);
      const newIndex = newHistory.length - 1;

      // Batch these updates
      setHistory(newHistory);
      setHistoryIndex(newIndex);
      historyRef.current = newHistory;
      historyIndexRef.current = newIndex;

      return next;
    });
  }, []);

  const updateCurrentStroke = useCallback((stroke: Stroke | null) => {
    setCurrentStroke(stroke);
  }, []);

  const undo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx <= 0) return;
    const newIndex = idx - 1;
    setHistoryIndex(newIndex);
    historyIndexRef.current = newIndex;
    setStrokes(historyRef.current[newIndex] || []);
  }, []);

  const redo = useCallback(() => {
    const idx = historyIndexRef.current;
    const hist = historyRef.current;
    if (idx >= hist.length - 1) return;
    const newIndex = idx + 1;
    setHistoryIndex(newIndex);
    historyIndexRef.current = newIndex;
    setStrokes(hist[newIndex] || []);
  }, []);

  const clearAll = useCallback(() => {
    const newHistory = [...historyRef.current.slice(0, historyIndexRef.current + 1), []];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
    setStrokes([]);
  }, []);

  const loadStrokes = useCallback((loaded: Stroke[]) => {
    setStrokes(loaded);
    setHistory([loaded]);
    setHistoryIndex(0);
    historyRef.current = [loaded];
    historyIndexRef.current = 0;
  }, []);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const value = useMemo<DrawingContextValue>(() => ({
    activeTool, setActiveTool,
    penColor, setPenColor,
    penWidth, setPenWidth,
    penOpacity, setPenOpacity,
    strokes, currentStroke,
    addStroke, updateCurrentStroke,
    undo, redo, clearAll,
    canUndo, canRedo,
    history, historyIndex,
    showColorPicker, setShowColorPicker,
    showPenSettings, setShowPenSettings,
    showToolbar, setShowToolbar,
    selectedTemplate, setSelectedTemplate,
    zoom, setZoom,
    panOffset, setPanOffset,
    isErasing,
    loadStrokes,
  }), [
    activeTool, penColor, penWidth, penOpacity,
    strokes, currentStroke,
    addStroke, updateCurrentStroke,
    undo, redo, clearAll, canUndo, canRedo,
    history, historyIndex,
    showColorPicker, showPenSettings, showToolbar,
    selectedTemplate, zoom, panOffset, isErasing, loadStrokes,
  ]);

  return <DrawingContext.Provider value={value}>{children}</DrawingContext.Provider>;
}

// ─── Eraser: spatial proximity check ─────────────────────────────────────────

function strokesOverlap(existing: Stroke, eraser: Stroke): boolean {
  if (!eraser.points.length || !existing.points.length) return false;
  const eRadius = Math.max(eraser.width * 1.5, 8);
  const exRadius = Math.max(existing.width, 2);
  const threshold = eRadius + exRadius;

  for (const ep of eraser.points) {
    for (const sp of existing.points) {
      const dx = ep.x - sp.x;
      const dy = ep.y - sp.y;
      if (dx * dx + dy * dy < threshold * threshold) return true;
    }
  }
  return false;
}

export function useDrawing() {
  const ctx = useContext(DrawingContext);
  if (!ctx) throw new Error('useDrawing must be used within DrawingProvider');
  return ctx;
}
