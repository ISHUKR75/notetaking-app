import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, Pressable, Platform, Alert, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useTheme } from '../../src/context/ThemeContext';
import { useNotes, Notebook } from '../../src/context/NotesContext';
import { NotebookCard } from '../../src/components/NotebookCard';
import { EmptyState } from '../../src/components/EmptyState';
import { Colors } from '../../src/constants/colors';
import { haptic } from '../../src/utils/haptics';

const EMOJI_OPTIONS = [
  '📓', '📔', '📒', '📕', '📗', '📘', '📙', '🗒️', '📋', '📄',
  '💼', '🎓', '🎨', '🔬', '💡', '🏠', '✈️', '🎵', '🏃', '📸',
  '🍎', '🌍', '⚽', '🎯', '🏆', '💻', '🎭', '🌺', '🦋', '🔥',
];
const COLOR_OPTIONS = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16',
  '#14b8a6', '#a855f7', '#f43f5e', '#0ea5e9', '#22c55e',
];

type ViewMode = 'grid' | 'list';

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
  const [newDescription, setNewDescription] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const activeNotebooks = useMemo(() =>
    notebooks
      .filter(nb => !nb.isArchived)
      .filter(nb => !search || nb.title.toLowerCase().includes(search.toLowerCase()))
  , [notebooks, search]);

  const totalNotes = notes.filter(n => !n.isTrashed && !n.isArchived).length;
  const favoriteNotebooks = notebooks.filter(nb => nb.isFavorite);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    haptic.success();
    await createNotebook({ title: newTitle.trim(), emoji: newEmoji, color: newColor, description: newDescription.trim() });
    resetForm();
  };

  const handleEdit = async () => {
    if (!editingNotebook || !newTitle.trim()) return;
    haptic.success();
    await updateNotebook(editingNotebook.id, { title: newTitle.trim(), emoji: newEmoji, color: newColor, description: newDescription.trim() });
    setEditingNotebook(null);
  };

  const handleLongPress = (notebook: Notebook) => {
    haptic.medium();
    Alert.alert(notebook.title, `${notebook.noteCount} notes`, [
      {
        text: 'Edit', onPress: () => {
          setEditingNotebook(notebook);
          setNewTitle(notebook.title);
          setNewEmoji(notebook.emoji);
          setNewColor(notebook.color);
          setNewDescription(notebook.description);
        }
      },
      {
        text: notebook.isFavorite ? 'Unfavorite' : 'Favorite',
        onPress: () => updateNotebook(notebook.id, { isFavorite: !notebook.isFavorite }),
      },
      {
        text: 'Archive',
        onPress: () => {
          Alert.alert('Archive Notebook', 'Archive this notebook? You can restore it later.', [
            { text: 'Archive', style: 'destructive', onPress: () => updateNotebook(notebook.id, { isArchived: true }) },
            { text: 'Cancel', style: 'cancel' },
          ]);
        },
      },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => {
          Alert.alert('Delete Notebook', `Delete "${notebook.title}"? Notes will be unassigned.`, [
            { text: 'Delete', style: 'destructive', onPress: () => { deleteNotebook(notebook.id); haptic.warning(); } },
            { text: 'Cancel', style: 'cancel' },
          ]);
        }
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const resetForm = () => {
    setShowCreate(false);
    setEditingNotebook(null);
    setNewTitle('');
    setNewEmoji('📓');
    setNewColor('#6366f1');
    setNewDescription('');
  };

  const openCreate = () => {
    resetForm();
    setShowCreate(true);
    haptic.light();
  };

  const s = styles(colors);

  const ModalForm = ({ isEdit }: { isEdit: boolean }) => (
    <View>
      <View style={s.sheetHandle} />
      <Text style={[s.sheetTitle, { color: colors.text }]}>{isEdit ? 'Edit Notebook' : 'New Notebook'}</Text>

      <View style={s.previewRow}>
        <View style={[s.previewIcon, { backgroundColor: newColor + '22', borderColor: newColor }]}>
          <Text style={{ fontSize: 32 }}>{newEmoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.previewTitle, { color: colors.text }]}>{newTitle || 'Notebook Name'}</Text>
          <Text style={[s.previewSub, { color: colors.textSecondary }]}>{newDescription || 'Add a description...'}</Text>
        </View>
      </View>

      <Text style={s.formLabel}>Name *</Text>
      <TextInput
        style={[s.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
        value={newTitle}
        onChangeText={setNewTitle}
        placeholder="Notebook name..."
        placeholderTextColor={colors.textMuted}
        autoFocus
        returnKeyType="next"
      />

      <Text style={s.formLabel}>Description</Text>
      <TextInput
        style={[s.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
        value={newDescription}
        onChangeText={setNewDescription}
        placeholder="Optional description..."
        placeholderTextColor={colors.textMuted}
        returnKeyType="done"
      />

      <Text style={s.formLabel}>Icon</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={s.emojiGrid}>
          {EMOJI_OPTIONS.map(e => (
            <TouchableOpacity
              key={e}
              style={[s.emojiBtn, newEmoji === e && { backgroundColor: newColor + '22', borderWidth: 2, borderColor: newColor }]}
              onPress={() => { setNewEmoji(e); haptic.light(); }}
            >
              <Text style={{ fontSize: 22 }}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Text style={s.formLabel}>Color</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={s.colorRow}>
          {COLOR_OPTIONS.map(c => (
            <TouchableOpacity
              key={c}
              style={[s.colorDot, { backgroundColor: c }, newColor === c && s.colorDotActive]}
              onPress={() => { setNewColor(c); haptic.select(); }}
            >
              {newColor === c && <MaterialCommunityIcons name="check" size={16} color="#fff" />}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={s.modalButtons}>
        <TouchableOpacity style={[s.cancelBtn, { backgroundColor: colors.inputBg }]} onPress={resetForm}>
          <Text style={[s.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.createBtn, { backgroundColor: newColor, opacity: !newTitle.trim() ? 0.5 : 1 }]}
          onPress={isEdit ? handleEdit : handleCreate}
          disabled={!newTitle.trim()}
        >
          <Text style={s.createText}>{isEdit ? 'Save Changes' : 'Create Notebook'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <View>
          <Text style={s.headerSub}>Organize</Text>
          <Text style={s.headerTitle}>Notebooks</Text>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.headerBtn} onPress={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}>
            <MaterialCommunityIcons name={viewMode === 'grid' ? 'view-list-outline' : 'view-grid-outline'} size={21} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.primary }]} onPress={openCreate}>
            <MaterialCommunityIcons name="plus" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.statsRow}>
        <View style={[s.statCard, { backgroundColor: colors.primary + '18' }]}>
          <MaterialCommunityIcons name="notebook-outline" size={18} color={colors.primary} />
          <Text style={[s.statNum, { color: colors.primary }]}>{activeNotebooks.length}</Text>
          <Text style={[s.statLabel, { color: colors.primary + 'cc' }]}>Notebooks</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
          <MaterialCommunityIcons name="note-multiple-outline" size={18} color={colors.textSecondary} />
          <Text style={[s.statNum, { color: colors.text }]}>{totalNotes}</Text>
          <Text style={[s.statLabel, { color: colors.textSecondary }]}>Total Notes</Text>
        </View>
        <View style={[s.statCard, { backgroundColor: '#f59e0b' + '18' }]}>
          <MaterialCommunityIcons name="heart-outline" size={18} color="#f59e0b" />
          <Text style={[s.statNum, { color: '#f59e0b' }]}>{favoriteNotebooks.length}</Text>
          <Text style={[s.statLabel, { color: '#f59e0b' + 'cc' }]}>Favorites</Text>
        </View>
      </View>

      {activeNotebooks.length > 4 && (
        <View style={s.searchRow}>
          <View style={[s.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} />
            <TextInput
              style={[s.searchInput, { color: colors.text }]}
              value={search}
              onChangeText={setSearch}
              placeholder="Search notebooks..."
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>
      )}

      <FlatList
        data={activeNotebooks}
        keyExtractor={nb => nb.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode}
        columnWrapperStyle={viewMode === 'grid' ? s.gridRow : undefined}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="notebook-plus-outline"
            title={search ? 'No notebooks found' : 'No notebooks yet'}
            description={search ? `No notebooks match "${search}"` : 'Create your first notebook to organize your notes'}
            actionLabel={search ? undefined : 'Create Notebook'}
            onAction={search ? undefined : openCreate}
          />
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 50).springify()} style={viewMode === 'grid' ? { flex: 1 } : {}}>
            <NotebookCard
              notebook={item}
              onPress={() => router.push(`/notebooks/${item.id}`)}
              onLongPress={() => handleLongPress(item)}
              viewMode={viewMode}
              noteCount={notes.filter(n => n.notebookId === item.id && !n.isTrashed).length}
            />
          </Animated.View>
        )}
      />

      <Modal visible={showCreate || !!editingNotebook} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={resetForm}>
          <Pressable style={[s.sheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <ModalForm isEdit={!!editingNotebook} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = (colors: typeof Colors.light) => StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
  },
  headerSub: { fontSize: Colors.font.sm, color: colors.textMuted, fontWeight: '500', marginBottom: 2 },
  headerTitle: { fontSize: Colors.font.display, fontWeight: '900', color: colors.text },
  headerActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  headerBtn: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: Colors.radius.xl, padding: 14, alignItems: 'center', gap: 4 },
  statNum: { fontSize: Colors.font.xxl, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  searchRow: { paddingHorizontal: 16, marginBottom: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, padding: 12, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: Colors.font.base },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  gridRow: { gap: 12, marginBottom: 12 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 40, maxHeight: '90%' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: Colors.font.xl, fontWeight: '800', marginBottom: 16 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, backgroundColor: colors.inputBg, borderRadius: Colors.radius.xl, marginBottom: 16 },
  previewIcon: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  previewTitle: { fontSize: Colors.font.lg, fontWeight: '700', marginBottom: 2 },
  previewSub: { fontSize: Colors.font.sm },
  formLabel: { fontSize: Colors.font.sm, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 14 },
  input: { borderRadius: Colors.radius.md, padding: 14, fontSize: Colors.font.base, borderWidth: 1, marginBottom: 4 },
  emojiGrid: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  emojiBtn: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.inputBg },
  colorRow: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
  colorDot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  colorDotActive: { borderWidth: 3, borderColor: 'rgba(255,255,255,0.8)' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 16, alignItems: 'center', borderRadius: Colors.radius.xl },
  cancelText: { fontWeight: '600', fontSize: Colors.font.base },
  createBtn: { flex: 2, padding: 16, alignItems: 'center', borderRadius: Colors.radius.xl },
  createText: { color: '#fff', fontWeight: '800', fontSize: Colors.font.base },
});
