# System Architecture — AAPHREML-IRERC

**Addis Ababa City Administration Health Bureau**
**Institutional Research Ethics Review Committee (IRERC)**

---

## 1. Architecture Overview

The source is a modular Google Apps Script HtmlService application. The supplied Drive document folder ID is configured in `server/Config.gs`, but its access by Apps Script is not verified. Database/scanner spreadsheet IDs, the Apps Script project, deployment, and Google authorization remain owner setup requirements. The compiled local preview has no sample records or backend connection.

```
┌─────────────────────────────────────────────────────────────────┐
│          GOOGLE APPS SCRIPT TARGET (OWNER SETUP REQUIRED)       │
│                                                                 │
│   Browser  ──►  Google Apps Script Web App                     │
│                        │                                        │
│              ┌─────────┼─────────┐                             │
│              ▼         ▼         ▼                             │
│        Google Sheets  Drive    MailApp                          │
│        (Database)   (Files)  (Email)                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              LOCAL INTERFACE PREVIEW                            │
│                                                                 │
│   Browser  ──►  preview.html (layout inspection only)           │
│                  No backend connection or simulated records     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Production Deployment: Google Apps Script

### Entry Points

| File | Purpose |
|---|---|
| `Code.gs` | `doGet(e)` — serves the web app; private `include_()` helper; public `api*` functions |
| `Index.html` | Main HTML container loaded by `doGet()` |
| `appsscript.json` | Manifest: timezone, OAuth scopes, web app access settings |

### Request Flow

```
User Browser
    │
    ▼
doGet(e) in Code.gs
    │  creates HtmlService template from Index.html
    │  injects styles/styles.html
    │  injects client/app.html
    │  injects client/views.html
    ▼
Rendered Single-Page Application in browser
    │
    │  google.script.run.api*(...) calls
    ▼
Code.gs API dispatcher (api* functions)
    │
    ├── Auth.gs         (login, session, RBAC)
    ├── Users.gs        (user management)
    ├── Submission.gs   (protocol creation)
    ├── Screening.gs    (admin checks)
    ├── Reviews.gs      (reviewer assignment)
    ├── Assessments.gs  (ethical review forms)
    ├── Expedited.gs    (expedited review)
    ├── Decisions.gs    (formal decisions)
    ├── Lifecycle.gs    (amendments, renewals)
    ├── Documents.gs    (Drive upload/download)
    ├── Meetings.gs     (meeting management)
    ├── Dashboard.gs    (metrics & analytics)
    ├── Reports.gs      (compliance reports)
    ├── Communications.gs (email notifications)
    ├── Audit.gs        (audit trail)
    └── Scanner.gs      (document scanner)
         │
         ▼
    Database.gs  ←→  Google Sheets (27 tables)
    Documents.gs ←→  Google Drive (protocol folders)
```

---

## 3. Database Design

The system uses **Google Sheets as a relational database** via the `Database.gs` abstraction layer.

### Primary Spreadsheet (`DB_SS_ID`)
Contains the main application tables:

| Sheet/Table | Purpose |
|---|---|
| `users` | All user accounts (investigators, reviewers, admins) |
| `roles` | Role definitions and permissions |
| `committee_members` | IRERC committee roster |
| `investigators` | Investigator profiles |
| `institutions` | Registered institutions |
| `protocols` | All submitted research protocols |
| `protocol_details` | Extended protocol metadata |
| `protocol_ethics_info` | Ethics-specific data per protocol |
| `protocol_versions` | Version history |
| `protocol_documents` | Document registry per protocol |
| `document_versions` | Document version history |
| `reviewer_assignments` | Protocol–reviewer pairings |
| `assessment_forms` | Submitted reviewer assessments |
| `assessment_items` | Individual 20-point criteria scores |
| `expedited_determinations` | Expedited review records |
| `amendments` | Protocol amendment requests |
| `continuing_reviews` | Annual continuing review submissions |
| `terminations` | Protocol termination records |
| `irerc_meetings` | Scheduled IRERC meetings |
| `meeting_agenda_items` | Agenda items per meeting |
| `meeting_attendees` | Attendance records |
| `decisions` | Formal committee determinations |
| `decision_conditions` | Conditions attached to decisions |
| `communications` | All outgoing communications |
| `notifications` | In-app user notifications |
| `audit_logs` | Full system audit trail |
| `system_settings` | Configurable system parameters |

### Scanner Spreadsheet (`SHEET_ID`)
Used by the automated document scanner (`Scanner.gs`):

| Sheet | Purpose |
|---|---|
| `Initial Protocol` | Raw uploaded protocol data |
| `Extracted Data` | Parsed sections from Word documents |
| `Completeness Check` | 28-point completeness checklist results |

---

## 4. Document Storage: Google Drive

All protocol documents are stored in Google Drive under the root folder (`FOLDER_ID`).

```
AAPHREML_IRERC_Documents/          ← Root (CFG.FOLDER_ID)
├── AAPHREML-IRERC-2026-0001/      ← Protocol subfolder
│   ├── AAPHREML-IRERC-2026-0001_Protocol_v1.0.docx
│   ├── AAPHREML-IRERC-2026-0001_ConsentForm_v1.0.docx
│   └── AAPHREML-IRERC-2026-0001_Protocol_v2.0.docx  ← Amendment
├── AAPHREML-IRERC-2026-0002/
│   └── ...
└── ClearanceLetters/
    └── ClearanceLetter-AAPHREML-IRERC-2026-0001.gdoc
