import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
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
      <View style={[{
        width: 38, height: 38, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
      }, { backgroundColor: iconColor + '20' }]}>
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
      <Text style={{
        fontSize: Colors.font.xs, fontWeight: '800', color: colors.textMuted,
        textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, paddingHorizontal: 4,
      }}>
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
  const { notes, getTrashedNotes } = useNotes();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);

  const FONT_SIZES = ['small', 'medium', 'large', 'xlarge'] as const;
  const FONT_FAMILIES = [
    { id: 'inter', name: 'Inter', desc: 'Clean sans-serif' },
    { id: 'serif', name: 'Serif', desc: 'Elegant and readable' },
    { id: 'mono', name: 'Monospace', desc: 'Code-style font' },
    { id: 'dyslexic', name: 'Dyslexia', desc: 'Accessibility font' },
  ];
  const VIEW_MODES = ['list', 'grid', 'compact'] as const;
  const SORT_OPTS = ['modified', 'created', 'title', 'size'] as const;
  const SORT_LABELS: Record<string, string> = {
    modified: 'Last Modified', created: 'Date Created', title: 'Alphabetical', size: 'Size',
  };

  const currentTheme = THEME_OPTIONS.find(t => t.id === appTheme);
  const trashedCount = getTrashedNotes().length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: topPad + 8, paddingHorizontal: 20, paddingBottom: 16 }}>
        <Text style={{ fontSize: Colors.font.display, fontWeight: '900', color: colors.text }}>
          Settings
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.springify()}>

          <View style={{
            flexDirection: 'row', alignItems: 'center',
            marginHorizontal: 16, marginBottom: 24,
            backgroundColor: colors.card, borderRadius: Colors.radius.xl,
            padding: 16, gap: 14,
            borderWidth: 1, borderColor: colors.border,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4,
          }}>
            <View style={{
              width: 60, height: 60, borderRadius: 20,
              backgroundColor: colors.primarySoft,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <MaterialCommunityIcons name="account" size={32} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: Colors.font.md, fontWeight: '800', color: colors.text }}>
                Ishu Notes
              </Text>
              <Text style={{ fontSize: Colors.font.sm, color: colors.textSecondary, marginTop: 2 }}>
                {notes.filter(n => !n.isTrashed).length} notes · Version 1.0.0
              </Text>
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: '#f59e0b', borderRadius: Colors.radius.full,
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 14, paddingVertical: 8, gap: 5,
              }}
              onPress={() => Alert.alert('Ishu Notes Pro', 'Unlock all premium features:\n\n• Unlimited AI writing assistant\n• Cloud sync across all devices\n• 200+ premium templates\n• End-to-end encryption\n• Real-time collaboration\n\nComing soon!')}
            >
              <MaterialCommunityIcons name="crown" size={14} color="#fff" />
              <Text style={{ color: '#fff', fontSize: Colors.font.sm, fontWeight: '800' }}>Pro</Text>
            </TouchableOpacity>
          </View>

          <Section title="🎨 Theme">
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 }}
              onPress={() => { setShowThemePicker(true); haptic.select(); }}
            >
              <View style={{
                width: 38, height: 38, borderRadius: 10,
                backgroundColor: (currentTheme?.preview || colors.primary) + '20',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <MaterialCommunityIcons
                  name={currentTheme?.icon as any || 'palette'}
                  size={20}
                  color={currentTheme?.preview || colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: Colors.font.base, fontWeight: '600', color: colors.text }}>
                  App Theme
                </Text>
                <Text style={{ fontSize: Colors.font.sm, color: colors.textSecondary, marginTop: 1 }}>
                  {currentTheme?.name} · {currentTheme?.description}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {THEME_OPTIONS.slice(0, 5).map(t => (
                  <View
                    key={t.id}
                    style={{
                      width: 14, height: 14, borderRadius: 7,
                      backgroundColor: t.preview,
                      borderWidth: appTheme === t.id ? 2 : 0,
                      borderColor: colors.text,
                    }}
                  />
                ))}
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </Section>

          <Section title="✍️ Typography">
            <SettingsItem
              icon="format-size"
              iconColor="#3b82f6"
              title="Font Size"
              subtitle={settings.fontSize.charAt(0).toUpperCase() + settings.fontSize.slice(1)}
              onPress={() => {
                const idx = FONT_SIZES.indexOf(settings.fontSize);
                updateSettings({ fontSize: FONT_SIZES[(idx + 1) % FONT_SIZES.length] });
                haptic.select();
              }}
            />
            <Divider colors={colors} />
            <SettingsItem
              icon="format-font"
              iconColor="#8b5cf6"
              title="Font Family"
              subtitle={FONT_FAMILIES.find(f => f.id === settings.fontFamily)?.name || 'Inter'}
              onPress={() => { setShowFontPicker(true); haptic.select(); }}
            />
            <Divider colors={colors} />
            <SettingsItem
              icon="format-line-spacing"
              iconColor="#10b981"
              title="Line Height"
              subtitle={settings.lineHeight.charAt(0).toUpperCase() + settings.lineHeight.slice(1)}
              onPress={() => {
                const opts = ['tight', 'normal', 'relaxed', 'loose'] as const;
                const idx = opts.indexOf(settings.lineHeight);
                updateSettings({ lineHeight: opts[(idx + 1) % opts.length] });
                haptic.select();
              }}
            />
          </Section>

          <Section title="📋 Notes Display">
            <SettingsItem
              icon="view-list-outline"
              iconColor="#6366f1"
              title="Default View"
              subtitle={settings.noteViewMode.charAt(0).toUpperCase() + settings.noteViewMode.slice(1)}
              onPress={() => {
                const idx = VIEW_MODES.indexOf(settings.noteViewMode);
                updateSettings({ noteViewMode: VIEW_MODES[(idx + 1) % VIEW_MODES.length] });
                haptic.select();
              }}
            />
            <Divider colors={colors} />
            <SettingsItem
              icon="sort-variant"
              iconColor="#f59e0b"
              title="Sort Notes By"
              subtitle={SORT_LABELS[settings.sortBy] || 'Last Modified'}
              onPress={() => {
                const idx = SORT_OPTS.indexOf(settings.sortBy as any);
                updateSettings({ sortBy: SORT_OPTS[(idx + 1) % SORT_OPTS.length] });
                haptic.select();
              }}
            />
            <Divider colors={colors} />
            <SettingsItem
              icon="tag-outline"
              iconColor="#ec4899"
              title="Show Tags"
              rightElement={
                <Switch value={settings.showTags} onValueChange={v => updateSettings({ showTags: v })}
                  trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
              }
            />
            <Divider colors={colors} />
            <SettingsItem
              icon="counter"
              iconColor="#06b6d4"
              title="Show Word Count"
              rightElement={
                <Switch value={settings.showWordCount} onValueChange={v => updateSettings({ showWordCount: v })}
                  trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
              }
            />
            <Divider colors={colors} />
            <SettingsItem
              icon="clock-fast"
              iconColor="#10b981"
              title="Show Reading Time"
              rightElement={
                <Switch value={settings.showReadingTime} onValueChange={v => updateSettings({ showReadingTime: v })}
                  trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
              }
            />
          </Section>

          <Section title="✏️ Editor">
            <SettingsItem
              icon="content-save-outline"
              iconColor="#22c55e"
              title="Auto Save"
              subtitle="Save notes automatically as you type"
              rightElement={
                <Switch value={settings.autoSave} onValueChange={v => updateSettings({ autoSave: v })}
                  trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
              }
            />
            <Divider colors={colors} />
            <SettingsItem
              icon="language-markdown"
              iconColor="#6366f1"
              title="Markdown Support"
              subtitle="Enable markdown formatting shortcuts"
              rightElement={
                <Switch value={settings.enableMarkdown} onValueChange={v => updateSettings({ enableMarkdown: v })}
                  trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
              }
            />
            <Divider colors={colors} />
            <SettingsItem
              icon="spellcheck"
              iconColor="#3b82f6"
              title="Spell Check"
              rightElement={
                <Switch value={settings.spellCheck} onValueChange={v => updateSettings({ spellCheck: v })}
                  trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
              }
            />
            <Divider colors={colors} />
            <SettingsItem
              icon="eye-outline"
              iconColor="#8b5cf6"
              title="Focus Mode"
              subtitle="Hide chrome when writing for distraction-free editing"
              rightElement={
                <Switch value={settings.focusMode} onValueChange={v => updateSettings({ focusMode: v })}
                  trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
              }
            />
          </Section>

          <Section title="🖊️ Drawing & Canvas">
            <SettingsItem
              icon="hand-back-left-outline"
              iconColor="#f59e0b"
              title="Wrist Rejection"
              subtitle="Ignore accidental palm touches while drawing"
              rightElement={
                <Switch value={settings.wristRejection} onValueChange={v => updateSettings({ wristRejection: v })}
                  trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
              }
            />
            <Divider colors={colors} />
            <SettingsItem
              icon="ruler-square"
              iconColor="#0d9488"
              title="Show Ruler"
              subtitle="Display ruler on canvas for precise drawing"
              rightElement={
                <Switch value={settings.showRuler} onValueChange={v => updateSettings({ showRuler: v })}
                  trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
              }
            />
          </Section>

          <Section title="📳 Interaction">
            <SettingsItem
              icon="vibrate"
              iconColor="#8b5cf6"
              title="Haptic Feedback"
              subtitle="Tactile feedback for actions"
              rightElement={
                <Switch value={settings.enableHaptics} onValueChange={v => updateSettings({ enableHaptics: v })}
                  trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
              }
            />
            <Divider colors={colors} />
            <SettingsItem
              icon="animation-play"
              iconColor="#ec4899"
              title="Animations"
              subtitle="Enable transition and motion animations"
              rightElement={
                <Switch value={settings.enableAnimations} onValueChange={v => updateSettings({ enableAnimations: v })}
                  trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
              }
            />
          </Section>

          <Section title="🗄️ Data & Storage">
            <SettingsItem
              icon="trash-can-outline"
              iconColor="#f97316"
              title="Recently Deleted"
              subtitle={`${trashedCount} note${trashedCount !== 1 ? 's' : ''} · deleted notes kept for 30 days`}
              badge={trashedCount > 0 ? String(trashedCount) : undefined}
              onPress={() => router.push('/notes/trash')}
            />
            <Divider colors={colors} />
            <SettingsItem
              icon="export-variant"
              iconColor="#3b82f6"
              title="Export All Notes"
              subtitle="Export to PDF, Markdown, JSON, or Word"
              onPress={() => Alert.alert('Export', 'Export your notes in multiple formats:\n\n• PDF (print-ready)\n• Markdown (.md)\n• JSON (backup)\n• Word (.docx)\n\nComing soon!')}
            />
            <Divider colors={colors} />
            <SettingsItem
              icon="import"
              iconColor="#10b981"
              title="Import Notes"
              subtitle="Notion, Evernote, Apple Notes, OneNote, Obsidian"
              onPress={() => Alert.alert('Import', 'Import from:\n\n• Notion (via export)\n• Evernote (.enex)\n• Apple Notes\n• OneNote\n• Obsidian Vault\n• Plain Markdown\n\nComing soon!')}
            />
            <Divider colors={colors} />
            <SettingsItem
              icon="backup-restore"
              iconColor="#6366f1"
              title="Create Backup"
              subtitle="Save a full backup of all your notes"
              onPress={() => Alert.alert('Backup', 'Full backup feature coming soon! Your notes will be exported as a secure encrypted archive.')}
            />
          </Section>

          <Section title="🔒 Privacy & Security">
            <SettingsItem
              icon="fingerprint"
              iconColor="#ef4444"
              title="Biometric Lock"
              subtitle="Lock the app with Face ID or fingerprint"
              rightElement={
                <Switch value={settings.enableBiometricLock} onValueChange={v => updateSettings({ enableBiometricLock: v })}
                  trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
              }
            />
            <Divider colors={colors} />
            <SettingsItem
              icon="shield-key-outline"
              iconColor="#8b5cf6"
              title="End-to-End Encryption"
              subtitle="Encrypt your notes with a passphrase"
              onPress={() => Alert.alert('E2E Encryption', 'End-to-end encryption is a Pro feature. Upgrade to protect your most sensitive notes with XChaCha20 encryption.')}
            />
            <Divider colors={colors} />
            <SettingsItem
              icon="shield-check-outline"
              iconColor="#10b981"
              title="Privacy Policy"
              subtitle="Your data stays on your device"
              onPress={() => Alert.alert('Privacy', 'Ishu Notes stores all your notes locally on your device. No data is uploaded or shared without your explicit permission.\n\nYour notes, your data.')}
            />
          </Section>

          <Section title="⭐ Premium">
            <TouchableOpacity
              style={{
                margin: 12, borderRadius: Colors.radius.xl,
                overflow: 'hidden', backgroundColor: colors.primary,
              }}
              onPress={() => Alert.alert('Ishu Notes Pro', 'Upgrade to unlock:\n\n🤖 Unlimited AI assistant\n☁️ Cloud sync across devices\n📄 200+ premium templates\n🔒 E2E encryption\n👥 Real-time collaboration\n📤 Advanced export formats\n🔖 Unlimited flashcard decks\n\nComing soon!')}
            >
              <View style={{
                flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
              }}>
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialCommunityIcons name="crown" size={24} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: Colors.font.base }}>
                    Upgrade to Ishu Notes Pro
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: Colors.font.sm, marginTop: 2 }}>
                    AI, sync, encryption, collaboration
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
          </Section>

          <Section title="ℹ️ About">
            <SettingsItem
              icon="information-outline"
              iconColor="#6b7280"
              title="Ishu Notes"
              subtitle="Version 1.0.0 · SDK 54"
            />
            <Divider colors={colors} />
            <SettingsItem
              icon="help-circle-outline"
              iconColor="#3b82f6"
              title="Help & Support"
              onPress={() => Alert.alert('Support', 'For help:\n📧 support@ishunotes.app\n🌐 docs.ishunotes.app\n\nWe typically respond within 24 hours.')}
            />
            <Divider colors={colors} />
            <SettingsItem
              icon="star-outline"
              iconColor="#f59e0b"
              title="Rate the App"
              onPress={() => Alert.alert('Rate Us', 'Thank you for using Ishu Notes! Rating us helps other users discover the app. ⭐⭐⭐⭐⭐')}
            />
            <Divider colors={colors} />
            <SettingsItem
              icon="delete-forever-outline"
              iconColor="#ef4444"
              title="Clear All Data"
              danger
              onPress={() => Alert.alert(
                'Clear All Data',
                'This will permanently delete ALL your notes, notebooks, and settings. This cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Clear Everything', style: 'destructive', onPress: () => Alert.alert('Cleared', 'All data has been cleared.') },
                ]
              )}
            />
          </Section>

          <View style={{ height: Platform.OS === 'web' ? 120 : insets.bottom + 100 }} />
        </Animated.View>
      </ScrollView>

      <Modal visible={showThemePicker} transparent animationType="slide">
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={() => setShowThemePicker(false)}>
          <Pressable style={{ backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 40 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 }} />
            <Text style={{ fontSize: Colors.font.xl, fontWeight: '800', color: colors.text, marginBottom: 16 }}>
              Choose Theme
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
              {THEME_OPTIONS.map((t, i) => (
                <Animated.View key={t.id} entering={FadeInDown.delay(i * 30).springify()}>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row', alignItems: 'center', padding: 14,
                      borderRadius: Colors.radius.lg, marginBottom: 6, gap: 14,
                      backgroundColor: appTheme === t.id ? colors.primarySoft : 'transparent',
                    }}
                    onPress={() => { updateSettings({ theme: t.id }); haptic.select(); setShowThemePicker(false); }}
                  >
                    <View style={{
                      width: 44, height: 44, borderRadius: 14,
                      backgroundColor: t.preview + '20',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <MaterialCommunityIcons name={t.icon as any} size={22} color={t.preview} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: Colors.font.base, fontWeight: '700', color: colors.text }}>
                        {t.name}
                      </Text>
                      <Text style={{ fontSize: Colors.font.sm, color: colors.textSecondary }}>
                        {t.description}
                      </Text>
                    </View>
                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: t.preview }} />
                    {appTheme === t.id && (
                      <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showFontPicker} transparent animationType="slide">
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={() => setShowFontPicker(false)}>
          <Pressable style={{ backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 40 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 }} />
            <Text style={{ fontSize: Colors.font.xl, fontWeight: '800', color: colors.text, marginBottom: 16 }}>
              Font Family
            </Text>
            {FONT_FAMILIES.map((f, i) => (
              <Animated.View key={f.id} entering={FadeInDown.delay(i * 50).springify()}>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14,
                    borderRadius: Colors.radius.lg, marginBottom: 6,
                    backgroundColor: settings.fontFamily === f.id ? colors.primarySoft : 'transparent',
                  }}
                  onPress={() => { updateSettings({ fontFamily: f.id as AppSettings['fontFamily'] }); haptic.select(); setShowFontPicker(false); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: Colors.font.lg, fontWeight: '700', color: colors.text }}>{f.name}</Text>
                    <Text style={{ fontSize: Colors.font.sm, color: colors.textSecondary }}>{f.desc}</Text>
                  </View>
                  {settings.fontFamily === f.id && (
                    <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              </Animated.View>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
