import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform,
  Alert, ScrollView, Modal, Pressable, PanResponder, Animated as RNAnimated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn, FadeOut, SlideInDown, SlideOutDown,
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
} from 'react-native-reanimated';
import * as KeepAwake from 'expo-keep-awake';
import { haptic } from '../../src/utils/haptics';
import { useTheme } from '../../src/context/ThemeContext';
import { useDrawing } from '../../src/context/DrawingContext';
import { useNotes } from '../../src/context/NotesContext';
import { DrawingCanvas } from '../../src/components/DrawingCanvas';
import { Colors } from '../../src/constants/colors';
import { Storage, STORAGE_KEYS } from '../../src/utils/storage';
import { PEN_TOOLS, PenToolType, DEFAULT_PEN_COLORS, NEON_COLORS } from '../../src/constants/penTools';
import { TEMPLATES } from '../../src/constants/templates';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const EXTENDED_COLORS = [
  '#000000', '#1a1a2e', '#16213e', '#0f3460',
  '#e94560', '#ff6b6b', '#ff8e53', '#ffd460',
  '#f9ca24', '#6ab04c', '#22a6b3', '#30336b',
  '#535c68', '#95afc0', '#c7ecee', '#ffffff',
  '#6c5ce7', '#a29bfe', '#fd79a8', '#e17055',
  '#00b894', '#00cec9', '#0984e3', '#74b9ff',
  '#2d3436', '#636e72', '#b2bec3', '#dfe6e9',
  '#d63031', '#e84393', '#fdcb6e', '#55efc4',
];

type CanvasPage = { id: string; strokes: any[]; template: string };

