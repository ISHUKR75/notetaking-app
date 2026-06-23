import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Modal,
  Pressable, Dimensions, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { haptic } from '../../src/utils/haptics';
import { useTheme } from '../../src/context/ThemeContext';
import { useNotes, NoteColor } from '../../src/context/NotesContext';
import { Colors } from '../../src/constants/colors';
import { NOTE_COLORS, getNoteColorHex } from '../../src/utils/noteUtils';
import { TEMPLATES } from '../../src/constants/templates';

const { width: SCREEN_W } = Dimensions.get('window');

const NOTE_TYPES = [
  { id: 'text',        label: 'Text',      icon: 'text',               description: 'Rich text with markdown',       color: '#6366f1' },
  { id: 'handwriting', label: 'Drawing',   icon: 'draw',               description: 'Freehand writing & drawing',    color: '#10b981' },
  { id: 'mixed',       label: 'Mixed',     icon: 'layers-outline',     description: 'Text + drawing combined',       color: '#f59e0b' },
  { id: 'voice',       label: 'Voice',     icon: 'microphone-outline', description: 'Audio note with transcription', color: '#ef4444' },
];

const EMOJI_OPTIONS = [
  '📝', '💡', '🎯', '📚', '🔬', '💼', '🎨', '🏠', '✈️', '🎵',
  '🍎', '❤️', '⭐', '🔥', '🌙', '☀️', '🚀', '🌈', '🌿', '🦋',
  '🏆', '💻', '🎭', '📷', '🎪', '🧪', '🌊', '🏔️', '🦁', '🐉',
  '📊', '🎓', '🏃', '🛒', '🔑', '🎁', '🌺', '🧠', '🛡️', '⚡',
];

const QUICK_STARTERS = [
  { label: 'Meeting Notes',      icon: 'account-group-outline',   content: '## Meeting Notes\n**Date:** \n**Attendees:** \n\n### Agenda\n- \n\n### Discussion\n\n\n### Action Items\n- [ ] \n- [ ] \n- [ ] \n\n### Next Meeting\n' },
  { label: 'Daily Journal',      icon: 'book-open-outline',        content: `## ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}\n\n### Today I\'m grateful for\n1. \n2. \n3. \n\n### Top 3 priorities\n- [ ] \n- [ ] \n- [ ] \n\n### Thoughts\n\n\n### End of Day\n` },
  { label: 'Project Plan',       icon: 'clipboard-list-outline',   content: '## Project: \n\n### Overview\n\n### Goals\n- \n\n### Milestones\n| Milestone | Date | Status |\n|-----------|------|--------|\n| Planning  | -    | -      |\n\n### Tasks\n- [ ] \n- [ ] \n- [ ] \n\n### Notes\n' },
  { label: 'Book Summary',       icon: 'book-outline',             content: '## Book Summary\n**Title:** \n**Author:** \n**Rating:** ⭐️⭐️⭐️⭐️⭐️\n\n### Key Takeaways\n1. \n2. \n3. \n\n### Favorite Quotes\n> \n\n### How I\'ll Apply This\n' },
  { label: 'Brainstorm',         icon: 'lightbulb-outline',        content: '## 💡 Brainstorm: \n\n### Ideas\n- \n- \n- \n- \n- \n\n### Best Ideas (★)\n\n### Next Steps\n- [ ] \n' },
  { label: 'Shopping List',      icon: 'cart-outline',             content: '## 🛒 Shopping List\n\n### Groceries\n- [ ] \n- [ ] \n\n### Other\n- [ ] \n- [ ] \n\n**Budget:** \n' },
  { label: 'Recipe',             icon: 'food-outline',             content: '## Recipe: \n\n**Prep time:** \n**Cook time:** \n**Serves:** \n\n### Ingredients\n- \n- \n- \n\n### Instructions\n1. \n2. \n3. \n\n### Notes\n' },
  { label: 'Blank',              icon: 'file-outline',             content: '' },
];

