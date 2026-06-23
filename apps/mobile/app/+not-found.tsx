import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Link, Stack } from 'expo-router';
import { useTheme } from '../src/context/ThemeContext';

export default function NotFound() {
  const { colors } = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Page not found</Text>
        <Link href="/" asChild>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]}>
            <Text style={styles.btnText}>Go Home</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 20 },
  btn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 100 },
  btnText: { color: '#fff', fontWeight: '600' },
});
