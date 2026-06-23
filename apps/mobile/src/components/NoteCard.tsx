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

const NOTE_TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  text:        { icon: 'text',                color: '#6366f1', label: 'Text' },
  handwriting: { icon: 'draw',               color: '#10b981', label: 'Drawing' },
  mixed:       { icon: 'layers-outline',      color: '#f59e0b', label: 'Mixed' },
  voice:       { icon: 'microphone-outline',  color: '#ef4444', label: 'Voice' },
};

export function NoteCard({
  note, onPress, onDelete, onPin, onFlag, onDuplicate, onArchive,
  viewMode = 'list', showNotebook, notebookName,
}: NoteCardProps) {
  const { colors, isDark, settings, sf } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const [showActions, setShowActions] = React.useState(false);

  const colorHex = getNoteColorHex(note.color, isDark);
  const hasColor = colorHex && colorHex !== 'transparent';
  const preview = getPreviewText(note.content, viewMode === 'grid' ? 75 : 120);
  const typeConfig = NOTE_TYPE_CONFIG[note.type] || NOTE_TYPE_CONFIG.text;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dy) < 15,
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) translateX.setValue(Math.max(g.dx, -170));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -55) {
          Animated.spring(translateX, { toValue: -170, useNativeDriver: true, tension: 85, friction: 11 }).start();
          setShowActions(true);
          haptic.light();
        } else {
          closeActions();
        }
      },
    })
  ).current;

  const closeActions = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 85, friction: 11 }).start();
    setShowActions(false);
  };

  // ── Grid view ──────────────────────────────────────────────────────────────
  if (viewMode === 'grid') {
    return (
      <TouchableOpacity
        style={[
          styles.gridCard,
          {
            backgroundColor: hasColor ? colorHex : colors.card,
            borderColor: hasColor ? colorHex : colors.border,
            shadowColor: isDark ? '#000' : 'rgba(0,0,0,0.06)',
          },
        ]}
        onPress={onPress}
        onLongPress={() => { onPin?.(); haptic.medium(); }}
        activeOpacity={0.87}
      >
        {/* Status badges */}
        <View style={{ position: 'absolute', top: 8, right: 8, flexDirection: 'row', gap: 4, zIndex: 2 }}>
          {note.isLocked && <View style={styles.badge}><MaterialCommunityIcons name="lock" size={9} color="#fff" /></View>}
          {note.isFavorite && <View style={[styles.badge, { backgroundColor: '#ef4444' }]}><MaterialCommunityIcons name="heart" size={9} color="#fff" /></View>}
          {note.isFlagged && <View style={[styles.badge, { backgroundColor: '#f59e0b' }]}><MaterialCommunityIcons name="flag" size={9} color="#fff" /></View>}
          {note.isPinned && <View style={[styles.badge, { backgroundColor: colors.primary }]}><MaterialCommunityIcons name="pin" size={9} color="#fff" /></View>}
        </View>

        {/* Icon or emoji */}
        <View style={{ marginBottom: 8 }}>
          {note.emoji ? (
            <Text style={{ fontSize: 26, lineHeight: 32 }}>{note.emoji}</Text>
          ) : (
            <View style={[styles.gridTypeIcon, { backgroundColor: typeConfig.color + '22' }]}>
              <MaterialCommunityIcons name={typeConfig.icon as any} size={15} color={typeConfig.color} />
            </View>
          )}
        </View>

        <Text style={{ fontSize: sf(13), fontWeight: '700', color: hasColor ? '#1e293b' : colors.text, marginBottom: 4, lineHeight: 18 }} numberOfLines={2}>
          {note.title || 'Untitled'}
        </Text>

        {preview ? (
          <Text style={{ fontSize: sf(12), color: hasColor ? '#475569' : colors.textSecondary, flex: 1, lineHeight: 17 }} numberOfLines={3}>
            {preview}
          </Text>
        ) : null}

        {/* Tags */}
        {settings.showTags && note.tags.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginTop: 6 }}>
            {note.tags.slice(0, 2).map(tag => (
              <View key={tag} style={[styles.tagBadge, { backgroundColor: hasColor ? 'rgba(0,0,0,0.1)' : colors.primarySoft }]}>
                <Text style={[styles.tagText, { color: hasColor ? '#334155' : colors.primary }]}>#{tag}</Text>
              </View>
            ))}
            {note.tags.length > 2 && (
              <Text style={{ fontSize: 10, color: hasColor ? '#475569' : colors.textMuted, fontWeight: '600', paddingVertical: 2 }}>+{note.tags.length - 2}</Text>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 }}>
          <Text style={{ fontSize: 10, color: hasColor ? '#64748b' : colors.textMuted, fontWeight: '500', flex: 1 }} numberOfLines={1}>
            {formatShortDate(note.modifiedAt)}
          </Text>
          {settings.showWordCount && note.wordCount > 0 && (
            <Text style={{ fontSize: 10, color: hasColor ? '#64748b' : colors.textMuted, fontWeight: '500' }}>{note.wordCount}w</Text>
          )}
          {note.hasHandwriting && <MaterialCommunityIcons name="pencil" size={11} color={hasColor ? '#64748b' : colors.textMuted} />}
          {note.hasAudio && <MaterialCommunityIcons name="microphone" size={11} color={hasColor ? '#64748b' : colors.textMuted} />}
        </View>
      </TouchableOpacity>
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────
  const swipeActions = [
    onPin && { icon: note.isPinned ? 'pin-off' : 'pin', bg: note.isPinned ? '#4338ca' : '#6366f1', action: () => { onPin(); closeActions(); haptic.success(); } },
    onFlag && { icon: note.isFlagged ? 'flag-off' : 'flag', bg: note.isFlagged ? '#d97706' : '#f59e0b', action: () => { onFlag(); closeActions(); haptic.select(); } },
    onDuplicate && { icon: 'content-copy', bg: '#10b981', action: () => { onDuplicate(); closeActions(); haptic.success(); } },
    onArchive && { icon: 'archive-arrow-down-outline', bg: '#8b5cf6', action: () => { onArchive(); closeActions(); haptic.select(); } },
    onDelete && { icon: 'trash-can', bg: '#ef4444', action: () => { onDelete(); closeActions(); haptic.warning(); } },
  ].filter(Boolean) as { icon: string; bg: string; action: () => void }[];

  return (
    <View style={[styles.swipeContainer, { marginBottom: 8, marginHorizontal: 16 }]}>
      {/* Swipe action buttons (revealed by swipe) */}
      <View style={[styles.actionsContainer, { width: swipeActions.length * 46 }]}>
        {swipeActions.map((a, i) => (
          <TouchableOpacity key={i} style={[styles.actionBtn, { backgroundColor: a.bg }]} onPress={a.action}>
            <MaterialCommunityIcons name={a.icon as any} size={17} color="#fff" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Main card */}
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: hasColor ? colorHex : colors.card,
            borderColor: hasColor ? colorHex : colors.border,
            shadowColor: isDark ? '#000' : 'rgba(0,0,0,0.06)',
            transform: [{ translateX }],
          },
        ]}
        {...(Platform.OS !== 'web' ? panResponder.panHandlers : {})}
      >
        {/* Left accent if note has color and no colorHex overlay */}
        {!hasColor && note.color !== 'none' && (
          <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderRadius: 4, backgroundColor: colors.primary + '60' }} />
        )}

        <TouchableOpacity onPress={onPress} activeOpacity={0.87} style={styles.cardInner}>
          {/* Left icon */}
          <View style={{ alignItems: 'center', justifyContent: 'flex-start', paddingTop: 1 }}>
            {note.emoji ? (
              <Text style={{ fontSize: 28, lineHeight: 36 }}>{note.emoji}</Text>
            ) : (
              <View style={[styles.typeIcon, { backgroundColor: typeConfig.color + '20' }]}>
                <MaterialCommunityIcons name={typeConfig.icon as any} size={17} color={typeConfig.color} />
              </View>
            )}
          </View>

          {/* Content */}
          <View style={{ flex: 1, minWidth: 0 }}>
            {/* Title + badges */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 }}>
              {note.isPinned && <MaterialCommunityIcons name="pin" size={11} color={hasColor ? '#475569' : colors.primary} />}
              <Text
                style={{ flex: 1, fontSize: sf(14), fontWeight: '700', color: hasColor ? '#1e293b' : colors.text }}
                numberOfLines={1}
              >
                {note.title || 'Untitled Note'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                {note.isFavorite && <MaterialCommunityIcons name="heart" size={11} color="#ef4444" />}
                {note.isFlagged && <MaterialCommunityIcons name="flag" size={11} color={hasColor ? '#92400e' : colors.warning} />}
                {note.isLocked && <MaterialCommunityIcons name="lock" size={11} color={hasColor ? '#475569' : colors.textMuted} />}
                {note.hasHandwriting && <MaterialCommunityIcons name="pencil" size={11} color={hasColor ? '#475569' : colors.textMuted} />}
                {note.hasAudio && <MaterialCommunityIcons name="microphone" size={11} color={hasColor ? '#475569' : colors.textMuted} />}
              </View>
            </View>

            {/* Preview */}
            {preview ? (
              <Text
                style={{ fontSize: sf(13), color: hasColor ? '#334155' : colors.textSecondary, lineHeight: 19, marginBottom: 5 }}
                numberOfLines={2}
              >
                {preview}
              </Text>
            ) : null}

            {/* Meta row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 3 }}>
              <Text style={{ fontSize: sf(11), color: hasColor ? '#475569' : colors.textMuted, fontWeight: '500' }}>
                {formatShortDate(note.modifiedAt)}
              </Text>
              {showNotebook && notebookName ? (
                <Text style={{ fontSize: sf(11), color: hasColor ? '#475569' : colors.textMuted }} numberOfLines={1}>
                  · {notebookName}
                </Text>
              ) : null}
              {settings.showWordCount && note.wordCount > 0 && (
                <Text style={{ fontSize: sf(11), color: hasColor ? '#475569' : colors.textMuted }}>
                  · {note.wordCount}w
                </Text>
              )}
              {settings.showReadingTime && note.readingTime > 0 && (
                <Text style={{ fontSize: sf(11), color: hasColor ? '#475569' : colors.textMuted }}>
                  · {note.readingTime}m
                </Text>
              )}
            </View>

            {/* Tags */}
            {settings.showTags && note.tags.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                {note.tags.slice(0, 3).map(tag => (
                  <View key={tag} style={[styles.tagBadge, { backgroundColor: hasColor ? 'rgba(0,0,0,0.1)' : colors.primarySoft }]}>
                    <Text style={[styles.tagText, { color: hasColor ? '#334155' : colors.primary }]}>#{tag}</Text>
                  </View>
                ))}
                {note.tags.length > 3 && (
                  <Text style={{ fontSize: 10, color: hasColor ? '#475569' : colors.textMuted, fontWeight: '600', paddingVertical: 2 }}>
                    +{note.tags.length - 3}
                  </Text>
                )}
              </View>
            )}
          </View>

          <MaterialCommunityIcons name="chevron-right" size={17} color={hasColor ? '#94a3b8' : colors.textMuted} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  swipeContainer: { position: 'relative' },
  actionsContainer: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    paddingRight: 4, gap: 4,
  },
  actionBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  card: {
    borderRadius: Colors.radius.lg, borderWidth: 1,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
    overflow: 'hidden',
  },
  cardInner: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  typeIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tagBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  tagText: { fontSize: 10, fontWeight: '700' },
  badge: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#64748b', alignItems: 'center', justifyContent: 'center',
  },
  gridCard: {
    flex: 1, borderRadius: Colors.radius.xl, padding: 13, borderWidth: 1.5,
    minHeight: 150, position: 'relative',
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 10, elevation: 3,
  },
  gridTypeIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
});
