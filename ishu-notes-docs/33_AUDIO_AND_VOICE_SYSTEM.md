# Ishu Notes — Audio & Voice System

## Overview

Ishu Notes has the most comprehensive audio system of any note-taking app — live transcription, AI-powered speaker detection, audio bookmarks, waveform visualization, speed control, and Whisper-grade accuracy — all working offline after initial model download.

---

## Voice Note Recording

### Recording Architecture

```
Microphone Input
      │
      ▼ (Raw PCM stream)
Web Audio API / expo-av
      │
      ├──► Local Storage (OPFS / expo-file-system)
      │    Write audio chunks in real-time
      │
      ├──► Waveform Visualizer
      │    Analyser node → frequency data → canvas render
      │
      ├──► Live Transcription Worker (Web Worker)
      │    Whisper.cpp WASM → text tokens → editor
      │
      └──► Noise Reduction (Krisp.ai or RNNoise)
           Optional noise gate + filtering
```

### Recording Quality Options

| Quality | Bitrate | File Size/min | Use Case |
|---------|---------|--------------|---------|
| Voice (default) | 64 kbps MP3 | ~500 KB | Meetings, memos |
| Standard | 128 kbps MP3 | ~1 MB | General recording |
| High | 256 kbps MP3 | ~2 MB | Music, podcasts |
| Lossless | WAV 44.1kHz | ~10 MB | Studio quality |

### Recording UI — Detailed

```
┌──────────────────────────────────────────────────────────────────┐
│  🎙 Recording Voice Note                     [Pause] [Stop]     │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ▂▃▅▇▅▃▂▁▂▃▄▇▆▄▃▂▁▂▄▇▆▄▃▂▁▂▃▅▇▄▃▂▁         [Waveform]         │
│                                                                  │
│  ● 02:34  ──────────────────────────────────────────────────── │
│                                                                  │
│  📝 Live Transcription:                                         │
│  "The meeting discussed Q3 targets and we agreed that the       │
│   marketing budget should be increased by thirty percent.        │
│   Action items are as follows: first, Priya will prepare        │
│   the presentation by..."                                        │
│                                                                  │
│  [🔖 Bookmark]  [📌 Mark highlight]  [🔇 Mute]  [🔊 Monitor]  │
│                                                                  │
│  Language: [Auto ▼]     Noise reduction: [ON ▼]               │
└──────────────────────────────────────────────────────────────────┘
```

---

## Live Transcription System

### Client-Side Transcription (Offline Capable)

```typescript
// Initialize Whisper.cpp WASM model (downloaded once, ~150MB for base model)
import { WhisperWorker } from './workers/whisper.worker';

const whisper = new WhisperWorker();

await whisper.initialize({
  model: 'whisper-base',    // 150MB — good accuracy
  // 'whisper-tiny'         // 75MB — faster, lower accuracy
  // 'whisper-small'        // 500MB — better accuracy (Pro)
  language: 'auto',         // Auto-detect language
  task: 'transcribe',       // 'transcribe' or 'translate' (to English)
});

// Stream audio chunks for live transcription
audioProcessor.on('audioChunk', async (chunk: Float32Array) => {
  const { text, confidence, isFinal } = await whisper.transcribe(chunk);

  if (isFinal) {
    appendToTranscript(text);
  } else {
    updatePartialTranscript(text); // Streaming intermediate results
  }
});
```

### Server-Side Transcription (Better Accuracy — When Online)

```typescript
// Use OpenAI Whisper API for higher accuracy
async function transcribeAudio(audioBlob: Blob, language?: string) {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.m4a');
  formData.append('model', 'whisper-1');
  formData.append('language', language ?? 'auto');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'word');
  formData.append('timestamp_granularities[]', 'segment');

  const response = await openai.audio.transcriptions.create({
    file: audioBlob,
    model: 'whisper-1',
    language: language,
    response_format: 'verbose_json',
    timestamp_granularities: ['word', 'segment'],
  });

  return {
    text: response.text,
    words: response.words,    // Word-level timestamps
    segments: response.segments,  // Sentence-level timestamps
    language: response.language,
    duration: response.duration,
  };
}
```

### Transcript Features

#### Word-Level Timestamps
Each word in transcript has a timestamp:
```json
{
  "words": [
    { "word": "The", "start": 0.0, "end": 0.2 },
    { "word": "meeting", "start": 0.2, "end": 0.6 },
    { "word": "discussed", "start": 0.6, "end": 1.1 }
  ]
}
```
→ Click any word in transcript → Audio jumps to that moment

#### Paragraph Auto-Detection
- Silence > 1.5 seconds → New paragraph
- Speaker change → New paragraph with speaker label

---

## Speaker Detection (Diarization)

### Multi-Speaker Detection
```typescript
// Identify different speakers in recording
import { SpeakerDiarization } from '@picovoice/falcon-web';

const diarization = await SpeakerDiarization.create(accessKey);
const result = await diarization.process(audioBuffer);

// Result:
// [
//   { speaker: 'Speaker 1', start: 0.0, end: 15.3 },
//   { speaker: 'Speaker 2', start: 15.5, end: 32.0 },
//   { speaker: 'Speaker 1', start: 32.1, end: 48.7 },
// ]
```

### Speaker Labels in Transcript
```
[Speaker 1] 00:00 — "Let's start with the Q3 review."

[Speaker 2] 00:05 — "Sure. So the numbers are looking 
                    pretty good overall..."

[Speaker 1] 00:32 — "Can you elaborate on the marketing spend?"
```

User can rename speakers: [Speaker 1] → [Priya] — updates throughout transcript.

---

## Audio Player (Playback in Note)

