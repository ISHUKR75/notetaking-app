import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { haptic } from '../../src/utils/haptics';
import { useTheme } from '../../src/context/ThemeContext';
import { useNotes, Note } from '../../src/context/NotesContext';
import { Colors } from '../../src/constants/colors';
import { EmptyState } from '../../src/components/EmptyState';
import { formatFullDate } from '../../src/utils/dateUtils';
import { getNoteColorHex } from '../../src/utils/noteUtils';

export default function TrashScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { getTrashedNotes, restoreNote, deleteNote } = useNotes();
  const insets = useSafeAreaInsets();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const trashedNotes = getTrashedNotes();
  const s = styles(colors);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    haptic.light();
  };

  const handleRestore = (id: string) => {
    restoreNote(id);
    haptic.success();
    if (isSelecting) setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Permanently Delete',
      'This note will be deleted forever and cannot be recovered.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever', style: 'destructive',
          onPress: () => { deleteNote(id); haptic.success(); },
        },
      ]
    );
  };

  const handleRestoreAll = () => {
    Alert.alert('Restore All', `Restore all ${trashedNotes.length} notes?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restore All', onPress: () => {
          trashedNotes.forEach(n => restoreNote(n.id));
          haptic.success();
        }
      }
    ]);
  };

  const handleEmptyTrash = () => {
    Alert.alert(
      'Empty Trash',
      `Permanently delete all ${trashedNotes.length} notes? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Empty Trash', style: 'destructive',
          onPress: () => {
            trashedNotes.forEach(n => deleteNote(n.id));
            haptic.success();
          }
        }
      ]
    );
  };

  const handleBulkRestore = () => {
    selected.forEach(id => restoreNote(id));
    setSelected(new Set());
    setIsSelecting(false);
    haptic.success();
  };

  const handleBulkDelete = () => {
    Alert.alert('Delete Selected', `Permanently delete ${selected.size} notes?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => {
          selected.forEach(id => deleteNote(id));
          setSelected(new Set());
          setIsSelecting(false);
          haptic.success();
        }
      }
    ]);
  };

  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Recently Deleted</Text>
          {trashedNotes.length > 0 && (
            <Text style={s.headerSub}>{trashedNotes.length} notes · auto-deleted after 30 days</Text>
          )}
        </View>
        {trashedNotes.length > 0 && (
          <TouchableOpacity
            style={s.selectBtn}
            onPress={() => { setIsSelecting(v => !v); setSelected(new Set()); }}
          >
            <Text style={[s.selectText, { color: colors.primary }]}>
              {isSelecting ? 'Done' : 'Select'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {trashedNotes.length > 0 && !isSelecting && (
        <View style={s.actionRow}>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.primarySoft }]} onPress={handleRestoreAll}>
            <MaterialCommunityIcons name="restore" size={16} color={colors.primary} />
            <Text style={[s.actionText, { color: colors.primary }]}>Restore All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.error + '18' }]} onPress={handleEmptyTrash}>
            <MaterialCommunityIcons name="trash-can" size={16} color={colors.error} />
            <Text style={[s.actionText, { color: colors.error }]}>Empty Trash</Text>
          </TouchableOpacity>
        </View>
      )}

      {isSelecting && selected.size > 0 && (
        <View style={s.selectionBar}>
          <Text style={s.selectionCount}>{selected.size} selected</Text>
          <View style={s.selectionActions}>
            <TouchableOpacity style={[s.selBtn, { backgroundColor: colors.primarySoft }]} onPress={handleBulkRestore}>
              <MaterialCommunityIcons name="restore" size={16} color={colors.primary} />
              <Text style={[s.selBtnText, { color: colors.primary }]}>Restore</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.selBtn, { backgroundColor: colors.error + '18' }]} onPress={handleBulkDelete}>
              <MaterialCommunityIcons name="delete-forever" size={16} color={colors.error} />
              <Text style={[s.selBtnText, { color: colors.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={trashedNotes}
        keyExtractor={n => n.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="trash-can-outline"
            title="Trash is empty"
            description="Notes you delete will appear here for 30 days before being permanently removed."
          />
        }
        renderItem={({ item, index }: { item: Note; index: number }) => {
          const colorHex = getNoteColorHex(item.color, isDark);
          const isSelected = selected.has(item.id);
          return (
            <Animated.View entering={FadeInDown.delay(index * 30).springify()}>
              <TouchableOpacity
                style={[
                  s.noteCard,
                  { backgroundColor: colorHex ? colorHex + '22' : colors.card },
                  isSelected && s.noteCardSelected,
                ]}
                onPress={() => isSelecting ? toggleSelect(item.id) : null}
                onLongPress={() => { setIsSelecting(true); toggleSelect(item.id); }}
                activeOpacity={isSelecting ? 0.7 : 1}
              >
                {isSelecting && (
                  <View style={[s.checkbox, isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                    {isSelected && <MaterialCommunityIcons name="check" size={14} color="#fff" />}
                  </View>
                )}

                <View style={s.noteBody}>
                  <View style={s.noteRow}>
                    {item.emoji && <Text style={s.emoji}>{item.emoji}</Text>}
                    <Text style={[s.noteTitle, { color: colors.text }]} numberOfLines={1}>
                      {item.title || 'Untitled Note'}
                    </Text>
                    <View style={[s.typeBadge, { backgroundColor: colors.inputBg }]}>
                      <MaterialCommunityIcons
                        name={item.type === 'handwriting' ? 'draw' : item.type === 'voice' ? 'microphone' : 'text'}
                        size={11}
                        color={colors.textMuted}
                      />
                    </View>
                  </View>

                  {item.content ? (
                    <Text style={[s.notePreview, { color: colors.textSecondary }]} numberOfLines={2}>
                      {item.content}
                    </Text>
                  ) : null}

                  <View style={s.noteMeta}>
                    <MaterialCommunityIcons name="delete-clock-outline" size={12} color={colors.textMuted} />
                    <Text style={[s.noteDate, { color: colors.textMuted }]}>
                      Deleted {formatFullDate(item.modifiedAt)}
                    </Text>
                  </View>
                </View>

                {!isSelecting && (
                  <View style={s.noteActions}>
                    <TouchableOpacity
                      style={[s.noteActionBtn, { backgroundColor: colors.primarySoft }]}
                      onPress={() => handleRestore(item.id)}
                    >
                      <MaterialCommunityIcons name="restore" size={16} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.noteActionBtn, { backgroundColor: colors.error + '18' }]}
                      onPress={() => handleDelete(item.id)}
                    >
                      <MaterialCommunityIcons name="delete-forever-outline" size={16} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          );
        }}
      />
    </View>
  );
}

const styles = (colors: typeof Colors.light) => StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 12, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    gap: 10,
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.inputBg, marginTop: 2 },
  headerCenter: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  headerSub: { fontSize: 12, color: colors.textMuted },
  selectBtn: { paddingHorizontal: 12, paddingVertical: 8, marginTop: 4 },
  selectText: { fontSize: 15, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12 },
  actionText: { fontSize: 14, fontWeight: '600' },
  selectionBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  selectionCount: { fontSize: 14, fontWeight: '600', color: colors.text },
  selectionActions: { flexDirection: 'row', gap: 8 },
  selBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  selBtnText: { fontSize: 13, fontWeight: '600' },
  list: { padding: 12, paddingBottom: 100, gap: 10 },
  noteCard: {
    borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  noteCardSelected: { borderColor: colors.primary, borderWidth: 2 },
  checkbox: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  noteBody: { flex: 1, gap: 5 },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  emoji: { fontSize: 16 },
  noteTitle: { flex: 1, fontSize: 15, fontWeight: '600' },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  notePreview: { fontSize: 13, lineHeight: 18 },
  noteMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  noteDate: { fontSize: 11 },
  noteActions: { flexDirection: 'column', gap: 8 },
  noteActionBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
