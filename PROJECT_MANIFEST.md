# PROJECT MANIFEST
## AAPHREML-IRERC Research Protocol Ethics Review System

> This file is the **single authoritative reference** for any developer or AI agent
> that needs to understand this project quickly. Read this before anything else.

---

## Identity

| Field | Value |
|---|---|
| **Project Name** | AAPHREML-IRERC Research Protocol Management & Ethics Review System |
| **Short Name / Acronym** | AAPHREML-IRERC |
| **Organization** | Addis Ababa City Administration Health Bureau |
| **Committee** | Institutional Research Ethics Review Committee (IRERC) |
| **Country** | Federal Democratic Republic of Ethiopia |
| **Version** | 1.0.0 (Production Release) |
| **Last Updated** | October 2026 |
| **Status** | ✅ Complete — Production Ready |

---

## What This System Does

A **governance platform** for research ethics review in Addis Ababa.  
It manages the full lifecycle of research protocol submissions — from initial investigator submission through administrative screening, expert ethical review, committee decision, and official clearance issuance.

**Six user roles:** Investigator · Reviewer · Secretary · Vice Chairperson · Chairperson · Administrator  
**Two deployment modes:** Live (Google Apps Script) · Offline Demo (`preview.html`)

---

## Entry Points

| Entry Point | File | Notes |
|---|---|---|
| **Application start (production)** | `Code.gs` | `doGet(e)` serves the web app via GAS |
| **Main HTML shell** | `Index.html` | Auth screen + app layout; loaded by `doGet()` |
| **Offline standalone demo** | `preview.html` | Compiled single-file; open in any browser |
| **System configuration** | `server/Config.gs` | All IDs, constants, business rules |
| **Build tool** | `build_preview.ps1` | Compiles preview.html from source files |
| **CI/CD deploy** | `.github/workflows/deploy.yml` | Pushes to GAS on merge to `main` |
| **GitHub Pages** | `.github/workflows/pages.yml` | Publishes `preview.html` as live demo |

---

## Frontend

| File | Purpose |
|---|---|
| `Index.html` | Root HTML container; includes styles, app.html, views.html via GAS `include()` |
| `client/app.html` | Application state (`AppState`), hash router, auth handlers, mock API bridge |
| `client/views.html` | 16 dynamic view renderers, dashboards, modals, tables, clearance certificate |
| `styles/styles.html` | Complete design system: CSS variables, layout, components, responsive styles |

---

## Backend

All backend files live in `server/` and run on Google Apps Script (V8 engine).

| File | Responsibility |
|---|---|
| `server/Config.gs` | Central config object `CFG`, roles `ROLES`, status constants `STATUS`, table names `TABLES`, assessment criteria |
| `server/Database.gs` | `dbGetAll()`, `dbFindById()`, `dbFind()`, `dbInsert()`, `dbUpdate()` — relational abstraction over Google Sheets |
| `server/Auth.gs` | `loginUser()`, `logoutUser()`, `getSessionUser()`, `requireRole()`, password hashing, RBAC enforcement |
| `server/Users.gs` | `getCommitteeMembers()`, `saveCommitteeMember()`, `registerInvestigator()` |
| `server/Submission.gs` | `submitNewProtocol()`, `validateSubmissionData_()`, `generateNextProtocolCode()`, edit/resubmit |
| `server/Screening.gs` | `markProtocolReceived()`, `performAdministrativeCheck()` — completeness gate |
| `server/Reviews.gs` | `assignReviewersToProtocol()`, `reassignReviewer()`, `declareReviewerCoi()` |
| `server/Assessments.gs` | `prepareAssessmentForm()`, `submitCompletedAssessment()`, 20-point criteria scoring |
| `server/Expedited.gs` | `recordExpeditedClassification()`, `submitExpeditedReviewDecision()` |
| `server/Decisions.gs` | `recordFormalDecision()`, `verifyConditionCompliance()` — quorum-based clearance |
| `server/Lifecycle.gs` | `submitProtocolAmendment()`, `submitContinuingReview()`, `submitProtocolTermination()` |
| `server/Documents.gs` | `uploadProtocolDocument()`, `getProtocolDocumentsWithHistory()`, `verifyDocument()` — Drive vault |
| `server/Meetings.gs` | `scheduleMeeting()`, `getMeetingDetails()`, `concludeMeetingWithDecisions()` |
| `server/Protocols.gs` | `getAllProtocols()`, `getProtocolDetails()`, status state machine, access-scoped queries |
| `server/Dashboard.gs` | `getDashboardMetrics()` — 16 KPI metrics, 8 chart datasets, pending actions |
| `server/Reports.gs` | `generateInstitutionalReport()` — compliance and activity reports |
| `server/Communications.gs` | `sendDecisionCommunication()`, email notification dispatch |
| `server/Audit.gs` | `getSystemAuditLogs()`, `getProtocolAuditTrail()` — immutable event log |
| `server/Scanner.gs` | `processUploadedFile()` — 28-section Word document completeness scanner |
| `server/SeedData.gs` | `seedDemoData()` — loads 20 realistic Ethiopian research protocols |
| `server/Utils.gs` | Shared helpers: `apiSuccess()`, `apiError()`, `sanitizeString()`, `withTransactionLock()` |

