import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { Storage, STORAGE_KEYS } from '../utils/storage';
import { generateId, countWords, estimateReadingTime } from '../utils/noteUtils';

export type NoteColor = 'none' | 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'blue' | 'purple' | 'pink' | 'brown' | 'gray';
export type NoteType = 'text' | 'handwriting' | 'mixed' | 'voice';
export type PageBackground =
  | 'none' | 'cream' | 'yellow' | 'pink' | 'green' | 'blue' | 'purple'
  | 'sepia' | 'mint' | 'peach' | 'lavender' | 'sky' | 'dark' | 'charcoal'
  | 'rose' | 'forest' | 'ocean' | 'sunset' | 'ash' | 'ivory';

export interface Note {
  id: string;
  title: string;
  content: string;
  type: NoteType;
  notebookId: string | null;
  tags: string[];
  color: NoteColor;
  pageBackground: PageBackground;
  isPinned: boolean;
  isFlagged: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  isLocked: boolean;
  isFavorite: boolean;
  emoji: string | null;
  createdAt: string;
  modifiedAt: string;
  trashedAt: string | null;
  wordCount: number;
  readingTime: number;
  hasHandwriting: boolean;
  hasAudio: boolean;
  hasImages: boolean;
  templateId: string;
  pageCount: number;
}

export interface Notebook {
  id: string;
  title: string;
  emoji: string;
  color: string;
  description: string;
  createdAt: string;
  modifiedAt: string;
  noteCount: number;
  isFavorite: boolean;
  isArchived: boolean;
  sortOrder: 'modified' | 'created' | 'title' | 'manual';
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  count: number;
}

export interface BackupBundle {
  version: string;
  app: string;
  exportedAt: string;
  notes: Note[];
  notebooks: Notebook[];
  tags: Tag[];
  strokesMap?: Record<string, any[]>;
}

export const PAGE_BACKGROUNDS: { id: PageBackground; label: string; light: string; dark: string; textColor: string }[] = [
  { id: 'none',      label: 'Default',   light: 'transparent', dark: 'transparent',  textColor: 'auto' },
  { id: 'cream',     label: 'Cream',     light: '#fefce8',     dark: '#2d2a1e',       textColor: '#44403c' },
  { id: 'ivory',     label: 'Ivory',     light: '#fffff0',     dark: '#2a2a20',       textColor: '#44403c' },
  { id: 'sepia',     label: 'Sepia',     light: '#f5f0e8',     dark: '#2a2218',       textColor: '#5c4a2a' },
  { id: 'yellow',    label: 'Yellow',    light: '#fef9c3',     dark: '#2d2a10',       textColor: '#713f12' },
  { id: 'pink',      label: 'Pink',      light: '#fdf2f8',     dark: '#2d1a28',       textColor: '#831843' },
  { id: 'rose',      label: 'Rose',      light: '#fff1f2',     dark: '#2a1015',       textColor: '#9f1239' },
  { id: 'peach',     label: 'Peach',     light: '#fff7ed',     dark: '#2a1e0f',       textColor: '#9a3412' },
  { id: 'mint',      label: 'Mint',      light: '#f0fdf4',     dark: '#0f2a1a',       textColor: '#166534' },
  { id: 'green',     label: 'Green',     light: '#f7fee7',     dark: '#162008',       textColor: '#3a5c10' },
  { id: 'forest',    label: 'Forest',    light: '#e8f5e9',     dark: '#0d2010',       textColor: '#1b5e20' },
  { id: 'sky',       label: 'Sky',       light: '#f0f9ff',     dark: '#0a1f2d',       textColor: '#0369a1' },
  { id: 'blue',      label: 'Blue',      light: '#eff6ff',     dark: '#0d1a2d',       textColor: '#1d4ed8' },
  { id: 'ocean',     label: 'Ocean',     light: '#e0f2fe',     dark: '#091d2d',       textColor: '#0c4a6e' },
  { id: 'lavender',  label: 'Lavender',  light: '#f5f3ff',     dark: '#1a1530',       textColor: '#5b21b6' },
  { id: 'purple',    label: 'Purple',    light: '#faf5ff',     dark: '#1a0d2a',       textColor: '#7c3aed' },
  { id: 'sunset',    label: 'Sunset',    light: '#fff7f0',     dark: '#2a1505',       textColor: '#c2410c' },
  { id: 'ash',       label: 'Ash',       light: '#f8f8f8',     dark: '#1e1e1e',       textColor: '#374151' },
  { id: 'charcoal',  label: 'Charcoal',  light: '#1e1e2e',     dark: '#0d0d17',       textColor: '#e2e8f0' },
  { id: 'dark',      label: 'Dark',      light: '#111827',     dark: '#000000',       textColor: '#f9fafb' },
];

