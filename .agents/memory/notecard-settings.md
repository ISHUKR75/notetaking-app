---
name: NoteCard settings compliance
description: NoteCard gates showTags and showWordCount on ThemeContext settings — do not hardcode these
---

## The rule
`NoteCard` reads `settings` from `useTheme()` and conditionally renders:
- `settings.showTags` — controls whether tag badges appear on the card
- `settings.showWordCount` — controls whether the word count suffix appears in the meta row

## Why
These are user-controlled display preferences in Settings. Hardcoding them ignores the user's choice.

## How to apply
```tsx
const { colors, isDark, settings } = useTheme();
{settings.showTags && note.tags.length > 0 && <TagRow ... />}
{settings.showWordCount && note.wordCount > 0 && <WordCount ... />}
```
