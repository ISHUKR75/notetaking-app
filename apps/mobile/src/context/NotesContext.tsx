import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { Storage, STORAGE_KEYS } from '../utils/storage';
import { generateId, countWords, estimateReadingTime } from '../utils/noteUtils';

export type NoteColor = 'none' | 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'blue' | 'purple' | 'pink' | 'brown' | 'gray';
export type NoteType = 'text' | 'handwriting' | 'mixed' | 'voice';

export interface Note {
  id: string;
  title: string;
  content: string;
  type: NoteType;
  notebookId: string | null;
  tags: string[];
  color: NoteColor;
  isPinned: boolean;
  isFlagged: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  isLocked: boolean;
  isFavorite: boolean;
  emoji: string | null;
  createdAt: string;
  modifiedAt: string;
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
}

const NotesContext = createContext<NotesContextValue | null>(null);

const NOTEBOOK_EMOJIS = ['📓', '📔', '📒', '📕', '📗', '📘', '📙', '🗒️', '📋', '📄'];
const NOTEBOOK_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

function createDefaultNotebooks(): Notebook[] {
  return [
    {
      id: generateId(),
      title: 'Personal',
      emoji: '📓',
      color: '#6366f1',
      description: 'My personal notes',
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      noteCount: 0,
      isFavorite: false,
      isArchived: false,
      sortOrder: 'modified',
    },
    {
      id: generateId(),
      title: 'Work',
      emoji: '💼',
      color: '#3b82f6',
      description: 'Work-related notes',
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      noteCount: 0,
      isFavorite: false,
      isArchived: false,
      sortOrder: 'modified',
    },
    {
      id: generateId(),
      title: 'Ideas',
      emoji: '💡',
      color: '#f59e0b',
      description: 'Creative ideas and brainstorms',
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      noteCount: 0,
      isFavorite: false,
      isArchived: false,
      sortOrder: 'modified',
    },
  ];
}

