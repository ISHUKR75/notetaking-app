import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Platform, ScrollView, Modal, Pressable, Alert, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn, ZoomIn, SlideInRight } from 'react-native-reanimated';
import { useTheme } from '../../src/context/ThemeContext';
import { useNotes, Note } from '../../src/context/NotesContext';
import { NoteCard } from '../../src/components/NoteCard';
import { EmptyState } from '../../src/components/EmptyState';
import { SearchBar } from '../../src/components/SearchBar';
import { sortNotes, filterNotes } from '../../src/utils/noteUtils';
import { Colors } from '../../src/constants/colors';
import { getTodayString } from '../../src/utils/dateUtils';
import { haptic } from '../../src/utils/haptics';
import { pickAndImportFile, exportNotesToJSON, exportAllAsMarkdownZip } from '../../src/utils/exportImport';

const { width: SCREEN_W } = Dimensions.get('window');

type ViewMode = 'list' | 'grid';
type FilterMode = 'all' | 'pinned' | 'flagged' | 'recent' | 'favorites' | 'handwriting' | 'voice';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 5) return 'Good Night';
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  if (h < 21) return 'Good Evening';
  return 'Good Night';
};

const FILTERS: { id: FilterMode; label: string; icon: string; color: string }[] = [
  { id: 'all',         label: 'All',        icon: 'note-multiple-outline',  color: '#6366f1' },
  { id: 'pinned',      label: 'Pinned',     icon: 'pin-outline',            color: '#f59e0b' },
  { id: 'flagged',     label: 'Flagged',    icon: 'flag-outline',           color: '#ef4444' },
  { id: 'favorites',   label: 'Favorites',  icon: 'heart-outline',          color: '#ec4899' },
  { id: 'recent',      label: 'Recent',     icon: 'clock-outline',          color: '#10b981' },
  { id: 'handwriting', label: 'Drawings',   icon: 'draw',                   color: '#3b82f6' },
  { id: 'voice',       label: 'Voice',      icon: 'microphone-outline',     color: '#8b5cf6' },
];