interface NotesContextValue {
  notes: Note[];
  notebooks: Notebook[];
  tags: Tag[];
  isLoading: boolean;
  createNote: (partial?: Partial<Note>) => Promise<Note>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  trashNote: (id: string) => Promise<void>;
  restoreNote: (id: string) => Promise<void>;
  pinNote: (id: string, pinned: boolean) => Promise<void>;
  flagNote: (id: string, flagged: boolean) => Promise<void>;
  favoriteNote: (id: string, fav: boolean) => Promise<void>;
  archiveNote: (id: string) => Promise<void>;
  duplicateNote: (id: string) => Promise<Note>;
  getNoteById: (id: string) => Note | undefined;
  createNotebook: (partial?: Partial<Notebook>) => Promise<Notebook>;
  updateNotebook: (id: string, updates: Partial<Notebook>) => Promise<void>;
  deleteNotebook: (id: string) => Promise<void>;
  getNotesByNotebook: (notebookId: string | null) => Note[];
  addTag: (name: string, color?: string) => Promise<Tag>;
  removeTag: (id: string) => Promise<void>;
  searchNotes: (query: string) => Note[];
  getRecentNotes: (limit?: number) => Note[];
  getPinnedNotes: () => Note[];
  getFlaggedNotes: () => Note[];
  getTrashedNotes: () => Note[];
  getArchivedNotes: () => Note[];
  getFavoriteNotes: () => Note[];
  importBackup: (bundle: BackupBundle) => Promise<{ imported: number; errors: number }>;
  exportBackup: () => Promise<BackupBundle>;
  emptyTrash: () => Promise<void>;
}

const NotesContext = createContext<NotesContextValue | null>(null);

const NOTEBOOK_EMOJIS = ['📓', '📔', '📒', '📕', '📗', '📘', '📙', '🗒️', '📋', '📄'];
const NOTEBOOK_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

function createDefaultNotebooks(): Notebook[] {
  return [
    { id: generateId(), title: 'Personal', emoji: '📓', color: '#6366f1', description: 'Personal notes', createdAt: new Date().toISOString(), modifiedAt: new Date().toISOString(), noteCount: 0, isFavorite: false, isArchived: false, sortOrder: 'modified' },
    { id: generateId(), title: 'Work', emoji: '💼', color: '#3b82f6', description: 'Work notes', createdAt: new Date().toISOString(), modifiedAt: new Date().toISOString(), noteCount: 0, isFavorite: false, isArchived: false, sortOrder: 'modified' },
    { id: generateId(), title: 'Ideas', emoji: '💡', color: '#f59e0b', description: 'Ideas', createdAt: new Date().toISOString(), modifiedAt: new Date().toISOString(), noteCount: 0, isFavorite: false, isArchived: false, sortOrder: 'modified' },
  ];
}

