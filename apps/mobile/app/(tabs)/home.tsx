import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/context/ThemeContext';
import { useNotes, Note } from '../../src/context/NotesContext';
import { NoteCard } from '../../src/components/NoteCard';
import { EmptyState } from '../../src/components/EmptyState';
import { SearchBar } from '../../src/components/SearchBar';
import { sortNotes, filterNotes } from '../../src/utils/noteUtils';
import { Colors } from '../../src/constants/colors';
import { getTodayString } from '../../src/utils/dateUtils';

type ViewMode = 'list' | 'grid';
type FilterMode = 'all' | 'pinned' | 'flagged' | 'recent';

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

  const activeNotes = useMemo(() => {
    let base: Note[];
    if (filter === 'pinned') base = getPinnedNotes();
    else if (filter === 'flagged') base = getFlaggedNotes();
    else if (filter === 'recent') base = getRecentNotes(30);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/notes/create');
  };

  const handleDelete = (noteId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    trashNote(noteId);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 600));
    setRefreshing(false);
  }, []);

  const toggleViewMode = () => {
    const next: ViewMode = viewMode === 'list' ? 'grid' : 'list';
    setViewMode(next);
    updateSettings({ noteViewMode: next });
    Haptics.selectionAsync();
  };

  const s = styles(colors);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const filters: { id: FilterMode; label: string; icon: string }[] = [
    { id: 'all', label: 'All', icon: 'note-multiple-outline' },
    { id: 'pinned', label: 'Pinned', icon: 'pin-outline' },
    { id: 'flagged', label: 'Flagged', icon: 'flag-outline' },
    { id: 'recent', label: 'Recent', icon: 'clock-outline' },
  ];

  const renderNote = useCallback(({ item, index }: { item: Note; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 30).springify()}>
      <NoteCard
        note={item}
        onPress={() => handleNotePress(item)}
        onDelete={() => handleDelete(item.id)}
        onPin={() => pinNote(item.id, !item.isPinned)}
        onFlag={() => {}}
        onDuplicate={() => duplicateNote(item.id)}
        viewMode={viewMode}
        showNotebook
        notebookName={getNotebookName(item.notebookId)}
      />
    </Animated.View>
  ), [viewMode, getNotebookName, pinNote, duplicateNote]);

  const renderHeader = () => (
    <View>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <View>
          <Text style={s.dateText}>{getTodayString()}</Text>
          <Text style={s.headerTitle}>My Notes</Text>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.headerBtn} onPress={() => setShowSortMenu(!showSortMenu)}>
            <MaterialCommunityIcons name="sort-variant" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={s.headerBtn} onPress={toggleViewMode}>
            <MaterialCommunityIcons name={viewMode === 'list' ? 'view-grid-outline' : 'view-list-outline'} size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.searchRow}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          onClear={() => setSearch('')}
        />
      </View>

      {showSortMenu && (
        <View style={s.sortMenu}>
          {(['modified', 'created', 'title'] as const).map(s2 => (
            <TouchableOpacity
              key={s2}
              style={[s.sortItem, sortBy === s2 && s.sortItemActive]}
              onPress={() => { setSortBy(s2); updateSettings({ sortBy: s2 }); setShowSortMenu(false); }}
            >
              <MaterialCommunityIcons
                name={s2 === 'modified' ? 'clock-edit-outline' : s2 === 'created' ? 'calendar-plus' : 'sort-alphabetical-ascending'}
                size={18}
                color={sortBy === s2 ? colors.primary : colors.textSecondary}
              />
              <Text style={[s.sortText, sortBy === s2 && { color: colors.primary }]}>
                {s2 === 'modified' ? 'Last Modified' : s2 === 'created' ? 'Date Created' : 'Alphabetical'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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
              onPress={() => { setFilter(f.id); Haptics.selectionAsync(); }}
            >
              <MaterialCommunityIcons
                name={f.icon as any}
                size={14}
                color={filter === f.id ? '#fff' : colors.textSecondary}
              />
              <Text style={[s.filterText, filter === f.id && s.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {pinnedNotes.length > 0 && filter === 'all' && !search && (
        <View style={s.sectionHeader}>
          <MaterialCommunityIcons name="pin" size={14} color={colors.primary} />
          <Text style={s.sectionTitle}>Pinned</Text>
        </View>
      )}
    </View>
  );

  const getNumColumns = () => (viewMode === 'grid' ? 2 : 1);

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
                <MaterialCommunityIcons name="note-multiple-outline" size={14} color={colors.textMuted} />
                <Text style={s.sectionTitle}>All Notes</Text>
                <Text style={s.noteCount}>{unpinnedNotes.length}</Text>
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
            description={search ? `No notes match "${search}"` : 'Tap the button below to create your first note'}
            actionLabel={search ? undefined : 'Create Note'}
            onAction={search ? undefined : handleCreate}
          />
        }
        key={viewMode}
        numColumns={viewMode === 'grid' ? 2 : 1}
        columnWrapperStyle={viewMode === 'grid' ? s.gridRow : undefined}
        contentContainerStyle={[s.list, viewMode === 'grid' && s.gridList]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity style={[s.fab, { bottom: Platform.OS === 'web' ? 34 + 84 : insets.bottom + 80 }]} onPress={handleCreate}>
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = (colors: typeof Colors.light) => StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 4,
  },
  dateText: { fontSize: Colors.font.sm, color: colors.textMuted, marginBottom: 2 },
  headerTitle: { fontSize: Colors.font.xxxl, fontWeight: '800', color: colors.text },
  headerActions: { flexDirection: 'row', gap: 4, marginTop: 4 },
  headerBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.inputBg },
  searchRow: { paddingHorizontal: 16, paddingVertical: 12 },
  sortMenu: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: colors.surface, borderRadius: Colors.radius.lg,
    borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
  },
  sortItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  sortItemActive: { backgroundColor: colors.primarySoft },
  sortText: { fontSize: Colors.font.base, color: colors.textSecondary, fontWeight: '500' },
  filterRow: { marginBottom: 8 },
  filterList: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: Colors.radius.full,
    backgroundColor: colors.inputBg,
    borderWidth: 1, borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: Colors.font.sm, fontWeight: '600', color: colors.textSecondary },
  filterTextActive: { color: '#fff' },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 8, gap: 6,
  },
  sectionTitle: { fontSize: Colors.font.sm, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  noteCount: { fontSize: Colors.font.sm, color: colors.textMuted, marginLeft: 4 },
  list: { paddingBottom: 120 },
  gridList: { paddingHorizontal: 16 },
  gridRow: { gap: 8, marginBottom: 8 },
  fab: {
    position: 'absolute', right: 20,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
