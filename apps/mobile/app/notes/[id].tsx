import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  Alert, Dimensions, Modal, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { haptic } from '../../src/utils/haptics';
import { useTheme } from '../../src/context/ThemeContext';
import { useNotes, PAGE_BACKGROUNDS, PageBackground } from '../../src/context/NotesContext';
import { useDrawing } from '../../src/context/DrawingContext';
import { DrawingCanvas } from '../../src/components/DrawingCanvas';
import { PenToolbar } from '../../src/components/PenToolbar';
import { Colors } from '../../src/constants/colors';
import { Storage, STORAGE_KEYS } from '../../src/utils/storage';
import { formatFullDate, formatTime } from '../../src/utils/dateUtils';
import { NOTE_COLORS, getNoteColorHex } from '../../src/utils/noteUtils';
import { Stroke } from '../../src/context/DrawingContext';
import { shareNote, exportNoteAsMarkdown, exportNoteAsText } from '../../src/utils/exportImport';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type ViewMode = 'edit' | 'preview' | 'draw';

// ─── Markdown inline renderer ─────────────────────────────────────────────────

function inlineMarkdown(text: string, colors: any, key: number) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|~~[^~]+~~|__[^_]+__|===[^=]+===)/g);
  return parts.map((part, pi) => {
    const k = `${key}-${pi}`;
    if (part.startsWith('**') && part.endsWith('**')) return <Text key={k} style={{ fontWeight: '800' }}>{part.slice(2, -2)}</Text>;
    if (part.startsWith('*') && part.endsWith('*')) return <Text key={k} style={{ fontStyle: 'italic' }}>{part.slice(1, -1)}</Text>;
    if (part.startsWith('`') && part.endsWith('`')) return <Text key={k} style={{ fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', fontSize: 13, backgroundColor: colors.inputBg, color: colors.primary, paddingHorizontal: 4, borderRadius: 3 }}>{part.slice(1, -1)}</Text>;
    if (part.startsWith('~~') && part.endsWith('~~')) return <Text key={k} style={{ textDecorationLine: 'line-through', color: colors.textSecondary }}>{part.slice(2, -2)}</Text>;
    if (part.startsWith('__') && part.endsWith('__')) return <Text key={k} style={{ textDecorationLine: 'underline' }}>{part.slice(2, -2)}</Text>;
    if (part.startsWith('===') && part.endsWith('===')) return <Text key={k} style={{ backgroundColor: '#fef08a', color: '#78350f', paddingHorizontal: 2, borderRadius: 2 }}>{part.slice(3, -3)}</Text>;
    return <Text key={k}>{part}</Text>;
  });
}

function renderMarkdownLine(line: string, idx: number, colors: any, onToggleCheck?: (idx: number) => void): React.ReactNode {
  if (line.startsWith('# ')) return <Text key={idx} style={{ fontSize: 26, fontWeight: '800', color: colors.text, marginTop: 16, marginBottom: 6, lineHeight: 34 }}>{line.slice(2)}</Text>;
  if (line.startsWith('## ')) return <Text key={idx} style={{ fontSize: 21, fontWeight: '700', color: colors.text, marginTop: 14, marginBottom: 4, lineHeight: 28 }}>{line.slice(3)}</Text>;
  if (line.startsWith('### ')) return <Text key={idx} style={{ fontSize: 17, fontWeight: '600', color: colors.text, marginTop: 12, marginBottom: 4, lineHeight: 24 }}>{line.slice(4)}</Text>;
  if (line.startsWith('#### ')) return <Text key={idx} style={{ fontSize: 15, fontWeight: '600', color: colors.textSecondary, marginTop: 10, marginBottom: 4 }}>{line.slice(5)}</Text>;

  if (line.startsWith('> ')) return (
    <View key={idx} style={{ borderLeftWidth: 3, borderLeftColor: colors.primary, paddingLeft: 12, marginVertical: 6, backgroundColor: colors.primarySoft, borderRadius: 6, paddingVertical: 8 }}>
      <Text style={{ fontSize: 15, color: colors.textSecondary, fontStyle: 'italic', lineHeight: 22 }}>{line.slice(2)}</Text>
    </View>
  );

  if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
    const checked = line.startsWith('- [x] ');
    return (
      <TouchableOpacity key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginVertical: 4 }} onPress={() => onToggleCheck?.(idx)} activeOpacity={0.7}>
        <MaterialCommunityIcons name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'} size={18} color={checked ? colors.primary : colors.textSecondary} style={{ marginTop: 2 }} />
        <Text style={{ flex: 1, fontSize: 15, color: checked ? colors.textMuted : colors.text, lineHeight: 22, textDecorationLine: checked ? 'line-through' : 'none' }}>{line.slice(6)}</Text>
      </TouchableOpacity>
    );
  }

  if (line.startsWith('- ') || line.startsWith('* ')) return (
    <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginVertical: 3, paddingLeft: 4 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 9 }} />
      <Text style={{ flex: 1, fontSize: 15, color: colors.text, lineHeight: 22 }}>{inlineMarkdown(line.slice(2), colors, idx)}</Text>
    </View>
  );

  if (/^\d+\. /.test(line)) {
    const match = line.match(/^(\d+)\. (.*)$/);
    if (match) return (
      <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginVertical: 3, paddingLeft: 4 }}>
        <Text style={{ fontSize: 15, color: colors.primary, fontWeight: '700', minWidth: 22 }}>{match[1]}.</Text>
        <Text style={{ flex: 1, fontSize: 15, color: colors.text, lineHeight: 22 }}>{inlineMarkdown(match[2], colors, idx)}</Text>
      </View>
    );
  }

  if (line.startsWith('```')) return (
    <View key={idx} style={{ backgroundColor: colors.inputBg, borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: colors.primary, marginVertical: 6 }}>
      <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', fontSize: 13, color: colors.text, lineHeight: 20 }}>{line.replace(/^`{3}|`{3}$/, '')}</Text>
    </View>
  );

  // Table rendering
  if (line.startsWith('|') && line.endsWith('|')) {
    const cells = line.split('|').filter((_, i, a) => i !== 0 && i !== a.length - 1).map(c => c.trim());
    const isSeparator = cells.every(c => /^[-:]+$/.test(c));
    if (isSeparator) return <View key={idx} style={{ height: 1, backgroundColor: colors.border, marginVertical: 2 }} />;
    return (
      <View key={idx} style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {cells.map((cell, ci) => (
          <View key={ci} style={{ flex: 1, padding: 8, borderRightWidth: ci < cells.length - 1 ? 1 : 0, borderRightColor: colors.border }}>
            <Text style={{ fontSize: 13, color: colors.text }}>{cell}</Text>
          </View>
        ))}
      </View>
    );
  }

  if (line === '---' || line === '***' || line === '___') return <View key={idx} style={{ height: 1.5, backgroundColor: colors.border, marginVertical: 16, borderRadius: 1 }} />;
  if (line === '') return <View key={idx} style={{ height: 10 }} />;

  return <Text key={idx} style={{ fontSize: 15, color: colors.text, lineHeight: 24, marginBottom: 2 }}>{inlineMarkdown(line, colors, idx)}</Text>;
}

