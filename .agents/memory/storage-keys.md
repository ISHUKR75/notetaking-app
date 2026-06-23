---
name: Storage keys pattern
description: STORAGE_KEYS.STROKES is a function, not a string
---

`STORAGE_KEYS.STROKES` is a **function** that takes a noteId: `STORAGE_KEYS.STROKES(noteId)` returns the storage key string.

All other STORAGE_KEYS entries are plain strings.

**Why:** Strokes are per-note, so the key must include the note ID. Using a function prevents accidental key collisions.

**How to apply:** Always call `STORAGE_KEYS.STROKES(note.id)` — never use `STORAGE_KEYS.STROKES` as a plain key.
