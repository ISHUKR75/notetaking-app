import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/context/ThemeContext';
import { useNotes, NoteColor } from '../../src/context/NotesContext';
import { Colors } from '../../src/constants/colors';
import { NOTE_COLORS } from '../../src/utils/noteUtils';
import { TEMPLATES } from '../../src/constants/templates';

const NOTE_TYPES = [
  { id: 'text', label: 'Text Note', icon: 'text', description: 'Rich text with formatting' },
  { id: 'handwriting', label: 'Drawing', icon: 'draw', description: 'Freehand writing & drawing' },
  { id: 'mixed', label: 'Mixed', icon: 'layers-outline', description: 'Text + drawing combined' },
  { id: 'voice', label: 'Voice Note', icon: 'microphone-outline', description: 'Record audio + transcribe' },
];

const EMOJI_OPTIONS = ['📝', '💡', '🎯', '📚', '🔬', '💼', '🎨', '🏠', '✈️', '🎵', '🍎', '❤️', '⭐', '🔥', '🌙', '☀️'];

export default function CreateNoteScreen() {
  const router = useRouter();
  const { colors, settings } = useTheme();
  const { createNote, notebooks } = useNotes();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteType, setNoteType] = useState<'text' | 'handwriting' | 'mixed' | 'voice'>('text');
  const [selectedNotebook, setSelectedNotebook] = useState(notebooks[0]?.id || null);
  const [selectedColor, setSelectedColor] = useState<NoteColor>('none');
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState('blank');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showNotebookPicker, setShowNotebookPicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const titleRef = useRef<TextInput>(null);
  const contentRef = useRef<TextInput>(null);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  useEffect(() => {
    setTimeout(() => titleRef.current?.focus(), 300);
  }, []);

  const handleCreate = async () => {
    if (isCreating) return;
    setIsCreating(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const note = await createNote({
        title: title.trim() || 'Untitled Note',
        content,
        type: noteType,
        notebookId: selectedNotebook,
        color: selectedColor,
        emoji: selectedEmoji,
        tags,
        templateId: selectedTemplate,
        hasHandwriting: noteType === 'handwriting' || noteType === 'mixed',
        hasAudio: noteType === 'voice',
      });
      router.replace(`/notes/${note.id}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, '').toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags(tags.filter(t => t !== tag));

  const s = styles(colors);
  const isDark = colors === Colors.dark;

  return (
    <KeyboardAvoidingView
      style={[s.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[s.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity style={s.cancelBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>New Note</Text>
        <TouchableOpacity
          style={[s.createBtn, { backgroundColor: colors.primary }]}
          onPress={handleCreate}
          disabled={isCreating}
        >
          <Text style={s.createBtnText}>{isCreating ? 'Creating...' : 'Create'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} keyboardDismissMode="interactive">
        <View style={s.titleRow}>
          <TouchableOpacity style={s.emojiBtn} onPress={() => setShowEmojiPicker(true)}>
            {selectedEmoji ? (
              <Text style={s.emojiText}>{selectedEmoji}</Text>
            ) : (
              <MaterialCommunityIcons name="emoticon-outline" size={24} color={colors.textMuted} />
            )}
          </TouchableOpacity>
          <TextInput
            ref={titleRef}
            style={s.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Note title..."
            placeholderTextColor={colors.textMuted}
            returnKeyType="next"
            onSubmitEditing={() => contentRef.current?.focus()}
            selectionColor={colors.primary}
          />
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>Type</Text>
          <View style={s.typeGrid}>
            {NOTE_TYPES.map(type => (
              <TouchableOpacity
                key={type.id}
                style={[s.typeCard, noteType === type.id && s.typeCardActive]}
                onPress={() => { setNoteType(type.id as any); Haptics.selectionAsync(); }}
              >
                <MaterialCommunityIcons
                  name={type.icon as any}
                  size={22}
                  color={noteType === type.id ? '#fff' : colors.textSecondary}
                />
                <Text style={[s.typeLabel, noteType === type.id && { color: '#fff' }]}>{type.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {noteType === 'text' && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Quick Note</Text>
            <TextInput
              ref={contentRef}
              style={s.contentInput}
              value={content}
              onChangeText={setContent}
              placeholder="Start writing..."
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
              selectionColor={colors.primary}
            />
          </View>
        )}

        {noteType === 'text' && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Template</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {TEMPLATES.slice(0, 6).map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[s.templateBtn, selectedTemplate === t.id && s.templateBtnActive, { borderColor: t.color }]}
                  onPress={() => { setSelectedTemplate(t.id); Haptics.selectionAsync(); }}
                >
                  <MaterialCommunityIcons name={t.icon as any} size={22} color={t.color} />
                  <Text style={[s.templateLabel, { color: colors.textSecondary }]}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={s.section}>
          <Text style={s.sectionLabel}>Notebook</Text>
          <TouchableOpacity style={s.pickerBtn} onPress={() => setShowNotebookPicker(true)}>
            <MaterialCommunityIcons name="notebook-outline" size={18} color={colors.primary} />
            <Text style={[s.pickerText, { color: colors.text }]}>
              {notebooks.find(nb => nb.id === selectedNotebook)?.title || 'None'}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>Color</Text>
          <View style={s.colorRow}>
            {NOTE_COLORS.map(nc => (
              <TouchableOpacity
                key={nc.id}
                style={[
                  s.colorDot,
                  { backgroundColor: nc.id === 'none' ? colors.inputBg : (isDark ? nc.darkHex : nc.hex) },
                  selectedColor === nc.id && s.colorDotActive,
                ]}
                onPress={() => { setSelectedColor(nc.id); Haptics.selectionAsync(); }}
              >
                {nc.id === 'none' && <MaterialCommunityIcons name="close-circle-outline" size={14} color={colors.textMuted} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>Tags</Text>
          <View style={s.tagsRow}>
            {tags.map(tag => (
              <TouchableOpacity
                key={tag}
                style={[s.tagBadge, { backgroundColor: colors.primarySoft }]}
                onPress={() => removeTag(tag)}
              >
                <Text style={[s.tagText, { color: colors.primary }]}>#{tag}</Text>
                <MaterialCommunityIcons name="close" size={12} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
          <View style={s.tagInputRow}>
            <TextInput
              style={s.tagInput}
              value={tagInput}
              onChangeText={setTagInput}
              placeholder="#add tag..."
              placeholderTextColor={colors.textMuted}
              returnKeyType="done"
              onSubmitEditing={handleAddTag}
              autoCapitalize="none"
            />
            {tagInput.length > 0 && (
              <TouchableOpacity style={[s.addTagBtn, { backgroundColor: colors.primary }]} onPress={handleAddTag}>
                <MaterialCommunityIcons name="plus" size={16} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={showEmojiPicker} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={() => setShowEmojiPicker(false)}>
          <View style={[s.sheet, { backgroundColor: colors.surface }]}>
            <Text style={[s.sheetTitle, { color: colors.text }]}>Choose Emoji</Text>
            <View style={s.emojiGrid}>
              <TouchableOpacity style={s.emojiOption} onPress={() => { setSelectedEmoji(null); setShowEmojiPicker(false); }}>
                <MaterialCommunityIcons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
              {EMOJI_OPTIONS.map(e => (
                <TouchableOpacity key={e} style={s.emojiOption} onPress={() => { setSelectedEmoji(e); setShowEmojiPicker(false); Haptics.selectionAsync(); }}>
                  <Text style={s.emojiOptionText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={showNotebookPicker} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={() => setShowNotebookPicker(false)}>
          <View style={[s.sheet, { backgroundColor: colors.surface }]}>
            <Text style={[s.sheetTitle, { color: colors.text }]}>Select Notebook</Text>
            <TouchableOpacity
              style={[s.notebookItem, !selectedNotebook && s.notebookItemActive]}
              onPress={() => { setSelectedNotebook(null); setShowNotebookPicker(false); }}
            >
              <MaterialCommunityIcons name="notebook-outline" size={20} color={colors.textMuted} />
              <Text style={[s.notebookItemText, { color: colors.text }]}>None</Text>
              {!selectedNotebook && <MaterialCommunityIcons name="check" size={18} color={colors.primary} />}
            </TouchableOpacity>
            {notebooks.map(nb => (
              <TouchableOpacity
                key={nb.id}
                style={[s.notebookItem, selectedNotebook === nb.id && s.notebookItemActive]}
                onPress={() => { setSelectedNotebook(nb.id); setShowNotebookPicker(false); }}
              >
                <Text style={{ fontSize: 20 }}>{nb.emoji}</Text>
                <Text style={[s.notebookItemText, { color: colors.text }]}>{nb.title}</Text>
                {selectedNotebook === nb.id && <MaterialCommunityIcons name="check" size={18} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = (colors: typeof Colors.light) => StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  cancelBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.inputBg },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: Colors.font.lg, fontWeight: '700', color: colors.text },
  createBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: Colors.radius.full },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: Colors.font.base },
  scroll: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, gap: 12 },
  emojiBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center' },
  emojiText: { fontSize: 26 },
  titleInput: { flex: 1, fontSize: 22, fontWeight: '700', color: colors.text },
  section: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  sectionLabel: { fontSize: Colors.font.sm, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: Colors.radius.md,
    backgroundColor: colors.inputBg, borderWidth: 1.5, borderColor: 'transparent',
  },
  typeCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeLabel: { fontSize: Colors.font.sm, fontWeight: '600', color: colors.textSecondary },
  contentInput: {
    fontSize: Colors.font.base, color: colors.text,
    minHeight: 100, lineHeight: 24,
    backgroundColor: colors.inputBg, borderRadius: Colors.radius.md,
    padding: 14, borderWidth: 1, borderColor: colors.border,
  },
  templateBtn: {
    width: 76, height: 76, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.inputBg, borderWidth: 2, borderColor: 'transparent',
  },
  templateBtnActive: { backgroundColor: colors.primarySoft },
  templateLabel: { fontSize: 10, fontWeight: '500' },
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.inputBg, borderRadius: Colors.radius.md,
    padding: 14, borderWidth: 1, borderColor: colors.border,
  },
  pickerText: { flex: 1, fontSize: Colors.font.base, fontWeight: '500' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorDot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  colorDotActive: { borderWidth: 3, borderColor: colors.primary },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  tagBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Colors.radius.full },
  tagText: { fontSize: Colors.font.sm, fontWeight: '500' },
  tagInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tagInput: {
    flex: 1, backgroundColor: colors.inputBg, borderRadius: Colors.radius.md,
    padding: 12, fontSize: Colors.font.base, color: colors.text,
    borderWidth: 1, borderColor: colors.border,
  },
  addTagBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetTitle: { fontSize: Colors.font.xl, fontWeight: '700', marginBottom: 16 },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  emojiOption: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.inputBg },
  emojiOptionText: { fontSize: 28 },
  notebookItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: Colors.radius.md, marginBottom: 4,
  },
  notebookItemActive: { backgroundColor: colors.primarySoft },
  notebookItemText: { flex: 1, fontSize: Colors.font.base, fontWeight: '500' },
});
