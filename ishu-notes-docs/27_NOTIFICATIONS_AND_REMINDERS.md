# Ishu Notes — Notifications & Reminders System

## Overview

Ishu Notes has a comprehensive notification system — from gentle reminders tied to specific notes, to real-time collaboration alerts, to smart AI-powered nudges that help you review important content at the right time.

---

## Notification Types

### 1. Note Reminders (User-Set)
User explicitly sets a reminder on a note:
```
Reminder Options:
  ○ In 1 hour
  ○ Tonight (8:00 PM)
  ○ Tomorrow morning (9:00 AM)
  ○ This weekend (Saturday 9:00 AM)
  ○ Next week (Monday 9:00 AM)
  ○ Custom date & time
  ○ Recurring (daily / weekly / monthly)
```

**Notification appearance (iOS):**
```
┌─────────────────────────────────────────────────┐
│  📝 Ishu Notes                       now         │
│  Reminder: Meeting Prep Notes                   │
│  "Discussed Q3 goals and action items..."       │
│                                                 │
│  [View Note]              [Mark Complete]       │
└─────────────────────────────────────────────────┘
```

### 2. Collaboration Alerts
Real-time notifications for shared notes:

| Event | Notification |
|-------|-------------|
| Someone joins note | "Priya started editing Meeting Notes" |
| Comment added | "Raj commented: 'Can we revisit point 3?'" |
| @Mention received | "Priya mentioned you in Design Review" |
| Permission changed | "Ankur made you an editor of Project Plan" |
| Note shared with you | "Priya shared 'Q3 Roadmap' with you" |
| Collaborator suggestion accepted | "Your suggestion was accepted by Raj" |

### 3. Sync & System Alerts
| Event | Priority | Notification |
|-------|---------|-------------|
| Sync conflict detected | High | "Conflict in 'Meeting Notes' — tap to resolve" |
| Offline for > 30 min | Medium | "You're offline. Notes saved locally." |
| Storage 80% full | Medium | "5 GB limit approaching. Upgrade or free space." |
| Storage 100% full | High | "Storage full! New notes can't sync." |
| Auto-backup complete | Low | "Weekly backup exported to Google Drive" |
| Security: new device login | High | "New sign-in on Windows Chrome — not you?" |

### 4. AI Smart Nudges
AI-powered reminders based on note content:

| Trigger | Notification |
|---------|-------------|
| Note has unchecked tasks | "3 tasks from 'Meeting Notes' still pending" |
| Stale draft (7+ days) | "Unfinished draft: 'Project Proposal' — still relevant?" |
| Spaced repetition due | "Flashcard review due: 'Machine Learning Deck' (8 cards)" |
| Note with deadline keyword | "Tomorrow is the deadline mentioned in 'Q3 Report'" |
| Long note without reading | "You haven't revisited 'Study Notes Ch.5' in 2 weeks" |

### 5. Subscription & Account
| Event | Notification |
|-------|-------------|
| Trial ending in 3 days | "Your Pro trial ends in 3 days" |
| Payment failed | "Payment failed — update your card to keep Pro" |
| New feature released | "New: AI Flashcards now available!" (max 1/week) |

---

## Push Notification Architecture

### Mobile (Expo Push)

```typescript
// Register device for push notifications
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

async function registerForPushNotifications() {
  if (!Device.isDevice) return null; // Must be physical device

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null; // User denied
  }

  // Get Expo push token
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PROJECT_ID,
  });

  // Also get native token for direct APNs/FCM (for better delivery)
  const nativeToken = await Notifications.getDevicePushTokenAsync();

  // Register token with our server
  await api.registerDeviceToken({
    expoPushToken: token.data,
    platform: Platform.OS,
    deviceId: await getUniqueDeviceId(),
  });

  return token.data;
}
```

### Notification Handler Setup

```typescript
// Configure how notifications are handled in different app states
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;

    // Don't show badge notification if user is already in that note
    const isCurrentNote = currentNoteId === data.noteId;

    return {
      shouldShowAlert: !isCurrentNote,
      shouldPlaySound: data.priority === 'high',
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});
```

### Server-Side Push Delivery

```typescript
// Send push notification via Expo Push API
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data: Record<string, unknown>,
  options: { priority?: 'default' | 'normal' | 'high' } = {}
) {
  // Get all device tokens for this user
  const tokens = await db.query.deviceTokens.findMany({
    where: eq(deviceTokens.userId, userId),
  });

  const messages: ExpoPushMessage[] = tokens.map(({ expoPushToken }) => ({
    to: expoPushToken,
    sound: options.priority === 'high' ? 'default' : null,
    title,
    body,
    data,
    priority: options.priority ?? 'default',
    badge: await getUnreadCount(userId),
    categoryIdentifier: data.category as string,
  }));

  // Batch send (max 100 per batch)
  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    await expo.sendPushNotificationsAsync(chunk);
  }
}
```

---

## Local Notifications (Scheduled Reminders)

