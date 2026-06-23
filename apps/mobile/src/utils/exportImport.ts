import { Platform, Share, Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import { Note, Notebook, Tag } from '../context/NotesContext';
import { Storage, STORAGE_KEYS } from './storage';
import { Stroke } from '../context/DrawingContext';

export interface BackupData {
  version: string;
  exportedAt: string;
  app: string;
  notes: Note[];
  notebooks: Notebook[];
  tags: Tag[];
  strokesMap?: Record<string, Stroke[]>;
}

export interface ExportResult {
  success: boolean;
  message: string;
  data?: string;
}

function noteToMarkdown(note: Note): string {
  const lines: string[] = [];
  lines.push(`---`);
  lines.push(`title: "${note.title.replace(/"/g, '\\"')}"`);
  lines.push(`created: ${note.createdAt}`);
  lines.push(`modified: ${note.modifiedAt}`);
  if (note.tags.length > 0) lines.push(`tags: [${note.tags.map(t => `"${t}"`).join(', ')}]`);
  if (note.color !== 'none') lines.push(`color: ${note.color}`);
  if (note.isPinned) lines.push(`pinned: true`);
  if (note.isFlagged) lines.push(`flagged: true`);
  if (note.emoji) lines.push(`emoji: "${note.emoji}"`);
  lines.push(`---`);
  lines.push('');
  lines.push(`# ${note.title}`);
  lines.push('');
  if (note.content) {
    lines.push(note.content);
  }
  lines.push('');
  return lines.join('\n');
}

function markdownToNote(markdown: string, notebooks: Notebook[]): Partial<Note> {
  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const result: Partial<Note> = {
    notebookId: notebooks[0]?.id || null,
    tags: [],
    color: 'none',
    isPinned: false,
    isFlagged: false,
    isArchived: false,
    isTrashed: false,
    isLocked: false,
    isFavorite: false,
    type: 'text',
    hasHandwriting: false,
    hasAudio: false,
    hasImages: false,
    templateId: 'blank',
    pageCount: 1,
    emoji: null,
  };

  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    let body = frontmatterMatch[2].trim();

    const titleMatch = frontmatter.match(/^title:\s*"?([^"\n]+)"?$/m);
    if (titleMatch) result.title = titleMatch[1].trim();

    const tagsMatch = frontmatter.match(/^tags:\s*\[([^\]]*)\]$/m);
    if (tagsMatch) {
      result.tags = tagsMatch[1]
        .split(',')
        .map(t => t.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    }

    const colorMatch = frontmatter.match(/^color:\s*(.+)$/m);
    if (colorMatch) result.color = colorMatch[1].trim() as any;

    const pinnedMatch = frontmatter.match(/^pinned:\s*true$/m);
    if (pinnedMatch) result.isPinned = true;

    const flaggedMatch = frontmatter.match(/^flagged:\s*true$/m);
    if (flaggedMatch) result.isFlagged = true;

    const emojiMatch = frontmatter.match(/^emoji:\s*"?([^"\n]+)"?$/m);
    if (emojiMatch) result.emoji = emojiMatch[1].trim();

    body = body.replace(/^#\s+.+\n/, '').trim();
    result.content = body;
  } else {
    const headingMatch = markdown.match(/^#\s+(.+)$/m);
    if (headingMatch) result.title = headingMatch[1].trim();
    result.content = markdown.replace(/^#\s+.+\n/, '').trim();
  }

  if (!result.title) result.title = 'Imported Note';

  const now = new Date().toISOString();
  result.createdAt = now;
  result.modifiedAt = now;
  result.wordCount = (result.content?.split(/\s+/).filter(w => w.length > 0).length) || 0;
  result.readingTime = Math.max(1, Math.ceil((result.wordCount || 0) / 200));

  return result;
}

export async function exportNotesToJSON(
  notes: Note[],
  notebooks: Notebook[],
  tags: Tag[],
  includeHandwriting = true
): Promise<ExportResult> {
  try {
    let strokesMap: Record<string, Stroke[]> = {};

    if (includeHandwriting) {
      for (const note of notes.filter(n => n.hasHandwriting)) {
        const strokes = await Storage.get<Stroke[]>(STORAGE_KEYS.STROKES(note.id));
        if (strokes && strokes.length > 0) {
          strokesMap[note.id] = strokes;
        }
      }
    }

    const backup: BackupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      app: 'Ishu Notes',
      notes: notes.filter(n => !n.isTrashed),
      notebooks,
      tags,
      strokesMap: includeHandwriting ? strokesMap : undefined,
    };

    const jsonString = JSON.stringify(backup, null, 2);

    if (Platform.OS === 'web') {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ishu-notes-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return { success: true, message: `Backup downloaded! (${notes.filter(n => !n.isTrashed).length} notes)` };
    } else {
      await Clipboard.setStringAsync(jsonString);
      return { success: true, message: 'Backup copied to clipboard! Paste it in a text file to save.', data: jsonString };
    }
  } catch (e: any) {
    return { success: false, message: `Export failed: ${e.message}` };
  }
}