const SORT_OPTIONS: { id: 'modified' | 'created' | 'title'; label: string; icon: string }[] = [
  { id: 'modified', label: 'Last Modified',  icon: 'clock-edit-outline' },
  { id: 'created',  label: 'Date Created',   icon: 'calendar-plus' },
  { id: 'title',    label: 'Alphabetical',   icon: 'sort-alphabetical-ascending' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { colors, settings, updateSettings } = useTheme();
  const {
    notes, notebooks, trashNote, pinNote, flagNote, favoriteNote,
    archiveNote, duplicateNote, getRecentNotes, getPinnedNotes,
    getFlaggedNotes, importBackup, exportBackup,
  } = useNotes();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>(settings.noteViewMode as ViewMode);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [sortBy, setSortBy] = useState<'modified' | 'created' | 'title'>(
    (settings.sortBy === 'size' ? 'modified' : settings.sortBy) as any
  );
  const [refreshing, setRefreshing] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  // ── Computed stats ─────────────────────────────────────────────────────────
  const activeNotes = useMemo(() => notes.filter(n => !n.isTrashed && !n.isArchived), [notes]);
  const totalNotes = activeNotes.length;
  const pinnedCount = useMemo(() => getPinnedNotes().length, [getPinnedNotes, notes]);
  const flaggedCount = useMemo(() => getFlaggedNotes().length, [getFlaggedNotes, notes]);
  const recentCount = useMemo(() => getRecentNotes(7).length, [getRecentNotes, notes]);
  const favCount = useMemo(() => activeNotes.filter(n => n.isFavorite).length, [activeNotes]);
  const drawingCount = useMemo(() => activeNotes.filter(n => n.hasHandwriting).length, [activeNotes]);

  const wordTotal = useMemo(() => activeNotes.reduce((sum, n) => sum + (n.wordCount || 0), 0), [activeNotes]);

  // ── Filtered notes ─────────────────────────────────────────────────────────
  const displayNotes = useMemo(() => {
    let base: Note[];
    switch (filter) {
      case 'pinned':      base = getPinnedNotes(); break;
      case 'flagged':     base = getFlaggedNotes(); break;
      case 'recent':      base = getRecentNotes(30); break;
      case 'favorites':   base = activeNotes.filter(n => n.isFavorite); break;
      case 'handwriting': base = activeNotes.filter(n => n.hasHandwriting); break;
      case 'voice':       base = activeNotes.filter(n => n.hasAudio); break;
      default:            base = activeNotes; break;
    }
    if (search) return filterNotes(base, search);
    return sortNotes(base, sortBy);
  }, [notes, filter, sortBy, search, getPinnedNotes, getFlaggedNotes, getRecentNotes, activeNotes]);

  const pinnedNotes = useMemo(() => displayNotes.filter(n => n.isPinned), [displayNotes]);
  const unpinnedNotes = useMemo(() => displayNotes.filter(n => !n.isPinned), [displayNotes]);

  const getNotebookName = useCallback((notebookId: string | null) =>
    notebooks.find(nb => nb.id === notebookId)?.title || '', [notebooks]);
  const getNotebookColor = useCallback((notebookId: string | null) =>
    notebooks.find(nb => nb.id === notebookId)?.color || '', [notebooks]);
  const getNotebookEmoji = useCallback((notebookId: string | null) =>
    notebooks.find(nb => nb.id === notebookId)?.emoji || '', [notebooks]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 600));
    setRefreshing(false);
  }, []);

  const toggleViewMode = () => {
    const next: ViewMode = viewMode === 'list' ? 'grid' : 'list';
    setViewMode(next);
    updateSettings({ noteViewMode: next });
    haptic.select();
  };

  // ── Import handler ─────────────────────────────────────────────────────────
  const handleImport = async () => {
    setShowQuickActions(false);
    setIsImporting(true);
    haptic.light();
    try {
      const result = await pickAndImportFile(notebooks as any);
      if (result.type === 'error') {
        Alert.alert('Import Failed', result.error || 'Could not read the file.');
        return;
      }
      if (result.type === 'json' && result.data) {
        const bundle = result.data as any;
        if (bundle.notes && Array.isArray(bundle.notes)) {
          Alert.alert(
            '📥 Import Backup',
            `Found ${bundle.notes.length} note(s)${bundle.notebooks?.length ? ` in ${bundle.notebooks.length} notebook(s)` : ''}. Import all?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Import All', onPress: async () => {
                  const { imported, errors } = await importBackup(bundle);
                  haptic.success();
                  Alert.alert('Done ✅', `Imported ${imported} note${imported !== 1 ? 's' : ''}!${errors > 0 ? ` (${errors} skipped)` : ''}`);
                },
              },
            ],
          );
        } else {
          Alert.alert('Invalid File', 'This JSON file is not a valid Ishu Notes backup.');
        }
      } else if ((result.type === 'markdown' || result.type === 'text') && result.data) {
        const d = result.data as any;
        Alert.alert('📄 Import Note', `Import "${d.title || 'Imported Note'}"?`, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Import', onPress: async () => {
              await importBackup({
                version: '1.0', app: 'Ishu Notes',
                exportedAt: new Date().toISOString(),
                notes: [{
                  ...d, id: '', notebookId: null, tags: d.tags || [],
                  color: 'none', pageBackground: 'none', isPinned: false, isFlagged: false,
                  isArchived: false, isTrashed: false, isLocked: false, isFavorite: false,
                  emoji: null, createdAt: new Date().toISOString(), modifiedAt: new Date().toISOString(),
                  trashedAt: null, wordCount: 0, readingTime: 0,
                  hasHandwriting: false, hasAudio: false, hasImages: false,
                  templateId: 'blank', pageCount: 1,
                }],
                notebooks: [], tags: [],
              });
              haptic.success();
              Alert.alert('Imported ✅', 'Note imported successfully!');
            },
          },
        ]);
      }
    } catch (e: any) {
      Alert.alert('Import Failed', e?.message || 'Unknown error occurred');
    } finally {
      setIsImporting(false);
    }
  };

  // ── Export handler ─────────────────────────────────────────────────────────
  const handleExport = async () => {
    setShowQuickActions(false);
    if (activeNotes.length === 0) { Alert.alert('Nothing to Export', 'Create some notes first!'); return; }
    Alert.alert(
      'Export Notes',
      `Export ${activeNotes.length} notes:`,
      [
        {
          text: '📦 JSON Backup (recommended)',
          onPress: async () => {
            try {
              const bundle = await exportBackup();
              const result = await exportNotesToJSON(bundle.notes as any, bundle.notebooks as any, bundle.tags as any, false);
              haptic.success();
              Alert.alert('Export Complete ✅', result.message);
            } catch (e: any) { Alert.alert('Export Failed', e?.message); }
          },
        },
        {
          text: '📄 All as Markdown',
          onPress: async () => {
            const result = await exportAllAsMarkdownZip(activeNotes as any);
            haptic.success();
            Alert.alert('Export Complete ✅', result.message);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  // ── Render note ────────────────────────────────────────────────────────────
  const renderNote = useCallback(({ item, index }: { item: Note; index: number }) => (
    <Animated.View entering={FadeInDown.delay(Math.min(index * 20, 300)).springify()}>
      <NoteCard
        note={item}
        onPress={() => router.push(`/notes/${item.id}`)}
        onDelete={() => { trashNote(item.id); haptic.warning(); }}
        onPin={() => { pinNote(item.id, !item.isPinned); haptic.select(); }}
        onFlag={() => { flagNote(item.id, !item.isFlagged); haptic.select(); }}
        onDuplicate={() => { duplicateNote(item.id); haptic.success(); }}
        onArchive={() => { archiveNote(item.id); haptic.select(); }}
        viewMode={viewMode}
        showNotebook
        notebookName={getNotebookName(item.notebookId)}
      />
    </Animated.View>
  ), [viewMode, getNotebookName, pinNote, flagNote, duplicateNote, archiveNote, trashNote]);

  // ── Header ─────────────────────────────────────────────────────────────────
  const renderHeader = () => (
    <View>
      {/* Top bar */}
      <View style={{ paddingTop: topPad + 8, paddingHorizontal: 20, paddingBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: Colors.font.sm, color: colors.textMuted, fontWeight: '600', marginBottom: 2 }}>
              {getTodayString()}
            </Text>
            <Text style={{ fontSize: Colors.font.display, fontWeight: '900', color: colors.text }}>
              {getGreeting()} 👋
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
            <TouchableOpacity
              style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
              onPress={() => { setShowSortMenu(v => !v); haptic.select(); }}
            >
              <MaterialCommunityIcons name="sort-variant" size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
              onPress={toggleViewMode}
            >
              <MaterialCommunityIcons
                name={viewMode === 'list' ? 'view-grid-outline' : 'view-list-outline'}
                size={20} color={colors.text}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Stats row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}>
        {[
          { label: 'Notes',     value: totalNotes,    icon: 'note-multiple-outline', color: colors.primary,  onPress: () => setFilter('all') },
          { label: 'Pinned',    value: pinnedCount,   icon: 'pin',                   color: '#f59e0b',       onPress: () => setFilter('pinned') },
          { label: 'Favorites', value: favCount,      icon: 'heart',                 color: '#ef4444',       onPress: () => setFilter('favorites') },
          { label: 'Flagged',   value: flaggedCount,  icon: 'flag',                  color: '#8b5cf6',       onPress: () => setFilter('flagged') },
          { label: 'Drawings',  value: drawingCount,  icon: 'draw',                  color: '#10b981',       onPress: () => setFilter('handwriting') },
          { label: 'Notebooks', value: notebooks.length, icon: 'notebook-outline',   color: '#06b6d4',       onPress: () => router.push('/(tabs)/notebooks') },
          { label: 'Words',     value: wordTotal > 999 ? `${(wordTotal / 1000).toFixed(1)}k` : wordTotal, icon: 'text', color: '#f97316', onPress: () => {} },
        ].map(stat => (
          <TouchableOpacity
            key={stat.label}
            style={{ alignItems: 'center', backgroundColor: (stat.color as string) + '18', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, minWidth: 74, gap: 3 }}
            onPress={stat.onPress}
          >
            <MaterialCommunityIcons name={stat.icon as any} size={18} color={stat.color as string} />
            <Text style={{ fontSize: 18, fontWeight: '900', color: stat.color as string }}>{stat.value}</Text>
            <Text style={{ fontSize: 9, fontWeight: '800', color: (stat.color as string) + 'cc', textTransform: 'uppercase', letterSpacing: 0.4 }}>{stat.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <SearchBar value={search} onChangeText={setSearch} onClear={() => setSearch('')} />
      </View>

      {/* Sort menu */}
      {showSortMenu && (
        <Animated.View entering={FadeIn.duration(150)} style={{ marginHorizontal: 16, marginBottom: 8, borderRadius: Colors.radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>Sort by</Text>
          {SORT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.id}
              style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, backgroundColor: sortBy === opt.id ? colors.primarySoft : 'transparent' }}
              onPress={() => { setSortBy(opt.id); updateSettings({ sortBy: opt.id }); setShowSortMenu(false); haptic.select(); }}
            >
              <MaterialCommunityIcons name={opt.icon as any} size={18} color={sortBy === opt.id ? colors.primary : colors.textSecondary} />
              <Text style={{ flex: 1, fontSize: Colors.font.base, color: sortBy === opt.id ? colors.primary : colors.textSecondary, fontWeight: sortBy === opt.id ? '800' : '500' }}>{opt.label}</Text>
              {sortBy === opt.id && <MaterialCommunityIcons name="check" size={16} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8, gap: 7 }}>
        {FILTERS.map(f => {
          const active = filter === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 7, borderRadius: Colors.radius.full, backgroundColor: active ? f.color : colors.inputBg, borderWidth: 1.5, borderColor: active ? f.color : colors.border }}
              onPress={() => { setFilter(f.id); haptic.select(); }}
            >
              <MaterialCommunityIcons name={f.icon as any} size={12} color={active ? '#fff' : colors.textSecondary} />
              <Text style={{ fontSize: Colors.font.sm, fontWeight: '800', color: active ? '#fff' : colors.textSecondary }}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Section header for pinned */}
      {pinnedNotes.length > 0 && filter === 'all' && !search && (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 6, gap: 6 }}>
          <MaterialCommunityIcons name="pin" size={12} color="#f59e0b" />
          <Text style={{ fontSize: Colors.font.sm, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 }}>Pinned</Text>
          <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '700', backgroundColor: colors.inputBg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 }}>{pinnedNotes.length}</Text>
        </View>
      )}
    </View>
  );

  // ── Section divider between pinned and all ────────────────────────────────
  const allDisplayNotes = filter === 'all' && !search && pinnedNotes.length > 0
    ? [
        ...pinnedNotes,
        { id: '__divider__' } as any,
        ...unpinnedNotes,
      ]
    : displayNotes;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={allDisplayNotes}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => {
          if (item.id === '__divider__') {
            return (
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 6, gap: 6 }}>
                <MaterialCommunityIcons name="note-multiple-outline" size={12} color={colors.textMuted} />
                <Text style={{ fontSize: Colors.font.sm, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 }}>All Notes</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '700', backgroundColor: colors.inputBg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 }}>{unpinnedNotes.length}</Text>
              </View>
            );
          }
          return renderNote({ item, index });
        }}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={() => (
          <EmptyState
            icon="note-plus-outline"
            title={search ? 'No notes found' : filter !== 'all' ? `No ${filter} notes` : 'No notes yet'}
            description={search ? `No notes match "${search}"` : 'Tap + to create your first note'}
            actionLabel={search || filter !== 'all' ? undefined : 'Create Note'}
            onAction={search || filter !== 'all' ? undefined : () => router.push('/notes/create')}
          />
        )}
        key={viewMode}
        numColumns={viewMode === 'grid' ? 2 : 1}
        columnWrapperStyle={viewMode === 'grid' ? { gap: 10, paddingHorizontal: 16, marginBottom: 10 } : undefined}
        contentContainerStyle={{ paddingBottom: 160 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB area */}
      <View style={{ position: 'absolute', right: 20, bottom: Platform.OS === 'web' ? 34 + 84 : insets.bottom + 80, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <TouchableOpacity
          style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4, borderWidth: 1, borderColor: colors.border }}
          onPress={() => { setShowQuickActions(true); haptic.light(); }}
        >
          <MaterialCommunityIcons name="dots-horizontal" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 16, elevation: 10 }}
          onPress={() => { haptic.medium(); router.push('/notes/create'); }}
        >
          <MaterialCommunityIcons name="plus" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Quick Actions sheet */}
      <Modal visible={showQuickActions} transparent animationType="slide">
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={() => setShowQuickActions(false)}>
          <Pressable style={{ backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Platform.OS === 'web' ? 40 : insets.bottom + 32 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 18 }} />
            <Text style={{ fontSize: Colors.font.xl, fontWeight: '900', color: colors.text, marginBottom: 18 }}>Quick Actions</Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {[
                { icon: 'note-plus-outline',    label: 'Text Note',    color: '#6366f1', action: () => { router.push('/notes/create'); setShowQuickActions(false); } },
                { icon: 'draw',                  label: 'Drawing',      color: '#10b981', action: () => { setShowQuickActions(false); router.navigate('/'); } },
                { icon: 'microphone-outline',    label: 'Voice Note',   color: '#f59e0b', action: () => { setShowQuickActions(false); Alert.alert('Voice Notes', 'Record audio notes:\n\n1. Open any note\n2. Tap the microphone icon\n3. Start recording\n\nTranscription available with Pro.'); } },
                { icon: 'camera-outline',        label: 'Scan Doc',     color: '#3b82f6', action: () => { setShowQuickActions(false); Alert.alert('Document Scanner', 'To scan documents:\n\n1. Take a photo with your camera\n2. Import it as an image in a note\n\nFull OCR scanner coming in Pro version!'); } },
                { icon: 'notebook-plus-outline', label: 'New Notebook', color: '#8b5cf6', action: () => { router.push('/(tabs)/notebooks'); setShowQuickActions(false); } },
                { icon: 'flash-outline',         label: 'Flashcards',   color: '#f97316', action: () => { router.push('/(tabs)/study'); setShowQuickActions(false); } },
                { icon: 'import',                label: 'Import',       color: '#06b6d4', action: handleImport },
                { icon: 'export-variant',        label: 'Export',       color: '#0ea5e9', action: handleExport },
                { icon: 'magnify',               label: 'Search',       color: '#a855f7', action: () => { router.push('/(tabs)/search'); setShowQuickActions(false); } },
                { icon: 'trash-can-outline',     label: 'Trash',        color: '#ef4444', action: () => { router.push('/notes/trash'); setShowQuickActions(false); } },
                { icon: 'cog-outline',           label: 'Settings',     color: '#64748b', action: () => { router.push('/(tabs)/settings'); setShowQuickActions(false); } },
                { icon: 'information-outline',   label: 'About',        color: '#94a3b8', action: () => { setShowQuickActions(false); Alert.alert('Ishu Notes', 'Version 1.0.0\n\n📝 Premium note-taking app inspired by GoodNotes, Apple Notes, Notion & Samsung Notes.\n\n🔒 All data stored locally on your device.\n💾 Use Export to back up your notes.'); } },
              ].map((action, i) => {
                const itemW = (SCREEN_W - 40 - 12 * 3) / 4;
                return (
                  <Animated.View key={action.label} entering={ZoomIn.delay(i * 25).springify()}>
                    <TouchableOpacity
                      style={{ width: itemW, alignItems: 'center', gap: 7 }}
                      onPress={action.action}
                    >
                      <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: action.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                        <MaterialCommunityIcons name={action.icon as any} size={24} color={action.color} />
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text, textAlign: 'center' }} numberOfLines={1}>{action.label}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>

            {/* Stats at bottom of sheet */}
            <View style={{ marginTop: 20, padding: 14, backgroundColor: colors.inputBg, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-around' }}>
              {[
                { label: 'Notes', value: totalNotes },
                { label: 'Words', value: wordTotal > 999 ? `${(wordTotal / 1000).toFixed(1)}k` : wordTotal },
                { label: 'Notebooks', value: notebooks.length },
                { label: 'Tags', value: activeNotes.reduce((acc, n) => { n.tags.forEach(t => acc.add(t)); return acc; }, new Set()).size },
              ].map(stat => (
                <View key={stat.label} style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text }}>{stat.value}</Text>
                  <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 }}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
