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

// ─── Markdown helpers ─────────────────────────────────────────────────────────

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
  if (note.content) lines.push(note.content);
  lines.push('');
  return lines.join('\n');
}

function markdownToNote(markdown: string, notebooks: Notebook[]): Partial<Note> {
  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const result: Partial<Note> = {
    notebookId: notebooks[0]?.id || null,
    tags: [], color: 'none', isPinned: false, isFlagged: false,
    isArchived: false, isTrashed: false, isLocked: false, isFavorite: false,
    type: 'text', hasHandwriting: false, hasAudio: false, hasImages: false,
    templateId: 'blank', pageCount: 1, emoji: null,
  };

  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    let body = frontmatterMatch[2].trim();
    const titleMatch = frontmatter.match(/^title:\s*"?([^"\n]+)"?$/m);
    if (titleMatch) result.title = titleMatch[1].trim();
    const tagsMatch = frontmatter.match(/^tags:\s*\[([^\]]*)\]$/m);
    if (tagsMatch) {
      result.tags = tagsMatch[1].split(',').map(t => t.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    }
    const colorMatch = frontmatter.match(/^color:\s*(.+)$/m);
    if (colorMatch) result.color = colorMatch[1].trim() as any;
    if (frontmatter.match(/^pinned:\s*true$/m)) result.isPinned = true;
    if (frontmatter.match(/^flagged:\s*true$/m)) result.isFlagged = true;
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

// ─── Web file picker (more reliable than DocumentPicker on web) ───────────────

function webFilePicker(
  accept: string
): Promise<{ name: string; content: string } | null> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    document.body.appendChild(input);

    // Clean up on focus return (cancel case)
    let settled = false;
    const cleanup = () => {
      if (document.body.contains(input)) document.body.removeChild(input);
    };

    input.onchange = async () => {
      settled = true;
      const file = input.files?.[0];
      cleanup();
      if (!file) { resolve(null); return; }
      try {
        const content = await file.text();
        resolve({ name: file.name, content });
      } catch {
        resolve(null);
      }
    };

    // Detect cancel via window focus after dialog closes
    const onFocus = () => {
      setTimeout(() => {
        if (!settled) {
          settled = true;
          cleanup();
          resolve(null);
        }
        window.removeEventListener('focus', onFocus);
      }, 500);
    };
    window.addEventListener('focus', onFocus);

    input.click();
  });
}

// ─── Web blob download ────────────────────────────────────────────────────────

function webDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Export functions ─────────────────────────────────────────────────────────

