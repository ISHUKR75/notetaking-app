import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/colors';

interface TagBadgeProps {
  tag: string;
  color?: string;
  onPress?: () => void;
  onRemove?: () => void;
  size?: 'sm' | 'md';
}

export function TagBadge({ tag, color, onPress, onRemove, size = 'md' }: TagBadgeProps) {
  const { colors } = useTheme();
  const bg = color ? color + '22' : colors.primarySoft;
  const textColor = color || colors.primary;
  const s = styles(colors);
  return (
    <TouchableOpacity
      style={[s.badge, { backgroundColor: bg }, size === 'sm' && s.badgeSm]}
      onPress={onPress}
      disabled={!onPress && !onRemove}
    >
      <Text style={[s.text, { color: textColor }, size === 'sm' && s.textSm]}>#{tag}</Text>
    </TouchableOpacity>
  );
}

const styles = (colors: typeof Colors.light) => StyleSheet.create({
  badge: {
    borderRadius: Colors.radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
    flexDirection: 'row', alignItems: 'center',
  },
  badgeSm: { paddingHorizontal: 7, paddingVertical: 2 },
  text: { fontSize: Colors.font.sm, fontWeight: '500' },
  textSm: { fontSize: 11 },
});
