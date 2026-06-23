export type PenToolType =
  | 'ballpoint' | 'fountain' | 'brush' | 'pencil' | 'marker'
  | 'chalk' | 'neon' | 'calligraphy' | 'ink' | 'watercolor'
  | 'crayon' | 'airbrush' | 'highlighter' | 'eraser' | 'pixel'
  | 'line-shape' | 'circle-shape' | 'rect-shape' | 'arrow-shape';

export interface PenTool {
  id: PenToolType;
  name: string;
  icon: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  defaultOpacity: number;
  pressureSensitive: boolean;
  textureEffect: boolean;
  description: string;
  thinAtStart: boolean;
  thinAtEnd: boolean;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay';
  emoji: string;
  category: 'pen' | 'brush' | 'effect' | 'erase';
}

export const PEN_TOOLS: PenTool[] = [
  {
    id: 'ballpoint', name: 'Ballpoint', icon: 'pen', emoji: '🖊️',
    defaultWidth: 2, minWidth: 0.5, maxWidth: 20, defaultOpacity: 1.0,
    pressureSensitive: false, textureEffect: false,
    description: 'Smooth consistent width', thinAtStart: false, thinAtEnd: false,
    blendMode: 'normal', category: 'pen',
  },
  {
    id: 'fountain', name: 'Fountain Pen', icon: 'fountain-pen-tip', emoji: '✒️',
    defaultWidth: 3, minWidth: 1, maxWidth: 30, defaultOpacity: 0.95,
    pressureSensitive: true, textureEffect: false,
    description: 'Variable width, speed-sensitive', thinAtStart: true, thinAtEnd: true,
    blendMode: 'normal', category: 'pen',
  },
  {
    id: 'pencil', name: 'Pencil', icon: 'pencil', emoji: '✏️',
    defaultWidth: 2.5, minWidth: 0.5, maxWidth: 15, defaultOpacity: 0.75,
    pressureSensitive: true, textureEffect: true,
    description: 'Graphite texture, realistic feel', thinAtStart: false, thinAtEnd: false,
    blendMode: 'multiply', category: 'pen',
  },
  {
    id: 'calligraphy', name: 'Calligraphy', icon: 'script-text', emoji: '🖋️',
    defaultWidth: 5, minWidth: 2, maxWidth: 25, defaultOpacity: 1.0,
    pressureSensitive: false, textureEffect: false,
    description: 'Flat nib with angle variation', thinAtStart: false, thinAtEnd: false,
    blendMode: 'normal', category: 'pen',
  },
  {
    id: 'ink', name: 'Ink Pen', icon: 'pen-plus', emoji: '🖊️',
    defaultWidth: 1.5, minWidth: 0.5, maxWidth: 10, defaultOpacity: 1.0,
    pressureSensitive: true, textureEffect: false,
    description: 'Sharp ink pen with tapers', thinAtStart: true, thinAtEnd: true,
    blendMode: 'normal', category: 'pen',
  },
  {
    id: 'brush', name: 'Brush', icon: 'brush', emoji: '🎨',
    defaultWidth: 8, minWidth: 2, maxWidth: 60, defaultOpacity: 0.8,
    pressureSensitive: true, textureEffect: true,
    description: 'Soft paint brush with flow', thinAtStart: true, thinAtEnd: true,
    blendMode: 'normal', category: 'brush',
  },
  {
    id: 'watercolor', name: 'Watercolor', icon: 'water', emoji: '🎨',
    defaultWidth: 14, minWidth: 4, maxWidth: 50, defaultOpacity: 0.4,
    pressureSensitive: true, textureEffect: true,
    description: 'Soft watercolor wash effect', thinAtStart: false, thinAtEnd: false,
    blendMode: 'multiply', category: 'brush',
  },
  {
    id: 'airbrush', name: 'Airbrush', icon: 'spray', emoji: '💨',
    defaultWidth: 18, minWidth: 5, maxWidth: 80, defaultOpacity: 0.3,
    pressureSensitive: true, textureEffect: true,
    description: 'Soft spray airbrush', thinAtStart: false, thinAtEnd: false,
    blendMode: 'normal', category: 'brush',
  },
  {
    id: 'marker', name: 'Marker', icon: 'marker', emoji: '🖊️',
    defaultWidth: 16, minWidth: 5, maxWidth: 40, defaultOpacity: 0.45,
    pressureSensitive: false, textureEffect: false,
    description: 'Bold semi-transparent marker', thinAtStart: false, thinAtEnd: false,
    blendMode: 'multiply', category: 'brush',
  },
  {
    id: 'highlighter', name: 'Highlighter', icon: 'format-color-highlight', emoji: '🖊️',
    defaultWidth: 20, minWidth: 8, maxWidth: 50, defaultOpacity: 0.3,
    pressureSensitive: false, textureEffect: false,
    description: 'Wide flat highlight band', thinAtStart: false, thinAtEnd: false,
    blendMode: 'multiply', category: 'brush',
  },
  {
    id: 'chalk', name: 'Chalk', icon: 'lead-pencil', emoji: '🔲',
    defaultWidth: 10, minWidth: 3, maxWidth: 30, defaultOpacity: 0.85,
    pressureSensitive: false, textureEffect: true,
    description: 'Chalk board texture effect', thinAtStart: false, thinAtEnd: false,
    blendMode: 'normal', category: 'effect',
  },
  {
    id: 'crayon', name: 'Crayon', icon: 'pencil-outline', emoji: '🖍️',
    defaultWidth: 6, minWidth: 2, maxWidth: 20, defaultOpacity: 0.9,
    pressureSensitive: false, textureEffect: true,
    description: 'Waxy crayon texture', thinAtStart: false, thinAtEnd: false,
    blendMode: 'normal', category: 'effect',
  },
  {
    id: 'neon', name: 'Neon Glow', icon: 'lightning-bolt', emoji: '✨',
    defaultWidth: 4, minWidth: 2, maxWidth: 20, defaultOpacity: 0.9,
    pressureSensitive: false, textureEffect: false,
    description: 'Vivid glowing neon stroke', thinAtStart: false, thinAtEnd: false,
    blendMode: 'screen', category: 'effect',
  },
  {
    id: 'pixel', name: 'Pixel', icon: 'grid', emoji: '🔲',
    defaultWidth: 4, minWidth: 1, maxWidth: 16, defaultOpacity: 1.0,
    pressureSensitive: false, textureEffect: false,
    description: 'Square pixel art brush', thinAtStart: false, thinAtEnd: false,
    blendMode: 'normal', category: 'effect',
  },
  {
    id: 'eraser', name: 'Eraser', icon: 'eraser', emoji: '⬜',
    defaultWidth: 20, minWidth: 5, maxWidth: 100, defaultOpacity: 1.0,
    pressureSensitive: false, textureEffect: false,
    description: 'Remove strokes', thinAtStart: false, thinAtEnd: false,
    blendMode: 'normal', category: 'erase',
  },
];

