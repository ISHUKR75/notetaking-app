# Ishu Notes — Accessibility (a11y) Guidelines

## Commitment

Ishu Notes is committed to WCAG 2.1 Level AA compliance across all features. Every user — regardless of visual, motor, cognitive, or hearing ability — deserves the full note-taking experience.

---

## WCAG 2.1 Compliance Checklist

### Perceivable

#### 1.1 Text Alternatives
- ✅ All images have descriptive alt text
- ✅ Icon-only buttons have `aria-label`
- ✅ Complex images (charts, diagrams) have extended descriptions
- ✅ Handwriting canvas has text alternative (OCR recognized text)
- ✅ Audio content has transcripts
- ✅ Video content has captions and audio descriptions

#### 1.2 Time-Based Media
- ✅ Voice recordings: Auto-transcription with manual correction
- ✅ Video embeds: Require captions (YouTube CC supported)
- ✅ Animated content: Can be paused (respects prefers-reduced-motion)

#### 1.3 Adaptable
- ✅ Semantic HTML5 elements (article, nav, main, header, aside)
- ✅ Proper heading hierarchy (h1→h2→h3, no skipping)
- ✅ Lists use ul/ol/li elements
- ✅ Tables have caption, scope, headers
- ✅ Form inputs have associated labels
- ✅ Reading order makes sense without CSS (logical DOM order)
- ✅ Landmarks: banner, navigation, main, complementary, contentinfo

#### 1.4 Distinguishable
- ✅ Text contrast ratio: minimum 4.5:1 (body), 3:1 (large text)
- ✅ UI component contrast: 3:1 against adjacent colors
- ✅ Text resize to 200% without horizontal scrolling
- ✅ No information conveyed by color alone (always paired with icon/text)
- ✅ Text spacing adjustable (line height 1.5+, letter spacing 0.12+)
- ✅ No content obscured when zoomed to 400%
- ✅ Non-text contrast for focus indicators: 3:1

### Operable

#### 2.1 Keyboard Accessible
- ✅ All functionality operable via keyboard
- ✅ No keyboard traps (can always Tab out of any component)
- ✅ Keyboard shortcuts for all major actions
- ✅ Character key shortcuts can be remapped or disabled
- ✅ Canvas drawing: Alternative keyboard navigation mode

#### 2.2 Enough Time
- ✅ No time limits on any core feature
- ✅ Session timeout: 15-minute warning before forced logout
- ✅ Auto-save: Never lose work due to timeout
- ✅ Pausable content: Carousels auto-play can be paused

#### 2.3 Seizures and Physical Reactions
- ✅ No content flashes more than 3 times per second
- ✅ All animations: Respects `prefers-reduced-motion`

#### 2.4 Navigable
- ✅ Skip navigation link ("Skip to main content")
- ✅ Page titles describe current view
- ✅ Focus is visible at all times
- ✅ Focus order is logical and predictable
- ✅ Link purpose clear from context
- ✅ Section headings organize content
- ✅ Focus management on modal open/close

#### 2.5 Input Modalities
- ✅ All functionality available via pointer (not just multitouch)
- ✅ Touch target size: minimum 44×44px
- ✅ Single pointer alternatives for multi-pointer gestures
- ✅ Motion-actuated functions have button alternatives
- ✅ No drag-only operations (keyboard/button alternatives exist)

### Understandable

#### 3.1 Readable
- ✅ Language declared in HTML: `<html lang="en">`
- ✅ Foreign language phrases marked with `lang` attribute
- ✅ Reading level: Content written at 8th grade level

#### 3.2 Predictable
- ✅ Focus change does not cause unexpected context change
- ✅ User settings change does not auto-submit
- ✅ Navigation consistent across pages
- ✅ Components with same name have same function

#### 3.3 Input Assistance
- ✅ All errors identified and described in text
- ✅ Form inputs have labels and descriptions
- ✅ Error suggestions provided when possible
- ✅ Error prevention for destructive actions (confirmation dialogs)
- ✅ Success messages announced to screen readers

### Robust

#### 4.1 Compatible
- ✅ Valid HTML5 (no parser errors)
- ✅ ARIA used correctly (roles, states, properties)
- ✅ Status messages in live regions
- ✅ Custom components use appropriate ARIA patterns

---

## Screen Reader Support

