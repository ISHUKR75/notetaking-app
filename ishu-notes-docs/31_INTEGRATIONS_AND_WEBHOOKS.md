# Ishu Notes — Integrations & Webhooks

## Overview

Ishu Notes connects with the tools you already use. Whether it's backing up to Google Drive, creating notes from emails, or triggering workflows in Zapier — every integration is first-class and bi-directional where possible.

---

## Built-In Cloud Storage Integrations

### Google Drive
```
Setup:
  Settings → Integrations → Google Drive → [Connect]
  OAuth 2.0 → Select Google account → Grant permissions

Features:
  ✅ Auto-backup notebooks as PDF or Markdown
  ✅ Import files from Drive into notes
  ✅ Attach Drive files directly in notes (live link)
  ✅ Sync specific folder (Drive ↔ Ishu Notes)
  ✅ Export note → Save to Drive
  
Sync Options:
  - Backup frequency: Manual / Daily / Weekly
  - Format: PDF / Markdown / HTML / Ishu Backup
  - Target folder: /Ishu Notes Backups/ (configurable)
```

### Dropbox
```
Features:
  ✅ Auto-backup to /Apps/Ishu Notes/
  ✅ Import Markdown files from Dropbox
  ✅ Attach Dropbox files in notes
  ✅ Export notes to Dropbox
```

### OneDrive (Microsoft)
```
Features:
  ✅ Auto-backup to OneDrive/Apps/Ishu Notes/
  ✅ Import from OneDrive
  ✅ Sync OneNote → Ishu Notes (one-time migration)
```

### iCloud Drive (iOS / macOS)
```
Features:
  ✅ iCloud Backup for Ishu Notes app data
  ✅ Import files from iCloud Drive
  ✅ Export notes to iCloud Drive
  Note: Uses Apple's native document picker — no OAuth needed
```

---

## Calendar & Task Integrations

### Google Calendar
```
Features:
  - Create note from calendar event (context-aware)
  - Add reminder to Google Calendar from note
  - See upcoming events in sidebar (optional)
  - "Meeting Notes" template auto-fills with event title, attendees
  - Note linked to event → shows up in event details

Setup:
  OAuth 2.0 with calendar.events.readonly scope (read)
  calendar.events scope (write — for adding reminders)
```

**Create note from event:**
```
When creating new note:
  [📅 From calendar event]
  
  Today's events:
  ● 10:00 AM — Team Standup (30 min)
  ● 2:00 PM — Product Review (1 hr)
  
  [Select event → Auto-fill template]
```

### Apple Calendar (iOS/macOS)
- EventKit integration (native, no OAuth)
- Same features as Google Calendar

### Notion
```
Import (one-time migration):
  - Import all Notion pages
  - Preserves: text, tables, images, nested pages
  - Tags mapped to Ishu Notes tags
  - Databases → Ishu Notes database blocks

Export TO Notion:
  - Push selected notes/notebooks to Notion workspace
  - Ongoing sync: two-way (Premium feature)

Setup:
  Notion OAuth → Select workspace → Select pages to import
```

### Todoist / TickTick / Things 3
```
Features:
  - Create task in Todoist when note has unchecked items
  - Check off task in Todoist → syncs back to note
  - Import tasks from Todoist as checklist note
  - @mention to create task: "@task Buy milk"
```

---

## Communication Integrations

### Email (Gmail / Outlook)

**Ishu Notes Email Address:**
Each user gets a unique capture email: `ishu-{userid}@capture.ishunotes.com`

```
Forward any email → Creates note in Inbox
Email subject → Note title
Email body → Note content (HTML preserved)
Attachments → Attached to note
```

**Gmail Add-on:**
- Right panel in Gmail shows linked Ishu Notes for the email thread
- "Save to Ishu Notes" button in email

### Slack
```
Slash Command:
  /ishunotes new [title]          → Create new note
  /ishunotes search [query]       → Search notes
  /ishunotes recent               → Show recent notes
  /ishunotes save                 → Save current Slack message as note

Bot Integration:
  - Share note link in Slack → Rich unfurl preview
  - @IshuBot save [text]          → Creates note
  - Scheduled daily digest of modified notes
```

### Telegram Bot
```
@IshuNotesBot commands:
  /new [title]     → Create new note
  /search [query]  → Search notes
  /list            → Recent notes
  /voice           → Record and transcribe voice note
  Send any text    → Save as quick note to Inbox
  Send any image   → Create note with image
  Send any file    → Save attachment to note
```

### Discord Bot
```
Commands:
  !note new [title]         → Create note
  !note search [query]      → Search
  !note share [noteId]      → Share note in channel
```

