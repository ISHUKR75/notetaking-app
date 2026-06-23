# Ishu Notes — Real-Time Collaboration System

## Overview

Ishu Notes supports Google Docs-style real-time collaboration built on Yjs CRDT and Socket.IO, allowing multiple users to edit the same note simultaneously with zero conflicts.

---

## Collaboration Architecture

```
User A (editing)           User B (editing)           User C (viewing)
     │                          │                          │
     ▼                          ▼                          ▼
Yjs Y.Doc (local)          Yjs Y.Doc (local)          Yjs Y.Doc (local)
     │                          │                          │
     └──────────────────────────┼──────────────────────────┘
                                │
                    WebSocket Server (y-websocket)
                                │
                    Yjs Server Document (canonical)
                                │
                         PostgreSQL Sync
                         (persisted state)
```

---

## Sharing & Permissions

### Share Methods

#### 1. Invite by Email
- Enter email → choose permission level → send invite
- Recipient receives email with join link
- Pending invites shown in collaborators list
- Can resend or revoke pending invites

#### 2. Share Link (Apple Notes-style)
- Generate unique share link
- Three link types:
  - **View only** — Read note, cannot edit
  - **Comment** — Can add comments, cannot edit
  - **Edit** — Full edit access
- Link expiry: Never / 24h / 7d / 30d / custom
- Link password protection option
- Revoke link at any time

#### 3. Workspace Sharing (Teams/Notebooks)
- Share entire notebook with a team
- All notebook members inherit permissions
- Notebook-level roles: Viewer / Commenter / Editor / Admin

### Permission Levels
| Permission | View | Comment | Edit Content | Manage Collaborators | Delete |
|------------|------|---------|--------------|----------------------|--------|
| Viewer     | ✅ | ❌ | ❌ | ❌ | ❌ |
| Commenter  | ✅ | ✅ | ❌ | ❌ | ❌ |
| Editor     | ✅ | ✅ | ✅ | ❌ | ❌ |
| Admin      | ✅ | ✅ | ✅ | ✅ | ✅ |
| Owner      | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Real-Time Features

### Live Presence
When multiple users are in the same note:

```
[Note Title]                            [Ishu] [Priya] [Rahul] [+2 more]
                                              ↑ avatars with colored dots
```

- **Cursor positions:** Each user's cursor shown in their color
- **Active selections:** Highlighted in collaborator's color
- **Name tooltips:** Hover cursor → see who's editing
- **Typing indicators:** "Priya is typing..." shown when active
- **Presence timeout:** User marked inactive after 30s no activity

### Live Cursor System
```typescript
interface CollaboratorPresence {
  userId: string;
  displayName: string;
  avatarUrl: string;
  color: string;              // Unique color per user per session
  cursor: {
    anchor: number;           // Selection start position
    head: number;             // Selection end position
    isHandwriting: boolean;   // Is using canvas?
    canvasPosition?: {x: number; y: number};
  };
  lastActive: number;         // Unix timestamp
}
```

### Live Edit Conflict Prevention
- **Block-level locking (optional):** Lock a paragraph while editing (like Figma section locking)
- **Typing conflict:** Yjs CRDT merges character-by-character
- **No "someone else is editing" blocking** — full simultaneous editing
- **Awareness protocol:** Yjs awareness propagates presence data without server

### Live Canvas Collaboration
For handwriting pages:
- See collaborator strokes appearing in real-time
- Each user's strokes shown in their assigned color initially
- Option: "Show in original color" — shows strokes in pen's actual color
- Pointer/laser tool: Show cursor as visible pointer for presentation

---

## Comments System

### Inline Comments (Google Docs-style)
1. Select any text → "Comment" button
2. Comment attaches to selection
3. Selection highlighted in yellow
4. Comment thread in sidebar

### Comment Features
- **Threaded replies:** Reply to any comment
- **@mentions:** Notify specific collaborators
- **Emoji reactions:** 👍❤️😄😮 on comments
- **Resolve:** Mark as resolved (hides from view, still accessible)
- **Delete:** Comment author or note owner can delete
- **Comment history:** See all resolved comments
- **Comment export:** Download all comments as CSV

### Canvas Annotations
For handwriting pages:
- Sticky note annotations (placed anywhere on canvas)
- Rubber stamp: "Approved", "Review", "Question"
- Voice annotation: Record 30-sec audio note attached to position
- Arrow/pointer: Draw arrow pointing to handwritten content

### Comment Notifications
- In-app notification bell
- Email notifications (configurable)
- Push notifications (if PWA installed)
- Batch digest: "3 new comments on your notes" (daily)

---

## Version History

### Version Tracking
Every change creates a version snapshot:
- **Auto-save versions:** Every 5 minutes of active editing
- **Named versions:** User creates named checkpoint ("Before major revision")
- **Daily versions:** One preserved per day, forever
- **Collaborator versions:** Snapshot when each collaborator joins

### Version UI
```
Version History Panel:

▼ Today
  • 3:45 PM — Edited by You (current)
  • 2:30 PM — Edited by Priya Singh
  • 1:15 PM — Named: "Before editing introduction"
  • 11:00 AM — Edited by Rahul Kumar

▼ Yesterday
  • 9:30 PM — Edited by You
  • 6:00 PM — Edited by Priya Singh

▼ June 20, 2026
  • 4:15 PM — Note created by You
```

### Version Comparison
- Select two versions → side-by-side diff view
- Added content: Green highlight
- Removed content: Red strikethrough
- Moved blocks: Blue arrows
- Restore entire version or just selected blocks

---

## Notifications System

### In-App Notifications
| Event | Notification |
|-------|-------------|
| Collaborator invited | "[Name] invited you to edit [Note Title]" |
| Someone edits your note | "[Name] edited [Note Title]" |
| Comment on your note | "[Name] commented: '...'" |
| Reply to your comment | "[Name] replied to your comment" |
| @Mention in note | "[Name] mentioned you in [Note]" |
| @Mention in comment | "[Name] mentioned you in a comment" |
| Invitation accepted | "[Name] accepted your invitation" |
| Note shared with you | "[Name] shared [Note] with view access" |
| Conflict detected | "Sync conflict in [Note] — tap to resolve" |

### Notification Preferences
- Per-note notification settings
- Global notification preferences
- Quiet hours (no notifications between 10 PM — 8 AM)
- Email digest frequency: Instant / Hourly / Daily / Weekly / Never

---

## Team Workspaces (Premium)

### Team Features
- Shared team library
- Team templates
- Admin controls
- Member management (invite, remove, change roles)
- Activity log: Who edited what, when
- Team analytics: Most active notes, contributors
- Shared tag taxonomy
- Team-wide search

### Admin Controls
- Restrict external sharing (prevent sharing outside org)
- Require note approval before publishing
- Audit log export
- SSO integration (SAML, OIDC)
- Data retention policies
- Custom branding (logo, colors)
