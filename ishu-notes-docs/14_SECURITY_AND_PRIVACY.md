# Ishu Notes — Security & Privacy System

## Security Philosophy

**"Your notes are yours."** Ishu Notes is designed with privacy as a core feature, not an afterthought. Users choose their privacy level — from standard cloud sync to full end-to-end encryption where even Ishu Notes servers never see the content.

---

## Authentication System (via Clerk)

### Supported Auth Methods
| Method | Description |
|--------|-------------|
| Email + Password | Traditional with strong password requirements |
| Magic Link | Passwordless email link |
| Google OAuth | Sign in with Google |
| Apple OAuth | Sign in with Apple |
| GitHub OAuth | Sign in with GitHub |
| SMS OTP | Phone number verification |
| Passkeys (WebAuthn) | Biometric/hardware key |
| Enterprise SSO (SAML) | For teams (premium) |
| OIDC (OpenID Connect) | For custom enterprise providers |

### Session Management
- Session duration: 30 days (configurable)
- Remember devices (trusted device list)
- Force logout all devices option
- Active sessions list with device info
- Suspicious login alerts
- Geographic anomaly detection

### Multi-Factor Authentication (MFA)
- TOTP (Google Authenticator, Authy, etc.)
- SMS backup codes
- Hardware security keys (YubiKey via WebAuthn)
- Recovery codes (10 one-time codes)
- Mandatory MFA option for account

---

## Data Encryption

### Encryption at Rest

#### Server-Side (Standard)
```
User data → PostgreSQL (AES-256 at database level)
Media files → Object Storage (AES-256-GCM per-file)
Backups → AES-256 encrypted archives
API secrets → Environment variables (never in code)
Passwords → Argon2id hashing (memory-hard, salt per user)
```

#### Client-Side (Local Data)
```
IndexedDB → WebCrypto API (AES-GCM-256)
Keys derived from: session token + device fingerprint
LocalStorage (non-sensitive only): settings, preferences
Service Worker cache: API responses cached, non-sensitive
```

### End-to-End Encryption (E2EE) — Optional Premium Feature

When E2EE is enabled, **the server never sees note plaintext**:

```
User enables E2EE:
         │
         ▼
User sets E2EE passphrase
         │
         ▼
Key derivation (Argon2id):
  Input: passphrase + userId + salt
  Output: 256-bit master key
         │
         ▼
Key stored: Only in device's secure storage
(Never sent to server)
         │
         ▼
For each note:
  Generate random 256-bit content key
  Encrypt note content with content key (XChaCha20-Poly1305)
  Encrypt content key with master key
  Upload: encrypted_content + encrypted_key + metadata_only
         │
         ▼
Server stores: Only ciphertext (cannot read)
```

### E2EE Key Management
- **Device sync:** Master key synced between devices via encrypted key export
- **New device:** QR code scan or manual key entry
- **Lost passphrase:** No recovery (by design) — this is the security guarantee
- **Passphrase change:** Re-encrypt all notes with new key
- **Disable E2EE:** Decrypt all notes, upload plaintext (one-time operation)

### Encryption Algorithms
| Purpose | Algorithm |
|---------|----------|
| Symmetric encryption | XChaCha20-Poly1305 |
| Key derivation | Argon2id |
| Key exchange | X25519 (ECDH) |
| Digital signatures | Ed25519 |
| Password hashing | Argon2id (server) |
| TLS | TLS 1.3 minimum |
| JWT signing | EdDSA (Ed25519) |

---

## Encryption in Transit

### TLS Configuration
```nginx
ssl_protocols TLSv1.3;
ssl_ciphers TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256;
ssl_prefer_server_ciphers off;
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:50m;
ssl_session_tickets off;
ssl_stapling on;
ssl_stapling_verify on;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```

### Certificate Pinning (Mobile)
- Pin to specific certificate hash
- Backup pin for rotation
- Fails closed on pin mismatch

---

## API Security

### Request Authentication
```
Every API request:
  Authorization: Bearer {clerk_jwt_token}
       │
       ▼
Clerk SDK verifies JWT signature
       │
       ▼
Extract userId from verified claims
       │
       ▼
All database queries scoped to userId
(Never trust client-provided userId)
```

### Input Validation (Zod)
- All request bodies validated against Zod schemas
- Reject any extra/unknown fields (`strict()`)
- String length limits on all fields
- File upload size limits (10MB default, 100MB premium)
- MIME type validation (not just extension)

### Rate Limiting
| Endpoint Category | Rate Limit |
|------------------|------------|
| Authentication | 5 attempts/15 min per IP |
| API (general) | 100 req/min per user |
| AI features | 20 req/min per user |
| File upload | 10 uploads/min per user |
| Search | 30 req/min per user |
| Sync | 60 req/min per user |

