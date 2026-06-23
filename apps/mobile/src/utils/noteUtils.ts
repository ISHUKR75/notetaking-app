import { Note, NoteColor } from '../context/NotesContext';

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function extractPlainText(content: string): string {
  if (!content) return '';
  return content
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .replace(/>\s/g, '')
    .replace(/[-*+]\s/g, '')
    .replace(/\n+/g, ' ')
    .trim();
}

export function countWords(text: string): number {
  const plain = extractPlainText(text);
  if (!plain) return 0;
  return plain.split(/\s+/).filter(w => w.length > 0).length;
}

export function estimateReadingTime(wordCount: number): number {
  return Math.ceil(wordCount / 200);
}

export function getPreviewText(content: string, maxLength = 120): string {
  const plain = extractPlainText(content);
  if (plain.length <= maxLength) return plain;
  return plain.substring(0, maxLength).trimEnd() + '…';
}

export const NOTE_COLORS: { id: NoteColor; hex: string; darkHex: string }[] = [
  { id: 'none', hex: 'transparent', darkHex: 'transparent' },
  { id: 'red', hex: '#fca5a5', darkHex: '#7f1d1d' },
  { id: 'orange', hex: '#fdba74', darkHex: '#7c2d12' },
  { id: 'yellow', hex: '#fde047', darkHex: '#713f12' },
  { id: 'green', hex: '#86efac', darkHex: '#14532d' },
  { id: 'teal', hex: '#5eead4', darkHex: '#134e4a' },
  { id: 'blue', hex: '#93c5fd', darkHex: '#1e3a5f' },
  { id: 'purple', hex: '#c4b5fd', darkHex: '#4c1d95' },
  { id: 'pink', hex: '#f9a8d4', darkHex: '#831843' },
  { id: 'brown', hex: '#d6b896', darkHex: '#78350f' },
  { id: 'gray', hex: '#d1d5db', darkHex: '#374151' },
];

export function getNoteColorHex(color: NoteColor, isDark: boolean): string {
  const found = NOTE_COLORS.find(c => c.id === color);
  if (!found || color === 'none') return '';
  return isDark ? found.darkHex : found.hex;
}

export function sortNotes(notes: Note[], sortBy: 'modified' | 'created' | 'title'): Note[] {
  return [...notes].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    if (sortBy === 'created') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime();
  });
}

export function filterNotes(notes: Note[], query: string): Note[] {
  if (!query.trim()) return notes;
  const q = query.toLowerCase();
  return notes.filter(n =>
    n.title.toLowerCase().includes(q) ||
    n.content.toLowerCase().includes(q) ||
    n.tags.some(t => t.toLowerCase().includes(q))
  );
}
