---
name: Haptics web fix
description: expo-haptics crashes on web; use the safe wrapper instead
---

Never import `* as Haptics from 'expo-haptics'` directly in any component.

Always use: `import { haptic } from '../utils/haptics';` (adjust relative path as needed)

Available methods: `haptic.light()`, `haptic.medium()`, `haptic.heavy()`, `haptic.select()`, `haptic.success()`, `haptic.warning()`, `haptic.error()`

**Why:** expo-haptics throws "method not available on web" at runtime, breaking the app in the web preview and on web deployments.

**How to apply:** Any file that needs haptic feedback must use the wrapper. The wrapper file is at `apps/mobile/src/utils/haptics.ts`.