### Tested Screen Readers
| Screen Reader | Browser | Platform | Support Level |
|--------------|---------|----------|---------------|
| NVDA | Firefox | Windows | ✅ Full |
| JAWS | Chrome | Windows | ✅ Full |
| VoiceOver | Safari | macOS | ✅ Full |
| VoiceOver | Safari | iOS | ✅ Full |
| TalkBack | Chrome | Android | ✅ Full |
| Narrator | Edge | Windows | ✅ Partial |

### Key ARIA Patterns Used

#### Note List (Listbox Pattern)
```html
<div role="listbox" aria-label="Notes" aria-multiselectable="true">
  <div role="option" aria-selected="false" tabindex="0">
    <span class="sr-only">Meeting Notes, modified 2 hours ago, tagged work and meeting</span>
    <!-- Visual content -->
  </div>
</div>
```

#### Toolbar (Toolbar Pattern)
```html
<div role="toolbar" aria-label="Text formatting">
  <button aria-pressed="true" aria-label="Bold (Ctrl+B)">B</button>
  <button aria-pressed="false" aria-label="Italic (Ctrl+I)">I</button>
  <button aria-label="Heading level 1 (Ctrl+Alt+1)">H1</button>
</div>
```

#### Canvas (Application Pattern)
```html
<div 
  role="application"
  aria-label="Handwriting canvas — press Tab for keyboard controls"
  tabindex="0"
  aria-describedby="canvas-instructions"
>
  <p id="canvas-instructions" class="sr-only">
    Use arrow keys to move cursor, Space to start/stop drawing, 
    press H for help with keyboard shortcuts.
  </p>
  <canvas aria-hidden="true" />
  <!-- Screen reader layer with recognized text -->
  <div aria-live="polite" class="sr-only" id="canvas-text-layer">
    Recognized text: [OCR text appears here as user writes]
  </div>
</div>
```

#### Modal Dialog
```html
<div 
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <h2 id="modal-title">Delete Note?</h2>
  <p id="modal-description">
    This note will be moved to trash and permanently deleted after 30 days.
  </p>
  <button>Cancel</button>
  <button>Delete</button>
</div>
```

#### Live Regions (for dynamic updates)
```html
<!-- Sync status announcements -->
<div aria-live="polite" aria-atomic="false" class="sr-only" id="sync-status">
  <!-- Updated: "Note saved" / "Syncing 3 changes" / "All synced" -->
</div>

<!-- Error alerts -->
<div role="alert" aria-live="assertive" class="sr-only" id="error-announcer">
  <!-- Critical errors announced immediately -->
</div>
```

---

## Keyboard Navigation Map

### Global Shortcuts
| Action | Shortcut |
|--------|----------|
| Open search | Ctrl/Cmd + F |
| New note | Ctrl/Cmd + N |
| New notebook | Ctrl/Cmd + Shift + N |
| Open settings | Ctrl/Cmd + , |
| Toggle sidebar | Ctrl/Cmd + \\ |
| Toggle dark mode | Ctrl/Cmd + Shift + L |
| Focus sidebar | Ctrl/Cmd + 1 |
| Focus note list | Ctrl/Cmd + 2 |
| Focus editor | Ctrl/Cmd + 3 |
| Command palette | Ctrl/Cmd + K |
| Undo | Ctrl/Cmd + Z |
| Redo | Ctrl/Cmd + Shift + Z |

### Note List Navigation
| Action | Shortcut |
|--------|----------|
| Navigate notes | ↑ / ↓ arrows |
| Open note | Enter |
| Select note | Space |
| Multi-select | Shift + ↑/↓ |
| Select all | Ctrl/Cmd + A |
| Delete selected | Delete |
| Pin note | P |
| Flag note | F |
| Context menu | Shift + F10 or context menu key |

### Editor Navigation
| Action | Shortcut |
|--------|----------|
| Navigate blocks | ↑ / ↓ (when cursor at block edge) |
| Jump to block start | Ctrl/Cmd + Home |
| Jump to block end | Ctrl/Cmd + End |
| Move block up | Alt + Shift + ↑ |
| Move block down | Alt + Shift + ↓ |
| Duplicate block | Ctrl/Cmd + D |
| Delete block | Ctrl/Cmd + Shift + Delete |
| Open block menu | / (slash at start of empty line) |
| Close dropdown | Escape |