### Full-Featured Audio Player

```
┌──────────────────────────────────────────────────────────────────┐
│  🎵  team-meeting-2026-06-22.m4a                   [⋮ Options] │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ▂▁▃▅▇▆▄▃▂▁▃▅▇▆▄▃▂▁ ◆ ▂▃▅▇▆▄▃▂▁▂▃▅▇▆▄▃▂                     │
│  [Waveform with bookmark markers shown as colored dots]         │
│                                                                  │
│  00:00 ──────●──────────────────────── 04:32                  │
│         01:23 current                                           │
│                                                                  │
│  [◀◀ -15s]  [▶ Play]  [+15s ▶▶]     [0.5x][1x][1.5x][2x]   │
│                                                                  │
│  🔖 Bookmarks:                                                  │
│    [00:34]  Q3 Revenue numbers                                 │
│    [01:52]  Marketing budget discussion          [Go to ▶]     │
│    [03:15]  Action items                                        │
│                                                                  │
│  [+ Add bookmark]                    [📝 View transcript]      │
└──────────────────────────────────────────────────────────────────┘
```

### Audio Bookmarks

```typescript
interface AudioBookmark {
  id: string;
  audioId: string;         // Which audio file
  timestamp: number;       // Position in seconds
  label: string;           // User's bookmark label
  color: string;           // Visual color on waveform
  createdAt: Date;
}

// Add bookmark at current playback position
function addBookmark(audioId: string, label: string) {
  const timestamp = audioPlayer.currentTime;
  createBookmark({ audioId, timestamp, label, color: 'blue' });
}

// Export bookmarks as text list
function exportBookmarks(audioId: string): string {
  return bookmarks
    .filter(b => b.audioId === audioId)
    .map(b => `[${formatTime(b.timestamp)}] ${b.label}`)
    .join('\n');
}
```

---

## Waveform Visualization

### Canvas-Based Waveform Rendering

```typescript
class WaveformRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioBuffer: AudioBuffer;
  private bookmarks: AudioBookmark[];

  render(playbackProgress: number) {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    // Draw waveform bars
    const channelData = this.audioBuffer.getChannelData(0);
    const barWidth = 2;
    const barGap = 1;
    const barsCount = Math.floor(width / (barWidth + barGap));
    const samplesPerBar = Math.floor(channelData.length / barsCount);

    for (let i = 0; i < barsCount; i++) {
      const sampleStart = i * samplesPerBar;
      let maxAmplitude = 0;

      for (let j = 0; j < samplesPerBar; j++) {
        maxAmplitude = Math.max(maxAmplitude, Math.abs(channelData[sampleStart + j]));
      }

      const barHeight = maxAmplitude * height * 0.8;
      const x = i * (barWidth + barGap);
      const y = (height - barHeight) / 2;

      // Color: played = accent, unplayed = muted
      const isPlayed = (i / barsCount) < playbackProgress;
      this.ctx.fillStyle = isPlayed ? '#6366f1' : '#d1d5db';
      this.ctx.fillRect(x, y, barWidth, barHeight);
    }

    // Draw bookmark markers
    for (const bookmark of this.bookmarks) {
      const x = (bookmark.timestamp / this.audioBuffer.duration) * width;
      this.ctx.fillStyle = bookmark.color;
      this.ctx.fillRect(x - 1, 0, 2, height);

      // Dot marker at top
      this.ctx.beginPath();
      this.ctx.arc(x, 6, 5, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Playhead cursor
    const playheadX = playbackProgress * width;
    this.ctx.fillStyle = '#1e293b';
    this.ctx.fillRect(playheadX - 1, 0, 2, height);
  }
}
```

---

## Audio Export & Sharing

### Export Options

| Format | Quality | Use Case |
|--------|---------|---------|
| MP3 (128 kbps) | Standard | Sharing, small size |
| MP3 (256 kbps) | High | Better quality |
| WAV | Lossless | Editing, archival |
| M4A | Compressed | Apple ecosystem |
| OGG | Open | Web, Android |

### Share Options
- Share audio file directly
- Share transcript as text
- Share as note (audio + transcript combined)
- Export timestamps + transcript as SRT subtitle file
- AirDrop (iOS/macOS)
- Share sheet (any app)

---

## Audio Search

### Search Within Audio (Via Transcript)

```typescript
// Search for keyword within a voice note transcript
async function searchInAudio(audioId: string, query: string) {
  const transcript = await getTranscript(audioId);

  // Find all occurrences with timestamps
  const matches = transcript.words
    .filter(word => word.word.toLowerCase().includes(query.toLowerCase()))
    .map(word => ({
      word: word.word,
      timestamp: word.start,
      context: getContextAroundWord(transcript, word, 5), // 5 words each side
    }));

  return matches;
  // User can click any match → audio jumps to that moment
}
```

---

## Meeting Mode (Premium)

Special recording mode optimized for meetings:

```
Meeting Mode:
  ✅ Speaker diarization (identify different voices)
  ✅ Smart silence skip (auto-skip long pauses in playback)
  ✅ Action item detection ("we will", "I'll", "action item")
  ✅ Summary generated at end of recording
  ✅ Calendar integration (link to calendar event)
  ✅ Share transcript with attendees
  ✅ Highlight key moments as they happen

Meeting Summary (auto-generated):
  Topics discussed: Q3 planning, budget, marketing
  Decisions made:
    - Marketing budget increased 30%
    - Launch delayed to Q4
  Action items:
    - [ ] Priya: Prepare presentation (by June 30)
    - [ ] Raj: Review vendor contracts
    - [ ] Team: Weekly sync every Monday
  Duration: 45 minutes
  Speakers: 4 detected
```
