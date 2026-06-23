import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Modal, Pressable, Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDrawing } from '../context/DrawingContext';
import { useTheme } from '../context/ThemeContext';
import {
  PEN_TOOLS, PenToolType, COLOR_PALETTES, ColorPaletteId,
  DEFAULT_PEN_COLORS, NEON_COLORS, EXTENDED_COLORS,
} from '../constants/penTools';
import { TEMPLATES } from '../constants/templates';
import { Colors, ThemeColors } from '../constants/colors';
import { haptic } from '../utils/haptics';

const { width: SW } = Dimensions.get('window');

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
    selectedTemplate, setSelectedTemplate,
    undo, redo,
  } = useDrawing();

  const [showTemplates, setShowTemplates] = useState(false);
  const [showWidthPanel, setShowWidthPanel] = useState(false);
  const [activePalette, setActivePalette] = useState<ColorPaletteId>('standard');

  const mainTools = PEN_TOOLS.filter(t => t.id !== 'eraser');

  const paletteColors: Record<ColorPaletteId, string[]> = {
    standard: DEFAULT_PEN_COLORS,
    neon: NEON_COLORS,
    extended: EXTENDED_COLORS,
  };

  const WIDTH_PRESETS = [1, 2, 3, 5, 8, 12, 18, 24, 36];
  const OPACITY_PRESETS = [0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <View style={{ backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 8, minHeight: 60 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ gap: 4, paddingRight: 8 }}>
          {mainTools.map(tool => (
            <TouchableOpacity
              key={tool.id}
              style={[{
                width: 40, height: 40, borderRadius: 10,
                alignItems: 'center', justifyContent: 'center',
              }, activeTool === tool.id && { backgroundColor: colors.primary }]}
              onPress={() => { haptic.light(); setActiveTool(tool.id); }}
            >
              <MaterialCommunityIcons
                name={tool.icon as any}
                size={22}
                color={activeTool === tool.id ? '#fff' : colors.text}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TouchableOpacity
            style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: penColor, borderWidth: 2.5, borderColor: colors.border }}
            onPress={() => { setShowColorPicker(!showColorPicker); if (showWidthPanel) setShowWidthPanel(false); haptic.light(); }}
          />
          <TouchableOpacity
            style={[{ width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
              activeTool === 'eraser' && { backgroundColor: colors.primary }]}
            onPress={() => { haptic.light(); setActiveTool('eraser'); }}
          >
            <MaterialCommunityIcons name="eraser" size={22} color={activeTool === 'eraser' ? '#fff' : colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={{ width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: showWidthPanel ? colors.primarySoft : 'transparent' }}
            onPress={() => { setShowWidthPanel(!showWidthPanel); if (showColorPicker) setShowColorPicker(false); haptic.light(); }}
          >
            <View style={{ width: 24, alignItems: 'center', justifyContent: 'center', height: 24 }}>
              <View style={{ width: Math.min(penWidth * 2.5, 22), height: Math.min(penWidth * 2.5, 22), borderRadius: 12, backgroundColor: penColor }} />
            </View>
          </TouchableOpacity>
          <View style={{ width: 1, height: 24, backgroundColor: colors.border, marginHorizontal: 2 }} />
          <TouchableOpacity
            style={[{ width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, !canUndo && { opacity: 0.35 }]}
            onPress={() => { haptic.select(); undo(); }}
            disabled={!canUndo}
          >
            <MaterialCommunityIcons name="undo" size={19} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[{ width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, !canRedo && { opacity: 0.35 }]}
            onPress={() => { haptic.select(); redo(); }}
            disabled={!canRedo}
          >
            <MaterialCommunityIcons name="redo" size={19} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={{ width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }}
            onPress={() => setShowTemplates(true)}
          >
            <MaterialCommunityIcons name="layers-outline" size={19} color={colors.text} />
          </TouchableOpacity>
          {onClear && (
            <TouchableOpacity
              style={{ width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }}
              onPress={onClear}
            >
              <MaterialCommunityIcons name="delete-sweep-outline" size={19} color={colors.error} />
            </TouchableOpacity>
          )}
          {onClose && (
            <TouchableOpacity
              style={{ width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }}
              onPress={onClose}
            >
              <MaterialCommunityIcons name="close" size={19} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showWidthPanel && (
        <View style={{ padding: 14, borderTopWidth: 1, borderTopColor: colors.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: Colors.font.sm, fontWeight: '700', color: colors.textSecondary }}>
              Size: {penWidth}px
            </Text>
            <Text style={{ fontSize: Colors.font.sm, fontWeight: '700', color: colors.textSecondary }}>
              Opacity: {Math.round(penOpacity * 100)}%
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'center' }}>
            {WIDTH_PRESETS.map(w => (
              <TouchableOpacity
                key={w}
                style={[{
                  width: 38, height: 38, borderRadius: 10,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: colors.inputBg,
                }, penWidth === w && { backgroundColor: colors.primarySoft, borderWidth: 2, borderColor: colors.primary }]}
                onPress={() => { setPenWidth(w); haptic.select(); }}
              >
                <View style={{ width: Math.min(w * 2.2, 26), height: Math.min(w * 2.2, 26), borderRadius: 14, backgroundColor: penColor }} />
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {OPACITY_PRESETS.map(o => (
              <TouchableOpacity
                key={o}
                style={[{
                  flex: 1, height: 36, borderRadius: 8,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: colors.inputBg,
                }, penOpacity === o && { borderWidth: 2, borderColor: colors.primary }]}
                onPress={() => { setPenOpacity(o); haptic.select(); }}
              >
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: penColor, opacity: o }} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {showColorPicker && (
        <View style={{ padding: 14, borderTopWidth: 1, borderTopColor: colors.border }}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {COLOR_PALETTES.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[{
                  flex: 1, paddingVertical: 7, borderRadius: 10,
                  alignItems: 'center',
                  backgroundColor: activePalette === p.id ? colors.primarySoft : colors.inputBg,
                }, activePalette === p.id && { borderWidth: 1, borderColor: colors.primary }]}
                onPress={() => { setActivePalette(p.id as ColorPaletteId); haptic.select(); }}
              >
                <Text style={{
                  fontSize: Colors.font.xs, fontWeight: '800',
                  color: activePalette === p.id ? colors.primary : colors.textSecondary,
                }}>
                  {p.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {paletteColors[activePalette].map(c => (
              <TouchableOpacity
                key={c}
                style={[{
                  width: 34, height: 34, borderRadius: 17,
                  backgroundColor: c,
                }, penColor === c && {
                  borderWidth: 3,
                  borderColor: colors.text,
                  shadowColor: c,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.5,
                  shadowRadius: 4,
                  elevation: 4,
                }]}
                onPress={() => { setPenColor(c); haptic.light(); }}
              />
            ))}
          </View>
        </View>
      )}

      <Modal visible={showTemplates} transparent animationType="slide">
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          onPress={() => setShowTemplates(false)}
        >
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 }} />
            <Text style={{ fontSize: Colors.font.lg, fontWeight: '800', color: colors.text, marginBottom: 16 }}>
              Page Template
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {TEMPLATES.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={{
                      width: (SW - 56) / 4,
                      height: 90, borderRadius: 14,
                      alignItems: 'center', justifyContent: 'center',
                      backgroundColor: selectedTemplate === t.id ? t.color + '20' : colors.inputBg,
                      borderWidth: selectedTemplate === t.id ? 2 : 1,
                      borderColor: selectedTemplate === t.id ? t.color : colors.border,
                      gap: 6, padding: 6,
                    }}
                    onPress={() => { setSelectedTemplate(t.id); setShowTemplates(false); haptic.select(); }}
                  >
                    <MaterialCommunityIcons name={t.icon as any} size={24} color={t.color} />
                    <Text style={{ fontSize: 9, fontWeight: '700', textAlign: 'center', color: colors.text }} numberOfLines={2}>
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
