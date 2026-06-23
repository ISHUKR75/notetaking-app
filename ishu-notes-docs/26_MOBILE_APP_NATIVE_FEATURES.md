# Ishu Notes — Mobile App Native Features (React Native / Expo)

## Overview

The Ishu Notes mobile app is built with **Expo (React Native)** targeting iOS 16+ and Android 12+. It goes far beyond what a PWA can do — using every native capability the device offers: haptic feedback, stylus APIs, file system, background sync, widgets, and deep OS integration.

---

## Expo Modules Used

| Module | Purpose |
|--------|---------|
| `expo-camera` | Document scanning, photo capture |
| `expo-media-library` | Access photos/videos from gallery |
| `expo-file-system` | Local file management, OPFS equivalent |
| `expo-document-picker` | Pick any file from device |
| `expo-sharing` | Share notes via native share sheet |
| `expo-haptics` | Haptic feedback on pen strokes |
| `expo-notifications` | Push + local notifications |
| `expo-background-fetch` | Background sync when app is closed |
| `expo-task-manager` | Long-running background tasks |
| `expo-secure-store` | Encrypted local key storage |
| `expo-local-authentication` | Face ID, Touch ID, fingerprint |
| `expo-speech` | Text-to-speech for note reading |
| `expo-av` | Audio recording and playback |
| `expo-sensors` | Accelerometer (device tilt for canvas) |
| `expo-clipboard` | Copy/paste rich content |
| `expo-intent-launcher` | Open files in other apps |
| `expo-keep-awake` | Screen stays on while writing |
| `expo-brightness` | Auto-dim for night writing mode |
| `expo-font` | Custom font loading (handwriting fonts) |
| `expo-blur` | Native blur effects (iOS glass morphism) |
| `expo-linear-gradient` | Performance-optimized gradients |
| `expo-image` | Optimized image loading with caching |
| `expo-video` | Hardware-accelerated video playback |
| `react-native-reanimated` | 60/120fps animations on UI thread |
| `react-native-gesture-handler` | Native gesture recognition |
| `react-native-skia` | GPU-accelerated 2D graphics (canvas) |
| `react-native-mmkv` | Ultra-fast key-value storage |
| `react-native-svg` | SVG rendering for icons and graphics |
| `@shopify/flash-list` | High-performance list rendering |
| `react-native-pdf` | Native PDF rendering |

---

## Apple Pencil Integration (iOS)

### Pencil Generation Support

| Pencil | Pressure | Tilt | Hover | Double Tap | Squeeze |
|--------|----------|------|-------|-----------|---------|
| Apple Pencil 1 | ✅ | ✅ | ❌ | ❌ | ❌ |
| Apple Pencil 2 | ✅ | ✅ | ❌ | ✅ | ❌ |
| Apple Pencil Pro | ✅ | ✅ | ✅ | ✅ | ✅ |
| Apple Pencil USB-C | ✅ | ❌ | ❌ | ❌ | ❌ |

### Pencil Data Captured Per Point

```typescript
interface StylusPoint {
  x: number;           // Position X
  y: number;           // Position Y
  pressure: number;    // 0.0–1.0 (force applied)
  altitudeAngle: number; // Tilt angle from surface (0 = flat, π/2 = perpendicular)
  azimuthAngle: number;  // Rotation angle of pencil
  timestamp: number;   // High-resolution timestamp (nanoseconds)
  type: 'pencil' | 'finger' | 'stylus';
}
```

### Double Tap / Squeeze Actions (Configurable)

```
Apple Pencil Double Tap Options:
  ○ Switch between last two tools
  ○ Switch to eraser (while held)
  ○ Open color picker
  ○ Toggle ruler
  ○ Open quick menu
  ○ Undo last stroke
  ○ No action

Apple Pencil Pro Squeeze Options:
  ○ Open tool palette
  ○ Toggle between pen and eraser
  ○ Cycle through pen sizes
  ○ Open quick note
```

### Hover Preview (Apple Pencil Pro)
- Shows cursor before pencil touches screen (12mm range)
- Preview shows exact stroke width and color
- Snaps to lines/grids when hovering near them

---

## Samsung S-Pen Integration (Android)

### S-Pen Capabilities

```typescript
// S-Pen detection
import { SPenController } from '@samsung/react-native-spen';

const spenInfo = await SPenController.getSPenInfo();
// { isConnected: true, batteryLevel: 87, isAirActionsSupported: true }
```

### Air Actions (Remote Gesture Control)

```
S-Pen Air Actions Mapping:
  Wave left     → Previous note page
  Wave right    → Next note page
  Flick up      → Scroll up
  Flick down    → Scroll down
  Circle CW     → Open tool picker
  Click button  → Capture screenshot of note
  Hold button   → Record voice note
```

### S-Pen Button Customization

```
S-Pen Side Button:
  Single click → Toggle eraser/pen
  Double click → Change pen color (cycle)
  Hold         → Eraser mode (while held)
```

---

## Document Scanner (Native Camera)

### Scanning Pipeline

