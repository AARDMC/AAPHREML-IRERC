# GitHub and Google Integration

GitHub stores and reviews the application source. Google Apps Script runs the current portal, Google Sheets stores application metadata, and a restricted Google Drive folder stores uploaded documents. The repository includes no Google credentials, Apps Script project ID, or deployment ID. The owner-provided database, scanner, and Drive folder IDs are configured in `server/Config.gs`; access by the Apps Script execution account has not been verified.

## Current architecture

The current UI is served by Apps Script HtmlService and calls backend functions with `google.script.run`. The source remains modular across `Code.gs`, `server/`, `Index.html`, `client/`, and `styles/`.

This repository does not yet publish the live UI through GitHub Pages and does not yet build a single `Code.gs` for Apps Script. The current `.github/workflows/deploy-irerc.yml` pushes the modular project tree to Apps Script. Keep that workflow from production use until it is changed to match the approved hosting design.

A GitHub Pages page cannot use `google.script.run` directly. A separate API bridge or a UI hosted inside Apps Script is needed before Pages can be the live frontend.

## Google resource setup

An authorized institutional owner should:

1. Create an Apps Script web-app project and enable the Apps Script API for the deploying account.
2. Use the supplied Drive folder for protocol documents; its ID is preconfigured as `CFG.FOLDER_ID` in `server/Config.gs`.
3. The database and scanner spreadsheet IDs from the owner-provided URLs are preconfigured as `CFG.DB_SS_ID` and `CFG.SHEET_ID`. Confirm that the Apps Script execution account can access both spreadsheets and has Editor access to the Drive folder before deployment. Keep IDs out of public source where institutional policy requires it.
4. Authenticate clasp with an institution-authorized account. Keep the project ID in a local `.clasp.json` or a protected GitHub environment variable.
5. Run `initDatabase_()` in Apps Script and authorize the requested services.
6. Set `INITIAL_ADMIN_EMAIL` and a unique `INITIAL_ADMIN_PASSWORD` of at least 12 characters in Script Properties. Run `bootstrapAdministrator_()` once; the temporary properties are removed after success.
7. Store the official signature in restricted Drive and configure `SIGNATURE_FILE_ID` in Script Properties. Never commit the image to Git.
8. Create the first web-app deployment manually and confirm its access policy before connecting institutional records.

Use a separate, non-production set of Google resources during setup. Do not use the portal with live records until ownership, permissions, backup, and retention policies have been confirmed.

## GitHub Actions

The optional workflow requires a protected `irerc-production` environment with:

- Secret `CLASPRC_JSON`: clasp credentials for the authorized account
- Variable `IRERC_SCRIPT_ID`: Apps Script project ID
- Variable `IRERC_DEPLOYMENT_ID`: existing web-app deployment ID

The workflow does not create the Apps Script project, first deployment, or Google resources. Require review before production deployment. Do not commit credentials.

## Preview

`preview.html` is a compiled layout preview. It has no sample accounts or protocol records and does not connect to Apps Script, Sheets, or Drive. The public logo may be included; the official signature stays in restricted Drive storage.
