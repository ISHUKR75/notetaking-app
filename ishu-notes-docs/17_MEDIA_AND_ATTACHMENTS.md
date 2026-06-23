# Ishu Notes — Media & Attachments System

## Overview

Ishu Notes supports every media type imaginable — from photos and audio recordings to PDFs, spreadsheets, and embedded web content. All media works offline with smart compression and lazy loading.

---

## Supported Media Types

### Images
| Format | Support | Notes |
|--------|---------|-------|
| JPEG (.jpg) | ✅ Full | Auto-compressed on upload |
| PNG (.png) | ✅ Full | Transparency preserved |
| WebP (.webp) | ✅ Full | Preferred format |
| AVIF (.avif) | ✅ Full | Best compression |
| GIF (.gif) | ✅ Full | Animation preserved |
| HEIC/HEIF (.heic) | ✅ Full | iPhone photos |
| SVG (.svg) | ✅ Full | Vector, editable |
| TIFF (.tiff) | ✅ Full | High-quality scans |
| BMP (.bmp) | ✅ Full | Converted on upload |
| RAW (.raw, .cr2, .nef) | ⚠️ Preview only | Not editable |

### Audio
| Format | Support | Notes |
|--------|---------|-------|
| MP3 (.mp3) | ✅ Full | Playback + waveform |
| WAV (.wav) | ✅ Full | Lossless, larger file |
| M4A (.m4a) | ✅ Full | iPhone voice memos |
| OGG (.ogg) | ✅ Full | Open format |
| FLAC (.flac) | ✅ Full | Lossless audio |
| WebM Audio | ✅ Full | Web recording |
| AAC (.aac) | ✅ Full | Efficient compression |

### Video
| Format | Support | Notes |
|--------|---------|-------|
| MP4 (.mp4) | ✅ Full | H.264 + H.265 |
| WebM (.webm) | ✅ Full | Web native |
| MOV (.mov) | ✅ Full | iPhone videos |
| AVI (.avi) | ⚠️ Playback | Transcoded on upload |
| MKV (.mkv) | ⚠️ Playback | Stream only |

### Documents
| Format | Support | Notes |
|--------|---------|-------|
| PDF (.pdf) | ✅ Full | Annotatable |
| Word (.docx) | ✅ Full | Rendered + editable |
| Excel (.xlsx) | ✅ Preview | Editable as table |
| PowerPoint (.pptx) | ✅ Preview | Slide viewer |
| Text (.txt) | ✅ Full | Embedded as text |
| Markdown (.md) | ✅ Full | Rendered inline |
| CSV (.csv) | ✅ Full | Table view |
| JSON (.json) | ✅ Full | Formatted display |
| ZIP (.zip) | ✅ Preview | File browser |

### Embeds (via iframe)
| Source | Embed Type | Features |
|--------|-----------|---------|
| YouTube | Video player | Playback controls |
| Vimeo | Video player | Playback controls |
| Google Maps | Map embed | Interactive |
| Figma | Design viewer | Live prototype |
| CodePen | Code demo | Live editor |
| Google Slides | Presentation | Slide controls |
| Spotify | Music player | Playback |
| Twitter/X | Tweet embed | Like, share |
| GitHub Gist | Code viewer | Syntax highlight |
| Observable | Notebook | Interactive charts |
| Any URL | Generic iframe | May be blocked by CSP |

---

## Camera & Scanning

### Document Scanner (Mobile)
```
Process:
1. User taps "Scan Document" (camera opens)
2. Real-time edge detection (OpenCV.js or native)
3. Green border appears around detected document
4. Auto-capture when stable (or manual tap)
5. Perspective correction applied automatically
6. Enhancement options:
   - Original photo
   - Grayscale
   - Black & white (high contrast)
   - Color enhanced
7. Multi-page scanning (keep scanning, all pages go to one note)
8. OCR option: Extract text from scanned document
9. Save as: Embedded image OR annotatable PDF
```

### Photo Library Access
- Insert photos from device gallery
- Multi-select: Insert up to 20 photos at once
- Auto-create gallery block for 3+ photos
- Smart resize: Max 1920px on longest edge (configurable)

### Webcam Capture (Desktop)
- Take photo with webcam and insert directly
- Video recording via webcam (up to 10 minutes free, unlimited pro)

---

## Audio Recording System

### Voice Note Recording
```
Recording UI:
┌─────────────────────────────────────────────┐
│  🎙 Recording Voice Note                    │
│                                             │
│  ████████████░░░░░░░░░░░░░░░░░   2:34     │
│  [Waveform visualization]                   │
│                                             │
│  [ ⏸ Pause ]  [ ⬛ Stop ]  [ 🗑 Cancel ] │
│                                             │
│  📝 Transcription (live):                  │
│  "The meeting discussed quarterly targets   │
│   and we agreed to focus on..."            │
└─────────────────────────────────────────────┘
```

### Recording Features
- **Max duration:** 4 hours (premium), 30 min (free)
- **Quality:** 128kbps MP3 (default), 256kbps, or Lossless WAV
- **Live transcription:** Powered by Web Speech API + server-side Whisper
- **Pause/resume:** Multiple segments joined seamlessly
- **Background recording:** App can be minimized (mobile)
- **Noise reduction:** Optional noise cancellation
- **Gain control:** Auto-gain or manual control

