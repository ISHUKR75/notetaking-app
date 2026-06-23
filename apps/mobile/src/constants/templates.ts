export type TemplateType =
  | 'blank' | 'lined' | 'dotted' | 'grid' | 'cornell'
  | 'isometric' | 'music' | 'daily-planner' | 'weekly-planner'
  | 'storyboard' | 'bullet-journal' | 'math' | 'calendar'
  | 'habit-tracker' | 'kanban' | 'mind-map' | 'timeline'
  | 'hexagonal' | 'narrow-ruled' | 'sketch' | 'recipe'
  | 'budget' | 'fitness' | 'reading-log' | 'travel'
  | 'mood-tracker' | 'project-plan' | 'meeting-notes' | 'swot';

export interface Template {
  id: TemplateType;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  isPremium?: boolean;
}

export const TEMPLATE_CATEGORIES = [
  'Basic', 'Writing', 'Planning', 'Math', 'Learning',
  'Art', 'Music', 'Business', 'Health', 'All',
] as const;

export const TEMPLATES: Template[] = [
  { id:'blank',          name:'Blank',          description:'Pure empty canvas',             category:'Basic',    icon:'file-outline',            color:'#6366f1' },
  { id:'lined',          name:'Wide Ruled',     description:'8mm ruled lines for writing',   category:'Writing',  icon:'format-align-left',       color:'#3b82f6' },
  { id:'narrow-ruled',   name:'Narrow Ruled',   description:'5mm ruling for compact notes',  category:'Writing',  icon:'format-line-spacing',     color:'#0ea5e9' },
  { id:'dotted',         name:'Dot Grid',       description:'5mm dot grid layout',           category:'Planning', icon:'dots-grid',               color:'#8b5cf6' },
  { id:'grid',           name:'Graph Paper',    description:'5mm square grid paper',         category:'Math',     icon:'grid',                    color:'#10b981' },
  { id:'math',           name:'Math Grid',      description:'Fine 2mm grid for equations',   category:'Math',     icon:'function-variant',        color:'#059669' },
  { id:'isometric',      name:'Isometric',      description:'Triangle grid for 3D drawing',  category:'Art',      icon:'triangle-outline',        color:'#ec4899' },
  { id:'hexagonal',      name:'Hexagonal',      description:'Honeycomb hex grid pattern',    category:'Art',      icon:'hexagon-outline',         color:'#d946ef' },
  { id:'cornell',        name:'Cornell Notes',  description:'3-zone Cornell layout',         category:'Learning', icon:'card-text-outline',       color:'#f59e0b' },
  { id:'daily-planner',  name:'Daily Planner',  description:'Hour-by-hour schedule',         category:'Planning', icon:'calendar-today',          color:'#ef4444' },
  { id:'weekly-planner', name:'Weekly Planner', description:'7-day weekly overview',         category:'Planning', icon:'calendar-week',           color:'#f97316' },
  { id:'calendar',       name:'Monthly Grid',   description:'Full month calendar view',      category:'Planning', icon:'calendar-month',          color:'#f43f5e' },
  { id:'habit-tracker',  name:'Habit Tracker',  description:'Daily habit streak tracker',    category:'Planning', icon:'checkbox-multiple-marked', color:'#a855f7' },
  { id:'mood-tracker',   name:'Mood Tracker',   description:'Daily emotion & mood log',      category:'Health',   icon:'emoticon-outline',        color:'#fb923c' },
  { id:'fitness',        name:'Fitness Log',    description:'Workout + nutrition tracker',   category:'Health',   icon:'dumbbell',                color:'#16a34a' },
  { id:'bullet-journal', name:'Bullet Journal', description:'Dotted BuJo style layout',      category:'Planning', icon:'format-list-bulleted',    color:'#6366f1' },
  { id:'kanban',         name:'Kanban Board',   description:'3-column task board layout',    category:'Business', icon:'view-column',             color:'#0891b2' },
  { id:'mind-map',       name:'Mind Map',       description:'Radial mind mapping canvas',    category:'Learning', icon:'sitemap',                 color:'#7c3aed' },
  { id:'timeline',       name:'Timeline',       description:'Horizontal project timeline',   category:'Business', icon:'timeline',                color:'#0369a1' },
  { id:'storyboard',     name:'Storyboard',     description:'6-panel storyboard layout',     category:'Art',      icon:'film',                    color:'#14b8a6' },
  { id:'sketch',         name:'Sketch Pad',     description:'Light blue sketch paper',       category:'Art',      icon:'palette-outline',         color:'#60a5fa' },
  { id:'music',          name:'Music Staff',    description:'5-line treble clef staves',     category:'Music',    icon:'music-note',              color:'#06b6d4' },
  { id:'recipe',         name:'Recipe Card',    description:'Ingredient + steps layout',     category:'Basic',    icon:'chef-hat',                color:'#f59e0b' },
  { id:'budget',         name:'Budget Tracker', description:'Income & expense ledger',       category:'Business', icon:'currency-usd',            color:'#22c55e' },
  { id:'reading-log',    name:'Reading Log',    description:'Book list with rating stars',   category:'Basic',    icon:'book-open',               color:'#8b5cf6' },
  { id:'travel',         name:'Travel Planner', description:'Itinerary & packing layout',    category:'Basic',    icon:'airplane',                color:'#3b82f6' },
  { id:'meeting-notes',  name:'Meeting Notes',  description:'Agenda, notes, action items',   category:'Business', icon:'account-group',           color:'#6366f1' },
  { id:'project-plan',   name:'Project Plan',   description:'Scope, milestones, tasks',      category:'Business', icon:'briefcase',               color:'#0f766e' },
  { id:'swot',           name:'SWOT Analysis',  description:'4-quadrant SWOT template',      category:'Business', icon:'chart-box',               color:'#dc2626' },
];

export type PageSize = 'a4' | 'a5' | 'a3' | 'letter' | 'square' | 'custom';

export interface PageSizeConfig {
  id: PageSize;
  name: string;
  width: number;
  height: number;
}

export const PAGE_SIZES: PageSizeConfig[] = [
  { id: 'a4',     name: 'A4',     width: 794,  height: 1123 },
  { id: 'a5',     name: 'A5',     width: 559,  height: 794  },
  { id: 'a3',     name: 'A3',     width: 1123, height: 1587 },
  { id: 'letter', name: 'Letter', width: 816,  height: 1056 },
  { id: 'square', name: 'Square', width: 794,  height: 794  },
];

export function getTemplatesByCategory(category: string): Template[] {
  if (category === 'All') return TEMPLATES;
  return TEMPLATES.filter(t => t.category === category);
}
