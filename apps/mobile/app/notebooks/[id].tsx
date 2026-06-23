import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { haptic } from '../../src/utils/haptics';
import { useTheme } from '../../src/context/ThemeContext';
import { useNotes, Note } from '../../src/context/NotesContext';
import { NoteCard } from '../../src/components/NoteCard';
import { SearchBar } from '../../src/components/SearchBar';
import { EmptyState } from '../../src/components/EmptyState';
import { Colors } from '../../src/constants/colors';
import { sortNotes, filterNotes } from '../../src/utils/noteUtils';

export default function NotebookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { notebooks, getNotesByNotebook, trashNote, pinNote, duplicateNote } = useNotes();
  const insets = useSafeAreaInsets();

  const notebook = notebooks.find(nb => nb.id === id);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'modified' | 'created' | 'title'>('modified');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const notes = useMemo(() => {
    const base = getNotesByNotebook(id);
    const searched = search ? filterNotes(base, search) : base;
    return sortNotes(searched, sortBy);
  }, [id, search, sortBy, getNotesByNotebook]);

  const s = styles(colors);

  if (!notebook) {
    return (
      <View style={[s.screen, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={[s.backBtn, { marginTop: topPad + 8, marginLeft: 16 }]} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <EmptyState icon="notebook-outline" title="Notebook not found" />
      </View>
    );
  }

  const bgColor = notebook.color + '22';

  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: topPad + 4, backgroundColor: bgColor }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={s.headerTitle}>
          <Text style={s.notebookEmoji}>{notebook.emoji}</Text>
          <View>
            <Text style={s.notebookTitle}>{notebook.title}</Text>
            <Text style={s.notebookMeta}>{notes.length} notes</Text>
          </View>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.actionBtn} onPress={() => { setViewMode(v => v === 'list' ? 'grid' : 'list'); haptic.select(); }}>
            <MaterialCommunityIcons name={viewMode === 'list' ? 'view-grid-outline' : 'view-list-outline'} size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.createBtn, { backgroundColor: notebook.color }]}
            onPress={() => router.push({ pathname: '/notes/create', params: { notebookId: id } })}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.searchRow}>
        <SearchBar value={search} onChangeText={setSearch} onClear={() => setSearch('')} placeholder={`Search in ${notebook.title}...`} />
      </View>

      <View style={s.sortRow}>
        {(['modified', 'created', 'title'] as const).map(s2 => (
          <TouchableOpacity
            key={s2}
            style={[s.sortBtn, sortBy === s2 && s.sortBtnActive]}
            onPress={() => { setSortBy(s2); haptic.select(); }}
          >
            <Text style={[s.sortText, sortBy === s2 && { color: colors.primary }]}>
              {s2 === 'modified' ? 'Recent' : s2 === 'created' ? 'Oldest' : 'A–Z'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={notes}
        keyExtractor={n => n.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode}
        columnWrapperStyle={viewMode === 'grid' ? s.gridRow : undefined}
        contentContainerStyle={[s.list, viewMode === 'grid' && { paddingHorizontal: 16 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="note-plus-outline"
            title={search ? 'No results' : 'No notes yet'}
            description={search ? `No notes match "${search}"` : `Add your first note to ${notebook.title}`}
            actionLabel={!search ? 'Create Note' : undefined}
            onAction={!search ? () => router.push({ pathname: '/notes/create', params: { notebookId: id } }) : undefined}
          />
        }
        renderItem={({ item, index }: { item: Note; index: number }) => (
          <Animated.View
            entering={FadeInDown.delay(index * 30).springify()}
            style={viewMode === 'grid' ? { flex: 1 } : {}}
          >
            <NoteCard
              note={item}
              onPress={() => router.push(`/notes/${item.id}`)}
              onDelete={() => trashNote(item.id)}
              onPin={() => pinNote(item.id, !item.isPinned)}
              onDuplicate={() => duplicateNote(item.id)}
              viewMode={viewMode}
            />
          </Animated.View>
        )}
      />
    </View>
  );
}

const styles = (colors: typeof Colors.light) => StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 16, gap: 12,
  },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface + 'cc' },
  headerTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  notebookEmoji: { fontSize: 36 },
  notebookTitle: { fontSize: Colors.font.xl, fontWeight: '700', color: colors.text },
  notebookMeta: { fontSize: Colors.font.sm, color: colors.textSecondary },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  actionBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface + 'cc' },
  createBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  searchRow: { paddingHorizontal: 16, paddingVertical: 10 },
  sortRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  sortBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: Colors.radius.full,
    backgroundColor: colors.inputBg,
  },
  sortBtnActive: { backgroundColor: colors.primarySoft },
  sortText: { fontSize: Colors.font.sm, fontWeight: '600', color: colors.textSecondary },
  list: { paddingBottom: 100 },
  gridRow: { gap: 8, marginBottom: 8 },
});
