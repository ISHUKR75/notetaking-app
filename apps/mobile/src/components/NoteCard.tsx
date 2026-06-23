import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  PanResponder, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Note } from '../context/NotesContext';
import { formatShortDate } from '../utils/dateUtils';
import { getNoteColorHex, getPreviewText } from '../utils/noteUtils';
import { Colors } from '../constants/colors';
import { haptic } from '../utils/haptics';

interface NoteCardProps {
  note: Note;
  onPress: () => void;
  onDelete?: () => void;
  onPin?: () => void;
  onFlag?: () => void;
  onDuplicate?: () => void;
  onArchive?: () => void;
  viewMode?: 'list' | 'grid';
  showNotebook?: boolean;
  notebookName?: string;
}

const NOTE_TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  text: { icon: 'text', color: '#6366f1' },
  handwriting: { icon: 'draw', color: '#10b981' },
  mixed: { icon: 'layers-outline', color: '#f59e0b' },
  voice: { icon: 'microphone', color: '#ef4444' },
};

export function NoteCard({
  note,
  onPress,
  onDelete,
  onPin,
  onFlag,
  onDuplicate,
  onArchive,
  viewMode = 'list',
  showNotebook,
  notebookName,
}: NoteCardProps) {
  const { colors, isDark, settings } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const [showActions, setShowActions] = React.useState(false);

  const colorHex = getNoteColorHex(note.color, isDark);
  const preview = getPreviewText(note.content, viewMode === 'grid' ? 80 : 130);
  const typeConfig = NOTE_TYPE_CONFIG[note.type] || NOTE_TYPE_CONFIG.text;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dy) < 20,
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) translateX.setValue(Math.max(g.dx, -160));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -60) {
          Animated.spring(translateX, { toValue: -160, useNativeDriver: true, tension: 80, friction: 10 }).start();
          setShowActions(true);
          haptic.light();
        } else {
          closeActions();
        }
      },
    })
  ).current;

  const closeActions = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
    setShowActions(false);
  };

  const s = styles(colors, isDark);

  if (viewMode === 'grid') {
    return (
      <TouchableOpacity
        style={[s.gridCard, colorHex ? { backgroundColor: colorHex, borderColor: colorHex } : {}]}
        onPress={onPress}
        onLongPress={() => { onPin && onPin(); haptic.medium(); }}
        activeOpacity={0.85}
      >
        {note.isPinned && (
          <View style={s.pinBadge}>
            <MaterialCommunityIcons name="pin" size={10} color="#fff" />
          </View>
        )}
        {note.isFlagged && (
          <View style={[s.pinBadge, { right: (note.isPinned ? 28 : 8) + (note.isFavorite ? 20 : 0), backgroundColor: '#f59e0b' }]}>
            <MaterialCommunityIcons name="flag" size={10} color="#fff" />
          </View>
        )}
        {note.isFavorite && (
          <View style={[s.pinBadge, { right: 8, backgroundColor: '#ef4444' }]}>
            <MaterialCommunityIcons name="heart" size={10} color="#fff" />
          </View>
        )}
        <View style={s.gridTop}>
          {note.emoji ? (
            <Text style={s.gridEmoji}>{note.emoji}</Text>
          ) : (
            <View style={[s.gridTypeIcon, { backgroundColor: typeConfig.color + '22' }]}>
              <MaterialCommunityIcons name={typeConfig.icon as any} size={16} color={typeConfig.color} />
            </View>
          )}
        </View>
        <Text style={s.gridTitle} numberOfLines={2}>{note.title}</Text>
        {preview ? <Text style={s.gridPreview} numberOfLines={3}>{preview}</Text> : null}
        <View style={s.gridFooter}>
          <Text style={s.gridDate}>{formatShortDate(note.modifiedAt)}</Text>
          {note.hasHandwriting && <MaterialCommunityIcons name="pencil" size={11} color={colors.textMuted} />}
          {note.hasAudio && <MaterialCommunityIcons name="microphone" size={11} color={colors.textMuted} />}
        </View>
        {note.tags.length > 0 && (
          <View style={s.tagRow}>
            {note.tags.slice(0, 2).map(tag => (
              <View key={tag} style={s.tagBadge}>
                <Text style={s.tagText}>#{tag}</Text>
              </View>
            ))}
            {note.tags.length > 2 && (
              <Text style={s.moreTagsText}>+{note.tags.length - 2}</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  }

  const actionCount = [onPin, onFlag, onDuplicate, onArchive, onDelete].filter(Boolean).length;

  return (
    <View style={s.swipeContainer}>
      <View style={[s.actionsContainer, { width: actionCount * 44 }]}>
        {onPin && (
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: note.isPinned ? '#4338ca' : '#6366f1' }]}
            onPress={() => { onPin(); closeActions(); haptic.medium(); }}
          >
            <MaterialCommunityIcons name={note.isPinned ? 'pin-off' : 'pin'} size={17} color="#fff" />
          </TouchableOpacity>
        )}
        {onFlag && (
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: note.isFlagged ? '#d97706' : '#f59e0b' }]}
            onPress={() => { onFlag(); closeActions(); haptic.medium(); }}
          >
            <MaterialCommunityIcons name={note.isFlagged ? 'flag-off' : 'flag'} size={17} color="#fff" />
          </TouchableOpacity>
        )}
        {onDuplicate && (
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: '#10b981' }]}
            onPress={() => { onDuplicate(); closeActions(); haptic.medium(); }}
          >
            <MaterialCommunityIcons name="content-copy" size={17} color="#fff" />
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: '#ef4444' }]}
            onPress={() => { onDelete(); closeActions(); haptic.warning(); }}
          >
            <MaterialCommunityIcons name="trash-can" size={17} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <Animated.View
        style={[
          s.card,
          colorHex ? { backgroundColor: colorHex, borderColor: colorHex } : {},
          { transform: [{ translateX }] },
        ]}
        {...(Platform.OS !== 'web' ? panResponder.panHandlers : {})}
      >
        <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={s.cardInner}>
          <View style={s.cardLeft}>
            {note.emoji ? (
              <Text style={s.emoji}>{note.emoji}</Text>
            ) : (
              <View style={[s.typeIcon, { backgroundColor: typeConfig.color + '22' }]}>
                <MaterialCommunityIcons name={typeConfig.icon as any} size={17} color={typeConfig.color} />
              </View>
            )}
          </View>
          <View style={s.cardBody}>
            <View style={s.titleRow}>
              {note.isPinned && (
                <MaterialCommunityIcons name="pin" size={11} color={colors.primary} style={{ marginRight: 3 }} />
              )}
              <Text style={s.title} numberOfLines={1}>{note.title}</Text>
              <View style={s.titleBadges}>
                {note.isFavorite && <MaterialCommunityIcons name="heart" size={11} color="#ef4444" />}
                {note.isFlagged && <MaterialCommunityIcons name="flag" size={11} color={colors.warning} />}
                {note.isLocked && <MaterialCommunityIcons name="lock" size={11} color={colors.textMuted} />}
                {note.hasHandwriting && <MaterialCommunityIcons name="pencil" size={11} color={colors.textMuted} />}
                {note.hasAudio && <MaterialCommunityIcons name="microphone" size={11} color={colors.textMuted} />}
              </View>
            </View>
            {preview ? (
              <Text style={s.preview} numberOfLines={2}>{preview}</Text>
            ) : null}
            <View style={s.metaRow}>
              <Text style={s.date}>{formatShortDate(note.modifiedAt)}</Text>
              {showNotebook && notebookName ? (
                <Text style={s.notebook} numberOfLines={1}> · {notebookName}</Text>
              ) : null}
              {settings.showWordCount && note.wordCount > 0 ? (
                <Text style={s.wordCount}> · {note.wordCount}w</Text>
              ) : null}
            </View>
            {settings.showTags && note.tags.length > 0 && (
              <View style={s.tagRow}>
                {note.tags.slice(0, 3).map(tag => (
                  <View key={tag} style={s.tagBadge}>
                    <Text style={s.tagText}>#{tag}</Text>
                  </View>
                ))}
                {note.tags.length > 3 && (
                  <Text style={s.moreTagsText}>+{note.tags.length - 3}</Text>
                )}
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    paddingRight: 4,
    borderRadius: Colors.radius.lg,
    gap: 4,
  },
  actionBtn: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: Colors.radius.lg,
    shadowColor: isDark ? '#000' : 'rgba(0,0,0,0.07)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardInner: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  cardLeft: { alignItems: 'center', justifyContent: 'center' },
  typeIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 30, lineHeight: 38 },
  cardBody: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 2 },
  title: { fontSize: Colors.font.base, fontWeight: '600', color: colors.text, flex: 1 },
  titleBadges: { flexDirection: 'row', gap: 3, alignItems: 'center' },
  preview: { fontSize: Colors.font.sm, color: colors.textSecondary, lineHeight: 19, marginBottom: 5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  date: { fontSize: Colors.font.xs, color: colors.textMuted, fontWeight: '500' },
  notebook: { fontSize: Colors.font.xs, color: colors.textMuted, flex: 1 },
  wordCount: { fontSize: Colors.font.xs, color: colors.textMuted },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  tagBadge: { backgroundColor: colors.primarySoft, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  tagText: { fontSize: 10, color: colors.primary, fontWeight: '600' },
  moreTagsText: { fontSize: 10, color: colors.textMuted, fontWeight: '600', paddingVertical: 2 },
  pinBadge: {
    position: 'absolute', top: 8, right: 8, zIndex: 2,
    backgroundColor: colors.primary, borderRadius: 8, padding: 3,
  },
  gridCard: {
    backgroundColor: colors.card,
    borderRadius: Colors.radius.xl,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: isDark ? '#000' : 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
    minHeight: 150,
    flex: 1,
    position: 'relative',
  },
  gridTop: { marginBottom: 8 },
  gridTypeIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  gridEmoji: { fontSize: 26, lineHeight: 34 },
  gridTitle: { fontSize: Colors.font.base, fontWeight: '700', color: colors.text, marginBottom: 4 },
  gridPreview: { fontSize: Colors.font.sm, color: colors.textSecondary, flex: 1, lineHeight: 18 },
  gridFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  gridDate: { fontSize: 10, color: colors.textMuted, fontWeight: '500', flex: 1 },
});
