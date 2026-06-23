import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../src/context/ThemeContext';
import { useNotes, Note } from '../../src/context/NotesContext';
import { NoteCard } from '../../src/components/NoteCard';
import { SearchBar } from '../../src/components/SearchBar';
import { EmptyState } from '../../src/components/EmptyState';
import { TagBadge } from '../../src/components/TagBadge';
import { Colors } from '../../src/constants/colors';

export default function SearchScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { notes, notebooks, tags, searchNotes, getRecentNotes } = useNotes();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const results = useMemo(() => {
    let base = query ? searchNotes(query) : [];
    if (selectedTag) {
      const tagFiltered = notes.filter(n => !n.isTrashed && n.tags.includes(selectedTag));
      base = query ? base.filter(n => n.tags.includes(selectedTag)) : tagFiltered;
    }
    return base;
  }, [query, selectedTag, searchNotes, notes]);

  const recentNotes = useMemo(() => getRecentNotes(8), [getRecentNotes]);

  const getNotebookName = (notebookId: string | null) =>
    notebooks.find(nb => nb.id === notebookId)?.title || '';

  const s = styles(colors);
  const isSearching = query.length > 0 || selectedTag !== null;

  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Text style={s.headerTitle}>Search</Text>
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

      {!isSearching && (
        <>
          <View style={s.section}>
            <Text style={s.sectionTitle}>Tags</Text>
            {tags.length === 0 ? (
              <Text style={s.emptyText}>No tags yet</Text>
            ) : (
              <View style={s.tagsList}>
                {tags.map(tag => (
                  <TouchableOpacity
                    key={tag.id}
                    onPress={() => setSelectedTag(selectedTag === tag.name ? null : tag.name)}
                  >
                    <TagBadge
                      tag={tag.name}
                      color={tag.color}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>Recent Notes</Text>
          </View>
        </>
      )}

      {isSearching && (
        <View style={s.resultHeader}>
          {selectedTag && (
            <TouchableOpacity
              style={[s.activeTag, { backgroundColor: colors.primarySoft }]}
              onPress={() => setSelectedTag(null)}
            >
              <MaterialCommunityIcons name="tag" size={14} color={colors.primary} />
              <Text style={[s.activeTagText, { color: colors.primary }]}>#{selectedTag}</Text>
              <MaterialCommunityIcons name="close" size={14} color={colors.primary} />
            </TouchableOpacity>
          )}
          <Text style={s.resultCount}>{results.length} {results.length === 1 ? 'result' : 'results'}</Text>
        </View>
      )}

      <FlatList
        data={isSearching ? results : recentNotes}
        keyExtractor={n => n.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isSearching ? (
            <EmptyState
              icon="magnify-close"
              title="No results"
              description={`No notes found for "${query}"`}
            />
          ) : null
        }
        renderItem={({ item, index }: { item: Note; index: number }) => (
          <Animated.View entering={FadeInDown.delay(index * 30).springify()}>
            <NoteCard
              note={item}
              onPress={() => router.push(`/notes/${item.id}`)}
              showNotebook
              notebookName={getNotebookName(item.notebookId)}
            />
          </Animated.View>
        )}
      />
    </View>
  );
}

const styles = (colors: typeof Colors.light) => StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 4 },
  headerTitle: { fontSize: Colors.font.xxxl, fontWeight: '800', color: colors.text },
  searchRow: { paddingHorizontal: 16, paddingVertical: 12 },
  section: { paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: Colors.font.sm, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  tagsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emptyText: { fontSize: Colors.font.sm, color: colors.textMuted },
  resultHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 8 },
  resultCount: { fontSize: Colors.font.sm, color: colors.textMuted, fontWeight: '500' },
  activeTag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Colors.radius.full },
  activeTagText: { fontSize: Colors.font.sm, fontWeight: '600' },
  list: { paddingBottom: 100 },
});
