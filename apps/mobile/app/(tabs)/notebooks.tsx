import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, Pressable, Platform, Alert, ScrollView, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn, ZoomIn } from 'react-native-reanimated';
import { useTheme } from '../../src/context/ThemeContext';
import { useNotes, Notebook } from '../../src/context/NotesContext';
import { EmptyState } from '../../src/components/EmptyState';
import { Colors } from '../../src/constants/colors';
import { haptic } from '../../src/utils/haptics';

const { width: SCREEN_W } = Dimensions.get('window');

const EMOJI_OPTIONS = [
  '📓','📔','📒','📕','📗','📘','📙','🗒️','📋','📄',
  '💼','🎓','🎨','🔬','💡','🏠','✈️','🎵','🏃','📸',
  '🍎','🌍','⚽','🎯','🏆','💻','🎭','🌺','🦋','🔥',
  '🚀','🌙','⭐','🌊','🏔️','🦁','🐉','🌈','🎪','🧪',
];
const COLOR_OPTIONS = [
  '#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444',
  '#8b5cf6','#ec4899','#06b6d4','#f97316','#84cc16',
  '#14b8a6','#a855f7','#f43f5e','#0ea5e9','#22c55e',
  '#0d9488','#7c3aed','#db2777','#d97706','#16a34a',
];

