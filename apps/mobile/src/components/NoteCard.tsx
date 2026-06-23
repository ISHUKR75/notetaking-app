import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  PanResponder, Platform,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Note } from '../context/NotesContext';
import { formatShortDate } from '../utils/dateUtils';
import { getNoteColorHex, getPreviewText } from '../utils/noteUtils';
import { Colors } from '../constants/colors';

interface NoteCardProps {
  note: Note;
  onPress: () => void;
  onDelete?: () => void;
  onPin?: () => void;
  onFlag?: () => void;
  onDuplicate?: () => void;
  viewMode?: 'list' | 'grid';
  showNotebook?: boolean;
  notebookName?: string;
}

export function NoteCard({
  note,
  onPress,
  onDelete,
  onPin,
  onFlag,
  onDuplicate,
  viewMode = 'list',
  showNotebook,
  notebookName,
}: NoteCardProps) {
  const { colors, isDark } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const [showActions, setShowActions] = React.useState(false);

  const colorHex = getNoteColorHex(note.color, isDark);
  const preview = getPreviewText(note.content, viewMode === 'grid' ? 80 : 120);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dy) < 20,
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) translateX.setValue(Math.max(g.dx, -140));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -60) {
          Animated.spring(translateX, { toValue: -140, useNativeDriver: true }).start();
          setShowActions(true);
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          setShowActions(false);
        }
      },
    })
  ).current;

  const closeActions = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    setShowActions(false);
  };

  const s = styles(colors, isDark);

  if (viewMode === 'grid') {
    return (
      <TouchableOpacity
        style={[s.gridCard, colorHex ? { backgroundColor: colorHex } : {}]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {note.isPinned && (
          <View style={s.pinBadge}>
            <MaterialCommunityIcons name="pin" size={10} color={colors.primary} />
          </View>
        )}
        {note.emoji ? (
          <Text style={s.gridEmoji}>{note.emoji}</Text>
        ) : (
          <MaterialCommunityIcons
            name={note.hasHandwriting ? 'pencil' : 'text'}
            size={18}
            color={colors.textMuted}
            style={{ marginBottom: 6 }}
          />
        )}
        <Text style={s.gridTitle} numberOfLines={2}>{note.title}</Text>
        {preview ? <Text style={s.gridPreview} numberOfLines={3}>{preview}</Text> : null}
        <View style={s.gridMeta}>
          <Text style={s.gridDate}>{formatShortDate(note.modifiedAt)}</Text>
          {note.isFlagged && <MaterialCommunityIcons name="flag" size={11} color={colors.warning} />}
        </View>
        {note.tags.length > 0 && (
          <View style={s.tagRow}>
            {note.tags.slice(0, 2).map(tag => (
              <View key={tag} style={s.tagBadge}>
                <Text style={s.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={s.swipeContainer}>
      <View style={s.actionsContainer}>
        {onPin && (
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#6366f1' }]} onPress={() => { onPin(); closeActions(); }}>
            <MaterialCommunityIcons name={note.isPinned ? 'pin-off' : 'pin'} size={18} color="#fff" />
          </TouchableOpacity>
        )}
        {onFlag && (
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#f59e0b' }]} onPress={() => { onFlag(); closeActions(); }}>
            <MaterialCommunityIcons name={note.isFlagged ? 'flag-off' : 'flag'} size={18} color="#fff" />
          </TouchableOpacity>
        )}
        {onDuplicate && (
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#10b981' }]} onPress={() => { onDuplicate(); closeActions(); }}>
            <MaterialCommunityIcons name="content-copy" size={18} color="#fff" />
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#ef4444' }]} onPress={() => { onDelete(); closeActions(); }}>
            <MaterialCommunityIcons name="trash-can" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <Animated.View
        style={[s.card, colorHex ? { backgroundColor: colorHex } : {}, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={s.cardInner}>
          <View style={s.cardLeft}>
            {note.emoji ? (
              <Text style={s.emoji}>{note.emoji}</Text>
            ) : (
              <View style={[s.typeIcon, { backgroundColor: colors.primarySoft }]}>
                <MaterialCommunityIcons
                  name={note.hasHandwriting ? 'draw' : note.hasAudio ? 'microphone' : 'text'}
                  size={16}
                  color={colors.primary}
                />
              </View>
            )}
          </View>
          <View style={s.cardBody}>
            <View style={s.titleRow}>
              {note.isPinned && <MaterialCommunityIcons name="pin" size={12} color={colors.primary} style={{ marginRight: 4 }} />}
              <Text style={s.title} numberOfLines={1}>{note.title}</Text>
              {note.isFlagged && <MaterialCommunityIcons name="flag" size={12} color={colors.warning} style={{ marginLeft: 4 }} />}
              {note.isLocked && <MaterialCommunityIcons name="lock" size={12} color={colors.textMuted} style={{ marginLeft: 4 }} />}
            </View>
            {preview ? <Text style={s.preview} numberOfLines={2}>{preview}</Text> : null}
            <View style={s.metaRow}>
              <Text style={s.date}>{formatShortDate(note.modifiedAt)}</Text>
              {showNotebook && notebookName && (
                <Text style={s.notebook} numberOfLines={1}> · {notebookName}</Text>
              )}
              {note.wordCount > 0 && (
                <Text style={s.wordCount}> · {note.wordCount}w</Text>
              )}
            </View>
            {note.tags.length > 0 && (
              <View style={s.tagRow}>
                {note.tags.slice(0, 3).map(tag => (
                  <View key={tag} style={s.tagBadge}>
                    <Text style={s.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = (colors: typeof Colors.light, isDark: boolean) => StyleSheet.create({
  swipeContainer: { position: 'relative', marginBottom: 8, marginHorizontal: 16 },
  actionsContainer: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background, borderRadius: Colors.radius.lg,
  },
  actionBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginLeft: 6,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: Colors.radius.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardInner: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  cardLeft: { marginRight: 12 },
  typeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 28, lineHeight: 36 },
  cardBody: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  title: { fontSize: Colors.font.base, fontWeight: '600', color: colors.text, flex: 1 },
  preview: { fontSize: Colors.font.sm, color: colors.textSecondary, lineHeight: 18, marginBottom: 5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  date: { fontSize: Colors.font.xs, color: colors.textMuted },
  notebook: { fontSize: Colors.font.xs, color: colors.textMuted, flex: 1 },
  wordCount: { fontSize: Colors.font.xs, color: colors.textMuted },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  tagBadge: { backgroundColor: colors.primarySoft, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  tagText: { fontSize: 10, color: colors.primary, fontWeight: '500' },
  pinBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: colors.primarySoft, borderRadius: 10, padding: 3,
  },
  gridCard: {
    backgroundColor: colors.card,
    borderRadius: Colors.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
    minHeight: 140,
  },
  gridEmoji: { fontSize: 24, marginBottom: 6 },
  gridTitle: { fontSize: Colors.font.base, fontWeight: '600', color: colors.text, marginBottom: 5 },
  gridPreview: { fontSize: Colors.font.sm, color: colors.textSecondary, flex: 1, lineHeight: 18 },
  gridMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  gridDate: { fontSize: Colors.font.xs, color: colors.textMuted },
});
