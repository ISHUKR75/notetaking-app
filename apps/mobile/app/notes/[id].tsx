import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  Alert, Dimensions, Modal, Pressable, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { haptic } from '../../src/utils/haptics';
import { useTheme } from '../../src/context/ThemeContext';
import { useNotes, PAGE_BACKGROUNDS, PageBackground } from '../../src/context/NotesContext';
import { useDrawing } from '../../src/context/DrawingContext';
import { DrawingCanvas } from '../../src/components/DrawingCanvas';
import { PenToolbar } from '../../src/components/PenToolbar';
import { Colors } from '../../src/constants/colors';
import { Storage, STORAGE_KEYS } from '../../src/utils/storage';
import { formatFullDate, formatTime, formatRelativeDate } from '../../src/utils/dateUtils';
import { NOTE_COLORS, getNoteColorHex } from '../../src/utils/noteUtils';
import { Stroke } from '../../src/context/DrawingContext';
import { shareNote, exportNoteAsMarkdown, exportNoteAsText, exportNoteAsHTML, exportNotesToJSON } from '../../src/utils/exportImport';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type ViewMode = 'edit' | 'preview' | 'draw';
type FormatCategory = 'text' | 'insert' | 'list' | 'callout' | 'style';

type SlashCommand = {
  id: string; label: string; icon: string; desc: string; keywords: string[];
  action: string | (() => void);
};

const SLASH_COMMANDS: SlashCommand[] = [
  { id: 'h1',        label: 'Heading 1',       icon: 'format-header-1',         desc: 'Large section heading',       keywords: ['h1','heading','title','big'],     action: '# ' },
  { id: 'h2',        label: 'Heading 2',       icon: 'format-header-2',         desc: 'Medium section heading',      keywords: ['h2','heading','subtitle'],        action: '## ' },
  { id: 'h3',        label: 'Heading 3',       icon: 'format-header-3',         desc: 'Small section heading',       keywords: ['h3','heading','sub'],             action: '### ' },
  { id: 'bullet',    label: 'Bullet List',     icon: 'format-list-bulleted',    desc: 'Simple bullet list',          keywords: ['bullet','list','ul'],             action: '- ' },
  { id: 'numbered',  label: 'Numbered List',   icon: 'format-list-numbered',    desc: 'Ordered numbered list',       keywords: ['numbered','ordered','ol','1'],    action: '1. ' },
  { id: 'todo',      label: 'Todo / Task',     icon: 'checkbox-blank-outline',  desc: 'Trackable checkbox task',     keywords: ['todo','task','check','checkbox'], action: '- [ ] ' },
  { id: 'quote',     label: 'Quote',           icon: 'format-quote-open',       desc: 'Capture a quote or excerpt',  keywords: ['quote','blockquote','bq'],        action: '> ' },
  { id: 'divider',   label: 'Divider',         icon: 'minus',                   desc: 'Horizontal rule divider',     keywords: ['divider','hr','line','rule'],     action: '---\n' },
  { id: 'table',     label: 'Table',           icon: 'table',                   desc: '3-column table',              keywords: ['table','grid','col','row'],       action: '| Col 1 | Col 2 | Col 3 |\n|-------|-------|-------|\n|       |       |       |\n' },
  { id: 'code',      label: 'Code Block',      icon: 'code-block',              desc: 'Monospace code with syntax',  keywords: ['code','codeblock','pre','js'],    action: '```javascript\n// code here\n```\n' },
  { id: 'tip',       label: 'Tip Callout',     icon: 'lightbulb-outline',       desc: '💡 Highlighted tip',          keywords: ['tip','callout','lightbulb'],      action: '> 💡 ' },
  { id: 'warning',   label: 'Warning',         icon: 'alert-outline',           desc: '⚠️ Warning callout',         keywords: ['warning','alert','caution'],      action: '> ⚠️ ' },
  { id: 'info',      label: 'Info',            icon: 'information-outline',     desc: 'ℹ️ Info callout box',         keywords: ['info','information','note'],      action: '> ℹ️ ' },
  { id: 'success',   label: 'Success',         icon: 'check-circle-outline',    desc: '✅ Success callout',          keywords: ['success','done','check','ok'],    action: '> ✅ ' },
  { id: 'error',     label: 'Error / Danger',  icon: 'close-circle-outline',    desc: '❌ Error or danger',          keywords: ['error','danger','fail'],          action: '> ❌ ' },
  { id: 'important', label: 'Important',       icon: 'fire',                    desc: '🔥 Important callout',        keywords: ['important','fire','hot'],         action: '> 🔥 ' },
  { id: 'math',      label: 'Math Block',      icon: 'function-variant',        desc: 'LaTeX math equation',         keywords: ['math','latex','equation','$$'],   action: '$$\n\n$$\n' },
  { id: 'image',     label: 'Image',           icon: 'image-outline',           desc: 'Embed an image by URL',       keywords: ['image','img','photo','picture'],  action: '![alt text](https://)\n' },
  { id: 'bold',      label: 'Bold Text',       icon: 'format-bold',             desc: '**Bold** inline text',        keywords: ['bold','strong','b'],              action: '**bold**' },
  { id: 'italic',    label: 'Italic Text',     icon: 'format-italic',           desc: '*Italic* inline text',        keywords: ['italic','em','i'],                action: '*italic*' },
  { id: 'highlight', label: 'Highlight',       icon: 'marker',                  desc: '===highlight=== text',        keywords: ['highlight','mark','yellow'],      action: '===highlighted===' },
  { id: 'date',      label: 'Today\'s Date',   icon: 'calendar-today',          desc: 'Insert today\'s date',        keywords: ['date','today','now','time'],      action: `**${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}**` },
];

// ─── Page background helpers ──────────────────────────────────────────────────
function getPageBg(bg: PageBackground, isDark: boolean): string {
  const found = PAGE_BACKGROUNDS.find(p => p.id === bg);
  if (!found || found.id === 'none') return 'transparent';
  return isDark ? found.dark : found.light;
}
function getPageTextColor(bg: PageBackground, isDark: boolean, fallback: string): string {
  const found = PAGE_BACKGROUNDS.find(p => p.id === bg);
  if (!found || found.id === 'none' || found.textColor === 'auto') return fallback;
  return found.textColor;
}

// ─── Inline markdown renderer ─────────────────────────────────────────────────
function inlineMarkdown(text: string, colors: any, key: number) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|~~[^~]+~~|__[^_]+__|===[^=]+===|\[([^\]]+)\]\(([^)]+)\))/g);
  return parts.map((part, pi) => {
    const k = `${key}-${pi}`;
    if (part.startsWith('**') && part.endsWith('**')) return <Text key={k} style={{ fontWeight: '800' }}>{part.slice(2, -2)}</Text>;
    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) return <Text key={k} style={{ fontStyle: 'italic' }}>{part.slice(1, -1)}</Text>;
    if (part.startsWith('`') && part.endsWith('`')) return <Text key={k} style={{ fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', fontSize: 13, backgroundColor: colors.inputBg, color: colors.primary, paddingHorizontal: 4, borderRadius: 3 }}>{part.slice(1, -1)}</Text>;
    if (part.startsWith('~~') && part.endsWith('~~')) return <Text key={k} style={{ textDecorationLine: 'line-through', color: colors.textSecondary }}>{part.slice(2, -2)}</Text>;
    if (part.startsWith('__') && part.endsWith('__')) return <Text key={k} style={{ textDecorationLine: 'underline' }}>{part.slice(2, -2)}</Text>;
    if (part.startsWith('===') && part.endsWith('===')) return <Text key={k} style={{ backgroundColor: '#fef08a', color: '#78350f', paddingHorizontal: 2, borderRadius: 2 }}>{part.slice(3, -3)}</Text>;
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) return <Text key={k} style={{ color: colors.primary, textDecorationLine: 'underline' }}>{linkMatch[1]}</Text>;
    return <Text key={k}>{part}</Text>;
  });
}