```

---

## 5. Authentication & Security

- Password hashes use per-account salted SHA-256 via `Utilities.computeDigest`; this is not a slow password KDF.
- Server-issued session tokens are hashed in Script Properties, expire after eight hours, and are required for protected API calls.
- **Role-Based Access Control (RBAC)** is enforced in the server services.
- Operations requiring multi-write consistency use `withTransactionLock_()` where implemented.
- Document access is COI-gated: reviewers must declare Conflict of Interest before viewing files.
- Administrator setup uses one-time `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` Script Properties; successful bootstrap removes them.
- Google sign-in fails closed until a verifiable OAuth token flow is implemented.

### Roles

| Role | Key Permissions |
|---|---|
| `System Administrator` | Full access to all views and admin functions |
| `Chairperson` | Final approval, clearance letter signing, meeting chairing |
| `Vice Chairperson` | Secondary oversight, meeting participation |
| `IRERC Secretary / Administrative Officer` | Screening, assignment, member management |
| `IRERC Member / Reviewer` | Independent assessment, COI declarations |
| `Investigator` | Submit protocols, respond to corrections, view own records |

---

## 6. Protocol Lifecycle State Machine

```
Draft
  │  (investigator submits)
  ▼
Submitted
  │  (secretariat marks received)
  ▼
Under Administrative Check
  │
  ├─── [Incomplete] ──► Incomplete / Correction Required ──► Submitted (resubmission)
  │
  └─── [Complete] ──► Submission Complete
                          │
                          ▼
                 Under Review Type Classification
                          │
                ┌─────────┼─────────────┐
                ▼         ▼             ▼
           Full Board  Expedited   Exemption
           Review      Review      Review
                │         │
                ▼         ▼
           Reviewer Assigned
                │
                ▼
           Under Review
                │
                ▼
           Under Study Assessment
                │
                ▼
           Awaiting IRERC Decision
                │
                ├── Approved ──────────────────► Final Decision Approved
                ├── Approved with Conditions ──► Preliminary Decision Issued
                ├── Modifications Required ───► (returned for revisions)
                ├── Deferred ──────────────────► (awaiting more info)
                └── Not Approved ─────────────► (closed)
                          │
                          ▼
                  Decision Communicated
                          │
                          ▼
                       Archived
```

Post-approval lifecycle:
- **Amendment** → Amendment Pending Review
- **Continuing Review** → Continuing Review Due → Continuing Review Pending
- **Termination** → Protocol Terminated → Archived

---

## 7. Automated Build System

`preview.html` is a **compiled interface preview** for layout inspection. It contains no simulated accounts or protocol records and does not connect to Apps Script, Sheets, or Drive. Remote font and icon assets may require an internet connection.

It is built by `build_preview.ps1`, which:
1. Reads `Index.html`
2. Inlines `styles/styles.html`, `client/app.html`, and `client/views.html` using the private template include markers.
3. Embeds the public logo, but not the official signature.
4. Writes the result to `preview.html`.

The client bridge requires `google.script.run`, which is available when the page is served by Apps Script HtmlService. Sign-in and data actions require the deployed Apps Script application.

To rebuild after any source file change:

```powershell
.\build_preview.ps1
```

---

## 8. Deployment Pipeline

### GitHub Actions

**`../.github/workflows/deploy-irerc.yml`** — Runs on demand or when Apps Script source files change on `main`:
1. Requires the `irerc-production` GitHub environment.
2. Installs `@google/clasp` and writes `~/.clasprc.json` from the environment secret on the ephemeral runner.
3. Injects `IRERC_SCRIPT_ID` into `.clasp.json` for the deployment.
4. Runs `clasp push --force` and updates the existing web-app deployment with `IRERC_DEPLOYMENT_ID`.
5. Does not create the Apps Script project, first deployment, or Google resources.

### Required GitHub Secrets

| Environment setting | Description |
|---|---|
| `CLASPRC_JSON` | Full contents of `~/.clasprc.json` (clasp OAuth token) |
| `IRERC_SCRIPT_ID` | Apps Script project ID (environment variable) |
| `IRERC_DEPLOYMENT_ID` | Existing web-app deployment ID (environment variable) |

---

## 9. Scanner Module

`Scanner.gs` automatically scans uploaded Word document (`.docx`/`.doc`) proposals for:
- 28 required protocol sections (Title, Abstract, Background, Methodology, Ethics, etc.)
- Ethiopian health research regulatory compliance sections
- Key data extraction (PI name, institution, sample size, study duration)
- Completeness scoring

Output is written to the Scanner Spreadsheet (`SHEET_ID`) under the `Completeness Check` tab.

---

## 10. External Dependencies

All external dependencies are loaded via CDN in `Index.html` / `preview.html`:

| Dependency | Version | Purpose |
|---|---|---|
| Font Awesome | 6.4.0 | Icons |
| Google Fonts (Outfit, Plus Jakarta Sans, JetBrains Mono) | Latest | Typography |

No npm packages. No build tools beyond the PowerShell compile script.

---

*Addis Ababa City Administration Health Bureau — AAPHREML-IRERC — 2026*
