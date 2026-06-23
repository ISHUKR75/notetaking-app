import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Platform, ScrollView, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { haptic } from '../../src/utils/haptics';
import { useTheme } from '../../src/context/ThemeContext';
import { useNotes, Note } from '../../src/context/NotesContext';
import { NoteCard } from '../../src/components/NoteCard';
import { SearchBar } from '../../src/components/SearchBar';
import { EmptyState } from '../../src/components/EmptyState';
import { Colors } from '../../src/constants/colors';
import { sortNotes, filterNotes } from '../../src/utils/noteUtils';

type SortBy = 'modified' | 'created' | 'title';

export default function NotebookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { notebooks, getNotesByNotebook, trashNote, pinNote, duplicateNote, flagNote, archiveNote, updateNotebook } = useNotes();
  const insets = useSafeAreaInsets();

  const notebook = notebooks.find(nb => nb.id === id);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('modified');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showStats, setShowStats] = useState(false);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const allNotes = useMemo(() => getNotesByNotebook(id), [id, getNotesByNotebook]);

  const notes = useMemo(() => {
    const searched = search ? filterNotes(allNotes, search) : allNotes;
    return sortNotes(searched, sortBy);
  }, [allNotes, search, sortBy]);

  const stats = useMemo(() => {
    const totalWords = allNotes.reduce((s, n) => s + (n.wordCount || 0), 0);
    const pinned = allNotes.filter(n => n.isPinned).length;
    const flagged = allNotes.filter(n => n.isFlagged).length;
    const drawings = allNotes.filter(n => n.hasHandwriting).length;
    const oldest = allNotes.length ? new Date(Math.min(...allNotes.map(n => new Date(n.createdAt).getTime()))).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
    const lastEdit = allNotes.length ? new Date(Math.max(...allNotes.map(n => new Date(n.modifiedAt).getTime()))).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
    const tags = new Set(allNotes.flatMap(n => n.tags));
    return { totalWords, pinned, flagged, drawings, oldest, lastEdit, tags: tags.size };
  }, [allNotes]);

  if (!notebook) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <TouchableOpacity
          style={{ marginTop: topPad + 8, marginLeft: 16, width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card }}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <EmptyState icon="notebook-outline" title="Notebook not found" />
      </View>
    );
  }

  const nbColor = notebook.color;

  const handleMoreOptions = () => {
    haptic.medium();
    Alert.alert(
      `${notebook.emoji} ${notebook.title}`,
      notebook.description || undefined,
      [
        {
          text: notebook.isFavorite ? '💔 Remove Favorite' : '❤️ Add to Favorites',
          onPress: () => { updateNotebook(notebook.id, { isFavorite: !notebook.isFavorite }); haptic.select(); },
        },
        {
          text: '📦 Archive Notebook',
          onPress: () => Alert.alert('Archive?', `Archive "${notebook.title}"? Notes will remain.`, [
            { text: 'Archive', style: 'destructive', onPress: () => { updateNotebook(notebook.id, { isArchived: true }); haptic.warning(); router.back(); } },
            { text: 'Cancel', style: 'cancel' },
          ]),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const renderItem = useCallback(({ item, index }: { item: Note; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 25).springify()} style={viewMode === 'grid' ? { flex: 1 } : {}}>
      <NoteCard
        note={item}
        onPress={() => router.push(`/notes/${item.id}`)}
        onDelete={() => { trashNote(item.id); haptic.warning(); }}
        onPin={() => { pinNote(item.id, !item.isPinned); haptic.select(); }}
        onDuplicate={() => { duplicateNote(item.id); haptic.success(); }}
        onFlag={() => { flagNote(item.id, !item.isFlagged); haptic.select(); }}
        onArchive={() => { archiveNote(item.id); haptic.select(); }}
        viewMode={viewMode}
      />
    </Animated.View>
  ), [viewMode, trashNote, pinNote, duplicateNote, flagNote, archiveNote, router]);

  const ListHeader = () => (
    <View>
      {/* Hero header */}
      <View style={{ backgroundColor: nbColor + (isDark ? '33' : '18'), paddingTop: topPad + 8, paddingHorizontal: 16, paddingBottom: 20 }}>
        {/* Top row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <TouchableOpacity
            style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface + 'cc' }}
            onPress={() => router.back()}
          >
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={{ width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface + 'cc' }}
            onPress={() => { setViewMode(v => v === 'list' ? 'grid' : 'list'); haptic.select(); }}
          >
            <MaterialCommunityIcons name={viewMode === 'list' ? 'view-grid-outline' : 'view-list-outline'} size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={{ width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface + 'cc', marginLeft: 8 }}
            onPress={handleMoreOptions}
          >
            <MaterialCommunityIcons name="dots-horizontal" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: nbColor, alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}
            onPress={() => router.push({ pathname: '/notes/create', params: { notebookId: id } })}
          >
            <MaterialCommunityIcons name="plus" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Notebook identity */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: nbColor + '30', borderWidth: 2, borderColor: nbColor + '60', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 34 }}>{notebook.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: Colors.font.xxl, fontWeight: '900', color: colors.text, flex: 1 }} numberOfLines={1}>
                {notebook.title}
              </Text>
              {notebook.isFavorite && (
                <MaterialCommunityIcons name="heart" size={18} color="#ec4899" />
              )}
            </View>
            {notebook.description ? (
              <Text style={{ fontSize: Colors.font.sm, color: colors.textSecondary, marginTop: 2 }} numberOfLines={2}>
                {notebook.description}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              <View style={{ backgroundColor: nbColor + '30', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: nbColor }}>
                  {allNotes.length} note{allNotes.length !== 1 ? 's' : ''}
                </Text>
              </View>
              {stats.totalWords > 0 && (
                <View style={{ backgroundColor: colors.surface + 'cc', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>
                    {stats.totalWords > 999 ? `${(stats.totalWords / 1000).toFixed(1)}k` : stats.totalWords} words
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Stats toggle */}
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12, alignSelf: 'flex-start', backgroundColor: colors.surface + 'aa', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}
          onPress={() => { setShowStats(v => !v); haptic.select(); }}
        >
          <MaterialCommunityIcons name={showStats ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>
            {showStats ? 'Hide stats' : 'Show stats'}
          </Text>
        </TouchableOpacity>

        {/* Expandable stats */}
        {showStats && (
          <Animated.View entering={FadeInDown.duration(200)} style={{ marginTop: 12 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {[
                { icon: 'pin', label: 'Pinned', value: stats.pinned, color: '#f59e0b' },
                { icon: 'flag', label: 'Flagged', value: stats.flagged, color: '#8b5cf6' },
                { icon: 'draw', label: 'Drawings', value: stats.drawings, color: '#10b981' },
                { icon: 'tag-multiple', label: 'Tags', value: stats.tags, color: '#06b6d4' },
                { icon: 'calendar-edit', label: 'Last Edit', value: stats.lastEdit, color: colors.primary as string },
                { icon: 'calendar-start', label: 'Oldest', value: stats.oldest, color: '#94a3b8' },
              ].map(({ icon, label, value, color }) => (
                <View key={label} style={{ backgroundColor: colors.surface + 'cc', borderRadius: 12, padding: 10, alignItems: 'center', minWidth: 72, gap: 3 }}>
                  <MaterialCommunityIcons name={icon as any} size={16} color={color} />
                  <Text style={{ fontSize: 13, fontWeight: '900', color: colors.text }}>{value}</Text>
                  <Text style={{ fontSize: 9, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</Text>
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        )}
      </View>

      {/* Search + sort */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          onClear={() => setSearch('')}
          placeholder={`Search in ${notebook.title}…`}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10, paddingTop: 6, gap: 7 }}>
        {([
          { id: 'modified', label: 'Recent' },
          { id: 'created', label: 'Oldest' },
          { id: 'title', label: 'A–Z' },
        ] as { id: SortBy; label: string }[]).map(opt => {
          const active = sortBy === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: Colors.radius.full, backgroundColor: active ? nbColor : colors.inputBg, borderWidth: 1.5, borderColor: active ? nbColor : colors.border }}
              onPress={() => { setSortBy(opt.id); haptic.select(); }}
            >
              <Text style={{ fontSize: Colors.font.sm, fontWeight: '800', color: active ? '#fff' : colors.textSecondary }}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* section label */}
        <View style={{ justifyContent: 'center', marginLeft: 4 }}>
          <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '700' }}>
            {notes.length} {search ? 'result' : 'note'}{notes.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </ScrollView>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={notes}
        keyExtractor={n => n.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode}
        columnWrapperStyle={viewMode === 'grid' ? { gap: 8, paddingHorizontal: 16, marginBottom: 8 } : undefined}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <EmptyState
            icon="note-plus-outline"
            title={search ? 'No results' : 'Empty notebook'}
            description={search ? `No notes match "${search}"` : `Add your first note to ${notebook.title}`}
            actionLabel={!search ? 'Create Note' : undefined}
            onAction={!search ? () => router.push({ pathname: '/notes/create', params: { notebookId: id } }) : undefined}
          />
        }
        renderItem={renderItem}
      />
    </View>
  );
}
