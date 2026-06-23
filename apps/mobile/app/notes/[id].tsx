import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  Alert, Dimensions, Modal, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { haptic } from '../../src/utils/haptics';
import { useTheme } from '../../src/context/ThemeContext';
import { useNotes } from '../../src/context/NotesContext';
import { useDrawing } from '../../src/context/DrawingContext';
import { DrawingCanvas } from '../../src/components/DrawingCanvas';
import { PenToolbar } from '../../src/components/PenToolbar';
import { Colors } from '../../src/constants/colors';
import { Storage, STORAGE_KEYS } from '../../src/utils/storage';
import { formatFullDate, formatTime } from '../../src/utils/dateUtils';
import { NOTE_COLORS, getNoteColorHex } from '../../src/utils/noteUtils';
import { Stroke } from '../../src/context/DrawingContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type ViewMode = 'edit' | 'preview' | 'draw' | 'split';

function renderMarkdownLine(line: string, idx: number, colors: typeof Colors.light): React.ReactNode {
  const s = mdStyles(colors);
  if (line.startsWith('# ')) return <Text key={idx} style={s.h1}>{line.slice(2)}</Text>;
  if (line.startsWith('## ')) return <Text key={idx} style={s.h2}>{line.slice(3)}</Text>;
  if (line.startsWith('### ')) return <Text key={idx} style={s.h3}>{line.slice(4)}</Text>;
  if (line.startsWith('> ')) return (
    <View key={idx} style={s.blockquote}>
      <Text style={s.blockquoteText}>{line.slice(2)}</Text>
    </View>
  );
  if (line.startsWith('- [ ] ')) return (
    <View key={idx} style={s.checkRow}>
      <MaterialCommunityIcons name="checkbox-blank-outline" size={16} color={colors.textSecondary} />
      <Text style={s.checkText}>{line.slice(6)}</Text>
    </View>
  );
  if (line.startsWith('- [x] ')) return (
    <View key={idx} style={s.checkRow}>
      <MaterialCommunityIcons name="checkbox-marked" size={16} color={colors.primary} />
      <Text style={[s.checkText, s.checkDone]}>{line.slice(6)}</Text>
    </View>
  );
  if (line.startsWith('- ')) return (
    <View key={idx} style={s.bulletRow}>
      <View style={[s.bullet, { backgroundColor: colors.textMuted }]} />
      <Text style={s.bulletText}>{line.slice(2)}</Text>
    </View>
  );
  if (/^\d+\. /.test(line)) {
    const match = line.match(/^(\d+)\. (.*)$/);
    if (match) return (
      <View key={idx} style={s.bulletRow}>
        <Text style={s.numLabel}>{match[1]}.</Text>
        <Text style={s.bulletText}>{match[2]}</Text>
      </View>
    );
  }
  if (line === '---' || line === '***') return <View key={idx} style={s.hr} />;
  if (line === '') return <View key={idx} style={{ height: 10 }} />;
  const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|~~[^~]+~~|__[^_]+__)/g);
  return (
    <Text key={idx} style={s.para}>
      {parts.map((part, pi) => {
        if (part.startsWith('**') && part.endsWith('**')) return <Text key={pi} style={s.bold}>{part.slice(2, -2)}</Text>;
        if (part.startsWith('*') && part.endsWith('*')) return <Text key={pi} style={s.italic}>{part.slice(1, -1)}</Text>;
        if (part.startsWith('`') && part.endsWith('`')) return <Text key={pi} style={s.code}>{part.slice(1, -1)}</Text>;
        if (part.startsWith('~~') && part.endsWith('~~')) return <Text key={pi} style={s.strike}>{part.slice(2, -2)}</Text>;
        if (part.startsWith('__') && part.endsWith('__')) return <Text key={pi} style={s.underline}>{part.slice(2, -2)}</Text>;
        return <Text key={pi}>{part}</Text>;
      })}
    </Text>
  );
}

function MarkdownPreview({ content, colors }: { content: string; colors: typeof Colors.light }) {
  const lines = content.split('\n');
  return (
    <View style={{ paddingVertical: 4 }}>
      {lines.map((line, idx) => renderMarkdownLine(line, idx, colors))}
    </View>
  );
}

