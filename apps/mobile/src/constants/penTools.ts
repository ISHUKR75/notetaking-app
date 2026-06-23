export type PenToolType =
  | 'ballpoint'
  | 'fountain'
  | 'brush'
  | 'pencil'
  | 'marker'
  | 'chalk'
  | 'neon'
  | 'calligraphy'
  | 'eraser';

export interface PenTool {
  id: PenToolType;
  name: string;
  icon: string;
  iconFamily: 'MaterialCommunityIcons' | 'Ionicons' | 'FontAwesome5' | 'Feather';
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  defaultOpacity: number;
  pressureSensitive: boolean;
  textureEffect: boolean;
  description: string;
  thinAtStart: boolean;
  thinAtEnd: boolean;
}

export const PEN_TOOLS: PenTool[] = [
  {
    id: 'ballpoint',
    name: 'Ballpoint',
    icon: 'pen',
    iconFamily: 'MaterialCommunityIcons',
    defaultWidth: 2,
    minWidth: 0.5,
    maxWidth: 20,
    defaultOpacity: 1.0,
    pressureSensitive: false,
    textureEffect: false,
    description: 'Consistent line width',
    thinAtStart: false,
    thinAtEnd: false,
  },
  {
    id: 'fountain',
    name: 'Fountain',
    icon: 'fountain-pen-tip',
    iconFamily: 'MaterialCommunityIcons',
    defaultWidth: 3,
    minWidth: 1,
    maxWidth: 30,
    defaultOpacity: 0.95,
    pressureSensitive: true,
    textureEffect: false,
    description: 'Variable width, speed-sensitive',
    thinAtStart: true,
    thinAtEnd: true,
  },
  {
    id: 'brush',
    name: 'Brush',
    icon: 'brush',
    iconFamily: 'MaterialCommunityIcons',
    defaultWidth: 8,
    minWidth: 2,
    maxWidth: 60,
    defaultOpacity: 0.8,
    pressureSensitive: true,
    textureEffect: true,
    description: 'Soft paint brush effect',
    thinAtStart: true,
    thinAtEnd: true,
  },
  {
    id: 'pencil',
    name: 'Pencil',
    icon: 'pencil',
    iconFamily: 'MaterialCommunityIcons',
    defaultWidth: 2,
    minWidth: 0.5,
    maxWidth: 15,
    defaultOpacity: 0.7,
    pressureSensitive: true,
    textureEffect: true,
    description: 'Graphite texture effect',
    thinAtStart: false,
    thinAtEnd: false,
  },
  {
    id: 'marker',
    name: 'Marker',
    icon: 'marker',
    iconFamily: 'MaterialCommunityIcons',
    defaultWidth: 16,
    minWidth: 5,
    maxWidth: 40,
    defaultOpacity: 0.4,
    pressureSensitive: false,
    textureEffect: false,
    description: 'Semi-transparent highlighter',
    thinAtStart: false,
    thinAtEnd: false,
  },
  {
    id: 'chalk',
    name: 'Chalk',
    icon: 'lead-pencil',
    iconFamily: 'MaterialCommunityIcons',
    defaultWidth: 10,
    minWidth: 3,
    maxWidth: 30,
    defaultOpacity: 0.85,
    pressureSensitive: false,
    textureEffect: true,
    description: 'Chalk on blackboard effect',
    thinAtStart: false,
    thinAtEnd: false,
  },
  {
    id: 'neon',
    name: 'Neon',
    icon: 'lightning-bolt',
    iconFamily: 'MaterialCommunityIcons',
    defaultWidth: 4,
    minWidth: 2,
    maxWidth: 20,
    defaultOpacity: 0.9,
    pressureSensitive: false,
    textureEffect: false,
    description: 'Glowing neon effect',
    thinAtStart: false,
    thinAtEnd: false,
  },
  {
    id: 'calligraphy',
    name: 'Calligraphy',
    icon: 'script-text',
    iconFamily: 'MaterialCommunityIcons',
    defaultWidth: 5,
    minWidth: 2,
    maxWidth: 25,
    defaultOpacity: 1.0,
    pressureSensitive: false,
    textureEffect: false,
    description: 'Flat nib calligraphy pen',
    thinAtStart: false,
    thinAtEnd: false,
  },
  {
    id: 'eraser',
    name: 'Eraser',
    icon: 'eraser',
    iconFamily: 'MaterialCommunityIcons',
    defaultWidth: 20,
    minWidth: 5,
    maxWidth: 100,
    defaultOpacity: 1.0,
    pressureSensitive: false,
    textureEffect: false,
    description: 'Erase strokes',
    thinAtStart: false,
    thinAtEnd: false,
  },
];

export const DEFAULT_PEN_COLORS = [
  '#111827', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6',
  '#ec4899', '#ffffff', '#6b7280', '#92400e',
  '#1e40af', '#047857', '#7c3aed', '#be185d',
];

export const NEON_COLORS = [
  '#ff00ff', '#00ffff', '#ff0088', '#00ff88',
  '#ffff00', '#ff6600', '#0066ff', '#00ff00',
];
