# AAPHREML-IRERC Research Ethics Portal

## Current status

This repository contains portal source code. It does not confirm a live Apps Script deployment or access to institutional Google resources. It contains no seeded accounts, protocol records, default administrator credentials, or configured Google resource IDs.

The application is a modular Apps Script HtmlService project. It has not been converted to a single generated `Code.gs` deployment or a live GitHub Pages frontend. See the [integration guide](../GITHUB_AND_GOOGLE_DRIVE_INTEGRATION_GUIDE.md) before deployment.

## Source map

- `Code.gs`, `server/`: Apps Script entry point, authentication, API, and services
- `Index.html`, `client/`, `styles/`: HtmlService interface
- `appsscript.json`: Apps Script manifest
- `preview.html`: compiled interface preview; no backend or simulated records
- `CONFIGURATION_AND_USER_MANUAL.md`: owner setup and operating guidance

## Owner setup

Use institution-owned spreadsheets and a restricted Drive folder. Set the approved resource IDs in `server/Config.gs`, initialize the database from Apps Script, and bootstrap the first administrator through temporary Script Properties. Test with separate non-production resources before connecting records.

## Security

Protected APIs use server-issued eight-hour sessions. Password hashes use salted SHA-256, which is not a slow password KDF. Keep the official signature in restricted Drive, credentials in protected secret storage, and research records out of Git.