function createSampleNotes(notebookId: string): Note[] {
  const now = new Date();
  const base: Omit<Note, 'id' | 'title' | 'content' | 'tags' | 'color' | 'pageBackground' | 'isPinned' | 'isFlagged' | 'emoji' | 'createdAt' | 'modifiedAt' | 'wordCount' | 'readingTime'> = {
    type: 'text', notebookId, isArchived: false, isTrashed: false, isLocked: false, isFavorite: false,
    hasHandwriting: false, hasAudio: false, hasImages: false, templateId: 'blank', pageCount: 1, trashedAt: null,
  };
  return [
    { ...base, id: generateId(), title: 'Welcome to Ishu Notes! ✨', content: `**Write Freely. Think Clearly. Create Limitlessly.**

Ishu Notes is your all-in-one note-taking companion combining the best of GoodNotes 6, Notion, Apple Notes, Samsung Notes, and NoteWise.

## ✏️ Key Features

- **Handwriting & Drawing** — Multiple pen tools (ballpoint, fountain, brush, pencil, chalk, neon...)
- **Rich Text Editing** — Bold, italic, headings, lists, checkboxes, code blocks, tables
- **Notebooks & Tags** — Organize your notes beautifully
- **Page Backgrounds** — Change your writing area color from the palette icon 🎨
- **Dark & Light Themes** — Multiple beautiful themes
- **Export & Import** — JSON backup, Markdown, plain text
- **Study Mode** — Flashcards with spaced repetition, Pomodoro timer
- **Powerful Search** — Find any note instantly

## 🚀 Getting Started

1. Tap **+** to create a new note
2. Use the **Draw tab** to write with your finger or stylus
3. Tap the **palette icon** in the editor to change page background
4. Organize notes into **Notebooks**
5. Use **#tags** to label your notes

## 📚 Markdown Tips

\`\`\`
# Heading 1      ## Heading 2
**bold**          *italic*
- [ ] todo        - [x] done todo
> blockquote      \`inline code\`
===highlight===   ~~strikethrough~~
| Col1 | Col2 |  (tables!)
\`\`\`

Enjoy your premium note-taking journey! 🎯`,
      tags: ['welcome', 'getting-started'], color: 'purple', pageBackground: 'none', isPinned: true, isFlagged: false, emoji: '✨',
      createdAt: now.toISOString(), modifiedAt: now.toISOString(), wordCount: 120, readingTime: 1 },
    { ...base, id: generateId(), title: 'Meeting Notes — Product Review', content: `**Date:** ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
**Attendees:** Team Alpha

## Agenda
- Q3 Performance Review
- New Feature Roadmap
- Team Updates

## Discussion Notes

The team reviewed Q3 metrics and discussed Q4 priorities. Key decisions around AI features and mobile improvements were made.

## Action Items

- [ ] Finalize design mockups by Friday
- [ ] Review API documentation  
- [ ] Schedule user testing sessions
- [ ] Update project roadmap

## Next Meeting
Next Monday at 10 AM`,
      tags: ['meeting', 'work'], color: 'blue', pageBackground: 'none', isPinned: false, isFlagged: true, emoji: null,
      createdAt: new Date(now.getTime() - 3600000).toISOString(), modifiedAt: new Date(now.getTime() - 1800000).toISOString(), wordCount: 95, readingTime: 1 },
    { ...base, id: generateId(), title: 'Quick Ideas 💡', content: `Random thoughts and ideas:

- Build a habit tracker integration
- Add voice-to-text for faster note creation  
- Create a weekly review template
- Learn watercolor painting techniques
- Read "Atomic Habits" by James Clear
- Try the Cornell Notes method for studying

## Project Ideas

A note-taking app that automatically links related concepts using AI and creates visual mind maps of your knowledge...

## Books to Read

| Book | Author | Priority |
|------|--------|----------|
| Atomic Habits | James Clear | High |
| Deep Work | Cal Newport | Medium |
| The Lean Startup | Eric Ries | Low |`,
      tags: ['ideas', 'personal'], color: 'yellow', pageBackground: 'none', isPinned: false, isFlagged: false, emoji: '💡', isFavorite: true,
      createdAt: new Date(now.getTime() - 86400000).toISOString(), modifiedAt: new Date(now.getTime() - 7200000).toISOString(), wordCount: 90, readingTime: 1 },
  ];
}