export default function DrawScreen() {
  const { colors, isDark } = useTheme();
  const { strokes, clearAll, canUndo, canRedo, undo, redo, activeTool, setActiveTool,
    penColor, setPenColor, penWidth, setPenWidth, penOpacity, setPenOpacity,
    selectedTemplate, setSelectedTemplate, loadStrokes } = useDrawing();
  const { createNote } = useNotes();
  const insets = useSafeAreaInsets();

  const [isSaving, setIsSaving] = useState(false);
  const [keepAwake, setKeepAwake] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showColorPanel, setShowColorPanel] = useState(false);
  const [showToolPanel, setShowToolPanel] = useState(false);
  const [showTemplatePanel, setShowTemplatePanel] = useState(false);
  const [showSizePanel, setShowSizePanel] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);
  const [pages, setPages] = useState<CanvasPage[]>([{ id: '1', strokes: [], template: 'blank' }]);
  const [currentPage, setCurrentPage] = useState(0);
  const [showPagePanel, setShowPagePanel] = useState(false);
  const [zoom, setZoom] = useState(100);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 + 84 : insets.bottom + 60;
  const toolbarH = isFullscreen ? 0 : 62;
  const canvasH = SCREEN_H - topPad - bottomPad - toolbarH;

  useEffect(() => {
    setStrokeCount(strokes.length);
  }, [strokes]);

  const handleSave = async () => {
    if (strokes.length === 0) {
      Alert.alert('Nothing to Save', 'Draw something on the canvas first!');
      return;
    }
    setIsSaving(true);
    haptic.success();
    try {
      const note = await createNote({
        title: `Drawing — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        content: `Canvas drawing with ${strokes.length} strokes`,
        type: 'handwriting',
        hasHandwriting: true,
        templateId: selectedTemplate,
      });
      await Storage.set(STORAGE_KEYS.STROKES(note.id), strokes);
      Alert.alert('Saved! 🎉', 'Your drawing has been saved as a note.', [
        { text: 'Keep Drawing', style: 'cancel' },
        { text: 'Clear Canvas', onPress: () => clearAll() },
      ]);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAll = () => {
    if (strokes.length === 0) return;
    Alert.alert('Clear Canvas', `This will erase all ${strokes.length} strokes. Continue?`, [
      { text: 'Clear All', style: 'destructive', onPress: () => { clearAll(); haptic.warning(); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const toggleKeepAwake = async () => {
    if (keepAwake) { await KeepAwake.deactivateKeepAwake(); }
    else { await KeepAwake.activateKeepAwakeAsync(); }
    setKeepAwake(!keepAwake);
    Haptics.selectionAsync();
  };

  const selectTool = (tool: PenToolType) => {
    setActiveTool(tool);
    setShowToolPanel(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const selectColor = (color: string) => {
    setPenColor(color);
    setShowColorPanel(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const currentTool = PEN_TOOLS.find(t => t.id === activeTool);
  const s = styles(colors);

  const renderToolIcon = (toolId: PenToolType, size = 22) => {
    const tool = PEN_TOOLS.find(t => t.id === toolId);
    if (!tool) return null;
    return <MaterialCommunityIcons name={tool.icon as any} size={size} color={activeTool === toolId ? '#fff' : colors.text} />;
  };

  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      {!isFullscreen && (
        <Animated.View entering={FadeIn} style={[s.header, { paddingTop: topPad + 6 }]}>
          <View style={s.headerLeft}>
            <Text style={s.title}>Canvas</Text>
            <View style={s.strokeBadge}>
              <Text style={s.strokeText}>{strokeCount}</Text>
            </View>
          </View>

          <View style={s.headerCenter}>
            <Text style={s.pageIndicator}>Page {currentPage + 1}</Text>
          </View>

          <View style={s.headerRight}>
            <TouchableOpacity style={[s.headerBtn, keepAwake && { backgroundColor: colors.primarySoft }]} onPress={toggleKeepAwake}>
              <MaterialCommunityIcons name={keepAwake ? 'eye' : 'eye-off-outline'} size={18} color={keepAwake ? colors.primary : colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={s.headerBtn} onPress={() => setIsFullscreen(true)}>
              <MaterialCommunityIcons name="fullscreen" size={18} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.saveBtn, { backgroundColor: strokes.length > 0 ? colors.primary : colors.inputBg }]}
              onPress={handleSave}
              disabled={isSaving}
            >
              <MaterialCommunityIcons name="content-save-outline" size={16} color={strokes.length > 0 ? '#fff' : colors.textMuted} />
              <Text style={[s.saveBtnText, { color: strokes.length > 0 ? '#fff' : colors.textMuted }]}>
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {isFullscreen && (
        <TouchableOpacity style={[s.exitFull, { top: topPad + 8 }]} onPress={() => setIsFullscreen(false)}>
          <MaterialCommunityIcons name="fullscreen-exit" size={22} color={colors.text} />
        </TouchableOpacity>
      )}

      <View style={[s.canvasWrapper, { height: canvasH }]}>
        <DrawingCanvas width={SCREEN_W} height={canvasH} />

        {isFullscreen && strokes.length > 0 && (
          <Animated.View entering={FadeIn} style={s.fullscreenStrokeCount}>
            <Text style={s.fullscreenStrokeText}>{strokeCount} strokes</Text>
          </Animated.View>
        )}

        {zoom !== 100 && (
          <View style={s.zoomBadge}>
            <Text style={s.zoomText}>{zoom}%</Text>
          </View>
        )}
      </View>

      {!isFullscreen && (
        <View style={s.mainToolbar}>
          <View style={s.toolbarLeft}>
            <TouchableOpacity
              style={[s.toolBtn, activeTool === 'eraser' && s.toolBtnActive]}
              onPress={() => selectTool(activeTool === 'eraser' ? 'ballpoint' : 'eraser')}
            >
              <MaterialCommunityIcons name="eraser" size={20} color={activeTool === 'eraser' ? '#fff' : colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.toolBtn, !canUndo && s.toolBtnDisabled]}
              onPress={() => { undo(); Haptics.selectionAsync(); }}
              disabled={!canUndo}
            >
              <MaterialCommunityIcons name="undo" size={20} color={canUndo ? colors.text : colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.toolBtn, !canRedo && s.toolBtnDisabled]}
              onPress={() => { redo(); Haptics.selectionAsync(); }}
              disabled={!canRedo}
            >
              <MaterialCommunityIcons name="redo" size={20} color={canRedo ? colors.text : colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={s.toolbarCenter}>
            <TouchableOpacity style={s.activePenBtn} onPress={() => setShowToolPanel(true)}>
              <MaterialCommunityIcons name={(currentTool?.icon || 'pen') as any} size={22} color={penColor === '#ffffff' ? colors.text : penColor} />
              <MaterialCommunityIcons name="chevron-up" size={14} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.colorDot, { backgroundColor: penColor, borderColor: colors.border }]}
              onPress={() => setShowColorPanel(true)}
            />

            <TouchableOpacity style={s.widthBtn} onPress={() => setShowSizePanel(!showSizePanel)}>
              <View style={[s.widthDot, { width: Math.min(penWidth * 3, 24), height: Math.min(penWidth * 3, 24), backgroundColor: penColor === '#ffffff' ? colors.text : penColor, borderRadius: 12 }]} />
            </TouchableOpacity>
          </View>

          <View style={s.toolbarRight}>
            <TouchableOpacity style={s.toolBtn} onPress={() => setShowTemplatePanel(true)}>
              <MaterialCommunityIcons name="layers-outline" size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={s.toolBtn} onPress={() => setShowPagePanel(true)}>
              <MaterialCommunityIcons name="file-multiple-outline" size={20} color={colors.text} />
            </TouchableOpacity>
            {strokes.length > 0 && (
              <TouchableOpacity style={s.toolBtn} onPress={handleClearAll}>
                <MaterialCommunityIcons name="delete-sweep-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {showSizePanel && (
        <Animated.View entering={SlideInDown} exiting={SlideOutDown} style={[s.sizePanel, { backgroundColor: colors.surface }]}>
          <View style={s.sizePanelHeader}>
            <Text style={s.panelTitle}>Stroke Size</Text>
            <TouchableOpacity onPress={() => setShowSizePanel(false)}>
              <MaterialCommunityIcons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={s.sizePreview}>
            <View style={[s.sizePreviewLine, { height: Math.min(penWidth * 2, 40), backgroundColor: penColor === '#ffffff' ? colors.text : penColor, borderRadius: penWidth }]} />
          </View>
          <View style={s.sizeGrid}>
            {[0.5, 1, 2, 3, 5, 8, 12, 18, 24, 36].map(w => (
              <TouchableOpacity
                key={w}
                style={[s.sizeBtn, penWidth === w && s.sizeBtnActive]}
                onPress={() => { setPenWidth(w); Haptics.selectionAsync(); }}
              >
                <View style={[s.sizeDot, {
                  width: Math.min(w * 2.5, 32), height: Math.min(w * 2.5, 32),
                  backgroundColor: penColor === '#ffffff' ? colors.text : penColor,
                  borderRadius: Math.min(w * 2.5, 32) / 2,
                  opacity: penWidth === w ? 1 : 0.5,
                }]} />
                <Text style={s.sizeBtnLabel}>{w}px</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={s.opacityRow}>
            <Text style={s.panelSubtitle}>Opacity: {Math.round(penOpacity * 100)}%</Text>
            <View style={s.opacityBtns}>
              {[0.1, 0.25, 0.5, 0.75, 1.0].map(o => (
                <TouchableOpacity
                  key={o}
                  style={[s.opacityBtn, penOpacity === o && s.opacityBtnActive]}
                  onPress={() => { setPenOpacity(o); Haptics.selectionAsync(); }}
                >
                  <View style={[s.opacityDot, { backgroundColor: penColor === '#ffffff' ? colors.text : penColor, opacity: o }]} />
                  <Text style={s.opacityLabel}>{Math.round(o * 100)}%</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Animated.View>
      )}

      <Modal visible={showToolPanel} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={() => setShowToolPanel(false)}>
          <Pressable style={[s.sheet, { backgroundColor: colors.surface }]}>
            <View style={s.sheetHandle} />
            <Text style={[s.sheetTitle, { color: colors.text }]}>Pen Tools</Text>
            <View style={s.toolGrid}>
              {PEN_TOOLS.map(tool => (
                <TouchableOpacity
                  key={tool.id}
                  style={[s.toolGridBtn, activeTool === tool.id && s.toolGridBtnActive]}
                  onPress={() => selectTool(tool.id)}
                >
                  <View style={[s.toolGridIcon, activeTool === tool.id && { backgroundColor: colors.primary }]}>
                    <MaterialCommunityIcons
                      name={tool.icon as any}
                      size={26}
                      color={activeTool === tool.id ? '#fff' : colors.text}
                    />
                  </View>
                  <Text style={[s.toolGridLabel, { color: activeTool === tool.id ? colors.primary : colors.text }]}>
                    {tool.name}
                  </Text>
                  <Text style={s.toolGridDesc}>{tool.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showColorPanel} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={() => setShowColorPanel(false)}>
          <Pressable style={[s.sheet, { backgroundColor: colors.surface }]}>
            <View style={s.sheetHandle} />
            <Text style={[s.sheetTitle, { color: colors.text }]}>Color</Text>
            <View style={s.currentColorRow}>
              <View style={[s.currentColorSwatch, { backgroundColor: penColor }]} />
              <Text style={[s.currentColorLabel, { color: colors.textSecondary }]}>{penColor.toUpperCase()}</Text>
            </View>
            <Text style={s.colorSectionLabel}>Standard</Text>
            <View style={s.colorGrid}>
              {DEFAULT_PEN_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[s.colorSwatch, { backgroundColor: c }, penColor === c && s.colorSwatchActive,
                    c === '#ffffff' && { borderWidth: 1, borderColor: colors.border }]}
                  onPress={() => selectColor(c)}
                >
                  {penColor === c && <MaterialCommunityIcons name="check" size={14} color={c === '#ffffff' || c === '#eab308' ? '#000' : '#fff'} />}
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.colorSectionLabel}>Neon</Text>
            <View style={s.colorGrid}>
              {NEON_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[s.colorSwatch, { backgroundColor: c }, penColor === c && s.colorSwatchActive]}
                  onPress={() => selectColor(c)}
                >
                  {penColor === c && <MaterialCommunityIcons name="check" size={14} color="#000" />}
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.colorSectionLabel}>Extended Palette</Text>
            <View style={s.colorGridSmall}>
              {EXTENDED_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[s.colorSwatchSm, { backgroundColor: c }, penColor === c && s.colorSwatchActive,
                    c === '#ffffff' && { borderWidth: 1, borderColor: colors.border }]}
                  onPress={() => selectColor(c)}
                />
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showTemplatePanel} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={() => setShowTemplatePanel(false)}>
          <Pressable style={[s.sheet, { backgroundColor: colors.surface }]}>
            <View style={s.sheetHandle} />
            <Text style={[s.sheetTitle, { color: colors.text }]}>Page Template</Text>
            <View style={s.templateGrid}>
              {TEMPLATES.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[s.templateBtn, selectedTemplate === t.id && { borderColor: t.color, borderWidth: 2, backgroundColor: t.color + '22' }]}
                  onPress={() => { setSelectedTemplate(t.id); setShowTemplatePanel(false); Haptics.selectionAsync(); }}
                >
                  <View style={[s.templateIcon, { backgroundColor: t.color + '22' }]}>
                    <MaterialCommunityIcons name={t.icon as any} size={28} color={t.color} />
                  </View>
                  <Text style={[s.templateName, { color: colors.text }]}>{t.name}</Text>
                  {selectedTemplate === t.id && (
                    <View style={[s.templateCheck, { backgroundColor: t.color }]}>
                      <MaterialCommunityIcons name="check" size={10} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showPagePanel} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={() => setShowPagePanel(false)}>
          <Pressable style={[s.sheet, { backgroundColor: colors.surface }]}>
            <View style={s.sheetHandle} />
            <Text style={[s.sheetTitle, { color: colors.text }]}>Pages</Text>
            <View style={s.pageInfo}>
              <MaterialCommunityIcons name="file-document-outline" size={40} color={colors.primary} />
              <Text style={[s.pageInfoTitle, { color: colors.text }]}>Page {currentPage + 1} of {pages.length}</Text>
              <Text style={[s.pageInfoSub, { color: colors.textSecondary }]}>{strokes.length} strokes on this page</Text>
            </View>
            <View style={s.pageActions}>
              <TouchableOpacity
                style={[s.pageActionBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setPages(p => [...p, { id: String(Date.now()), strokes: [], template: selectedTemplate }]);
                  setCurrentPage(pages.length);
                  clearAll();
                  setShowPagePanel(false);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                <Text style={s.pageActionText}>Add New Page</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = (colors: typeof Colors.light) => StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  title: { fontSize: Colors.font.xl, fontWeight: '800', color: colors.text },
  strokeBadge: {
    backgroundColor: colors.primarySoft, borderRadius: Colors.radius.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  strokeText: { fontSize: Colors.font.xs, fontWeight: '700', color: colors.primary },
  headerCenter: { flex: 1, alignItems: 'center' },
  pageIndicator: { fontSize: Colors.font.sm, color: colors.textMuted, fontWeight: '500' },
  headerRight: { flexDirection: 'row', gap: 6, alignItems: 'center', flex: 1, justifyContent: 'flex-end' },
  headerBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.inputBg },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Colors.radius.full,
  },
  saveBtnText: { fontSize: Colors.font.sm, fontWeight: '700' },
  canvasWrapper: { flex: 1, position: 'relative' },
  exitFull: {
    position: 'absolute', right: 16, zIndex: 100,
    backgroundColor: colors.surface + 'dd',
    borderRadius: 12, padding: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 6,
  },
  fullscreenStrokeCount: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: colors.surface + 'cc',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
  },
  fullscreenStrokeText: { fontSize: Colors.font.sm, color: colors.textMuted, fontWeight: '500' },
  zoomBadge: {
    position: 'absolute', bottom: 12, right: 12,
    backgroundColor: colors.surface + 'cc',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  zoomText: { fontSize: 11, color: colors.primary, fontWeight: '700' },
  mainToolbar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
    gap: 4, minHeight: 62,
  },
  toolbarLeft: { flexDirection: 'row', gap: 4, flex: 1 },
  toolbarCenter: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1.5, justifyContent: 'center' },
  toolbarRight: { flexDirection: 'row', gap: 4, flex: 1, justifyContent: 'flex-end' },
  toolBtn: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.inputBg },
  toolBtnActive: { backgroundColor: colors.primary },
  toolBtnDisabled: { opacity: 0.35 },
  activePenBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.inputBg, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  colorDot: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 2.5, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2, shadowRadius: 3,
  },
  widthBtn: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.inputBg },
  widthDot: {},
  sizePanel: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  sizePanelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  panelTitle: { fontSize: Colors.font.base, fontWeight: '700', color: colors.text },
  panelSubtitle: { fontSize: Colors.font.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: 10 },
  sizePreview: { alignItems: 'center', height: 50, justifyContent: 'center', marginBottom: 12 },
  sizePreviewLine: { minWidth: 40 },
  sizeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  sizeBtn: { width: 54, height: 60, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.inputBg, gap: 4 },
  sizeBtnActive: { backgroundColor: colors.primarySoft, borderWidth: 2, borderColor: colors.primary },
  sizeDot: {},
  sizeBtnLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '500' },
  opacityRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  opacityBtns: { flexDirection: 'row', gap: 8 },
  opacityBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: colors.inputBg, gap: 4 },
  opacityBtnActive: { backgroundColor: colors.primarySoft, borderWidth: 1.5, borderColor: colors.primary },
  opacityDot: { width: 24, height: 24, borderRadius: 12 },
  opacityLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '500' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40,
    maxHeight: SCREEN_H * 0.8,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: Colors.font.xl, fontWeight: '800', marginBottom: 16 },
  toolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  toolGridBtn: { width: (SCREEN_W - 60) / 3, alignItems: 'center', padding: 12, borderRadius: 16, backgroundColor: colors.inputBg, gap: 6 },
  toolGridBtnActive: { backgroundColor: colors.primarySoft, borderWidth: 2, borderColor: colors.primary },
  toolGridIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  toolGridLabel: { fontSize: Colors.font.sm, fontWeight: '700' },
  toolGridDesc: { fontSize: 10, color: colors.textMuted, textAlign: 'center' },
  currentColorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, padding: 12, backgroundColor: colors.inputBg, borderRadius: 14 },
  currentColorSwatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border },
  currentColorLabel: { fontSize: Colors.font.base, fontWeight: '600' },
  colorSectionLabel: { fontSize: Colors.font.sm, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 4 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  colorGridSmall: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  colorSwatch: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  colorSwatchSm: { width: 30, height: 30, borderRadius: 15 },
  colorSwatchActive: { borderWidth: 3, borderColor: colors.primary },
  templateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  templateBtn: {
    width: (SCREEN_W - 64) / 3,
    padding: 12, borderRadius: 16,
    alignItems: 'center', gap: 6,
    backgroundColor: colors.inputBg,
    borderWidth: 1.5, borderColor: 'transparent',
    position: 'relative',
  },
  templateIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  templateName: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  templateCheck: {
    position: 'absolute', top: 6, right: 6,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  pageInfo: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  pageInfoTitle: { fontSize: Colors.font.xl, fontWeight: '700' },
  pageInfoSub: { fontSize: Colors.font.sm },
  pageActions: { gap: 10 },
  pageActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 16 },
  pageActionText: { color: '#fff', fontWeight: '700', fontSize: Colors.font.base },
});
