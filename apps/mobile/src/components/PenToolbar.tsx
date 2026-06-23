/**
 * PenToolbar — GoodNotes 6 / Procreate quality drawing toolbar
 *
 * Features:
 *  - Category tabs: Pens | Brushes | Effects | Shapes | Erase
 *  - HSL color picker: hue rail + saturation + lightness grids
 *  - 4 palette modes: Standard | Neon | Extended | Custom HSL
 *  - Recent colors (last 16 used)
 *  - Hex color input
 *  - Smooth width presets with visual dot preview
 *  - Opacity presets
 *  - Template picker (full library)
 *  - Undo / Redo / Clear / Close
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Modal,
  Pressable, TextInput, Dimensions, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDrawing } from '../context/DrawingContext';
import { useTheme } from '../context/ThemeContext';
import {
  PEN_TOOLS, PenToolType, PenTool,
  COLOR_PALETTES, ColorPaletteId,
  DEFAULT_PEN_COLORS, NEON_COLORS, EXTENDED_COLORS,
} from '../constants/penTools';
import { TEMPLATES } from '../constants/templates';
import { haptic } from '../utils/haptics';

const { width: SW } = Dimensions.get('window');
const IS_NARROW = SW < 400;

// ─── HSL helpers ──────────────────────────────────────────────────────────────

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)));
  };
  return '#' + [f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, '0')).join('');
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function isValidHex(s: string) { return /^#[0-9a-fA-F]{6}$/.test(s); }

// ─── Tool category config ──────────────────────────────────────────────────────

type ToolCategory = 'pen' | 'brush' | 'effect' | 'shape' | 'erase';

const CATEGORY_TABS: { id: ToolCategory; label: string; icon: string }[] = [
  { id: 'pen',    label: 'Pens',    icon: 'pen' },
  { id: 'brush',  label: 'Brushes', icon: 'brush' },
  { id: 'effect', label: 'Effects', icon: 'lightning-bolt' },
  { id: 'shape',  label: 'Shapes',  icon: 'shape-outline' },
  { id: 'erase',  label: 'Erase',   icon: 'eraser' },
];

const SHAPE_TOOLS: PenTool[] = PEN_TOOLS.filter(t =>
  t.id === 'line-shape' || t.id === 'circle-shape' || t.id === 'rect-shape' || t.id === 'arrow-shape'
);

function getToolsForCategory(cat: ToolCategory): PenTool[] {
  if (cat === 'erase') return PEN_TOOLS.filter(t => t.id === 'eraser');
  if (cat === 'shape') return SHAPE_TOOLS;
  return PEN_TOOLS.filter(t => t.category === cat && !t.id.includes('-shape'));
}

// ─── Width / Opacity presets ──────────────────────────────────────────────────

const WIDTH_PRESETS = [0.5, 1, 2, 3, 5, 7, 10, 14, 20, 28, 40];
const OPACITY_STEPS = [0.10, 0.20, 0.35, 0.50, 0.65, 0.80, 0.90, 1.00];

// ─── Hue rail (36 steps at 10° each) ─────────────────────────────────────────

const HUE_RAIL = Array.from({ length: 36 }, (_, i) => i * 10);
const SAT_STEPS = [100, 80, 60, 40, 20, 0];
const LIT_STEPS = [90, 75, 60, 45, 30, 15];

// ─── Component ────────────────────────────────────────────────────────────────

interface PenToolbarProps {
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onClear?: () => void;
  onClose?: () => void;
}

const MAX_RECENT = 16;

export function PenToolbar({ onUndo, onRedo, canUndo, canRedo, onClear, onClose }: PenToolbarProps) {
  const { colors, isDark } = useTheme();
  const {
    activeTool, setActiveTool,
    penColor, setPenColor,
    penWidth, setPenWidth,
    penOpacity, setPenOpacity,
    showColorPicker, setShowColorPicker,
    selectedTemplate, setSelectedTemplate,
    undo, redo,
    isErasing,
  } = useDrawing();

  const [toolCategory, setToolCategory] = useState<ToolCategory>('pen');
  const [showWidthPanel, setShowWidthPanel] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [activePalette, setActivePalette] = useState<ColorPaletteId | 'custom'>('standard');
  const [recentColors, setRecentColors] = useState<string[]>(DEFAULT_PEN_COLORS.slice(0, 8));
  const [hexInput, setHexInput] = useState(penColor);
  const [hslState, setHslState] = useState<[number, number, number]>(() => hexToHsl(penColor));
  const hexRef = useRef<TextInput>(null);

  const [hue, sat, lit] = hslState;

  const applyColor = useCallback((color: string) => {
    setPenColor(color);
    setHexInput(color);
    if (isValidHex(color)) setHslState(hexToHsl(color));
    haptic.light();
    setRecentColors(prev => {
      const next = [color, ...prev.filter(c => c !== color)].slice(0, MAX_RECENT);
      return next;
    });
  }, [setPenColor]);

  const applyHsl = useCallback((h: number, s: number, l: number) => {
    setHslState([h, s, l]);
    const hex = hslToHex(h, s, l);
    applyColor(hex);
  }, [applyColor]);

  const paletteColors: Record<ColorPaletteId, string[]> = useMemo(() => ({
    standard: DEFAULT_PEN_COLORS,
    neon: NEON_COLORS,
    extended: EXTENDED_COLORS,
  }), []);

  const toolsForCat = useMemo(() => getToolsForCategory(toolCategory), [toolCategory]);

  const handleToolPress = useCallback((tool: PenTool) => {
    haptic.select();
    setActiveTool(tool.id as PenToolType);
  }, [setActiveTool]);

  const isToolActive = useCallback((tool: PenTool) => {
    if (tool.id === 'eraser') return isErasing;
    return !isErasing && activeTool === tool.id;
  }, [isErasing, activeTool]);

  const PANEL_BG = isDark ? '#1a1d2e' : '#f8f9ff';
  const ITEM_BG = isDark ? '#252838' : '#ffffff';
  const SELECTED_BG = colors.primary + '22';

  // ─── Rendered sections ───────────────────────────────────────────────────────

  const renderCategoryTabs = () => (
    <View style={{ flexDirection: 'row', paddingHorizontal: 10, paddingTop: 10, paddingBottom: 6, gap: 4 }}>
      {CATEGORY_TABS.map(cat => {
        const active = toolCategory === cat.id;
        return (
          <TouchableOpacity
            key={cat.id}
            style={{
              flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 10,
              backgroundColor: active ? colors.primary : ITEM_BG,
              borderWidth: 1,
              borderColor: active ? colors.primary : colors.border,
              gap: 2,
            }}
            onPress={() => { haptic.select(); setToolCategory(cat.id); }}
          >
            <MaterialCommunityIcons
              name={cat.icon as any}
              size={IS_NARROW ? 14 : 16}
              color={active ? '#fff' : colors.textSecondary}
            />
            <Text style={{ fontSize: 9, fontWeight: '800', color: active ? '#fff' : colors.textSecondary, letterSpacing: 0.2 }}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderTools = () => (
    <View style={{ paddingHorizontal: 10, paddingBottom: 6 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
        {toolsForCat.map(tool => {
          const active = isToolActive(tool);
          return (
            <TouchableOpacity
              key={tool.id}
              style={{
                alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10,
                borderRadius: 12, gap: 4, minWidth: 60,
                backgroundColor: active ? SELECTED_BG : ITEM_BG,
                borderWidth: 1.5,
                borderColor: active ? colors.primary : colors.border,
              }}
              onPress={() => handleToolPress(tool)}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
                backgroundColor: active ? colors.primary : colors.inputBg,
              }}>
                <MaterialCommunityIcons
                  name={tool.icon as any}
                  size={20}
                  color={active ? '#fff' : colors.text}
                />
              </View>
              <Text style={{
                fontSize: 9, fontWeight: '800', color: active ? colors.primary : colors.textSecondary,
                textAlign: 'center', maxWidth: 56,
              }} numberOfLines={2}>
                {tool.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderQuickBar = () => (
    <View style={{
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingBottom: 8,
      gap: 4, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8,
    }}>
      {/* Current color swatch */}
      <TouchableOpacity
        style={{
          width: 38, height: 38, borderRadius: 10,
          backgroundColor: penColor,
          borderWidth: 2.5, borderColor: colors.border,
          alignItems: 'center', justifyContent: 'center',
          shadowColor: penColor, shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.5, shadowRadius: 6, elevation: 4,
        }}
        onPress={() => { setShowColorPicker(v => !v); if (showWidthPanel) setShowWidthPanel(false); haptic.light(); }}
      >
        {showColorPicker && (
          <MaterialCommunityIcons name="check" size={16} color={
            parseInt(penColor.slice(1), 16) > 0x888888 ? '#000' : '#fff'
          } />
        )}
      </TouchableOpacity>

      {/* Recent colors mini row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ gap: 5, alignItems: 'center' }}>
        {recentColors.slice(0, 10).map((c, i) => (
          <TouchableOpacity
            key={`${c}-${i}`}
            style={{
              width: penColor === c ? 30 : 26, height: penColor === c ? 30 : 26,
              borderRadius: 15, backgroundColor: c,
              borderWidth: penColor === c ? 2.5 : 1,
              borderColor: penColor === c ? colors.text : colors.border + '80',
              shadowColor: c, shadowOffset: { width: 0, height: 1 },
              shadowOpacity: penColor === c ? 0.5 : 0, shadowRadius: 4, elevation: penColor === c ? 3 : 0,
            }}
            onPress={() => applyColor(c)}
          />
        ))}
      </ScrollView>

      {/* Separator */}
      <View style={{ width: 1, height: 28, backgroundColor: colors.border, marginHorizontal: 2 }} />

      {/* Width toggle */}
      <TouchableOpacity
        style={{
          width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
          backgroundColor: showWidthPanel ? SELECTED_BG : 'transparent',
          borderWidth: showWidthPanel ? 1.5 : 0, borderColor: colors.primary,
        }}
        onPress={() => { setShowWidthPanel(v => !v); if (showColorPicker) setShowColorPicker(false); haptic.light(); }}
      >
        <View style={{
          width: Math.min(penWidth * 1.5, 22), height: Math.min(penWidth * 1.5, 22),
          borderRadius: 12, backgroundColor: penColor,
          minWidth: 4, minHeight: 4,
        }} />
      </TouchableOpacity>

      {/* Undo */}
      <TouchableOpacity
        style={{ width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center', opacity: canUndo ? 1 : 0.3 }}
        onPress={() => { if (canUndo) { haptic.select(); undo(); } }}
        disabled={!canUndo}
      >
        <MaterialCommunityIcons name="undo" size={20} color={colors.text} />
      </TouchableOpacity>

      {/* Redo */}
      <TouchableOpacity
        style={{ width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center', opacity: canRedo ? 1 : 0.3 }}
        onPress={() => { if (canRedo) { haptic.select(); redo(); } }}
        disabled={!canRedo}
      >
        <MaterialCommunityIcons name="redo" size={20} color={colors.text} />
      </TouchableOpacity>

      {/* Templates */}
      <TouchableOpacity
        style={{ width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }}
        onPress={() => { setShowTemplates(true); haptic.light(); }}
      >
        <MaterialCommunityIcons name="layers-outline" size={20} color={colors.text} />
      </TouchableOpacity>

      {/* Clear */}
      {onClear && (
        <TouchableOpacity
          style={{ width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }}
          onPress={onClear}
        >
          <MaterialCommunityIcons name="delete-sweep-outline" size={20} color={colors.error} />
        </TouchableOpacity>
      )}

      {/* Close */}
      {onClose && (
        <TouchableOpacity
          style={{ width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }}
          onPress={onClose}
        >
          <MaterialCommunityIcons name="chevron-down" size={22} color={colors.text} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderColorPicker = () => {
    if (!showColorPicker) return null;
    return (
      <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
        {/* Palette mode tabs */}
        <View style={{ flexDirection: 'row', gap: 6, padding: 10, paddingBottom: 6 }}>
          {(['standard', 'neon', 'extended', 'custom'] as const).map(pal => (
            <TouchableOpacity
              key={pal}
              style={{
                flex: 1, paddingVertical: 6, borderRadius: 9,
                alignItems: 'center',
                backgroundColor: activePalette === pal ? colors.primarySoft : ITEM_BG,
                borderWidth: 1,
                borderColor: activePalette === pal ? colors.primary : colors.border,
              }}
              onPress={() => { setActivePalette(pal); haptic.select(); }}
            >
              <Text style={{
                fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.3,
                color: activePalette === pal ? colors.primary : colors.textSecondary,
              }}>
                {pal === 'custom' ? 'HSL' : pal}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Swatches */}
        {activePalette !== 'custom' && (
          <ScrollView style={{ maxHeight: 130 }} contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 8 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
              {paletteColors[activePalette as ColorPaletteId].map((c, i) => (
                <TouchableOpacity
                  key={`${c}-${i}`}
                  style={{
                    width: 32, height: 32, borderRadius: 16,
                    backgroundColor: c,
                    borderWidth: penColor === c ? 3 : 1,
                    borderColor: penColor === c ? colors.text : colors.border + '60',
                    shadowColor: c, shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: penColor === c ? 0.55 : 0, shadowRadius: 5,
                    elevation: penColor === c ? 4 : 0,
                  }}
                  onPress={() => applyColor(c)}
                />
              ))}
            </View>
          </ScrollView>
        )}

        {/* HSL color picker */}
        {activePalette === 'custom' && (
          <View style={{ paddingHorizontal: 10, paddingBottom: 10, gap: 8 }}>
            {/* Hue rail */}
            <View>
              <Text style={{ fontSize: 9, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>
                Hue
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
                {HUE_RAIL.map(h => {
                  const swatch = hslToHex(h, 100, 50);
                  const sel = Math.abs(hue - h) < 8;
                  return (
                    <TouchableOpacity
                      key={h}
                      style={{
                        width: sel ? 32 : 26, height: sel ? 32 : 26,
                        borderRadius: 16, backgroundColor: swatch,
                        borderWidth: sel ? 3 : 1,
                        borderColor: sel ? colors.text : 'transparent',
                        marginTop: sel ? 0 : 3,
                      }}
                      onPress={() => { haptic.select(); applyHsl(h, sat, lit); }}
                    />
                  );
                })}
              </ScrollView>
            </View>

            {/* Saturation row */}
            <View>
              <Text style={{ fontSize: 9, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>
                Saturation
              </Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {SAT_STEPS.map(s => {
                  const swatch = hslToHex(hue, s, lit);
                  const sel = Math.abs(sat - s) < 12;
                  return (
                    <TouchableOpacity
                      key={s}
                      style={{
                        flex: 1, height: 30, borderRadius: 8, backgroundColor: swatch,
                        borderWidth: sel ? 2.5 : 1, borderColor: sel ? colors.text : 'transparent',
                        alignItems: 'center', justifyContent: 'center',
                      }}
                      onPress={() => { haptic.select(); applyHsl(hue, s, lit); }}
                    >
                      {sel && <MaterialCommunityIcons name="check" size={12} color={s < 60 ? '#000' : '#fff'} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Lightness row */}
            <View>
              <Text style={{ fontSize: 9, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>
                Lightness
              </Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {LIT_STEPS.map(l => {
                  const swatch = hslToHex(hue, sat, l);
                  const sel = Math.abs(lit - l) < 12;
                  return (
                    <TouchableOpacity
                      key={l}
                      style={{
                        flex: 1, height: 30, borderRadius: 8, backgroundColor: swatch,
                        borderWidth: sel ? 2.5 : 1, borderColor: sel ? colors.text : 'transparent',
                        alignItems: 'center', justifyContent: 'center',
                      }}
                      onPress={() => { haptic.select(); applyHsl(hue, sat, l); }}
                    >
                      {sel && <MaterialCommunityIcons name="check" size={12} color={l > 50 ? '#000' : '#fff'} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Hex input + preview */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{
                width: 36, height: 36, borderRadius: 10, backgroundColor: penColor,
                borderWidth: 2, borderColor: colors.border,
                shadowColor: penColor, shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.4, shadowRadius: 6, elevation: 3,
              }} />
              <View style={{
                flex: 1, height: 38, borderRadius: 10,
                backgroundColor: ITEM_BG, borderWidth: 1, borderColor: colors.border,
                paddingHorizontal: 12, justifyContent: 'center',
              }}>
                <TextInput
                  ref={hexRef}
                  value={hexInput}
                  onChangeText={v => {
                    setHexInput(v);
                    if (isValidHex(v)) applyColor(v);
                  }}
                  placeholder="#000000"
                  placeholderTextColor={colors.textMuted}
                  style={{ fontSize: 13, fontWeight: '700', color: colors.text, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={7}
                />
              </View>
              {/* Black / White / Transparent shortcuts */}
              {['#000000', '#ffffff', '#ff000000'].map(c => (
                <TouchableOpacity
                  key={c}
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    backgroundColor: c === '#ff000000' ? 'transparent' : c,
                    borderWidth: 1.5, borderColor: colors.border,
                    borderStyle: c === '#ff000000' ? 'dashed' : 'solid',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                  onPress={() => applyColor(c === '#ff000000' ? '#ffffff00' : c)}
                >
                  {c === '#ff000000' && <MaterialCommunityIcons name="slash-forward" size={16} color={colors.textMuted} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderWidthPanel = () => {
    if (!showWidthPanel) return null;
    return (
      <View style={{ borderTopWidth: 1, borderTopColor: colors.border, padding: 10, gap: 8 }}>
        {/* Width presets */}
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Size — {penWidth}px
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, alignItems: 'flex-end', paddingBottom: 4 }}>
            {WIDTH_PRESETS.map(w => {
              const sel = penWidth === w;
              const dotSz = Math.min(Math.max(w * 1.8, 5), 36);
              return (
                <TouchableOpacity
                  key={w}
                  style={{
                    width: 44, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'flex-end',
                    paddingBottom: 6, gap: 3,
                    backgroundColor: sel ? SELECTED_BG : ITEM_BG,
                    borderWidth: sel ? 2 : 1, borderColor: sel ? colors.primary : colors.border,
                  }}
                  onPress={() => { setPenWidth(w); haptic.select(); }}
                >
                  <View style={{
                    width: dotSz, height: dotSz, borderRadius: dotSz / 2,
                    backgroundColor: penColor,
                    shadowColor: penColor, shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.4, shadowRadius: 3, elevation: 2,
                  }} />
                  <Text style={{ fontSize: 8, fontWeight: '700', color: sel ? colors.primary : colors.textMuted }}>
                    {w}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Opacity presets */}
        <View>
          <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
            Opacity — {Math.round(penOpacity * 100)}%
          </Text>
          <View style={{ flexDirection: 'row', gap: 5 }}>
            {OPACITY_STEPS.map(o => {
              const sel = Math.abs(penOpacity - o) < 0.01;
              return (
                <TouchableOpacity
                  key={o}
                  style={{
                    flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: sel ? SELECTED_BG : ITEM_BG,
                    borderWidth: sel ? 2 : 1, borderColor: sel ? colors.primary : colors.border,
                    gap: 2,
                  }}
                  onPress={() => { setPenOpacity(o); haptic.select(); }}
                >
                  <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: penColor, opacity: o }} />
                  <Text style={{ fontSize: 8, fontWeight: '700', color: sel ? colors.primary : colors.textMuted }}>
                    {Math.round(o * 100)}%
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ backgroundColor: PANEL_BG, borderTopWidth: 1, borderTopColor: colors.border }}>
      {renderCategoryTabs()}
      {renderTools()}
      {renderQuickBar()}
      {renderColorPicker()}
      {renderWidthPanel()}

      {/* Template picker modal */}
      <Modal visible={showTemplates} transparent animationType="slide">
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}
          onPress={() => setShowTemplates(false)}
        >
          <Pressable style={{ backgroundColor: colors.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingBottom: 36 }}>
            <View style={{ width: 44, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginVertical: 14 }} />
            <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text, marginBottom: 4, paddingHorizontal: 20 }}>
              Page Template
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 14, paddingHorizontal: 20 }}>
              Choose a background for your canvas
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16 }}>
                {TEMPLATES.map(t => {
                  const sel = selectedTemplate === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={{
                        width: (SW - 56) / 4, height: 96, borderRadius: 14,
                        alignItems: 'center', justifyContent: 'center', gap: 5, padding: 6,
                        backgroundColor: sel ? t.color + '22' : colors.inputBg,
                        borderWidth: sel ? 2.5 : 1,
                        borderColor: sel ? t.color : colors.border,
                      }}
                      onPress={() => { setSelectedTemplate(t.id); setShowTemplates(false); haptic.select(); }}
                    >
                      <MaterialCommunityIcons name={t.icon as any} size={28} color={t.color} />
                      <Text style={{
                        fontSize: 9, fontWeight: '800', textAlign: 'center', color: sel ? t.color : colors.text,
                        lineHeight: 12,
                      }} numberOfLines={2}>
                        {t.name}
                      </Text>
                      {sel && (
                        <View style={{
                          position: 'absolute', top: 5, right: 5, width: 16, height: 16,
                          borderRadius: 8, backgroundColor: t.color, alignItems: 'center', justifyContent: 'center',
                        }}>
                          <MaterialCommunityIcons name="check" size={10} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
