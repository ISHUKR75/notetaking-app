import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { haptic } from '../../src/utils/haptics';
import { useTheme } from '../../src/context/ThemeContext';
import { useNotes } from '../../src/context/NotesContext';
import { Colors } from '../../src/constants/colors';

interface SettingsItemProps {
  icon: string;
  iconColor: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}

function SettingsItem({ icon, iconColor, title, subtitle, onPress, rightElement, danger }: SettingsItemProps) {
  const { colors } = useTheme();
  const s = itemStyles(colors);
  return (
    <TouchableOpacity style={s.item} onPress={onPress} disabled={!onPress && !rightElement}>
      <View style={[s.iconBg, { backgroundColor: iconColor + '22' }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color={iconColor} />
      </View>
      <View style={s.itemText}>
        <Text style={[s.itemTitle, danger && { color: colors.error }]}>{title}</Text>
        {subtitle && <Text style={s.itemSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement || (onPress && <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />)}
    </TouchableOpacity>
  );
}

const itemStyles = (colors: typeof Colors.light) => StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14 },
  iconBg: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemText: { flex: 1 },
  itemTitle: { fontSize: Colors.font.base, fontWeight: '500', color: colors.text },
  itemSubtitle: { fontSize: Colors.font.sm, color: colors.textSecondary, marginTop: 1 },
});

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  const s = sectionStyles(colors);
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.card}>{children}</View>
    </View>
  );
}

