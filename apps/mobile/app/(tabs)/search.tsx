import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useTheme } from '../../src/context/ThemeContext';
import { useNotes, Note } from '../../src/context/NotesContext';
import { NoteCard } from '../../src/components/NoteCard';
import { SearchBar } from '../../src/components/SearchBar';
import { EmptyState } from '../../src/components/EmptyState';
import { Colors } from '../../src/constants/colors';
import { haptic } from '../../src/utils/haptics';

type SearchFilter = 'all' | 'text' | 'handwriting' | 'voice' | 'flagged' | 'pinned';

const FILTER_OPTIONS: { id: SearchFilter; label: string; icon: string; color: string }[] = [
  { id: 'all', label: 'All', icon: 'magnify', color: '#6366f1' },
  { id: 'text', label: 'Text', icon: 'text', color: '#3b82f6' },
  { id: 'handwriting', label: 'Drawing', icon: 'draw', color: '#10b981' },
  { id: 'voice', label: 'Voice', icon: 'microphone', color: '#f59e0b' },
  { id: 'flagged', label: 'Flagged', icon: 'flag', color: '#ef4444' },
  { id: 'pinned', label: 'Pinned', icon: 'pin', color: '#8b5cf6' },
];

export default function SearchScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { notes, notebooks, tags, searchNotes, getRecentNotes } = useNotes();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<SearchFilter>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>(['meeting notes', 'project ideas', 'shopping list']);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const allActiveNotes = useMemo(() => notes.filter(n => !n.isTrashed && !n.isArchived), [notes]);

  const results = useMemo(() => {
    let base = query ? searchNotes(query) : [];

    if (selectedTag) {
      const tagFiltered = allActiveNotes.filter(n => n.tags.includes(selectedTag));
      base = query ? base.filter(n => n.tags.includes(selectedTag)) : tagFiltered;
    }

    if (activeFilter !== 'all' && (query || selectedTag)) {
      if (activeFilter === 'text') base = base.filter(n => n.type === 'text');
      else if (activeFilter === 'handwriting') base = base.filter(n => n.hasHandwriting);
      else if (activeFilter === 'voice') base = base.filter(n => n.hasAudio);
      else if (activeFilter === 'flagged') base = base.filter(n => n.isFlagged);
      else if (activeFilter === 'pinned') base = base.filter(n => n.isPinned);
    }

    return base;
  }, [query, selectedTag, activeFilter, searchNotes, allActiveNotes]);

  const recentNotes = useMemo(() => getRecentNotes(8), [getRecentNotes]);

  const getNotebookName = useCallback((notebookId: string | null) =>
    notebooks.find(nb => nb.id === notebookId)?.title || '', [notebooks]);

  const isSearching = query.length > 0 || selectedTag !== null;

  const handleNotePress = (note: Note) => {
    if (query && !recentSearches.includes(query)) {
      setRecentSearches(prev => [query, ...prev.slice(0, 4)]);
    }
    router.push(`/notes/${note.id}`);
  };

  const s = styles(colors);

  const notesByType = useMemo(() => ({
    total: allActiveNotes.length,
    text: allActiveNotes.filter(n => n.type === 'text').length,
    drawing: allActiveNotes.filter(n => n.hasHandwriting).length,
    voice: allActiveNotes.filter(n => n.hasAudio).length,
    flagged: allActiveNotes.filter(n => n.isFlagged).length,
  }), [allActiveNotes]);

  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Text style={s.headerTitle}>Search</Text>
        <Text style={s.headerSub}>{allActiveNotes.length} notes</Text>
      </View>

      <View style={s.searchRow}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          onClear={() => { setQuery(''); setSelectedTag(null); }}
          autoFocus={false}
          placeholder="Search notes, tags, content..."
        />
      </View>

      {isSearching && (
        <View style={s.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterContent}>
            {FILTER_OPTIONS.map(f => (
              <TouchableOpacity
                key={f.id}
                style={[s.filterChip, activeFilter === f.id && { backgroundColor: f.color, borderColor: f.color }]}
                onPress={() => { setActiveFilter(f.id); haptic.select(); }}
              >
                <MaterialCommunityIcons name={f.icon as any} size={13} color={activeFilter === f.id ? '#fff' : colors.textSecondary} />
                <Text style={[s.filterLabel, activeFilter === f.id && { color: '#fff' }]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {!isSearching && (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={s.statsSection}>
            <View style={s.statsGrid}>
              {[
                { label: 'Text Notes', value: notesByType.text, icon: 'text', color: '#3b82f6' },
                { label: 'Drawings', value: notesByType.drawing, icon: 'draw', color: '#10b981' },
                { label: 'Voice Notes', value: notesByType.voice, icon: 'microphone', color: '#f59e0b' },
                { label: 'Flagged', value: notesByType.flagged, icon: 'flag', color: '#ef4444' },
              ].map(stat => (
                <TouchableOpacity
                  key={stat.label}
                  style={[s.statCard, { backgroundColor: stat.color + '18' }]}
                  onPress={() => { setActiveFilter(stat.label.toLowerCase().replace(' notes', '') as SearchFilter); setQuery(' '); }}
                >
                  <MaterialCommunityIcons name={stat.icon as any} size={20} color={stat.color} />
                  <Text style={[s.statNum, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={[s.statLabel, { color: stat.color + 'bb' }]}>{stat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {tags.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Tags</Text>
              <View style={s.tagsWrap}>
                {tags.map(tag => (
                  <TouchableOpacity
                    key={tag.id}
                    style={[s.tagChip, { borderColor: tag.color, backgroundColor: tag.color + '18' }]}
                    onPress={() => { setSelectedTag(tag.name); haptic.select(); }}
                  >
                    <View style={[s.tagDot, { backgroundColor: tag.color }]} />
                    <Text style={[s.tagChipText, { color: tag.color }]}>#{tag.name}</Text>
                    <Text style={[s.tagCount, { color: tag.color + '99' }]}>{tag.count}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {recentSearches.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionRow}>
                <Text style={s.sectionTitle}>Recent Searches</Text>
                <TouchableOpacity onPress={() => setRecentSearches([])}>
                  <Text style={[s.clearText, { color: colors.primary }]}>Clear</Text>
                </TouchableOpacity>
              </View>
              {recentSearches.map((search, i) => (
                <TouchableOpacity
                  key={i}
                  style={s.recentItem}
                  onPress={() => setQuery(search)}
                >
                  <MaterialCommunityIcons name="history" size={16} color={colors.textMuted} />
                  <Text style={[s.recentText, { color: colors.textSecondary }]}>{search}</Text>
                  <TouchableOpacity onPress={() => setRecentSearches(prev => prev.filter((_, idx) => idx !== i))}>
                    <MaterialCommunityIcons name="close" size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={s.section}>
            <Text style={s.sectionTitle}>Recent Notes</Text>
          </View>

          {recentNotes.map((note, i) => (
            <Animated.View key={note.id} entering={FadeInDown.delay(i * 30).springify()}>
              <NoteCard
                note={note}
                onPress={() => handleNotePress(note)}
                showNotebook
                notebookName={getNotebookName(note.notebookId)}
              />
            </Animated.View>
          ))}
          <View style={{ height: 120 }} />
        </ScrollView>
      )}

      {isSearching && (
        <>
          <View style={s.resultHeader}>
            {selectedTag && (
              <TouchableOpacity
                style={[s.activeTagChip, { backgroundColor: colors.primarySoft }]}
                onPress={() => setSelectedTag(null)}
              >
                <MaterialCommunityIcons name="tag" size={13} color={colors.primary} />
                <Text style={[s.activeTagText, { color: colors.primary }]}>#{selectedTag}</Text>
                <MaterialCommunityIcons name="close" size={13} color={colors.primary} />
              </TouchableOpacity>
            )}
            <Text style={s.resultCount}>
              {results.length} {results.length === 1 ? 'result' : 'results'}
              {query ? ` for "${query}"` : ''}
            </Text>
          </View>

          <FlatList
            data={results}
            keyExtractor={n => n.id}
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <EmptyState
                icon="magnify-close"
                title="No results found"
                description={query ? `No notes match "${query}"` : 'No notes match the selected tag'}
              />
            }
            renderItem={({ item, index }: { item: Note; index: number }) => (
              <Animated.View entering={FadeInDown.delay(index * 25).springify()}>
                <NoteCard
                  note={item}
                  onPress={() => handleNotePress(item)}
                  showNotebook
                  notebookName={getNotebookName(item.notebookId)}
                />
              </Animated.View>
            )}
          />
        </>
      )}
    </View>
  );
}

const styles = (colors: typeof Colors.light) => StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 4, flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  headerTitle: { fontSize: Colors.font.xxxl, fontWeight: '800', color: colors.text },
  headerSub: { fontSize: Colors.font.sm, color: colors.textMuted, fontWeight: '500' },
  searchRow: { paddingHorizontal: 16, paddingVertical: 10 },
  filterRow: { marginBottom: 8 },
  filterContent: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: Colors.radius.full,
    backgroundColor: colors.inputBg, borderWidth: 1.5, borderColor: colors.border,
  },
  filterLabel: { fontSize: Colors.font.sm, fontWeight: '600', color: colors.textSecondary },
  statsSection: { paddingHorizontal: 16, marginBottom: 8 },
  statsGrid: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, borderRadius: Colors.radius.lg, padding: 14, alignItems: 'center', gap: 4 },
  statNum: { fontSize: Colors.font.xl, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: Colors.font.sm, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  clearText: { fontSize: Colors.font.sm, fontWeight: '600' },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: Colors.radius.full, borderWidth: 1.5 },
  tagDot: { width: 6, height: 6, borderRadius: 3 },
  tagChipText: { fontSize: Colors.font.sm, fontWeight: '600' },
  tagCount: { fontSize: 11, fontWeight: '700' },
  recentItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  recentText: { flex: 1, fontSize: Colors.font.base },
  resultHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 8, gap: 8 },
  resultCount: { fontSize: Colors.font.sm, color: colors.textMuted, fontWeight: '500', flex: 1 },
  activeTagChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Colors.radius.full },
  activeTagText: { fontSize: Colors.font.sm, fontWeight: '600' },
  list: { paddingBottom: 120 },
});