export async function exportNotesToJSON(
  notes: Note[], notebooks: Notebook[], tags: Tag[], includeHandwriting = true
): Promise<ExportResult> {
  try {
    let strokesMap: Record<string, Stroke[]> = {};
    if (includeHandwriting) {
      for (const note of notes.filter(n => n.hasHandwriting)) {
        const strokes = await Storage.get<Stroke[]>(STORAGE_KEYS.STROKES(note.id));
        if (strokes && strokes.length > 0) strokesMap[note.id] = strokes;
      }
    }
    const backup: BackupData = {
      version: '1.0.0', exportedAt: new Date().toISOString(), app: 'Ishu Notes',
      notes: notes.filter(n => !n.isTrashed), notebooks, tags,
      strokesMap: includeHandwriting ? strokesMap : undefined,
    };
    const jsonString = JSON.stringify(backup, null, 2);
    if (Platform.OS === 'web') {
      webDownload(jsonString, `ishu-notes-backup-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
      return { success: true, message: `✅ Backup downloaded! (${notes.filter(n => !n.isTrashed).length} notes)` };
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
      webDownload(markdown, `${note.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`, 'text/markdown');
      return { success: true, message: '✅ Note exported as Markdown!' };
    } else {
      await Clipboard.setStringAsync(markdown);
      return { success: true, message: 'Markdown copied to clipboard!' };
    }
  } catch (e: any) {
    return { success: false, message: `Export failed: ${e.message}` };
  }
}

export async function exportNoteAsText(note: Note): Promise<ExportResult> {
  try {
    const lines: string[] = [
      note.title, '='.repeat(note.title.length), '',
      `Date: ${new Date(note.modifiedAt).toLocaleString()}`,
    ];
    if (note.tags.length > 0) lines.push(`Tags: ${note.tags.map(t => '#' + t).join(' ')}`);
    lines.push('', '─'.repeat(40), '');
    const plainContent = note.content
      .replace(/#{1,6}\s/g, '').replace(/\*\*/g, '').replace(/\*/g, '')
      .replace(/`/g, '').replace(/~~|__/g, '');
    lines.push(plainContent);
    const text = lines.join('\n');
    if (Platform.OS === 'web') {
      webDownload(text, `${note.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`, 'text/plain');
      return { success: true, message: '✅ Note exported as text!' };
    } else {
      await Share.share({ title: note.title, message: text });
      return { success: true, message: 'Share sheet opened!' };
    }
  } catch (e: any) {
    return { success: false, message: `Export failed: ${e.message}` };
  }
}

export async function exportNoteAsHTML(note: Note): Promise<ExportResult> {
  try {
    const htmlContent = note.content
      .split('\n').map(line => {
        if (line.startsWith('### ')) return `<h3>${line.slice(4)}</h3>`;
        if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
        if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`;
        if (line.startsWith('- ')) return `<li>${line.slice(2)}</li>`;
        if (line.startsWith('> ')) return `<blockquote>${line.slice(2)}</blockquote>`;
        if (line === '---') return '<hr>';
        return line ? `<p>${line}</p>` : '<br>';
      }).join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${note.title}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 720px; margin: 40px auto; padding: 0 20px; color: #1f2937; line-height: 1.7; }
  h1 { font-size: 2rem; font-weight: 900; color: #111827; margin-bottom: 8px; }
  h2 { font-size: 1.5rem; font-weight: 800; color: #1f2937; }
  h3 { font-size: 1.2rem; font-weight: 700; color: #374151; }
  blockquote { border-left: 4px solid #6366f1; margin: 16px 0; padding: 12px 16px; background: #f0f4ff; border-radius: 0 8px 8px 0; }
  code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
  .meta { color: #6b7280; font-size: 0.85rem; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #f3f4f6; }
</style>
</head>
<body>
<h1>${note.title}</h1>
<div class="meta">
  ${new Date(note.modifiedAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
  ${note.tags.length > 0 ? ' · ' + note.tags.map(t => `<span>#${t}</span>`).join(' ') : ''}
</div>
${htmlContent}
</body>
</html>`;

    if (Platform.OS === 'web') {
      webDownload(html, `${note.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.html`, 'text/html');
      return { success: true, message: '✅ Note exported as HTML!' };
    } else {
      await Clipboard.setStringAsync(html);
      return { success: true, message: 'HTML copied to clipboard!' };
    }
  } catch (e: any) {
    return { success: false, message: `Export failed: ${e.message}` };
  }
}

export async function exportAllAsMarkdownZip(notes: Note[]): Promise<ExportResult> {
  try {
    const activeNotes = notes.filter(n => !n.isTrashed);
    const allMarkdown = activeNotes
      .map(note => `${'='.repeat(60)}\nFILE: ${note.title}.md\n${'='.repeat(60)}\n\n${noteToMarkdown(note)}`)
      .join('\n\n');
    if (Platform.OS === 'web') {
      webDownload(allMarkdown, `ishu-notes-all-${new Date().toISOString().split('T')[0]}.txt`, 'text/plain');
      return { success: true, message: `✅ ${activeNotes.length} notes exported!` };
    } else {
      await Clipboard.setStringAsync(allMarkdown);
      return { success: true, message: `${activeNotes.length} notes copied to clipboard!` };
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
        return { success: true, message: 'Copied to clipboard!' };
      }
    } else {
      await Share.share({ title: note.title, message: text });
      return { success: true, message: 'Share sheet opened!' };
    }
  } catch (e: any) {
    if (e.message !== 'User did not share') return { success: false, message: `Share failed: ${e.message}` };
    return { success: true, message: '' };
  }
}

export async function copyNoteToClipboard(note: Note): Promise<ExportResult> {
  try {
    await Clipboard.setStringAsync(`${note.title}\n\n${note.content}`);
    return { success: true, message: '✅ Note copied to clipboard!' };
  } catch (e: any) {
    return { success: false, message: `Copy failed: ${e.message}` };
  }
}

// ─── Import functions ─────────────────────────────────────────────────────────

export async function importFromJSON(
  jsonString: string, currentNotebooks: Notebook[]
): Promise<{ notes: Note[]; notebooks: Notebook[]; tags: Tag[]; error?: string }> {
  try {
    const data = JSON.parse(jsonString) as BackupData;
    if (!data.notes || !Array.isArray(data.notes))
      return { notes: [], notebooks: [], tags: [], error: 'Invalid backup file: missing notes array' };
    if (data.app && data.app !== 'Ishu Notes')
      return { notes: [], notebooks: [], tags: [], error: 'This backup is from a different app' };

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
        ? idMap[note.notebookId] : (currentNotebooks[0]?.id || null);
      return { ...note, id: newId, notebookId: newNotebookId, createdAt: note.createdAt || now, modifiedAt: note.modifiedAt || now, isTrashed: false, isArchived: false };
    });

    if (data.strokesMap) {
      for (const [oldNoteId, strokes] of Object.entries(data.strokesMap)) {
        const newNote = importedNotes.find((_, i) => data.notes[i]?.id === oldNoteId);
        if (newNote) await Storage.set(STORAGE_KEYS.STROKES(newNote.id), strokes);
      }
    }

    const importedTags: Tag[] = (data.tags || []).map(tag => ({ ...tag, id: (Math.random() * 1e9 | 0).toString(36) }));
    return { notes: importedNotes, notebooks: importedNotebooks, tags: importedTags };
  } catch (e: any) {
    return { notes: [], notebooks: [], tags: [], error: `Parse error: ${e.message}` };
  }
}

export async function importFromMarkdown(markdown: string, notebooks: Notebook[]): Promise<Partial<Note>> {
  return markdownToNote(markdown, notebooks);
}

export async function pickAndImportFile(
  notebooks: Notebook[]
): Promise<{ type: 'json' | 'markdown' | 'text' | 'error'; data?: BackupData | Partial<Note>; raw?: string; error?: string }> {
  try {
    let content = '';
    let name = '';

    if (Platform.OS === 'web') {
      // Use native browser file input — much more reliable than DocumentPicker on web
      const result = await webFilePicker('.json,.md,.markdown,.txt,application/json,text/plain,text/markdown');
      if (!result) return { type: 'error', error: 'No file selected' };
      content = result.content;
      name = result.name;
    } else {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', 'text/markdown', 'text/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets || result.assets.length === 0)
        return { type: 'error', error: 'No file selected' };

      const asset = result.assets[0];
      name = asset.name || '';
      try {
        const FileSystem = await import('expo-file-system');
        content = await FileSystem.default.readAsStringAsync(asset.uri, { encoding: FileSystem.default.EncodingType.UTF8 });
      } catch {
        const response = await fetch(asset.uri);
        content = await response.text();
      }
    }

    if (name.endsWith('.json')) {
      try {
        const data = JSON.parse(content) as BackupData;
        return { type: 'json', data, raw: content };
      } catch {
        return { type: 'error', error: 'Invalid JSON file — could not parse' };
      }
    } else if (name.endsWith('.md') || name.endsWith('.markdown')) {
      const note = markdownToNote(content, notebooks);
      return { type: 'markdown', data: note, raw: content };
    } else {
      const note: Partial<Note> = {
        title: name.replace(/\.[^.]+$/, '') || 'Imported Note',
        content, type: 'text', notebookId: notebooks[0]?.id || null,
        tags: [], color: 'none', isPinned: false, isFlagged: false,
        isArchived: false, isTrashed: false, isLocked: false, isFavorite: false,
        hasHandwriting: false, hasAudio: false, hasImages: false,
        templateId: 'blank', pageCount: 1, emoji: null,
        wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
        readingTime: 1, createdAt: new Date().toISOString(), modifiedAt: new Date().toISOString(),
      };
      return { type: 'text', data: note, raw: content };
    }
  } catch (e: any) {
    return { type: 'error', error: e.message };
  }
}
