# AAPHREML-IRERC Governance & Protocol Management System
## Complete Configuration, Deployment & User Operations Manual

**Addis Ababa City Administration Health Bureau**  
**Institutional Research Ethics Review Committee (IRERC)**  
*Federal Democratic Republic of Ethiopia*

---

## Table of Contents
1. [Architecture & Overview](#1-architecture--overview)
2. [Quick Start: Testing the Offline Standalone Demo](#2-quick-start-testing-the-offline-standalone-demo)
3. [Production Deployment to Google Apps Script](#3-production-deployment-to-google-apps-script)
4. [Database & Google Drive Configuration](#4-database--google-drive-configuration)
5. [User Sign-Up & Account Provisioning Guide](#5-user-sign-up--account-provisioning-guide)
6. [Strict Role-Based Access Control (RBAC)](#6-strict-role-based-access-control-rbac)
7. [Reviewer Document Opening & Conflict of Interest (COI) Gate](#7-reviewer-document-opening--conflict-of-interest-coi-gate)
8. [8-Step Investigator Submission Wizard & 28-Section Document Scanner](#8-8-step-investigator-submission-wizard--28-section-document-scanner)
9. [Automated Build Utility (`build_preview.ps1`)](#9-automated-build-utility-build_previewps1)
10. [Troubleshooting & FAQ](#10-troubleshooting--faq)

> **See also:**
> - [`docs/README.md`](docs/README.md) — Project overview and entry points
> - [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Full system design, data flow, and state machine
> - [`docs/CHANGE_LOG.md`](docs/CHANGE_LOG.md) — Complete record of all changes
> - [`PROJECT_MANIFEST.md`](PROJECT_MANIFEST.md) — Single-page machine-readable reference

---

## 1. Architecture & Overview

The **AAPHREML-IRERC** platform is an institutional research ethics governance suite designed specifically for public health institutions in Ethiopia, following international bioethics standards (CIOMS, Declaration of Helsinki, EFDA guidelines).

The application is architected with a dual deployment model:
- **Serverless Production Engine:** Runs natively inside **Google Apps Script (GAS)**, backed by **Google Sheets** as a relational database and **Google Drive** as a document repository.
- **Standalone Offline Client (`preview.html`):** A zero-dependency single-file HTML/CSS/JS distribution with an integrated mock API server, enabling instant evaluation, training, and testing in any modern web browser without internet or server access.

### Directory Structure
```
AAPHREML-IRERC/
├── Code.gs                   # GAS main entrypoint, doGet, and API dispatcher
├── Index.html                # Main container HTML with authentication screen
├── appsscript.json           # Manifest configuration with OAuth scopes
├── preview.html              # Standalone compiled offline bundle (single file)
├── build_preview.ps1         # Automated compiler script to assemble preview.html
├── test_word_check.ps1       # Developer audit script (Word doc enforcement check)
├── Logo File.png             # Addis Ababa City Administration Health Bureau logo
├── Signature.png             # Official chairperson signature image
├── Certeficate of Clearance Letter.docx  # Historical reference document
├── PROJECT_MANIFEST.md       # Machine-readable project metadata
├── CONFIGURATION_AND_USER_MANUAL.md      # This file
├── GITHUB_AND_GOOGLE_DRIVE_INTEGRATION_GUIDE.md
├── client/
│   ├── app.html              # State store, hash router, auth handlers, mock bridge
│   └── views.html            # 16 dynamic views, dashboards, modals, & tables
├── server/
│   ├── Config.gs             # Institutional configuration, sheet IDs, drive folder IDs
│   ├── Database.gs           # Google Sheets relational database abstraction engine
│   ├── Auth.gs               # Password hashing, session cookies, and RBAC gatekeeper
│   ├── Users.gs              # Committee roster, investigator profiles, user management
│   ├── Protocols.gs          # Submission, status transitions, and protocol dockets
│   ├── Screening.gs          # Administrative completeness checks and classification
│   ├── Reviews.gs            # Reviewer allocation, workload calculation, COI declarations
│   ├── Assessments.gs        # Multi-expert independent study assessment forms
│   ├── Expedited.gs          # Minimal-risk study determination workflow
│   ├── Decisions.gs          # Formal committee determination & clearance certificate
│   ├── Lifecycle.gs          # Post-approval amendments, annual renewals, terminations
│   ├── Documents.gs          # File upload pipeline and Drive document vault
│   ├── Meetings.gs           # Full board agenda, docket management, quorum minutes
│   ├── Reports.gs            # Compliance reports and institutional metrics
│   ├── Communications.gs     # Email notification dispatch
│   ├── Audit.gs              # Immutable system audit trail
│   ├── Scanner.gs            # Automated proposal document completeness scanner
│   ├── SeedData.gs           # Demonstration data loader with 20 Ethiopian protocols
│   └── Utils.gs              # Shared utility functions
├── styles/
│   └── styles.html           # Enterprise design system, CSS variables, responsive CSS
└── docs/
    ├── README.md             # Project overview and quick start
    ├── ARCHITECTURE.md       # Full system architecture and data flow
    └── CHANGE_LOG.md         # Version history and organizational changes
```

---

## 2. Quick Start: Testing the Offline Standalone Demo

To test or demo the platform immediately on Windows, macOS, or Linux:

1. Double-click or open [`preview.html`](preview.html) in any modern browser (Google Chrome, Microsoft Edge, Mozilla Firefox, or Safari).
2. The **Institutional Research Ethics Review Portal** landing page will appear with branding and authentication tabs.
3. **One-Click Role Testing:** Use the 6 direct access buttons on the Sign In panel to test the interface from any user perspective:
   - **Chairperson:** Full executive docket review, meeting determination, and clearance authorization.
   - **Vice Chairperson:** Secondary oversight and meeting assessment.
   - **Secretary (Ato Solomon):** Screening intake, administrative completeness checks, and reviewer assignments.
   - **Reviewer (Dr. Hanna):** "My Reviews", independent ethical assessment forms, and COI verification.
   - **Investigator (Dr. Dereje):** Submission wizard, "My Protocols", and correction tracking.
   - **Administrator:** Complete access to all 16 views, system audit logs, and settings.
4. **Responsive Drawer Navigation:** On mobile screens or tablets, tap the hamburger menu icon (`☰`) at top left to open the slide-out navigation drawer; tap anywhere on the dark backdrop to close it.

---

## 3. Production Deployment to Google Apps Script

To deploy this platform as a live institutional web application on Google Workspace:

### Step 3.1: Create Google Apps Script Project
1. Log in to your institutional Google account (e.g. `@aahb.gov.et`).
2. Navigate to [script.google.com](https://script.google.com) and click **New project**.
3. Name the project: `AAPHREML-IRERC Management System`.

### Step 3.2: Copy Project Files

#### Option A — Manual (Apps Script IDE)
In the Google Apps Script IDE, create the following files with matching types:

**Server Script files (`.gs`):**
- `Code.gs`
- `server/Config.gs`
- `server/Database.gs`
- `server/Auth.gs`
- `server/Users.gs`
- `server/Protocols.gs`
- `server/Screening.gs`
- `server/Reviews.gs`
- `server/Assessments.gs`
- `server/Expedited.gs`
- `server/Decisions.gs`
- `server/Lifecycle.gs`
- `server/Documents.gs`
- `server/Meetings.gs`
- `server/Reports.gs`
- `server/Communications.gs`
- `server/Audit.gs`
- `server/Scanner.gs`
- `server/SeedData.gs`
- `server/Utils.gs`

**Client & Style files (`.html`):**
- `Index.html`
- `styles/styles.html`
- `client/app.html`
- `client/views.html`

#### Option B — Automated with Clasp (Recommended)
```bash
npm install -g @google/clasp
clasp login
clasp create --title "AAPHREML-IRERC" --type webapp
clasp push
```

#### Option C — GitHub Actions (Fully Automated)
Set up the two required GitHub Secrets (see `GITHUB_AND_GOOGLE_DRIVE_INTEGRATION_GUIDE.md`):

| Secret Name | Value |
|---|---|
| `CLASPRC_JSON` | Full contents of your `~/.clasprc.json` after `clasp login` |
| `SCRIPT_ID` | Your Google Apps Script project ID |

Every push to `main` will then automatically deploy the latest code.

---

## 4. Database & Google Drive Configuration

Open [`server/Config.gs`](server/Config.gs) to configure your institutional Google resources.

### Step 4.1: Create Google Sheet Database
1. Go to Google Drive and create a new **Google Sheet**.
2. Name it: `AAPHREML-IRERC Database`.
3. Copy the spreadsheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/`**`1a2B3c4D5e6F7g8H9i0J`**`/edit`
4. Paste this ID into `server/Config.gs`:
   ```javascript
   var CFG = {
     SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID_HERE',
     ...
   };
   ```

### Step 4.2: Create Google Drive Vault Folder
1. In Google Drive, create a folder named `AAPHREML_IRERC_Documents`.
2. Copy the folder ID from the URL:
   `https://drive.google.com/drive/folders/`**`1AbCdEfGhIjKlMnOpQrSt`**
3. Paste this ID into `server/Config.gs`:
   ```javascript
   FOLDER_ID: 'YOUR_DRIVE_FOLDER_ID_HERE',
   ```

### Step 4.3: Initialize Tables & System Admin
1. In the Apps Script code editor, select the function **`initDatabase`** from the function dropdown.
2. Click **Run** and grant the required permissions (Spreadsheets, Drive, and Email).
3. The database engine will automatically create all 27 structured sheets (full schema listed in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)).
4. The default Administrator account will be initialized:
   - **Email:** `admin@aahb.gov.et`
   - **Password:** `Irerc@2026`

### Step 4.4: (Optional) Seed 20 Demonstration Protocols
To populate the system with 20 realistic Ethiopian research proposals (e.g., Cholera surveillance, Tuberculosis drug resistance, Maternal health mHealth trials):
1. In the Apps Script editor, select **`seedDemoData`** and click **Run**.
2. All demonstration records, reviewer assignments, and audit trails will be populated.

### Step 4.5: Deploy Web Application
1. Click **Deploy** > **New deployment**.
2. Select type: **Web app**.
3. Set configuration:
   - **Description:** `Production Release v1.0`
   - **Execute as:** `Me (your-admin@aahb.gov.et)`
   - **Who has access:** `Anyone` (or `Anyone within organization`)
4. Click **Deploy** and copy the resulting **Web App URL**.
5. Share this URL with investigators, committee members, and staff.

### Critical Configuration Values

| Config Key | Description | Example Value |
|---|---|---|
| `CFG.SPREADSHEET_ID` | Primary Google Sheets database ID | `14vqOZKSZZ6LXYco8NOsiK7-1PCUbUPfYzrVr-7OOAEE` |
| `CFG.SHEET_ID` | Scanner output spreadsheet ID | `1CgFPhbEKXo1q6i-UROseWyKvBAk4Pl5mb2eqc6xdiKM` |
| `CFG.FOLDER_ID` | Google Drive document vault folder ID | `1k-1rf7Hu6rzuxYy7PEnRO3XNPN4f8O-5` |
| `CFG.PROTOCOL_ID_PREFIX` | Protocol code prefix | `AAPHREML-IRERC` |
| `CFG.ETHICS_QUORUM` | Minimum approvals for quorum | `2` |
| `CFG.REVIEW_DEADLINE_DAYS` | Working days for reviewer deadline | `7` |
| `CFG.MAX_FILE_SIZE_MB` | Maximum upload file size | `25` |

> ⚠️ **Do not change `SPREADSHEET_ID`, `SHEET_ID`, or `FOLDER_ID`** without updating the live system. These link to production data stores.

---

## 5. User Sign-Up & Account Provisioning Guide

### A. Investigators (Researchers)
Researchers create their own accounts independently:
1. Open the portal URL and click the **Register** tab.
2. Complete the self-registration form:
   - Full Name with Title (e.g. `Dr. Abebe Kebede`)
   - Official Email Address
   - Telephone Number (Optional)
   - Affiliated Health Institution / University
   - Department / Division
   - Account Password (minimum 6 characters)
3. Click **Register as Investigator**.
4. The system validates inputs, provisions an investigator profile, and signs the user in immediately.

### B. Committee Members & Reviewers
Committee members do not self-register. They are provisioned by the **IRERC Secretary** or **Administrator**:
1. Log in as **IRERC Secretary** or **Administrator**.
2. Navigate to **Committee Roster** in the sidebar.
3. Click **+ Add Member**.
4. Fill in the institutional profile:
   - **Full Name with Title**
   - **Official Email**
   - **Professional Category:** Clinical Expert · Public Health Expert · Ethics/Legal Expert · Laboratory Scientist · Community Representative · Environmental Health Professional
   - **Committee Role:** `IRERC Member / Reviewer` · `Chairperson` · `Vice Chairperson` · `IRERC Secretary / Administrative Officer`
   - **Initial Password:** Default `Irerc@2026` (member should update after first login)
5. Click **Provision & Save Member**.

---

## 6. Strict Role-Based Access Control (RBAC)

The platform enforces strict role isolation across both the frontend navigation and backend API endpoints:

| Feature / Action | Admin | Secretary | Chair | Vice Chair | Reviewer | Investigator |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **See ALL Registered Protocols** | ✅ | ✅ | ❌ *(Scoped)* | ❌ *(Scoped)* | ❌ *(Assigned)* | ❌ *(Own Only)* |
| **Submit New Protocol Package** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Administrative Intake & Screening** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Assign & Reassign Reviewers** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Submit Study Assessment Form** | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| **Record Formal Board Determination** | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Issue Clearance Certificate** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Download Protocol Documents** | ✅ | ✅ | ✅ | ✅ | ✅ *(After COI)* | ✅ *(Own)* |
| **Reviewer COI Declaration Gate** | N/A | N/A | N/A | N/A | **Enforced** | N/A |
| **Committee Roster Management** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **System Audit Logs & Settings** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

**Notes:**
- **Chairperson & Vice Chairperson:** See only protocols assigned to them, or protocols at decision stages (`ASSESSMENT`, `IRERC_DECISION`, `PRELIMINARY_DECISION`, `FINAL_DECISION`).
- **Secretary:** Responsible for operational management, document screening, and reviewer assignment.
- **Administrator:** Full global authority across all workflows.

---

## 7. Reviewer Document Opening & Conflict of Interest (COI) Gate

To comply with Ethiopian national ethics regulations and international GCP standards, the platform locks protocol documents behind an active COI declaration gate:

1. **Assignment:** The Reviewer sees the protocol under **My Reviews**.
2. **Opening the Dossier:** Reviewer clicks **Open Dossier**.
3. **COI Verification Check:**
   - If COI has not been declared, the Documents tab displays:
     > ⚠️ *Conflict of Interest Declaration Required: You must declare any competing financial, institutional, or personal interests before accessing study documents.*
   - Document download links and review buttons remain locked.
4. **Submitting COI:** Reviewer clicks **Declare COI** and confirms no competing interests exist.
5. **Document Access Granted:** Status updates to `None Declared (Cleared)`. Download buttons activate for all protocol documents in the Google Drive vault.

---

## 8. 8-Step Investigator Submission Wizard & 28-Section Document Scanner

### The 8 Wizard Steps

| Step | Name | Key Fields |
|---|---|---|
| 1 | Investigator & Academic Profile | Name, institution (30 preset), department (24 preset), advisor contact, activity type (Survey/Project) |
| 2 | Study Focus & Timeline | Protocol title, 13 health focus areas, data collection dates, collection frequency |
| 3 | Research Methodology | Methodology type, sample size, study design (8 designs), clinical trial attributes, objectives |
| 4 | Geographic Coverage | Administrative scope, target health facilities, gender, target population groups |
| 5 | Data Management | Electronic capture, GPS, collection instruments, 9 data formats, data sharing tiers |
| 6 | Funding & Budget | Funding source, itemized budget in ETB |
| 7 | Document Upload & Scanner | Supporting letter, PI ID, CV; **automated 28-section Word document structural scanner** |
| 8 | Review & Acknowledgment | Full dossier summary, data sharing agreement |

### 28-Section Automated Structural Scanner (`Scanner.gs`)

Uploaded Word (`.docx`/`.doc`) proposals are automatically scanned for all 28 mandatory protocol sections required by Ethiopian health research guidelines:

Title · Abstract · Background · Problem Statement · Objectives · Literature Review · Conceptual Framework · Study Design · Setting · Sampling · Sample Size · Variables · Data Collection · Data Quality · Operational Definitions · Ethical Considerations · Data Management · Analysis Plan · Dissemination · Budget · Timeline · References · Annexes · Consent Forms · Questionnaires · CV · Approval Letters · Data Sharing Plan

**95% Completeness Gate:** A minimum threshold of **95%** is strictly enforced before the submission can be finalized. The interface displays a live score gauge, acceptance badge, and 28 status chips.

### 24-Hour Edit Window
- Submitted protocols can be revised within **24 hours** of submission.
- The PI supplies the protocol code and their registered email to regain edit access.
- The server verifies elapsed time and email parity before granting access.

---

## 9. Automated Build Utility (`build_preview.ps1`)

After editing any source file (`Index.html`, `styles/styles.html`, `client/app.html`, or `client/views.html`), recompile the standalone offline bundle by running:

```powershell
powershell -ExecutionPolicy Bypass -File .\build_preview.ps1
```

The script:
1. Reads `Index.html`
2. Inlines `styles/styles.html` (replaces `<?!= include('styles/styles') ?>`)
3. Inlines `client/app.html` (replaces `<?!= include('client/app') ?>`)
4. Inlines `client/views.html` (replaces `<?!= include('client/views') ?>`)
5. Writes the result to `preview.html`

The resulting `preview.html` is a fully self-contained, zero-dependency single file that runs in any modern browser without a server.

> **Important:** `preview.html` is a **compiled artifact**. Do not edit it directly — your changes will be overwritten on the next build. Always edit the source files and run `build_preview.ps1`.

---

## 10. Troubleshooting & FAQ

### Q: Clicks in the offline preview don't respond.
**A:** Ensure you are opening the latest compiled `preview.html`. The global event delegation handles `[data-view]` navigation, mobile drawer toggles, and modal dialogues automatically. Try a hard refresh (`Ctrl+Shift+R`).

### Q: How do I change the default admin password?
**A:** In Google Sheets, navigate to the `users` tab. Locate the row with email `admin@aahb.gov.et`. Update the password hash, or change it through the User Management panel in the running application.

### Q: How do files get uploaded to Google Drive in production?
**A:** `Documents.gs` receives base64-encoded file payloads from the browser, creates protocol subfolders inside `CFG.FOLDER_ID`, verifies file size and MIME type, and records metadata in the `protocol_documents` table.

### Q: How do I brand this for another institution?
**A:** Open `server/Config.gs` and change:
```javascript
CFG.APP_NAME     = 'Your System Name';
CFG.ORG_NAME     = 'Your Organization';
CFG.COMMITTEE_NAME = 'Your Committee Name';
```
All headers, clearance certificates, and email templates adapt automatically.

### Q: Why is my deployment not updating after a push?
**A:** Check the **Actions** tab in GitHub. Confirm the `CLASPRC_JSON` and `SCRIPT_ID` secrets are set correctly. If `clasp push` succeeds but the live app is unchanged, you may need to create a new deployment in the Apps Script editor (Deploy > New deployment).

### Q: How do I reset the demo data?
**A:** Log in as Administrator, navigate to **Settings & Demo Data**, and use the **Seed Demo Data** button. This runs `apiSeedDemoData()` which populates 20 realistic Ethiopian protocols with full workflow state.

---

*Addis Ababa City Administration Health Bureau — AAPHREML-IRERC — 2026*
