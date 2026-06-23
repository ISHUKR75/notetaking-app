# Ishu Notes

A premium note-taking app for mobile, inspired by Samsung Notes, GoodNotes 6, Apple Notes, and Notion. Built with Expo React Native in a pnpm monorepo.

## Project Structure

- **Monorepo root**: `/home/runner/workspace`
- **Mobile app**: `apps/mobile/`
- **Workflow**: `cd apps/mobile && npx expo start --web --port 5000`

## Tech Stack

- Expo SDK 51, React Native, expo-router (file-based routing)
- TanStack Query, react-native-reanimated, react-native-svg
- MaterialCommunityIcons, expo-google-fonts/inter
- AsyncStorage for offline-first local storage

## Key Files

- `app/(tabs)/` — Tab screens (home, notebooks, search, settings, study, index/canvas)
- `app/notes/[id].tsx` — Note editor with markdown preview, format bar, draw mode, focus mode
- `app/notes/create.tsx` — Create note screen
- `app/notes/trash.tsx` — Recently deleted notes screen
- `app/notebooks/[id].tsx` — Notebook detail screen
- `src/context/NotesContext.tsx` — Notes, notebooks, tags state
- `src/context/ThemeContext.tsx` — Theme/settings state
- `src/context/DrawingContext.tsx` — Drawing canvas state
- `src/utils/haptics.ts` — Safe haptics utility (no-ops on web)
- `src/constants/colors.ts` — Color tokens for light/dark
- `src/constants/penTools.ts` — Pen tool definitions
- `src/constants/templates.ts` — Page templates

## Features Implemented

- **Home**: Stats row, filter chips (All/Pinned/Flagged/Recent/Favorites), sort menu, FAB with quick actions, animated note cards
- **Draw/Canvas**: GoodNotes-style floating toolbar, color palettes (Standard/Neon/Extended), template picker, page manager, pressure-simulated drawing
- **Notebooks**: Grid/list toggle, emoji + color picker, preview modal, archive/favorite/delete
- **Search**: Filter chips by type, tag browser, recent searches, live results
- **Study**: Flashcard decks, flip animation, difficulty rating (Easy/Medium/Hard), weekly activity chart, streak counter
- **Settings**: Theme toggle, font size, auto-save, spell check, haptics, trash navigation
- **Note Editor**: Edit/Preview/Draw view modes, markdown renderer, rich format bar, focus mode, info panel, notebook label in header, autosave indicator, more menu with pin/flag/duplicate/share/trash
- **Trash**: Recently deleted with restore, permanent delete, bulk selection, empty trash

## User Preferences

- All features should be fully functional (no mocks or placeholders)
- Premium, modern design inspired by GoodNotes 6 / Apple Notes
- Fully responsive for all devices
- Offline-first (local storage, no required backend)