### HTTP Security Headers
```
Content-Security-Policy: strict CSP policy
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(self), geolocation=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

---

## Note-Level Security

### Note Locking (Apple Notes-style)
- **PIN Lock:** 4-6 digit PIN
- **Password Lock:** Longer passphrase
- **Biometric Lock:** FaceID / TouchID / Fingerprint (via WebAuthn)
- Locked notes: Title visible, content hidden
- Wrong attempts: 3 tries → 30 second lockout → exponential increase
- Lost PIN/password: Can be reset with account master password

### Note Lock Behavior
```
Locked note:
- Shows title (encrypted separately) or generic "Locked Note"  
- Shows padlock icon
- Tap → enter PIN/password/biometric
- Verified → decrypt content in-memory only
- Close note → re-lock immediately
- Re-lock after: 1 min / 5 min / 30 min / Manual only
```

### Notebook-Level Locking
- Lock entire notebook with PIN/password
- All pages locked until notebook unlocked
- Notebook title still visible in sidebar

---

## Privacy Features

### Data Minimization
- Only collect data necessary for features
- Telemetry is opt-in only
- No behavioral tracking
- No third-party analytics (only privacy-respecting self-hosted)
- IP addresses not logged beyond 24 hours

### Data Residency (Premium)
- Choose data region: EU / US / Asia-Pacific
- Data stays in selected region
- Compliance: GDPR (EU), CCPA (California), PDPA (India)

### Privacy Mode
When enabled:
- Disables AI features (no content sent to AI)
- Disables handwriting recognition
- Disables smart search
- Notes stored encrypted at rest (server-side)
- Sync still works (encrypted)

### Data Portability
- Full data export at any time (GDPR Article 20)
- Download everything: notes, media, settings, usage data
- Machine-readable format (JSON + files)
- No fees for data export
- Completed within 48 hours

### Account Deletion
- Immediate: All notes deleted from all devices
- Cascading: All collaborator access revoked
- Backups: Purged within 30 days
- Confirmation email sent
- 14-day grace period with recovery option
- After grace period: Permanent, irreversible

---

## Compliance

### GDPR (EU)
- ✅ Right to access (data export)
- ✅ Right to erasure (account deletion)
- ✅ Right to portability (export in open formats)
- ✅ Right to rectification (edit any data)
- ✅ Lawful basis: Contract (providing service)
- ✅ Privacy by design (E2EE option)
- ✅ DPA (Data Processing Agreement available)

### CCPA (California, USA)
- ✅ Right to know (what data is collected)
- ✅ Right to delete
- ✅ Right to opt-out (of sale — we don't sell data)
- ✅ Non-discrimination for exercising rights

### COPPA (Children's Privacy, USA)
- Minimum age: 13 (or 16 in EU)
- Parental consent flow for 13-15
- No behavioral advertising to minors
- Family sharing mode for education

### SOC 2 Type II (Target for Enterprise)
- Security, Availability, Confidentiality controls
- Annual third-party audit
- Pentest results available under NDA

---

## Security Monitoring

### Threat Detection
- Brute force attack detection
- Credential stuffing protection (via Clerk)
- Anomalous geographic login alerts
- Account takeover detection (impossible travel)
- Unusual data export alerts (bulk export)

### Security Incident Response
1. Detection → Automated alert to security team
2. Assessment → Severity classification
3. Containment → Revoke affected tokens, block IPs
4. Notification → Users affected notified within 72 hours
5. Remediation → Fix deployed
6. Post-mortem → Improve defenses

### Bug Bounty Program
- Responsible disclosure via security@ishunotes.com
- Scope: Web app, API, mobile apps
- Rewards: $100 — $5,000 depending on severity
- Response SLA: 48 hours acknowledgment, 30 days fix

---

## Audit Logging

### Logged Events
| Event | Details Logged |
|-------|---------------|
| Login | Timestamp, IP, device, method, success/fail |
| Failed login | Timestamp, IP, attempt count |
| Note created/deleted | NoteID, timestamp, user |
| Notebook shared | With whom, permission level, timestamp |
| Data exported | Format, scope, timestamp |
| Password changed | Timestamp, IP |
| E2EE enabled/disabled | Timestamp |
| Note locked/unlocked | NoteID, method, timestamp |
| API token created | Token ID (not value), timestamp |
| Account deletion | Timestamp, reason (if provided) |

### Audit Log Access
- User: View own audit log in Settings → Security → Activity
- Admin: View team audit log (enterprise)
- Export: CSV download of audit log
- Retention: 1 year for paid plans, 90 days for free
