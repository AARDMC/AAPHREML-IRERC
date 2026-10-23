# AAPHREML-IRERC Research Ethics Portal

This repository contains the complete source for the Addis Ababa City Administration Health Bureau Institutional Research Ethics Review Committee (IRERC) portal. It is a dedicated portal repository; its Apps Script source is at the repository root.

## Contents

- `Code.gs`, `server/`: Apps Script entry point, API, and server services
- `Index.html`, `client/`, `styles/`: HtmlService application
- `preview.html`: compiled standalone mock-data preview (not a production service)
- `build_preview.ps1`: rebuilds the preview from its source files
- `docs/`, `CONFIGURATION_AND_USER_MANUAL.md`: setup and operating documentation
- `.github/workflows/deploy-irerc.yml`: optional protected deployment workflow

## Current deployment status

This repository does **not** contain an Apps Script project ID, deployment ID, Google authorization, or verified access to institutional Sheets or Drive resources. The portal is not confirmed deployed or live. The first Apps Script project and web-app deployment must be created manually by an authorized owner.

`preview.html` uses simulated users and data, does not connect to Apps Script or Google resources, and must not be used with real protocol or participant information. Rebuild it with `.\build_preview.ps1`.

## Owner-authorized Google setup

1. Create institution-owned database and scanner spreadsheets, a restricted Drive vault folder, and an Apps Script web-app project. Verify resource ownership and access before configuring them.
2. Set `CFG.DB_SS_ID`, `CFG.SHEET_ID`, and `CFG.FOLDER_ID` in `server/Config.gs` to the approved resources. The IDs are intentionally blank in this repository; operations fail when required resources are not configured.
3. Enable the Apps Script API and authenticate `clasp` with an institution-authorized account. Set the new project ID in a local `.clasp.json` (do not commit it), then run `clasp push`.
4. In the Apps Script editor, run `initDatabase_()` and authorize the requested Google services.
5. Set `INITIAL_ADMIN_EMAIL` and a unique `INITIAL_ADMIN_PASSWORD` of at least 12 characters in Script Properties. Run `bootstrapAdministrator_()` once; successful bootstrap removes both properties. No administrator or default password is included.
6. Upload the official signature to restricted Drive storage and set `SIGNATURE_FILE_ID` in Script Properties. The image is not in Git or the preview.
7. Create and test the first web-app deployment manually using non-production data. Confirm the executing account, access policy, resource permissions, backups, and retention requirements with the institution before production use.

The portal uses password authentication and server-issued eight-hour sessions. Google sign-in fails closed until a verifiable OAuth flow is implemented. New account passwords must be at least 12 characters and not already used by another account. Passwords are salted with SHA-256; this is not a slow password KDF and is a residual security limitation.

Demo seeding is disabled by default. Only set `ALLOW_DEMO_DATA_SEEDING=true` in a disposable test project, and remove it after use.

## Optional GitHub Actions deployment

After the owner has created the Apps Script project and first web-app deployment, the optional workflow can push source updates and update that existing deployment. Configure the protected GitHub environment `irerc-production` with secret `CLASPRC_JSON` and variables `IRERC_SCRIPT_ID` and `IRERC_DEPLOYMENT_ID`. Use required reviewers and institution-owned credentials. The workflow does not create Google resources or the first deployment.

See [`CONFIGURATION_AND_USER_MANUAL.md`](CONFIGURATION_AND_USER_MANUAL.md), [`GITHUB_AND_GOOGLE_DRIVE_INTEGRATION_GUIDE.md`](GITHUB_AND_GOOGLE_DRIVE_INTEGRATION_GUIDE.md), and [`docs/README.md`](docs/README.md) for details.