```typescript
import * as Notifications from 'expo-notifications';

async function scheduleNoteReminder(
  noteId: string,
  noteTitle: string,
  scheduledDate: Date,
  recurrence?: 'daily' | 'weekly' | 'monthly'
) {
  // Cancel existing reminder for this note (if any)
  await Notifications.cancelScheduledNotificationAsync(`reminder-${noteId}`);

  const trigger = recurrence
    ? buildRecurringTrigger(recurrence, scheduledDate)
    : { date: scheduledDate };

  await Notifications.scheduleNotificationAsync({
    identifier: `reminder-${noteId}`,
    content: {
      title: `📝 Reminder`,
      body: noteTitle,
      data: {
        type: 'reminder',
        noteId,
        category: 'NOTE_REMINDER',
      },
      sound: 'default',
      // Action buttons on the notification
      categoryIdentifier: 'NOTE_REMINDER',
    },
    trigger,
  });
}

// Define actionable notification categories (iOS)
await Notifications.setNotificationCategoryAsync('NOTE_REMINDER', [
  {
    identifier: 'VIEW_NOTE',
    buttonTitle: 'View Note',
    options: { opensAppToForeground: true },
  },
  {
    identifier: 'SNOOZE_1H',
    buttonTitle: 'Snooze 1 hour',
    options: { opensAppToForeground: false },
  },
  {
    identifier: 'MARK_DONE',
    buttonTitle: 'Mark Done',
    options: { opensAppToForeground: false, isDestructive: false },
  },
]);
```

---

## In-App Notification Center

### UI Layout

```
Notification Center (Bell icon → dropdown):
┌────────────────────────────────────────────────────────┐
│ 🔔 Notifications                    [Mark all read]    │
├────────────────────────────────────────────────────────┤
│ UNREAD (3)                                             │
│                                                        │
│ ● [👤] Priya commented on "Meeting Notes"              │
│        "Can we revisit point 3?" — 2 min ago          │
│        [View]                                          │
│                                                        │
│ ● [🔄] Sync conflict in "Design Notes"                │
│        Resolved automatically — 5 min ago             │
│        [View resolution]                               │
│                                                        │
│ ● [🤖] 8 flashcards due for review                    │
│        Machine Learning Deck — 1 hour ago             │
│        [Start review]                                  │
├────────────────────────────────────────────────────────┤
│ EARLIER                                                │
│                                                        │
│   [📤] Weekly backup exported                         │
│         Google Drive — Yesterday                      │
│                                                        │
│   [👤] Ankur shared "Q3 Roadmap" with you            │
│         2 days ago                                    │
│                                                        │
│                        [Load more...]                  │
└────────────────────────────────────────────────────────┘
```

---

## Notification Preferences

```
Settings → Notifications:

REMINDERS
  [✓] Note reminders                    [Edit times]
  [✓] Recurring reminders
  [ ] AI smart nudges

COLLABORATION  
  [✓] Comments and replies
  [✓] @Mentions
  [✓] Shared with me
  [ ] Someone joined my note
  [✓] Permission changes

SYSTEM
  [✓] Sync conflicts
  [✓] Storage warnings
  [ ] Sync completed
  [ ] App updates and new features

DELIVERY
  Quiet Hours: [10:00 PM] to [8:00 AM]
  Do Not Disturb: [Follow system DND]
  Sound: [Default ▼]
  Vibration: [On ▼]
  Badge count: [✓] Show on app icon
```

---

## Android Notification Channels

```typescript
// Create notification channels for Android 8+
await Notifications.setNotificationChannelAsync('reminders', {
  name: 'Note Reminders',
  importance: Notifications.AndroidImportance.HIGH,
  vibrationPattern: [0, 250, 250, 250],
  lightColor: '#6366f1',
  sound: 'default',
  enableVibrate: true,
  enableLights: true,
  showBadge: true,
});

await Notifications.setNotificationChannelAsync('collaboration', {
  name: 'Collaboration',
  importance: Notifications.AndroidImportance.DEFAULT,
  sound: 'default',
  showBadge: true,
});

await Notifications.setNotificationChannelAsync('system', {
  name: 'System Alerts',
  importance: Notifications.AndroidImportance.LOW,
  showBadge: false,
  enableVibrate: false,
});
```

---

## Spaced Repetition Scheduling

```typescript
// SM-2 algorithm for flashcard review scheduling
function calculateNextReview(
  card: Flashcard,
  quality: 0 | 1 | 2 | 3 | 4 | 5  // 0-5 rating by user
): Date {
  let { easinessFactor, repetitions, interval } = card.srState;

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easinessFactor);

    repetitions++;
  } else {
    // Incorrect — reset
    repetitions = 0;
    interval = 1;
  }

  // Update easiness factor
  easinessFactor = Math.max(
    1.3,
    easinessFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  );

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  // Schedule notification for next review
  scheduleFlashcardReview(card.id, nextReview);

  return nextReview;
}
```
