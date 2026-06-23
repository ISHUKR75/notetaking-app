import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
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

  const isErasing = activeTool === 'eraser';

  const addStroke = useCallback((stroke: Stroke) => {
    setStrokes(prev => {
      const next = activeTool === 'eraser'
        ? prev.filter(s => !strokesOverlap(s, stroke))
        : [...prev, stroke];
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(next);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      return next;
    });
  }, [activeTool, history, historyIndex]);

  const updateCurrentStroke = useCallback((stroke: Stroke | null) => {
    setCurrentStroke(stroke);
  }, []);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setStrokes(history[newIndex] || []);
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    setStrokes(history[newIndex] || []);
  }, [history, historyIndex]);

  const clearAll = useCallback(() => {
    const newHistory = [...history.slice(0, historyIndex + 1), []];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setStrokes([]);
  }, [history, historyIndex]);

  const loadStrokes = useCallback((loaded: Stroke[]) => {
    setStrokes(loaded);
    setHistory([loaded]);
    setHistoryIndex(0);
  }, []);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const value = useMemo(() => ({
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
    activeTool, penColor, penWidth, penOpacity, strokes, currentStroke,
    addStroke, updateCurrentStroke, undo, redo, clearAll, canUndo, canRedo,
    history, historyIndex, showColorPicker, showPenSettings, showToolbar,
    selectedTemplate, zoom, panOffset, isErasing, loadStrokes,
  ]);

  return <DrawingContext.Provider value={value}>{children}</DrawingContext.Provider>;
}

function strokesOverlap(existing: Stroke, eraser: Stroke): boolean {
  if (eraser.points.length === 0 || existing.points.length === 0) return false;
  const eRadius = eraser.width / 2;
  for (const ep of eraser.points) {
    for (const sp of existing.points) {
      const dx = ep.x - sp.x;
      const dy = ep.y - sp.y;
      if (Math.sqrt(dx * dx + dy * dy) < eRadius + existing.width / 2) return true;
    }
  }
  return false;
}

export function useDrawing() {
  const ctx = useContext(DrawingContext);
  if (!ctx) throw new Error('useDrawing must be used within DrawingProvider');
  return ctx;
}