---

## Zapier / Make (Integromat) / n8n Integration

### Ishu Notes as Trigger (Events that trigger workflows)

| Trigger | Description |
|---------|-------------|
| `note.created` | A new note is created |
| `note.updated` | A note is modified |
| `note.deleted` | A note is trashed |
| `note.shared` | A note is shared |
| `tag.added` | Tag added to a note |
| `checklist.checked` | Checklist item checked |
| `reminder.fired` | A note reminder goes off |

### Ishu Notes as Action (What workflows can do)

| Action | Description |
|--------|-------------|
| Create Note | Create a note with title, body, tags |
| Update Note | Update note content or metadata |
| Append to Note | Add content to end of existing note |
| Add Tag | Add tag to a note |
| Create Checklist | Create checklist from list of items |
| Search Notes | Search and return results |
| Get Note | Retrieve note content |

### Example Zapier Workflows

```
Trigger: New email with label "Important" (Gmail)
Action: Create note in Ishu Notes "Email" notebook
        Title: [Email Subject]
        Body:  [Email Body]
        Tags:  ["email", "important"]

---

Trigger: New row in Google Sheets
Action: Create note in "Data" notebook
        Title: [Column A] — [Column B]
        Body:  All column values as table

---

Trigger: Form submitted (Google Forms / Typeform)
Action: Create note with form responses
        Tag with form name

---

Trigger: New star in GitHub
Action: Create note in "Dev Bookmarks"
        Title: [Repo Name]
        Body:  [Repo Description] + [URL]
```

---

## Webhooks (Developer API)

### Outgoing Webhooks

Configure webhook endpoints to receive events:

```
Settings → Developer → Webhooks → [Add Endpoint]
URL: https://your-server.com/ishu-webhook
Secret: (auto-generated, used to verify signature)
Events: [Select events to receive]
```

**Webhook Payload:**
```json
{
  "event": "note.created",
  "timestamp": "2026-06-22T15:00:00Z",
  "userId": "user_abc123",
  "data": {
    "noteId": "note_xyz789",
    "title": "Meeting Notes",
    "notebookId": "nb_work",
    "tags": ["work", "meeting"],
    "contentType": "rich-text",
    "wordCount": 342
  },
  "signature": "sha256=abc123def456..."
}
```

**Signature Verification:**
```typescript
import crypto from 'crypto';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')}`;
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}
```

### Incoming Webhooks (Create Notes via HTTP)

```bash
# Create a note via webhook
curl -X POST https://api.ishunotes.com/api/v1/webhooks/inbound \
  -H "X-Webhook-Key: whk_yourkeyhere" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Alert: Server Down",
    "body": "Production server is unreachable as of 15:00 UTC",
    "notebookId": "nb_alerts",
    "tags": ["alert", "ops"],
    "priority": "high"
  }'
```

---

## REST API (External Access)

### Personal API Keys

```
Settings → Developer → API Keys → [Generate Key]

Key types:
  - Read-only: Can only GET data
  - Read-write: Full CRUD access
  - Admin: Can manage sharing and settings

Key format: isk_live_abc123...  (live)
            isk_test_abc123...  (sandbox)
```

### API Rate Limits

| Plan | Requests/min | Requests/day |
|------|-------------|-------------|
| Free | 30 | 1,000 |
| Pro | 120 | 10,000 |
| Team | 300 | 50,000 |
| Enterprise | Custom | Custom |

---

## AI Integration (External)

### OpenAI Plugin / GPT Actions
- Expose Ishu Notes as ChatGPT plugin
- User can ask ChatGPT: "Search my notes for machine learning"
- GPT Actions: Create, read, and update notes from ChatGPT

### Custom AI Model Support (Enterprise)
- Point AI features to your own OpenAI-compatible endpoint
- Supports: Azure OpenAI, Anthropic, Ollama (local), Groq
- Configure in Settings → AI → Custom Endpoint

---

## Integration Health Dashboard

```
Settings → Integrations:

Connected Integrations:

  ✅ Google Drive            Last sync: 2 min ago      [Manage]
  ✅ Google Calendar         Connected                  [Manage]
  ✅ Slack                   @IshuBot active           [Manage]
  ⚠️ Zapier                  Rate limit warning         [Manage]
  ❌ Notion                  Token expired              [Reconnect]

Available to Connect:
  [Dropbox]  [OneDrive]  [Todoist]  [GitHub]  [Telegram]  [+More]
  
Developer:
  [API Keys →]  [Webhooks →]  [OAuth Apps →]
```
