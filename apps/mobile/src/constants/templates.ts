export type TemplateType =
  | 'blank'
  | 'lined'
  | 'dotted'
  | 'grid'
  | 'cornell'
  | 'isometric'
  | 'music'
  | 'daily-planner'
  | 'weekly-planner'
  | 'storyboard';

export interface Template {
  id: TemplateType;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
}

export const TEMPLATES: Template[] = [
  {
    id: 'blank',
    name: 'Blank',
    description: 'Clean empty canvas',
    category: 'Basic',
    icon: 'file-outline',
    color: '#6366f1',
  },
  {
    id: 'lined',
    name: 'Lined',
    description: 'Horizontal ruled lines',
    category: 'Writing',
    icon: 'format-align-left',
    color: '#3b82f6',
  },
  {
    id: 'dotted',
    name: 'Dot Grid',
    description: 'Evenly spaced dots',
    category: 'Planning',
    icon: 'dots-grid',
    color: '#8b5cf6',
  },
  {
    id: 'grid',
    name: 'Grid',
    description: 'Square graph paper',
    category: 'Math',
    icon: 'grid',
    color: '#10b981',
  },
  {
    id: 'cornell',
    name: 'Cornell',
    description: '3-zone Cornell notes layout',
    category: 'Learning',
    icon: 'card-text-outline',
    color: '#f59e0b',
  },
  {
    id: 'isometric',
    name: 'Isometric',
    description: 'Triangle grid for 3D drawing',
    category: 'Art',
    icon: 'triangle-outline',
    color: '#ec4899',
  },
  {
    id: 'music',
    name: 'Music Staff',
    description: '5-line music staves',
    category: 'Music',
    icon: 'music-note',
    color: '#06b6d4',
  },
  {
    id: 'daily-planner',
    name: 'Daily Planner',
    description: 'Hour-by-hour day schedule',
    category: 'Planning',
    icon: 'calendar-today',
    color: '#ef4444',
  },
  {
    id: 'weekly-planner',
    name: 'Weekly Planner',
    description: '7-day week overview',
    category: 'Planning',
    icon: 'calendar-week',
    color: '#f97316',
  },
  {
    id: 'storyboard',
    name: 'Storyboard',
    description: '6-panel storyboard layout',
    category: 'Art',
    icon: 'film',
    color: '#14b8a6',
  },
];

export type PageSize = 'a4' | 'a5' | 'letter' | 'square';

export interface PageSizeConfig {
  id: PageSize;
  name: string;
  width: number;
  height: number;
}

export const PAGE_SIZES: PageSizeConfig[] = [
  { id: 'a4', name: 'A4', width: 794, height: 1123 },
  { id: 'a5', name: 'A5', width: 559, height: 794 },
  { id: 'letter', name: 'Letter', width: 816, height: 1056 },
  { id: 'square', name: 'Square', width: 794, height: 794 },
];
