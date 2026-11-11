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
| `STAFF_ACCOUNTS` | Optional | JSON array of `{ email, password, role, name? }` |
| `STAFF_ADMIN_EMAIL` / `STAFF_ADMIN_PASS` | Optional | Per-role staff credentials |
| `STAFF_CHAIR_EMAIL` / `STAFF_CHAIR_PASS` | Optional | Chairperson |
| `STAFF_SECRETARIAT_EMAIL` / `STAFF_SECRETARIAT_PASS` | Optional | Secretariat |
| `STAFF_REVIEWER1_EMAIL` / `STAFF_REVIEWER1_PASS` | Optional | Reviewer 1 |
| `STAFF_REVIEWER2_EMAIL` / `STAFF_REVIEWER2_PASS` | Optional | Reviewer 2 |

The service account must be granted **Editor** access to the Drive folder. The
folder ID is read from the URL `https://drive.google.com/drive/folders/<ID>`.

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
- Drive itself enforces the 15 MB per-file server cap; the UI uses tighter limits
  (3 MB submission files, 5 MB revisions, 10 MB final protocol PDFs).