const mdStyles = (colors: typeof Colors.light) => StyleSheet.create({
  h1: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 16, marginBottom: 6, lineHeight: 36 },
  h2: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 14, marginBottom: 4, lineHeight: 30 },
  h3: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 12, marginBottom: 4, lineHeight: 24 },
  para: { fontSize: 16, color: colors.text, lineHeight: 26, marginBottom: 4 },
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  underline: { textDecorationLine: 'underline' },
  strike: { textDecorationLine: 'line-through', color: colors.textSecondary },
  code: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 14, backgroundColor: colors.inputBg,
    color: colors.primary, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4,
  },
  blockquote: {
    borderLeftWidth: 3, borderLeftColor: colors.primary,
    paddingLeft: 12, marginVertical: 6, marginLeft: 4,
  },
  blockquoteText: { fontSize: 15, color: colors.textSecondary, fontStyle: 'italic', lineHeight: 22 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginVertical: 3 },
  checkText: { flex: 1, fontSize: 15, color: colors.text, lineHeight: 22 },
  checkDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginVertical: 3, paddingLeft: 4 },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  bulletText: { flex: 1, fontSize: 15, color: colors.text, lineHeight: 22 },
  numLabel: { fontSize: 15, color: colors.textSecondary, fontWeight: '600', minWidth: 22 },
  hr: { height: 1, backgroundColor: colors.border, marginVertical: 16, marginHorizontal: 4 },
});

