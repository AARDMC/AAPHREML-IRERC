# AAPHREML-IRERC Institutional Research Ethics Review Portal

A single, governed route from protocol submission through screening, independent
review, committee decision and clearance.

This edition runs on **TanStack Start** and stores uploaded protocol documents in
**Google Drive**, with the project source hosted on **GitHub**. There is no
database, no Vercel dependency and no client-side credential.

## Architecture

| Concern | Where it lives |
| --- | --- |
| Portal records (protocols, reviews, decisions, members, notifications, drafts) | Browser `localStorage` via zustand |
| Uploaded documents (supporting letter, PI ID, protocol PDF, CV, final protocol) | Google Drive folder, proxied by the server |
| PI accounts | `_system/aaphreml-irerc-pi-accounts.json` in the same Drive folder (in-memory fallback when Drive is not configured) |
| Staff accounts | Server environment variables only |
| Sessions | Signed HttpOnly JWT cookie |
| Source of truth for code | [GitHub repository](https://github.com/AARDMC/AAPHREML-IRERC) |
| Document storage | [Google Drive folder](https://drive.google.com/drive/folders/1IKIdODOiY_0hwanRQ4xk-MhzKVlXVprF) |

The browser never sees a Google private key, a GitHub token, or a staff password.
Document reads/writes go through `/api/drive/*`, which checks the session cookie
and the caller's role.

## Environment variables

Copy `.env.local.example` to `.env.local` for local work. Never commit `.env.local`
or a service-account JSON file.

| Variable | Required | Purpose |
| --- | --- | --- |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | For Drive | Full service-account JSON (recommended) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY` | Alternative | Split service-account credentials |
| `GOOGLE_DRIVE_FOLDER_ID` | Optional | Defaults to the project folder |
| `GOOGLE_CLIENT_ID` | Optional | Enables and verifies Google Sign-In |
| `SESSION_SECRET` | Recommended | Signs session cookies; an ephemeral secret is used if unset |
| `GITHUB_REPO` | Optional | Defaults to `AARDMC/AAPHREML-IRERC` |
| `GITHUB_TOKEN` | Optional | Read access for a private repository / higher rate limit |
| `IRERC_DATA_DIR` | Optional | Directory for settings-saved credentials (default `.data`) |
| `STAFF_ACCOUNTS` | Optional | JSON array of `{ email, password, role, name? }` |
| `STAFF_ADMIN_EMAIL` / `STAFF_ADMIN_PASS` | Optional | Per-role staff credentials |
| `STAFF_CHAIR_EMAIL` / `STAFF_CHAIR_PASS` | Optional | Chairperson |
| `STAFF_SECRETARIAT_EMAIL` / `STAFF_SECRETARIAT_PASS` | Optional | Secretariat |
| `STAFF_REVIEWER1_EMAIL` / `STAFF_REVIEWER1_PASS` | Optional | Reviewer 1 |
| `STAFF_REVIEWER2_EMAIL` / `STAFF_REVIEWER2_PASS` | Optional | Reviewer 2 |

The service account must be granted **Editor** access to the Drive folder. The
folder ID is read from the URL `https://drive.google.com/drive/folders/<ID>`.

## Connecting Google Drive without a redeploy

The folder can stay restricted. An administrator can finish the connection from
the app instead of editing host environment variables:

1. In Google Cloud, create a service account and download its JSON key.
2. Open **Settings → Integrations → Google Drive → Connect Google Drive**.
3. Paste the whole JSON key (and the folder ID if it differs) and choose
   **Verify and connect**. The server checks the key against the folder first.
4. The result names the exact service-account address to invite. Share the
   Drive folder with that address as **Editor** (or Content Manager on a
   Workspace Shared Drive), then run **Test connection** — it uploads, reads,
   downloads and deletes one throwaway file.

The key is written to `IRERC_DATA_DIR/google-drive.json` with mode `0600` and is
never returned to a browser. Removing it with **Disconnect** falls back to the
host environment variables, if any. Because it is a file on the server, mount a
persistent volume (for example `/app/.data`) where one is available. If a host
environment variable is set instead, that connection wins and the in-app form is
hidden.

## API surface

| Route | Method | Auth | Purpose |
| --- | --- | --- | --- |
| `/api/auth/config` | GET | public | Public integration flags (no secrets) |
| `/api/auth/session` | GET | cookie | Current signed-in user |
| `/api/auth/detect` | POST | public | Staff / returning PI / new PI routing |
| `/api/auth/login` | POST | public | Email + password sign-in |
| `/api/auth/register` | POST | public | Investigator self-registration |
| `/api/auth/google` | POST | public | Verify a Google ID token |
| `/api/auth/logout` | POST | cookie | Clear the session |
| `/api/drive/status` | GET | cookie | Drive folder connectivity |
| `/api/drive/documents` | GET / POST / DELETE | cookie | List, upload and delete document metadata |
| `/api/drive/file` | GET | cookie | Stream a document |
| `/api/drive/connect` | POST / DELETE | admin cookie | Save / remove a service-account key from Settings |
| `/api/drive/test` | POST | admin or secretariat | Upload, read, download and delete a test file |
| `/api/github/status` | GET | cookie | Repository status, cached for 5 minutes |

Drive queries are scoped with `appProperties` (`protocolId`, `code`, `version`) so
the app never enumerates the whole folder. Metadata is cached for 15–30 seconds;
folder and GitHub status are cached longer.

## Development

```sh
npm install
npm run dev        # http://localhost:8080
npm run typecheck
npm run build
npm run preview:restart
```

The project uses the live-preview contract on `0.0.0.0:8080`; `startup.sh` restarts
the dev server after a sandbox revive.

## Limitations

- Portal records remain per-browser (`localStorage`). Documents are shared through
  Drive, but review decisions are not yet synchronised across devices.
- PI accounts are persisted to Drive when Drive is configured; otherwise they last
  only for the life of the running server process.
- Google Sign-In requires `GOOGLE_CLIENT_ID` and the deployment origin registered
  under Authorised JavaScript origins in Google Cloud Console.
- A Drive key saved from Settings lives on that server's disk (`IRERC_DATA_DIR`).
  On an ephemeral host it must be pasted again after a redeploy, or supplied
  through `GOOGLE_SERVICE_ACCOUNT_JSON` instead.
- The app must be hosted on a Node server (`node .output/server/index.mjs`);
  static hosting such as GitHub Pages cannot run its API routes.
- Drive itself enforces the 15 MB per-file server cap; the UI uses tighter limits
  (3 MB submission files, 5 MB revisions, 10 MB final protocol PDFs).
