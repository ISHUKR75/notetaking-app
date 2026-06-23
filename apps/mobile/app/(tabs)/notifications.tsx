import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../src/context/ThemeContext';
import { Colors } from '../../src/constants/colors';
import { haptic } from '../../src/utils/haptics';

interface NotifItem {
  id: string;
  icon: string;
  iconColor: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  type: 'reminder' | 'streak' | 'tip' | 'update' | 'study';
}

const INIT_NOTIFS: NotifItem[] = [
  { id:'n1', icon:'fire', iconColor:'#f59e0b', title:'🔥 14-day streak!', body:'Amazing! You\'ve maintained a 14-day study streak. Keep it up!', time:'Just now', read:false, type:'streak' },
  { id:'n2', icon:'brain', iconColor:'#8b5cf6', title:'Review time', body:'You have 7 flashcards due for review in your General Knowledge deck.', time:'2h ago', read:false, type:'study' },
  { id:'n3', icon:'lightbulb-outline', iconColor:'#6366f1', title:'Writing tip', body:'Try the Focus Mode in the note editor to eliminate distractions while writing.', time:'5h ago', read:false, type:'tip' },
  { id:'n4', icon:'timer-outline', iconColor:'#10b981', title:'Pomodoro reminder', body:'Time for a 5-minute break! You\'ve completed a 25-minute focus session.', time:'Yesterday', read:true, type:'reminder' },
  { id:'n5', icon:'note-plus-outline', iconColor:'#3b82f6', title:'Note saved', body:'Your note "Meeting Notes — Product Review" was automatically saved.', time:'Yesterday', read:true, type:'update' },
  { id:'n6', icon:'notebook-outline', iconColor:'#ec4899', title:'Notebook shared', body:'Your "Personal" notebook is ready to export.', time:'2 days ago', read:true, type:'update' },
  { id:'n7', icon:'star-outline', iconColor:'#f59e0b', title:'Milestone reached', body:'You\'ve created 50 notes! You\'re on your way to becoming a power user.', time:'3 days ago', read:true, type:'streak' },
  { id:'n8', icon:'calendar-check', iconColor:'#10b981', title:'Weekly summary', body:'This week: 3 notes created, 14 cards reviewed, 84% retention rate.', time:'1 week ago', read:true, type:'update' },
];

const TYPE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'streak', label: 'Streaks' },
  { id: 'study', label: 'Study' },
  { id: 'reminder', label: 'Reminders' },
  { id: 'tip', label: 'Tips' },
];

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [notifs, setNotifs] = useState<NotifItem[]>(INIT_NOTIFS);
  const [filter, setFilter] = useState<string>('all');

  const unreadCount = notifs.filter(n => !n.read).length;

  const filtered = filter === 'all' ? notifs : notifs.filter(n => n.type === filter);

  const markRead = (id: string) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    haptic.light();
  };

  const markAllRead = () => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    haptic.success();
  };

  const dismiss = (id: string) => {
    setNotifs(prev => prev.filter(n => n.id !== id));
    haptic.light();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: topPad + 8, paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontSize: Colors.font.display, fontWeight: '900', color: colors.text }}>
            Notifications
          </Text>
          {unreadCount > 0 && (
            <Text style={{ fontSize: Colors.font.sm, color: colors.textSecondary, marginTop: 2 }}>
              {unreadCount} unread
            </Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={{ backgroundColor: colors.primarySoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}
            onPress={markAllRead}
          >
            <Text style={{ fontSize: Colors.font.sm, fontWeight: '700', color: colors.primary }}>
              Mark all read
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={{ paddingBottom: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {TYPE_FILTERS.map(f => (
            <TouchableOpacity
              key={f.id}
              style={{
                paddingHorizontal: 16, paddingVertical: 8,
                borderRadius: Colors.radius.full,
                backgroundColor: filter === f.id ? colors.primary : colors.inputBg,
                borderWidth: 1.5,
                borderColor: filter === f.id ? colors.primary : colors.border,
              }}
              onPress={() => { setFilter(f.id); haptic.select(); }}
            >
              <Text style={{ fontSize: Colors.font.sm, fontWeight: '700', color: filter === f.id ? '#fff' : colors.textSecondary }}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}>
        {filtered.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 80 }}>
            <Text style={{ fontSize: 52, marginBottom: 16 }}>🔔</Text>
            <Text style={{ fontSize: Colors.font.lg, fontWeight: '800', color: colors.text }}>
              All caught up!
            </Text>
            <Text style={{ fontSize: Colors.font.sm, color: colors.textSecondary, marginTop: 6, textAlign: 'center' }}>
              No notifications in this category
            </Text>
          </View>
        ) : (
          filtered.map((notif, i) => (
            <Animated.View
              key={notif.id}
              entering={FadeInDown.delay(i * 40).springify()}
            >
              <TouchableOpacity
                style={{
                  flexDirection: 'row', gap: 14, padding: 16,
                  backgroundColor: notif.read ? colors.card : colors.primarySoft + '60',
                  borderRadius: Colors.radius.xl, marginBottom: 10,
                  borderWidth: 1,
                  borderColor: notif.read ? colors.border : colors.primary + '30',
                }}
                onPress={() => markRead(notif.id)}
                activeOpacity={0.85}
              >
                {!notif.read && (
                  <View style={{
                    position: 'absolute', top: 16, left: 16,
                    width: 8, height: 8, borderRadius: 4,
                    backgroundColor: colors.primary,
                  }} />
                )}
                <View style={{
                  width: 46, height: 46, borderRadius: 14,
                  backgroundColor: notif.iconColor + '20',
                  alignItems: 'center', justifyContent: 'center',
                  marginLeft: notif.read ? 0 : 6,
                }}>
                  <MaterialCommunityIcons name={notif.icon as any} size={22} color={notif.iconColor} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Text style={{
                      fontSize: Colors.font.base, fontWeight: notif.read ? '600' : '800',
                      color: colors.text, flex: 1, marginRight: 8,
                    }} numberOfLines={1}>
                      {notif.title}
                    </Text>
                    <TouchableOpacity onPress={() => dismiss(notif.id)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                      <MaterialCommunityIcons name="close" size={14} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <Text style={{ fontSize: Colors.font.sm, color: colors.textSecondary, lineHeight: 19 }} numberOfLines={2}>
                    {notif.body}
                  </Text>
                  <Text style={{ fontSize: Colors.font.xs, color: colors.textMuted, fontWeight: '500', marginTop: 2 }}>
                    {notif.time}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