export default function CreateNoteScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { createNote, notebooks } = useNotes();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteType, setNoteType] = useState<'text' | 'handwriting' | 'mixed' | 'voice'>('text');
  const [selectedNotebook, setSelectedNotebook] = useState<string | null>(notebooks[0]?.id || null);
  const [selectedColor, setSelectedColor] = useState<NoteColor>('none');
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState('blank');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showNotebookPicker, setShowNotebookPicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showQuickStarters, setShowQuickStarters] = useState(false);
  const [activeSection, setActiveSection] = useState<'basic' | 'organize' | 'template'>('basic');

  const titleRef = useRef<TextInput>(null);
  const contentRef = useRef<TextInput>(null);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  useEffect(() => {
    setTimeout(() => titleRef.current?.focus(), 300);
  }, []);

  const handleCreate = async () => {
    if (isCreating) return;
    const finalTitle = title.trim() || 'Untitled Note';
    setIsCreating(true);
    haptic.success();
    try {
      const note = await createNote({
        title: finalTitle,
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
    } catch (e) {
      haptic.warning();
      Alert.alert('Error', 'Could not create note. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (trimmed && !tags.includes(trimmed) && tags.length < 10) {
      setTags(prev => [...prev, trimmed]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
    haptic.light();
  };

  const applyQuickStarter = (qs: typeof QUICK_STARTERS[0]) => {
    if (!title && qs.label !== 'Blank') setTitle(qs.label);
    setContent(qs.content);
    setShowQuickStarters(false);
    haptic.success();
    setTimeout(() => contentRef.current?.focus(), 200);
  };

  const selectedNotebookObj = notebooks.find(nb => nb.id === selectedNotebook);
  const colorHex = getNoteColorHex(selectedColor, isDark);
  const hasColor = colorHex && colorHex !== 'transparent';

  const SECTIONS = [
    { id: 'basic' as const,    label: 'Note',     icon: 'file-document-outline' },
    { id: 'organize' as const, label: 'Organize', icon: 'folder-outline' },
    { id: 'template' as const, label: 'Template', icon: 'view-grid-outline' },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 4, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: colors.inputBg }]}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons name="close" size={20} color={colors.text} />
        </TouchableOpacity>

        <Text style={{ flex: 1, textAlign: 'center', fontSize: Colors.font.lg, fontWeight: '800', color: colors.text }}>
          New Note
        </Text>

        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: isCreating ? colors.primarySoft : colors.primary }]}
          onPress={handleCreate}
          disabled={isCreating}
        >
          <MaterialCommunityIcons name="check" size={16} color={isCreating ? colors.primary : '#fff'} />
          <Text style={{ color: isCreating ? colors.primary : '#fff', fontWeight: '800', fontSize: Colors.font.sm }}>
            {isCreating ? 'Creating…' : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Section tabs */}
      <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {SECTIONS.map(sec => (
          <TouchableOpacity
            key={sec.id}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderBottomWidth: 2.5, borderBottomColor: activeSection === sec.id ? colors.primary : 'transparent' }}
            onPress={() => { setActiveSection(sec.id); haptic.light(); }}
          >
            <MaterialCommunityIcons name={sec.icon as any} size={14} color={activeSection === sec.id ? colors.primary : colors.textMuted} />
            <Text style={{ fontSize: 12, fontWeight: '800', color: activeSection === sec.id ? colors.primary : colors.textMuted }}>{sec.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* ── BASIC TAB ── */}
        {activeSection === 'basic' && (
          <Animated.View entering={FadeIn.duration(200)}>
            {/* Title + emoji */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
              <TouchableOpacity
                style={{ width: 50, height: 50, borderRadius: 16, backgroundColor: hasColor ? colorHex : colors.inputBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: hasColor ? colorHex : colors.border }}
                onPress={() => { setShowEmojiPicker(true); haptic.light(); }}
              >
                {selectedEmoji ? (
                  <Text style={{ fontSize: 26 }}>{selectedEmoji}</Text>
                ) : (
                  <MaterialCommunityIcons name="emoticon-plus-outline" size={22} color={hasColor ? '#fff' : colors.textMuted} />
                )}
              </TouchableOpacity>
              <TextInput
                ref={titleRef}
                style={{ flex: 1, fontSize: 22, fontWeight: '800', color: colors.text, padding: 0, lineHeight: 30 }}
                value={title}
                onChangeText={setTitle}
                placeholder="Note title…"
                placeholderTextColor={colors.textMuted}
                returnKeyType="next"
                onSubmitEditing={() => contentRef.current?.focus()}
              />
            </View>

            {/* Note type */}
            <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
              <Text style={styles.sectionLabel(colors)}>Note Type</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {NOTE_TYPES.map(type => {
                  const active = noteType === type.id;
                  return (
                    <TouchableOpacity
                      key={type.id}
                      style={{ flex: 1, alignItems: 'center', gap: 5, paddingVertical: 12, borderRadius: 14, backgroundColor: active ? type.color + '18' : colors.inputBg, borderWidth: 1.5, borderColor: active ? type.color : colors.border }}
                      onPress={() => { setNoteType(type.id as any); haptic.select(); }}
                    >
                      <MaterialCommunityIcons name={type.icon as any} size={20} color={active ? type.color : colors.textMuted} />
                      <Text style={{ fontSize: 10, fontWeight: '800', color: active ? type.color : colors.textMuted, textAlign: 'center' }}>{type.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Quick content starter */}
            {noteType === 'text' && (
              <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={styles.sectionLabel(colors)}>Quick Start</Text>
                  <TouchableOpacity onPress={() => { setShowQuickStarters(true); haptic.light(); }}>
                    <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '700' }}>See All</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {QUICK_STARTERS.slice(0, 5).map(qs => (
                    <TouchableOpacity
                      key={qs.label}
                      style={{ alignItems: 'center', gap: 6, width: 72, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.inputBg, borderWidth: 1.5, borderColor: colors.border }}
                      onPress={() => applyQuickStarter(qs)}
                    >
                      <MaterialCommunityIcons name={qs.icon as any} size={22} color={colors.primary} />
                      <Text style={{ fontSize: 9, fontWeight: '700', color: colors.text, textAlign: 'center' }} numberOfLines={2}>{qs.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Content preview area */}
            {noteType === 'text' && (
              <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
                <Text style={styles.sectionLabel(colors)}>Content (optional — you can write in the note)</Text>
                <TextInput
                  ref={contentRef}
                  style={[styles.contentInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                  value={content}
                  onChangeText={setContent}
                  placeholder={'Start writing…\n\nMarkdown supported:\n  **bold**  *italic*  `code`\n  - [ ] todo  ### heading\n  > quote  --- divider'}
                  placeholderTextColor={colors.textMuted}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            )}

            {noteType !== 'text' && (
              <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14 }}>
                <View style={{ backgroundColor: colors.inputBg, borderRadius: 16, padding: 20, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.border }}>
                  <MaterialCommunityIcons name={NOTE_TYPES.find(t => t.id === noteType)?.icon as any} size={36} color={NOTE_TYPES.find(t => t.id === noteType)?.color || colors.primary} />
                  <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, textAlign: 'center' }}>
                    {noteType === 'handwriting' ? 'Drawing Note' : noteType === 'mixed' ? 'Mixed Note' : 'Voice Note'}
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
                    {noteType === 'handwriting'
                      ? 'After creating, you\'ll be taken to the note editor where you can switch to Draw mode and start drawing.'
                      : noteType === 'mixed'
                      ? 'Write text and draw on the same note. Switch between Edit and Draw modes in the note editor.'
                      : 'Voice notes coming soon! For now, create a text note and use the microphone integration.'
                    }
                  </Text>
                </View>
              </View>
            )}
          </Animated.View>
        )}

        {/* ── ORGANIZE TAB ── */}
        {activeSection === 'organize' && (
          <Animated.View entering={FadeIn.duration(200)} style={{ paddingTop: 8 }}>
            {/* Notebook */}
            <View style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
              <Text style={styles.sectionLabel(colors)}>Notebook</Text>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.inputBg, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border }}
                onPress={() => { setShowNotebookPicker(true); haptic.light(); }}
              >
                {selectedNotebookObj ? (
                  <>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: selectedNotebookObj.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 22 }}>{selectedNotebookObj.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{selectedNotebookObj.title}</Text>
                      {selectedNotebookObj.description ? (
                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }} numberOfLines={1}>{selectedNotebookObj.description}</Text>
                      ) : null}
                    </View>
                  </>
                ) : (
                  <>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center' }}>
                      <MaterialCommunityIcons name="notebook-outline" size={20} color={colors.textMuted} />
                    </View>
                    <Text style={{ flex: 1, fontSize: 15, color: colors.textMuted, fontWeight: '500' }}>No notebook (uncategorized)</Text>
                  </>
                )}
                <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Card color */}
            <View style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
              <Text style={styles.sectionLabel(colors)}>Card Color</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {NOTE_COLORS.map(nc => {
                  const bg = nc.id === 'none' ? colors.inputBg : (isDark ? nc.darkHex : nc.hex);
                  const active = selectedColor === nc.id;
                  return (
                    <TouchableOpacity
                      key={nc.id}
                      style={{
                        width: 44, height: 44, borderRadius: 22, backgroundColor: bg,
                        alignItems: 'center', justifyContent: 'center',
                        borderWidth: active ? 3 : 1,
                        borderColor: active ? colors.primary : (nc.id === 'none' ? colors.border : bg),
                      }}
                      onPress={() => { setSelectedColor(nc.id); haptic.select(); }}
                    >
                      {active && nc.id !== 'none' && <MaterialCommunityIcons name="check" size={14} color="#fff" />}
                      {nc.id === 'none' && !active && <MaterialCommunityIcons name="cancel" size={14} color={colors.textMuted} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Tags */}
            <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
              <Text style={styles.sectionLabel(colors)}>Tags</Text>
              {tags.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {tags.map(tag => (
                    <TouchableOpacity
                      key={tag}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primarySoft, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}
                      onPress={() => removeTag(tag)}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>#{tag}</Text>
                      <MaterialCommunityIcons name="close" size={12} color={colors.primary} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.inputBg, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border }}>
                  <MaterialCommunityIcons name="tag-outline" size={16} color={colors.textMuted} />
                  <TextInput
                    style={{ flex: 1, fontSize: 14, color: colors.text, paddingVertical: 10 }}
                    value={tagInput}
                    onChangeText={setTagInput}
                    placeholder="Add tag (e.g. work, ideas)…"
                    placeholderTextColor={colors.textMuted}
                    onSubmitEditing={handleAddTag}
                    returnKeyType="done"
                    autoCapitalize="none"
                  />
                </View>
                <TouchableOpacity
                  style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: tagInput.trim() ? colors.primary : colors.inputBg, alignItems: 'center', justifyContent: 'center' }}
                  onPress={handleAddTag}
                  disabled={!tagInput.trim()}
                >
                  <MaterialCommunityIcons name="plus" size={20} color={tagInput.trim() ? '#fff' : colors.textMuted} />
                </TouchableOpacity>
              </View>
              {tags.length === 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {['idea', 'work', 'personal', 'study', 'project', 'todo'].map(suggestion => (
                    <TouchableOpacity
                      key={suggestion}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border }}
                      onPress={() => { setTags(prev => [...prev, suggestion]); haptic.light(); }}
                    >
                      <MaterialCommunityIcons name="plus" size={10} color={colors.textMuted} />
                      <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* ── TEMPLATE TAB ── */}
        {activeSection === 'template' && (
          <Animated.View entering={FadeIn.duration(200)}>
            <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
              <Text style={styles.sectionLabel(colors)}>Page Templates</Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 16 }}>Choose a background template for your note's writing area</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {TEMPLATES.map(t => {
                  const active = selectedTemplate === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={{
                        width: (SCREEN_W - 40 - 20) / 3,
                        alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 8,
                        borderRadius: 16, borderWidth: 2,
                        borderColor: active ? t.color : colors.border,
                        backgroundColor: active ? t.color + '14' : colors.inputBg,
                      }}
                      onPress={() => { setSelectedTemplate(t.id); haptic.select(); }}
                    >
                      <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: t.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                        <MaterialCommunityIcons name={t.icon as any} size={24} color={t.color} />
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: active ? '800' : '600', color: active ? t.color : colors.text, textAlign: 'center' }} numberOfLines={2}>{t.name}</Text>
                      {active && (
                        <View style={{ position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 9, backgroundColor: t.color, alignItems: 'center', justifyContent: 'center' }}>
                          <MaterialCommunityIcons name="check" size={11} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Bottom Create bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Platform.OS === 'web' ? 16 : insets.bottom + 8 }]}>
        {/* Note type quick badges */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          {selectedNotebookObj && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: selectedNotebookObj.color + '18', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 12 }}>{selectedNotebookObj.emoji}</Text>
              <Text style={{ fontSize: 11, color: selectedNotebookObj.color, fontWeight: '700' }} numberOfLines={1}>{selectedNotebookObj.title}</Text>
            </View>
          )}
          {selectedEmoji && (
            <Text style={{ fontSize: 16 }}>{selectedEmoji}</Text>
          )}
          {selectedColor !== 'none' && (
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: getNoteColorHex(selectedColor, isDark) || colors.primary }} />
          )}
          {tags.map(tag => (
            <View key={tag} style={{ backgroundColor: colors.primarySoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontSize: 10, color: colors.primary, fontWeight: '700' }}>#{tag}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.createBtnFull, { backgroundColor: isCreating ? colors.primarySoft : colors.primary }]}
          onPress={handleCreate}
          disabled={isCreating}
        >
          <MaterialCommunityIcons name={isCreating ? 'loading' : 'check-circle-outline'} size={20} color={isCreating ? colors.primary : '#fff'} />
          <Text style={{ color: isCreating ? colors.primary : '#fff', fontWeight: '900', fontSize: 16 }}>
            {isCreating ? 'Creating Note…' : 'Create Note'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Emoji Picker Modal */}
      <Modal visible={showEmojiPicker} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowEmojiPicker(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={styles.handle} />
            <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text, marginBottom: 6 }}>Choose Icon</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 16 }}>Pick an emoji to represent this note</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
              <TouchableOpacity
                style={[styles.emojiOption, { backgroundColor: !selectedEmoji ? colors.primarySoft : colors.inputBg, borderWidth: !selectedEmoji ? 2 : 0, borderColor: colors.primary }]}
                onPress={() => { setSelectedEmoji(null); setShowEmojiPicker(false); }}
              >
                <MaterialCommunityIcons name="close" size={20} color={!selectedEmoji ? colors.primary : colors.textMuted} />
              </TouchableOpacity>
              {EMOJI_OPTIONS.map(e => (
                <TouchableOpacity
                  key={e}
                  style={[styles.emojiOption, { backgroundColor: selectedEmoji === e ? colors.primarySoft : colors.inputBg, borderWidth: selectedEmoji === e ? 2 : 0, borderColor: colors.primary }]}
                  onPress={() => { setSelectedEmoji(e); setShowEmojiPicker(false); haptic.select(); }}
                >
                  <Text style={{ fontSize: 26 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Notebook Picker Modal */}
      <Modal visible={showNotebookPicker} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowNotebookPicker(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={styles.handle} />
            <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text, marginBottom: 16 }}>Select Notebook</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.notebookItem, { borderColor: !selectedNotebook ? colors.primary : colors.border, backgroundColor: !selectedNotebook ? colors.primarySoft : colors.inputBg }]}
                onPress={() => { setSelectedNotebook(null); setShowNotebookPicker(false); haptic.select(); }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.inputBg, alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialCommunityIcons name="notebook-outline" size={20} color={colors.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: !selectedNotebook ? colors.primary : colors.text }}>None (uncategorized)</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>Note will not belong to any notebook</Text>
                </View>
                {!selectedNotebook && <MaterialCommunityIcons name="check" size={20} color={colors.primary} />}
              </TouchableOpacity>
              {notebooks.map(nb => (
                <TouchableOpacity
                  key={nb.id}
                  style={[styles.notebookItem, { borderColor: selectedNotebook === nb.id ? nb.color : colors.border, backgroundColor: selectedNotebook === nb.id ? nb.color + '14' : colors.inputBg }]}
                  onPress={() => { setSelectedNotebook(nb.id); setShowNotebookPicker(false); haptic.select(); }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: nb.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 22 }}>{nb.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: selectedNotebook === nb.id ? nb.color : colors.text }}>{nb.title}</Text>
                    {nb.description ? (
                      <Text style={{ fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>{nb.description}</Text>
                    ) : null}
                  </View>
                  {selectedNotebook === nb.id && <MaterialCommunityIcons name="check" size={20} color={nb.color} />}
                </TouchableOpacity>
              ))}
              <View style={{ height: 20 }} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Quick Starters Modal */}
      <Modal visible={showQuickStarters} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowQuickStarters(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={styles.handle} />
            <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text, marginBottom: 6 }}>Quick Start Templates</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 16 }}>Choose a template to pre-fill your note with a structure</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {QUICK_STARTERS.map((qs, i) => (
                <TouchableOpacity
                  key={qs.label}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: i < QUICK_STARTERS.length - 1 ? 1 : 0, borderBottomColor: colors.borderLight }}
                  onPress={() => applyQuickStarter(qs)}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialCommunityIcons name={qs.icon as any} size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 }}>{qs.label}</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>
                      {qs.content.slice(0, 60).replace(/#+\s/g, '').replace(/\n/g, ' ') || 'Blank note with no pre-set content'}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
              <View style={{ height: 30 }} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = {
  header: StyleSheet.create({
    row: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  }).row,
  sectionLabel: (colors: any) => ({
    fontSize: 11, fontWeight: '800' as const, color: colors.textMuted,
    textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 12,
  } as const),
  contentInput: {
    fontSize: 14, lineHeight: 22, minHeight: 120, borderRadius: 14,
    padding: 14, borderWidth: 1, textAlignVertical: 'top' as const,
  },
  bottomBar: {
    borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 12,
  },
  createBtnFull: {
    flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    gap: 8, paddingVertical: 14, borderRadius: 18,
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' as const },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 40, maxHeight: '86%' as any },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#d1d5db', alignSelf: 'center' as const, marginBottom: 16 },
  headerBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const },
  createBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  emojiOption: { width: 50, height: 50, borderRadius: 14, alignItems: 'center' as const, justifyContent: 'center' as const },
  notebookItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, padding: 12, borderRadius: 14, marginBottom: 8, borderWidth: 1.5 },
};
