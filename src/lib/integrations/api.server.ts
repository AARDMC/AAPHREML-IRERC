/**
 * HTTP handlers for the portal API.
 *
 * Routes under `src/routes/api/**` are thin wrappers around these functions.
 * Every Drive/GitHub handler requires a valid session; every mutation also
 * checks the caller's role. Errors are returned as JSON and never include
 * credentials or raw upstream responses.
 */

import {
  authConfigPayload,
  findStaffAccount,
  resolveGoogleAccount,
  verifyStaffCredentials,
} from "@/lib/integrations/auth.server";
import {
  createPiAccount,
  hasPiAccount,
  verifyPiPassword,
} from "@/lib/integrations/accounts.server";
import {
  createSessionToken,
  clearedSessionCookie,
  readSessionUser,
  sessionCookie,
} from "@/lib/integrations/session.server";
import { verifyGoogleIdToken } from "@/lib/integrations/google.server";
import {
  MAX_DOCUMENT_BYTES,
  deleteDocument,
  downloadDocument,
  driveFolderStatus,
  getDocumentMetadata,
  listDocuments,
  uploadDocument,
} from "@/lib/integrations/drive.server";
import { githubStatus } from "@/lib/integrations/github.server";
import type { AuthUser } from "@/lib/integrations/types";

export class HttpError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

const NO_STORE = { "cache-control": "no-store" };

function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...NO_STORE, ...headers },
  });
}

function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  const status = (error as { status?: number } | null)?.status;
  if (typeof status === "number" && status >= 400 && status < 600) {
    return json({ error: (error as Error).message || "Request failed." }, status);
  }
  console.error("[irerc-api]", error);
  return json({ error: "The server could not complete this request." }, 500);
}

function handler(fn: (request: Request) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    try {
      return await fn(request);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new HttpError("Expected a JSON request body.", 400);
  }
}

async function requireUser(request: Request): Promise<AuthUser> {
  const user = await readSessionUser(request);
  if (!user) throw new HttpError("Sign in to continue.", 401);
  return user;
}

function requireUploadRole(user: AuthUser): void {
  if (user.role !== "investigator" && user.role !== "admin") {
    throw new HttpError("Your role cannot upload protocol documents.", 403);
  }
}

function validateEmail(value: unknown): string {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError("Enter a valid email address.", 400);
  return email;
}

/* ── Lightweight sign-in throttle ──────────────────────────────────────── */

const attempts = new Map<string, { count: number; resetAt: number }>();
const ATTEMPT_WINDOW_MS = 10 * 60_000;
const MAX_ATTEMPTS = 8;

function throttleKey(request: Request, email: string): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "local";
  return `${ip}:${email}`;
}

function assertNotThrottled(key: string): void {
  const entry = attempts.get(key);
  if (!entry) return;
  if (entry.resetAt < Date.now()) {
    attempts.delete(key);
    return;
  }
  if (entry.count >= MAX_ATTEMPTS) {
    throw new HttpError("Too many sign-in attempts. Wait a few minutes and try again.", 429);
  }
}

function recordFailure(key: string): void {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
    return;
  }
  entry.count += 1;
}

function clearFailures(key: string): void {
  attempts.delete(key);
}

/* ── Auth ──────────────────────────────────────────────────────────────── */

export const handleAuthConfig = handler(async () => json(authConfigPayload()));

export const handleDetect = handler(async (request) => {
  const body = await readJson<{ email?: unknown }>(request);
  const email = validateEmail(body.email);
  if (findStaffAccount(email)) return json({ mode: "staff" as const });
  const registered = await hasPiAccount(email);
  return json({ mode: registered ? ("sign-in" as const) : ("register" as const) });
});

export const handleLogin = handler(async (request) => {
  const body = await readJson<{ email?: unknown; password?: unknown }>(request);
  const email = validateEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  if (!password) throw new HttpError("Enter your password.", 400);

  const key = throttleKey(request, email);
  assertNotThrottled(key);

  const staff = findStaffAccount(email);
  if (staff) {
    const user = verifyStaffCredentials(email, password);
    if (!user) {
      recordFailure(key);
      throw new HttpError("Incorrect password for this account.", 401);
    }
    clearFailures(key);
    return json({ user }, 200, {
      "set-cookie": sessionCookie(request, await createSessionToken(user)),
    });
  }

  const account = await verifyPiPassword(email, password);
  if (!account) {
    recordFailure(key);
    throw new HttpError("No matching account, or the password is incorrect.", 401);
  }
  clearFailures(key);
  const user: AuthUser = {
    email: account.email,
    name: account.name,
    role: "investigator",
  };
  return json({ user }, 200, {
    "set-cookie": sessionCookie(request, await createSessionToken(user)),
  });
});

export const handleRegister = handler(async (request) => {
  const body = await readJson<{ name?: unknown; email?: unknown; password?: unknown }>(request);
  const email = validateEmail(body.email);
  if (findStaffAccount(email)) {
    throw new HttpError(
      "This email is registered as a staff account. Sign in with the staff password.",
      409,
    );
  }
  const result = await createPiAccount({
    name: typeof body.name === "string" ? body.name : "",
    email,
    password: typeof body.password === "string" ? body.password : "",
    provider: "password",
  });
  if (!result.ok) throw new HttpError(result.error, 400);

  const user: AuthUser = {
    email: result.account.email,
    name: result.account.name,
    role: "investigator",
  };
  return json({ user }, 201, {
    "set-cookie": sessionCookie(request, await createSessionToken(user)),
  });
});

