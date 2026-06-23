import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { TEMPLATES } from '../../src/constants/templates';
import { Colors } from '../../src/constants/colors';

export default function TemplatesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const s = styles(colors);

  const categories = [...new Set(TEMPLATES.map(t => t.category))];

  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="close" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Templates</Text>
      </View>
      <FlatList
        data={TEMPLATES}
        keyExtractor={t => t.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12, marginBottom: 12 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 }}
        ListHeaderComponent={<Text style={s.subtitle}>Choose a template for your new note</Text>}
        renderItem={({ item: t }) => (
          <TouchableOpacity style={[s.card, { borderColor: t.color + '66', flex: 1 }]} onPress={() => router.back()}>
            <View style={[s.iconBox, { backgroundColor: t.color + '22' }]}>
              <MaterialCommunityIcons name={t.icon as any} size={36} color={t.color} />
            </View>
            <Text style={s.name}>{t.name}</Text>
            <Text style={s.desc}>{t.description}</Text>
            <View style={[s.categoryBadge, { backgroundColor: t.color + '22' }]}>
              <Text style={[s.category, { color: t.color }]}>{t.category}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = (colors: typeof Colors.light) => StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.inputBg },
  headerTitle: { fontSize: Colors.font.xl, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: Colors.font.base, color: colors.textSecondary, marginBottom: 20, lineHeight: 22 },
  card: {
    backgroundColor: colors.card, borderRadius: Colors.radius.xl,
    borderWidth: 1.5, padding: 16, alignItems: 'center', gap: 8,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6,
  },
  iconBox: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  name: { fontSize: Colors.font.base, fontWeight: '700', color: colors.text, textAlign: 'center' },
  desc: { fontSize: Colors.font.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Colors.radius.full },
  category: { fontSize: 11, fontWeight: '600' },
});
