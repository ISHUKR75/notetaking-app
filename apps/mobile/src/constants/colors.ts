export type ColorScheme = 'light' | 'dark';
export type AppTheme =
  | 'system' | 'light' | 'dark' | 'sepia' | 'amoled'
  | 'nord' | 'dracula' | 'catppuccin' | 'solarized' | 'mint' | 'rose';

export interface ThemeColors {
  primary: string; primaryDark: string; primaryLight: string; primarySoft: string;
  background: string; surface: string; surfaceElevated: string; card: string;
  border: string; borderLight: string;
  text: string; textSecondary: string; textMuted: string; textInverse: string;
  success: string; warning: string; error: string; info: string;
  tabBar: string; tabBarBorder: string; headerBg: string;
  shadow: string; overlay: string;
  canvasBg: string; canvasBgDot: string; canvasBgLine: string; canvasBgGrid: string;
  inputBg: string; skeleton: string;
  noteColors: Record<string, string>;
  penColors: string[];
  isDark: boolean;
}

const LNC = {
  red:'#fca5a5', orange:'#fdba74', yellow:'#fde047', green:'#86efac',
  teal:'#5eead4', blue:'#93c5fd', purple:'#c4b5fd', pink:'#f9a8d4',
  brown:'#d6b896', gray:'#d1d5db', dark:'#374151', white:'#ffffff',
};
const DNC = {
  red:'#7f1d1d', orange:'#7c2d12', yellow:'#713f12', green:'#14532d',
  teal:'#134e4a', blue:'#1e3a5f', purple:'#4c1d95', pink:'#831843',
  brown:'#78350f', gray:'#374151', dark:'#1f2937', white:'#374151',
};
const LPC = ['#111827','#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#ffffff','#6b7280','#92400e'];
const DPC = ['#e2e8f0','#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#ffffff','#94a3b8','#d97706'];

const makeTheme = (t: ThemeColors) => t;