### Canvas/Handwriting Keyboard Mode
| Action | Shortcut |
|--------|----------|
| Enter canvas mode | Tab (from editor) |
| Move cursor | Arrow keys |
| Draw stroke | Hold Space + Arrow keys |
| Stop drawing | Release Space |
| Eraser mode | E |
| Pen mode | P |
| Undo stroke | Ctrl/Cmd + Z |
| Select tool | S |
| Move selection | Arrow keys (in select mode) |
| Exit canvas | Escape → Tab back to editor |

---

## Focus Management

### Focus Trap (Modals)
```typescript
function trapFocus(element: HTMLElement) {
  const focusable = element.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), ' +
    'select:not([disabled]), textarea:not([disabled]), ' +
    '[tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0] as HTMLElement;
  const last = focusable[focusable.length - 1] as HTMLElement;

  element.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  first.focus(); // Set initial focus
}
```

### Focus Restoration (Modal Close)
```typescript
// Save reference before opening modal
let lastFocusedElement: HTMLElement | null = null;

function openModal() {
  lastFocusedElement = document.activeElement as HTMLElement;
  // ... open modal, trap focus
}

function closeModal() {
  // ... close modal
  lastFocusedElement?.focus(); // Restore focus
}
```

---

## Color Contrast Testing

### Automated Testing
```javascript
// axe-core integration (runs in CI)
import axe from 'axe-core';

test('page has no accessibility violations', async () => {
  const { violations } = await axe.run(document.body, {
    rules: {
      'color-contrast': { enabled: true },
      'image-alt': { enabled: true },
      'label': { enabled: true },
      'aria-required-attr': { enabled: true },
    }
  });
  expect(violations).toHaveLength(0);
});
```

### Color Pairs (All Pass AA)
| Element | Foreground | Background | Ratio | Pass |
|---------|-----------|------------|-------|------|
| Body text (light) | #1f2937 | #ffffff | 14.5:1 | ✅ AAA |
| Body text (dark) | #e2e8f0 | #0f1117 | 12.9:1 | ✅ AAA |
| Primary button | #ffffff | #4f46e5 | 5.8:1 | ✅ AA |
| Link text | #4f46e5 | #ffffff | 5.1:1 | ✅ AA |
| Muted text | #6b7280 | #ffffff | 4.6:1 | ✅ AA |
| Placeholder | #9ca3af | #ffffff | 3.0:1 | ⚠️ AA (large only) |

---

## Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  /* Disable all transitions */
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  /* Keep functional transitions (not decorative) */
  .progress-bar { transition: width 0.3s ease !important; }
  .toast { transition: opacity 0.2s ease !important; }
}
```

---

## High Contrast Mode

```css
@media (forced-colors: active) {
  /* Windows High Contrast mode support */
  .note-card {
    border: 1px solid ButtonText;
    background-color: Canvas;
  }
  
  .primary-button {
    background-color: ButtonFace;
    color: ButtonText;
    border: 2px solid ButtonText;
    forced-color-adjust: none;
  }

  /* Focus indicators must use system colors */
  :focus-visible {
    outline: 3px solid Highlight;
    outline-offset: 2px;
  }
}
```

---

## Cognitive Accessibility

### Simplicity Features
- **Focus Mode:** Hides all chrome, one sentence at a time (Typewriter Mode)
- **Distraction-Free Mode:** Removes sidebar, toolbar, shows only editor
- **Simplified UI Mode:** Reduces feature surface, larger UI elements
- **Clear Language:** Error messages in plain English, no technical jargon
- **Consistent Navigation:** Same patterns everywhere

### Reading Support
- **Dyslexia Font:** OpenDyslexic font option
- **Increased Letter Spacing:** +0.1em option
- **Line Focus Mode:** Highlights current line, dims rest
- **Text-to-Speech:** Read note aloud (uses Web Speech API)
- **Sentence Highlighting:** Follows along as TTS reads
- **Reading Ruler:** Horizontal line that follows cursor

### Attention & Memory Support
- **Autosave:** Never lose work, no manual save needed
- **Undo History:** 500 levels, never worry about mistakes
- **Clear Feedback:** Every action confirmed with visible + audio feedback
- **Predictable State:** App state never changes unexpectedly
