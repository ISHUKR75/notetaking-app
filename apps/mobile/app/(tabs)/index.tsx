import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as KeepAwake from 'expo-keep-awake';
import { useTheme } from '../../src/context/ThemeContext';
import { useDrawing } from '../../src/context/DrawingContext';
import { useNotes } from '../../src/context/NotesContext';
import { DrawingCanvas } from '../../src/components/DrawingCanvas';
import { PenToolbar } from '../../src/components/PenToolbar';
import { Colors } from '../../src/constants/colors';
import { Storage, STORAGE_KEYS } from '../../src/utils/storage';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CANVAS_W = SCREEN_W;
const CANVAS_H = SCREEN_H;

export default function DrawScreen() {
  const { colors, isDark } = useTheme();
  const { strokes, clearAll, canUndo, canRedo, undo, redo } = useDrawing();
  const { createNote, updateNote } = useNotes();
  const insets = useSafeAreaInsets();

  const [isSaving, setIsSaving] = useState(false);
  const [keepAwake, setKeepAwake] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 + 84 : insets.bottom + 60;

  const canvasH = SCREEN_H - topPad - bottomPad - (isFullscreen ? 0 : 62);

  const handleSave = async () => {
    if (strokes.length === 0) {
      Alert.alert('Nothing to Save', 'Draw something first!');
      return;
    }
    setIsSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const note = await createNote({
        title: `Drawing — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        content: '',
        type: 'handwriting',
        hasHandwriting: true,
        templateId: 'blank',
      });
      await Storage.set(STORAGE_KEYS.STROKES(note.id), strokes);
      Alert.alert('Saved!', 'Your drawing has been saved as a note.', [
        { text: 'OK', onPress: () => clearAll() },
      ]);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAll = () => {
    if (strokes.length === 0) return;
    Alert.alert('Clear Canvas', 'This will erase all strokes. Are you sure?', [
      { text: 'Clear', style: 'destructive', onPress: () => { clearAll(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const toggleKeepAwake = async () => {
    if (keepAwake) {
      await KeepAwake.deactivateKeepAwake();
    } else {
      await KeepAwake.activateKeepAwakeAsync();
    }
    setKeepAwake(!keepAwake);
    Haptics.selectionAsync();
  };

  const s = styles(colors);

  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      {!isFullscreen && (
        <View style={[s.header, { paddingTop: topPad + 8 }]}>
          <Text style={s.title}>Canvas</Text>
          <View style={s.headerActions}>
            <TouchableOpacity style={s.headerBtn} onPress={toggleKeepAwake}>
              <MaterialCommunityIcons
                name={keepAwake ? 'eye' : 'eye-off-outline'}
                size={20}
                color={keepAwake ? colors.primary : colors.textMuted}
              />
            </TouchableOpacity>
            <TouchableOpacity style={s.headerBtn} onPress={() => setIsFullscreen(true)}>
              <MaterialCommunityIcons name="fullscreen" size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.saveBtn, { backgroundColor: strokes.length > 0 ? colors.primary : colors.inputBg }]}
              onPress={handleSave}
              disabled={isSaving}
            >
              <MaterialCommunityIcons name="content-save-outline" size={18} color={strokes.length > 0 ? '#fff' : colors.textMuted} />
              <Text style={[s.saveBtnText, { color: strokes.length > 0 ? '#fff' : colors.textMuted }]}>
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isFullscreen && (
        <TouchableOpacity
          style={[s.exitFullscreen, { top: topPad + 8, right: 16 }]}
          onPress={() => setIsFullscreen(false)}
        >
          <MaterialCommunityIcons name="fullscreen-exit" size={22} color={colors.text} />
        </TouchableOpacity>
      )}

      <View style={[s.canvasContainer, { height: canvasH }]}>
        <DrawingCanvas width={CANVAS_W} height={canvasH} />
        <View style={s.strokeCount}>
          <Text style={s.strokeText}>{strokes.length} strokes</Text>
        </View>
      </View>

      <PenToolbar
        canUndo={canUndo}
        canRedo={canRedo}
        onClear={handleClearAll}
      />
    </View>
  );
}

const styles = (colors: typeof Colors.light) => StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 8,
  },
  title: { fontSize: Colors.font.xl, fontWeight: '700', color: colors.text },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  headerBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.inputBg },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Colors.radius.full,
  },
  saveBtnText: { fontSize: Colors.font.sm, fontWeight: '600' },
  canvasContainer: { flex: 1, overflow: 'hidden', borderTopWidth: 1, borderTopColor: colors.border },
  exitFullscreen: {
    position: 'absolute', zIndex: 100,
    backgroundColor: colors.surface + 'cc',
    borderRadius: 10, padding: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4,
  },
  strokeCount: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: colors.surface + 'cc',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  strokeText: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
});