type ViewMode = 'grid' | 'list';
type SortMode = 'modified' | 'name' | 'count';

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
  const [sortMode, setSortMode] = useState<SortMode>('modified');
  const [search, setSearch] = useState('');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const getNoteCount = useCallback((nbId: string) =>
    notes.filter(n => n.notebookId === nbId && !n.isTrashed).length, [notes]);

  const activeNotebooks = useMemo(() => {
    let nbs = notebooks.filter(nb => !nb.isArchived);
    if (search) nbs = nbs.filter(nb => nb.title.toLowerCase().includes(search.toLowerCase()) || nb.description.toLowerCase().includes(search.toLowerCase()));
    if (sortMode === 'name') nbs = [...nbs].sort((a, b) => a.title.localeCompare(b.title));
    else if (sortMode === 'count') nbs = [...nbs].sort((a, b) => getNoteCount(b.id) - getNoteCount(a.id));
    else nbs = [...nbs].sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
    return nbs;
  }, [notebooks, search, sortMode, getNoteCount]);

  const archivedCount = notebooks.filter(nb => nb.isArchived).length;
  const totalNotes = notes.filter(n => !n.isTrashed && !n.isArchived).length;
  const favoriteNotebooks = notebooks.filter(nb => nb.isFavorite);

  const resetForm = () => {
    setShowCreate(false); setEditingNotebook(null);
    setNewTitle(''); setNewEmoji('📓'); setNewColor('#6366f1'); setNewDescription('');
  };

  const openCreate = () => { resetForm(); setShowCreate(true); haptic.light(); };

  const openEdit = (notebook: Notebook) => {
    setEditingNotebook(notebook);
    setNewTitle(notebook.title); setNewEmoji(notebook.emoji);
    setNewColor(notebook.color); setNewDescription(notebook.description);
    haptic.light();
  };

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
    resetForm();
  };

  const handleLongPress = (notebook: Notebook) => {
    haptic.medium();
    Alert.alert(
      `${notebook.emoji} ${notebook.title}`,
      `${getNoteCount(notebook.id)} notes${notebook.description ? '\n' + notebook.description : ''}`,
      [
        { text: '✏️ Edit', onPress: () => openEdit(notebook) },
        { text: notebook.isFavorite ? '💔 Unfavorite' : '❤️ Favorite', onPress: () => { updateNotebook(notebook.id, { isFavorite: !notebook.isFavorite }); haptic.select(); } },
        { text: '📦 Archive', onPress: () => Alert.alert('Archive?', `Archive "${notebook.title}"?`, [
            { text: 'Archive', style: 'destructive', onPress: () => { updateNotebook(notebook.id, { isArchived: true }); haptic.warning(); } },
            { text: 'Cancel', style: 'cancel' },
          ])
        },
        { text: '🗑️ Delete', style: 'destructive', onPress: () => Alert.alert('Delete Notebook', `Delete "${notebook.title}"? Notes inside will be unassigned.`, [
            { text: 'Delete', style: 'destructive', onPress: () => { deleteNotebook(notebook.id); haptic.warning(); } },
            { text: 'Cancel', style: 'cancel' },
          ])
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const cardW = (SCREEN_W - 16 * 3) / 2;

  const renderGrid = ({ item: nb, index }: { item: Notebook; index: number }) => {
    const cnt = getNoteCount(nb.id);
    const previewNotes = notes.filter(n => n.notebookId === nb.id && !n.isTrashed).slice(0, 3);
    return (
      <Animated.View entering={FadeInDown.delay(index * 50).springify()} style={{ width: cardW }}>
        <TouchableOpacity
          style={{
            backgroundColor: colors.card, borderRadius: 20, overflow: 'hidden',
            borderWidth: 1.5, borderColor: colors.border, marginBottom: 12,
            shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
          }}
          onPress={() => router.push(`/notebooks/${nb.id}`)}
          onLongPress={() => handleLongPress(nb)}
          activeOpacity={0.85}
        >
          {/* Top color band */}
          <View style={{ backgroundColor: nb.color, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 28 }}>{nb.emoji}</Text>
              {nb.isFavorite && <MaterialCommunityIcons name="heart" size={14} color="rgba(255,255,255,0.9)" />}
            </View>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: Colors.font.base, marginTop: 6 }} numberOfLines={1}>
              {nb.title}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 }}>
              {cnt} note{cnt !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Preview notes */}
          <View style={{ padding: 12, gap: 4 }}>
            {previewNotes.length > 0 ? previewNotes.map(n => (
              <Text key={n.id} style={{ fontSize: 11, color: colors.textSecondary, lineHeight: 15 }} numberOfLines={1}>
                · {n.title || 'Untitled'}
              </Text>
            )) : (
              <Text style={{ fontSize: 11, color: colors.textMuted, fontStyle: 'italic' }}>Empty notebook</Text>
            )}
            {cnt > 3 && (
              <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '600' }}>+{cnt - 3} more</Text>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderList = ({ item: nb, index }: { item: Notebook; index: number }) => {
    const cnt = getNoteCount(nb.id);
    return (
      <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
        <TouchableOpacity
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 14,
            backgroundColor: colors.card, borderRadius: 18,
            padding: 14, marginBottom: 10, marginHorizontal: 16,
            borderWidth: 1.5, borderColor: colors.border,
            shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
          }}
          onPress={() => router.push(`/notebooks/${nb.id}`)}
          onLongPress={() => handleLongPress(nb)}
          activeOpacity={0.85}
        >
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: nb.color + '22', borderWidth: 2, borderColor: nb.color + '44', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 26 }}>{nb.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: Colors.font.base, fontWeight: '800', color: colors.text, flex: 1 }} numberOfLines={1}>{nb.title}</Text>
              {nb.isFavorite && <MaterialCommunityIcons name="heart" size={14} color="#ec4899" />}
            </View>
            {nb.description ? (
              <Text style={{ fontSize: Colors.font.sm, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>{nb.description}</Text>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <View style={{ backgroundColor: nb.color + '22', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: nb.color }}>{cnt} notes</Text>
              </View>
              <Text style={{ fontSize: 10, color: colors.textMuted }}>
                {new Date(nb.modifiedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            <TouchableOpacity style={{ width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.inputBg }} onPress={() => openEdit(nb)}>
              <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const ModalForm = ({ isEdit }: { isEdit: boolean }) => (
    <View>
      <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 }} />
      <Text style={{ fontSize: Colors.font.xl, fontWeight: '800', color: colors.text, marginBottom: 16 }}>
        {isEdit ? '✏️ Edit Notebook' : '📚 New Notebook'}
      </Text>

      {/* Live preview */}
      <View style={{ backgroundColor: newColor, borderRadius: 20, padding: 16, marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 30 }}>{newEmoji}</Text>
        </View>
        <View>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: Colors.font.lg }}>{newTitle || 'Notebook Name'}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: Colors.font.sm, marginTop: 2 }}>{newDescription || 'Add a description…'}</Text>
        </View>
      </View>

      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Name *</Text>
      <TextInput
        style={{ backgroundColor: colors.inputBg, borderRadius: 14, padding: 14, fontSize: Colors.font.base, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 14 }}
        value={newTitle} onChangeText={setNewTitle}
        placeholder="Notebook name…" placeholderTextColor={colors.textMuted}
        autoFocus returnKeyType="next"
      />

      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Description</Text>
      <TextInput
        style={{ backgroundColor: colors.inputBg, borderRadius: 14, padding: 14, fontSize: Colors.font.base, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}
        value={newDescription} onChangeText={setNewDescription}
        placeholder="Optional description…" placeholderTextColor={colors.textMuted}
        returnKeyType="done"
      />

      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Icon</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 4 }}>
          {EMOJI_OPTIONS.map(e => (
            <TouchableOpacity
              key={e}
              style={{ width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: newEmoji === e ? newColor + '22' : colors.inputBg, borderWidth: newEmoji === e ? 2 : 0, borderColor: newColor }}
              onPress={() => { setNewEmoji(e); haptic.light(); }}
            >
              <Text style={{ fontSize: 24 }}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Color</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
        {COLOR_OPTIONS.map(c => (
          <TouchableOpacity
            key={c}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c, alignItems: 'center', justifyContent: 'center', borderWidth: newColor === c ? 3 : 0, borderColor: 'rgba(255,255,255,0.8)' }}
            onPress={() => { setNewColor(c); haptic.select(); }}
          >
            {newColor === c && <MaterialCommunityIcons name="check" size={16} color="#fff" />}
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TouchableOpacity style={{ flex: 1, padding: 16, alignItems: 'center', borderRadius: Colors.radius.xl, backgroundColor: colors.inputBg }} onPress={resetForm}>
          <Text style={{ fontWeight: '600', fontSize: Colors.font.base, color: colors.textSecondary }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 2, padding: 16, alignItems: 'center', borderRadius: Colors.radius.xl, backgroundColor: newTitle.trim() ? newColor : colors.border }}
          onPress={isEdit ? handleEdit : handleCreate}
          disabled={!newTitle.trim()}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: Colors.font.base }}>
            {isEdit ? 'Save Changes' : 'Create Notebook'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingTop: topPad + 8, paddingHorizontal: 20, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: Colors.font.sm, color: colors.textMuted, fontWeight: '500', marginBottom: 2 }}>Organize</Text>
            <Text style={{ fontSize: Colors.font.display, fontWeight: '900', color: colors.text }}>Notebooks</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity
              style={{ width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border }}
              onPress={() => setShowSortMenu(true)}
            >
              <MaterialCommunityIcons name="sort-variant" size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={{ width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border }}
              onPress={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
            >
              <MaterialCommunityIcons name={viewMode === 'grid' ? 'view-list-outline' : 'view-grid-outline'} size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }}
              onPress={openCreate}
            >
              <MaterialCommunityIcons name="plus" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          {[
            { label: 'Notebooks', value: activeNotebooks.length, color: colors.primary, icon: 'notebook-outline' },
            { label: 'Notes', value: totalNotes, color: '#10b981', icon: 'note-multiple-outline' },
            { label: 'Favorites', value: favoriteNotebooks.length, color: '#ec4899', icon: 'heart-outline' },
            { label: 'Archived', value: archivedCount, color: '#f59e0b', icon: 'archive-outline' },
          ].map(stat => (
            <View key={stat.label} style={{ flex: 1, borderRadius: 14, padding: 10, alignItems: 'center', gap: 3, backgroundColor: stat.color + '18' }}>
              <MaterialCommunityIcons name={stat.icon as any} size={16} color={stat.color} />
              <Text style={{ fontSize: Colors.font.lg, fontWeight: '900', color: stat.color }}>{stat.value}</Text>
              <Text style={{ fontSize: 9, fontWeight: '700', color: stat.color + 'aa', textTransform: 'uppercase' }}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Search */}
      {notebooks.length > 3 && (
        <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.inputBg, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: colors.border }}>
            <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} />
            <TextInput
              style={{ flex: 1, fontSize: Colors.font.base, color: colors.text, padding: 0 }}
              value={search} onChangeText={setSearch}
              placeholder="Search notebooks…" placeholderTextColor={colors.textMuted}
            />
            {search ? <TouchableOpacity onPress={() => setSearch('')}><MaterialCommunityIcons name="close" size={16} color={colors.textMuted} /></TouchableOpacity> : null}
          </View>
        </View>
      )}

      {/* Favorites row */}
      {favoriteNotebooks.length > 0 && !search && (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: Colors.font.sm, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: 16, marginBottom: 10 }}>
            ❤️ Favorites
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
            {favoriteNotebooks.map(nb => (
              <TouchableOpacity
                key={nb.id}
                style={{ width: 100, padding: 12, borderRadius: 16, backgroundColor: nb.color + '18', borderWidth: 1.5, borderColor: nb.color + '44', alignItems: 'center', gap: 6 }}
                onPress={() => router.push(`/notebooks/${nb.id}`)}
              >
                <Text style={{ fontSize: 26 }}>{nb.emoji}</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text, textAlign: 'center' }} numberOfLines={1}>{nb.title}</Text>
                <Text style={{ fontSize: 10, color: nb.color, fontWeight: '600' }}>{getNoteCount(nb.id)} notes</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={activeNotebooks}
        keyExtractor={nb => nb.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode}
        columnWrapperStyle={viewMode === 'grid' ? { paddingHorizontal: 16, gap: 12 } : undefined}
        contentContainerStyle={{ paddingBottom: 100 }}
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
        renderItem={viewMode === 'grid' ? renderGrid : renderList}
      />

      {/* Create / Edit Modal */}
      <Modal visible={showCreate || !!editingNotebook} transparent animationType="slide">
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={resetForm}>
          <Pressable
            style={{ backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 40, maxHeight: '92%' }}
            onPress={() => {}}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <ModalForm isEdit={!!editingNotebook} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Sort menu */}
      <Modal visible={showSortMenu} transparent animationType="fade">
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} onPress={() => setShowSortMenu(false)}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 }} />
            <Text style={{ fontSize: Colors.font.xl, fontWeight: '800', color: colors.text, marginBottom: 12 }}>Sort By</Text>
            {([
              { id: 'modified', label: 'Last Modified', icon: 'clock-outline' },
              { id: 'name', label: 'Name (A–Z)', icon: 'sort-alphabetical-ascending' },
              { id: 'count', label: 'Note Count', icon: 'sort-numeric-descending' },
            ] as { id: SortMode; label: string; icon: string }[]).map(opt => (
              <TouchableOpacity
                key={opt.id}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 14, backgroundColor: sortMode === opt.id ? colors.primarySoft : 'transparent', marginBottom: 4 }}
                onPress={() => { setSortMode(opt.id); setShowSortMenu(false); haptic.select(); }}
              >
                <MaterialCommunityIcons name={opt.icon as any} size={20} color={sortMode === opt.id ? colors.primary : colors.textSecondary} />
                <Text style={{ fontSize: Colors.font.base, fontWeight: '600', color: sortMode === opt.id ? colors.primary : colors.text, flex: 1 }}>{opt.label}</Text>
                {sortMode === opt.id && <MaterialCommunityIcons name="check" size={18} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
