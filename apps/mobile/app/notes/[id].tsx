import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  Alert, ActionSheetIOS, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
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

type EditorMode = 'text' | 'drawing' | 'mixed';

export default function NoteEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, settings, isDark } = useTheme();
  const { getNoteById, updateNote, trashNote, pinNote, duplicateNote } = useNotes();
  const { loadStrokes, strokes, clearAll } = useDrawing();
  const insets = useSafeAreaInsets();

  const note = getNoteById(id);
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [editorMode, setEditorMode] = useState<EditorMode>('text');
  const [showFormatBar, setShowFormatBar] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const contentRef = useRef<TextInput>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

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
      saveTimerRef.current = setTimeout(() => doSave(t, c), 2000);
    }
  }, [doSave, settings.autoSave]);

  const handleTitleChange = (t: string) => {
    setTitle(t);
    scheduleAutoSave(t, content);
  };

  const handleContentChange = (c: string) => {
    setContent(c);
    scheduleAutoSave(title, c);
  };

  const handleSave = async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    await doSave(title, content);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const handleMore = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', note?.isPinned ? 'Unpin' : 'Pin', 'Duplicate', 'Share', 'Move to Trash'],
          destructiveButtonIndex: 4,
          cancelButtonIndex: 0,
        },
        idx => {
          if (idx === 1) note && pinNote(note.id, !note.isPinned);
          if (idx === 2) note && duplicateNote(note.id);
          if (idx === 4) {
            Alert.alert('Move to Trash', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Trash', style: 'destructive', onPress: () => { note && trashNote(note.id); router.back(); } },
            ]);
          }
        }
      );
    } else {
      Alert.alert('Note Options', '', [
        { text: note?.isPinned ? 'Unpin' : 'Pin', onPress: () => note && pinNote(note.id, !note.isPinned) },
        { text: 'Duplicate', onPress: () => note && duplicateNote(note.id) },
        { text: 'Move to Trash', style: 'destructive', onPress: () => {
          note && trashNote(note.id);
          router.back();
        }},
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const insertFormatting = (prefix: string, suffix: string = '') => {
    const selection = { start: 0, end: 0 };
    const before = content.slice(0, selection.start);
    const selected = content.slice(selection.start, selection.end) || 'text';
    const after = content.slice(selection.end);
    const newContent = `${before}${prefix}${selected}${suffix}${after}`;
    setContent(newContent);
    scheduleAutoSave(title, newContent);
  };

  const insertBlock = (block: string) => {
    const newContent = content + (content.endsWith('\n') || !content ? '' : '\n') + block + '\n';
    setContent(newContent);
    scheduleAutoSave(title, newContent);
    contentRef.current?.focus();
  };

  const colorHex = note ? getNoteColorHex(note.color, isDark) : '';
  const s = styles(colors);
  const canvasH = SCREEN_H * 0.55;

  if (!note) {
    return (
      <View style={[s.screen, { backgroundColor: colors.background }]}>
        <Text style={[s.errorText, { color: colors.textSecondary }]}>Note not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[s.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[s.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity style={s.backBtn} onPress={handleSave}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          {isSaving && <MaterialCommunityIcons name="cloud-sync-outline" size={16} color={colors.textMuted} />}
          {hasUnsavedChanges && !isSaving && <View style={s.unsavedDot} />}
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity
            style={[s.modeBtn, editorMode === 'drawing' && s.modeBtnActive]}
            onPress={() => setEditorMode(editorMode === 'drawing' ? 'text' : 'drawing')}
          >
            <MaterialCommunityIcons
              name={editorMode === 'drawing' ? 'keyboard-outline' : 'draw'}
              size={20}
              color={editorMode === 'drawing' ? colors.primary : colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.modeBtn}
            onPress={() => { setShowFormatBar(!showFormatBar); Haptics.selectionAsync(); }}
          >
            <MaterialCommunityIcons name="format-text" size={20} color={showFormatBar ? colors.primary : colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={s.modeBtn} onPress={() => setShowInfo(!showInfo)}>
            <MaterialCommunityIcons name="information-outline" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={s.modeBtn} onPress={handleMore}>
            <MaterialCommunityIcons name="dots-vertical" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {showInfo && (
        <Animated.View entering={FadeIn} style={[s.infoPanel, { backgroundColor: colors.surface }]}>
          <View style={s.infoRow}>
            <MaterialCommunityIcons name="calendar-outline" size={16} color={colors.textMuted} />
            <Text style={s.infoText}>Created {formatFullDate(note.createdAt)}</Text>
          </View>
          <View style={s.infoRow}>
            <MaterialCommunityIcons name="clock-edit-outline" size={16} color={colors.textMuted} />
            <Text style={s.infoText}>Modified {formatTime(note.modifiedAt)}</Text>
          </View>
          <View style={s.infoRow}>
            <MaterialCommunityIcons name="text" size={16} color={colors.textMuted} />
            <Text style={s.infoText}>{note.wordCount} words · {note.readingTime} min read</Text>
          </View>
          {note.tags.length > 0 && (
            <View style={s.infoRow}>
              <MaterialCommunityIcons name="tag-outline" size={16} color={colors.textMuted} />
              <Text style={s.infoText}>{note.tags.map(t => `#${t}`).join(' ')}</Text>
            </View>
          )}
          <View style={s.colorRow}>
            {NOTE_COLORS.map(nc => (
              <TouchableOpacity
                key={nc.id}
                style={[
                  s.colorDot,
                  { backgroundColor: isDark ? nc.darkHex : nc.hex, borderColor: nc.hex },
                  note.color === nc.id && s.colorDotActive,
                  nc.id === 'none' && s.colorDotNone,
                ]}
                onPress={() => { updateNote(note.id, { color: nc.id }); Haptics.selectionAsync(); }}
              >
                {nc.id === 'none' && <MaterialCommunityIcons name="close" size={12} color={colors.textMuted} />}
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      )}

      {showFormatBar && (
        <View style={[s.formatBar, { backgroundColor: colors.surface }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.formatBarContent}>
            {[
              { icon: 'format-bold', action: () => insertFormatting('**', '**'), label: 'B' },
              { icon: 'format-italic', action: () => insertFormatting('*', '*'), label: 'I' },
              { icon: 'format-underline', action: () => insertFormatting('__', '__'), label: 'U' },
              { icon: 'format-strikethrough', action: () => insertFormatting('~~', '~~'), label: 'S' },
              { icon: 'format-header-1', action: () => insertBlock('# '), label: 'H1' },
              { icon: 'format-header-2', action: () => insertBlock('## '), label: 'H2' },
              { icon: 'format-header-3', action: () => insertBlock('### '), label: 'H3' },
              { icon: 'format-list-bulleted', action: () => insertBlock('- '), label: 'List' },
              { icon: 'format-list-numbered', action: () => insertBlock('1. '), label: 'Num' },
              { icon: 'checkbox-marked-outline', action: () => insertBlock('- [ ] '), label: 'Todo' },
              { icon: 'code-tags', action: () => insertFormatting('`', '`'), label: 'Code' },
              { icon: 'format-quote-open', action: () => insertBlock('> '), label: 'Quote' },
              { icon: 'minus', action: () => insertBlock('---'), label: 'Line' },
            ].map(({ icon, action, label }) => (
              <TouchableOpacity key={label} style={s.formatBtn} onPress={() => { action(); Haptics.selectionAsync(); }}>
                <MaterialCommunityIcons name={icon as any} size={18} color={colors.text} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {editorMode === 'drawing' ? (
        <View style={{ flex: 1 }}>
          <DrawingCanvas width={SCREEN_W} height={canvasH} />
          <PenToolbar canUndo={true} canRedo={false} />
        </View>
      ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={[s.scrollContent, colorHex ? { backgroundColor: colorHex + '44' } : {}]}
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <TextInput
            style={s.titleInput}
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

          <View style={s.metaRow}>
            <Text style={s.metaDate}>{formatFullDate(note.modifiedAt)}</Text>
            {note.isPinned && <MaterialCommunityIcons name="pin" size={14} color={colors.primary} />}
            {note.isFlagged && <MaterialCommunityIcons name="flag" size={14} color={colors.warning} />}
          </View>

          {note.tags.length > 0 && (
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
            style={s.contentInput}
            value={content}
            onChangeText={handleContentChange}
            placeholder="Start writing... Use # for headings, - for lists, [ ] for checkboxes"
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
            selectionColor={colors.primary}
            spellCheck={settings.spellCheck}
            autoCapitalize="sentences"
          />

          {note.wordCount > 0 && (
            <Text style={s.wordCount}>{note.wordCount} words · {note.readingTime} min read</Text>
          )}
          <View style={{ height: 200 }} />
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = (colors: typeof Colors.light) => StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.inputBg },
  headerCenter: { flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  unsavedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  headerRight: { flexDirection: 'row', gap: 4 },
  modeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  modeBtnActive: { backgroundColor: colors.primarySoft },
  infoPanel: {
    padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
    gap: 10,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: Colors.font.sm, color: colors.textSecondary },
  colorRow: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  colorDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  colorDotActive: { borderWidth: 3, borderColor: colors.primary },
  colorDotNone: { backgroundColor: colors.inputBg, borderColor: colors.border },
  formatBar: { borderBottomWidth: 1, borderBottomColor: colors.border },
  formatBarContent: { paddingHorizontal: 8, paddingVertical: 6, gap: 2 },
  formatBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  titleInput: {
    fontSize: 26, fontWeight: '700', color: colors.text,
    marginBottom: 8, lineHeight: 34, minHeight: 44,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  metaDate: { fontSize: Colors.font.sm, color: colors.textMuted },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  tagBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Colors.radius.full },
  tagText: { fontSize: 12, fontWeight: '500' },
  contentInput: {
    fontSize: Colors.font.base + 1, color: colors.text,
    lineHeight: 26, minHeight: 200,
  },
  wordCount: { fontSize: Colors.font.xs, color: colors.textMuted, marginTop: 20, textAlign: 'right' },
  errorText: { textAlign: 'center', marginTop: 100 },
});