---

## Configuration

All configuration is centralized in `server/Config.gs` in the `CFG` object.

**Critical identifiers — do not change without updating the live system:**

| Config Key | Value | Description |
|---|---|---|
| `CFG.SPREADSHEET_ID` | `14vqOZKSZZ6LXYco8NOsiK7-1PCUbUPfYzrVr-7OOAEE` | Primary Google Sheets database |
| `CFG.SHEET_ID` | `1CgFPhbEKXo1q6i-UROseWyKvBAk4Pl5mb2eqc6xdiKM` | Scanner output spreadsheet |
| `CFG.FOLDER_ID` | `1k-1rf7Hu6rzuxYy7PEnRO3XNPN4f8O-5` | Google Drive document vault root |
| `CFG.PROTOCOL_ID_PREFIX` | `AAPHREML-IRERC` | Protocol code prefix (e.g. `AAPHREML-IRERC-2026-0001`) |
| `CFG.ETHICS_QUORUM` | `2` | Minimum approvals for ethics quorum |
| `CFG.REVIEW_DEADLINE_DAYS` | `7` | Working days for reviewer deadline |
| `CFG.MAX_FILE_SIZE_MB` | `25` | Maximum document upload size |

---

## Data Storage

| Storage | Technology | Contents |
|---|---|---|
| **Primary database** | Google Sheets (`SPREADSHEET_ID`) | 27 relational tables: users, protocols, assessments, decisions, audit logs, etc. |
| **Document vault** | Google Drive (`FOLDER_ID`) | Uploaded protocol documents, versioned by amendment |
| **Scanner output** | Google Sheets (`SHEET_ID`) | Document completeness checks and extracted data |
| **Sessions** | GAS `PropertiesService` | Server-side session tokens (production only) |

---

## External Services

| Service | Purpose | How Configured |
|---|---|---|
| **Google Apps Script** | Runtime engine | Deployed via `clasp push`; `scriptId` in `.clasp.json` / GitHub secret |
| **Google Sheets** | Relational database | IDs hardcoded in `server/Config.gs` |
| **Google Drive** | Document vault | Folder ID in `server/Config.gs` |
| **Gmail / MailApp** | Email notifications | Uses the deploying user's Google account |
| **GitHub Actions** | CI/CD pipeline | `.github/workflows/deploy.yml` and `pages.yml` |
| **GitHub Pages** | Live demo hosting | Publishes `preview.html` as `index.html` |
| **Google Fonts** | Typography | CDN: Outfit, Plus Jakarta Sans, JetBrains Mono |
| **Font Awesome** | Icons | CDN 6.4.0 |

---

## Google Integrations

### GitHub → Google Apps Script
Every push to `main` automatically deploys all source files to GAS via `clasp push`.

### GitHub → GitHub Pages
Every push to `main` publishes `preview.html` as the live interactive demo.

### GAS → Google Sheets
The backend reads and writes all protocol data through the `Database.gs` abstraction layer.

### GAS → Google Drive
`Documents.gs` uploads protocol files to versioned per-protocol subfolders.  
`Code.gs` creates clearance letter documents directly in Drive via `DocumentApp`.

---

## Deployment

### Production (Recommended)
1. Set GitHub secrets: `CLASPRC_JSON` (clasp auth) and `SCRIPT_ID` (GAS project ID)
2. Push to `main` — GitHub Actions handles the rest automatically