export const Colors = {
  themes: {
    light: makeTheme({
      primary:'#6366f1',primaryDark:'#4338ca',primaryLight:'#818cf8',primarySoft:'#eef2ff',
      background:'#f9fafb',surface:'#ffffff',surfaceElevated:'#ffffff',card:'#ffffff',
      border:'#e5e7eb',borderLight:'#f3f4f6',
      text:'#111827',textSecondary:'#6b7280',textMuted:'#9ca3af',textInverse:'#ffffff',
      success:'#10b981',warning:'#f59e0b',error:'#ef4444',info:'#3b82f6',
      tabBar:'#ffffff',tabBarBorder:'#e5e7eb',headerBg:'#ffffff',
      shadow:'rgba(0,0,0,0.08)',overlay:'rgba(0,0,0,0.5)',
      canvasBg:'#ffffff',canvasBgDot:'#f3f4f6',canvasBgLine:'#e5e7eb',canvasBgGrid:'#e5e7eb',
      inputBg:'#f9fafb',skeleton:'#f3f4f6',noteColors:LNC,penColors:LPC,isDark:false,
    }),
    dark: makeTheme({
      primary:'#6366f1',primaryDark:'#4338ca',primaryLight:'#818cf8',primarySoft:'#1e1b4b',
      background:'#0f1117',surface:'#1a1d27',surfaceElevated:'#252836',card:'#1a1d27',
      border:'#363a4f',borderLight:'#252836',
      text:'#e2e8f0',textSecondary:'#94a3b8',textMuted:'#64748b',textInverse:'#111827',
      success:'#10b981',warning:'#f59e0b',error:'#ef4444',info:'#3b82f6',
      tabBar:'#1a1d27',tabBarBorder:'#363a4f',headerBg:'#0f1117',
      shadow:'rgba(0,0,0,0.3)',overlay:'rgba(0,0,0,0.7)',
      canvasBg:'#1a1d27',canvasBgDot:'#252836',canvasBgLine:'#363a4f',canvasBgGrid:'#363a4f',
      inputBg:'#252836',skeleton:'#252836',noteColors:DNC,penColors:DPC,isDark:true,
    }),
    sepia: makeTheme({
      primary:'#92400e',primaryDark:'#78350f',primaryLight:'#b45309',primarySoft:'#fef3c7',
      background:'#f5efe0',surface:'#faf5e4',surfaceElevated:'#faf5e4',card:'#faf5e4',
      border:'#e8d5b7',borderLight:'#f0e6cc',
      text:'#2d1a0a',textSecondary:'#6b4423',textMuted:'#9c6b3c',textInverse:'#faf5e4',
      success:'#065f46',warning:'#92400e',error:'#991b1b',info:'#1e40af',
      tabBar:'#faf5e4',tabBarBorder:'#e8d5b7',headerBg:'#f5efe0',
      shadow:'rgba(92,40,14,0.12)',overlay:'rgba(45,26,10,0.5)',
      canvasBg:'#fdf6e3',canvasBgDot:'#e8d5b7',canvasBgLine:'#d9c5a0',canvasBgGrid:'#d9c5a0',
      inputBg:'#f0e6cc',skeleton:'#e8d5b7',
      noteColors:{...LNC,dark:'#78350f',white:'#faf5e4'},
      penColors:['#2d1a0a','#991b1b','#92400e','#065f46','#1e40af','#5b21b6','#831843','#6b7280','#000000','#faf5e4','#374151','#78350f'],
      isDark:false,
    }),
    amoled: makeTheme({
      primary:'#a78bfa',primaryDark:'#7c3aed',primaryLight:'#c4b5fd',primarySoft:'#1e1b4b',
      background:'#000000',surface:'#0a0a0f',surfaceElevated:'#111118',card:'#0a0a0f',
      border:'#1a1a2e',borderLight:'#111118',
      text:'#f1f5f9',textSecondary:'#94a3b8',textMuted:'#475569',textInverse:'#000000',
      success:'#10b981',warning:'#f59e0b',error:'#ef4444',info:'#60a5fa',
      tabBar:'#000000',tabBarBorder:'#1a1a2e',headerBg:'#000000',
      shadow:'rgba(0,0,0,0.6)',overlay:'rgba(0,0,0,0.8)',
      canvasBg:'#070710',canvasBgDot:'#111118',canvasBgLine:'#1a1a2e',canvasBgGrid:'#1a1a2e',
      inputBg:'#0a0a0f',skeleton:'#111118',noteColors:DNC,
      penColors:['#f1f5f9','#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#60a5fa','#a78bfa','#ec4899','#ffffff','#94a3b8','#d97706'],
      isDark:true,
    }),
    nord: makeTheme({
      primary:'#5e81ac',primaryDark:'#4c6993',primaryLight:'#81a1c1',primarySoft:'#2e3440',
      background:'#2e3440',surface:'#3b4252',surfaceElevated:'#434c5e',card:'#3b4252',
      border:'#434c5e',borderLight:'#3b4252',
      text:'#eceff4',textSecondary:'#d8dee9',textMuted:'#4c566a',textInverse:'#2e3440',
      success:'#a3be8c',warning:'#ebcb8b',error:'#bf616a',info:'#88c0d0',
      tabBar:'#3b4252',tabBarBorder:'#434c5e',headerBg:'#2e3440',
      shadow:'rgba(0,0,0,0.3)',overlay:'rgba(0,0,0,0.6)',
      canvasBg:'#3b4252',canvasBgDot:'#434c5e',canvasBgLine:'#4c566a',canvasBgGrid:'#4c566a',
      inputBg:'#434c5e',skeleton:'#434c5e',noteColors:DNC,
      penColors:['#eceff4','#bf616a','#d08770','#ebcb8b','#a3be8c','#88c0d0','#81a1c1','#b48ead','#d8dee9','#ffffff','#4c566a','#d08770'],
      isDark:true,
    }),
    dracula: makeTheme({
      primary:'#bd93f9',primaryDark:'#9d72f0',primaryLight:'#cba6f7',primarySoft:'#21222c',
      background:'#282a36',surface:'#1e1f29',surfaceElevated:'#373844',card:'#1e1f29',
      border:'#44475a',borderLight:'#373844',
      text:'#f8f8f2',textSecondary:'#6272a4',textMuted:'#44475a',textInverse:'#282a36',
      success:'#50fa7b',warning:'#ffb86c',error:'#ff5555',info:'#8be9fd',
      tabBar:'#1e1f29',tabBarBorder:'#44475a',headerBg:'#282a36',
      shadow:'rgba(0,0,0,0.4)',overlay:'rgba(0,0,0,0.7)',
      canvasBg:'#21222c',canvasBgDot:'#373844',canvasBgLine:'#44475a',canvasBgGrid:'#44475a',
      inputBg:'#373844',skeleton:'#373844',noteColors:DNC,
      penColors:['#f8f8f2','#ff5555','#ffb86c','#f1fa8c','#50fa7b','#8be9fd','#6272a4','#bd93f9','#ff79c6','#ffffff','#44475a','#ffb86c'],
      isDark:true,
    }),
    catppuccin: makeTheme({
      primary:'#cba6f7',primaryDark:'#b4a0e5',primaryLight:'#d0bbfe',primarySoft:'#1e1e2e',
      background:'#1e1e2e',surface:'#181825',surfaceElevated:'#313244',card:'#181825',
      border:'#45475a',borderLight:'#313244',
      text:'#cdd6f4',textSecondary:'#a6adc8',textMuted:'#585b70',textInverse:'#1e1e2e',
      success:'#a6e3a1',warning:'#fab387',error:'#f38ba8',info:'#89dceb',
      tabBar:'#181825',tabBarBorder:'#45475a',headerBg:'#1e1e2e',
      shadow:'rgba(0,0,0,0.4)',overlay:'rgba(0,0,0,0.7)',
      canvasBg:'#181825',canvasBgDot:'#313244',canvasBgLine:'#45475a',canvasBgGrid:'#45475a',
      inputBg:'#313244',skeleton:'#313244',noteColors:DNC,
      penColors:['#cdd6f4','#f38ba8','#fab387','#f9e2af','#a6e3a1','#89dceb','#89b4fa','#cba6f7','#f5c2e7','#ffffff','#585b70','#fab387'],
      isDark:true,
    }),
    solarized: makeTheme({
      primary:'#268bd2',primaryDark:'#1a6fa3',primaryLight:'#4baee6',primarySoft:'#073642',
      background:'#002b36',surface:'#073642',surfaceElevated:'#0d3b47',card:'#073642',
      border:'#586e75',borderLight:'#0d3b47',
      text:'#839496',textSecondary:'#657b83',textMuted:'#586e75',textInverse:'#002b36',
      success:'#859900',warning:'#b58900',error:'#dc322f',info:'#268bd2',
      tabBar:'#073642',tabBarBorder:'#586e75',headerBg:'#002b36',
      shadow:'rgba(0,0,0,0.4)',overlay:'rgba(0,0,0,0.7)',
      canvasBg:'#073642',canvasBgDot:'#0d3b47',canvasBgLine:'#586e75',canvasBgGrid:'#586e75',
      inputBg:'#0d3b47',skeleton:'#0d3b47',noteColors:DNC,
      penColors:['#839496','#dc322f','#cb4b16','#b58900','#859900','#2aa198','#268bd2','#6c71c4','#d33682','#fdf6e3','#657b83','#cb4b16'],
      isDark:true,
    }),
    mint: makeTheme({
      primary:'#0d9488',primaryDark:'#0f766e',primaryLight:'#14b8a6',primarySoft:'#ccfbf1',
      background:'#f0fdf9',surface:'#ffffff',surfaceElevated:'#ffffff',card:'#ffffff',
      border:'#d1fae5',borderLight:'#ecfdf5',
      text:'#134e4a',textSecondary:'#047857',textMuted:'#6b7280',textInverse:'#ffffff',
      success:'#059669',warning:'#d97706',error:'#dc2626',info:'#0369a1',
      tabBar:'#ffffff',tabBarBorder:'#d1fae5',headerBg:'#f0fdf9',
      shadow:'rgba(13,148,136,0.1)',overlay:'rgba(0,0,0,0.5)',
      canvasBg:'#f0fdf9',canvasBgDot:'#d1fae5',canvasBgLine:'#a7f3d0',canvasBgGrid:'#a7f3d0',
      inputBg:'#ecfdf5',skeleton:'#d1fae5',noteColors:LNC,
      penColors:['#134e4a','#dc2626','#d97706','#059669','#0d9488','#0369a1','#7c3aed','#be185d','#6b7280','#ffffff','#374151','#78350f'],
      isDark:false,
    }),
    rose: makeTheme({
      primary:'#e11d48',primaryDark:'#be123c',primaryLight:'#fb7185',primarySoft:'#ffe4e6',
      background:'#fff1f2',surface:'#ffffff',surfaceElevated:'#ffffff',card:'#ffffff',
      border:'#fecdd3',borderLight:'#fff1f2',
      text:'#881337',textSecondary:'#9f1239',textMuted:'#6b7280',textInverse:'#ffffff',
      success:'#059669',warning:'#d97706',error:'#dc2626',info:'#0369a1',
      tabBar:'#ffffff',tabBarBorder:'#fecdd3',headerBg:'#fff1f2',
      shadow:'rgba(225,29,72,0.12)',overlay:'rgba(0,0,0,0.5)',
      canvasBg:'#fff1f2',canvasBgDot:'#fecdd3',canvasBgLine:'#fda4af',canvasBgGrid:'#fda4af',
      inputBg:'#ffe4e6',skeleton:'#fecdd3',noteColors:LNC,
      penColors:['#881337','#dc2626','#d97706','#059669','#0d9488','#0369a1','#7c3aed','#e11d48','#6b7280','#ffffff','#374151','#78350f'],
      isDark:false,
    }),
  },
  light: null as unknown as ThemeColors,
  dark: null as unknown as ThemeColors,
  radius: { xs:4,sm:8,md:12,lg:16,xl:20,xxl:24,full:9999 },
  spacing: { xs:4,sm:8,md:12,lg:16,xl:20,xxl:24,xxxl:32 },
  font: { xs:11,sm:13,base:15,md:16,lg:18,xl:20,xxl:24,xxxl:28,display:32 },
};

