# AAPHREML-IRERC Research Ethics Portal

This repository contains the portal source for the Addis Ababa City Administration Health Bureau Institutional Research Ethics Review Committee.

## Source layout

- `Code.gs` and `server/`: Apps Script entry point, API dispatch, authentication, and server services
- `Index.html`, `client/`, and `styles/`: HtmlService user interface
- `appsscript.json`: Apps Script project manifest
- `docs/` and the setup manuals: configuration and operating guidance

The repository contains no sample accounts, seeded protocol records, default administrator credentials, Apps Script project IDs, or deployment IDs. The user-provided database, scanner, and Drive folder IDs are configured in `server/Config.gs`; access by the Apps Script execution account has not been verified. The interface preview is disconnected from Google services and contains no simulated user or protocol records.

## Deployment status

The repository does not confirm a live Apps Script deployment or access to any institutional spreadsheet or Drive folder. An authorized owner must create and configure those resources before using real information.

The current project is modular and serves its interface through Apps Script HtmlService. The current deployment workflow pushes the modular source tree. It has not been converted to deploy a single generated `Code.gs` file or to run a live frontend from GitHub Pages. Do not enable production deployment until the target architecture is updated to match those requirements.

## Owner setup

1. Use the provided database and scanner spreadsheets and restricted Drive folder, and create or select the institution-owned Apps Script project.
2. The three Google resource IDs are configured in `server/Config.gs`. Verify that the Apps Script execution account can access the spreadsheets and has Editor access to the Drive folder. Keep credentials and signature images in Google/Actions secret storage, not in Git.
3. Initialize the database from Apps Script and bootstrap the first administrator using temporary Script Properties as described in [the configuration manual](CONFIGURATION_AND_USER_MANUAL.md).
4. Test with a separate non-production spreadsheet and Drive folder. Confirm the access policy, execution identity, backups, and retention rules before handling records.

The portal uses server-issued, eight-hour sessions. Password hashes use per-account salted SHA-256; this is not a slow password KDF and remains a security limitation.

See the [Google integration guide](GITHUB_AND_GOOGLE_DRIVE_INTEGRATION_GUIDE.md) for the current deployment boundaries and setup steps.
