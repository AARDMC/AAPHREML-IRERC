# Change Log

## Source integration and deployment hardening

- Restored the complete portal source tree at the root of its dedicated repository.
- Restricted clasp uploads to the Apps Script manifest, entry point, HTML client, server scripts, and styles.
- Added session-token validation to protected API endpoints, salted password hashes, account password policies, one-time administrator bootstrap, and fail-closed Google sign-in.
- Disabled demo data seeding unless explicitly enabled for a disposable test project.
- Removed the official chairperson signature from Git and the standalone preview; the signature is loaded from restricted Drive only through an authorized API.
- Added an optional protected GitHub Actions workflow that pushes source and updates an existing Apps Script deployment.
- Updated setup documentation to state that the Apps Script project, initial deployment, Google authorization, and institutional resources must be created and approved by an owner.

## Remaining owner setup

- Configure institution-approved database, scanner spreadsheet, and Drive folder IDs in `server/Config.gs`.
- Create and authorize the Apps Script project, initialize Sheets, bootstrap the first administrator, and create the first deployment.
- Store the official signature in restricted Drive and set `SIGNATURE_FILE_ID`.
- For optional automated deployment, configure the protected `irerc-production` GitHub environment with `CLASPRC_JSON`, `IRERC_SCRIPT_ID`, and `IRERC_DEPLOYMENT_ID`.

No project ID, deployment ID, Google credentials, or verified Google resource access is included in this repository. No deployment is claimed to be live.