function renderMarkdownLine(
  line: string, idx: number, colors: any,
  onToggleCheck?: (idx: number) => void,
  pageTextColor?: string
): React.ReactNode {
  const tc = pageTextColor || colors.text;

  if (line.startsWith('# ')) return <Text key={idx} style={{ fontSize: 26, fontWeight: '900', color: tc, marginTop: 18, marginBottom: 8, lineHeight: 34 }}>{line.slice(2)}</Text>;
  if (line.startsWith('## ')) return <Text key={idx} style={{ fontSize: 21, fontWeight: '800', color: tc, marginTop: 14, marginBottom: 5, lineHeight: 28 }}>{line.slice(3)}</Text>;
  if (line.startsWith('### ')) return <Text key={idx} style={{ fontSize: 17, fontWeight: '700', color: tc, marginTop: 12, marginBottom: 4, lineHeight: 24 }}>{line.slice(4)}</Text>;
  if (line.startsWith('#### ')) return <Text key={idx} style={{ fontSize: 15, fontWeight: '600', color: colors.textSecondary, marginTop: 10, marginBottom: 4 }}>{line.slice(5)}</Text>;

  if (line.startsWith('> ')) {
    const text = line.slice(2);
    if (text.startsWith('💡') || text.startsWith('[!TIP]')) {
      const body = text.replace(/^\[!TIP\]\s*/, '').replace(/^💡\s*/, '');
      return (
        <View key={idx} style={{ backgroundColor: '#eff6ff', borderLeftWidth: 4, borderLeftColor: '#3b82f6', borderRadius: 12, padding: 12, marginVertical: 6, flexDirection: 'row', gap: 10 }}>
          <Text style={{ fontSize: 18, lineHeight: 24 }}>💡</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Tip</Text>
            <Text style={{ fontSize: 14, color: '#1e40af', lineHeight: 21 }}>{body}</Text>
          </View>
        </View>
      );
    }
    if (text.startsWith('⚠️') || text.startsWith('[!WARNING]')) {
      const body = text.replace(/^\[!WARNING\]\s*/, '').replace(/^⚠️\s*/, '');
      return (
        <View key={idx} style={{ backgroundColor: '#fef3c7', borderLeftWidth: 4, borderLeftColor: '#f59e0b', borderRadius: 12, padding: 12, marginVertical: 6, flexDirection: 'row', gap: 10 }}>
          <Text style={{ fontSize: 18, lineHeight: 24 }}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#b45309', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Warning</Text>
            <Text style={{ fontSize: 14, color: '#92400e', lineHeight: 21 }}>{body}</Text>
          </View>
        </View>
      );
    }
    if (text.startsWith('ℹ️') || text.startsWith('[!INFO]')) {
      const body = text.replace(/^\[!INFO\]\s*/, '').replace(/^ℹ️\s*/, '');
      return (
        <View key={idx} style={{ backgroundColor: '#f0f9ff', borderLeftWidth: 4, borderLeftColor: '#0ea5e9', borderRadius: 12, padding: 12, marginVertical: 6, flexDirection: 'row', gap: 10 }}>
          <Text style={{ fontSize: 18, lineHeight: 24 }}>ℹ️</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#0284c7', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Info</Text>
            <Text style={{ fontSize: 14, color: '#0369a1', lineHeight: 21 }}>{body}</Text>
          </View>
        </View>
      );
    }
    if (text.startsWith('✅') || text.startsWith('[!SUCCESS]')) {
      const body = text.replace(/^\[!SUCCESS\]\s*/, '').replace(/^✅\s*/, '');
      return (
        <View key={idx} style={{ backgroundColor: '#f0fdf4', borderLeftWidth: 4, borderLeftColor: '#22c55e', borderRadius: 12, padding: 12, marginVertical: 6, flexDirection: 'row', gap: 10 }}>
          <Text style={{ fontSize: 18, lineHeight: 24 }}>✅</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#16a34a', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Success</Text>
            <Text style={{ fontSize: 14, color: '#166534', lineHeight: 21 }}>{body}</Text>
          </View>
        </View>
      );
    }
    if (text.startsWith('❌') || text.startsWith('[!ERROR]')) {
      const body = text.replace(/^\[!ERROR\]\s*/, '').replace(/^❌\s*/, '');
      return (
        <View key={idx} style={{ backgroundColor: '#fff1f2', borderLeftWidth: 4, borderLeftColor: '#ef4444', borderRadius: 12, padding: 12, marginVertical: 6, flexDirection: 'row', gap: 10 }}>
          <Text style={{ fontSize: 18, lineHeight: 24 }}>❌</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#dc2626', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Error</Text>
            <Text style={{ fontSize: 14, color: '#9f1239', lineHeight: 21 }}>{body}</Text>
          </View>
        </View>
      );
    }
    if (text.startsWith('📝') || text.startsWith('[!NOTE]')) {
      const body = text.replace(/^\[!NOTE\]\s*/, '').replace(/^📝\s*/, '');
      return (
        <View key={idx} style={{ backgroundColor: '#faf5ff', borderLeftWidth: 4, borderLeftColor: '#a855f7', borderRadius: 12, padding: 12, marginVertical: 6, flexDirection: 'row', gap: 10 }}>
          <Text style={{ fontSize: 18, lineHeight: 24 }}>📝</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#9333ea', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Note</Text>
            <Text style={{ fontSize: 14, color: '#6b21a8', lineHeight: 21 }}>{body}</Text>
          </View>
        </View>
      );
    }
    if (text.startsWith('🔥') || text.startsWith('[!IMPORTANT]')) {
      const body = text.replace(/^\[!IMPORTANT\]\s*/, '').replace(/^🔥\s*/, '');
      return (
        <View key={idx} style={{ backgroundColor: '#fff7ed', borderLeftWidth: 4, borderLeftColor: '#f97316', borderRadius: 12, padding: 12, marginVertical: 6, flexDirection: 'row', gap: 10 }}>
          <Text style={{ fontSize: 18, lineHeight: 24 }}>🔥</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#ea580c', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Important</Text>
            <Text style={{ fontSize: 14, color: '#9a3412', lineHeight: 21 }}>{body}</Text>
          </View>
        </View>
      );
    }
    if (text.startsWith('🚨') || text.startsWith('[!DANGER]')) {
      const body = text.replace(/^\[!DANGER\]\s*/, '').replace(/^🚨\s*/, '');
      return (
        <View key={idx} style={{ backgroundColor: '#fff1f2', borderLeftWidth: 4, borderLeftColor: '#f43f5e', borderRadius: 12, padding: 12, marginVertical: 6, flexDirection: 'row', gap: 10 }}>
          <Text style={{ fontSize: 18, lineHeight: 24 }}>🚨</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#e11d48', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Danger</Text>
            <Text style={{ fontSize: 14, color: '#881337', lineHeight: 21 }}>{body}</Text>
          </View>
        </View>
      );
    }
    return (
      <View key={idx} style={{ borderLeftWidth: 4, borderLeftColor: colors.primary, paddingLeft: 14, marginVertical: 8, backgroundColor: colors.primarySoft, borderRadius: 8, paddingVertical: 10, paddingRight: 12 }}>
        <Text style={{ fontSize: 15, color: colors.textSecondary, fontStyle: 'italic', lineHeight: 23 }}>{inlineMarkdown(text, colors, idx)}</Text>
      </View>
    );
  }

  if (line.startsWith('- [ ] ') || line.startsWith('* [ ] ')) {
    return (
      <TouchableOpacity key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginVertical: 4 }} onPress={() => onToggleCheck?.(idx)} activeOpacity={0.7}>
        <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.border, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 1 }} />
        <Text style={{ flex: 1, fontSize: 15, color: tc, lineHeight: 23 }}>{line.slice(6)}</Text>
      </TouchableOpacity>
    );
  }
  if (line.startsWith('- [x] ') || line.startsWith('* [x] ')) {
    return (
      <TouchableOpacity key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginVertical: 4 }} onPress={() => onToggleCheck?.(idx)} activeOpacity={0.7}>
        <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
          <MaterialCommunityIcons name="check" size={14} color="#fff" />
        </View>
        <Text style={{ flex: 1, fontSize: 15, color: colors.textMuted, lineHeight: 23, textDecorationLine: 'line-through' }}>{line.slice(6)}</Text>
      </TouchableOpacity>
    );
  }

  if (line.startsWith('- ') || line.startsWith('* ')) return (
    <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginVertical: 3, paddingLeft: 4 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 10 }} />
      <Text style={{ flex: 1, fontSize: 15, color: tc, lineHeight: 23 }}>{inlineMarkdown(line.slice(2), colors, idx)}</Text>
    </View>
  );

  if (/^\d+\. /.test(line)) {
    const match = line.match(/^(\d+)\. (.*)$/);
    if (match) return (
      <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginVertical: 3, paddingLeft: 4 }}>
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 11, color: '#fff', fontWeight: '800' }}>{match[1]}</Text>
        </View>
        <Text style={{ flex: 1, fontSize: 15, color: tc, lineHeight: 23 }}>{inlineMarkdown(match[2], colors, idx)}</Text>
      </View>
    );
  }

  if (line.startsWith('| ') || line.startsWith('|')) {
    const cells = line.split('|').filter((_, i, a) => i !== 0 && i !== a.length - 1).map(c => c.trim());
    const isSep = cells.every(c => /^[-:]+$/.test(c));
    if (isSep) return <View key={idx} style={{ height: 2, backgroundColor: colors.border, marginVertical: 2 }} />;
    return (
      <View key={idx} style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {cells.map((cell, ci) => (
          <View key={ci} style={{ flex: 1, padding: 8, borderRightWidth: 1, borderRightColor: colors.border, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Text style={{ fontSize: 13, color: tc }}>{cell}</Text>
          </View>
        ))}
      </View>
    );
  }

  if (line === '---' || line === '***' || line === '___') return <View key={idx} style={{ height: 2, backgroundColor: colors.border, marginVertical: 18, borderRadius: 1 }} />;
  if (line === '') return <View key={idx} style={{ height: 8 }} />;
  return <Text key={idx} style={{ fontSize: 15, color: tc, lineHeight: 24, marginBottom: 2 }}>{inlineMarkdown(line, colors, idx)}</Text>;
}

function MarkdownPreview({ content, colors, onToggleCheck, pageTextColor }: {
  content: string; colors: any; onToggleCheck: (idx: number) => void; pageTextColor?: string;
}) {
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // ── Fenced code blocks ──────────────────────────────────────────────────
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++; }
      blocks.push(
        <View key={`code-${i}`} style={{ backgroundColor: '#0f172a', borderRadius: 14, padding: 16, marginVertical: 10, borderWidth: 1, borderColor: '#1e293b' }}>
          {lang ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontSize: 10, color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 }}>{lang}</Text>
              <View style={{ flexDirection: 'row', gap: 5 }}>
                {['#ef4444', '#eab308', '#22c55e'].map(c => <View key={c} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} />)}
              </View>
            </View>
          ) : null}
          <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', fontSize: 13, color: '#e2e8f0', lineHeight: 21 }}>{codeLines.join('\n')}</Text>
        </View>
      );

    // ── Math blocks $$...$$ ──────────────────────────────────────────────────
    } else if (line === '$$') {
      const mathLines: string[] = [];
      i++;
      while (i < lines.length && lines[i] !== '$$') { mathLines.push(lines[i]); i++; }
      blocks.push(
        <View key={`math-${i}`} style={{ backgroundColor: colors.inputBg, borderRadius: 14, padding: 16, marginVertical: 10, borderWidth: 1, borderColor: colors.primary + '44', alignItems: 'center' }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Math</Text>
          <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', fontSize: 16, color: colors.text, textAlign: 'center', lineHeight: 24, fontStyle: 'italic' }}>{mathLines.join('\n')}</Text>
        </View>
      );

    // ── Single-line math $$...$$ ─────────────────────────────────────────────
    } else if (line.startsWith('$$') && line.endsWith('$$') && line.length > 4) {
      const math = line.slice(2, -2).trim();
      blocks.push(
        <View key={`imath-${i}`} style={{ backgroundColor: colors.inputBg, borderRadius: 12, padding: 12, marginVertical: 8, borderWidth: 1, borderColor: colors.primary + '44', alignItems: 'center' }}>
          <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', fontSize: 15, color: colors.text, fontStyle: 'italic' }}>{math}</Text>
        </View>
      );

    } else {
      blocks.push(renderMarkdownLine(line, i, colors, onToggleCheck, pageTextColor));
    }
    i++;
  }
  return <View style={{ paddingVertical: 4 }}>{blocks}</View>;
}

