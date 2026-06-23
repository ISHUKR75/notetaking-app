import { Tabs } from 'expo-router';
import { Platform, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/context/ThemeContext';
import { Colors } from '../../src/constants/colors';

function TabIcon({ name, focused, color }: { name: string; focused: boolean; color: string }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <MaterialCommunityIcons name={name as any} size={24} color={color} />
    </View>
  );
}

export default function TabLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const tabBarHeight = Platform.OS === 'web' ? 84 : 60 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom,
          paddingTop: 8,
          elevation: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Notes',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'note-text' : 'note-text-outline'} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notebooks"
        options={{
          title: 'Books',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'notebook' : 'notebook-outline'} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Draw',
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              width: 50, height: 50, borderRadius: 25,
              backgroundColor: focused ? colors.primary : colors.primarySoft,
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 18,
            }}>
              <MaterialCommunityIcons name="draw" size={24} color={focused ? '#fff' : colors.primary} />
            </View>
          ),
          tabBarLabelStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="magnify" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="study"
        options={{
          title: 'Study',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'brain' : 'head-outline'} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'cog' : 'cog-outline'} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