```typescript
import { CameraView, useCameraPermissions } from 'expo-camera';
import { DocumentScanner } from '@react-native-ml-kit/document-scanner';

async function scanDocument() {
  // 1. Open full-screen camera view
  // 2. Real-time edge detection (ML Kit Vision)
  const result = await DocumentScanner.scan({
    maxNumDocuments: 20,          // Multi-page support
    pageTransitionMs: 200,        // Auto-capture delay after stabilization
    letUserAdjustCrop: true,      // Manual corner adjustment
    qualityMode: 'high',          // 'low' | 'mid' | 'high'
  });

  // 3. Each page comes as a cropped, perspective-corrected image
  for (const page of result.scannedImages) {
    // Apply enhancement filter
    const enhanced = await ImageProcessor.enhance(page, {
      mode: 'document',  // 'original' | 'grayscale' | 'blackwhite' | 'document'
      brightness: 1.1,
      contrast: 1.2,
    });

    // 4. Run OCR on scanned page
    const ocrResult = await MLKit.textRecognition().process(enhanced);

    // 5. Attach to note as annotatable page
    await attachScannedPage(noteId, enhanced, ocrResult.text);
  }
}
```

---

## Background Sync (When App is Closed)

### iOS Background Fetch

```typescript
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

const SYNC_TASK = 'ishu-notes-background-sync';

TaskManager.defineTask(SYNC_TASK, async () => {
  try {
    // Flush offline sync queue
    const pendingOps = await SyncQueue.getPending();
    if (pendingOps.length === 0) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    await SyncQueue.flush(pendingOps);
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Register background task
await BackgroundFetch.registerTaskAsync(SYNC_TASK, {
  minimumInterval: 15 * 60, // Every 15 minutes minimum (iOS enforced)
  stopOnTerminate: false,   // Continue after app close
  startOnBoot: true,        // Start on device reboot
});
```

### Android Foreground Service (For Ongoing Sync)
- Service runs in background even when app is killed
- Shows persistent notification: "Ishu Notes syncing..."
- Guarantees sync completion before service stops

---

## Native Share Extension

### Receive Shared Content (iOS Share Sheet / Android Intents)

```typescript
// App receives shared content from other apps
import { ReceiveSharingIntent } from 'react-native-receive-sharing-intent';

ReceiveSharingIntent.getReceivedFiles(
  (files) => {
    // Handle shared files/URLs/text
    for (const file of files) {
      if (file.mimeType?.startsWith('image/')) {
        // Create new note with image
        createNoteWithImage(file.filePath);
      } else if (file.mimeType === 'application/pdf') {
        // Import PDF as annotatable note
        importPDFAsNote(file.filePath);
      } else if (file.weblink) {
        // Create web clip note
        createWebClipNote(file.weblink);
      } else if (file.text) {
        // Create text note from shared text
        createNoteFromText(file.text, file.subject);
      }
    }
  },
  (error) => console.error(error),
  'com.ishunotes.app'
);
```

---

## Haptic Feedback System

### Haptic Events Map

```typescript
import * as Haptics from 'expo-haptics';

// When starting a new stroke
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// When stroke is deleted/erased
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

// When note is saved
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// When sync conflict detected
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

// When action fails
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

// On scroll snap (page turns)
await Haptics.selectionAsync();

// Custom pattern for writing (subtle tick per stroke)
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
```

---

## Face ID / Touch ID Lock

```typescript
import * as LocalAuthentication from 'expo-local-authentication';

async function unlockLockedNote(noteId: string) {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  if (!hasHardware || !isEnrolled) {
    // Fallback to PIN entry
    return showPINModal(noteId);
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock note',
    fallbackLabel: 'Use PIN',
    disableDeviceFallback: false,
    cancelLabel: 'Cancel',
  });

  if (result.success) {
    unlockNote(noteId);
  } else if (result.error === 'user_fallback') {
    showPINModal(noteId);
  }
}
```

---

## Screen Awake (Night Writing Mode)

```typescript
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { setBrightnessAsync } from 'expo-brightness';

async function enterNightWritingMode() {
  // Keep screen on
  await activateKeepAwakeAsync();

  // Dim screen to comfortable night level
  await setBrightnessAsync(0.2);

  // Apply dark canvas theme
  setCanvasTheme('dark-paper');

  // Show subtle candle-light tint overlay
  setCanvasFilter('warm-night');
}

async function exitNightWritingMode() {
  await deactivateKeepAwake();
  // Restore previous brightness
  await setBrightnessAsync(previousBrightness);
}
```

---

## Deep Links & Universal Links

```
URL Scheme:      ishunotes://
Universal Link:  https://app.ishunotes.com/

Deep Link Routes:
  ishunotes://note/{id}              → Open specific note
  ishunotes://notebook/{id}          → Open notebook
  ishunotes://search?q={query}       → Open search
  ishunotes://new                    → Create new note
  ishunotes://new?title={title}      → New note with pre-filled title
  ishunotes://import?url={url}       → Import from URL
  ishunotes://template/{id}          → New note from template
  ishunotes://settings               → Open settings
  ishunotes://settings/subscription  → Open subscription page
```

---

## iOS-Specific: Handoff & AirDrop

### Handoff (Continue on Mac)
```typescript
// Set current activity for Handoff
import { NativeModules } from 'react-native';

NativeModules.HandoffModule.setActivity({
  activityType: 'com.ishunotes.viewnote',
  title: currentNote.title,
  userInfo: { noteId: currentNote.id },
  keywords: currentNote.tags,
  requiredUserInfoKeys: ['noteId'],
  isEligibleForHandoff: true,
  isEligibleForSearch: true,
});
```

### AirDrop Note Sharing
- Share note as `.isnote` file (proprietary format)
- Or share as PDF, Markdown, or plain text
- Received on another device → opens in Ishu Notes automatically