// ─── Format categories ────────────────────────────────────────────────────────
const FORMAT_CATEGORIES = [
  { id: 'text' as FormatCategory, label: 'Text', icon: 'format-bold' },
  { id: 'insert' as FormatCategory, label: 'Insert', icon: 'plus-circle-outline' },
  { id: 'list' as FormatCategory, label: 'Lists', icon: 'format-list-bulleted' },
  { id: 'callout' as FormatCategory, label: 'Callout', icon: 'tooltip-text-outline' },
  { id: 'style' as FormatCategory, label: 'Style', icon: 'palette-outline' },
];

export default function NoteEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, settings, isDark, sf, contentLineHeight } = useTheme();
  const { getNoteById, updateNote, trashNote, pinNote, flagNote, favoriteNote, duplicateNote, notebooks, addTag } = useNotes();
  const { loadStrokes, strokes, clearAll, undo, redo, canUndo, canRedo } = useDrawing();
  const insets = useSafeAreaInsets();

  const note = getNoteById(id);
  const notebook = notebooks.find(nb => nb.id === note?.notebookId);

  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [showFormatBar, setShowFormatBar] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [formatCat, setFormatCat] = useState<FormatCategory>('text');
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashStartPos, setSlashStartPos] = useState(0);
  const [showSearchReplace, setShowSearchReplace] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [searchCaseSensitive, setSearchCaseSensitive] = useState(false);

  const contentRef = useRef<TextInput>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 0 : insets.bottom;
  const isDrawing = viewMode === 'draw';
  const isPreview = viewMode === 'preview';

  // Load note data + strokes
  useEffect(() => {
    if (!note) return;
    setTitle(note.title);
    setContent(note.content);
    if (note.hasHandwriting) {
      Storage.get<Stroke[]>(STORAGE_KEYS.STROKES(note.id)).then(saved => {
        if (saved) loadStrokes(saved);
      });
    }
  }, [note?.id]);

  // Auto-save
  const doSave = useCallback(async (t: string, c: string) => {
    if (!note) return;
    setIsSaving(true);
    await updateNote(note.id, { title: t || 'Untitled Note', content: c });
    if (note.hasHandwriting && strokes.length > 0) {
      await Storage.set(STORAGE_KEYS.STROKES(note.id), strokes);
    }
    setHasUnsaved(false);
    setIsSaving(false);
  }, [note, updateNote, strokes]);

  const scheduleAutoSave = useCallback((t: string, c: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setHasUnsaved(true);
    if (settings.autoSave) {
      saveTimerRef.current = setTimeout(() => doSave(t, c), 1500);
    }
  }, [doSave, settings.autoSave]);

  const handleTitleChange = (t: string) => { setTitle(t); scheduleAutoSave(t, content); };
  const handleContentChange = (c: string) => {
    setContent(c);
    scheduleAutoSave(title, c);
    // Slash command detection — estimate cursor position
    const delta = c.length - content.length;
    const estimatedPos = Math.min(c.length, Math.max(0, selection.start + delta));
    const textBefore = c.slice(0, estimatedPos);
    const lastNewline = textBefore.lastIndexOf('\n');
    const currentLine = textBefore.slice(lastNewline + 1);
    if (currentLine.startsWith('/') && !currentLine.includes(' ') && currentLine.length <= 30) {
      setSlashStartPos(lastNewline + 1);
      setSlashQuery(currentLine.slice(1).toLowerCase());
      setShowSlashMenu(true);
    } else if (showSlashMenu) {
      setShowSlashMenu(false);
    }
  };

  const handleBack = async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    await doSave(title, content);
    haptic.light();
    router.back();
  };

  // ── Smart text insertion ───────────────────────────────────────────────────
  const insertAtCursor = useCallback((before: string, after: string = '') => {
    const selText = selection.start !== selection.end
      ? content.slice(selection.start, selection.end)
      : '';
    const newContent =
      content.slice(0, selection.start) + before + selText + after + content.slice(selection.end);
    setContent(newContent);
    scheduleAutoSave(title, newContent);
    setTimeout(() => contentRef.current?.focus(), 50);
  }, [content, title, scheduleAutoSave, selection]);

  const insertBlock = useCallback((block: string) => {
    const prefix = (content.endsWith('\n') || !content) ? '' : '\n';
    const newContent = content + prefix + block;
    setContent(newContent);
    scheduleAutoSave(title, newContent);
    setTimeout(() => contentRef.current?.focus(), 50);
  }, [content, title, scheduleAutoSave]);

  // ── Slash command execution ───────────────────────────────────────────────
  const executeSlashCommand = useCallback((cmd: SlashCommand) => {
    const actionStr = typeof cmd.action === 'string' ? cmd.action : '';
    const lineEnd = content.indexOf('\n', slashStartPos);
    const removeEnd = lineEnd === -1 ? content.length : lineEnd;
    const newContent = content.slice(0, slashStartPos) + actionStr + content.slice(removeEnd);
    setContent(newContent);
    scheduleAutoSave(title, newContent);
    setShowSlashMenu(false);
    setSlashQuery('');
    haptic.success();
    setTimeout(() => contentRef.current?.focus(), 80);
  }, [content, slashStartPos, title, scheduleAutoSave]);

  const filteredSlashCmds = useMemo(() => {
    if (!slashQuery) return SLASH_COMMANDS;
    const q = slashQuery.toLowerCase();
    return SLASH_COMMANDS.filter(cmd =>
      cmd.label.toLowerCase().includes(q) ||
      cmd.keywords.some(k => k.includes(q))
    );
  }, [slashQuery]);

  // ── Search & Replace ──────────────────────────────────────────────────────
  const searchMatchCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    try {
      const flags = searchCaseSensitive ? 'g' : 'gi';
      const re = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
      return (content.match(re) || []).length;
    } catch { return 0; }
  }, [searchQuery, content, searchCaseSensitive]);

  const handleReplaceAll = () => {
    if (!searchQuery.trim()) return;
    try {
      const flags = searchCaseSensitive ? 'g' : 'gi';
      const re = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
      const newContent = content.replace(re, replaceQuery);
      setContent(newContent);
      scheduleAutoSave(title, newContent);
      haptic.success();
      Alert.alert('Replaced ✅', `Replaced ${searchMatchCount} occurrence${searchMatchCount !== 1 ? 's' : ''}.`);
    } catch (e: any) { Alert.alert('Error', 'Invalid search pattern.'); }
  };

  const handleReplaceFirst = () => {
    if (!searchQuery.trim()) return;
    try {
      const flags = searchCaseSensitive ? '' : 'i';
      const re = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
      const newContent = content.replace(re, replaceQuery);
      if (newContent === content) { Alert.alert('Not found', `"${searchQuery}" not found.`); return; }
      setContent(newContent);
      scheduleAutoSave(title, newContent);
      haptic.success();
    } catch { Alert.alert('Error', 'Invalid search pattern.'); }
  };

  // ── Toggle checkbox in preview ────────────────────────────────────────────
  const handleToggleCheck = useCallback((lineIdx: number) => {
    const lines = content.split('\n');
    const line = lines[lineIdx];
    if (line.includes('- [ ] ')) lines[lineIdx] = line.replace('- [ ] ', '- [x] ');
    else if (line.includes('- [x] ')) lines[lineIdx] = line.replace('- [x] ', '- [ ] ');
    else if (line.includes('* [ ] ')) lines[lineIdx] = line.replace('* [ ] ', '* [x] ');
    else if (line.includes('* [x] ')) lines[lineIdx] = line.replace('* [x] ', '* [ ] ');
    const newContent = lines.join('\n');
    setContent(newContent);
    scheduleAutoSave(title, newContent);
    haptic.light();
  }, [content, title, scheduleAutoSave]);

  // ── Tag management ────────────────────────────────────────────────────────
  const handleAddTag = async () => {
    const tag = newTag.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!tag || !note || note.tags.includes(tag)) { setNewTag(''); setShowTagInput(false); return; }
    await updateNote(note.id, { tags: [...note.tags, tag] });
    await addTag(tag);
    setNewTag(''); setShowTagInput(false);
    haptic.success();
  };
  const handleRemoveTag = async (tag: string) => {
    if (!note) return;
    await updateNote(note.id, { tags: note.tags.filter(t => t !== tag) });
    haptic.light();
  };

  // ── Link insertion ────────────────────────────────────────────────────────
  const handleInsertLink = () => {
    if (!linkUrl) return;
    const text = linkText || linkUrl;
    const link = `[${text}](${linkUrl})`;
    insertAtCursor(link);
    setLinkText(''); setLinkUrl(''); setShowLinkModal(false);
    haptic.success();
  };

  // ── Export/Share ──────────────────────────────────────────────────────────
  const handleShare = async () => {
    if (!note) return;
    const result = await shareNote({ ...note, title, content });
    if (result.message) Alert.alert('Share', result.message);
  };

  const handleExport = () => {
    if (!note) return;
    const n = { ...note, title, content };
    Alert.alert('Export Note', 'Choose export format:', [
      {
        text: '📦 JSON Backup', onPress: async () => {
          try {
            const r = await exportNotesToJSON([n] as any, [] as any, [] as any, false);
            Alert.alert('Export', r.message || 'Exported!');
          } catch (e: any) { Alert.alert('Error', e?.message); }
        },
      },
      {
        text: '🌐 HTML Page', onPress: async () => {
          const r = await exportNoteAsHTML(n as any);
          Alert.alert('Export', r.message || 'Exported!');
        },
      },
      {
        text: '📄 Markdown (.md)', onPress: async () => {
          const r = await exportNoteAsMarkdown(n as any);
          Alert.alert('Export', r.message || 'Exported!');
        },
      },
      {
        text: '📃 Plain Text (.txt)', onPress: async () => {
          const r = await exportNoteAsText(n as any);
          Alert.alert('Export', r.message || 'Exported!');
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ── Computed stats ────────────────────────────────────────────────────────
  const wordCount = useMemo(() =>
    content.trim().split(/\s+/).filter(w => w.length > 0).length, [content]);
  const charCount = content.length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  const lineCount = content.split('\n').length;
  const todoTotal = (content.match(/^[-*] \[[ x]\] /gm) || []).length;
  const todoDone = (content.match(/^[-*] \[x\] /gm) || []).length;

  const pageBg = (note?.pageBackground || 'none') as PageBackground;
  const pageBackground = getPageBg(pageBg, isDark);
  const pageTextColor = getPageTextColor(pageBg, isDark, colors.text);
  const fontSize = sf(15);
  const lineH = contentLineHeight(fontSize);

  // ── Format tools ──────────────────────────────────────────────────────────
  const formatTools: Record<FormatCategory, { icon: string; label: string; action: () => void }[]> = {
    text: [
      { icon: 'format-bold', label: 'Bold', action: () => insertAtCursor('**', '**') },
      { icon: 'format-italic', label: 'Italic', action: () => insertAtCursor('*', '*') },
      { icon: 'format-underline', label: 'Underline', action: () => insertAtCursor('__', '__') },
      { icon: 'format-strikethrough-variant', label: 'Strike', action: () => insertAtCursor('~~', '~~') },
      { icon: 'marker', label: 'Highlight', action: () => insertAtCursor('===', '===') },
      { icon: 'code-tags', label: 'Code', action: () => insertAtCursor('`', '`') },
      { icon: 'format-header-1', label: 'H1', action: () => insertBlock('\n# ') },
      { icon: 'format-header-2', label: 'H2', action: () => insertBlock('\n## ') },
      { icon: 'format-header-3', label: 'H3', action: () => insertBlock('\n### ') },
      { icon: 'format-quote-open', label: 'Quote', action: () => insertBlock('\n> ') },
    ],
    insert: [
      { icon: 'link-variant', label: 'Link', action: () => { setShowLinkModal(true); haptic.light(); } },
      { icon: 'minus', label: 'Divider', action: () => insertBlock('\n\n---\n\n') },
      { icon: 'table', label: 'Table', action: () => insertBlock('\n| Header 1 | Header 2 | Header 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n') },
      { icon: 'code-block', label: 'Code Block', action: () => insertBlock('\n```javascript\n// code here\n```\n') },
      { icon: 'lightbulb-outline', label: '💡 Tip', action: () => insertBlock('\n> 💡 ') },
      { icon: 'alert-outline', label: '⚠️ Warning', action: () => insertBlock('\n> ⚠️ ') },
      { icon: 'image-outline', label: 'Image', action: () => insertBlock('\n![alt](url)\n') },
      { icon: 'calendar-outline', label: 'Date', action: () => insertAtCursor(`**${new Date().toLocaleDateString()}**`) },
      { icon: 'clock-outline', label: 'Time', action: () => insertAtCursor(`\`${new Date().toLocaleTimeString()}\``) },
      { icon: 'emoticon-outline', label: 'Emoji', action: () => insertAtCursor('') },
    ],
    list: [
      { icon: 'format-list-bulleted', label: 'Bullet', action: () => insertBlock('\n- ') },
      { icon: 'format-list-numbered', label: 'Numbered', action: () => insertBlock('\n1. ') },
      { icon: 'checkbox-blank-outline', label: 'Todo', action: () => insertBlock('\n- [ ] ') },
      { icon: 'checkbox-marked', label: 'Done', action: () => insertBlock('\n- [x] ') },
      { icon: 'chevron-right', label: 'Sub-item', action: () => insertBlock('\n  - ') },
      { icon: 'star-outline', label: '★ Item', action: () => insertBlock('\n- ★ ') },
      { icon: 'arrow-right', label: '→ Item', action: () => insertBlock('\n- → ') },
      { icon: 'format-list-checks', label: 'Checklist', action: () => insertBlock('\n- [ ] Task 1\n- [ ] Task 2\n- [ ] Task 3\n') },
      { icon: 'numeric', label: 'Numbered List', action: () => insertBlock('\n1. First\n2. Second\n3. Third\n') },
      { icon: 'format-list-bulleted-square', label: 'Square', action: () => insertBlock('\n▪ ') },
    ],
    callout: [
      { icon: 'lightbulb-outline',        label: '💡 Tip',       action: () => insertBlock('\n> 💡 ') },
      { icon: 'alert-outline',            label: '⚠️ Warning',   action: () => insertBlock('\n> ⚠️ ') },
      { icon: 'information-outline',      label: 'ℹ️ Info',      action: () => insertBlock('\n> ℹ️ ') },
      { icon: 'check-circle-outline',     label: '✅ Success',   action: () => insertBlock('\n> ✅ ') },
      { icon: 'close-circle-outline',     label: '❌ Error',     action: () => insertBlock('\n> ❌ ') },
      { icon: 'note-text-outline',        label: '📝 Note',      action: () => insertBlock('\n> 📝 ') },
      { icon: 'fire',                     label: '🔥 Important', action: () => insertBlock('\n> 🔥 ') },
      { icon: 'alarm-light-outline',      label: '🚨 Danger',    action: () => insertBlock('\n> 🚨 ') },
      { icon: 'function-variant',         label: '$$ Math',      action: () => insertBlock('\n$$\n\n$$\n') },
    ],
    style: [
      { icon: 'palette-outline', label: 'Page Color', action: () => { setShowColorPicker(true); haptic.light(); } },
      { icon: 'draw', label: 'Draw Mode', action: () => { setViewMode('draw'); haptic.light(); } },
      { icon: 'eye-outline', label: isPreview ? 'Edit' : 'Preview', action: () => { setViewMode(isPreview ? 'edit' : 'preview'); haptic.light(); } },
      { icon: 'focus-field', label: 'Focus Mode', action: () => { setFocusMode(v => !v); haptic.light(); } },
      { icon: 'tag-plus-outline', label: 'Add Tag', action: () => { setShowTagInput(true); haptic.light(); } },
      { icon: note?.isPinned ? 'pin' : 'pin-outline', label: note?.isPinned ? 'Unpin' : 'Pin', action: () => { if (note) { pinNote(note.id, !note.isPinned); haptic.select(); } } },
      { icon: note?.isFlagged ? 'flag' : 'flag-outline', label: note?.isFlagged ? 'Unflag' : 'Flag', action: () => { if (note) { flagNote(note.id, !note.isFlagged); haptic.select(); } } },
      { icon: note?.isFavorite ? 'heart' : 'heart-outline', label: note?.isFavorite ? 'Unfav' : 'Favorite', action: () => { if (note) { favoriteNote(note.id, !note.isFavorite); haptic.select(); } } },
      { icon: 'share-outline', label: 'Share', action: handleShare },
      { icon: 'export-variant', label: 'Export', action: handleExport },
    ],
  };

  if (!note) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <MaterialCommunityIcons name="note-remove-outline" size={64} color={colors.textMuted} />
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 16, textAlign: 'center' }}>Note not found</Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>It may have been deleted or moved to trash.</Text>
        <TouchableOpacity style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: colors.primary, borderRadius: 14 }} onPress={() => router.back()}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const colorHex = getNoteColorHex(note.color, isDark);
  const accentColor = colorHex && colorHex !== 'transparent' ? colorHex : colors.primary;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── Top Bar ────────────────────────────────────────────────────────── */}
      {!focusMode && (
        <View style={[styles.header, {
          backgroundColor: colors.card,
          borderBottomColor: colors.border,
          paddingTop: topPad + 4,
        }]}>
          {colorHex && colorHex !== 'transparent' && (
            <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3.5, backgroundColor: accentColor, borderTopRightRadius: 2, borderBottomRightRadius: 2 }} />
          )}

          <TouchableOpacity style={styles.headerBtn} onPress={handleBack}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            {notebook && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: notebook.color + '18', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 11 }}>{notebook.emoji}</Text>
                <Text style={{ fontSize: 11, color: notebook.color, fontWeight: '700' }} numberOfLines={1}>{notebook.title}</Text>
              </View>
            )}
          </View>

          <View style={styles.headerRight}>
            {/* Save state indicator */}
            {isSaving ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 2 }}>
                <MaterialCommunityIcons name="cloud-upload-outline" size={13} color={colors.primary} />
                <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600' }}>Saving…</Text>
              </View>
            ) : hasUnsaved ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 2 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.warning }} />
              </View>
            ) : (
              <MaterialCommunityIcons name="check-circle-outline" size={16} color={colors.success} style={{ marginRight: 2 }} />
            )}

            {/* View mode switcher */}
            {([
              { mode: 'edit' as ViewMode, icon: 'pencil-outline', tooltip: 'Edit' },
              { mode: 'preview' as ViewMode, icon: 'eye-outline', tooltip: 'Preview' },
              { mode: 'draw' as ViewMode, icon: 'draw', tooltip: 'Draw' },
            ]).map(({ mode, icon }) => (
              <TouchableOpacity
                key={mode}
                style={[styles.headerBtn, viewMode === mode && { backgroundColor: colors.primarySoft }]}
                onPress={() => { setViewMode(mode); haptic.select(); }}
              >
                <MaterialCommunityIcons name={icon as any} size={19} color={viewMode === mode ? colors.primary : colors.text} />
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.headerBtn} onPress={() => { setShowMoreMenu(true); haptic.select(); }}>
              <MaterialCommunityIcons name="dots-horizontal" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Format Bar ─────────────────────────────────────────────────────── */}
      {viewMode === 'edit' && showFormatBar && !focusMode && (
        <View style={{ backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          {/* Category tabs */}
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border }}>
            {FORMAT_CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 7, borderBottomWidth: 2.5, borderBottomColor: formatCat === cat.id ? colors.primary : 'transparent' }}
                onPress={() => { setFormatCat(cat.id); haptic.light(); }}
              >
                <MaterialCommunityIcons name={cat.icon as any} size={14} color={formatCat === cat.id ? colors.primary : colors.textMuted} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: formatCat === cat.id ? colors.primary : colors.textMuted, letterSpacing: 0.2 }}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Tool buttons */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 5, gap: 5 }}>
            {formatTools[formatCat].map((tool, i) => (
              <TouchableOpacity
                key={i}
                style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: colors.inputBg, gap: 2, minWidth: 50 }}
                onPress={() => { tool.action(); haptic.light(); }}
              >
                <MaterialCommunityIcons name={tool.icon as any} size={17} color={colors.text} />
                <Text style={{ fontSize: 9, color: colors.textMuted, fontWeight: '700' }} numberOfLines={1}>{tool.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Slash Command Menu ─────────────────────────────────────────────── */}
      {showSlashMenu && viewMode === 'edit' && !focusMode && (
        <Animated.View entering={FadeIn.duration(120)} style={{
          maxHeight: 280, borderBottomWidth: 1, borderBottomColor: colors.border,
          backgroundColor: colors.surface,
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 8, paddingBottom: 4, gap: 8 }}>
            <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>/</Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>
              {slashQuery ? `"${slashQuery}" — ${filteredSlashCmds.length} command${filteredSlashCmds.length !== 1 ? 's' : ''}` : 'Type to filter commands…'}
            </Text>
            <TouchableOpacity onPress={() => setShowSlashMenu(false)} style={{ marginLeft: 'auto' as any }}>
              <MaterialCommunityIcons name="close" size={15} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          {filteredSlashCmds.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>No commands match "{slashQuery}"</Text>
            </View>
          ) : (
            <FlatList
              data={filteredSlashCmds}
              keyExtractor={c => c.id}
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
              renderItem={({ item: cmd }) => (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, gap: 12 }}
                  onPress={() => executeSlashCommand(cmd)}
                  activeOpacity={0.7}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialCommunityIcons name={cmd.icon as any} size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{cmd.label}</Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>{cmd.desc}</Text>
                  </View>
                  <MaterialCommunityIcons name="arrow-right" size={14} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            />
          )}
        </Animated.View>
      )}

      {/* ── Tags Row ───────────────────────────────────────────────────────── */}
      {!isDrawing && !focusMode && note.tags.length > 0 && (
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={{ maxHeight: 38, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 6, gap: 6, alignItems: 'center' }}
        >
          {note.tags.map(tag => (
            <TouchableOpacity
              key={tag}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primarySoft, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}
              onPress={() => handleRemoveTag(tag)}
            >
              <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '700' }}>#{tag}</Text>
              <MaterialCommunityIcons name="close" size={11} color={colors.primary} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => setShowTagInput(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border }}
          >
            <MaterialCommunityIcons name="plus" size={11} color={colors.textMuted} />
            <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>tag</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── Tag Input Row ─────────────────────────────────────────────────── */}
      {showTagInput && !isDrawing && (
        <Animated.View entering={FadeIn.duration(150)} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <MaterialCommunityIcons name="tag-outline" size={17} color={colors.primary} />
          <TextInput
            style={{ flex: 1, fontSize: 14, color: colors.text, paddingVertical: 4 }}
            placeholder="Add tag (e.g. work, ideas)…"
            placeholderTextColor={colors.textMuted}
            value={newTag}
            onChangeText={setNewTag}
            onSubmitEditing={handleAddTag}
            autoFocus
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={handleAddTag} style={{ backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>Add</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowTagInput(false)}>
            <MaterialCommunityIcons name="close" size={17} color={colors.textMuted} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── Draw Mode Canvas ──────────────────────────────────────────────── */}
      {isDrawing && (
        <View style={{ flex: 1, backgroundColor: colors.canvasBg }}>
          <DrawingCanvas
            width={SCREEN_W}
            height={SCREEN_H - topPad - 120 - botPad}
            pageBgColor={pageBackground !== 'transparent' ? pageBackground : undefined}
          />
          <PenToolbar
            onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo}
            onClear={() => Alert.alert('Clear', 'Clear all strokes?', [
              { text: 'Clear', style: 'destructive', onPress: () => clearAll() },
              { text: 'Cancel', style: 'cancel' },
            ])}
            onClose={() => {
              if (strokes.length > 0) {
                updateNote(note.id, { hasHandwriting: true });
                Storage.set(STORAGE_KEYS.STROKES(note.id), strokes);
              }
              setViewMode('edit');
            }}
          />
        </View>
      )}

      {/* ── Edit / Preview ────────────────────────────────────────────────── */}
      {!isDrawing && (
        <ScrollView
          ref={scrollRef}
          style={[{ flex: 1 }, pageBackground !== 'transparent' && { backgroundColor: pageBackground }]}
          contentContainerStyle={{ padding: focusMode ? 24 : 16, paddingBottom: 180 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          {isPreview ? (
            <Text style={{ fontSize: sf(26), fontWeight: '900', color: pageTextColor, marginBottom: 10, lineHeight: sf(34) }}>
              {title || 'Untitled Note'}
            </Text>
          ) : (
            <TextInput
              style={{ fontSize: sf(24), fontWeight: '900', color: pageTextColor, marginBottom: 8, padding: 0, lineHeight: sf(32) }}
              value={title}
              onChangeText={handleTitleChange}
              placeholder="Note title…"
              placeholderTextColor={pageTextColor + '55'}
              multiline
              returnKeyType="next"
              onSubmitEditing={() => contentRef.current?.focus()}
            />
          )}

          {/* Emoji + badges */}
          {!focusMode && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {note.emoji && <Text style={{ fontSize: 22 }}>{note.emoji}</Text>}
              {note.isPinned && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f59e0b20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <MaterialCommunityIcons name="pin" size={11} color="#f59e0b" />
                  <Text style={{ fontSize: 11, color: '#f59e0b', fontWeight: '800' }}>Pinned</Text>
                </View>
              )}
              {note.isFlagged && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#ef444420', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <MaterialCommunityIcons name="flag" size={11} color="#ef4444" />
                  <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: '800' }}>Flagged</Text>
                </View>
              )}
              {note.isFavorite && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#ec489920', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <MaterialCommunityIcons name="heart" size={11} color="#ec4899" />
                  <Text style={{ fontSize: 11, color: '#ec4899', fontWeight: '800' }}>Favorite</Text>
                </View>
              )}
              <Text style={{ fontSize: 11, color: pageTextColor + '80', marginLeft: 2 }}>
                {formatRelativeDate(note.modifiedAt)}
              </Text>
            </View>
          )}

          <View style={{ height: 1, backgroundColor: pageTextColor + '20', marginBottom: 14 }} />

          {/* Todo progress bar */}
          {todoTotal > 0 && !focusMode && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, backgroundColor: colors.primarySoft, borderRadius: 12, padding: 10 }}>
              <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={16} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{ height: '100%', borderRadius: 3, backgroundColor: colors.primary, width: `${(todoDone / todoTotal) * 100}%` as any }} />
                </View>
              </View>
              <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '800' }}>{todoDone}/{todoTotal} done</Text>
            </View>
          )}

          {/* Content */}
          {isPreview ? (
            <MarkdownPreview
              content={content}
              colors={colors}
              onToggleCheck={handleToggleCheck}
              pageTextColor={pageTextColor}
            />
          ) : (
            <TextInput
              ref={contentRef}
              style={{
                fontSize,
                color: pageTextColor,
                lineHeight: lineH,
                textAlignVertical: 'top',
                padding: 0,
                minHeight: 300,
              }}
              value={content}
              onChangeText={handleContentChange}
              onSelectionChange={e => setSelection(e.nativeEvent.selection)}
              placeholder={[
                'Start writing…',
                '',
                'Markdown supported:',
                '  # Heading 1   ## Heading 2',
                '  **bold**   *italic*   `code`',
                '  - [ ] todo   - [x] done',
                '  > blockquote   === highlight ===',
                '  | Col1 | Col2 |  (tables)',
                '  --- (horizontal divider)',
              ].join('\n')}
              placeholderTextColor={pageTextColor + '40'}
              multiline
              spellCheck={settings.spellCheck}
              autoCapitalize="sentences"
              scrollEnabled={false}
            />
          )}
        </ScrollView>
      )}

      {/* ── Status Bar ─────────────────────────────────────────────────────── */}
      {!isDrawing && !focusMode && (
        <View style={[styles.statusBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Math.max(botPad, 4) }]}>
          <Text style={{ flex: 1, fontSize: 11, color: colors.textMuted }}>
            {wordCount} words · {charCount} chars · {lineCount} lines · ~{readingTime} min
          </Text>
          <TouchableOpacity style={{ padding: 6 }} onPress={() => { setShowInfo(v => !v); haptic.select(); }}>
            <MaterialCommunityIcons name="information-outline" size={17} color={showInfo ? colors.primary : colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={{ padding: 6 }} onPress={() => { setShowFormatBar(v => !v); haptic.select(); }}>
            <MaterialCommunityIcons name="keyboard-outline" size={17} color={showFormatBar ? colors.primary : colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={{ padding: 6 }} onPress={() => { doSave(title, content); haptic.success(); }}>
            <MaterialCommunityIcons name="content-save-outline" size={17} color={hasUnsaved ? colors.warning : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Info Panel ─────────────────────────────────────────────────────── */}
      {showInfo && !isDrawing && (
        <Animated.View entering={FadeInUp.duration(200)} style={[styles.infoPanel, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>Note Information</Text>
            <TouchableOpacity onPress={() => setShowInfo(false)}>
              <MaterialCommunityIcons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
            {[
              { icon: 'calendar-outline', label: 'Created', value: formatFullDate(note.createdAt) },
              { icon: 'clock-edit-outline', label: 'Modified', value: formatTime(note.modifiedAt) },
              { icon: 'text', label: 'Words', value: String(wordCount) },
              { icon: 'format-line-weight', label: 'Lines', value: String(lineCount) },
              { icon: 'timer-outline', label: 'Read Time', value: `${readingTime}m` },
              { icon: 'checkbox-marked-outline', label: 'Tasks', value: `${todoDone}/${todoTotal}` },
            ].map(({ icon, label, value }) => (
              <View key={label} style={{ width: 80, alignItems: 'center', backgroundColor: colors.inputBg, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 8 }}>
                <MaterialCommunityIcons name={icon as any} size={14} color={colors.primary} />
                <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3, fontWeight: '700', textAlign: 'center' }}>{label}</Text>
                <Text style={{ fontSize: 12, color: colors.text, fontWeight: '800', marginTop: 3, textAlign: 'center' }}>{value}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Card color row */}
          <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Card Color</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
            {NOTE_COLORS.map(nc => {
              const bg = nc.id === 'none' ? colors.inputBg : (isDark ? nc.darkHex : nc.hex);
              const isSelected = note.color === nc.id;
              return (
                <TouchableOpacity
                  key={nc.id}
                  style={[{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: bg }, isSelected && { borderWidth: 3, borderColor: colors.text }]}
                  onPress={() => { updateNote(note.id, { color: nc.id }); haptic.select(); }}
                >
                  {nc.id === 'none' && !isSelected && <MaterialCommunityIcons name="close" size={12} color={colors.textMuted} />}
                  {isSelected && nc.id !== 'none' && <MaterialCommunityIcons name="check" size={13} color="#fff" />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Quick action pills */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { icon: note.isPinned ? 'pin' : 'pin-outline', label: note.isPinned ? 'Pinned' : 'Pin', onPress: () => { pinNote(note.id, !note.isPinned); haptic.select(); }, active: note.isPinned },
              { icon: note.isFlagged ? 'flag' : 'flag-outline', label: note.isFlagged ? 'Flagged' : 'Flag', onPress: () => { flagNote(note.id, !note.isFlagged); haptic.select(); }, active: note.isFlagged },
              { icon: note.isFavorite ? 'heart' : 'heart-outline', label: note.isFavorite ? 'Fav' : 'Fav', onPress: () => { favoriteNote(note.id, !note.isFavorite); haptic.select(); }, active: note.isFavorite },
              { icon: 'palette-outline', label: 'Page BG', onPress: () => { setShowInfo(false); setTimeout(() => setShowColorPicker(true), 250); }, active: pageBg !== 'none' },
            ].map(({ icon, label, onPress, active }) => (
              <TouchableOpacity
                key={label}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 12, backgroundColor: active ? colors.primarySoft : colors.inputBg }}
                onPress={onPress}
              >
                <MaterialCommunityIcons name={icon as any} size={14} color={active ? colors.primary : colors.textSecondary} />
                <Text style={{ fontSize: 11, fontWeight: '800', color: active ? colors.primary : colors.textSecondary }}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      )}

      {/* ── Focus Mode Exit ───────────────────────────────────────────────── */}
      {focusMode && !isDrawing && (
        <Animated.View entering={FadeIn} style={{ position: 'absolute', bottom: Math.max(botPad, 16) + 10, left: 20, right: 20 }}>
          <TouchableOpacity
            style={{ backgroundColor: 'rgba(0,0,0,0.72)', borderRadius: 18, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
            onPress={() => setFocusMode(false)}
          >
            <MaterialCommunityIcons name="focus-field-horizontal" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Exit Focus Mode</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── Page Color Picker Modal ───────────────────────────────────────── */}
      <Modal visible={showColorPicker} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowColorPicker(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={styles.sheetHandle} />
            <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text, marginBottom: 4 }}>Page Background</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 18 }}>Choose a background for your writing area</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {PAGE_BACKGROUNDS.map(bg => {
                  const bgColor = isDark ? bg.dark : bg.light;
                  const isSelected = note.pageBackground === bg.id;
                  const isNone = bg.id === 'none';
                  return (
                    <TouchableOpacity
                      key={bg.id}
                      style={{
                        width: '30%', aspectRatio: 1.4, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, paddingVertical: 8,
                        backgroundColor: isNone ? colors.inputBg : bgColor,
                        borderWidth: isSelected ? 3 : 1,
                        borderColor: isSelected ? colors.primary : colors.border,
                      }}
                      onPress={() => {
                        updateNote(note.id, { pageBackground: bg.id });
                        haptic.select();
                        setShowColorPicker(false);
                      }}
                    >
                      {isNone && <MaterialCommunityIcons name="cancel" size={20} color={colors.textMuted} />}
                      {isSelected && !isNone && (
                        <View style={{ position: 'absolute', top: 5, right: 5, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                          <MaterialCommunityIcons name="check" size={11} color="#fff" />
                        </View>
                      )}
                      <Text style={{ fontSize: 11, fontWeight: isSelected ? '800' : '600', color: isNone ? colors.textMuted : (bg.textColor === 'auto' ? '#333' : bg.textColor), textAlign: 'center', marginTop: isNone ? 4 : 0 }} numberOfLines={1}>{bg.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={{ height: 30 }} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Search & Replace Modal ───────────────────────────────────────── */}
      <Modal visible={showSearchReplace} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowSearchReplace(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface, maxHeight: 420 }]} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text }}>Find & Replace</Text>
              {searchQuery.trim() ? (
                <View style={{ backgroundColor: colors.primarySoft, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>
                    {searchMatchCount} match{searchMatchCount !== 1 ? 'es' : ''}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={{ gap: 12, marginBottom: 16 }}>
              <View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Find</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, gap: 8 }}>
                  <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} />
                  <TextInput
                    style={{ flex: 1, fontSize: 15, color: colors.text, paddingVertical: 12 }}
                    placeholder="Search text…"
                    placeholderTextColor={colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                    autoCapitalize="none"
                  />
                  {searchQuery ? (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <MaterialCommunityIcons name="close-circle" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              <View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Replace With</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, gap: 8 }}>
                  <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.textMuted} />
                  <TextInput
                    style={{ flex: 1, fontSize: 15, color: colors.text, paddingVertical: 12 }}
                    placeholder="Replace with…"
                    placeholderTextColor={colors.textMuted}
                    value={replaceQuery}
                    onChangeText={setReplaceQuery}
                    autoCapitalize="none"
                  />
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, paddingVertical: 4 }}
              onPress={() => setSearchCaseSensitive(v => !v)}
            >
              <View style={{ width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: searchCaseSensitive ? colors.primary : colors.border, backgroundColor: searchCaseSensitive ? colors.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {searchCaseSensitive && <MaterialCommunityIcons name="check" size={12} color="#fff" />}
              </View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>Case sensitive</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, padding: 14, borderRadius: 14, backgroundColor: searchQuery.trim() ? colors.inputBg : colors.border, alignItems: 'center' }}
                onPress={handleReplaceFirst}
                disabled={!searchQuery.trim() || searchMatchCount === 0}
              >
                <Text style={{ fontWeight: '700', color: searchQuery.trim() ? colors.textSecondary : colors.textMuted, fontSize: 14 }}>Replace First</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, padding: 14, borderRadius: 14, backgroundColor: (searchQuery.trim() && searchMatchCount > 0) ? colors.primary : colors.border, alignItems: 'center' }}
                onPress={handleReplaceAll}
                disabled={!searchQuery.trim() || searchMatchCount === 0}
              >
                <Text style={{ fontWeight: '800', color: '#fff', fontSize: 14 }}>Replace All {searchMatchCount > 0 ? `(${searchMatchCount})` : ''}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Link Insertion Modal ──────────────────────────────────────────── */}
      <Modal visible={showLinkModal} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setShowLinkModal(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface, maxHeight: 360 }]}>
            <View style={styles.sheetHandle} />
            <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text, marginBottom: 18 }}>Insert Link</Text>
            <View style={{ gap: 12, marginBottom: 20 }}>
              <View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Display Text (optional)</Text>
                <TextInput
                  style={{ backgroundColor: colors.inputBg, borderRadius: 12, padding: 14, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border }}
                  placeholder="My link text…"
                  placeholderTextColor={colors.textMuted}
                  value={linkText}
                  onChangeText={setLinkText}
                />
              </View>
              <View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>URL *</Text>
                <TextInput
                  style={{ backgroundColor: colors.inputBg, borderRadius: 12, padding: 14, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border }}
                  placeholder="https://example.com"
                  placeholderTextColor={colors.textMuted}
                  value={linkUrl}
                  onChangeText={setLinkUrl}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={{ flex: 1, padding: 14, borderRadius: 14, backgroundColor: colors.inputBg, alignItems: 'center' }} onPress={() => setShowLinkModal(false)}>
                <Text style={{ fontWeight: '700', color: colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 2, padding: 14, borderRadius: 14, backgroundColor: linkUrl ? colors.primary : colors.border, alignItems: 'center' }} onPress={handleInsertLink} disabled={!linkUrl}>
                <Text style={{ fontWeight: '800', color: '#fff' }}>Insert Link</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── More Menu Modal ───────────────────────────────────────────────── */}
      <Modal visible={showMoreMenu} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setShowMoreMenu(false)}>
          <Animated.View entering={FadeInDown.duration(220)} style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={styles.sheetHandle} />
            <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text, marginBottom: 14 }}>Note Options</Text>
            {[
              {
                icon: note.isPinned ? 'pin-off-outline' : 'pin-outline',
                label: note.isPinned ? 'Unpin Note' : 'Pin Note',
                color: colors.primary,
                action: () => { pinNote(note.id, !note.isPinned); haptic.success(); setShowMoreMenu(false); },
              },
              {
                icon: note.isFlagged ? 'flag-off-outline' : 'flag-outline',
                label: note.isFlagged ? 'Remove Flag' : 'Flag Note',
                color: '#f59e0b',
                action: () => { flagNote(note.id, !note.isFlagged); haptic.success(); setShowMoreMenu(false); },
              },
              {
                icon: note.isFavorite ? 'heart-off-outline' : 'heart-outline',
                label: note.isFavorite ? 'Remove from Favorites' : 'Add to Favorites',
                color: '#ef4444',
                action: () => { favoriteNote(note.id, !note.isFavorite); haptic.success(); setShowMoreMenu(false); },
              },
              {
                icon: 'palette-outline',
                label: 'Change Page Background',
                color: '#8b5cf6',
                action: () => { setShowMoreMenu(false); setTimeout(() => setShowColorPicker(true), 300); },
              },
              {
                icon: 'tag-plus-outline',
                label: 'Add Tag',
                color: '#ec4899',
                action: () => { setShowMoreMenu(false); setTimeout(() => setShowTagInput(true), 300); },
              },
              {
                icon: 'content-copy',
                label: 'Duplicate Note',
                color: colors.textSecondary,
                action: () => { duplicateNote(note.id); haptic.success(); setShowMoreMenu(false); Alert.alert('Duplicated ✅', 'Note duplicated!'); },
              },
              {
                icon: 'share-outline',
                label: 'Share Note',
                color: '#3b82f6',
                action: () => { setShowMoreMenu(false); handleShare(); },
              },
              {
                icon: 'export-variant',
                label: 'Export Note',
                color: '#10b981',
                action: () => { setShowMoreMenu(false); handleExport(); },
              },
              {
                icon: 'focus-field',
                label: focusMode ? 'Exit Focus Mode' : 'Enter Focus Mode',
                color: colors.textSecondary,
                action: () => { setFocusMode(v => !v); haptic.select(); setShowMoreMenu(false); },
              },
              {
                icon: 'information-outline',
                label: 'Note Information',
                color: colors.textSecondary,
                action: () => { setShowMoreMenu(false); setShowInfo(true); },
              },
              {
                icon: 'delete-outline',
                label: 'Move to Trash',
                color: colors.error,
                action: () => {
                  setShowMoreMenu(false);
                  Alert.alert('Move to Trash', 'Move this note to trash?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Move to Trash', style: 'destructive', onPress: () => { trashNote(note.id); router.back(); } },
                  ]);
                },
              },
            ].map(({ icon, label, color, action }) => (
              <TouchableOpacity key={label} style={styles.menuItem} onPress={action}>
                <View style={[styles.menuIconBox, { backgroundColor: color + '18' }]}>
                  <MaterialCommunityIcons name={icon as any} size={18} color={color} />
                </View>
                <Text style={[styles.menuLabel, { color: color === colors.error ? colors.error : colors.text }]}>{label}</Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </Animated.View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8,
    paddingBottom: 8, gap: 2, borderBottomWidth: 1,
  },
  headerBtn: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10,
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 4 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  statusBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 6,
    borderTopWidth: 1,
  },
  infoPanel: { borderTopWidth: 1, padding: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 40, maxHeight: '90%' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#d1d5db', alignSelf: 'center', marginBottom: 16 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 11, paddingHorizontal: 2 },
  menuIconBox: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
});