export const handleGoogleSignIn = handler(async (request) => {
  const body = await readJson<{ credential?: unknown }>(request);
  const credential = typeof body.credential === "string" ? body.credential : "";
  if (!credential) throw new HttpError("Google did not return a credential.", 400);

  let identity: { email: string; name: string };
  try {
    identity = await verifyGoogleIdToken(credential);
  } catch (error) {
    throw new HttpError(
      error instanceof Error ? error.message : "The Google credential could not be verified.",
      401,
    );
  }

  const user = await resolveGoogleAccount(identity);
  return json({ user }, 200, {
    "set-cookie": sessionCookie(request, await createSessionToken(user)),
  });
});

export const handleSession = handler(async (request) => {
  const user = await readSessionUser(request);
  return json({ user });
});

export const handleLogout = handler(async (request) => {
  return json({ ok: true }, 200, { "set-cookie": clearedSessionCookie(request) });
});

/* ── Drive documents ───────────────────────────────────────────────────── */

function queryNumber(url: URL, key: string): number | undefined {
  const raw = url.searchParams.get(key);
  if (raw === null || raw === "") return undefined;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : undefined;
}

function requireString(url: URL, key: string): string {
  const value = url.searchParams.get(key)?.trim();
  if (!value) throw new HttpError(`Missing ${key}.`, 400);
  return value;
}

export const handleDriveStatus = handler(async (request) => {
  await requireUser(request);
  const status = await driveFolderStatus();
  return json({ ...status, accountsPersisted: authConfigPayload().accountsPersisted });
});

export const handleDriveList = handler(async (request) => {
  await requireUser(request);
  const url = new URL(request.url);
  const protocolId = requireString(url, "protocolId");
  const documents = await listDocuments({
    protocolId,
    code: url.searchParams.get("code")?.trim() || undefined,
    version: queryNumber(url, "version"),
  });
  return json({ documents });
});

export const handleDriveUpload = handler(async (request) => {
  const user = await requireUser(request);
  requireUploadRole(user);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new HttpError("Expected a multipart upload.", 400);
  }

  const protocolId = String(form.get("protocolId") ?? "").trim();
  const code = String(form.get("code") ?? "").trim();
  const version = Number.parseInt(String(form.get("version") ?? "1"), 10);
  const file = form.get("file");
  if (!protocolId || !code) throw new HttpError("protocolId and code are required.", 400);
  if (!Number.isFinite(version) || version < 1) throw new HttpError("Invalid version.", 400);
  if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
    throw new HttpError("Attach a file to upload.", 400);
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new HttpError("The file is larger than the 15 MB limit.", 413);
  }
  if (file.size === 0) throw new HttpError("The selected file is empty.", 400);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const document = await uploadDocument({
    protocolId,
    code,
    version,
    name: file.name || "document",
    mimeType: file.type || "application/octet-stream",
    bytes,
  });
  return json({ document }, 201);
});

export const handleDriveFile = handler(async (request) => {
  await requireUser(request);
  const url = new URL(request.url);
  let id = url.searchParams.get("id")?.trim();
  let name = "document";
  let mimeType = "application/octet-stream";

  if (!id) {
    const protocolId = requireString(url, "protocolId");
    const code = requireString(url, "code");
    const version = queryNumber(url, "version");
    const documents = await listDocuments({ protocolId, code, version });
    const current = documents.sort((a, b) => b.version - a.version)[0];
    if (!current) throw new HttpError("The document has not been uploaded.", 404);
    id = current.id;
    name = current.name;
    mimeType = current.mimeType;
  } else {
    const metadata = await getDocumentMetadata(id);
    name = metadata.name;
    mimeType = metadata.mimeType;
  }

  const upstream = await downloadDocument(id);
  const download = url.searchParams.get("download") === "1";
  const headers = new Headers({
    "content-type": mimeType,
    "cache-control": "private, no-store",
    "x-content-type-options": "nosniff",
    "content-disposition": `${download ? "attachment" : "inline"}; filename="${name
      .replace(/["\\]/g, "_")
      .slice(0, 180)}"`,
  });
  const length = upstream.headers.get("content-length");
  if (length) headers.set("content-length", length);
  return new Response(upstream.body, { status: 200, headers });
});

export const handleDriveDelete = handler(async (request) => {
  const user = await requireUser(request);
  requireUploadRole(user);
  const url = new URL(request.url);
  const deleted = await deleteDocument({
    protocolId: requireString(url, "protocolId"),
    code: requireString(url, "code"),
    version: queryNumber(url, "version"),
  });
  return json({ deleted });
});

/* ── GitHub ────────────────────────────────────────────────────────────── */

export const handleGithubStatus = handler(async (request) => {
  await requireUser(request);
  return json(await githubStatus());
});
