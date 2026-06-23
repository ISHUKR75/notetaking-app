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
}

export function NotebookCard({ notebook, onPress, onLongPress }: NotebookCardProps) {
  const { colors, isDark } = useTheme();
  const s = styles(colors);

  const bgColor = notebook.color + (isDark ? '33' : '22');
  const borderColor = notebook.color + '66';

  return (
    <TouchableOpacity
      style={[s.card, { borderColor }]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
    >
      <View style={[s.cover, { backgroundColor: bgColor }]}>
        <Text style={s.emoji}>{notebook.emoji}</Text>
        <View style={[s.spine, { backgroundColor: notebook.color }]} />
      </View>
      <View style={s.info}>
        <Text style={s.title} numberOfLines={1}>{notebook.title}</Text>
        <Text style={s.count}>{notebook.noteCount} {notebook.noteCount === 1 ? 'note' : 'notes'}</Text>
        <Text style={s.date}>{formatShortDate(notebook.modifiedAt)}</Text>
      </View>
      {notebook.isFavorite && (
        <MaterialCommunityIcons name="star" size={14} color="#f59e0b" style={s.star} />
      )}
    </TouchableOpacity>
  );
}

const styles = (colors: typeof Colors.light) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: Colors.radius.lg,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  cover: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  spine: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 8,
    borderTopLeftRadius: Colors.radius.lg,
    borderBottomLeftRadius: Colors.radius.lg,
  },
  emoji: { fontSize: 44 },
  info: { padding: 12, paddingTop: 10 },
  title: { fontSize: Colors.font.md, fontWeight: '700', color: colors.text, marginBottom: 3 },
  count: { fontSize: Colors.font.xs, color: colors.textSecondary, marginBottom: 2 },
  date: { fontSize: Colors.font.xs, color: colors.textMuted },
  star: { position: 'absolute', top: 10, right: 10 },
});
