# AAPHREML-IRERC Research Ethics Portal

This dedicated repository contains the complete Google Apps Script portal source at its root, including the client, server, styles, compiled preview, and setup documentation.

## Current status

The source is integrated, but there is no confirmed Apps Script project, deployment, Google authorization, or access to institutional Google resources. The first project and web-app deployment must be created by an authorized owner. The repository does not claim that the portal is live.

`preview.html` is a standalone mock-data demo. It does not connect to Apps Script, Sheets, or Drive and must not be used with real protocol or participant data. It may require internet access for fonts and icons.

## Source map

| Path | Purpose |
|---|---|
| `Code.gs` | `doGet`, private API dispatcher, and public `api*` endpoints |
| `Index.html` | HtmlService application shell |
| `client/` | Browser application, views, and mock-data preview API |
| `server/` | Apps Script services, authentication, database, and assets |
| `styles/` | Application styles |
| `appsscript.json` | Apps Script runtime and web-app settings |
| `.claspignore` | Restricts clasp pushes to manifest and Apps Script source |
| `build_preview.ps1` | Compiles `preview.html` from source |
| `.github/workflows/deploy-irerc.yml` | Optional protected workflow to update an existing GAS deployment |

## Owner setup

Create institution-owned Sheets and Drive resources, set their IDs in `server/Config.gs`, create the Apps Script project, and authorize clasp. Initialize the database, bootstrap the first administrator with one-time Script Properties, upload the official signature to restricted Drive, then create the first web-app deployment manually. Detailed steps are in [`CONFIGURATION_AND_USER_MANUAL.md`](../CONFIGURATION_AND_USER_MANUAL.md) and [`GITHUB_AND_GOOGLE_DRIVE_INTEGRATION_GUIDE.md`](../GITHUB_AND_GOOGLE_DRIVE_INTEGRATION_GUIDE.md).

The committed resource IDs are intentionally blank. Database initialization does not create a spreadsheet or fall back to an active sheet. Never connect demo data or preview credentials to production resources. Demo seeding requires `ALLOW_DEMO_DATA_SEEDING=true` in a disposable test project.

## Security note

Protected APIs require server-issued eight-hour sessions. Passwords are stored using per-account salted SHA-256 with minimum length and uniqueness checks; salted SHA-256 is not a slow password KDF. Google sign-in remains disabled until a verifiable OAuth flow is implemented. The official signature is excluded from Git and the preview.
