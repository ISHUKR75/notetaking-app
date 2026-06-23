import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { Colors, AppTheme, ThemeColors, getThemeColors } from '../constants/colors';
import { Storage, STORAGE_KEYS } from '../utils/storage';

export interface AppSettings {
  theme: AppTheme;
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  fontFamily: 'inter' | 'serif' | 'mono' | 'dyslexic';
  noteViewMode: 'list' | 'grid' | 'compact';
  sortBy: 'modified' | 'created' | 'title' | 'size';
  showWordCount: boolean;
  showTags: boolean;
  enableHaptics: boolean;
  enableAnimations: boolean;
  defaultTemplate: string;
  defaultNotebookId: string | null;
  autoSave: boolean;
  spellCheck: boolean;
  focusMode: boolean;
  lineHeight: 'tight' | 'normal' | 'relaxed' | 'loose';
  enableMarkdown: boolean;
  showReadingTime: boolean;
  compactHeaders: boolean;
  enableSounds: boolean;
  trashRetentionDays: number;
  showNoteCount: boolean;
  gridColumns: 2 | 3;
  enableBiometricLock: boolean;
  enableAutoBackup: boolean;
  defaultPenTool: string;
  defaultPenColor: string;
  defaultPenWidth: number;
  canvasZoom: number;
  showRuler: boolean;
  wristRejection: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  fontSize: 'medium',
  fontFamily: 'inter',
  noteViewMode: 'list',
  sortBy: 'modified',
  showWordCount: true,
  showTags: true,
  enableHaptics: true,
  enableAnimations: true,
  defaultTemplate: 'blank',
  defaultNotebookId: null,
  autoSave: true,
  spellCheck: true,
  focusMode: false,
  lineHeight: 'normal',
  enableMarkdown: true,
  showReadingTime: true,
  compactHeaders: false,
  enableSounds: false,
  trashRetentionDays: 30,
  showNoteCount: true,
  gridColumns: 2,
  enableBiometricLock: false,
  enableAutoBackup: false,
  defaultPenTool: 'ballpoint',
  defaultPenColor: '#111827',
  defaultPenWidth: 3,
  canvasZoom: 1,
  showRuler: false,
  wristRejection: true,
};

export const LINE_HEIGHT_MULTIPLIERS: Record<string, number> = {
  tight: 1.3,
  normal: 1.6,
  relaxed: 1.85,
  loose: 2.1,
};

interface ThemeContextValue {
  colors: ThemeColors;
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  isDark: boolean;
  appTheme: AppTheme;
  fontScale: number;
  /** Scale a font size by the user's font-size setting */
  sf: (size: number) => number;
  /** Content line-height based on settings */
  contentLineHeight: (fontSize?: number) => number;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const FONT_SCALES: Record<string, number> = {
  small: 0.875,
  medium: 1,
  large: 1.125,
  xlarge: 1.25,
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Storage.get<AppSettings>(STORAGE_KEYS.SETTINGS).then(saved => {
      if (saved) setSettings({ ...DEFAULT_SETTINGS, ...saved });
      setLoaded(true);
    });
  }, []);

  const colors = useMemo(() => {
    return getThemeColors(settings.theme, systemScheme === 'dark');
  }, [settings.theme, systemScheme]);

  const isDark = colors.isDark;
  const appTheme = settings.theme;
  const fontScale = FONT_SCALES[settings.fontSize] ?? 1;

  const updateSettings = (updates: Partial<AppSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    Storage.set(STORAGE_KEYS.SETTINGS, newSettings);
  };

  const sf = (size: number) => Math.round(size * fontScale);
  const contentLineHeight = (fontSize: number = 16) => {
    const scaled = fontSize * fontScale;
    const mult = LINE_HEIGHT_MULTIPLIERS[settings.lineHeight] ?? 1.6;
    return Math.round(scaled * mult);
  };

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ colors, settings, updateSettings, isDark, appTheme, fontScale, sf, contentLineHeight }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
