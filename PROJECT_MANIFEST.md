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
| **Version** | 1.0.0 |
| **Last Updated** | June 2026 |
| **Status** | Source integrated; production setup and owner authorization are not complete |

---

## What This System Does

A **governance platform** for research ethics review in Addis Ababa.
It manages the full lifecycle of research protocol submissions — from initial investigator submission through administrative screening, expert ethical review, committee decision, and official clearance issuance.

**Six user roles:** Investigator · Reviewer · Secretary · Vice Chairperson · Chairperson · Administrator
**Deployment targets:** Google Apps Script (requires owner setup) · Standalone mock-data preview (`preview.html`)

---

## Entry Points

| Entry Point | File | Notes |
|---|---|---|
| **Application start (production)** | `Code.gs` | `doGet(e)` serves the web app via GAS |
| **Main HTML shell** | `Index.html` | Auth screen + app layout; loaded by `doGet()` |
| **Offline standalone demo** | `preview.html` | Compiled single-file with mock data; open in any browser |
| **System configuration** | `server/Config.gs` | All IDs, constants, business rules |
| **Build tool** | `build_preview.ps1` | Compiles preview.html from source files |
| **CI/CD deploy** | `.github/workflows/deploy-irerc.yml` | Optional; pushes sources and updates a configured existing GAS deployment |

---

## Frontend

| File | Purpose |
|---|---|
| `Index.html` | Root HTML container; includes styles and client files via private GAS `include_()` |
| `client/app.html` | Application state (`AppState`), hash router, auth handlers, mock API bridge |
| `client/views.html` | 16 dynamic view renderers, dashboards, modals, tables, clearance certificate |
| `styles/styles.html` | Complete design system: CSS variables, layout, components, responsive styles |

---

## Backend

All backend files live in `server/` and run on Google Apps Script (V8 engine).

| File | Responsibility |
|---|---|
| `server/Config.gs` | Central configuration, roles, statuses, table names, and Google resource IDs |
| `server/Database.gs` | Google Sheets-backed database helpers |
| `server/Auth.gs` | Password login, server-issued expiring sessions, role checks, and one-time administrator bootstrap |
| `Code.gs` | Public `api*` endpoints; API wrappers validate session tokens and apply authorization |
| `server/Users.gs` | Committee member and investigator account operations |
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

**Resource identifiers:** No confirmed Google resource IDs are included. These values are blank and must be set to owner-approved resources before initialization.

| Config Key | Value | Description |
|---|---|---|
| `CFG.DB_SS_ID` | Blank | Primary Google Sheets database |
| `CFG.SHEET_ID` | Blank | Scanner output spreadsheet |
| `CFG.FOLDER_ID` | Blank | Google Drive document vault root |
| `SIGNATURE_FILE_ID` | Script Property; unset | Restricted Drive signature image |
| `CFG.PROTOCOL_ID_PREFIX` | `AAPHREML-IRERC` | Protocol code prefix (e.g. `AAPHREML-IRERC-2026-0001`) |
| `CFG.ETHICS_QUORUM` | `2` | Minimum approvals for ethics quorum |
| `CFG.REVIEW_DEADLINE_DAYS` | `7` | Working days for reviewer deadline |
| `CFG.MAX_FILE_SIZE_MB` | `25` | Maximum document upload size |

---

## Data Storage

| Storage | Technology | Contents |
|---|---|---|
| **Primary database** | Google Sheets (`DB_SS_ID`) | Relational tables: users, protocols, assessments, decisions, audit logs, etc. |
| **Document vault** | Google Drive (`FOLDER_ID`) | Uploaded protocol documents, versioned by amendment |
| **Scanner output** | Google Sheets (`SHEET_ID`) | Document completeness checks and extracted data |
| **Sessions** | GAS `PropertiesService` | Server-side session tokens (production only) |

---

## External Services

