import AsyncStorage from '@react-native-async-storage/async-storage';

export const Storage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {
      // silent
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // silent
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch {
      // silent
    }
  },

  async getAllKeys(): Promise<string[]> {
    try {
      return [...(await AsyncStorage.getAllKeys())];
    } catch {
      return [];
    }
  },
};

export const STORAGE_KEYS = {
  NOTES: 'ishu_notes_v1',
  NOTEBOOKS: 'ishu_notebooks_v1',
  SETTINGS: 'ishu_settings_v1',
  THEME: 'ishu_theme_v1',
  TAGS: 'ishu_tags_v1',
  STROKES: (noteId: string) => `ishu_strokes_${noteId}_v1`,
  RECENT_SEARCHES: 'ishu_recent_searches_v1',
  ONBOARDING_DONE: 'ishu_onboarding_done_v1',
};
