import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, Pressable, Dimensions,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useDrawing } from '../context/DrawingContext';
import { useTheme } from '../context/ThemeContext';
import { PEN_TOOLS, PenToolType, DEFAULT_PEN_COLORS } from '../constants/penTools';
import { TEMPLATES } from '../constants/templates';
import { Colors } from '../constants/colors';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_W } = Dimensions.get('window');

interface PenToolbarProps {
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onClear?: () => void;
  onClose?: () => void;
}

export function PenToolbar({ onUndo, onRedo, canUndo, canRedo, onClear, onClose }: PenToolbarProps) {
  const { colors } = useTheme();
  const {
    activeTool, setActiveTool,
    penColor, setPenColor,
    penWidth, setPenWidth,
    penOpacity, setPenOpacity,
    showColorPicker, setShowColorPicker,
    showPenSettings, setShowPenSettings,
    selectedTemplate, setSelectedTemplate,
    undo, redo,
  } = useDrawing();

  const [showTemplates, setShowTemplates] = useState(false);
  const [showWidthSlider, setShowWidthSlider] = useState(false);
  const s = styles(colors);

  const handleToolPress = (toolId: PenToolType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTool(toolId);
  };

  const handleColorPress = (color: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPenColor(color);
    setShowColorPicker(false);
  };

  const mainTools = PEN_TOOLS.filter(t => t.id !== 'eraser');
  const eraserTool = PEN_TOOLS.find(t => t.id === 'eraser')!;

  return (
    <View style={s.container}>
      <View style={s.toolbar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.toolsScroll} contentContainerStyle={s.toolsContent}>
          {mainTools.map(tool => (
            <TouchableOpacity
              key={tool.id}
              style={[s.toolBtn, activeTool === tool.id && s.toolBtnActive]}
              onPress={() => handleToolPress(tool.id)}
            >
              <MaterialCommunityIcons
                name={tool.icon as any}
                size={22}
                color={activeTool === tool.id ? '#fff' : colors.text}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={s.rightControls}>
          <TouchableOpacity
            style={[s.colorBtn, { backgroundColor: penColor, borderColor: colors.border }]}
            onPress={() => setShowColorPicker(!showColorPicker)}
          />
          <TouchableOpacity
            style={[s.toolBtn, activeTool === 'eraser' && s.toolBtnActive]}
            onPress={() => handleToolPress('eraser')}
          >
            <MaterialCommunityIcons name="eraser" size={22} color={activeTool === 'eraser' ? '#fff' : colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={s.toolBtn} onPress={() => setShowWidthSlider(!showWidthSlider)}>
            <View style={[s.widthPreview, { height: Math.min(penWidth * 2, 12), backgroundColor: penColor }]} />
          </TouchableOpacity>
          <View style={s.divider} />
          <TouchableOpacity style={[s.toolBtn, !canUndo && s.disabled]} onPress={() => { Haptics.selectionAsync(); undo(); }}>
            <MaterialCommunityIcons name="undo" size={20} color={canUndo ? colors.text : colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.toolBtn, !canRedo && s.disabled]} onPress={() => { Haptics.selectionAsync(); redo(); }}>
            <MaterialCommunityIcons name="redo" size={20} color={canRedo ? colors.text : colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={s.toolBtn} onPress={() => setShowTemplates(true)}>
            <MaterialCommunityIcons name="layers-outline" size={20} color={colors.text} />
          </TouchableOpacity>
          {onClear && (
            <TouchableOpacity style={s.toolBtn} onPress={onClear}>
              <MaterialCommunityIcons name="delete-sweep-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          )}
          {onClose && (
            <TouchableOpacity style={s.toolBtn} onPress={onClose}>
              <MaterialCommunityIcons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showWidthSlider && (
        <View style={s.sliderPanel}>
          <Text style={s.sliderLabel}>Size: {penWidth.toFixed(1)}px</Text>
          <View style={s.widthButtons}>
            {[1, 2, 3, 5, 8, 12, 18, 24].map(w => (
              <TouchableOpacity
                key={w}
                style={[s.widthBtn, penWidth === w && s.widthBtnActive]}
                onPress={() => { setPenWidth(w); Haptics.selectionAsync(); }}
              >
                <View style={[s.widthDot, { width: Math.min(w * 2, 24), height: Math.min(w * 2, 24), backgroundColor: penColor }]} />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.sliderLabel}>Opacity: {Math.round(penOpacity * 100)}%</Text>
          <View style={s.widthButtons}>
            {[0.2, 0.4, 0.6, 0.8, 1.0].map(o => (
              <TouchableOpacity
                key={o}
                style={[s.widthBtn, penOpacity === o && s.widthBtnActive]}
                onPress={() => { setPenOpacity(o); Haptics.selectionAsync(); }}
              >
                <View style={[s.opacityDot, { backgroundColor: penColor, opacity: o }]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {showColorPicker && (
        <View style={s.colorPanel}>
          <Text style={s.panelTitle}>Pen Color</Text>
          <View style={s.colorGrid}>
            {DEFAULT_PEN_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[s.colorSwatch, { backgroundColor: c }, penColor === c && s.colorSwatchActive]}
                onPress={() => handleColorPress(c)}
              />
            ))}
          </View>
        </View>
      )}

      <Modal visible={showTemplates} transparent animationType="slide">
        <Pressable style={s.modalOverlay} onPress={() => setShowTemplates(false)}>
          <View style={[s.templatesSheet, { backgroundColor: colors.surface }]}>
            <Text style={[s.sheetTitle, { color: colors.text }]}>Page Template</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.templatesRow}>
              {TEMPLATES.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[s.templateBtn, selectedTemplate === t.id && s.templateBtnActive, { borderColor: t.color }]}
                  onPress={() => { setSelectedTemplate(t.id); setShowTemplates(false); Haptics.selectionAsync(); }}
                >
                  <MaterialCommunityIcons name={t.icon as any} size={28} color={t.color} />
                  <Text style={[s.templateName, { color: colors.text }]}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = (colors: typeof Colors.light) => StyleSheet.create({
  container: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    minHeight: 58,
  },
  toolsScroll: { flex: 1 },
  toolsContent: { gap: 4, paddingRight: 8 },
  toolBtn: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  toolBtnActive: { backgroundColor: colors.primary },
  rightControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  colorBtn: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, marginHorizontal: 2,
  },
  widthPreview: { width: 28, borderRadius: 8, minHeight: 3 },
  divider: { width: 1, height: 24, backgroundColor: colors.border, marginHorizontal: 4 },
  disabled: { opacity: 0.4 },
  sliderPanel: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  sliderLabel: { fontSize: Colors.font.sm, color: colors.textSecondary, marginBottom: 10, fontWeight: '500' },
  widthButtons: { flexDirection: 'row', gap: 10, marginBottom: 16, alignItems: 'center' },
  widthBtn: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.inputBg },
  widthBtnActive: { backgroundColor: colors.primarySoft, borderWidth: 2, borderColor: colors.primary },
  widthDot: { borderRadius: 12 },
  opacityDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.text },
  colorPanel: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
  panelTitle: { fontSize: Colors.font.sm, fontWeight: '600', color: colors.text, marginBottom: 12 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorSwatch: { width: 36, height: 36, borderRadius: 18 },
  colorSwatchActive: { borderWidth: 3, borderColor: colors.primary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  templatesSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  sheetTitle: { fontSize: Colors.font.lg, fontWeight: '700', marginBottom: 16 },
  templatesRow: { gap: 12, paddingBottom: 4 },
  templateBtn: {
    width: 90, height: 90, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
    backgroundColor: Colors.light.inputBg, gap: 6,
  },
  templateBtnActive: { borderWidth: 2 },
  templateName: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
});
