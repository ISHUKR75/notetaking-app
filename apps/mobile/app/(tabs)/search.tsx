import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Platform,
  ScrollView, TextInput, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn, FadeOut } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../src/context/ThemeContext';
import { useNotes, Note } from '../../src/context/NotesContext';
import { NoteCard } from '../../src/components/NoteCard';
import { EmptyState } from '../../src/components/EmptyState';
import { Colors } from '../../src/constants/colors';
import { haptic } from '../../src/utils/haptics';

const { width: SCREEN_W } = Dimensions.get('window');
const RECENT_STORAGE_KEY = '@ishu_recent_searches';

type SearchFilter = 'all' | 'text' | 'handwriting' | 'voice' | 'flagged' | 'pinned' | 'favorites';

const FILTER_OPTIONS: { id: SearchFilter; label: string; icon: string; color: string }[] = [
  { id: 'all',         label: 'All',       icon: 'magnify',              color: '#6366f1' },
  { id: 'text',        label: 'Text',      icon: 'text',                 color: '#3b82f6' },
  { id: 'handwriting', label: 'Drawing',   icon: 'draw',                 color: '#10b981' },
  { id: 'voice',       label: 'Voice',     icon: 'microphone',           color: '#f59e0b' },
  { id: 'flagged',     label: 'Flagged',   icon: 'flag',                 color: '#ef4444' },
  { id: 'pinned',      label: 'Pinned',    icon: 'pin',                  color: '#8b5cf6' },
  { id: 'favorites',   label: 'Favorites', icon: 'heart',                color: '#ec4899' },
];

// Simple fuzzy search — returns a score based on char proximity
function fuzzyScore(text: string, query: string): number {
  if (!query) return 0;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t.includes(q)) return 100 + (q.length / t.length) * 50;
  let qi = 0;
  let score = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) { score += 10 - (i - qi) * 0.5; qi++; }
  }
  return qi === q.length ? score : 0;
}

function scoreNote(note: Note, query: string): number {
  if (!query.trim()) return 0;
  const titleScore = fuzzyScore(note.title, query) * 3;
  const contentScore = fuzzyScore(note.content, query);
  const tagScore = note.tags.some(t => t.includes(query.toLowerCase())) ? 80 : 0;
  return titleScore + contentScore + tagScore;
}