Colors.light = Colors.themes.light;
Colors.dark = Colors.themes.dark;

export function getThemeColors(theme: AppTheme, systemIsDark: boolean): ThemeColors {
  if (theme==='system') return systemIsDark ? Colors.themes.dark : Colors.themes.light;
  return (Colors.themes as any)[theme] ?? (systemIsDark ? Colors.themes.dark : Colors.themes.light);
}

export const THEME_OPTIONS: { id: AppTheme; name: string; icon: string; description: string; preview: string }[] = [
  { id:'system',  name:'System',     icon:'theme-light-dark',    description:'Follow device',     preview:'#6366f1' },
  { id:'light',   name:'Light',      icon:'white-balance-sunny', description:'Clean white',        preview:'#6366f1' },
  { id:'dark',    name:'Dark',       icon:'weather-night',       description:'Dark indigo',        preview:'#6366f1' },
  { id:'sepia',   name:'Sepia',      icon:'book-open-variant',   description:'Warm paper',         preview:'#92400e' },
  { id:'amoled',  name:'AMOLED',     icon:'circle',              description:'Pure black OLED',    preview:'#a78bfa' },
  { id:'nord',    name:'Nord',       icon:'snowflake',           description:'Arctic blues',       preview:'#5e81ac' },
  { id:'dracula', name:'Dracula',    icon:'bat',                 description:'Iconic purple dark', preview:'#bd93f9' },
  { id:'catppuccin',name:'Catppuccin',icon:'cat',               description:'Pastel dark',        preview:'#cba6f7' },
  { id:'solarized',name:'Solarized', icon:'solar-power-variant', description:'Classic solarized',  preview:'#268bd2' },
  { id:'mint',    name:'Mint',       icon:'leaf',                description:'Fresh teal',         preview:'#0d9488' },
  { id:'rose',    name:'Rose',       icon:'flower',              description:'Elegant pink',       preview:'#e11d48' },
];
