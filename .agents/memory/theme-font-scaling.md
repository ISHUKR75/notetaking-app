---
name: Theme font scaling helpers
description: ThemeContext exposes sf() and contentLineHeight() for runtime font size/line height scaling — must be applied inline, not in StyleSheet.create
---

## The rule
`ThemeContext` exposes two helpers:
- `sf(size: number): number` — scales a font size by the user's `settings.fontSize` (small=0.875×, medium=1×, large=1.125×, xlarge=1.25×)
- `contentLineHeight(fontSize?: number): number` — computes line height from both `fontScale` and `settings.lineHeight` multiplier

## Why
`StyleSheet.create()` is evaluated once at module load — it cannot depend on runtime context values. Font size and line height only work if applied as inline style overrides.

## How to apply
```tsx
// Correct — inline override
const { sf, contentLineHeight } = useTheme();
<TextInput style={[s.contentInput, { fontSize: sf(16), lineHeight: contentLineHeight(16) }]} />

// Wrong — will not react to settings changes
const s = StyleSheet.create({ contentInput: { fontSize: 16 } });
```

## LINE_HEIGHT_MULTIPLIERS
Exported from ThemeContext: `tight=1.3, normal=1.6, relaxed=1.85, loose=2.1`
