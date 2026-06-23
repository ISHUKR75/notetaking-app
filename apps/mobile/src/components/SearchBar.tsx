import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../constants/colors';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchBar({ value, onChangeText, onClear, placeholder = 'Search notes...', autoFocus }: SearchBarProps) {
  const { colors } = useTheme();
  const s = styles(colors);
  return (
    <View style={s.container}>
      <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} style={s.icon} />
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoFocus={autoFocus}
        returnKeyType="search"
        clearButtonMode="never"
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={onClear} style={s.clearBtn}>
          <MaterialCommunityIcons name="close-circle" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = (colors: typeof Colors.light) => StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: Colors.radius.full,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  icon: { marginRight: 8 },
  input: { flex: 1, fontSize: Colors.font.base, color: colors.text },
  clearBtn: { padding: 2 },
});