### Audio Player (In Note)
```
Audio Player UI:
┌─────────────────────────────────────────────────────────┐
│ 🎵 voice-note-2026-06-22.mp3                           │
│                                                         │
│ ████████████████░░░░░░░░░░░░░░░░   01:23 / 04:32     │
│  ← [waveform with bookmark markers] →                  │
│                                                         │
│ [◀◀ -10s] [ ▶ Play ] [+10s ▶▶] [0.5x][1x][1.5x][2x] │
│                                                         │
│ 🔖 Bookmarks: [00:34 - Key point] [02:15 - Action item]│
│                                                         │
│ 📝 Transcript  [▼ Show]                               │
└─────────────────────────────────────────────────────────┘
```

### Audio Bookmarks
- Tap bookmark icon at any point during playback
- Optional label for each bookmark
- Bookmarks shown as markers on waveform
- Click bookmark → jump to that position
- Export bookmarks list separately

---

## Image Features

### Image Block Options
When an image is inserted in a note:
```
Image Context Menu:
├── View full size
├── Edit in drawing mode (add annotations)
├── Extract text (OCR)
├── Replace image
├── Download original
├── Copy to clipboard
├── Resize (S / M / L / Full width)
├── Alignment (left / center / right / float)
├── Add caption
├── Add alt text (accessibility)
└── Delete
```

### Image Editing (Inline)
Light image editing directly in app:
- **Crop:** Free crop, aspect ratio lock (1:1, 4:3, 16:9, etc.)
- **Rotate:** 90° steps or free rotation
- **Flip:** Horizontal / Vertical
- **Filters:** 12 photo filters (Vivid, Cool, Warm, Mono, Fade, etc.)
- **Brightness / Contrast / Saturation sliders**
- **Blur / Sharpen**
- **Remove background** (AI-powered)
- **Markup/Annotate:** Draw/write directly on image

### Image Gallery Block
When 3+ images inserted together:
```
Gallery Layout Options:
├── Grid (2 or 3 columns, equal sizes)
├── Masonry (Pinterest-style, natural heights)
├── Carousel (swipeable)
├── Strip (horizontal scroll)
└── Feature (1 large + rest as thumbnails)
```

---

## PDF Integration

### PDF as Annotatable Page
1. Insert PDF → each page becomes a canvas layer
2. Draw, write, highlight on top of PDF content
3. Add text boxes floating over PDF
4. Add sticky notes
5. Highlight PDF text (text selection preserved)

### PDF Annotation Tools
- **Pen/pencil:** Freehand markup
- **Highlighter:** Select PDF text → highlight
- **Text box:** Add typed annotations
- **Stamp:** "Approved", "Review Needed", "Completed"
- **Arrow/line:** Point to specific content
- **Erase:** Remove any annotation
- **Signature:** Add signature to PDF field

### PDF Navigation
- Page thumbnail strip (vertical)
- Jump to page number
- Zoom: 25% — 400%
- Rotate individual pages
- Bookmark specific pages

---

## File Attachments

### General File Attachment
Any file type can be attached:
```
Attachment Block UI:
┌────────────────────────────────────────────────────┐
│ 📎  Q3-Report.xlsx                                │
│     Microsoft Excel Spreadsheet • 2.4 MB          │
│                                                    │
│     [Preview ▼]  [Download]  [Open in App]        │
└────────────────────────────────────────────────────┘
```

### File Management
- **Preview:** Thumbnails or full preview for common types
- **Download:** Original file download
- **Open in App:** Open in device's native app (mobile) or new tab (web)
- **Replace:** Swap file without losing position in note
- **Rename:** Change display name without renaming file
- **Version:** Keep previous versions (premium)

---

## Storage Management

### Storage Tiers
| Plan | Storage | Media Size Limit | Versions |
|------|---------|-----------------|---------|
| Free | 5 GB | 10 MB/file | None |
| Pro | 100 GB | 100 MB/file | 30 days |
| Team | 1 TB shared | 500 MB/file | 90 days |
| Enterprise | Custom | Custom | 1 year |

### Storage Dashboard
```
Settings → Storage:

Total: 3.2 GB / 5.0 GB

[████████████░░░░░░░░░] 64%

Breakdown:
  📝 Notes (text):     234 MB
  🖼 Images:         1.8 GB
  🎵 Audio:          890 MB
  📹 Video:          276 MB
  📎 Attachments:     54 MB

Largest Files:
  1. meeting-recording.m4a   — 340 MB  [Delete]
  2. Q3-presentation.pdf     — 45 MB   [Delete]
  3. project-photo-album.zip — 33 MB   [Delete]

[Free up space...] [Upgrade to Pro →]
```

### Auto-Compression
- Images auto-compressed to WebP on upload (configurable)
- Quality: High (80%), Medium (60%), Low (40%)
- Original preserved if compression setting = Off
- Audio: MP3 128kbps (default), higher quality options

---

## Media in Offline Mode

### Offline Media Strategy
- **Images:** Cached in IndexedDB (OPFS for large files)
- **Audio:** Stored in OPFS (Origin Private File System)
- **Video:** Only cached if watched; streamed when online
- **PDFs:** Full PDF cached offline for annotatable PDFs
- **Attachments:** Downloaded on-demand, cached after first view

### Media Sync Indicator
- 📤 Uploading (shows progress)
- ✅ Synced (in cloud)
- 💾 Local only (not yet uploaded)
- 📵 Unavailable offline (needs connection to view)
