# Ishu Notes — Widgets & Quick Capture System

## Overview

Quick capture is one of the most critical features of any note-taking app — capturing an idea must be **instant**, ideally under 2 seconds from the moment inspiration strikes. Ishu Notes provides home screen widgets, lock screen widgets, system-wide quick capture, and platform share extensions to ensure nothing gets lost.

---

## Home Screen Widgets (iOS)

### Widget Sizes and Types

#### Small Widget (2×2)
```
┌─────────────────────────┐
│  ✏️ Ishu Notes          │
│                         │
│  + New Note             │
│                         │
│  Last edited:           │
│  "Meeting Notes"        │
└─────────────────────────┘
```
Tap → Opens directly to new note editor (< 1 second)

#### Medium Widget (4×2) — Recent Notes
```
┌───────────────────────────────────────────────────┐
│  ✏️ Ishu Notes                    [+ New Note]    │
│                                                   │
│  📝 Meeting Notes         Modified 2h ago         │
│  📝 Study Notes Ch.5      Modified yesterday      │
│  📝 Shopping List         Modified 3 days ago     │
└───────────────────────────────────────────────────┘
```
Tap any note → Opens that note
Tap "+ New Note" → Opens new note

#### Medium Widget (4×2) — Quick Capture
```
┌───────────────────────────────────────────────────┐
│  ✏️  Quick Capture to Ishu Notes                  │
│                                                   │
│  [📝 Note]  [✏️ Draw]  [🎙 Voice]  [📷 Scan]     │
│                                                   │
│  Last: "Remember to call Priya" — 1h ago         │
└───────────────────────────────────────────────────┘
```
Each button opens specific capture mode instantly.

#### Large Widget (4×4) — Dashboard
```
┌───────────────────────────────────────────────────┐
│  ✏️ Ishu Notes              Mon, June 22           │
│                                                   │
│  PINNED                                           │
│  📌 Q3 Project Plan                              │
│  📌 Important Contacts                           │
│                                                   │
│  RECENT                                          │
│  📝 Meeting Notes              2h ago            │
│  📝 Study Notes Ch.5       Yesterday             │
│  📝 Random Ideas             3 days ago          │
│                                                   │
│  📊 42 notes this week                          │
│               [+ New Note]                       │
└───────────────────────────────────────────────────┘
```

#### Lock Screen Widget (iOS 16+)
```
[✏️ Ishu Notes]  [+ Note]  [🎙 Voice]
```
Tap from lock screen → Face ID/Touch ID → Note editor

---

## Home Screen Widgets (Android)

### Widget Types (AppWidgetProvider)

#### Compact Widget (2×1)
```
┌────────────────────────────────────────────┐
│  ✏️  [+ New Note]    [🎙 Voice]   [📷 Scan] │
└────────────────────────────────────────────┘
```

#### Standard Widget (4×2)
```
┌───────────────────────────────────────────────────┐
│  ✏️ Ishu Notes                    [+ New Note]    │
├───────────────────────────────────────────────────┤
│  📝 Meeting Notes                    2 hours ago  │
│  📝 Shopping List                    Yesterday    │
│  📝 Study Notes                      2 days ago   │
└───────────────────────────────────────────────────┘
```

#### Resizable Widget (Any Size)
- Widget auto-adjusts layout based on user-chosen size
- Small: Just the new note button + app icon
- Medium: Recent 3 notes + new note button
- Large: Recent 5 notes + pinned + new note
- Widget tap area is whole card — no accidentally missing tap targets

### Android Widget Implementation (Kotlin via Expo Module)

```kotlin
class IshuNotesWidget : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.widget_main)
            
            // New Note button
            val newNoteIntent = Intent(context, QuickCaptureActivity::class.java)
                .putExtra("capture_type", "text")
            views.setOnClickPendingIntent(
                R.id.btn_new_note,
                PendingIntent.getActivity(context, 0, newNoteIntent, PendingIntent.FLAG_IMMUTABLE)
            )

            // Voice Note button
            val voiceIntent = Intent(context, QuickCaptureActivity::class.java)
                .putExtra("capture_type", "voice")
            views.setOnClickPendingIntent(
                R.id.btn_voice,
                PendingIntent.getActivity(context, 1, voiceIntent, PendingIntent.FLAG_IMMUTABLE)
            )
            
            // Load recent notes from local database
            val notes = IshuNotesDB.getRecentNotes(3)
            // Populate RemoteViews list adapter...
            
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
```

---

## iOS Today Extension / Live Activities

### Live Activity (Writing Session)
When user starts an active writing session, a Live Activity appears:

```
Dynamic Island (compact):
[✏️  Writing — Meeting Notes · 342 words]

Lock Screen Live Activity:
┌──────────────────────────────────────────────────┐
│  ✏️ Ishu Notes                  Writing Session  │
│                                                  │
│  📝 Meeting Notes                               │
│  342 words  ·  Started 23 min ago               │
│                                                  │
│  [Pause]          [Stop]          [Open →]       │
└──────────────────────────────────────────────────┘
```

