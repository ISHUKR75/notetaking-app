import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Notebook } from '../context/NotesContext';
import { Colors } from '../constants/colors';
import { formatShortDate } from '../utils/dateUtils';

interface NotebookCardProps {
  notebook: Notebook;
  onPress: () => void;
  onLongPress?: () => void;
  viewMode?: 'grid' | 'list';
  noteCount?: number;
}

export function NotebookCard({ notebook, onPress, onLongPress, viewMode = 'grid', noteCount }: NotebookCardProps) {
  const { colors, isDark } = useTheme();
  const s = styles(colors);

  const count = noteCount ?? notebook.noteCount ?? 0;
  const bgColor = notebook.color + (isDark ? '30' : '18');
  const borderColor = notebook.color + '55';

  if (viewMode === 'list') {
    return (
      <TouchableOpacity
        style={[s.listCard, { borderLeftColor: notebook.color, borderLeftWidth: 4 }]}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.85}
      >
        <View style={[s.listIcon, { backgroundColor: bgColor }]}>
          <Text style={{ fontSize: 28 }}>{notebook.emoji}</Text>
        </View>
        <View style={s.listInfo}>
          <View style={s.listTitleRow}>
            <Text style={[s.listTitle, { color: colors.text }]} numberOfLines={1}>{notebook.title}</Text>
            {notebook.isFavorite && <MaterialCommunityIcons name="star" size={14} color="#f59e0b" />}
          </View>
          {notebook.description ? (
            <Text style={[s.listDesc, { color: colors.textSecondary }]} numberOfLines={1}>{notebook.description}</Text>
          ) : null}
          <Text style={[s.listMeta, { color: colors.textMuted }]}>
            {count} {count === 1 ? 'note' : 'notes'} · {formatShortDate(notebook.modifiedAt)}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[s.card, { borderColor }]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.85}
    >
      <View style={[s.cover, { backgroundColor: bgColor }]}>
        <View style={[s.spine, { backgroundColor: notebook.color }]} />
        <Text style={s.emoji}>{notebook.emoji}</Text>
        {notebook.isFavorite && (
          <View style={s.starBadge}>
            <MaterialCommunityIcons name="star" size={12} color="#f59e0b" />
          </View>
        )}
        <View style={[s.countBadge, { backgroundColor: notebook.color + 'dd' }]}>
          <Text style={s.countText}>{count}</Text>
        </View>
      </View>
      <View style={s.info}>
        <Text style={[s.title, { color: colors.text }]} numberOfLines={1}>{notebook.title}</Text>
        {notebook.description ? (
          <Text style={[s.desc, { color: colors.textSecondary }]} numberOfLines={1}>{notebook.description}</Text>
        ) : (
          <Text style={[s.meta, { color: colors.textMuted }]}>{formatShortDate(notebook.modifiedAt)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = (colors: typeof Colors.light) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: Colors.radius.xl,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: 'rgba(0,0,0,0.08)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
    flex: 1,
  },
  cover: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  spine: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 9,
    borderTopLeftRadius: Colors.radius.xl,
    borderBottomLeftRadius: Colors.radius.xl,
  },
  emoji: { fontSize: 46 },
  starBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: '#f59e0b22', borderRadius: 8, padding: 3,
  },
  countBadge: {
    position: 'absolute', bottom: 8, right: 10,
    borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2,
  },
  countText: { fontSize: 10, color: '#fff', fontWeight: '800' },
  info: { padding: 12 },
  title: { fontSize: Colors.font.base, fontWeight: '700', marginBottom: 2 },
  desc: { fontSize: Colors.font.xs, marginBottom: 2 },
  meta: { fontSize: Colors.font.xs },
  listCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: Colors.radius.xl,
    padding: 14, marginHorizontal: 16, marginBottom: 10, gap: 12,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: 'rgba(0,0,0,0.06)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8,
    elevation: 2,
  },
  listIcon: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  listInfo: { flex: 1 },
  listTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  listTitle: { fontSize: Colors.font.base, fontWeight: '700', flex: 1 },
  listDesc: { fontSize: Colors.font.sm, marginBottom: 3 },
  listMeta: { fontSize: Colors.font.xs, fontWeight: '500' },
});