export async function exportNoteAsMarkdown(note: Note): Promise<ExportResult> {
  try {
    const markdown = noteToMarkdown(note);

    if (Platform.OS === 'web') {
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${note.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return { success: true, message: 'Note exported as Markdown!' };
    } else {
      const sharingAvailable = await Sharing.isAvailableAsync();
      if (sharingAvailable) {
        await Clipboard.setStringAsync(markdown);
        return { success: true, message: 'Markdown copied to clipboard!' };
      } else {
        await Clipboard.setStringAsync(markdown);
        return { success: true, message: 'Markdown copied to clipboard!' };
      }
    }
  } catch (e: any) {
    return { success: false, message: `Export failed: ${e.message}` };
  }
}

export async function exportNoteAsText(note: Note): Promise<ExportResult> {
  try {
    const lines: string[] = [];
    lines.push(note.title);
    lines.push('='.repeat(note.title.length));
    lines.push('');
    lines.push(`Date: ${new Date(note.modifiedAt).toLocaleString()}`);
    if (note.tags.length > 0) lines.push(`Tags: ${note.tags.map(t => '#' + t).join(' ')}`);
    lines.push('');
    lines.push('─'.repeat(40));
    lines.push('');
    const plainContent = note.content
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/`/g, '')
      .replace(/~~|__/g, '');
    lines.push(plainContent);

    const text = lines.join('\n');

    if (Platform.OS === 'web') {
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${note.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return { success: true, message: 'Note exported as text!' };
    } else {
      await Share.share({ title: note.title, message: text });
      return { success: true, message: 'Share sheet opened!' };
    }
  } catch (e: any) {
    return { success: false, message: `Export failed: ${e.message}` };
  }
}

export async function shareNote(note: Note): Promise<ExportResult> {
  try {
    const text = `${note.title}\n\n${note.content}`;
    if (Platform.OS === 'web') {
      if (navigator.share) {
        await navigator.share({ title: note.title, text });
        return { success: true, message: 'Shared!' };
      } else {
        await Clipboard.setStringAsync(text);
        return { success: true, message: 'Copied to clipboard (share not supported on this browser)!' };
      }
    } else {
      await Share.share({ title: note.title, message: text });
      return { success: true, message: 'Share sheet opened!' };
    }
  } catch (e: any) {
    if (e.message !== 'User did not share') {
      return { success: false, message: `Share failed: ${e.message}` };
    }
    return { success: true, message: '' };
  }
}

export async function copyNoteToClipboard(note: Note): Promise<ExportResult> {
  try {
    const text = `${note.title}\n\n${note.content}`;
    await Clipboard.setStringAsync(text);
    return { success: true, message: 'Note copied to clipboard!' };
  } catch (e: any) {
    return { success: false, message: `Copy failed: ${e.message}` };
  }
}

export async function importFromJSON(
  jsonString: string,
  currentNotebooks: Notebook[]
): Promise<{ notes: Note[]; notebooks: Notebook[]; tags: Tag[]; error?: string }> {
  try {
    const data = JSON.parse(jsonString) as BackupData;

    if (!data.notes || !Array.isArray(data.notes)) {
      return { notes: [], notebooks: [], tags: [], error: 'Invalid backup file: missing notes array' };
    }

    if (data.app && data.app !== 'Ishu Notes') {
      return { notes: [], notebooks: [], tags: [], error: 'This backup is from a different app' };
    }

    const { generateId } = await import('./noteUtils');
    const now = new Date().toISOString();
    const idMap: Record<string, string> = {};

    const importedNotebooks: Notebook[] = (data.notebooks || []).map(nb => {
      const newId = generateId();
      idMap[nb.id] = newId;
      return { ...nb, id: newId, createdAt: nb.createdAt || now, modifiedAt: nb.modifiedAt || now };
    });

    const importedNotes: Note[] = data.notes.map(note => {
      const newId = generateId();
      const newNotebookId = note.notebookId && idMap[note.notebookId]
        ? idMap[note.notebookId]
        : (currentNotebooks[0]?.id || null);
      return {
        ...note,
        id: newId,
        notebookId: newNotebookId,
        createdAt: note.createdAt || now,
        modifiedAt: note.modifiedAt || now,
        isTrashed: false,
        isArchived: false,
      };
    });

    if (data.strokesMap) {
      for (const [oldNoteId, strokes] of Object.entries(data.strokesMap)) {
        const newNote = importedNotes.find((_, i) => data.notes[i]?.id === oldNoteId);
        if (newNote) {
          await Storage.set(STORAGE_KEYS.STROKES(newNote.id), strokes);
        }
      }
    }

    const importedTags: Tag[] = (data.tags || []).map(tag => ({
      ...tag,
      id: generateId(),
    }));

    return { notes: importedNotes, notebooks: importedNotebooks, tags: importedTags };
  } catch (e: any) {
    return { notes: [], notebooks: [], tags: [], error: `Parse error: ${e.message}` };
  }
}

export async function importFromMarkdown(
  markdown: string,
  notebooks: Notebook[]
): Promise<Partial<Note>> {
  return markdownToNote(markdown, notebooks);
}

export async function pickAndImportFile(
  notebooks: Notebook[]
): Promise<{ type: 'json' | 'markdown' | 'text' | 'error'; data?: BackupData | Partial<Note>; raw?: string; error?: string }> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain', 'text/markdown', 'text/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { type: 'error', error: 'No file selected' };
    }

    const asset = result.assets[0];
    const uri = asset.uri;
    const name = asset.name || '';

    let content = '';
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      content = await response.text();
    } else {
      try {
        const FileSystem = await import('expo-file-system');
        content = await FileSystem.default.readAsStringAsync(uri, { encoding: FileSystem.default.EncodingType.UTF8 });
      } catch {
        const response = await fetch(uri);
        content = await response.text();
      }
    }

    if (name.endsWith('.json')) {
      try {
        const data = JSON.parse(content) as BackupData;
        return { type: 'json', data, raw: content };
      } catch {
        return { type: 'error', error: 'Invalid JSON file' };
      }
    } else if (name.endsWith('.md') || name.endsWith('.markdown')) {
      const note = markdownToNote(content, notebooks);
      return { type: 'markdown', data: note, raw: content };
    } else {
      const note: Partial<Note> = {
        title: name.replace(/\.[^.]+$/, '') || 'Imported Note',
        content,
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
        hasHandwriting: false,
        hasAudio: false,
        hasImages: false,
        templateId: 'blank',
        pageCount: 1,
        emoji: null,
        wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
        readingTime: 1,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
      };
      return { type: 'text', data: note, raw: content };
    }
  } catch (e: any) {
    return { type: 'error', error: e.message };
  }
}

export async function exportAllAsMarkdownZip(
  notes: Note[]
): Promise<ExportResult> {
  try {
    const activeNotes = notes.filter(n => !n.isTrashed);
    const allMarkdown = activeNotes
      .map(note => `${'='.repeat(60)}\nFILE: ${note.title}.md\n${'='.repeat(60)}\n\n${noteToMarkdown(note)}`)
      .join('\n\n');

    if (Platform.OS === 'web') {
      const blob = new Blob([allMarkdown], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ishu-notes-all-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return { success: true, message: `${activeNotes.length} notes exported!` };
    } else {
      await Clipboard.setStringAsync(allMarkdown);
      return { success: true, message: `${activeNotes.length} notes copied to clipboard!` };
    }
  } catch (e: any) {
    return { success: false, message: `Export failed: ${e.message}` };
  }
}