---

## Quick Capture Methods

### Method 1: Quick Capture Floating Button (In-App)

Persistent bubble that floats over any screen (optional, like Facebook Messenger):
- Tap → Instantly opens quick capture sheet (150ms)
- Drag to reposition
- Long press → Opens full capture options
- Auto-hides when in editor

### Method 2: Share Extension (iOS / Android)

Capture from ANY other app:

**iOS Share Extension:**
```
In Safari, YouTube, or any app:
[Share] → [Ishu Notes]

Quick Save Sheet:
┌──────────────────────────────────────────────────┐
│  Save to Ishu Notes                              │
│                                                  │
│  [YouTube video title from Safari]               │
│  https://youtube.com/watch?v=...                │
│                                                  │
│  Add note (optional):                            │
│  [__________________________________]            │
│                                                  │
│  Save to: [Quick Notes ▼]                       │
│                                                  │
│  [Cancel]                    [Save →]           │
└──────────────────────────────────────────────────┘
```

**Android Intent Handler:**
```xml
<activity android:name=".ShareReceiverActivity">
  <intent-filter>
    <action android:name="android.intent.action.SEND" />
    <category android:name="android.intent.category.DEFAULT" />
    <data android:mimeType="text/plain" />
    <data android:mimeType="image/*" />
    <data android:mimeType="application/pdf" />
  </intent-filter>
</activity>
```

### Method 3: Siri Shortcuts (iOS)

Pre-built Siri phrases:
```
"Hey Siri, new Ishu note" → Opens quick capture
"Hey Siri, add to Ishu Notes: Buy milk" → Creates note with text
"Hey Siri, search Ishu Notes for meeting" → Opens search
"Hey Siri, open my last Ishu note" → Opens most recent note
"Hey Siri, start Ishu voice note" → Starts voice recording
```

### Method 4: Android Quick Settings Tile

In Android notification shade, quick tile:
```
[✏️ New Note]  [🎙 Voice Note]
```
Tap → Opens quick capture without unlocking phone (biometric auth for locked notes)

### Method 5: Web Clipper (Browser Extension)

Available for Chrome, Firefox, Safari, Edge:

```
Browser Extension Popup:
┌─────────────────────────────────────────────────────┐
│  ✏️ Save to Ishu Notes                             │
│                                                     │
│  [✓] Page title + URL (web clip)                   │
│  [ ] Selected text only                             │
│  [ ] Full page screenshot                           │
│  [ ] Full page content (parsed)                     │
│                                                     │
│  Title: "Understanding CRDT Algorithms"            │
│         [Edit ✎]                                   │
│                                                     │
│  Note: [________________________________]           │
│                                                     │
│  Tags: [work] [research] [+ Add tag]               │
│                                                     │
│  Save to: [Research Notes ▼]                       │
│                                                     │
│  [Cancel]                        [Save Clip →]     │
└─────────────────────────────────────────────────────┘
```

### Method 6: macOS Menu Bar App

Dedicated menu bar icon on macOS:
```
Click ✏️ in menu bar:
┌────────────────────────────────────────────────┐
│  ✏️  Ishu Notes                               │
├────────────────────────────────────────────────┤
│  [+ New Note]        [🎙 Voice]   [📷 Screen] │
├────────────────────────────────────────────────┤
│  RECENT NOTES                                  │
│  📝 Meeting Notes               2h ago        │
│  📝 Study Notes Ch.5        Yesterday         │
│  📝 Shopping List             3 days ago      │
├────────────────────────────────────────────────┤
│  [Open Ishu Notes...]    [Sync: ✓]           │
└────────────────────────────────────────────────┘
```

Global keyboard shortcut: `Mod+Shift+I` from anywhere → Opens quick capture

---

## Quick Capture Inbox

All quick-captured items that haven't been organized go to **Inbox** — a special notebook at the top of the sidebar:

```
Sidebar:
  📥 Inbox (12)         ← Quick captures here
  📚 Libraries
    - Personal
    - Work
    - School
```

**Inbox Processing Flow:**
1. Open Inbox
2. Review each quick note
3. Move to proper notebook / add tags / expand content
4. Or leave in Inbox (it's fine too)
5. "Process Inbox" button: Go through one by one with keyboard shortcuts

---

## Quick Note Templates (Capture Types)

User can set default template for each capture type:

| Capture Type | Default Template |
|-------------|-----------------|
| Text capture | Blank |
| Voice capture | Voice note with timestamp |
| Photo capture | Photo + caption |
| URL capture | Web clip with title/URL |
| Scan capture | Scanned document |
| Drawing capture | Blank canvas |