function highlightText(text: string, query: string, style: any, highlightStyle: any): React.ReactNode {
  if (!query.trim() || !text) return <Text style={style}>{text}</Text>;
  const q = query.toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return <Text style={style}>{text}</Text>;
  return (
    <Text style={style}>
      {text.slice(0, idx)}
      <Text style={highlightStyle}>{text.slice(idx, idx + q.length)}</Text>
      {text.slice(idx + q.length)}
    </Text>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { notes, notebooks, tags } = useNotes();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedNotebook, setSelectedNotebook] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<SearchFilter>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>(['meeting notes', 'project ideas', 'shopping']);
  const [isFocused, setIsFocused] = useState(false);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const allActiveNotes = useMemo(() => notes.filter(n => !n.isTrashed && !n.isArchived), [notes]);

  // ── Fuzzy search + filter pipeline ─────────────────────────────────────────

  const results = useMemo(() => {
    let base = allActiveNotes;

    // Tag filter
    if (selectedTag) base = base.filter(n => n.tags.includes(selectedTag));

    // Notebook filter
    if (selectedNotebook) base = base.filter(n => n.notebookId === selectedNotebook);

    // Type filter
    if (activeFilter !== 'all') {
      if (activeFilter === 'text') base = base.filter(n => n.type === 'text');
      else if (activeFilter === 'handwriting') base = base.filter(n => n.hasHandwriting);
      else if (activeFilter === 'voice') base = base.filter(n => n.hasAudio);
      else if (activeFilter === 'flagged') base = base.filter(n => n.isFlagged);
      else if (activeFilter === 'pinned') base = base.filter(n => n.isPinned);
      else if (activeFilter === 'favorites') base = base.filter(n => n.isFavorite);
    }

    // Fuzzy query
    if (query.trim()) {
      const scored = base
        .map(n => ({ note: n, score: scoreNote(n, query) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score);
      return scored.map(({ note }) => note);
    }

    return base.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
  }, [query, selectedTag, selectedNotebook, activeFilter, allActiveNotes]);

  const recentNotes = useMemo(() =>
    [...allActiveNotes].sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()).slice(0, 8),
    [allActiveNotes],
  );

  const getNotebookName = useCallback((notebookId: string | null) =>
    notebooks.find(nb => nb.id === notebookId)?.title || '', [notebooks]);

  const isSearching = query.trim().length > 0 || selectedTag !== null || selectedNotebook !== null || activeFilter !== 'all';

  const handleNotePress = (note: Note) => {
    if (query.trim() && !recentSearches.includes(query.trim())) {
      const updated = [query.trim(), ...recentSearches.slice(0, 7)];
      setRecentSearches(updated);
      AsyncStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
    }
    router.push(`/notes/${note.id}`);
  };

  const clearAll = () => {
    setQuery(''); setSelectedTag(null); setSelectedNotebook(null); setActiveFilter('all');
    haptic.select();
  };

  const notesByType = useMemo(() => ({
    total: allActiveNotes.length,
    text: allActiveNotes.filter(n => n.type === 'text').length,
    drawing: allActiveNotes.filter(n => n.hasHandwriting).length,
    voice: allActiveNotes.filter(n => n.hasAudio).length,
    flagged: allActiveNotes.filter(n => n.isFlagged).length,
    pinned: allActiveNotes.filter(n => n.isPinned).length,
    favorites: allActiveNotes.filter(n => n.isFavorite).length,
  }), [allActiveNotes]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingTop: topPad + 8, paddingHorizontal: 20, paddingBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
          <Text style={{ fontSize: Colors.font.xxxl, fontWeight: '900', color: colors.text }}>Search</Text>
          <Text style={{ fontSize: Colors.font.sm, color: colors.textMuted, fontWeight: '500' }}>{allActiveNotes.length} notes</Text>
        </View>

        {/* Search bar */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          backgroundColor: colors.inputBg, borderRadius: 16,
          paddingHorizontal: 14, paddingVertical: 12,
          borderWidth: isFocused ? 1.5 : 1, borderColor: isFocused ? colors.primary : colors.border,
        }}>
          <MaterialCommunityIcons name="magnify" size={20} color={isFocused ? colors.primary : colors.textMuted} />
          <TextInput
            ref={inputRef}
            style={{ flex: 1, fontSize: Colors.font.base, color: colors.text, padding: 0 }}
            value={query}
            onChangeText={setQuery}
            placeholder="Search notes, tags, content…"
            placeholderTextColor={colors.textMuted}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            returnKeyType="search"
            autoCorrect={false}
          />
          {(query || isSearching) && (
            <TouchableOpacity onPress={clearAll}>
              <MaterialCommunityIcons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter chips — always visible */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 48 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 6, alignItems: 'center' }}>
        {FILTER_OPTIONS.map(f => (
          <TouchableOpacity
            key={f.id}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              paddingHorizontal: 12, paddingVertical: 6, borderRadius: Colors.radius.full,
              backgroundColor: activeFilter === f.id ? f.color : colors.inputBg,
              borderWidth: 1.5, borderColor: activeFilter === f.id ? f.color : colors.border,
            }}
            onPress={() => { setActiveFilter(f.id); haptic.select(); }}
          >
            <MaterialCommunityIcons name={f.icon as any} size={13} color={activeFilter === f.id ? '#fff' : colors.textSecondary} />
            <Text style={{ fontSize: Colors.font.sm, fontWeight: '600', color: activeFilter === f.id ? '#fff' : colors.textSecondary }}>
              {f.label}
            </Text>
            {notesByType[f.id as keyof typeof notesByType] !== undefined && notesByType[f.id as keyof typeof notesByType] > 0 && (
              <Text style={{ fontSize: 10, fontWeight: '800', color: activeFilter === f.id ? 'rgba(255,255,255,0.8)' : colors.textMuted }}>
                {notesByType[f.id as keyof typeof notesByType]}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Active filters strip */}
      {(selectedTag || selectedNotebook) && (
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
          {selectedTag && (
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primarySoft, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 }}
              onPress={() => setSelectedTag(null)}
            >
              <MaterialCommunityIcons name="tag" size={12} color={colors.primary} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>#{selectedTag}</Text>
              <MaterialCommunityIcons name="close" size={12} color={colors.primary} />
            </TouchableOpacity>
          )}
          {selectedNotebook && (
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f59e0b22', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 }}
              onPress={() => setSelectedNotebook(null)}
            >
              <MaterialCommunityIcons name="notebook" size={12} color="#f59e0b" />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#f59e0b' }}>{getNotebookName(selectedNotebook)}</Text>
              <MaterialCommunityIcons name="close" size={12} color="#f59e0b" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Main content */}
      {!isSearching ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Stats grid */}
          <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
              {[
                { label: 'Text', value: notesByType.text, icon: 'text', color: '#3b82f6', filter: 'text' as SearchFilter },
                { label: 'Drawings', value: notesByType.drawing, icon: 'draw', color: '#10b981', filter: 'handwriting' as SearchFilter },
                { label: 'Flagged', value: notesByType.flagged, icon: 'flag', color: '#ef4444', filter: 'flagged' as SearchFilter },
                { label: 'Pinned', value: notesByType.pinned, icon: 'pin', color: '#8b5cf6', filter: 'pinned' as SearchFilter },
              ].map(stat => (
                <TouchableOpacity
                  key={stat.label}
                  style={{ flex: 1, borderRadius: Colors.radius.lg, padding: 12, alignItems: 'center', gap: 4, backgroundColor: stat.color + '18' }}
                  onPress={() => { setActiveFilter(stat.filter); haptic.select(); }}
                >
                  <MaterialCommunityIcons name={stat.icon as any} size={18} color={stat.color} />
                  <Text style={{ fontSize: Colors.font.lg, fontWeight: '900', color: stat.color }}>{stat.value}</Text>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: stat.color + 'bb', textTransform: 'uppercase' }}>{stat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notebooks */}
          {notebooks.length > 0 && (
            <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
              <Text style={{ fontSize: Colors.font.sm, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
                Notebooks
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {notebooks.filter(nb => !nb.isArchived).map(nb => {
                  const cnt = notes.filter(n => n.notebookId === nb.id && !n.isTrashed).length;
                  return (
                    <TouchableOpacity
                      key={nb.id}
                      style={{
                        width: 120, padding: 12, borderRadius: 16,
                        backgroundColor: colors.card, borderWidth: 1.5,
                        borderColor: selectedNotebook === nb.id ? nb.color : colors.border,
                        alignItems: 'center', gap: 6,
                        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6,
                      }}
                      onPress={() => { setSelectedNotebook(selectedNotebook === nb.id ? null : nb.id); haptic.select(); }}
                    >
                      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: nb.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 24 }}>{nb.emoji}</Text>
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, textAlign: 'center' }} numberOfLines={1}>{nb.title}</Text>
                      <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '600' }}>{cnt} notes</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
              <Text style={{ fontSize: Colors.font.sm, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
                Tags
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {tags.map(tag => (
                  <TouchableOpacity
                    key={tag.id}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: Colors.radius.full, borderWidth: 1.5, borderColor: tag.color, backgroundColor: tag.color + '18' }}
                    onPress={() => { setSelectedTag(tag.name); haptic.select(); }}
                  >
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tag.color }} />
                    <Text style={{ fontSize: Colors.font.sm, fontWeight: '700', color: tag.color }}>#{tag.name}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: tag.color + '99' }}>{tag.count}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ fontSize: Colors.font.sm, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 }}>Recent Searches</Text>
                <TouchableOpacity onPress={() => { setRecentSearches([]); AsyncStorage.removeItem(RECENT_STORAGE_KEY).catch(() => {}); }}>
                  <Text style={{ fontSize: Colors.font.sm, color: colors.primary, fontWeight: '600' }}>Clear</Text>
                </TouchableOpacity>
              </View>
              {recentSearches.map((s, i) => (
                <TouchableOpacity
                  key={i}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}
                  onPress={() => setQuery(s)}
                >
                  <MaterialCommunityIcons name="history" size={16} color={colors.textMuted} />
                  <Text style={{ flex: 1, fontSize: Colors.font.base, color: colors.textSecondary }}>{s}</Text>
                  <TouchableOpacity onPress={() => setRecentSearches(prev => prev.filter((_, idx) => idx !== i))}>
                    <MaterialCommunityIcons name="close" size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Recent notes */}
          <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
            <Text style={{ fontSize: Colors.font.sm, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
              Recent Notes
            </Text>
          </View>
          {recentNotes.map((note, i) => (
            <Animated.View key={note.id} entering={FadeInDown.delay(i * 25).springify()}>
              <NoteCard
                note={note} onPress={() => handleNotePress(note)}
                showNotebook notebookName={getNotebookName(note.notebookId)}
              />
            </Animated.View>
          ))}
          <View style={{ height: 120 }} />
        </ScrollView>
      ) : (
        <>
          {/* Result summary */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8, gap: 8 }}>
            <Text style={{ fontSize: Colors.font.sm, color: colors.textMuted, fontWeight: '600', flex: 1 }}>
              {results.length} {results.length === 1 ? 'result' : 'results'}
              {query ? ` for "${query}"` : ''}
            </Text>
            {isSearching && (
              <TouchableOpacity onPress={clearAll} style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.inputBg, borderRadius: 8 }}>
                <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '700' }}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={results}
            keyExtractor={n => n.id}
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingVertical: 60, gap: 12 }}>
                <MaterialCommunityIcons name="magnify-close" size={52} color={colors.textMuted} />
                <Text style={{ fontSize: Colors.font.lg, fontWeight: '700', color: colors.textSecondary }}>No results</Text>
                <Text style={{ fontSize: Colors.font.base, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 32 }}>
                  {query ? `No notes match "${query}"\nTry different keywords or check spelling` : 'No notes match your filters'}
                </Text>
              </View>
            }
            renderItem={({ item, index }) => (
              <Animated.View key={item.id} entering={FadeInDown.delay(index * 20).springify()}>
                <TouchableOpacity
                  style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderLight, backgroundColor: colors.background }}
                  onPress={() => handleNotePress(item)}
                  activeOpacity={0.75}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                      <MaterialCommunityIcons
                        name={item.hasHandwriting ? 'draw' : item.hasAudio ? 'microphone' : 'text'}
                        size={18} color={colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      {highlightText(item.title || 'Untitled', query, { fontSize: Colors.font.base, fontWeight: '700', color: colors.text, marginBottom: 3 }, { backgroundColor: '#fef08a', color: '#78350f' })}
                      {highlightText(
                        item.content.slice(0, 100).replace(/\n/g, ' '),
                        query,
                        { fontSize: Colors.font.sm, color: colors.textSecondary, lineHeight: 18 },
                        { backgroundColor: '#fef08a', color: '#78350f' },
                      )}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '500' }}>
                          {new Date(item.modifiedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                        {getNotebookName(item.notebookId) && (
                          <Text style={{ fontSize: 10, color: colors.textMuted }}>{getNotebookName(item.notebookId)}</Text>
                        )}
                        {item.tags.slice(0, 2).map(t => (
                          <View key={t} style={{ backgroundColor: colors.primarySoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
                            <Text style={{ fontSize: 10, color: colors.primary, fontWeight: '600' }}>#{t}</Text>
                          </View>
                        ))}
                        {item.isPinned && <MaterialCommunityIcons name="pin" size={11} color={colors.primary} />}
                        {item.isFlagged && <MaterialCommunityIcons name="flag" size={11} color={colors.warning} />}
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            )}
          />
        </>
      )}
    </View>
  );
}