function MarkdownPreview({ content, colors, onToggleCheck }: { content: string; colors: any; onToggleCheck: (idx: number) => void }) {
  return <View style={{ paddingVertical: 4 }}>{content.split('\n').map((line, idx) => renderMarkdownLine(line, idx, colors, onToggleCheck))}</View>;
}

// ─── Page Background Color ────────────────────────────────────────────────────

function getPageBg(bg: PageBackground, isDark: boolean): string {
  const found = PAGE_BACKGROUNDS.find(p => p.id === bg);
  if (!found || found.id === 'none') return 'transparent';
  return isDark ? found.dark : found.light;
}

function getPageTextColor(bg: PageBackground, isDark: boolean, fallback: string): string {
  const found = PAGE_BACKGROUNDS.find(p => p.id === bg);
  if (!found || found.id === 'none' || found.textColor === 'auto') return fallback;
  return found.textColor;
}

// ─── Main Editor Screen ───────────────────────────────────────────────────────

export default function NoteEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, settings, isDark, sf, contentLineHeight } = useTheme();
  const { getNoteById, updateNote, trashNote, pinNote, flagNote, favoriteNote, duplicateNote, notebooks, addTag } = useNotes();
  const { loadStrokes, strokes, clearAll } = useDrawing();
  const insets = useSafeAreaInsets();

  const note = getNoteById(id);
  const notebook = notebooks.find(nb => nb.id === note?.notebookId);

  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [showFormatBar, setShowFormatBar] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');

  const contentRef = useRef<TextInput>(null);
  const tagInputRef = useRef<TextInput>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 0 : insets.bottom;

  useEffect(() => {
    if (!note) return;
    setTitle(note.title);
    setContent(note.content);
    if (note.hasHandwriting) {
      Storage.get<Stroke[]>(STORAGE_KEYS.STROKES(note.id)).then(saved => {
        if (saved) loadStrokes(saved);
      });
    }
  }, [note?.id]);

  const doSave = useCallback(async (t: string, c: string) => {
    if (!note) return;
    setIsSaving(true);
    await updateNote(note.id, { title: t || 'Untitled Note', content: c });
    if (note.hasHandwriting && strokes.length > 0) {
      await Storage.set(STORAGE_KEYS.STROKES(note.id), strokes);
    }
    setHasUnsavedChanges(false);
    setIsSaving(false);
  }, [note, updateNote, strokes]);

  const scheduleAutoSave = useCallback((t: string, c: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setHasUnsavedChanges(true);
    if (settings.autoSave) {
      saveTimerRef.current = setTimeout(() => doSave(t, c), 1500);
    }
  }, [doSave, settings.autoSave]);

  const handleTitleChange = (t: string) => { setTitle(t); scheduleAutoSave(t, content); };
  const handleContentChange = (c: string) => { setContent(c); scheduleAutoSave(title, c); };

  const handleBack = async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    await doSave(title, content);
    haptic.light();
    router.back();
  };

  // ── Format helpers ───────────────────────────────────────────────────────────

  const insertFormatting = useCallback((prefix: string, suffix: string = '') => {
    const newContent = content + prefix + suffix;
    setContent(newContent);
    scheduleAutoSave(title, newContent);
    setTimeout(() => contentRef.current?.focus(), 50);
  }, [content, title, scheduleAutoSave]);

  const insertBlock = useCallback((block: string) => {
    const newContent = content + (content.endsWith('\n') || !content ? '' : '\n') + block;
    setContent(newContent);
    scheduleAutoSave(title, newContent);
    setTimeout(() => contentRef.current?.focus(), 50);
  }, [content, title, scheduleAutoSave]);

  // ── Checkbox toggle ──────────────────────────────────────────────────────────

  const handleToggleCheck = useCallback((lineIdx: number) => {
    const lines = content.split('\n');
    const line = lines[lineIdx];
    if (line.startsWith('- [ ] ')) lines[lineIdx] = '- [x] ' + line.slice(6);
    else if (line.startsWith('- [x] ')) lines[lineIdx] = '- [ ] ' + line.slice(6);
    const newContent = lines.join('\n');
    setContent(newContent);
    scheduleAutoSave(title, newContent);
    haptic.light();
  }, [content, title, scheduleAutoSave]);

  // ── Tag management ───────────────────────────────────────────────────────────

  const handleAddTag = async () => {
    const tag = newTag.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!tag || !note || note.tags.includes(tag)) { setNewTag(''); setShowTagInput(false); return; }
    await updateNote(note.id, { tags: [...note.tags, tag] });
    await addTag(tag);
    setNewTag(''); setShowTagInput(false);
    haptic.success();
  };

  const handleRemoveTag = async (tag: string) => {
    if (!note) return;
    await updateNote(note.id, { tags: note.tags.filter(t => t !== tag) });
    haptic.light();
  };

  // ── Export/Share ─────────────────────────────────────────────────────────────

  const handleShare = async () => {
    if (!note) return;
    const result = await shareNote({ ...note, title, content });
    if (result.message) Alert.alert('Share', result.message);
  };

  const handleExport = () => {
    if (!note) return;
    Alert.alert('Export Note', 'Choose export format:', [
      {
        text: '📄 Markdown (.md)', onPress: async () => {
          const r = await exportNoteAsMarkdown({ ...note, title, content });
          if (r.message) Alert.alert('Export', r.message);
        }
      },
      {
        text: '📃 Plain Text (.txt)', onPress: async () => {
          const r = await exportNoteAsText({ ...note, title, content });
          if (r.message) Alert.alert('Export', r.message);
        }
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ── Computed ─────────────────────────────────────────────────────────────────

  const wordCount = useMemo(() => content.trim().split(/\s+/).filter(w => w.length > 0).length, [content]);
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  const charCount = content.length;
  const todoTotal = (content.match(/^- \[[ x]\] /gm) || []).length;
  const todoDone = (content.match(/^- \[x\] /gm) || []).length;

  const colorHex = note ? getNoteColorHex(note.color, isDark) : '';
  const pageBg = note?.pageBackground || 'none';
  const pageBackground = getPageBg(pageBg, isDark);
  const pageTextColor = getPageTextColor(pageBg, isDark, colors.text);
  const isDarkPage = pageBg === 'dark' || pageBg === 'charcoal';

  const FORMAT_TOOLS = [
    { icon: 'format-bold',            label: 'B',     action: () => insertFormatting('**', '**') },
    { icon: 'format-italic',          label: 'I',     action: () => insertFormatting('*', '*') },
    { icon: 'format-underline',       label: 'U',     action: () => insertFormatting('__', '__') },
    { icon: 'format-strikethrough',   label: 'S',     action: () => insertFormatting('~~', '~~') },
    { icon: 'marker',                 label: 'HL',    action: () => insertFormatting('===', '===') },
    { icon: 'code-tags',              label: 'Code',  action: () => insertFormatting('`', '`') },
    { icon: 'format-header-1',        label: 'H1',    action: () => insertBlock('\n# ') },
    { icon: 'format-header-2',        label: 'H2',    action: () => insertBlock('\n## ') },
    { icon: 'format-header-3',        label: 'H3',    action: () => insertBlock('\n### ') },
    { icon: 'format-list-bulleted',   label: 'List',  action: () => insertBlock('\n- ') },
    { icon: 'format-list-numbered',   label: '1.',    action: () => insertBlock('\n1. ') },
    { icon: 'checkbox-marked-outline',label: 'Todo',  action: () => insertBlock('\n- [ ] ') },
    { icon: 'format-quote-open',      label: 'Quote', action: () => insertBlock('\n> ') },
    { icon: 'table',                  label: 'Table', action: () => insertBlock('\n| Col 1 | Col 2 | Col 3 |\n|-------|-------|-------|\n| Cell  | Cell  | Cell  |\n') },
    { icon: 'code-block',             label: 'Block', action: () => insertBlock('\n```\n\n```\n') },
    { icon: 'minus',                  label: 'HR',    action: () => insertBlock('\n---\n') },
    { icon: 'math-compass',           label: 'Math',  action: () => insertFormatting('$', '$') },
  ];

  if (!note) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <MaterialCommunityIcons name="note-remove-outline" size={48} color={colors.textMuted} />
        <Text style={{ color: colors.textSecondary, marginTop: 12, fontSize: 16 }}>Note not found</Text>
        <TouchableOpacity style={{ backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, marginTop: 16 }} onPress={() => router.back()}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const headerBg = colorHex ? colorHex + '55' : colors.surface;
  const isDrawing = viewMode === 'draw';

  // ── RENDER ───────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      {!focusMode && (
        <View style={[styles.header, { paddingTop: topPad + 4, backgroundColor: headerBg, borderBottomColor: colors.border }]}>
          <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.inputBg }]} onPress={handleBack}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            {note.emoji ? <Text style={{ fontSize: 22 }}>{note.emoji}</Text> : null}
            <View style={{ flex: 1 }}>
              {notebook && (
                <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '500', marginBottom: 1 }} numberOfLines={1}>
                  {notebook.emoji} {notebook.title}
                </Text>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {isSaving && <MaterialCommunityIcons name="cloud-sync-outline" size={11} color={colors.textMuted} />}
                {hasUnsavedChanges && !isSaving && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.warning }} />}
                {!hasUnsavedChanges && !isSaving && <MaterialCommunityIcons name="cloud-check-outline" size={11} color={colors.success} />}
                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                  {isSaving ? 'Saving…' : hasUnsavedChanges ? 'Unsaved' : 'Saved'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.headerRight}>
            {/* Pin */}
            <TouchableOpacity
              style={[styles.headerBtn, note.isPinned && { backgroundColor: colors.primarySoft }]}
              onPress={() => { pinNote(note.id, !note.isPinned); haptic.light(); }}
            >
              <MaterialCommunityIcons name={note.isPinned ? 'pin' : 'pin-outline'} size={18} color={note.isPinned ? colors.primary : colors.text} />
            </TouchableOpacity>

            {/* Mode toggle */}
            <View style={{ flexDirection: 'row', backgroundColor: colors.inputBg, borderRadius: 10, overflow: 'hidden' }}>
              {(['edit', 'preview', 'draw'] as ViewMode[]).map((m, mi) => {
                const icons = ['pencil-outline', 'eye-outline', 'draw'];
                return (
                  <TouchableOpacity
                    key={m}
                    style={[{ width: 34, height: 30, alignItems: 'center', justifyContent: 'center' }, viewMode === m && { backgroundColor: colors.primarySoft }]}
                    onPress={() => { setViewMode(m); haptic.select(); }}
                  >
                    <MaterialCommunityIcons name={icons[mi] as any} size={16} color={viewMode === m ? colors.primary : colors.textSecondary} />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* More */}
            <TouchableOpacity style={styles.headerBtn} onPress={() => { setShowMoreMenu(true); haptic.light(); }}>
              <MaterialCommunityIcons name="dots-vertical" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Format Bar ─────────────────────────────────────────────────────── */}
      {viewMode === 'edit' && showFormatBar && !focusMode && (
        <Animated.View entering={FadeIn.duration(200)} style={[styles.formatBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 6, paddingVertical: 4, gap: 2, flexDirection: 'row', alignItems: 'center' }}>
            {/* Focus mode */}
            <TouchableOpacity style={styles.fmtBtn} onPress={() => { setFocusMode(true); haptic.select(); }}>
              <MaterialCommunityIcons name="focus-field" size={17} color={colors.textSecondary} />
            </TouchableOpacity>
            {/* Page color */}
            <TouchableOpacity
              style={[styles.fmtBtn, { position: 'relative' }]}
              onPress={() => { setShowColorPicker(true); haptic.select(); }}
            >
              <MaterialCommunityIcons name="palette" size={17} color={pageBg !== 'none' ? colors.primary : colors.textSecondary} />
              {pageBg !== 'none' && (
                <View style={{ position: 'absolute', bottom: 3, right: 3, width: 6, height: 6, borderRadius: 3, backgroundColor: pageBackground !== 'transparent' ? pageBackground : colors.primary }} />
              )}
            </TouchableOpacity>
            <View style={styles.fmtDivider} />
            {FORMAT_TOOLS.map(({ icon, label, action }) => (
              <TouchableOpacity key={label} style={styles.fmtBtn} onPress={() => { action(); haptic.light(); }}>
                <MaterialCommunityIcons name={icon as any} size={17} color={colors.text} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* ── Drawing Mode ─────────────────────────────────────────────────────── */}
      {isDrawing ? (
        <View style={{ flex: 1 }}>
          <DrawingCanvas width={SCREEN_W} height={SCREEN_H * 0.72} />
          <PenToolbar
            canUndo={strokes.length > 0}
            canRedo={false}
            onClear={() => Alert.alert('Clear Canvas', 'Remove all strokes?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear', style: 'destructive', onPress: () => { clearAll(); haptic.success(); } },
            ])}
          />
        </View>

      ) : viewMode === 'preview' ? (
        // ── Preview Mode ─────────────────────────────────────────────────────
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={[{ padding: 20 }, pageBackground !== 'transparent' ? { backgroundColor: pageBackground } : {}]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={{ fontSize: 30, fontWeight: '800', color: pageTextColor, marginBottom: 6, lineHeight: 38 }}>{title || 'Untitled Note'}</Text>
          <Text style={{ fontSize: 12, color: pageTextColor, opacity: 0.6, marginBottom: 10 }}>
            {formatFullDate(note.modifiedAt)} · {wordCount} words · {readingTime} min read
          </Text>

          {/* Tags */}
          {note.tags.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {note.tags.map(tag => (
                <View key={tag} style={{ backgroundColor: colors.primarySoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Todo progress */}
          {todoTotal > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <View style={{ flex: 1, height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ height: '100%', borderRadius: 3, backgroundColor: colors.primary, width: `${(todoDone / todoTotal) * 100}%` as any }} />
              </View>
              <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>{todoDone}/{todoTotal} done</Text>
            </View>
          )}

          <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 16, opacity: 0.5 }} />
          <MarkdownPreview content={content || '*No content yet. Tap Edit to start writing.*'} colors={{ ...colors, text: pageTextColor }} onToggleCheck={handleToggleCheck} />
          <View style={{ height: 80 }} />
        </ScrollView>

      ) : (
        // ── Edit Mode ────────────────────────────────────────────────────────
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={[
            { padding: 20 },
            pageBackground !== 'transparent' ? { backgroundColor: pageBackground } : {},
            focusMode ? { paddingHorizontal: 28 } : {},
          ]}
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {focusMode && (
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginBottom: 16, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.inputBg + 'aa', borderRadius: 20 }}
              onPress={() => setFocusMode(false)}
            >
              <MaterialCommunityIcons name="close" size={13} color={colors.textMuted} />
              <Text style={{ fontSize: 12, color: colors.textMuted }}>Exit Focus</Text>
            </TouchableOpacity>
          )}

          {/* Title */}
          <TextInput
            style={[styles.titleInput, {
              fontSize: sf(focusMode ? 30 : 26),
              lineHeight: sf(focusMode ? 38 : 34),
              color: pageTextColor,
              fontWeight: focusMode ? '800' : '700',
            }]}
            value={title}
            onChangeText={handleTitleChange}
            placeholder="Title"
            placeholderTextColor={pageTextColor + '66'}
            multiline
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => contentRef.current?.focus()}
            selectionColor={colors.primary}
          />

          {/* Meta */}
          {!focusMode && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Text style={{ fontSize: 12, color: pageTextColor, opacity: 0.5 }}>{formatFullDate(note.modifiedAt)}</Text>
              {note.isPinned && <MaterialCommunityIcons name="pin" size={12} color={colors.primary} />}
              {note.isFlagged && <MaterialCommunityIcons name="flag" size={12} color={colors.warning} />}
              {note.isFavorite && <MaterialCommunityIcons name="heart" size={12} color="#ef4444" />}
            </View>
          )}

          {/* Inline tag editor */}
          {!focusMode && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14, alignItems: 'center' }}>
              {note.tags.map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: colors.primarySoft }}
                  onPress={() => handleRemoveTag(tag)}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>#{tag}</Text>
                  <MaterialCommunityIcons name="close" size={10} color={colors.primary} />
                </TouchableOpacity>
              ))}
              {showTagInput ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: colors.inputBg, borderWidth: 1.5, borderColor: colors.primary, minWidth: 80 }}>
                  <TextInput
                    ref={tagInputRef}
                    style={{ fontSize: 12, color: colors.text, minWidth: 50, padding: 0 }}
                    value={newTag}
                    onChangeText={setNewTag}
                    placeholder="tag name"
                    placeholderTextColor={colors.textMuted}
                    autoFocus autoCapitalize="none"
                    onSubmitEditing={handleAddTag}
                    onBlur={() => { if (!newTag.trim()) setShowTagInput(false); }}
                    returnKeyType="done"
                  />
                  <TouchableOpacity onPress={handleAddTag}>
                    <MaterialCommunityIcons name="check" size={16} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: colors.inputBg + 'aa' }}
                  onPress={() => { setShowTagInput(true); setTimeout(() => tagInputRef.current?.focus(), 50); }}
                >
                  <MaterialCommunityIcons name="tag-plus-outline" size={13} color={pageTextColor + '88'} />
                  <Text style={{ fontSize: 12, color: pageTextColor + '88' }}>tag</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Content */}
          <TextInput
            ref={contentRef}
            style={[styles.contentInput, {
              fontSize: sf(focusMode ? 18 : 16),
              lineHeight: contentLineHeight(focusMode ? 18 : 16),
              color: pageTextColor,
            }]}
            value={content}
            onChangeText={handleContentChange}
            placeholder={`Start writing…\n\nTips:\n  # Heading  ## Heading2\n  **bold**  *italic*\n  - list  - [ ] todo  - [x] done\n  > blockquote  \`code\`\n  ===highlight===  ~~strikethrough~~`}
            placeholderTextColor={pageTextColor + '55'}
            multiline
            textAlignVertical="top"
            selectionColor={colors.primary}
            spellCheck={settings.spellCheck}
            autoCapitalize="sentences"
          />

          {/* Todo progress in edit mode */}
          {todoTotal > 0 && !focusMode && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}>
              <View style={{ flex: 1, height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ height: '100%', borderRadius: 3, backgroundColor: colors.primary, width: `${(todoDone / todoTotal) * 100}%` as any }} />
              </View>
              <Text style={{ fontSize: 11, color: pageTextColor, opacity: 0.6, fontWeight: '600' }}>{todoDone}/{todoTotal} done</Text>
            </View>
          )}

          <View style={{ height: 160 }} />
        </ScrollView>
      )}

      {/* ── Bottom Status Bar ─────────────────────────────────────────────────── */}
      {!isDrawing && !focusMode && (
        <View style={[styles.statusBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: botPad }]}>
          <Text style={{ flex: 1, fontSize: 12, color: colors.textMuted }}>{wordCount} words · {charCount} chars · {readingTime} min</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={{ padding: 4 }} onPress={() => { setShowInfo(v => !v); haptic.select(); }}>
              <MaterialCommunityIcons name="information-outline" size={16} color={showInfo ? colors.primary : colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={{ padding: 4 }} onPress={() => { setShowFormatBar(v => !v); haptic.select(); }}>
              <MaterialCommunityIcons name={showFormatBar ? 'format-text' : 'format-text-variant-outline'} size={16} color={showFormatBar ? colors.primary : colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Info Panel ────────────────────────────────────────────────────────── */}
      {showInfo && !isDrawing && (
        <Animated.View entering={FadeInUp.duration(200)} style={[styles.infoPanel, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Note Info</Text>
            <TouchableOpacity onPress={() => setShowInfo(false)}>
              <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
            {[
              { icon: 'calendar-outline', label: 'Created', value: formatFullDate(note.createdAt) },
              { icon: 'clock-edit-outline', label: 'Modified', value: formatTime(note.modifiedAt) },
              { icon: 'text', label: 'Words', value: String(wordCount) },
              { icon: 'checkbox-marked-outline', label: 'Todos', value: `${todoDone}/${todoTotal}` },
            ].map(({ icon, label, value }) => (
              <View key={label} style={{ flex: 1, alignItems: 'center' }}>
                <MaterialCommunityIcons name={icon as any} size={14} color={colors.textMuted} />
                <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</Text>
                <Text style={{ fontSize: 13, color: colors.text, fontWeight: '600', marginTop: 1 }}>{value}</Text>
              </View>
            ))}
          </View>

          {/* Card Color */}
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>CARD ACCENT COLOR</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {NOTE_COLORS.map(nc => (
              <TouchableOpacity
                key={nc.id}
                style={[{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: nc.id === 'none' ? colors.inputBg : (isDark ? nc.darkHex : nc.hex) }, note.color === nc.id && { borderWidth: 2.5, borderColor: colors.text }]}
                onPress={() => { updateNote(note.id, { color: nc.id }); haptic.select(); }}
              >
                {nc.id === 'none' && <MaterialCommunityIcons name="close" size={12} color={colors.textMuted} />}
                {note.color === nc.id && nc.id !== 'none' && <MaterialCommunityIcons name="check" size={12} color="#fff" />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Note properties row */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { icon: note.isPinned ? 'pin' : 'pin-outline', label: note.isPinned ? 'Pinned' : 'Pin', onPress: () => { pinNote(note.id, !note.isPinned); haptic.select(); }, active: note.isPinned },
              { icon: note.isFlagged ? 'flag' : 'flag-outline', label: note.isFlagged ? 'Flagged' : 'Flag', onPress: () => { flagNote(note.id, !note.isFlagged); haptic.select(); }, active: note.isFlagged },
              { icon: note.isFavorite ? 'heart' : 'heart-outline', label: note.isFavorite ? 'Favorited' : 'Favorite', onPress: () => { favoriteNote(note.id, !note.isFavorite); haptic.select(); }, active: note.isFavorite },
            ].map(({ icon, label, onPress, active }) => (
              <TouchableOpacity
                key={label}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 7, borderRadius: 10, backgroundColor: active ? colors.primarySoft : colors.inputBg }}
                onPress={onPress}
              >
                <MaterialCommunityIcons name={icon as any} size={14} color={active ? colors.primary : colors.textSecondary} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: active ? colors.primary : colors.textSecondary }}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      )}

      {/* ── Page Color Picker Modal ────────────────────────────────────────────── */}
      <Modal visible={showColorPicker} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowColorPicker(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={styles.sheetHandle} />
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 4 }}>Page Background</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 18 }}>Choose the background color for your writing area</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {PAGE_BACKGROUNDS.map((bg) => {
                  const bgColor = isDark ? bg.dark : bg.light;
                  const isSelected = note.pageBackground === bg.id;
                  const isTransparent = bg.id === 'none';
                  return (
                    <TouchableOpacity
                      key={bg.id}
                      style={[styles.bgSwatch, {
                        backgroundColor: isTransparent ? colors.inputBg : bgColor,
                        borderWidth: isSelected ? 2.5 : 1,
                        borderColor: isSelected ? colors.primary : colors.border,
                      }]}
                      onPress={() => { updateNote(note.id, { pageBackground: bg.id }); haptic.select(); setShowColorPicker(false); }}
                    >
                      {isTransparent && (
                        <MaterialCommunityIcons name="cancel" size={18} color={colors.textMuted} />
                      )}
                      {isSelected && !isTransparent && (
                        <View style={[styles.bgSwatchCheck, { backgroundColor: colors.primary }]}>
                          <MaterialCommunityIcons name="check" size={11} color="#fff" />
                        </View>
                      )}
                      <Text style={{ fontSize: 10, color: isTransparent ? colors.textMuted : bg.textColor === 'auto' ? colors.text : bg.textColor, fontWeight: isSelected ? '700' : '500', marginTop: 4 }} numberOfLines={1}>{bg.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={{ height: 32 }} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── More Menu ────────────────────────────────────────────────────────── */}
      <Modal visible={showMoreMenu} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setShowMoreMenu(false)}>
          <Animated.View entering={FadeInDown.duration(220)} style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={styles.sheetHandle} />
            {[
              { icon: note.isPinned ? 'pin-off-outline' : 'pin-outline', label: note.isPinned ? 'Unpin' : 'Pin Note', action: () => { pinNote(note.id, !note.isPinned); haptic.success(); setShowMoreMenu(false); }, color: colors.primary },
              { icon: note.isFlagged ? 'flag-off-outline' : 'flag-outline', label: note.isFlagged ? 'Remove Flag' : 'Flag Note', action: () => { flagNote(note.id, !note.isFlagged); haptic.success(); setShowMoreMenu(false); }, color: colors.warning },
              { icon: note.isFavorite ? 'heart-off-outline' : 'heart-outline', label: note.isFavorite ? 'Unfavorite' : 'Add to Favorites', action: () => { favoriteNote(note.id, !note.isFavorite); haptic.success(); setShowMoreMenu(false); }, color: '#ef4444' },
              { icon: 'palette-outline', label: 'Page Background Color', action: () => { setShowMoreMenu(false); setTimeout(() => setShowColorPicker(true), 300); }, color: '#8b5cf6' },
              { icon: 'content-copy', label: 'Duplicate Note', action: () => { duplicateNote(note.id); haptic.success(); setShowMoreMenu(false); }, color: colors.textSecondary },
              { icon: 'share-outline', label: 'Share Note', action: () => { setShowMoreMenu(false); handleShare(); }, color: '#3b82f6' },
              { icon: 'export-variant', label: 'Export Note', action: () => { setShowMoreMenu(false); handleExport(); }, color: '#10b981' },
              { icon: 'focus-field', label: focusMode ? 'Exit Focus Mode' : 'Enter Focus Mode', action: () => { setFocusMode(v => !v); haptic.select(); setShowMoreMenu(false); }, color: colors.textSecondary },
              { icon: 'delete-outline', label: 'Move to Trash', action: () => { setShowMoreMenu(false); Alert.alert('Move to Trash', 'Move this note to trash?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Trash', style: 'destructive', onPress: () => { trashNote(note.id); router.back(); } }]); }, color: colors.error },
            ].map(({ icon, label, action, color }) => (
              <TouchableOpacity key={label} style={styles.menuItem} onPress={action}>
                <View style={[styles.menuIcon, { backgroundColor: color + '18' }]}>
                  <MaterialCommunityIcons name={icon as any} size={18} color={color} />
                </View>
                <Text style={[styles.menuLabel, { color: color === colors.error ? colors.error : colors.text }]}>{label}</Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </Animated.View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingBottom: 8, gap: 6,
    borderBottomWidth: 1,
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 4 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  formatBar: { borderBottomWidth: 1 },
  fmtBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  fmtDivider: { width: 1, height: 20, backgroundColor: '#e5e7eb', marginHorizontal: 2, alignSelf: 'center' },
  titleInput: { marginBottom: 6, padding: 0, minHeight: 44 },
  contentInput: { padding: 0, minHeight: 260, textAlignVertical: 'top' },
  statusBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, borderTopWidth: 1 },
  infoPanel: { borderTopWidth: 1, padding: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 40, maxHeight: '85%' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#d1d5db', alignSelf: 'center', marginBottom: 16 },
  bgSwatch: {
    width: '30%', aspectRatio: 1.6,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4, paddingVertical: 6,
  },
  bgSwatchCheck: { position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 4 },
  menuIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
});
