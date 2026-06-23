import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/colors';

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  const { colors } = useTheme();
  const s = styles(colors);
  return (
    <View style={s.container}>
      <View style={s.iconContainer}>
        <MaterialCommunityIcons name={icon as any} size={52} color={colors.textMuted} />
      </View>
      <Text style={s.title}>{title}</Text>
      {description && <Text style={s.description}>{description}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity style={s.action} onPress={onAction}>
          <Text style={s.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = (colors: typeof Colors.light) => StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  iconContainer: {
    width: 96, height: 96, borderRadius: 28,
    backgroundColor: colors.inputBg,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: Colors.font.lg, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 8 },
  description: { fontSize: Colors.font.base, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  action: {
    marginTop: 24, backgroundColor: colors.primary,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: Colors.radius.full,
  },
  actionText: { color: '#fff', fontWeight: '600', fontSize: Colors.font.base },
});