### Manual
```powershell
# Install clasp
npm install -g @google/clasp

# Authenticate
clasp login

# Set script ID in .clasp.json
# Push all files
clasp push --force

# Deploy web app
clasp deploy --description "Manual deployment"
```

### Offline Demo
```
Open preview.html in any browser — no installation required
```

### Rebuild Demo After Source Changes
```powershell
.\build_preview.ps1
```

---

## Assets

| File | Location | Purpose | Notes |
|---|---|---|---|
| `Logo File.png` | Project root | Addis Ababa City Administration Health Bureau logo | Used in clearance certificate; must stay at root |
| `Signature.png` | Project root | Official chairperson signature | Used in clearance certificate; must stay at root |
| `Certeficate of Clearance Letter.docx` | Project root | Historical reference clearance letter template | Do not delete; reference document |

---

## Documentation

| File | Location | Purpose |
|---|---|---|
| `docs/README.md` | `docs/` | Project overview, quick start, folder map |
| `docs/ARCHITECTURE.md` | `docs/` | Full system design, data flow, deployment guide |
| `docs/CHANGE_LOG.md` | `docs/` | Complete record of all changes |
| `PROJECT_MANIFEST.md` | Root | This file — single-page project reference |
| `CONFIGURATION_AND_USER_MANUAL.md` | Root | Full deployment and user operations manual |
| `GITHUB_AND_GOOGLE_DRIVE_INTEGRATION_GUIDE.md` | Root | GitHub + Drive integration guide |

---

## Security Notes

- **Never commit** `.clasprc.json`, `credentials.json`, `.env`, or any `*.key.json` file — all in `.gitignore`
- The `.clasp.json` `scriptId` field currently contains a placeholder (`YOUR_APPS_SCRIPT_ID_HERE`) — the real ID is injected at deploy time from the `SCRIPT_ID` GitHub secret
- Passwords are SHA-256 hashed before storage in Google Sheets
- All API calls are RBAC-gated in `Auth.gs` — no function is publicly accessible without role verification
- Document access requires COI declaration before a reviewer can open files
- All state changes use `withTransactionLock()` to prevent concurrent modification

---

## Known Limitations

| # | Limitation | Impact |
|---|---|---|
| 1 | Google Sheets has row limits (~10M cells) | Sufficient for years of institutional use; not a near-term concern |
| 2 | GAS execution timeout (6 min per call) | Large seed data or bulk operations may need pagination |
| 3 | GAS 100 email/day limit (free accounts) | Production requires a Google Workspace account for higher limits |
| 4 | `preview.html` mock API uses in-memory state | Data resets on page refresh in offline mode — by design |
| 5 | File uploads in GAS are base64-encoded | Large files (>25MB) are rejected by design; limit configurable in `CFG` |

---

## Folder Structure (Quick Reference)

```
AAPHREML-IRERC/
├── Code.gs                    ← START HERE (production)
├── Index.html                 ← Main HTML shell
├── preview.html               ← START HERE (demo/offline)
├── appsscript.json            ← GAS manifest
├── build_preview.ps1          ← Compile preview.html
├── .clasp.json                ← Clasp config (placeholder ID)
├── .gitignore                 ← Excludes secrets
├── PROJECT_MANIFEST.md        ← This file
├── CONFIGURATION_AND_USER_MANUAL.md
├── GITHUB_AND_GOOGLE_DRIVE_INTEGRATION_GUIDE.md
├── Logo File.png              ← Bureau logo (must stay at root)
├── Signature.png              ← Chairperson signature (must stay at root)
├── Certeficate of Clearance Letter.docx  ← Historical reference
├── test_word_check.ps1        ← Dev audit script
│
├── client/
│   ├── app.html               ← State, router, auth, mock API
│   └── views.html             ← All 16 UI views
│
├── server/                    ← All backend logic (21 .gs files)
│   ├── Config.gs              ← ⚠ Critical IDs and constants here
│   ├── Database.gs            ← DB abstraction layer
│   └── [19 other modules]
│
├── styles/
│   └── styles.html            ← Design system CSS
│
├── docs/
│   ├── README.md
│   ├── ARCHITECTURE.md
│   └── CHANGE_LOG.md
│
└── .github/
    └── workflows/
        ├── deploy.yml         ← GAS deployment
        └── pages.yml          ← GitHub Pages
```

---

*Addis Ababa City Administration Health Bureau — AAPHREML-IRERC — 2026*