| Service | Purpose | How Configured |
|---|---|---|
| **Google Apps Script** | Runtime engine | Deployed via `clasp`; configure project ID in `.clasp.json` or GitHub environment |
| **Google Sheets** | Relational database | Owner-configured IDs in `server/Config.gs` |
| **Google Drive** | Document vault | Owner-configured folder ID in `server/Config.gs` |
| **Gmail / MailApp** | Email notifications | Uses the deploying user's Google account |
| **GitHub Actions** | Optional CI/CD pipeline | `.github/workflows/deploy-irerc.yml`; requires protected environment settings |
| **Google Fonts** | Typography | CDN: Outfit, Plus Jakarta Sans, JetBrains Mono |
| **Font Awesome** | Icons | CDN 6.4.0 |

---

## Google Integrations

### GitHub → Google Apps Script
When configured, the `irerc-production` environment workflow pushes source files and updates the existing deployment on `main`. It does not provision a project or initial deployment.

### GAS → Google Sheets
The backend reads and writes all protocol data through the `Database.gs` abstraction layer.

### GAS → Google Drive
`Documents.gs` uploads protocol files to versioned per-protocol subfolders.
The official signature is loaded from a restricted Drive file only for an authenticated administrator, secretary, or chairperson when the facility-access letter is opened.

---

## Deployment

### Production setup
1. Create an institution-owned Apps Script project and confirm the Google Sheets and Drive resource IDs in `server/Config.gs`.
2. Push the source, initialize the database, create the first administrator through the one-time Script Properties bootstrap, and configure `SIGNATURE_FILE_ID`.
3. Create the first web-app deployment and record its deployment ID.
4. Optionally configure the protected `irerc-production` GitHub environment with secret `CLASPRC_JSON` and variables `IRERC_SCRIPT_ID` and `IRERC_DEPLOYMENT_ID`.
5. Test with non-production data before enabling real use.

### Manual
```powershell
# Install clasp
npm install -g @google/clasp

# Authenticate
clasp login

# Set the Apps Script project ID in .clasp.json
# Push all files
clasp push --force

# Update an existing deployment after it is created
clasp update-deployment <deploymentId> --description "Manual deployment"
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
| Public logo | Embedded in `server/Assets.gs` | Portal branding | Included in the source and demo |
| Official signature | Restricted Google Drive file | Clearance certificate | Set `SIGNATURE_FILE_ID` Script Property; excluded from Git and demo |

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

- **Never commit** `.clasprc.json`, `credentials.json`, `.env`, or any `*.key.json` file
- The `.clasp.json` project ID is deliberately a placeholder; set it only for an authorized deployment
- Protected API endpoints require server-issued eight-hour session tokens; Google sign-in is disabled until a verifiable OAuth flow is implemented
- The official signature is stored outside the repository
- Password hashes use per-account salted SHA-256, not a password-specific slow KDF; this is a residual limitation before production use with sensitive data
- Document access requires COI declaration before a reviewer can open files
- Multi-write workflows use `withTransactionLock()` where implemented; verify each workflow's locking and recovery behavior before production use
- Database access fails closed until `CFG.DB_SS_ID` is configured; the app will not create or select an unconfigured spreadsheet
- No Apps Script project, deployment, Google authorization, or resource access is confirmed. An authorized owner must create the first project and deployment manually.

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
├── Code.gs                    ← Apps Script entry point and API dispatcher
├── Index.html                 ← Main HTML shell
├── preview.html               ← START HERE (demo/offline)
├── appsscript.json            ← GAS manifest
├── build_preview.ps1          ← Compile preview.html
├── .clasp.json                ← Clasp config (placeholder ID)
├── .gitignore                 ← Excludes secrets
├── PROJECT_MANIFEST.md        ← This file
├── CONFIGURATION_AND_USER_MANUAL.md
├── GITHUB_AND_GOOGLE_DRIVE_INTEGRATION_GUIDE.md
├── Logo File.png              ← Public logo source (embedded at build time)
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
        └── deploy-irerc.yml   ← Optional GAS deployment workflow
```

---

*Addis Ababa City Administration Health Bureau — AAPHREML-IRERC — 2026*
