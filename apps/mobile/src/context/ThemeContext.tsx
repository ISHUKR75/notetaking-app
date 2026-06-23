import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { Colors, ColorScheme, ThemeColors } from '../constants/colors';
import { Storage, STORAGE_KEYS } from '../utils/storage';

interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  noteViewMode: 'list' | 'grid';
  sortBy: 'modified' | 'created' | 'title';
  showWordCount: boolean;
  showTags: boolean;
  enableHaptics: boolean;
  enableAnimations: boolean;
  defaultTemplate: string;
  defaultNotebookId: string | null;
  autoSave: boolean;
  spellCheck: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  fontSize: 'medium',
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
};

interface ThemeContextValue {
  colors: ThemeColors;
  scheme: ColorScheme;
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

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

  const scheme: ColorScheme = useMemo(() => {
    if (settings.theme === 'system') return (systemScheme === 'dark' ? 'dark' : 'light');
    return settings.theme;
  }, [settings.theme, systemScheme]);

  const isDark = scheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const updateSettings = (updates: Partial<AppSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    Storage.set(STORAGE_KEYS.SETTINGS, newSettings);
  };

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ colors, scheme, settings, updateSettings, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
