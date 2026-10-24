# Project Manifest

## AAPHREML-IRERC Research Protocol Ethics Review System

### Identity

| Field | Value |
|---|---|
| Project | AAPHREML-IRERC Research Protocol Management & Ethics Review System |
| Organization | Addis Ababa City Administration Health Bureau |
| Committee | Institutional Research Ethics Review Committee (IRERC) |
| Country | Federal Democratic Republic of Ethiopia |
| Status | Source prepared; owner setup and production deployment are not confirmed |

### Purpose

The portal manages protocol submission, administrative screening, ethical review, committee decisions, clearance, and post-clearance monitoring. It defines investigator, reviewer, secretariat, vice-chairperson, chairperson, and administrator roles.

### Source map

| Path | Purpose |
|---|---|
| `Code.gs` | Apps Script entry point and public API wrappers |
| `server/` | Configuration, database access, token sessions, authorization, scanner, and business services |
| `Index.html` | Main HtmlService page |
| `client/app.html` | Application state, navigation, authentication handlers, and Apps Script RPC bridge |
| `client/views.html` | Portal views and interactions |
| `styles/styles.html` | Application styling |
| `appsscript.json` | Apps Script runtime and web-app manifest |
| `preview.html` | Compiled interface preview with no backend connection or simulated records |
| `build_preview.ps1` | Rebuilds the interface preview |

### Google resources

Resource IDs are blank until an authorized owner configures them.

| Setting | Purpose |
|---|---|
| `CFG.DB_SS_ID` | Primary Google Sheets database |
| `CFG.SHEET_ID` | Scanner output spreadsheet |
| `CFG.FOLDER_ID` | Restricted Drive document folder |
| `SIGNATURE_FILE_ID` Script Property | Restricted chairperson signature image |

The signature image must remain in restricted Drive storage and must not be committed to Git.

### Authentication and data handling

The portal uses server-issued, expiring session tokens and role-based authorization. Password hashes use salted SHA-256; this is not a slow password KDF and remains a security limitation. No seeded accounts, default password, demo seeder, or mock API is included.

Removing demo code does not delete test records that may already exist in Google Sheets or Drive. An authorized data owner must review and remove any confirmed test records separately.

### Current deployment boundary

The repository currently contains modular Apps Script and HtmlService source. The current workflow pushes the modular source tree. It has not been converted to a single generated `Code.gs` deployment or a live GitHub Pages frontend. GitHub Pages cannot call Apps Script `google.script.run` directly; that hosting design needs a separate bridge or a UI served inside Apps Script.

Do not configure or trigger production deployment until the workflow and runtime have been converted to the approved target architecture.

### Owner setup

1. Create an institution-owned Apps Script project, database spreadsheet, scanner spreadsheet, and restricted Drive folder.
2. Set the resource IDs in `server/Config.gs` and authorize the deploying account.
3. Run database initialization and bootstrap the first administrator through temporary Script Properties.
4. Create the first web-app deployment manually.
5. Test with non-production resources and confirm access, backup, and retention policies before handling records.

### Repository contents

- `CONFIGURATION_AND_USER_MANUAL.md`: setup and operating instructions
- `GITHUB_AND_GOOGLE_DRIVE_INTEGRATION_GUIDE.md`: current integration boundaries
- `docs/ARCHITECTURE.md`: system design
- `docs/CHANGE_LOG.md`: cleanup record
- `.github/workflows/deploy-irerc.yml`: existing optional deployment workflow

*Addis Ababa City Administration Health Bureau — AAPHREML-IRERC*
