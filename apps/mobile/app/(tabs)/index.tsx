import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform,
  Alert, ScrollView, Modal, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  FadeIn, SlideInDown, SlideOutDown,
} from 'react-native-reanimated';
import * as KeepAwake from 'expo-keep-awake';
import { haptic } from '../../src/utils/haptics';
import { useTheme } from '../../src/context/ThemeContext';
import { useDrawing } from '../../src/context/DrawingContext';
import { useNotes } from '../../src/context/NotesContext';
import { DrawingCanvas } from '../../src/components/DrawingCanvas';
import { Colors } from '../../src/constants/colors';
import { Storage, STORAGE_KEYS } from '../../src/utils/storage';
import { PEN_TOOLS, PenToolType, DEFAULT_PEN_COLORS, NEON_COLORS, EXTENDED_COLORS } from '../../src/constants/penTools';
import { TEMPLATES } from '../../src/constants/templates';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type CanvasPage = { id: string; template: string };

export default function DrawScreen() {
  const { colors } = useTheme();
  const {
    strokes, clearAll, canUndo, canRedo, undo, redo,
    activeTool, setActiveTool,
    penColor, setPenColor, penWidth, setPenWidth, penOpacity, setPenOpacity,
    selectedTemplate, setSelectedTemplate,
  } = useDrawing();
  const { createNote } = useNotes();
  const insets = useSafeAreaInsets();

  const [isSaving, setIsSaving] = useState(false);
  const [keepAwake, setKeepAwake] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showColorPanel, setShowColorPanel] = useState(false);
  const [showToolPanel, setShowToolPanel] = useState(false);
  const [showTemplatePanel, setShowTemplatePanel] = useState(false);
  const [showSizePanel, setShowSizePanel] = useState(false);
  const [pages, setPages] = useState<CanvasPage[]>([{ id: '1', template: 'blank' }]);
  const [currentPage, setCurrentPage] = useState(0);
  const [showPagePanel, setShowPagePanel] = useState(false);
  const [colorTab, setColorTab] = useState<'standard' | 'neon' | 'extended'>('standard');

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 + 84 : insets.bottom + 60;
  const toolbarH = isFullscreen ? 0 : 60;
  const canvasH = SCREEN_H - topPad - botPad - toolbarH - 52;

  const currentTool = PEN_TOOLS.find(t => t.id === activeTool);

  const handleSave = async () => {
    if (!strokes.length) { Alert.alert('Nothing to Save', 'Draw something first!'); return; }
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
    } finally { setIsSaving(false); }
  };

  const handleClearAll = () => {
    if (!strokes.length) return;
    Alert.alert('Clear Canvas', `This will erase all ${strokes.length} strokes.`, [
      { text: 'Clear All', style: 'destructive', onPress: () => { clearAll(); haptic.warning(); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const toggleKeepAwake = async () => {
    if (keepAwake) await KeepAwake.deactivateKeepAwake();
    else await KeepAwake.activateKeepAwakeAsync();
    setKeepAwake(v => !v);
    haptic.select();
  };

  const selectTool = (tool: PenToolType) => {
    setActiveTool(tool);
    setShowToolPanel(false);
    haptic.light();
  };

  const selectColor = (color: string) => {
    setPenColor(color);
    setShowColorPanel(false);
    haptic.light();
  };

  const s = styles(colors);

  const colorsByTab = colorTab === 'standard' ? DEFAULT_PEN_COLORS : colorTab === 'neon' ? NEON_COLORS : EXTENDED_COLORS;

  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      {!isFullscreen && (
        <Animated.View entering={FadeIn} style={[s.header, { paddingTop: topPad + 6 }]}>
          <View style={s.headerLeft}>
            <Text style={s.title}>Canvas</Text>
            {strokes.length > 0 && (
              <View style={s.strokeBadge}>
                <Text style={s.strokeText}>{strokes.length}</Text>
              </View>
            )}
          </View>
          <View style={s.headerCenter}>
            <Text style={s.pageLabel}>Page {currentPage + 1} of {pages.length}</Text>
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
              <MaterialCommunityIcons name="content-save-outline" size={15} color={strokes.length > 0 ? '#fff' : colors.textMuted} />
              <Text style={[s.saveBtnTxt, { color: strokes.length > 0 ? '#fff' : colors.textMuted }]}>
                {isSaving ? 'Saving…' : 'Save'}
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

      {/* Canvas */}
      <View style={[s.canvasWrap, { height: canvasH }]}>
        <DrawingCanvas width={SCREEN_W} height={canvasH} />
      </View>

      {/* Main toolbar */}
      {!isFullscreen && (
        <View style={s.toolbar}>
          {/* Left: erase / undo / redo */}
          <View style={s.tbLeft}>
            <TouchableOpacity
              style={[s.tbBtn, activeTool === 'eraser' && s.tbBtnActive]}
              onPress={() => { selectTool(activeTool === 'eraser' ? 'ballpoint' : 'eraser'); }}
            >
              <MaterialCommunityIcons name="eraser" size={20} color={activeTool === 'eraser' ? '#fff' : colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={[s.tbBtn, !canUndo && s.tbBtnDim]} onPress={() => { if (canUndo) { undo(); haptic.select(); } }} disabled={!canUndo}>
              <MaterialCommunityIcons name="undo" size={20} color={canUndo ? colors.text : colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={[s.tbBtn, !canRedo && s.tbBtnDim]} onPress={() => { if (canRedo) { redo(); haptic.select(); } }} disabled={!canRedo}>
              <MaterialCommunityIcons name="redo" size={20} color={canRedo ? colors.text : colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Center: active tool, color dot, width */}
          <View style={s.tbCenter}>
            <TouchableOpacity style={s.activePenBtn} onPress={() => { setShowToolPanel(true); haptic.light(); }}>
              <MaterialCommunityIcons name={(currentTool?.icon || 'pen') as any} size={22} color={penColor === '#ffffff' ? colors.text : penColor} />
              <MaterialCommunityIcons name="chevron-up" size={13} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.colorDot, { backgroundColor: penColor, borderColor: penColor === '#ffffff' ? colors.border : penColor + '44' }]}
              onPress={() => { setShowColorPanel(true); haptic.light(); }}
            />

            <TouchableOpacity style={s.tbBtn} onPress={() => { setShowSizePanel(v => !v); haptic.select(); }}>
              <View style={{
                width: Math.min(penWidth * 2.5, 26), height: Math.min(penWidth * 2.5, 26),
                borderRadius: 13, backgroundColor: penColor === '#ffffff' ? colors.text : penColor,
              }} />
            </TouchableOpacity>
          </View>

          {/* Right: template, page, clear */}
          <View style={s.tbRight}>
            <TouchableOpacity style={s.tbBtn} onPress={() => { setShowTemplatePanel(true); haptic.light(); }}>
              <MaterialCommunityIcons name="layers-outline" size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={s.tbBtn} onPress={() => { setShowPagePanel(true); haptic.light(); }}>
              <MaterialCommunityIcons name="file-multiple-outline" size={20} color={colors.text} />
            </TouchableOpacity>
            {strokes.length > 0 && (
              <TouchableOpacity style={s.tbBtn} onPress={handleClearAll}>
                <MaterialCommunityIcons name="delete-sweep-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Size Panel */}
      {showSizePanel && !isFullscreen && (
        <Animated.View entering={SlideInDown} exiting={SlideOutDown} style={[s.sizePanel, { backgroundColor: colors.surface }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: Colors.font.base, fontWeight: '700', color: colors.text }}>Stroke Size & Opacity</Text>
            <TouchableOpacity onPress={() => setShowSizePanel(false)}>
              <MaterialCommunityIcons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={{ alignItems: 'center', height: 44, justifyContent: 'center', marginBottom: 10 }}>
            <View style={{ height: Math.min(penWidth * 2, 36), minWidth: 40, borderRadius: penWidth, backgroundColor: penColor === '#ffffff' ? colors.text : penColor }} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {[0.5, 1, 2, 3, 5, 8, 12, 18, 24, 36].map(w => (
              <TouchableOpacity
                key={w}
                style={{ width: 56, height: 60, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: penWidth === w ? colors.primarySoft : colors.inputBg, borderWidth: penWidth === w ? 2 : 0, borderColor: colors.primary }}
                onPress={() => { setPenWidth(w); haptic.select(); }}
              >
                <View style={{ width: Math.min(w * 2.5, 32), height: Math.min(w * 2.5, 32), borderRadius: 16, backgroundColor: penColor === '#ffffff' ? colors.text : penColor, opacity: penWidth === w ? 1 : 0.5 }} />
                <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '500' }}>{w}px</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={{ fontSize: Colors.font.sm, color: colors.textSecondary, fontWeight: '600', marginBottom: 8 }}>Opacity: {Math.round(penOpacity * 100)}%</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[0.1, 0.25, 0.5, 0.75, 1.0].map(o => (
              <TouchableOpacity
                key={o}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, gap: 4, backgroundColor: penOpacity === o ? colors.primarySoft : colors.inputBg, borderWidth: penOpacity === o ? 1.5 : 0, borderColor: colors.primary }}
                onPress={() => { setPenOpacity(o); haptic.select(); }}
              >
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: penColor === '#ffffff' ? colors.text : penColor, opacity: o }} />
                <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '500' }}>{Math.round(o * 100)}%</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      )}

      {/* Tool picker */}
      <Modal visible={showToolPanel} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={() => setShowToolPanel(false)}>
          <Pressable style={[s.sheet, { backgroundColor: colors.surface }]}>
            <View style={s.handle} />
            <Text style={[s.sheetTitle, { color: colors.text }]}>Drawing Tools</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {['pen', 'brush', 'effect', 'erase'].map(cat => {
                const catTools = PEN_TOOLS.filter(t => t.category === cat);
                return (
                  <View key={cat} style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: Colors.font.xs, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                      {cat === 'pen' ? 'Pens' : cat === 'brush' ? 'Brushes' : cat === 'effect' ? 'Effects' : 'Eraser'}
                    </Text>
                    <View style={s.toolGrid}>
                      {catTools.map(tool => (
                        <TouchableOpacity
                          key={tool.id}
                          style={[s.toolGridBtn, activeTool === tool.id && s.toolGridBtnActive]}
                          onPress={() => selectTool(tool.id)}
                        >
                          <View style={[s.toolGridIcon, { backgroundColor: activeTool === tool.id ? colors.primary : colors.card }]}>
                            <MaterialCommunityIcons name={tool.icon as any} size={24} color={activeTool === tool.id ? '#fff' : colors.text} />
                          </View>
                          <Text style={{ fontSize: Colors.font.xs, fontWeight: '700', color: activeTool === tool.id ? colors.primary : colors.text, textAlign: 'center' }}>{tool.name}</Text>
                          <Text style={{ fontSize: 9, color: colors.textMuted, textAlign: 'center' }} numberOfLines={2}>{tool.description}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Color picker */}
      <Modal visible={showColorPanel} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={() => setShowColorPanel(false)}>
          <Pressable style={[s.sheet, { backgroundColor: colors.surface }]}>
            <View style={s.handle} />
            <Text style={[s.sheetTitle, { color: colors.text }]}>Color</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, backgroundColor: colors.inputBg, padding: 12, borderRadius: 14 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: penColor, borderWidth: 1, borderColor: colors.border }} />
              <Text style={{ fontSize: Colors.font.base, fontWeight: '600', color: colors.textSecondary }}>{penColor.toUpperCase()}</Text>
            </View>
            {/* Tabs */}
            <View style={{ flexDirection: 'row', backgroundColor: colors.inputBg, borderRadius: 12, padding: 3, marginBottom: 14, gap: 2 }}>
              {(['standard', 'neon', 'extended'] as const).map(tab => (
                <TouchableOpacity key={tab} style={{ flex: 1, paddingVertical: 7, borderRadius: 9, alignItems: 'center', backgroundColor: colorTab === tab ? colors.surface : 'transparent' }}
                  onPress={() => setColorTab(tab)}>
                  <Text style={{ fontSize: Colors.font.xs, fontWeight: '700', color: colorTab === tab ? colors.primary : colors.textMuted, textTransform: 'capitalize' }}>{tab}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: colorTab === 'extended' ? 8 : 10, marginBottom: 8 }}>
              {colorsByTab.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[{
                    width: colorTab === 'extended' ? 30 : 36,
                    height: colorTab === 'extended' ? 30 : 36,
                    borderRadius: colorTab === 'extended' ? 15 : 18,
                    backgroundColor: c,
                    alignItems: 'center', justifyContent: 'center',
                  }, penColor === c && { borderWidth: 3, borderColor: colors.primary },
                    c === '#ffffff' && { borderWidth: 1, borderColor: colors.border }]}
                  onPress={() => selectColor(c)}
                >
                  {penColor === c && <MaterialCommunityIcons name="check" size={13} color={c === '#ffffff' || c === '#eab308' || c === '#fef08a' ? '#000' : '#fff'} />}
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Template picker */}
      <Modal visible={showTemplatePanel} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={() => setShowTemplatePanel(false)}>
          <Pressable style={[s.sheet, { backgroundColor: colors.surface }]}>
            <View style={s.handle} />
            <Text style={[s.sheetTitle, { color: colors.text }]}>Page Template</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={s.templateGrid}>
                {TEMPLATES.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={[s.templateBtn, { backgroundColor: colors.inputBg }, selectedTemplate === t.id && { borderColor: t.color, borderWidth: 2, backgroundColor: t.color + '22' }]}
                    onPress={() => { setSelectedTemplate(t.id); setShowTemplatePanel(false); haptic.select(); }}
                  >
                    <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: t.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                      <MaterialCommunityIcons name={t.icon as any} size={26} color={t.color} />
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text, textAlign: 'center' }} numberOfLines={2}>{t.name}</Text>
                    {selectedTemplate === t.id && (
                      <View style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, backgroundColor: t.color, alignItems: 'center', justifyContent: 'center' }}>
                        <MaterialCommunityIcons name="check" size={10} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Page Manager */}
      <Modal visible={showPagePanel} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={() => setShowPagePanel(false)}>
          <Pressable style={[s.sheet, { backgroundColor: colors.surface }]}>
            <View style={s.handle} />
            <Text style={[s.sheetTitle, { color: colors.text }]}>Pages</Text>
            <View style={{ alignItems: 'center', paddingVertical: 20, gap: 8 }}>
              <MaterialCommunityIcons name="file-document-outline" size={44} color={colors.primary} />
              <Text style={{ fontSize: Colors.font.xl, fontWeight: '700', color: colors.text }}>Page {currentPage + 1} of {pages.length}</Text>
              <Text style={{ fontSize: Colors.font.sm, color: colors.textSecondary }}>{strokes.length} strokes on this page</Text>
            </View>
            <TouchableOpacity
              style={{ backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
              onPress={() => {
                const newPage: CanvasPage = { id: String(Date.now()), template: selectedTemplate };
                setPages(p => [...p, newPage]);
                setCurrentPage(pages.length);
                clearAll();
                setShowPagePanel(false);
                haptic.success();
              }}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: Colors.font.base }}>Add New Page</Text>
            </TouchableOpacity>
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
    paddingHorizontal: 14, paddingBottom: 8, gap: 6,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  title: { fontSize: Colors.font.xl, fontWeight: '800', color: colors.text },
  strokeBadge: { backgroundColor: colors.primarySoft, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  strokeText: { fontSize: Colors.font.xs, fontWeight: '700', color: colors.primary },
  headerCenter: { flex: 1, alignItems: 'center' },
  pageLabel: { fontSize: Colors.font.sm, color: colors.textMuted, fontWeight: '500' },
  headerRight: { flexDirection: 'row', gap: 6, alignItems: 'center', flex: 1, justifyContent: 'flex-end' },
  headerBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.inputBg },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99 },
  saveBtnTxt: { fontSize: Colors.font.sm, fontWeight: '700' },
  canvasWrap: { flex: 1 },
  exitFull: {
    position: 'absolute', right: 16, zIndex: 100,
    backgroundColor: colors.surface + 'dd', borderRadius: 12, padding: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6,
  },
  toolbar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
    gap: 4, minHeight: 60,
  },
  tbLeft: { flexDirection: 'row', gap: 4, flex: 1 },
  tbCenter: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1.4, justifyContent: 'center' },
  tbRight: { flexDirection: 'row', gap: 4, flex: 1, justifyContent: 'flex-end' },
  tbBtn: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.inputBg },
  tbBtnActive: { backgroundColor: colors.primary },
  tbBtnDim: { opacity: 0.35 },
  activePenBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.inputBg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  colorDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2.5 },
  sizePanel: {
    padding: 16, borderTopWidth: 1, borderTopColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8,
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40,
    maxHeight: SCREEN_H * 0.82,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: Colors.font.xl, fontWeight: '800', marginBottom: 16 },
  toolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  toolGridBtn: {
    width: (SCREEN_W - 60) / 3, alignItems: 'center', padding: 12,
    borderRadius: 16, backgroundColor: colors.inputBg, gap: 5,
  },
  toolGridBtnActive: { backgroundColor: colors.primarySoft, borderWidth: 2, borderColor: colors.primary },
  toolGridIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  templateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  templateBtn: {
    width: (SCREEN_W - 64) / 3, padding: 12, borderRadius: 16,
    alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: 'transparent', position: 'relative',
  },
});
