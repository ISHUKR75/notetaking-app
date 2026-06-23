import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Platform, ScrollView, Modal, Pressable, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../src/context/ThemeContext';
import { useNotes, Note } from '../../src/context/NotesContext';
import { NoteCard } from '../../src/components/NoteCard';
import { EmptyState } from '../../src/components/EmptyState';
import { SearchBar } from '../../src/components/SearchBar';
import { sortNotes, filterNotes } from '../../src/utils/noteUtils';
import { Colors } from '../../src/constants/colors';
import { getTodayString } from '../../src/utils/dateUtils';
import { haptic } from '../../src/utils/haptics';

type ViewMode = 'list' | 'grid';
type FilterMode = 'all' | 'pinned' | 'flagged' | 'recent' | 'favorites';

const GREETING_EMOJIS = ['✨', '🌟', '💫', '🎯', '🚀', '🌈', '⚡', '🎨'];
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 5) return 'Good Night';
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  if (h < 21) return 'Good Evening';
  return 'Good Night';
};

export default function HomeScreen() {
  const router = useRouter();
  const { colors, settings, updateSettings, isDark } = useTheme();
  const {
    notes, notebooks, trashNote, pinNote, archiveNote, duplicateNote,
    getRecentNotes, getPinnedNotes, getFlaggedNotes,
  } = useNotes();

  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>(settings.noteViewMode);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [sortBy, setSortBy] = useState<'modified' | 'created' | 'title'>(settings.sortBy);
  const [refreshing, setRefreshing] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  const activeNotes = useMemo(() => {
    let base: Note[];
    if (filter === 'pinned') base = getPinnedNotes();
    else if (filter === 'flagged') base = getFlaggedNotes();
    else if (filter === 'recent') base = getRecentNotes(30);
    else if (filter === 'favorites') base = notes.filter(n => n.isFavorite && !n.isTrashed && !n.isArchived);
    else base = notes.filter(n => !n.isTrashed && !n.isArchived);

    if (search) return filterNotes(base, search);
    return sortNotes(base, sortBy);
  }, [notes, filter, sortBy, search, getPinnedNotes, getFlaggedNotes, getRecentNotes]);

  const pinnedNotes = useMemo(() => activeNotes.filter(n => n.isPinned), [activeNotes]);
  const unpinnedNotes = useMemo(() => activeNotes.filter(n => !n.isPinned), [activeNotes]);

  const getNotebookName = useCallback((notebookId: string | null) =>
    notebooks.find(nb => nb.id === notebookId)?.title || '', [notebooks]);

  const handleNotePress = (note: Note) => router.push(`/notes/${note.id}`);

  const handleCreate = () => {
    haptic.medium();
    router.push('/notes/create');
  };

  const handleDelete = (noteId: string) => {
    haptic.warning();
    trashNote(noteId);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 700));
    setRefreshing(false);
  }, []);

  const toggleViewMode = () => {
    const next: ViewMode = viewMode === 'list' ? 'grid' : 'list';
    setViewMode(next);
    updateSettings({ noteViewMode: next });
    haptic.select();
  };

  const s = styles(colors);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const totalNotes = notes.filter(n => !n.isTrashed && !n.isArchived).length;
  const pinnedCount = getPinnedNotes().length;
  const recentCount = getRecentNotes(7).length;

  const filters: { id: FilterMode; label: string; icon: string }[] = [
    { id: 'all', label: 'All', icon: 'note-multiple-outline' },
    { id: 'pinned', label: 'Pinned', icon: 'pin-outline' },
    { id: 'flagged', label: 'Flagged', icon: 'flag-outline' },
    { id: 'recent', label: 'Recent', icon: 'clock-outline' },
    { id: 'favorites', label: 'Favorites', icon: 'heart-outline' },
  ];

  const sortOptions: { id: 'modified' | 'created' | 'title'; label: string; icon: string }[] = [
    { id: 'modified', label: 'Last Modified', icon: 'clock-edit-outline' },
    { id: 'created', label: 'Date Created', icon: 'calendar-plus' },
    { id: 'title', label: 'Alphabetical', icon: 'sort-alphabetical-ascending' },
  ];

  const renderNote = useCallback(({ item, index }: { item: Note; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 25).springify()}>
      <NoteCard
        note={item}
        onPress={() => handleNotePress(item)}
        onDelete={() => handleDelete(item.id)}
        onPin={() => { pinNote(item.id, !item.isPinned); haptic.select(); }}
        onFlag={() => {}}
        onDuplicate={() => duplicateNote(item.id)}
        onArchive={() => archiveNote(item.id)}
        viewMode={viewMode}
        showNotebook
        notebookName={getNotebookName(item.notebookId)}
      />
    </Animated.View>
  ), [viewMode, getNotebookName, pinNote, duplicateNote, archiveNote]);

  const renderHeader = () => (
    <View>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <View style={s.headerLeft}>
          <Text style={s.greeting}>{getTodayString()}</Text>
          <Text style={s.headerTitle}>My Notes</Text>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.headerBtn} onPress={() => { setShowSortMenu(!showSortMenu); haptic.select(); }}>
            <MaterialCommunityIcons name="sort-variant" size={21} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={s.headerBtn} onPress={toggleViewMode}>
            <MaterialCommunityIcons
              name={viewMode === 'list' ? 'view-grid-outline' : 'view-list-outline'}
              size={21}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.quickStats}>
        {[
          { label: 'Total', value: totalNotes, icon: 'note-multiple-outline', color: colors.primary },
          { label: 'Pinned', value: pinnedCount, icon: 'pin', color: '#f59e0b' },
          { label: 'This Week', value: recentCount, icon: 'clock-outline', color: '#10b981' },
          { label: 'Notebooks', value: notebooks.length, icon: 'notebook-outline', color: '#8b5cf6' },
        ].map(stat => (
          <View key={stat.label} style={[s.statPill, { backgroundColor: stat.color + '18' }]}>
            <MaterialCommunityIcons name={stat.icon as any} size={13} color={stat.color} />
            <Text style={[s.statPillNum, { color: stat.color }]}>{stat.value}</Text>
            <Text style={[s.statPillLabel, { color: stat.color + 'cc' }]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={s.searchRow}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          onClear={() => setSearch('')}
        />
      </View>

      {showSortMenu && (
        <Animated.View entering={FadeIn} style={[s.sortMenu, { backgroundColor: colors.surface }]}>
          <Text style={s.sortMenuTitle}>Sort by</Text>
          {sortOptions.map(opt => (
            <TouchableOpacity
              key={opt.id}
              style={[s.sortItem, sortBy === opt.id && s.sortItemActive]}
              onPress={() => { setSortBy(opt.id); updateSettings({ sortBy: opt.id }); setShowSortMenu(false); haptic.select(); }}
            >
              <MaterialCommunityIcons
                name={opt.icon as any}
                size={18}
                color={sortBy === opt.id ? colors.primary : colors.textSecondary}
              />
              <Text style={[s.sortText, sortBy === opt.id && { color: colors.primary, fontWeight: '700' }]}>
                {opt.label}
              </Text>
              {sortBy === opt.id && (
                <MaterialCommunityIcons name="check" size={16} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}

      <View style={s.filterRow}>
        <FlatList
          horizontal
          data={filters}
          keyExtractor={f => f.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterList}
          renderItem={({ item: f }) => (
            <TouchableOpacity
              style={[s.filterChip, filter === f.id && s.filterChipActive]}
              onPress={() => { setFilter(f.id); haptic.select(); }}
            >
              <MaterialCommunityIcons
                name={f.icon as any}
                size={13}
                color={filter === f.id ? '#fff' : colors.textSecondary}
              />
              <Text style={[s.filterText, filter === f.id && s.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {pinnedNotes.length > 0 && filter === 'all' && !search && (
        <View style={s.sectionHeader}>
          <MaterialCommunityIcons name="pin" size={13} color={colors.primary} />
          <Text style={s.sectionTitle}>Pinned</Text>
          <Text style={s.noteCountBadge}>{pinnedNotes.length}</Text>
        </View>
      )}
    </View>
  );

  const allDisplayNotes = filter === 'all' && !search
    ? [...pinnedNotes, ...(pinnedNotes.length > 0 ? [{ id: '__divider__' } as any] : []), ...unpinnedNotes]
    : activeNotes;

  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={allDisplayNotes}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => {
          if (item.id === '__divider__') {
            return (
              <View style={s.sectionHeader}>
                <MaterialCommunityIcons name="note-multiple-outline" size={13} color={colors.textMuted} />
                <Text style={s.sectionTitle}>All Notes</Text>
                <Text style={s.noteCountBadge}>{unpinnedNotes.length}</Text>
              </View>
            );
          }
          return renderNote({ item, index });
        }}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            icon="note-plus-outline"
            title={search ? 'No notes found' : 'No notes yet'}
            description={search ? `No notes match "${search}"` : 'Tap + to create your first note'}
            actionLabel={search ? undefined : 'Create Note'}
            onAction={search ? undefined : handleCreate}
          />
        }
        key={viewMode}
        numColumns={viewMode === 'grid' ? 2 : 1}
        columnWrapperStyle={viewMode === 'grid' ? s.gridRow : undefined}
        contentContainerStyle={[s.list, viewMode === 'grid' && s.gridList]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
      />

      <View style={[s.fabArea, { bottom: Platform.OS === 'web' ? 34 + 84 : insets.bottom + 80 }]}>
        <TouchableOpacity style={[s.quickActionBtn, { backgroundColor: colors.surface }]} onPress={() => { setShowQuickActions(true); haptic.light(); }}>
          <MaterialCommunityIcons name="dots-horizontal" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={s.fab} onPress={handleCreate}>
          <MaterialCommunityIcons name="plus" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <Modal visible={showQuickActions} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={() => setShowQuickActions(false)}>
          <Pressable style={[s.quickSheet, { backgroundColor: colors.surface }]}>
            <View style={s.sheetHandle} />
            <Text style={[s.sheetTitle, { color: colors.text }]}>Quick Actions</Text>
            <View style={s.quickGrid}>
              {[
                { icon: 'note-plus-outline', label: 'Text Note', color: '#6366f1', action: () => { router.push('/notes/create'); setShowQuickActions(false); } },
                { icon: 'draw', label: 'Drawing', color: '#10b981', action: () => { router.push('/(tabs)/'); setShowQuickActions(false); } },
                { icon: 'microphone-outline', label: 'Voice Note', color: '#f59e0b', action: () => { Alert.alert('Voice Note', 'Voice recording coming soon!'); setShowQuickActions(false); } },
                { icon: 'camera-outline', label: 'Scan Doc', color: '#3b82f6', action: () => { Alert.alert('Scanner', 'Document scanner coming soon!'); setShowQuickActions(false); } },
                { icon: 'notebook-plus-outline', label: 'New Notebook', color: '#8b5cf6', action: () => { router.push('/(tabs)/notebooks'); setShowQuickActions(false); } },
                { icon: 'tag-plus-outline', label: 'Manage Tags', color: '#ec4899', action: () => { Alert.alert('Tags', 'Tag manager coming soon!'); setShowQuickActions(false); } },
                { icon: 'import', label: 'Import', color: '#06b6d4', action: () => { Alert.alert('Import', 'Import from Notion, Evernote, and more — coming soon!'); setShowQuickActions(false); } },
                { icon: 'trash-can-outline', label: 'Trash', color: '#ef4444', action: () => { Alert.alert('Trash', `${notes.filter(n => n.isTrashed).length} items in trash.`); setShowQuickActions(false); } },
              ].map((action, i) => (
                <Animated.View key={action.label} entering={ZoomIn.delay(i * 30).springify()}>
                  <TouchableOpacity style={s.quickActionItem} onPress={action.action}>
                    <View style={[s.quickActionIcon, { backgroundColor: action.color + '22' }]}>
                      <MaterialCommunityIcons name={action.icon as any} size={26} color={action.color} />
                    </View>
                    <Text style={[s.quickActionLabel, { color: colors.text }]}>{action.label}</Text>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
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
    paddingHorizontal: 20, paddingBottom: 12,
  },
  headerLeft: {},
  greeting: { fontSize: Colors.font.sm, color: colors.textMuted, marginBottom: 2, fontWeight: '500' },
  headerTitle: { fontSize: Colors.font.display, fontWeight: '900', color: colors.text },
  headerActions: { flexDirection: 'row', gap: 6, marginTop: 8 },
  headerBtn: {
    width: 40, height: 40, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1, borderColor: colors.border,
  },
  quickStats: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  statPill: {
    flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, paddingVertical: 10, gap: 2,
  },
  statPillNum: { fontSize: Colors.font.lg, fontWeight: '800' },
  statPillLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  searchRow: { paddingHorizontal: 16, paddingBottom: 8 },
  sortMenu: {
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: Colors.radius.xl,
    borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16,
    elevation: 8,
  },
  sortMenuTitle: { fontSize: Colors.font.sm, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  sortItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  sortItemActive: { backgroundColor: colors.primarySoft },
  sortText: { fontSize: Colors.font.base, color: colors.textSecondary, fontWeight: '500', flex: 1 },
  filterRow: { marginBottom: 8 },
  filterList: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Colors.radius.full,
    backgroundColor: colors.inputBg,
    borderWidth: 1.5, borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: Colors.font.sm, fontWeight: '700', color: colors.textSecondary },
  filterTextActive: { color: '#fff' },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 8, gap: 6,
  },
  sectionTitle: { fontSize: Colors.font.sm, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  noteCountBadge: { fontSize: 11, color: colors.textMuted, fontWeight: '700', backgroundColor: colors.inputBg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  list: { paddingBottom: 140 },
  gridList: { paddingHorizontal: 16 },
  gridRow: { gap: 10, marginBottom: 10 },
  fabArea: {
    position: 'absolute', right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  quickActionBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 8,
    elevation: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  fab: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  quickSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: Colors.font.xl, fontWeight: '800', marginBottom: 16 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickActionItem: { width: (Platform.OS === 'web' ? 400 : 360) / 4 - 10, alignItems: 'center', gap: 8 },
  quickActionIcon: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  quickActionLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
});