export default function NoteEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, settings, isDark } = useTheme();
  const { getNoteById, updateNote, trashNote, pinNote, duplicateNote, notebooks } = useNotes();
  const { loadStrokes, strokes, clearAll } = useDrawing();
  const insets = useSafeAreaInsets();

  const note = getNoteById(id);
  const notebook = notebooks.find(nb => nb.id === note?.notebookId);

  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [showFormatBar, setShowFormatBar] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showColorSheet, setShowColorSheet] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  const contentRef = useRef<TextInput>(null);
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
    saveTimerRef.current = setTimeout(() => doSave(t, c), 1500);
  }, [doSave]);

  const handleTitleChange = (t: string) => {
    setTitle(t);
    scheduleAutoSave(t, content);
  };

  const handleContentChange = (c: string) => {
    setContent(c);
    scheduleAutoSave(title, c);
  };

  const handleBack = async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    await doSave(title, content);
    haptic.light();
    router.back();
  };

  const insertFormatting = (prefix: string, suffix: string = '') => {
    const newContent = content + prefix + suffix;
    setContent(newContent);
    scheduleAutoSave(title, newContent);
    contentRef.current?.focus();
  };

  const insertBlock = (block: string) => {
    const newContent = content + (content.endsWith('\n') || !content ? '' : '\n') + block;
    setContent(newContent);
    scheduleAutoSave(title, newContent);
    contentRef.current?.focus();
  };

  const wordCount = useMemo(() => {
    const words = content.trim().split(/\s+/).filter(w => w.length > 0);
    return words.length;
  }, [content]);

  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  const charCount = content.length;
  const colorHex = note ? getNoteColorHex(note.color, isDark) : '';
  const s = styles(colors);

  const FORMAT_TOOLS = [
    { icon: 'format-bold', label: 'B', action: () => insertFormatting('**', '**') },
    { icon: 'format-italic', label: 'I', action: () => insertFormatting('*', '*') },
    { icon: 'format-underline', label: 'U', action: () => insertFormatting('__', '__') },
    { icon: 'format-strikethrough', label: 'S', action: () => insertFormatting('~~', '~~') },
    { icon: 'format-header-1', label: 'H1', action: () => insertBlock('\n# ') },
    { icon: 'format-header-2', label: 'H2', action: () => insertBlock('\n## ') },
    { icon: 'format-header-3', label: 'H3', action: () => insertBlock('\n### ') },
    { icon: 'format-list-bulleted', label: 'List', action: () => insertBlock('\n- ') },
    { icon: 'format-list-numbered', label: '1.', action: () => insertBlock('\n1. ') },
    { icon: 'checkbox-marked-outline', label: 'Todo', action: () => insertBlock('\n- [ ] ') },
    { icon: 'code-tags', label: 'Code', action: () => insertFormatting('`', '`') },
    { icon: 'format-quote-open', label: 'Quote', action: () => insertBlock('\n> ') },
    { icon: 'minus', label: 'HR', action: () => insertBlock('\n---\n') },
  ];

  if (!note) {
    return (
      <View style={[s.screen, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <MaterialCommunityIcons name="note-remove-outline" size={48} color={colors.textMuted} />
        <Text style={{ color: colors.textSecondary, marginTop: 12, fontSize: 16 }}>Note not found</Text>
        <TouchableOpacity style={[s.backBtnLg, { backgroundColor: colors.primary, marginTop: 16 }]} onPress={() => router.back()}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const headerBg = colorHex ? colorHex + '55' : colors.surface;
  const isDrawing = viewMode === 'draw';

  return (
    <KeyboardAvoidingView
      style={[s.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      {!focusMode && (
        <View style={[s.header, { paddingTop: topPad + 4, backgroundColor: headerBg }]}>
          <TouchableOpacity style={s.backBtn} onPress={handleBack}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>

          <View style={s.headerCenter}>
            {note.emoji ? (
              <Text style={s.noteEmoji}>{note.emoji}</Text>
            ) : null}
            <View>
              {notebook && (
                <Text style={s.notebookLabel} numberOfLines={1}>
                  {notebook.emoji} {notebook.title}
                </Text>
              )}
              <View style={s.saveRow}>
                {isSaving && (
                  <MaterialCommunityIcons name="cloud-sync-outline" size={13} color={colors.textMuted} />
                )}
                {hasUnsavedChanges && !isSaving && (
                  <View style={s.unsavedDot} />
                )}
                {!hasUnsavedChanges && !isSaving && (
                  <MaterialCommunityIcons name="cloud-check-outline" size={13} color={colors.success} />
                )}
                <Text style={s.saveLabel}>
                  {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Unsaved' : 'Saved'}
                </Text>
              </View>
            </View>
          </View>

          <View style={s.headerRight}>
            <TouchableOpacity
              style={[s.iconBtn, note.isPinned && s.iconBtnActive]}
              onPress={() => { pinNote(note.id, !note.isPinned); haptic.light(); }}
            >
              <MaterialCommunityIcons
                name={note.isPinned ? 'pin' : 'pin-outline'}
                size={18}
                color={note.isPinned ? colors.primary : colors.text}
              />
            </TouchableOpacity>

            {/* View mode toggle */}
            <View style={s.modeToggle}>
              {(['edit', 'preview', 'draw'] as ViewMode[]).map((m, mi) => {
                const icons = ['pencil-outline', 'eye-outline', 'draw'];
                return (
                  <TouchableOpacity
                    key={m}
                    style={[s.modeBtn, viewMode === m && s.modeBtnActive]}
                    onPress={() => { setViewMode(m); haptic.select(); }}
                  >
                    <MaterialCommunityIcons
                      name={icons[mi] as any}
                      size={16}
                      color={viewMode === m ? colors.primary : colors.textSecondary}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={s.iconBtn} onPress={() => { setShowMoreMenu(true); haptic.light(); }}>
              <MaterialCommunityIcons name="dots-vertical" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Format Bar */}
      {viewMode === 'edit' && showFormatBar && !focusMode && (
        <Animated.View entering={FadeIn.duration(200)} style={[s.formatBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.formatBarContent}>
            <TouchableOpacity style={s.formatBtn} onPress={() => { setFocusMode(true); haptic.select(); }}>
              <MaterialCommunityIcons name="focus-field" size={17} color={colors.textSecondary} />
            </TouchableOpacity>
            <View style={s.fmtDivider} />
            {FORMAT_TOOLS.map(({ icon, label, action }) => (
              <TouchableOpacity key={label} style={s.formatBtn} onPress={() => { action(); haptic.light(); }}>
                <MaterialCommunityIcons name={icon as any} size={17} color={colors.text} />
              </TouchableOpacity>
            ))}
            <View style={s.fmtDivider} />
            <TouchableOpacity style={s.formatBtn} onPress={() => { setShowColorSheet(true); haptic.light(); }}>
              <View style={[s.colorDotMini, { backgroundColor: colorHex || colors.inputBg }]} />
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      )}

      {/* Drawing Mode */}
      {isDrawing ? (
        <View style={{ flex: 1 }}>
          <DrawingCanvas width={SCREEN_W} height={SCREEN_H * 0.72} />
          <PenToolbar
            canUndo={strokes.length > 0}
            canRedo={false}
            onClear={() => { Alert.alert('Clear Canvas', 'Remove all strokes?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear', style: 'destructive', onPress: () => { clearAll(); haptic.success(); } }
            ]); }}
          />
        </View>
      ) : viewMode === 'preview' ? (
        /* Preview Mode */
        <ScrollView
          ref={scrollRef}
          style={s.scroll}
          contentContainerStyle={[s.scrollContent, colorHex ? { backgroundColor: colorHex + '22' } : {}]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.previewTitle}>{title || 'Untitled Note'}</Text>
          <Text style={s.previewMeta}>{formatFullDate(note.modifiedAt)} · {wordCount} words · {readingTime} min read</Text>
          {note.tags.length > 0 && (
            <View style={s.tagsRow}>
              {note.tags.map(tag => (
                <View key={tag} style={[s.tagBadge, { backgroundColor: colors.primarySoft }]}>
                  <Text style={[s.tagText, { color: colors.primary }]}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={s.previewDivider} />
          <MarkdownPreview content={content || '*No content yet. Switch to Edit mode to start writing.*'} colors={colors} />
          <View style={{ height: 80 }} />
        </ScrollView>
      ) : (
        /* Edit Mode */
        <ScrollView
          ref={scrollRef}
          style={s.scroll}
          contentContainerStyle={[
            s.scrollContent,
            colorHex ? { backgroundColor: colorHex + '22' } : {},
            focusMode && { paddingHorizontal: 28 },
          ]}
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {focusMode && (
            <TouchableOpacity style={s.exitFocus} onPress={() => setFocusMode(false)}>
              <MaterialCommunityIcons name="close" size={14} color={colors.textMuted} />
              <Text style={s.exitFocusText}>Exit Focus</Text>
            </TouchableOpacity>
          )}

          <TextInput
            style={[s.titleInput, focusMode && { fontSize: 30, fontWeight: '800' }]}
            value={title}
            onChangeText={handleTitleChange}
            placeholder="Title"
            placeholderTextColor={colors.textMuted}
            multiline
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => contentRef.current?.focus()}
            selectionColor={colors.primary}
          />

          {!focusMode && (
            <View style={s.metaRow}>
              <Text style={s.metaDate}>{formatFullDate(note.modifiedAt)}</Text>
              {note.isPinned && <MaterialCommunityIcons name="pin" size={13} color={colors.primary} />}
              {note.isFlagged && <MaterialCommunityIcons name="flag" size={13} color={colors.warning} />}
              {note.hasAudio && <MaterialCommunityIcons name="microphone" size={13} color={colors.textMuted} />}
            </View>
          )}

          {!focusMode && note.tags.length > 0 && (
            <View style={s.tagsRow}>
              {note.tags.map(tag => (
                <View key={tag} style={[s.tagBadge, { backgroundColor: colors.primarySoft }]}>
                  <Text style={[s.tagText, { color: colors.primary }]}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          <TextInput
            ref={contentRef}
            style={[
              s.contentInput,
              focusMode && { fontSize: 18, lineHeight: 32, color: colors.text },
            ]}
            value={content}
            onChangeText={handleContentChange}
            placeholder="Start writing…  Use # for headings, - for lists, [ ] for todos"
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
            selectionColor={colors.primary}
            spellCheck={settings.spellCheck}
            autoCapitalize="sentences"
          />
          <View style={{ height: 160 }} />
        </ScrollView>
      )}

      {/* Bottom Status Bar */}
      {!isDrawing && !focusMode && (
        <View style={[s.statusBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: botPad }]}>
          <Text style={s.statusText}>{wordCount} words · {charCount} chars · {readingTime} min</Text>
          <View style={s.statusRight}>
            <TouchableOpacity style={s.statusBtn} onPress={() => { setShowInfo(!showInfo); haptic.select(); }}>
              <MaterialCommunityIcons name="information-outline" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={s.statusBtn} onPress={() => { setShowFormatBar(v => !v); haptic.select(); }}>
              <MaterialCommunityIcons name={showFormatBar ? 'format-text' : 'format-text-variant'} size={16} color={showFormatBar ? colors.primary : colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Info Panel */}
      {showInfo && !isDrawing && (
        <Animated.View entering={FadeInDown.duration(200)} style={[s.infoPanel, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={s.infoPanelHeader}>
            <Text style={[s.infoPanelTitle, { color: colors.text }]}>Note Details</Text>
            <TouchableOpacity onPress={() => setShowInfo(false)}>
              <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={s.infoGrid}>
            <View style={s.infoCell}>
              <MaterialCommunityIcons name="calendar-outline" size={14} color={colors.textMuted} />
              <Text style={s.infoCellLabel}>Created</Text>
              <Text style={s.infoCellValue}>{formatFullDate(note.createdAt)}</Text>
            </View>
            <View style={s.infoCell}>
              <MaterialCommunityIcons name="clock-edit-outline" size={14} color={colors.textMuted} />
              <Text style={s.infoCellLabel}>Modified</Text>
              <Text style={s.infoCellValue}>{formatTime(note.modifiedAt)}</Text>
            </View>
            <View style={s.infoCell}>
              <MaterialCommunityIcons name="text" size={14} color={colors.textMuted} />
              <Text style={s.infoCellLabel}>Words</Text>
              <Text style={s.infoCellValue}>{wordCount}</Text>
            </View>
            <View style={s.infoCell}>
              <MaterialCommunityIcons name="book-open-outline" size={14} color={colors.textMuted} />
              <Text style={s.infoCellLabel}>Read time</Text>
              <Text style={s.infoCellValue}>{readingTime} min</Text>
            </View>
          </View>
          <Text style={[s.infoPanelTitle, { color: colors.text, marginBottom: 10 }]}>Color</Text>
          <View style={s.colorRow}>
            {NOTE_COLORS.map(nc => (
              <TouchableOpacity
                key={nc.id}
                style={[
                  s.colorDot,
                  { backgroundColor: nc.id === 'none' ? colors.inputBg : (isDark ? nc.darkHex : nc.hex) },
                  note.color === nc.id && s.colorDotActive,
                ]}
                onPress={() => { updateNote(note.id, { color: nc.id }); haptic.select(); }}
              >
                {nc.id === 'none' && <MaterialCommunityIcons name="close" size={12} color={colors.textMuted} />}
                {note.color === nc.id && nc.id !== 'none' && (
                  <MaterialCommunityIcons name="check" size={12} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      )}

      {/* More Menu Modal */}
      <Modal visible={showMoreMenu} transparent animationType="fade">
        <Pressable style={s.overlay} onPress={() => setShowMoreMenu(false)}>
          <Animated.View entering={FadeInDown.duration(220)} style={[s.moreSheet, { backgroundColor: colors.surface }]}>
            <View style={s.moreHandle} />
            {[
              {
                icon: note.isPinned ? 'pin-off' : 'pin',
                label: note.isPinned ? 'Unpin Note' : 'Pin Note',
                action: () => { pinNote(note.id, !note.isPinned); haptic.success(); setShowMoreMenu(false); },
                color: colors.primary,
              },
              {
                icon: note.isFlagged ? 'flag-off' : 'flag',
                label: note.isFlagged ? 'Remove Flag' : 'Flag Note',
                action: () => { updateNote(note.id, { isFlagged: !note.isFlagged }); haptic.success(); setShowMoreMenu(false); },
                color: colors.warning,
              },
              {
                icon: 'content-copy',
                label: 'Duplicate Note',
                action: () => { duplicateNote(note.id); haptic.success(); setShowMoreMenu(false); },
                color: colors.textSecondary,
              },
              {
                icon: 'share-outline',
                label: 'Share Note',
                action: () => { setShowMoreMenu(false); },
                color: colors.textSecondary,
              },
              {
                icon: 'focus-field',
                label: focusMode ? 'Exit Focus Mode' : 'Focus Mode',
                action: () => { setFocusMode(v => !v); haptic.select(); setShowMoreMenu(false); },
                color: colors.textSecondary,
              },
              {
                icon: 'delete-outline',
                label: 'Move to Trash',
                action: () => {
                  setShowMoreMenu(false);
                  Alert.alert('Move to Trash', 'This note will be moved to trash.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Trash', style: 'destructive', onPress: () => { trashNote(note.id); router.back(); } },
                  ]);
                },
                color: colors.error,
              },
            ].map(({ icon, label, action, color }) => (
              <TouchableOpacity key={label} style={s.moreItem} onPress={action}>
                <View style={[s.moreIcon, { backgroundColor: color + '18' }]}>
                  <MaterialCommunityIcons name={icon as any} size={18} color={color} />
                </View>
                <Text style={[s.moreLabel, { color: color === colors.error ? colors.error : colors.text }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = (colors: typeof Colors.light) => StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingBottom: 8, gap: 6,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: {
    width: 38, height: 38, alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, backgroundColor: colors.inputBg,
  },
  backBtnLg: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 4 },
  noteEmoji: { fontSize: 22 },
  notebookLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '500', marginBottom: 1 },
  saveRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  saveLabel: { fontSize: 11, color: colors.textMuted },
  unsavedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.warning },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  iconBtnActive: { backgroundColor: colors.primarySoft },
  modeToggle: {
    flexDirection: 'row', backgroundColor: colors.inputBg,
    borderRadius: 10, overflow: 'hidden',
  },
  modeBtn: { width: 34, height: 30, alignItems: 'center', justifyContent: 'center' },
  modeBtnActive: { backgroundColor: colors.primarySoft },
  formatBar: {
    borderBottomWidth: 1,
  },
  formatBarContent: { paddingHorizontal: 6, paddingVertical: 4, gap: 2 },
  formatBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  fmtDivider: { width: 1, height: 20, backgroundColor: colors.border, marginHorizontal: 2, alignSelf: 'center' },
  colorDotMini: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.border },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  exitFocus: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-end', marginBottom: 12,
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: colors.inputBg, borderRadius: 20,
  },
  exitFocusText: { fontSize: 12, color: colors.textMuted },
  previewTitle: { fontSize: 30, fontWeight: '800', color: colors.text, marginBottom: 6, lineHeight: 38 },
  previewMeta: { fontSize: 13, color: colors.textMuted, marginBottom: 10 },
  previewDivider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  titleInput: {
    fontSize: 26, fontWeight: '700', color: colors.text,
    marginBottom: 8, lineHeight: 34, minHeight: 44,
    padding: 0,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  metaDate: { fontSize: 12, color: colors.textMuted },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  tagBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Colors.radius.full },
  tagText: { fontSize: 12, fontWeight: '500' },
  contentInput: {
    fontSize: 16, color: colors.text,
    lineHeight: 28, minHeight: 240, padding: 0,
  },
  statusBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8,
    borderTopWidth: 1,
  },
  statusText: { flex: 1, fontSize: 12, color: colors.textMuted },
  statusRight: { flexDirection: 'row', gap: 8 },
  statusBtn: { padding: 4 },
  infoPanel: {
    borderTopWidth: 1, padding: 16, gap: 12,
  },
  infoPanelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  infoPanelTitle: { fontSize: 14, fontWeight: '700' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  infoCell: { flex: 1, minWidth: 100, gap: 3 },
  infoCellLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  infoCellValue: { fontSize: 14, color: colors.text, fontWeight: '600' },
  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorDot: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 2, borderColor: 'transparent',
    alignItems: 'center', justifyContent: 'center',
  },
  colorDotActive: { borderColor: colors.primary, borderWidth: 2 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  moreSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36, gap: 4,
  },
  moreHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: Colors.light.border, alignSelf: 'center', marginBottom: 16 },
  moreItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4 },
  moreIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  moreLabel: { fontSize: 16, fontWeight: '500' },
});