export function NotesProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [savedNotes, savedNotebooks, savedTags] = await Promise.all([
          Storage.get<Note[]>(STORAGE_KEYS.NOTES),
          Storage.get<Notebook[]>(STORAGE_KEYS.NOTEBOOKS),
          Storage.get<Tag[]>(STORAGE_KEYS.TAGS),
        ]);
        if (savedNotebooks && savedNotebooks.length > 0) {
          // Migrate old notes that don't have pageBackground
          const migratedNotes = (savedNotes || []).map(n => ({
            pageBackground: 'none' as PageBackground,
            trashedAt: null,
            ...n,
          }));
          setNotebooks(savedNotebooks);
          setNotes(migratedNotes);
          setTags(savedTags || []);
        } else {
          const defaultNotebooks = createDefaultNotebooks();
          const sampleNotes = createSampleNotes(defaultNotebooks[0].id);
          const defaultTags: Tag[] = [
            { id: generateId(), name: 'welcome', color: '#6366f1', count: 1 },
            { id: generateId(), name: 'getting-started', color: '#3b82f6', count: 1 },
            { id: generateId(), name: 'meeting', color: '#10b981', count: 1 },
            { id: generateId(), name: 'work', color: '#f59e0b', count: 1 },
            { id: generateId(), name: 'ideas', color: '#8b5cf6', count: 1 },
            { id: generateId(), name: 'personal', color: '#ec4899', count: 1 },
          ];
          defaultNotebooks[0] = { ...defaultNotebooks[0], noteCount: sampleNotes.length };
          setNotebooks(defaultNotebooks);
          setNotes(sampleNotes);
          setTags(defaultTags);
          await Promise.all([
            Storage.set(STORAGE_KEYS.NOTEBOOKS, defaultNotebooks),
            Storage.set(STORAGE_KEYS.NOTES, sampleNotes),
            Storage.set(STORAGE_KEYS.TAGS, defaultTags),
          ]);
        }
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const saveNotes = useCallback(async (newNotes: Note[]) => {
    setNotes(newNotes);
    await Storage.set(STORAGE_KEYS.NOTES, newNotes);
  }, []);

  const saveNotebooks = useCallback(async (newNotebooks: Notebook[]) => {
    setNotebooks(newNotebooks);
    await Storage.set(STORAGE_KEYS.NOTEBOOKS, newNotebooks);
  }, []);

  const saveTags = useCallback(async (newTags: Tag[]) => {
    setTags(newTags);
    await Storage.set(STORAGE_KEYS.TAGS, newTags);
  }, []);

  const createNote = useCallback(async (partial: Partial<Note> = {}): Promise<Note> => {
    const now = new Date().toISOString();
    const newNote: Note = {
      id: generateId(), title: 'Untitled Note', content: '', type: 'text',
      notebookId: notebooks[0]?.id || null, tags: [], color: 'none', pageBackground: 'none',
      isPinned: false, isFlagged: false, isArchived: false, isTrashed: false, isLocked: false, isFavorite: false,
      emoji: null, createdAt: now, modifiedAt: now, trashedAt: null,
      wordCount: 0, readingTime: 0, hasHandwriting: false, hasAudio: false, hasImages: false,
      templateId: 'blank', pageCount: 1, ...partial,
    };
    const newNotes = [newNote, ...notes];
    await saveNotes(newNotes);
    if (newNote.notebookId) {
      const updated = notebooks.map(nb =>
        nb.id === newNote.notebookId ? { ...nb, noteCount: nb.noteCount + 1, modifiedAt: now } : nb
      );
      await saveNotebooks(updated);
    }
    return newNote;
  }, [notes, notebooks, saveNotes, saveNotebooks]);

  const updateNote = useCallback(async (id: string, updates: Partial<Note>): Promise<void> => {
    const now = new Date().toISOString();
    const newNotes = notes.map(n => {
      if (n.id !== id) return n;
      const updated = { ...n, ...updates, modifiedAt: now };
      if (updates.content !== undefined) {
        const wc = countWords(updates.content);
        updated.wordCount = wc;
        updated.readingTime = estimateReadingTime(wc);
      }
      return updated;
    });
    await saveNotes(newNotes);
  }, [notes, saveNotes]);

  const deleteNote = useCallback(async (id: string): Promise<void> => {
    const note = notes.find(n => n.id === id);
    const newNotes = notes.filter(n => n.id !== id);
    await saveNotes(newNotes);
    if (note?.notebookId) {
      const updated = notebooks.map(nb =>
        nb.id === note.notebookId ? { ...nb, noteCount: Math.max(0, nb.noteCount - 1) } : nb
      );
      await saveNotebooks(updated);
    }
  }, [notes, notebooks, saveNotes, saveNotebooks]);

  const trashNote = useCallback(async (id: string): Promise<void> => {
    await updateNote(id, { isTrashed: true, isArchived: false, trashedAt: new Date().toISOString() });
  }, [updateNote]);

  const restoreNote = useCallback(async (id: string): Promise<void> => {
    await updateNote(id, { isTrashed: false, trashedAt: null });
  }, [updateNote]);

  const pinNote = useCallback(async (id: string, pinned: boolean): Promise<void> => {
    await updateNote(id, { isPinned: pinned });
  }, [updateNote]);

  const flagNote = useCallback(async (id: string, flagged: boolean): Promise<void> => {
    await updateNote(id, { isFlagged: flagged });
  }, [updateNote]);

  const favoriteNote = useCallback(async (id: string, fav: boolean): Promise<void> => {
    await updateNote(id, { isFavorite: fav });
  }, [updateNote]);

  const archiveNote = useCallback(async (id: string): Promise<void> => {
    await updateNote(id, { isArchived: true, isTrashed: false });
  }, [updateNote]);

  const duplicateNote = useCallback(async (id: string): Promise<Note> => {
    const note = notes.find(n => n.id === id);
    if (!note) throw new Error('Note not found');
    return createNote({ ...note, title: `${note.title} (Copy)`, isPinned: false, isFlagged: false });
  }, [notes, createNote]);

  const getNoteById = useCallback((id: string) => notes.find(n => n.id === id), [notes]);

  const createNotebook = useCallback(async (partial: Partial<Notebook> = {}): Promise<Notebook> => {
    const now = new Date().toISOString();
    const idx = notebooks.length % NOTEBOOK_EMOJIS.length;
    const newNotebook: Notebook = {
      id: generateId(), title: 'New Notebook', emoji: NOTEBOOK_EMOJIS[idx], color: NOTEBOOK_COLORS[idx],
      description: '', createdAt: now, modifiedAt: now, noteCount: 0,
      isFavorite: false, isArchived: false, sortOrder: 'modified', ...partial,
    };
    await saveNotebooks([...notebooks, newNotebook]);
    return newNotebook;
  }, [notebooks, saveNotebooks]);

  const updateNotebook = useCallback(async (id: string, updates: Partial<Notebook>): Promise<void> => {
    const newNotebooks = notebooks.map(nb =>
      nb.id === id ? { ...nb, ...updates, modifiedAt: new Date().toISOString() } : nb
    );
    await saveNotebooks(newNotebooks);
  }, [notebooks, saveNotebooks]);

  const deleteNotebook = useCallback(async (id: string): Promise<void> => {
    const newNotebooks = notebooks.filter(nb => nb.id !== id);
    const newNotes = notes.map(n => n.notebookId === id ? { ...n, notebookId: null } : n);
    await Promise.all([saveNotebooks(newNotebooks), saveNotes(newNotes)]);
  }, [notebooks, notes, saveNotebooks, saveNotes]);

  const getNotesByNotebook = useCallback((notebookId: string | null) => {
    return notes.filter(n => !n.isTrashed && !n.isArchived && n.notebookId === notebookId);
  }, [notes]);

  const addTag = useCallback(async (name: string, color = '#6366f1'): Promise<Tag> => {
    const existing = tags.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    const newTag: Tag = { id: generateId(), name, color, count: 0 };
    await saveTags([...tags, newTag]);
    return newTag;
  }, [tags, saveTags]);

  const removeTag = useCallback(async (id: string): Promise<void> => {
    await saveTags(tags.filter(t => t.id !== id));
  }, [tags, saveTags]);

  const searchNotes = useCallback((query: string) => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return notes.filter(n =>
      !n.isTrashed &&
      (n.title.toLowerCase().includes(q) ||
       n.content.toLowerCase().includes(q) ||
       n.tags.some(t => t.toLowerCase().includes(q)))
    );
  }, [notes]);

  const getRecentNotes = useCallback((limit = 20) => {
    return notes.filter(n => !n.isTrashed && !n.isArchived)
      .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime())
      .slice(0, limit);
  }, [notes]);

  const getPinnedNotes = useCallback(() =>
    notes.filter(n => n.isPinned && !n.isTrashed && !n.isArchived), [notes]);

  const getFlaggedNotes = useCallback(() =>
    notes.filter(n => n.isFlagged && !n.isTrashed && !n.isArchived), [notes]);

  const getTrashedNotes = useCallback(() => notes.filter(n => n.isTrashed), [notes]);

  const getArchivedNotes = useCallback(() =>
    notes.filter(n => n.isArchived && !n.isTrashed), [notes]);

  const getFavoriteNotes = useCallback(() =>
    notes.filter(n => n.isFavorite && !n.isTrashed && !n.isArchived), [notes]);

  const emptyTrash = useCallback(async () => {
    const newNotes = notes.filter(n => !n.isTrashed);
    await saveNotes(newNotes);
  }, [notes, saveNotes]);

  const exportBackup = useCallback(async (): Promise<BackupBundle> => {
    const strokesMap: Record<string, any[]> = {};
    for (const note of notes.filter(n => n.hasHandwriting && !n.isTrashed)) {
      const strokes = await Storage.get<any[]>(STORAGE_KEYS.STROKES(note.id));
      if (strokes && strokes.length > 0) strokesMap[note.id] = strokes;
    }
    return {
      version: '2.0.0', app: 'Ishu Notes',
      exportedAt: new Date().toISOString(),
      notes: notes.filter(n => !n.isTrashed),
      notebooks, tags, strokesMap,
    };
  }, [notes, notebooks, tags]);

  const importBackup = useCallback(async (bundle: BackupBundle): Promise<{ imported: number; errors: number }> => {
    let imported = 0; let errors = 0;
    try {
      const now = new Date().toISOString();
      const idMap: Record<string, string> = {};

      // Import notebooks (avoid duplicates by title)
      const newNotebooks = [...notebooks];
      for (const nb of (bundle.notebooks || [])) {
        const existing = newNotebooks.find(n => n.title.toLowerCase() === nb.title.toLowerCase());
        if (existing) { idMap[nb.id] = existing.id; }
        else {
          const newId = generateId();
          idMap[nb.id] = newId;
          newNotebooks.push({ ...nb, id: newId, createdAt: nb.createdAt || now, modifiedAt: nb.modifiedAt || now });
        }
      }
      await saveNotebooks(newNotebooks);

      // Import notes
      const newNotes = [...notes];
      for (const note of (bundle.notes || [])) {
        try {
          const newId = generateId();
          const newNotebookId = note.notebookId && idMap[note.notebookId]
            ? idMap[note.notebookId]
            : (notebooks[0]?.id || null);
          const importedNote: Note = {
            ...note, id: newId, notebookId: newNotebookId,
            pageBackground: note.pageBackground || 'none',
            isTrashed: false, isArchived: false, trashedAt: null,
            createdAt: note.createdAt || now, modifiedAt: note.modifiedAt || now,
          };
          newNotes.unshift(importedNote);

          // Import strokes if available
          if (bundle.strokesMap && bundle.strokesMap[note.id]) {
            await Storage.set(STORAGE_KEYS.STROKES(newId), bundle.strokesMap[note.id]);
          }
          imported++;
        } catch { errors++; }
      }
      await saveNotes(newNotes);

      // Import tags (merge by name)
      const newTags = [...tags];
      for (const tag of (bundle.tags || [])) {
        if (!newTags.find(t => t.name.toLowerCase() === tag.name.toLowerCase())) {
          newTags.push({ ...tag, id: generateId() });
        }
      }
      await saveTags(newTags);
    } catch { errors++; }
    return { imported, errors };
  }, [notes, notebooks, tags, saveNotes, saveNotebooks, saveTags]);

  const value = useMemo(() => ({
    notes, notebooks, tags, isLoading,
    createNote, updateNote, deleteNote, trashNote, restoreNote, pinNote, flagNote, favoriteNote,
    archiveNote, duplicateNote, getNoteById, createNotebook, updateNotebook, deleteNotebook,
    getNotesByNotebook, addTag, removeTag, searchNotes, getRecentNotes,
    getPinnedNotes, getFlaggedNotes, getTrashedNotes, getArchivedNotes, getFavoriteNotes,
    importBackup, exportBackup, emptyTrash,
  }), [
    notes, notebooks, tags, isLoading,
    createNote, updateNote, deleteNote, trashNote, restoreNote, pinNote, flagNote, favoriteNote,
    archiveNote, duplicateNote, getNoteById, createNotebook, updateNotebook, deleteNotebook,
    getNotesByNotebook, addTag, removeTag, searchNotes, getRecentNotes,
    getPinnedNotes, getFlaggedNotes, getTrashedNotes, getArchivedNotes, getFavoriteNotes,
    importBackup, exportBackup, emptyTrash,
  ]);

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes() {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error('useNotes must be used within NotesProvider');
  return ctx;
}