const sectionStyles = (colors: typeof Colors.light) => StyleSheet.create({
  section: { marginBottom: 24, paddingHorizontal: 16 },
  sectionTitle: { fontSize: Colors.font.sm, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, paddingHorizontal: 4 },
  card: { backgroundColor: colors.card, borderRadius: Colors.radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
});

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, settings, updateSettings, isDark } = useTheme();
  const { notes, getTrashedNotes } = useNotes();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const s = styles(colors);

  const themeOptions: { id: 'light' | 'dark' | 'system'; label: string; icon: string }[] = [
    { id: 'light', label: 'Light', icon: 'white-balance-sunny' },
    { id: 'dark', label: 'Dark', icon: 'weather-night' },
    { id: 'system', label: 'System', icon: 'theme-light-dark' },
  ];

  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Text style={s.headerTitle}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
        <View style={s.profileCard}>
          <View style={[s.avatar, { backgroundColor: colors.primarySoft }]}>
            <MaterialCommunityIcons name="account" size={36} color={colors.primary} />
          </View>
          <View>
            <Text style={s.profileName}>Ishu Notes User</Text>
            <Text style={s.profileMeta}>{notes.filter(n => !n.isTrashed).length} notes · Free Plan</Text>
          </View>
          <TouchableOpacity style={[s.upgradeBtn, { backgroundColor: colors.primary }]}>
            <MaterialCommunityIcons name="crown" size={14} color="#fff" />
            <Text style={s.upgradeText}>Pro</Text>
          </TouchableOpacity>
        </View>

        <SettingsSection title="Appearance">
          <View style={s.themeRow}>
            {themeOptions.map(opt => (
              <TouchableOpacity
                key={opt.id}
                style={[s.themeBtn, settings.theme === opt.id && s.themeBtnActive]}
                onPress={() => { updateSettings({ theme: opt.id }); haptic.select(); }}
              >
                <MaterialCommunityIcons
                  name={opt.icon as any}
                  size={20}
                  color={settings.theme === opt.id ? '#fff' : colors.textSecondary}
                />
                <Text style={[s.themeBtnText, settings.theme === opt.id && { color: '#fff' }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <SettingsItem
            icon="format-size"
            iconColor="#3b82f6"
            title="Font Size"
            subtitle={settings.fontSize.charAt(0).toUpperCase() + settings.fontSize.slice(1)}
            onPress={() => {
              const sizes: ('small' | 'medium' | 'large')[] = ['small', 'medium', 'large'];
              const idx = sizes.indexOf(settings.fontSize);
              updateSettings({ fontSize: sizes[(idx + 1) % 3] });
            }}
          />
        </SettingsSection>

        <SettingsSection title="Notes">
          <SettingsItem
            icon="view-grid-outline"
            iconColor="#8b5cf6"
            title="Default View"
            subtitle={settings.noteViewMode === 'grid' ? 'Grid' : 'List'}
            onPress={() => updateSettings({ noteViewMode: settings.noteViewMode === 'grid' ? 'list' : 'grid' })}
          />
          <SettingsItem
            icon="sort-variant"
            iconColor="#10b981"
            title="Sort Notes By"
            subtitle={settings.sortBy === 'modified' ? 'Last Modified' : settings.sortBy === 'created' ? 'Date Created' : 'Alphabetical'}
            onPress={() => {
              const opts: ('modified' | 'created' | 'title')[] = ['modified', 'created', 'title'];
              const idx = opts.indexOf(settings.sortBy);
              updateSettings({ sortBy: opts[(idx + 1) % 3] });
            }}
          />
          <SettingsItem
            icon="tag-outline"
            iconColor="#f59e0b"
            title="Show Tags"
            rightElement={
              <Switch
                value={settings.showTags}
                onValueChange={v => updateSettings({ showTags: v })}
                trackColor={{ true: colors.primary }}
              />
            }
          />
          <SettingsItem
            icon="counter"
            iconColor="#06b6d4"
            title="Show Word Count"
            rightElement={
              <Switch
                value={settings.showWordCount}
                onValueChange={v => updateSettings({ showWordCount: v })}
                trackColor={{ true: colors.primary }}
              />
            }
          />
          <SettingsItem
            icon="content-save-outline"
            iconColor="#22c55e"
            title="Auto Save"
            rightElement={
              <Switch
                value={settings.autoSave}
                onValueChange={v => updateSettings({ autoSave: v })}
                trackColor={{ true: colors.primary }}
              />
            }
          />
          <SettingsItem
            icon="spellcheck"
            iconColor="#3b82f6"
            title="Spell Check"
            rightElement={
              <Switch
                value={settings.spellCheck}
                onValueChange={v => updateSettings({ spellCheck: v })}
                trackColor={{ true: colors.primary }}
              />
            }
          />
        </SettingsSection>

        <SettingsSection title="Interaction">
          <SettingsItem
            icon="vibrate"
            iconColor="#8b5cf6"
            title="Haptic Feedback"
            rightElement={
              <Switch
                value={settings.enableHaptics}
                onValueChange={v => updateSettings({ enableHaptics: v })}
                trackColor={{ true: colors.primary }}
              />
            }
          />
          <SettingsItem
            icon="animation"
            iconColor="#ec4899"
            title="Animations"
            rightElement={
              <Switch
                value={settings.enableAnimations}
                onValueChange={v => updateSettings({ enableAnimations: v })}
                trackColor={{ true: colors.primary }}
              />
            }
          />
        </SettingsSection>

        <SettingsSection title="Data">
          <SettingsItem
            icon="trash-can-outline"
            iconColor="#f97316"
            title="Recently Deleted"
            subtitle={`${getTrashedNotes().length} notes`}
            onPress={() => router.push('/notes/trash')}
          />
          <SettingsItem
            icon="export-variant"
            iconColor="#3b82f6"
            title="Export All Notes"
            onPress={() => Alert.alert('Export', 'Export feature coming soon! Export to PDF, Markdown, or JSON.')}
          />
          <SettingsItem
            icon="import"
            iconColor="#10b981"
            title="Import Notes"
            onPress={() => Alert.alert('Import', 'Import from Notion, Evernote, Apple Notes, OneNote coming soon!')}
          />
        </SettingsSection>

        <SettingsSection title="Premium">
          <SettingsItem
            icon="crown-outline"
            iconColor="#f59e0b"
            title="Upgrade to Pro"
            subtitle="Unlimited AI, cloud sync, advanced templates"
            onPress={() => Alert.alert('Ishu Notes Pro', 'Unlock all premium features:\n\n• Unlimited AI writing assistant\n• Cloud sync across devices\n• 100+ premium templates\n• End-to-end encryption\n• Collaboration features\n\nComing soon!')}
          />
        </SettingsSection>

        <SettingsSection title="About">
          <SettingsItem
            icon="information-outline"
            iconColor="#6b7280"
            title="Version"
            subtitle="Ishu Notes 1.0.0"
          />
          <SettingsItem
            icon="shield-check-outline"
            iconColor="#10b981"
            title="Privacy Policy"
            onPress={() => Alert.alert('Privacy', 'Your notes are stored locally on your device. No data is shared without your permission.')}
          />
          <SettingsItem
            icon="help-circle-outline"
            iconColor="#3b82f6"
            title="Help & Support"
            onPress={() => Alert.alert('Support', 'For help, visit our documentation or contact support@ishunotes.app')}
          />
        </SettingsSection>

        <View style={{ height: Platform.OS === 'web' ? 34 + 84 : insets.bottom + 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = (colors: typeof Colors.light) => StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: { fontSize: Colors.font.xxxl, fontWeight: '800', color: colors.text },
  list: { paddingTop: 8 },
  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 24,
    backgroundColor: colors.card, borderRadius: Colors.radius.xl,
    padding: 16, gap: 14,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8,
  },
  avatar: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  profileName: { fontSize: Colors.font.md, fontWeight: '700', color: colors.text },
  profileMeta: { fontSize: Colors.font.sm, color: colors.textSecondary, marginTop: 2 },
  upgradeBtn: {
    marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: Colors.radius.full,
  },
  upgradeText: { color: '#fff', fontSize: Colors.font.sm, fontWeight: '700' },
  themeRow: { flexDirection: 'row', padding: 10, gap: 8 },
  themeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 10, borderRadius: Colors.radius.md,
    backgroundColor: colors.inputBg,
  },
  themeBtnActive: { backgroundColor: colors.primary },
  themeBtnText: { fontSize: Colors.font.sm, fontWeight: '600', color: colors.textSecondary },
});