export const DRAWING_TOOLS = PEN_TOOLS.filter(t => t.id !== 'eraser');
export const ERASER_TOOL = PEN_TOOLS.find(t => t.id === 'eraser')!;
export const PEN_CATEGORY_LABELS: Record<string, string> = {
  pen: 'Pens', brush: 'Brushes', effect: 'Effects', erase: 'Eraser',
};

export const DEFAULT_PEN_COLORS = [
  '#111827', '#1e40af', '#0f766e', '#15803d', '#b45309', '#9a3412',
  '#7c3aed', '#be185d', '#6b7280', '#ffffff', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#92400e', '#000000',
];

export const NEON_COLORS = [
  '#ff00ff', '#00ffff', '#ff0088', '#00ff88',
  '#ffff00', '#ff6600', '#0066ff', '#39ff14',
  '#ff3131', '#9b59b6', '#00c9ff', '#f7ff00',
];

export const EXTENDED_COLORS = [
  '#ffffff', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b',
  '#475569', '#334155', '#1e293b', '#0f172a', '#000000', '#fca5a5',
  '#fdba74', '#fde047', '#86efac', '#5eead4', '#93c5fd', '#c4b5fd',
  '#f9a8d4', '#d6b896', '#fcd34d', '#a7f3d0', '#a5b4fc', '#fbcfe8',
  '#fef08a', '#bfdbfe', '#ddd6fe', '#fce7f3', '#ecfccb', '#d1fae5',
];

// Shape tools are appended after the drawing tools
PEN_TOOLS.push(
  {
    id: 'line-shape', name: 'Line', icon: 'minus', emoji: '📏',
    defaultWidth: 2, minWidth: 0.5, maxWidth: 20, defaultOpacity: 1.0,
    pressureSensitive: false, textureEffect: false,
    description: 'Straight line', thinAtStart: false, thinAtEnd: false,
    blendMode: 'normal', category: 'pen',
  },
  {
    id: 'circle-shape', name: 'Circle', icon: 'circle-outline', emoji: '⭕',
    defaultWidth: 2, minWidth: 0.5, maxWidth: 20, defaultOpacity: 1.0,
    pressureSensitive: false, textureEffect: false,
    description: 'Circle / ellipse', thinAtStart: false, thinAtEnd: false,
    blendMode: 'normal', category: 'pen',
  },
  {
    id: 'rect-shape', name: 'Rectangle', icon: 'rectangle-outline', emoji: '🔲',
    defaultWidth: 2, minWidth: 0.5, maxWidth: 20, defaultOpacity: 1.0,
    pressureSensitive: false, textureEffect: false,
    description: 'Rectangle / square', thinAtStart: false, thinAtEnd: false,
    blendMode: 'normal', category: 'pen',
  },
  {
    id: 'arrow-shape', name: 'Arrow', icon: 'arrow-right-thin', emoji: '➡️',
    defaultWidth: 2, minWidth: 0.5, maxWidth: 20, defaultOpacity: 1.0,
    pressureSensitive: false, textureEffect: false,
    description: 'Arrow with head', thinAtStart: false, thinAtEnd: false,
    blendMode: 'normal', category: 'pen',
  },
);

export const COLOR_PALETTES = [
  { id: 'standard', name: 'Standard', colors: DEFAULT_PEN_COLORS },
  { id: 'neon', name: 'Neon', colors: NEON_COLORS },
  { id: 'extended', name: 'Extended', colors: EXTENDED_COLORS },
] as const;

export type ColorPaletteId = 'standard' | 'neon' | 'extended';
