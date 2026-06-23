import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, Pressable, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/context/ThemeContext';
import { useNotes, Notebook } from '../../src/context/NotesContext';
import { NotebookCard } from '../../src/components/NotebookCard';
import { EmptyState } from '../../src/components/EmptyState';
import { Colors } from '../../src/constants/colors';

const EMOJI_OPTIONS = ['📓', '📔', '📒', '📕', '📗', '📘', '📙', '🗒️', '📋', '📄', '💼', '🎓', '🎨', '🔬', '💡', '🏠', '✈️', '🎵', '🏃', '📸'];
const COLOR_OPTIONS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16'];

export default function NotebooksScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { notebooks, notes, createNotebook, updateNotebook, deleteNotebook } = useNotes();
  const insets = useSafeAreaInsets();

  const [showCreate, setShowCreate] = useState(false);
  const [editingNotebook, setEditingNotebook] = useState<Notebook | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newEmoji, setNewEmoji] = useState('📓');
  const [newColor, setNewColor] = useState('#6366f1');

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const activeNotebooks = notebooks.filter(nb => !nb.isArchived);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await createNotebook({ title: newTitle.trim(), emoji: newEmoji, color: newColor });
    setShowCreate(false);
    setNewTitle('');
    setNewEmoji('📓');
    setNewColor('#6366f1');
  };

  const handleEdit = async () => {
    if (!editingNotebook || !newTitle.trim()) return;
    await updateNotebook(editingNotebook.id, { title: newTitle.trim(), emoji: newEmoji, color: newColor });
    setEditingNotebook(null);
  };

  const handleLongPress = (notebook: Notebook) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(notebook.title, 'What would you like to do?', [
      { text: 'Edit', onPress: () => { setEditingNotebook(notebook); setNewTitle(notebook.title); setNewEmoji(notebook.emoji); setNewColor(notebook.color); } },
      { text: 'Delete', style: 'destructive', onPress: () => deleteNotebook(notebook.id) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const s = styles(colors);

  const openModal = () => {
    setShowCreate(true);
    setNewTitle('');
    setNewEmoji('📓');
    setNewColor('#6366f1');
  };

  const ModalContent = ({ isEdit }: { isEdit: boolean }) => (
    <View style={s.modalContent}>
      <Text style={s.modalTitle}>{isEdit ? 'Edit Notebook' : 'New Notebook'}</Text>

      <Text style={s.label}>Name</Text>
      <TextInput
        style={s.input}
        value={newTitle}
        onChangeText={setNewTitle}
        placeholder="Notebook name..."
        placeholderTextColor={colors.textMuted}
        autoFocus
        returnKeyType="done"
      />

      <Text style={s.label}>Icon</Text>
      <View style={s.emojiGrid}>
        {EMOJI_OPTIONS.map(e => (
          <TouchableOpacity
            key={e}
            style={[s.emojiBtn, newEmoji === e && s.emojiBtnActive]}
            onPress={() => { setNewEmoji(e); Haptics.selectionAsync(); }}
          >
            <Text style={s.emoji}>{e}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>Color</Text>
      <View style={s.colorRow}>
        {COLOR_OPTIONS.map(c => (
          <TouchableOpacity
            key={c}
            style={[s.colorDot, { backgroundColor: c }, newColor === c && s.colorDotActive]}
            onPress={() => { setNewColor(c); Haptics.selectionAsync(); }}
          />
        ))}
      </View>

      <View style={s.modalButtons}>
        <TouchableOpacity style={s.cancelBtn} onPress={() => { setShowCreate(false); setEditingNotebook(null); }}>
          <Text style={[s.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.createBtn, { backgroundColor: newColor }]}
          onPress={isEdit ? handleEdit : handleCreate}
        >
          <Text style={s.createText}>{isEdit ? 'Save' : 'Create'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Text style={s.headerTitle}>Notebooks</Text>
        <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.primary }]} onPress={openModal}>
          <MaterialCommunityIcons name="plus" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={s.statsRow}>
        <View style={[s.statCard, { backgroundColor: colors.primarySoft }]}>
          <Text style={[s.statNum, { color: colors.primary }]}>{activeNotebooks.length}</Text>
          <Text style={[s.statLabel, { color: colors.primary }]}>Notebooks</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
          <Text style={[s.statNum, { color: colors.text }]}>{notes.filter(n => !n.isTrashed).length}</Text>
          <Text style={[s.statLabel, { color: colors.textSecondary }]}>Total Notes</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
          <Text style={[s.statNum, { color: colors.text }]}>{notes.filter(n => n.isFavorite).length}</Text>
          <Text style={[s.statLabel, { color: colors.textSecondary }]}>Favorites</Text>
        </View>
      </View>

      <FlatList
        data={activeNotebooks}
        keyExtractor={nb => nb.id}
        numColumns={2}
        columnWrapperStyle={s.gridRow}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="notebook-plus-outline"
            title="No notebooks yet"
            description="Create your first notebook to organize your notes"
            actionLabel="Create Notebook"
            onAction={openModal}
          />
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 40).springify()} style={{ flex: 1 }}>
            <NotebookCard
              notebook={item}
              onPress={() => router.push(`/notebooks/${item.id}`)}
              onLongPress={() => handleLongPress(item)}
            />
          </Animated.View>
        )}
      />

      <Modal visible={showCreate || !!editingNotebook} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={() => { setShowCreate(false); setEditingNotebook(null); }}>
          <Pressable style={[s.sheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <ModalContent isEdit={!!editingNotebook} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = (colors: typeof Colors.light) => StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
  },
  headerTitle: { fontSize: Colors.font.xxxl, fontWeight: '800', color: colors.text },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: Colors.radius.lg, padding: 14, alignItems: 'center' },
  statNum: { fontSize: Colors.font.xxl, fontWeight: '800' },
  statLabel: { fontSize: Colors.font.xs, fontWeight: '600', marginTop: 2 },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  gridRow: { gap: 12, marginBottom: 12 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalContent: {},
  modalTitle: { fontSize: Colors.font.xl, fontWeight: '700', color: colors.text, marginBottom: 20 },
  label: { fontSize: Colors.font.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: colors.inputBg, borderRadius: Colors.radius.md,
    padding: 14, fontSize: Colors.font.base, color: colors.text,
    borderWidth: 1, borderColor: colors.border,
  },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.inputBg },
  emojiBtnActive: { backgroundColor: colors.primarySoft, borderWidth: 2, borderColor: colors.primary },
  emoji: { fontSize: 22 },
  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotActive: { borderWidth: 3, borderColor: colors.text },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, padding: 16, alignItems: 'center', backgroundColor: colors.inputBg, borderRadius: Colors.radius.lg },
  cancelText: { fontWeight: '600', fontSize: Colors.font.base },
  createBtn: { flex: 2, padding: 16, alignItems: 'center', borderRadius: Colors.radius.lg },
  createText: { color: '#fff', fontWeight: '700', fontSize: Colors.font.base },
});
