# Ishu Notes — Onboarding & UX Flows

## Philosophy

First impressions are everything. The onboarding must feel **delightful, fast, and never overwhelming**. Users should reach their "aha moment" — writing or drawing something meaningful — within 90 seconds of opening the app for the first time.

---

## Onboarding Flow (First-Time User)

### Step 0: Splash Screen (1.5 seconds)
```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│         ✏️  Ishu Notes              │
│                                     │
│   Write Freely. Think Clearly.      │
│      Create Limitlessly.            │
│                                     │
│         [Loading animation]         │
│                                     │
└─────────────────────────────────────┘
```
- Logo animation: Pen draws the "I" in Ishu Notes
- Background: Gradient from indigo to violet
- Auto-proceeds to Step 1 after animation

---

### Step 1: Welcome Carousel (3 swipeable screens)

**Screen 1 — Write anything**
```
┌──────────────────────────────────────┐
│                                      │
│    [Animated: hand writing + typing] │
│                                      │
│    Write, Draw, and Type             │
│                                      │
│    Combine handwriting, typed text,  │
│    sketches, and voice notes — all   │
│    in one beautiful place.           │
│                                      │
│    ● ○ ○                [Skip]       │
└──────────────────────────────────────┘
```

**Screen 2 — Organize like a pro**
```
┌──────────────────────────────────────┐
│                                      │
│   [Animated: folders organising]     │
│                                      │
│   Everything in its place           │
│                                      │
│   Libraries, Notebooks, Sections,   │
│   Tags, and Smart Folders — your    │
│   notes organized the way you think. │
│                                      │
│   ○ ● ○                [Skip]       │
└──────────────────────────────────────┘
```

**Screen 3 — Works everywhere**
```
┌──────────────────────────────────────┐
│                                      │
│   [Animated: phone + tablet + PC]    │
│                                      │
│   Online. Offline. Everywhere.       │
│                                      │
│   Your notes sync instantly across   │
│   all devices and work perfectly     │
│   without internet connection.       │
│                                      │
│   ○ ○ ●                            │
│                    [Get Started →]   │
└──────────────────────────────────────┘
```

---

### Step 2: Sign Up / Sign In

```
┌──────────────────────────────────────┐
│  Create your Ishu Notes account      │
│                                      │
│  [Continue with Google]              │
│  [Continue with Apple]   (iOS only)  │
│  [Continue with Email]               │
│                                      │
│  ─────────── or ───────────         │
│                                      │
│  Already have an account?            │
│  [Sign In]                           │
│                                      │
│  By continuing, you agree to our     │
│  Terms of Service and Privacy Policy │
└──────────────────────────────────────┘
```

**Email flow:**
1. Enter email → Send magic link (no password needed)
2. User taps link → Automatically signed in
3. Optional: Set display name and avatar

---

### Step 3: Personalization Quiz (30 seconds)

**Question 1:**
```
What will you use Ishu Notes for?
  [📚 Studying]     [💼 Work]
  [✏️ Journaling]   [🎨 Sketching]
  [📋 Tasks]        [🔀 Everything]
```

**Question 2:**
```
How do you prefer to take notes?
  [⌨️ Typing]        [✏️ Handwriting]
  [🎙 Voice]          [🔀 Mix of all]
```

**Question 3:**
```
Do you use a stylus?
  [✅ Yes — Apple Pencil]
  [✅ Yes — S Pen]
  [✅ Yes — Other stylus]
  [❌ No, just fingers/mouse]
```

*Result: App pre-configures default pen settings, default view, and suggests relevant templates.*

---

### Step 4: Import Existing Notes (Optional)

```
┌─────────────────────────────────────────────┐
│  Already have notes somewhere?              │
│  Import them in seconds:                    │
│                                             │
│  [📗 Notion]          [🐘 Evernote]         │
│  [🍎 Apple Notes]     [🗒 OneNote]          │
│  [📦 Obsidian]        [🐻 Bear]             │
│  [📄 Markdown files]  [📁 Any files...]     │
│                                             │
│  [Skip for now →]                           │
└─────────────────────────────────────────────┘
```

---

### Step 5: First Note — Guided Experience

```
┌─────────────────────────────────────────────┐
│  Let's create your first note!              │
│                                             │
│  📝  Tap here to start typing...            │
│      ←── Try typing something               │
│                                             │
│  ✏️  Or tap here to start drawing           │
│      ←── Try handwriting                    │
│                                             │
│  🎙  Or hold here to record a voice note    │
│                                             │
│  [Skip tutorial →]                          │
└─────────────────────────────────────────────┘
```

Interactive guided tour proceeds based on what user taps.

---

## Feature Discovery Tooltips (Progressive)

Instead of showing everything at once, reveal features contextually:

| Trigger | Tooltip Shown |
|---------|--------------|
| First time creating a note | "Tip: Press / for block commands" |
| First time typing a heading | "Tip: Tap # for heading shortcuts" |
| First time selecting text | "Format options appear when you select text" |
| 5th note created | "Tip: Use tags to organize your notes" |
| First time on canvas | "Tip: Double-tap to zoom in" |
| First pen stroke | "Try switching pen types in the toolbar" |
| First time offline | "Notes auto-save locally — you won't lose anything" |
| First search | "Tip: Use #tag to filter by tag" |
| 10th note created | "Discover Smart Folders — automatic organization" |

---

## Key UX Micro-Flows

### Creating a New Note
```
1. User taps [+] or presses Cmd+N
2. Modal or full screen opens (based on device)
3. Cursor placed in title field
4. User types title
5. Tab → cursor moves to body
6. Type → auto-save starts
7. Navigate away → saved state shown
Time to first character: < 500ms
```

### Switching Between Typing and Drawing
```
1. User taps pencil icon in toolbar
2. Canvas overlay appears (300ms animation)
3. Previous text visible beneath as read-only layer
4. User draws
5. Taps keyboard icon → back to text mode
6. Canvas strokes preserved as image layer
Transition time: < 300ms
```

### Tag Creation (First Time)
```
1. User types # in note body
2. Dropdown appears: [Create tag "work"]
3. User presses Enter
4. Tag created AND applied to current note
5. Toast: "Tag 'work' created and applied"
6. First time: Tooltip explains tag filtering
```

### Conflict Resolution (Sync Conflict)
```
1. Conflict detected → banner in editor
2. "This note was edited on another device"
3. [View differences] button
4. Side-by-side diff shows:
   LEFT: Your version (this device)
   RIGHT: Other version (other device)
5. User can: [Keep mine] [Keep theirs] [Merge manually]
6. If [Merge manually]: Both versions shown, user combines
7. Resolved version saved → synced
```

### Offline to Online Transition
```
1. App detects connection restored
2. Sync queue flushes automatically (no user action)
3. Subtle banner: "Syncing 5 changes..."
4. On completion: "All synced ✓" (disappears after 3s)
5. If conflict during sync → conflict notification
```

---

## Empty States (All Screens)

### All Notes Empty
```
┌──────────────────────────────────────────┐
│                                          │
│         ✏️  (illustration)               │
│                                          │
│      Your notes will appear here        │
│                                          │
│   Start writing your first note —       │
│   anything works. Ideas, lists,          │
│   sketches, or voice memos.              │
│                                          │
│   [Create your first note →]            │
│                                          │
└──────────────────────────────────────────┘
```

### Search No Results
```
┌──────────────────────────────────────────┐
│                                          │
│      🔍  (illustration)                  │
│                                          │
│   No notes found for "machine learning" │
│                                          │
│   Try different keywords, or check      │
│   your filters.                          │
│                                          │
│   [Clear filters]  [Search all notes]   │
│                                          │
└──────────────────────────────────────────┘
```

### Trash Empty
```
┌──────────────────────────────────────────┐
│                                          │
│        🗑️  (illustration)               │
│                                          │
│      Your trash is empty                 │
│                                          │
│   Deleted notes stay here for 30 days  │
│   before being permanently removed.     │
│                                          │
└──────────────────────────────────────────┘
```

---

## Loading States

### Note List Loading
- Skeleton cards (3–5 gray placeholder cards)
- Animated shimmer effect (left to right)
- Replace with real content when loaded

### Editor Loading
- Show title skeleton first
- Then body skeleton (3 lines of varying width)
- Content fades in when loaded (300ms opacity)

### Canvas Loading
- Show paper texture immediately
- Load strokes progressively (nearest first)
- Heavy pages: Show "Loading..." badge in corner

### First Load (No Cache)
- Splash screen → Progress indicator
- "Loading your notes..." text
- Background: Fetch most recent 50 notes first
- Show them while remaining load

---

## Gestures Reference Card (Shown Once, Accessible in Help)

```
EDITOR GESTURES
  Swipe right (from edge)   → Back to note list
  Swipe down                → Dismiss/minimize note
  Two-finger tap            → Undo
  Three-finger tap          → Redo
  Long press on block       → Block context menu
  Pinch                     → Zoom (canvas only)

CANVAS GESTURES
  Two-finger drag           → Pan canvas
  Pinch in/out              → Zoom in/out
  Two-finger tap            → Undo
  Three-finger tap          → Redo
  Three-finger swipe left   → Undo multiple
  Double-tap empty space    → Fit to screen
  Long press                → Lasso selection start

NOTE LIST GESTURES
  Swipe left on note        → Delete
  Swipe right on note       → Pin
  Long press note           → Multi-select mode
  Pull down                 → Refresh
```