function createSampleNotes(notebookId: string): Note[] {
  const now = new Date();
  return [
    {
      id: generateId(),
      title: 'Welcome to Ishu Notes! ✨',
      content: `**Write Freely. Think Clearly. Create Limitlessly.**

Ishu Notes is your all-in-one note-taking companion combining the best of GoodNotes, Notion, Apple Notes, and Samsung Notes.

**Key Features:**
- ✏️ Handwriting with multiple pen tools (ballpoint, fountain, brush, pencil...)
- 📝 Rich text notes with formatting
- 📚 Organize with Notebooks, Tags, and Smart Folders
- 🔍 Powerful search across all your notes
- 🌙 Beautiful dark and light themes
- 🔒 Lock notes with biometrics
- 🤖 AI-powered writing assistance

**Getting Started:**
1. Tap the **+** button to create a new note
2. Swipe right on any note for quick actions
3. Use the **Draw** tab to write with your finger or stylus
4. Organize notes into Notebooks

Enjoy your note-taking journey!`,
      type: 'text',
      notebookId,
      tags: ['welcome', 'getting-started'],
      color: 'purple',
      isPinned: true,
      isFlagged: false,
      isArchived: false,
      isTrashed: false,
      isLocked: false,
      isFavorite: false,
      emoji: '✨',
      createdAt: now.toISOString(),
      modifiedAt: now.toISOString(),
      wordCount: 80,
      readingTime: 1,
      hasHandwriting: false,
      hasAudio: false,
      hasImages: false,
      templateId: 'blank',
      pageCount: 1,
    },
    {
      id: generateId(),
      title: 'Meeting Notes — Product Review',
      content: `**Date:** ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
**Attendees:** Team Alpha

**Agenda:**
- Q3 Performance Review
- New Feature Roadmap
- Team Updates

**Discussion Notes:**
The team reviewed the Q3 metrics and discussed priorities for Q4. Key decisions were made around the new AI features and mobile app improvements.

**Action Items:**
- [ ] Finalize design mockups by Friday
- [ ] Review API documentation
- [ ] Schedule user testing sessions

**Next Meeting:** Next Monday at 10 AM`,
      type: 'text',
      notebookId,
      tags: ['meeting', 'work'],
      color: 'blue',
      isPinned: false,
      isFlagged: true,
      isArchived: false,
      isTrashed: false,
      isLocked: false,
      isFavorite: false,
      emoji: null,
      createdAt: new Date(now.getTime() - 3600000).toISOString(),
      modifiedAt: new Date(now.getTime() - 1800000).toISOString(),
      wordCount: 95,
      readingTime: 1,
      hasHandwriting: false,
      hasAudio: false,
      hasImages: false,
      templateId: 'blank',
      pageCount: 1,
    },
    {
      id: generateId(),
      title: 'Quick Ideas',
      content: `Random thoughts and ideas:

- Build a habit tracker integration
- Add voice-to-text for faster note creation
- Create a weekly review template
- Learn watercolor painting techniques
- Read "Atomic Habits" by James Clear

**Project Ideas:**
A note-taking app that automatically links related concepts using AI...`,
      type: 'text',
      notebookId,
      tags: ['ideas', 'personal'],
      color: 'yellow',
      isPinned: false,
      isFlagged: false,
      isArchived: false,
      isTrashed: false,
      isLocked: false,
      isFavorite: true,
      emoji: '💡',
      createdAt: new Date(now.getTime() - 86400000).toISOString(),
      modifiedAt: new Date(now.getTime() - 7200000).toISOString(),
      wordCount: 60,
      readingTime: 1,
      hasHandwriting: false,
      hasAudio: false,
      hasImages: false,
      templateId: 'blank',
      pageCount: 1,
    },
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
          setNotebooks(savedNotebooks);
          setNotes(savedNotes || []);
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
      id: generateId(),
      title: 'Untitled Note',
      content: '',
      type: 'text',
      notebookId: notebooks[0]?.id || null,
      tags: [],
      color: 'none',
      isPinned: false,
      isFlagged: false,
      isArchived: false,
      isTrashed: false,
      isLocked: false,
      isFavorite: false,
      emoji: null,
      createdAt: now,
      modifiedAt: now,
      wordCount: 0,
      readingTime: 0,
      hasHandwriting: false,
      hasAudio: false,
      hasImages: false,
      templateId: 'blank',
      pageCount: 1,
      ...partial,
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
    await updateNote(id, { isTrashed: true, isArchived: false });
  }, [updateNote]);

  const restoreNote = useCallback(async (id: string): Promise<void> => {
    await updateNote(id, { isTrashed: false });
  }, [updateNote]);

  const pinNote = useCallback(async (id: string, pinned: boolean): Promise<void> => {
    await updateNote(id, { isPinned: pinned });
  }, [updateNote]);

  const archiveNote = useCallback(async (id: string): Promise<void> => {
    await updateNote(id, { isArchived: true, isTrashed: false });
  }, [updateNote]);

  const duplicateNote = useCallback(async (id: string): Promise<Note> => {
    const note = notes.find(n => n.id === id);
    if (!note) throw new Error('Note not found');
    return createNote({ ...note, title: `${note.title} (Copy)`, isPinned: false });
  }, [notes, createNote]);

  const getNoteById = useCallback((id: string) => notes.find(n => n.id === id), [notes]);

  const createNotebook = useCallback(async (partial: Partial<Notebook> = {}): Promise<Notebook> => {
    const now = new Date().toISOString();
    const idx = notebooks.length % NOTEBOOK_EMOJIS.length;
    const newNotebook: Notebook = {
      id: generateId(),
      title: 'New Notebook',
      emoji: NOTEBOOK_EMOJIS[idx],
      color: NOTEBOOK_COLORS[idx],
      description: '',
      createdAt: now,
      modifiedAt: now,
      noteCount: 0,
      isFavorite: false,
      isArchived: false,
      sortOrder: 'modified',
      ...partial,
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
    return notes
      .filter(n => !n.isTrashed && !n.isArchived)
      .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime())
      .slice(0, limit);
  }, [notes]);

  const getPinnedNotes = useCallback(() =>
    notes.filter(n => n.isPinned && !n.isTrashed && !n.isArchived), [notes]);

  const getFlaggedNotes = useCallback(() =>
    notes.filter(n => n.isFlagged && !n.isTrashed && !n.isArchived), [notes]);

  const getTrashedNotes = useCallback(() =>
    notes.filter(n => n.isTrashed), [notes]);

  const getArchivedNotes = useCallback(() =>
    notes.filter(n => n.isArchived && !n.isTrashed), [notes]);

  const value = useMemo(() => ({
    notes,
    notebooks,
    tags,
    isLoading,
    createNote,
    updateNote,
    deleteNote,
    trashNote,
    restoreNote,
    pinNote,
    archiveNote,
    duplicateNote,
    getNoteById,
    createNotebook,
    updateNotebook,
    deleteNotebook,
    getNotesByNotebook,
    addTag,
    removeTag,
    searchNotes,
    getRecentNotes,
    getPinnedNotes,
    getFlaggedNotes,
    getTrashedNotes,
    getArchivedNotes,
  }), [
    notes, notebooks, tags, isLoading,
    createNote, updateNote, deleteNote, trashNote, restoreNote, pinNote,
    archiveNote, duplicateNote, getNoteById, createNotebook, updateNotebook,
    deleteNotebook, getNotesByNotebook, addTag, removeTag, searchNotes,
    getRecentNotes, getPinnedNotes, getFlaggedNotes, getTrashedNotes, getArchivedNotes,
  ]);

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes() {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error('useNotes must be used within NotesProvider');
  return ctx;
}
