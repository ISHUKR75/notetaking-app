import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Switch, Platform, Alert, Modal, Pressable, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { haptic } from '../../src/utils/haptics';
import { useTheme, AppSettings } from '../../src/context/ThemeContext';
import { useNotes } from '../../src/context/NotesContext';
import { Colors, ThemeColors, THEME_OPTIONS } from '../../src/constants/colors';
import {
  exportNotesToJSON, exportAllAsMarkdownZip, exportNoteAsHTML,
  pickAndImportFile,
} from '../../src/utils/exportImport';

const { width: SCREEN_W } = Dimensions.get('window');

function Divider({ colors }: { colors: ThemeColors }) {
  return <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 66 }} />;
}

function SettingsItem({
  icon, iconColor, title, subtitle, onPress, rightElement, danger, badge,
}: {
  icon: string; iconColor: string; title: string; subtitle?: string;
  onPress?: () => void; rightElement?: React.ReactNode; danger?: boolean; badge?: string;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14 }}
      onPress={onPress}
      disabled={!onPress && !rightElement}
      activeOpacity={0.7}
    >
      <View style={{ width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: iconColor + '20' }}>
        <MaterialCommunityIcons name={icon as any} size={20} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: Colors.font.base, fontWeight: '500', color: danger ? colors.error : colors.text }}>
          {title}
        </Text>
        {subtitle && (
          <Text style={{ fontSize: Colors.font.sm, color: colors.textSecondary, marginTop: 1 }}>
            {subtitle}
          </Text>
        )}
      </View>
      {badge && (
        <View style={{ backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 }}>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{badge}</Text>
        </View>
      )}
      {rightElement || (onPress && (
        <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
      ))}
    </TouchableOpacity>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: 24, paddingHorizontal: 16 }}>
      <Text style={{ fontSize: Colors.font.xs, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, paddingHorizontal: 4 }}>
        {title}
      </Text>
      <View style={{
        backgroundColor: colors.card, borderRadius: Colors.radius.xl,
        borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
        shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1, shadowRadius: 8, elevation: 2,
      }}>
        {children}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, settings, updateSettings, isDark, appTheme } = useTheme();
  const { notes, notebooks, tags, getTrashedNotes, importBackup, exportBackup } = useNotes();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showFontSizePicker, setShowFontSizePicker] = useState(false);
  const [showLineHeightPicker, setShowLineHeightPicker] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<{ count: number; notebookCount: number; data: any } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportDone, setExportDone] = useState<string | null>(null);

  const FONT_SIZES = ['small', 'medium', 'large', 'xlarge'] as const;
  const FONT_FAMILIES = [
    { id: 'inter', name: 'Inter', desc: 'Clean modern sans-serif' },
    { id: 'serif', name: 'Serif', desc: 'Elegant and readable' },
    { id: 'mono', name: 'Monospace', desc: 'Code-style font' },
    { id: 'dyslexic', name: 'Dyslexia Friendly', desc: 'Accessibility optimized' },
  ];
  const VIEW_MODES = ['list', 'grid', 'compact'] as const;
  const SORT_OPTS = ['modified', 'created', 'title', 'size'] as const;
  const SORT_LABELS: Record<string, string> = {
    modified: 'Last Modified', created: 'Date Created', title: 'Alphabetical', size: 'Size',
  };

  const currentTheme = THEME_OPTIONS.find(t => t.id === appTheme);
  const trashedCount = getTrashedNotes().length;
  const activeNotes = notes.filter(n => !n.isTrashed);

  const handleExport = async (format: 'json' | 'markdown') => {
    if (activeNotes.length === 0) {
      Alert.alert('Nothing to Export', 'You have no notes to export.'); return;
    }
    setIsExporting(true);
    haptic.light();
    try {
      let result;
      if (format === 'json') {
        const bundle = await exportBackup();
        result = await exportNotesToJSON(bundle.notes as any, bundle.notebooks as any, bundle.tags as any, false);
      } else {
        result = await exportAllAsMarkdownZip(activeNotes as any);
      }
      if (result.success) {
        haptic.success();
        Alert.alert('Export Complete ✅', result.message);
      } else {
        Alert.alert('Export Failed', result.message);
      }
    } catch (e: any) {
      Alert.alert('Export Failed', e?.message || 'Unknown error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportOptions = () => {
    if (activeNotes.length === 0) {
      Alert.alert('Nothing to Export', 'You have no notes to export.'); return;
    }
    setShowExportModal(true);
  };

  const handleImport = async () => {
    setIsImporting(true);
    haptic.light();
    try {
      const result = await pickAndImportFile(notebooks as any);
      if (result.type === 'error') {
        Alert.alert('Import Failed', result.error || 'Could not read the file.');
        return;
      }
      if (result.type === 'json' && result.data) {
        const bundle = result.data as any;
        if (bundle.notes && Array.isArray(bundle.notes)) {
          setImportPreview({ count: bundle.notes.length, notebookCount: bundle.notebooks?.length || 0, data: bundle });
          setShowImportModal(true);
        } else {
          Alert.alert('Invalid File', 'This JSON file does not contain a valid Ishu Notes backup.');
        }
      } else if ((result.type === 'markdown' || result.type === 'text') && result.data) {
        const noteData = result.data as any;
        Alert.alert(
          '📄 Import Note',
          `Import "${noteData.title || 'Imported Note'}" as a new note?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Import',
              onPress: async () => {
                await importBackup({
                  version: '1.0', app: 'Ishu Notes', exportedAt: new Date().toISOString(),
                  notes: [{ ...noteData, id: '', notebookId: null, tags: noteData.tags || [], color: 'none', pageBackground: 'none', isPinned: false, isFlagged: false, isArchived: false, isTrashed: false, isLocked: false, isFavorite: false, emoji: null, createdAt: new Date().toISOString(), modifiedAt: new Date().toISOString(), trashedAt: null, wordCount: 0, readingTime: 0, hasHandwriting: false, hasAudio: false, hasImages: false, templateId: 'blank', pageCount: 1 }],
                  notebooks: [], tags: [],
                });
                haptic.success();
                Alert.alert('Imported ✅', 'Note imported successfully!');
              },
            },
          ],
        );
      }
    } catch (e: any) {
      Alert.alert('Import Failed', e?.message || 'Unknown error');
    } finally {
      setIsImporting(false);
    }
  };

  const doExportFormat = async (format: 'json' | 'markdown') => {
    setShowExportModal(false);
    setIsExporting(true);
    setExportDone(null);
    haptic.light();
    try {
      let result;
      if (format === 'json') {
        const bundle = await exportBackup();
        result = await exportNotesToJSON(bundle.notes as any, bundle.notebooks as any, bundle.tags as any, true);
      } else {
        result = await exportAllAsMarkdownZip(activeNotes as any);
      }
      if (result.success) {
        haptic.success();
        setExportDone(result.message);
        setTimeout(() => setExportDone(null), 4000);
      } else {
        Alert.alert('Export Failed', result.message);
      }
    } catch (e: any) {
      Alert.alert('Export Failed', e?.message || 'Unknown error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: topPad + 8, paddingHorizontal: 20, paddingBottom: 16 }}>
        <Text style={{ fontSize: Colors.font.display, fontWeight: '900', color: colors.text }}>
          Settings
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.springify()}>

          {/* Profile card */}
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            marginHorizontal: 16, marginBottom: 24,
            backgroundColor: colors.card, borderRadius: Colors.radius.xl,
            padding: 16, gap: 14,
            borderWidth: 1, borderColor: colors.border,
            shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4,
          }}>
            <View style={{ width: 60, height: 60, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="account" size={32} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: Colors.font.md, fontWeight: '800', color: colors.text }}>Ishu Notes</Text>
              <Text style={{ fontSize: Colors.font.sm, color: colors.textSecondary, marginTop: 2 }}>
                {activeNotes.length} notes · Version 1.0.0
              </Text>
            </View>
            <TouchableOpacity
              style={{ backgroundColor: '#f59e0b', borderRadius: Colors.radius.full, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, gap: 5 }}
              onPress={() => Alert.alert('Ishu Notes Pro', 'Unlock premium features:\n\n• Unlimited AI writing assistant\n• Cloud sync across all devices\n• 200+ premium templates\n• End-to-end encryption\n• Real-time collaboration\n\nComing soon!')}
            >
              <MaterialCommunityIcons name="crown" size={14} color="#fff" />
              <Text style={{ color: '#fff', fontSize: Colors.font.sm, fontWeight: '800' }}>Pro</Text>
            </TouchableOpacity>
          </View>

          {/* Theme */}
          <Section title="🎨 Theme">
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 }}
              onPress={() => { setShowThemePicker(true); haptic.select(); }}
            >
              <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: (currentTheme?.preview || colors.primary) + '20', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name={(currentTheme?.icon || 'palette') as any} size={20} color={currentTheme?.preview || colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: Colors.font.base, fontWeight: '600', color: colors.text }}>App Theme</Text>
                <Text style={{ fontSize: Colors.font.sm, color: colors.textSecondary, marginTop: 1 }}>
                  {currentTheme?.name} · {currentTheme?.description}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 4, marginRight: 4 }}>
                {THEME_OPTIONS.slice(0, 5).map(t => (
                  <View key={t.id} style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: t.preview, borderWidth: appTheme === t.id ? 2 : 0, borderColor: colors.text }} />
                ))}
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </Section>

          {/* Typography */}
          <Section title="✍️ Typography">
            <SettingsItem
              icon="format-size" iconColor="#3b82f6" title="Font Size"
              subtitle={settings.fontSize.charAt(0).toUpperCase() + settings.fontSize.slice(1)}
              onPress={() => { setShowFontSizePicker(true); haptic.select(); }}
            />
            <Divider colors={colors} />
            <SettingsItem
              icon="format-font" iconColor="#8b5cf6" title="Font Family"
              subtitle={FONT_FAMILIES.find(f => f.id === settings.fontFamily)?.name || 'Inter'}
              onPress={() => { setShowFontPicker(true); haptic.select(); }}
            />
            <Divider colors={colors} />
            <SettingsItem
              icon="format-line-spacing" iconColor="#10b981" title="Line Height"
              subtitle={settings.lineHeight.charAt(0).toUpperCase() + settings.lineHeight.slice(1)}
              onPress={() => { setShowLineHeightPicker(true); haptic.select(); }}
            />
          </Section>

          {/* Notes Display */}
          <Section title="📋 Notes Display">
            <SettingsItem
              icon="view-list-outline" iconColor="#6366f1" title="Default View"
              subtitle={settings.noteViewMode.charAt(0).toUpperCase() + settings.noteViewMode.slice(1)}
              onPress={() => { const idx = VIEW_MODES.indexOf(settings.noteViewMode); updateSettings({ noteViewMode: VIEW_MODES[(idx + 1) % VIEW_MODES.length] }); haptic.select(); }}
            />
            <Divider colors={colors} />
            <SettingsItem
              icon="sort-variant" iconColor="#f59e0b" title="Sort Notes By"
              subtitle={SORT_LABELS[settings.sortBy] || 'Last Modified'}
              onPress={() => { const idx = SORT_OPTS.indexOf(settings.sortBy as any); updateSettings({ sortBy: SORT_OPTS[(idx + 1) % SORT_OPTS.length] }); haptic.select(); }}
            />
            <Divider colors={colors} />
            <SettingsItem icon="tag-outline" iconColor="#ec4899" title="Show Tags"
              rightElement={<Switch value={settings.showTags} onValueChange={v => updateSettings({ showTags: v })} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />}
            />
            <Divider colors={colors} />
            <SettingsItem icon="counter" iconColor="#06b6d4" title="Show Word Count"
              rightElement={<Switch value={settings.showWordCount} onValueChange={v => updateSettings({ showWordCount: v })} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />}
            />
            <Divider colors={colors} />
            <SettingsItem icon="clock-fast" iconColor="#10b981" title="Show Reading Time"
              rightElement={<Switch value={settings.showReadingTime} onValueChange={v => updateSettings({ showReadingTime: v })} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />}
            />
          </Section>

          {/* Editor */}
          <Section title="✏️ Editor">
            <SettingsItem icon="content-save-outline" iconColor="#22c55e" title="Auto Save" subtitle="Save notes automatically as you type"
              rightElement={<Switch value={settings.autoSave} onValueChange={v => updateSettings({ autoSave: v })} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />}
            />
            <Divider colors={colors} />
            <SettingsItem icon="language-markdown" iconColor="#6366f1" title="Markdown Support" subtitle="Enable markdown formatting shortcuts"
              rightElement={<Switch value={settings.enableMarkdown} onValueChange={v => updateSettings({ enableMarkdown: v })} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />}
            />
            <Divider colors={colors} />
            <SettingsItem icon="spellcheck" iconColor="#3b82f6" title="Spell Check"
              rightElement={<Switch value={settings.spellCheck} onValueChange={v => updateSettings({ spellCheck: v })} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />}
            />
            <Divider colors={colors} />
            <SettingsItem icon="eye-outline" iconColor="#8b5cf6" title="Focus Mode" subtitle="Distraction-free writing"
              rightElement={<Switch value={settings.focusMode} onValueChange={v => updateSettings({ focusMode: v })} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />}
            />
          </Section>

          {/* Drawing */}
          <Section title="🖊️ Drawing & Canvas">
            <SettingsItem icon="hand-back-left-outline" iconColor="#f59e0b" title="Wrist Rejection" subtitle="Ignore accidental palm touches"
              rightElement={<Switch value={settings.wristRejection} onValueChange={v => updateSettings({ wristRejection: v })} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />}
            />
            <Divider colors={colors} />
            <SettingsItem icon="ruler-square" iconColor="#0d9488" title="Show Ruler"
              rightElement={<Switch value={settings.showRuler} onValueChange={v => updateSettings({ showRuler: v })} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />}
            />
          </Section>

          {/* Interaction */}
          <Section title="📳 Interaction">
            <SettingsItem icon="vibrate" iconColor="#8b5cf6" title="Haptic Feedback"
              rightElement={<Switch value={settings.enableHaptics} onValueChange={v => updateSettings({ enableHaptics: v })} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />}
            />
            <Divider colors={colors} />
            <SettingsItem icon="animation-play" iconColor="#ec4899" title="Animations"
              rightElement={<Switch value={settings.enableAnimations} onValueChange={v => updateSettings({ enableAnimations: v })} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />}
            />
          </Section>

          {/* Data & Storage */}
          <Section title="🗄️ Data & Storage">
            <SettingsItem
              icon="trash-can-outline" iconColor="#f97316" title="Recently Deleted"
              subtitle={`${trashedCount} note${trashedCount !== 1 ? 's' : ''} · kept for 30 days`}
              badge={trashedCount > 0 ? String(trashedCount) : undefined}
              onPress={() => router.push('/notes/trash')}
            />
            <Divider colors={colors} />
            <SettingsItem
              icon="export-variant" iconColor="#3b82f6"
              title={isExporting ? 'Exporting…' : 'Export All Notes'}
              subtitle={exportDone || `${activeNotes.length} note${activeNotes.length !== 1 ? 's' : ''} · JSON, Markdown, or HTML`}
              onPress={isExporting ? undefined : handleExportOptions}
            />
            <Divider colors={colors} />
            <SettingsItem
              icon="import" iconColor="#10b981"
              title={isImporting ? 'Importing…' : 'Import Notes'}
              subtitle="From JSON backup, Markdown, or text files"
              onPress={isImporting ? undefined : handleImport}
            />
            <Divider colors={colors} />
            <SettingsItem
              icon="database-outline" iconColor="#6b7280"
              title="Storage Info"
              subtitle={`${activeNotes.length} active · ${trashedCount} in trash · ${notebooks.length} notebooks`}
            />
          </Section>

          {/* Privacy */}
          <Section title="🔒 Privacy & Security">
            <SettingsItem icon="fingerprint" iconColor="#ef4444" title="Biometric Lock" subtitle="Lock with Face ID or fingerprint"
              rightElement={<Switch value={settings.enableBiometricLock} onValueChange={v => updateSettings({ enableBiometricLock: v })} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />}
            />
            <Divider colors={colors} />
            <SettingsItem
              icon="shield-key-outline" iconColor="#8b5cf6" title="End-to-End Encryption"
              subtitle="Encrypt notes with passphrase (Pro)"
              onPress={() => Alert.alert('E2E Encryption', 'End-to-end encryption is a Pro feature. Upgrade to protect your notes with XChaCha20 encryption.')}
            />
            <Divider colors={colors} />
            <SettingsItem
              icon="shield-check-outline" iconColor="#10b981" title="Privacy Policy"
              subtitle="Your data stays on your device"
              onPress={() => Alert.alert('Privacy', 'Ishu Notes stores all your notes locally on your device. No data is uploaded or shared without your explicit permission.\n\n🔒 Your notes, your data.')}
            />
          </Section>

          {/* Premium */}
          <Section title="⭐ Premium">
            <TouchableOpacity
              style={{ margin: 12, borderRadius: Colors.radius.xl, overflow: 'hidden', backgroundColor: colors.primary }}
              onPress={() => Alert.alert('Ishu Notes Pro', 'Upgrade to unlock:\n\n🤖 Unlimited AI assistant\n☁️ Cloud sync across devices\n📄 200+ premium templates\n🔒 E2E encryption\n👥 Real-time collaboration\n📤 Advanced export formats\n🔖 Unlimited flashcard decks\n\nComing soon!')}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialCommunityIcons name="crown" size={24} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: Colors.font.base }}>Upgrade to Ishu Notes Pro</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: Colors.font.sm, marginTop: 2 }}>AI, sync, encryption, collaboration</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
          </Section>

          {/* About */}
          <Section title="ℹ️ About">
            <SettingsItem icon="information-outline" iconColor="#6b7280" title="Ishu Notes" subtitle="Version 1.0.0 · Expo SDK 54" />
            <Divider colors={colors} />
            <SettingsItem icon="help-circle-outline" iconColor="#3b82f6" title="Help & Support"
              onPress={() => Alert.alert('Support', 'For help:\n📧 support@ishunotes.app\n🌐 docs.ishunotes.app\n\nWe typically respond within 24 hours.')}
            />
            <Divider colors={colors} />
            <SettingsItem icon="star-outline" iconColor="#f59e0b" title="Rate the App"
              onPress={() => Alert.alert('Rate Us', 'Thank you for using Ishu Notes! Rating us helps others discover the app. ⭐⭐⭐⭐⭐')}
            />
            <Divider colors={colors} />
            <SettingsItem
              icon="delete-forever-outline" iconColor="#ef4444" title="Clear All Data" danger
              onPress={() => Alert.alert(
                'Clear All Data',
                'This will permanently delete ALL your notes, notebooks, and settings. This cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Clear Everything', style: 'destructive', onPress: () => Alert.alert('Cleared', 'All data has been cleared.') },
                ],
              )}
            />
          </Section>

          <View style={{ height: Platform.OS === 'web' ? 120 : insets.bottom + 100 }} />
        </Animated.View>
      </ScrollView>

      {/* Theme Picker Modal */}
      <Modal visible={showThemePicker} transparent animationType="slide">
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={() => setShowThemePicker(false)}>
          <Pressable style={{ backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 40 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 }} />
            <Text style={{ fontSize: Colors.font.xl, fontWeight: '800', color: colors.text, marginBottom: 16 }}>Choose Theme</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
              {THEME_OPTIONS.map((t, i) => (
                <Animated.View key={t.id} entering={FadeInDown.delay(i * 30).springify()}>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: Colors.radius.lg, marginBottom: 6, gap: 14, backgroundColor: appTheme === t.id ? colors.primarySoft : 'transparent' }}
                    onPress={() => { updateSettings({ theme: t.id }); haptic.select(); setShowThemePicker(false); }}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: t.preview + '20', alignItems: 'center', justifyContent: 'center' }}>
                      <MaterialCommunityIcons name={t.icon as any} size={22} color={t.preview} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: Colors.font.base, fontWeight: '700', color: colors.text }}>{t.name}</Text>
                      <Text style={{ fontSize: Colors.font.sm, color: colors.textSecondary }}>{t.description}</Text>
                    </View>
                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: t.preview }} />
                    {appTheme === t.id && <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Font Size Picker Modal */}
      <Modal visible={showFontSizePicker} transparent animationType="slide">
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={() => setShowFontSizePicker(false)}>
          <Pressable style={{ backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 40 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 }} />
            <Text style={{ fontSize: Colors.font.xl, fontWeight: '800', color: colors.text, marginBottom: 6 }}>Font Size</Text>
            <Text style={{ fontSize: Colors.font.sm, color: colors.textSecondary, marginBottom: 20 }}>Choose your preferred reading size</Text>
            {([
              { id: 'small', label: 'Small', preview: 13, desc: 'Compact · More content visible' },
              { id: 'medium', label: 'Medium', preview: 16, desc: 'Default · Balanced readability' },
              { id: 'large', label: 'Large', preview: 18, desc: 'Comfortable · Easier to read' },
              { id: 'xlarge', label: 'Extra Large', preview: 20, desc: 'Accessibility · Maximum legibility' },
            ] as const).map((opt, i) => (
              <Animated.View key={opt.id} entering={FadeInDown.delay(i * 40).springify()}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: Colors.radius.lg, marginBottom: 6, backgroundColor: settings.fontSize === opt.id ? colors.primarySoft : colors.inputBg, borderWidth: settings.fontSize === opt.id ? 1.5 : 0, borderColor: colors.primary }}
                  onPress={() => { updateSettings({ fontSize: opt.id }); haptic.select(); setShowFontSizePicker(false); }}
                >
                  <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: settings.fontSize === opt.id ? colors.primary : colors.border, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: opt.preview, fontWeight: '800', color: settings.fontSize === opt.id ? '#fff' : colors.textSecondary }}>Aa</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: Colors.font.base, fontWeight: '700', color: settings.fontSize === opt.id ? colors.primary : colors.text }}>{opt.label}</Text>
                    <Text style={{ fontSize: Colors.font.sm, color: colors.textSecondary, marginTop: 2 }}>{opt.desc}</Text>
                  </View>
                  {settings.fontSize === opt.id && <MaterialCommunityIcons name="check-circle" size={22} color={colors.primary} />}
                </TouchableOpacity>
              </Animated.View>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Line Height Picker Modal */}
      <Modal visible={showLineHeightPicker} transparent animationType="slide">
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={() => setShowLineHeightPicker(false)}>
          <Pressable style={{ backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 40 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 }} />
            <Text style={{ fontSize: Colors.font.xl, fontWeight: '800', color: colors.text, marginBottom: 6 }}>Line Height</Text>
            <Text style={{ fontSize: Colors.font.sm, color: colors.textSecondary, marginBottom: 20 }}>Adjust vertical spacing in the note editor</Text>
            {([
              { id: 'tight', label: 'Tight', multiplier: '1.3×', desc: 'Dense · Poetry, code, lists', lines: 3 },
              { id: 'normal', label: 'Normal', multiplier: '1.6×', desc: 'Default · General writing', lines: 4 },
              { id: 'relaxed', label: 'Relaxed', multiplier: '1.85×', desc: 'Airy · Long-form reading', lines: 5 },
              { id: 'loose', label: 'Loose', multiplier: '2.1×', desc: 'Spacious · Annotations, proofreading', lines: 6 },
            ] as const).map((opt, i) => (
              <Animated.View key={opt.id} entering={FadeInDown.delay(i * 40).springify()}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: Colors.radius.lg, marginBottom: 6, backgroundColor: settings.lineHeight === opt.id ? colors.primarySoft : colors.inputBg, borderWidth: settings.lineHeight === opt.id ? 1.5 : 0, borderColor: colors.primary }}
                  onPress={() => { updateSettings({ lineHeight: opt.id }); haptic.select(); setShowLineHeightPicker(false); }}
                >
                  <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: settings.lineHeight === opt.id ? colors.primary + '18' : colors.border + '50', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    {Array.from({ length: Math.min(opt.lines, 4) }).map((_, li) => (
                      <View key={li} style={{ width: 30, height: 2, borderRadius: 1, backgroundColor: settings.lineHeight === opt.id ? colors.primary : colors.textMuted }} />
                    ))}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: Colors.font.base, fontWeight: '700', color: settings.lineHeight === opt.id ? colors.primary : colors.text }}>{opt.label}</Text>
                      <View style={{ backgroundColor: colors.inputBg, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }}>{opt.multiplier}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: Colors.font.sm, color: colors.textSecondary, marginTop: 2 }}>{opt.desc}</Text>
                  </View>
                  {settings.lineHeight === opt.id && <MaterialCommunityIcons name="check-circle" size={22} color={colors.primary} />}
                </TouchableOpacity>
              </Animated.View>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Font Picker Modal */}
      <Modal visible={showFontPicker} transparent animationType="slide">
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={() => setShowFontPicker(false)}>
          <Pressable style={{ backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 40 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 }} />
            <Text style={{ fontSize: Colors.font.xl, fontWeight: '800', color: colors.text, marginBottom: 16 }}>Font Family</Text>
            {FONT_FAMILIES.map((f, i) => (
              <Animated.View key={f.id} entering={FadeInDown.delay(i * 50).springify()}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14, borderRadius: Colors.radius.lg, marginBottom: 6, backgroundColor: settings.fontFamily === f.id ? colors.primarySoft : 'transparent' }}
                  onPress={() => { updateSettings({ fontFamily: f.id as AppSettings['fontFamily'] }); haptic.select(); setShowFontPicker(false); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: Colors.font.lg, fontWeight: '700', color: colors.text }}>{f.name}</Text>
                    <Text style={{ fontSize: Colors.font.sm, color: colors.textSecondary }}>{f.desc}</Text>
                  </View>
                  {settings.fontFamily === f.id && <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />}
                </TouchableOpacity>
              </Animated.View>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Export Modal */}
      <Modal visible={showExportModal} transparent animationType="slide">
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }} onPress={() => setShowExportModal(false)}>
          <Pressable style={{ backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 48 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ fontSize: Colors.font.xl, fontWeight: '900', color: colors.text, marginBottom: 4 }}>Export Notes</Text>
            <Text style={{ fontSize: Colors.font.sm, color: colors.textSecondary, marginBottom: 20 }}>
              {activeNotes.length} note{activeNotes.length !== 1 ? 's' : ''} will be exported
            </Text>

            {[
              {
                format: 'json' as const,
                icon: 'database-export-outline', color: '#3b82f6',
                title: 'JSON Backup', badge: 'Recommended',
                desc: 'Full backup including notebooks, tags, and handwriting strokes. Import back anytime.',
              },
              {
                format: 'markdown' as const,
                icon: 'language-markdown-outline', color: '#8b5cf6',
                title: 'Markdown (.txt)',
                desc: 'All notes as Markdown text — compatible with Obsidian, Notion, and any text editor.',
              },
            ].map((opt, i) => (
              <Animated.View key={opt.format} entering={FadeInDown.delay(i * 60).springify()}>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 14,
                    padding: 16, borderRadius: 18, marginBottom: 10,
                    backgroundColor: colors.inputBg,
                    borderWidth: 1, borderColor: colors.border,
                  }}
                  onPress={() => doExportFormat(opt.format)}
                  activeOpacity={0.8}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: opt.color + '18', alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialCommunityIcons name={opt.icon as any} size={24} color={opt.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <Text style={{ fontSize: Colors.font.base, fontWeight: '800', color: colors.text }}>{opt.title}</Text>
                      {opt.badge && (
                        <View style={{ backgroundColor: opt.color + '20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: opt.color }}>{opt.badge}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: Colors.font.sm, color: colors.textSecondary, lineHeight: 18 }}>{opt.desc}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </Animated.View>
            ))}

            <TouchableOpacity
              style={{ alignItems: 'center', paddingVertical: 14, marginTop: 4 }}
              onPress={() => setShowExportModal(false)}
            >
              <Text style={{ fontSize: Colors.font.base, color: colors.textMuted, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Import Preview Modal */}
      <Modal visible={showImportModal} transparent animationType="slide">
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }} onPress={() => setShowImportModal(false)}>
          <Pressable style={{ backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 48 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20 }} />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: '#10b98118', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="file-import-outline" size={28} color="#10b981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: Colors.font.xl, fontWeight: '900', color: colors.text }}>Import Backup</Text>
                <Text style={{ fontSize: Colors.font.sm, color: colors.textSecondary, marginTop: 2 }}>Review before importing</Text>
              </View>
            </View>

            {importPreview && (
              <View style={{ backgroundColor: colors.inputBg, borderRadius: 16, padding: 16, marginBottom: 20, gap: 10 }}>
                {[
                  { icon: 'note-text-outline', color: '#3b82f6', label: 'Notes', value: importPreview.count },
                  { icon: 'notebook-outline', color: '#8b5cf6', label: 'Notebooks', value: importPreview.notebookCount },
                ].map(row => (
                  <View key={row.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <MaterialCommunityIcons name={row.icon as any} size={20} color={row.color} />
                    <Text style={{ flex: 1, fontSize: Colors.font.base, color: colors.text, fontWeight: '600' }}>{row.label}</Text>
                    <View style={{ backgroundColor: row.color + '18', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 }}>
                      <Text style={{ fontSize: Colors.font.base, fontWeight: '800', color: row.color }}>{row.value}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <Text style={{ fontSize: Colors.font.sm, color: colors.textMuted, marginBottom: 20, lineHeight: 20 }}>
              ⚠️ Imported notes will be added alongside your existing notes. Nothing will be deleted.
            </Text>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{ flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14, backgroundColor: colors.inputBg }}
                onPress={() => { setShowImportModal(false); setImportPreview(null); }}
              >
                <Text style={{ fontWeight: '700', color: colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 2, alignItems: 'center', paddingVertical: 14, borderRadius: 14, backgroundColor: '#10b981', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                onPress={async () => {
                  if (!importPreview) return;
                  setShowImportModal(false);
                  const { imported, errors } = await importBackup(importPreview.data);
                  setImportPreview(null);
                  haptic.success();
                  Alert.alert(
                    'Import Complete ✅',
                    `${imported} note${imported !== 1 ? 's' : ''} imported!${errors > 0 ? `\n${errors} item${errors !== 1 ? 's' : ''} skipped.` : ''}`,
                  );
                }}
              >
                <MaterialCommunityIcons name="import" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: Colors.font.base }}>Import All</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
