# GitHub and Google Integration

The portal runs on Google Apps Script (GAS). Google Sheets stores application records, Google Drive stores uploaded documents, and GitHub stores and reviews source code. This repository does not include Google credentials, a project ID, a deployment ID, or confirmation that any configured resources exist or are accessible.

## Google Apps Script setup

An authorized institutional owner must:

1. Create an Apps Script web-app project and enable the Apps Script API for the deploying account.
2. Create institution-owned spreadsheets for the application database and scanner output, plus a restricted Drive folder for protocol documents.
3. Set `CFG.DB_SS_ID`, `CFG.SHEET_ID`, and `CFG.FOLDER_ID` in `server/Config.gs` to those approved resource IDs. The values are blank in the repository; do not use production resources until ownership, permissions, and backup/retention policies are confirmed.
4. Authenticate clasp with an institution-authorized account and set the new Apps Script project ID in the local `.clasp.json`. The committed file intentionally has a placeholder ID. Push with `clasp push`.
5. Run `initDatabase_()` in the Apps Script editor and authorize the requested services. Use Script Properties `INITIAL_ADMIN_EMAIL` and a unique `INITIAL_ADMIN_PASSWORD` of at least 12 characters to run `bootstrapAdministrator_()` once. The setup properties are deleted after successful bootstrap.
6. Upload the chairperson signature to restricted Drive storage and set its ID as the `SIGNATURE_FILE_ID` Script Property. The signature is excluded from Git and the preview; an authorized API fetches it only when needed.
7. Create the first web-app deployment manually. Test using non-production data and confirm execution identity and access policy before connecting institutional records.

The application uses password login and hashed, eight-hour server sessions. All protected API endpoints require a valid session. Google sign-in is disabled until a verifiable OAuth flow is available. New account passwords must be at least 12 characters and unique across accounts. Hashes use per-account salted SHA-256, which is not a slow password KDF.

Demo data seeding is disabled by default. Set `ALLOW_DEMO_DATA_SEEDING=true` only in a disposable test project; demo accounts receive random passwords that are not exposed to users.

## Optional GitHub Actions deployment

The workflow is [`.github/workflows/deploy-irerc.yml`](.github/workflows/deploy-irerc.yml). It runs on demand or on source changes pushed to `main`, pushes the portal source, and updates an existing Apps Script web-app deployment. It does **not** create the Apps Script project, create the first deployment, authorize Google, or configure Sheets/Drive resources.

After manually creating the project and first deployment, configure the protected GitHub environment `irerc-production`:

| Name | Environment setting | Purpose |
|---|---|---|
| `CLASPRC_JSON` | Secret | Authorized clasp credentials JSON |
| `IRERC_SCRIPT_ID` | Variable | Apps Script project ID |
| `IRERC_DEPLOYMENT_ID` | Variable | Existing web-app deployment ID to update |

Use required reviewers for this production environment. The workflow writes credentials only to the ephemeral runner. Never commit or share them.

## Preview and assets

`preview.html` is a local standalone mock-data demo built from `Index.html`, `client/`, and `styles/`. It does not connect to Apps Script, Sheets, or Drive. The public logo is embedded in the app source. No GitHub Pages publication is configured. Do not use real records or credentials in the preview.

The official chairperson signature must remain in restricted Drive storage, configured through `SIGNATURE_FILE_ID`. Do not commit it or publish it in the preview.
