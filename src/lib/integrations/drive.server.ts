/**
 * Google Drive integration (server only).
 *
 * Layout: every uploaded document lives directly in the configured folder and
 * carries `appProperties` (protocolId/code/version). Reads are scoped queries
 * by those properties, so the app never enumerates the whole folder — opening a
 * protocol only asks Drive for that protocol's files.
 *
 * A small `_system` subfolder holds application JSON (PI accounts), keeping it
 * out of the document list.
 */

import {
  driveFolderId,
  driveConfigured,
} from "@/lib/integrations/config.server";
import {
  clearDriveAccessToken,
  driveAccessToken,
} from "@/lib/integrations/google.server";
import { cached, invalidateCache } from "@/lib/integrations/cache.server";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const SYSTEM_FOLDER_NAME = "_system";

export const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;

export type DriveDocument = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdTime: string;
  webViewLink?: string;
  protocolId: string;
  code: string;
  version: number;
};

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  webViewLink?: string;
  appProperties?: Record<string, string>;
  parents?: string[];
};

export class DriveError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "DriveError";
    this.status = status;
  }
}

function escapeQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function fileEndpoint(id: string, params: Record<string, string> = {}): string {
  const query = new URLSearchParams({
    supportsAllDrives: "true",
    ...params,
  });
  return `${DRIVE_API}/files/${encodeURIComponent(id)}?${query.toString()}`;
}

async function driveFetch(
  url: string,
  init: RequestInit = {},
  retryOnUnauthorized = true,
): Promise<Response> {
  const token = await driveAccessToken();
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);
  const response = await fetch(url, { ...init, headers, cache: "no-store" });

  if (response.status === 401 && retryOnUnauthorized) {
    clearDriveAccessToken();
    return driveFetch(url, init, false);
  }
  return response;
}

async function errorFrom(response: Response): Promise<DriveError> {
  let detail = "";
  try {
    const payload = (await response.json()) as { error?: { message?: string } };
    detail = payload.error?.message ?? "";
  } catch {
    detail = await response.text().catch(() => "");
  }
  if (response.status === 404) {
    return new DriveError(
      "The Google Drive folder was not found. Confirm that the folder is shared with the service account.",
      404,
    );
  }
  if (response.status === 403) {
    return new DriveError(
      `Google Drive refused the request (403). ${detail || "Confirm the service account has Editor access to the folder."}`,
      403,
    );
  }
  return new DriveError(
    `Google Drive request failed (${response.status}).${detail ? ` ${detail}` : ""}`,
    response.status === 401 ? 401 : 502,
  );
}

function toDocument(file: DriveFile): DriveDocument | null {
  const props = file.appProperties ?? {};
  if (!props.protocolId || !props.code) return null;
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    size: Number(file.size ?? 0),
    createdTime: file.createdTime,
    webViewLink: file.webViewLink,
    protocolId: props.protocolId,
    code: props.code,
    version: Number(props.version ?? 1),
  };
}

function documentQuery(options: {
  protocolId?: string;
  code?: string;
  version?: number;
}): string {
  const clauses = [`'${escapeQueryValue(driveFolderId())}' in parents`, "trashed = false"];
  if (options.protocolId) {
    clauses.push(
      `appProperties has { key='protocolId' and value='${escapeQueryValue(options.protocolId)}' }`,
    );
  }
  if (options.code) {
    clauses.push(`appProperties has { key='code' and value='${escapeQueryValue(options.code)}' }`);
  }
  if (options.version !== undefined) {
    clauses.push(
      `appProperties has { key='version' and value='${escapeQueryValue(String(options.version))}' }`,
    );
  }
  return clauses.join(" and ");
}

async function queryDocuments(options: {
  protocolId?: string;
  code?: string;
  version?: number;
}): Promise<DriveDocument[]> {
  if (!driveConfigured()) throw new DriveError("Google Drive is not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON (or the split email/key variables).", 503);
  const params = new URLSearchParams({
    q: documentQuery(options),
    fields: "files(id,name,mimeType,size,createdTime,webViewLink,appProperties)",
    orderBy: "createdTime desc",
    pageSize: "100",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });
  const response = await driveFetch(`${DRIVE_API}/files?${params.toString()}`);
  if (!response.ok) throw await errorFrom(response);
  const payload = (await response.json()) as { files?: DriveFile[] };
  return (payload.files ?? [])
    .map(toDocument)
    .filter((document): document is DriveDocument => document !== null);
}

/** Cached document listing for a protocol/document code. */
export async function listDocuments(options: {
  protocolId: string;
  code?: string;
  version?: number;
}): Promise<DriveDocument[]> {
  const key = `drive:documents:${options.protocolId}:${options.code ?? "*"}:${options.version ?? "*"}`;
  return cached(key, 30_000, () => queryDocuments(options));
}

export async function getDocumentMetadata(id: string): Promise<{ id: string; name: string; mimeType: string }> {
  if (!driveConfigured()) throw new DriveError("Google Drive is not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON (or the split email/key variables).", 503);
  const response = await driveFetch(
    fileEndpoint(id, { fields: "id,name,mimeType" }),
  );
  if (!response.ok) throw await errorFrom(response);
  return (await response.json()) as { id: string; name: string; mimeType: string };
}

function multipartBody(
  metadata: Record<string, unknown>,
  bytes: Uint8Array,
  mimeType: string,
): { body: Uint8Array; contentType: string } {
  const boundary = `----irerc${crypto.randomUUID().replace(/-/g, "")}`;
  const head = new TextEncoder().encode(
    `--${boundary}\r\n` +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${mimeType || "application/octet-stream"}\r\n\r\n`,
  );
  const tail = new TextEncoder().encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(head.byteLength + bytes.byteLength + tail.byteLength);
  body.set(head, 0);
  body.set(bytes, head.byteLength);
  body.set(tail, head.byteLength + bytes.byteLength);
  return { body, contentType: `multipart/related; boundary=${boundary}` };
}

function safeDriveName(protocolId: string, code: string, version: number, name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|\r\n]+/g, "_").trim() || "document";
  return `${protocolId}__${code}__v${version}__${cleaned}`.slice(0, 240);
}

export async function uploadDocument(input: {
  protocolId: string;
  code: string;
  version: number;
  name: string;
  mimeType: string;
  bytes: Uint8Array;
}): Promise<DriveDocument> {
  if (!driveConfigured()) throw new DriveError("Google Drive is not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON (or the split email/key variables).", 503);
  const { protocolId, code, version } = input;
  const appProperties = {
    protocolId,
    code,
    version: String(version),
    uploadedAt: new Date().toISOString(),
  };
  const name = safeDriveName(protocolId, code, version, input.name);

  // Saving a draft twice, or submitting it, must not duplicate the same
  // logical version: replace the existing bytes instead.
  const existing = await queryDocuments({ protocolId, code, version });
  if (existing[0]) {
    const id = existing[0].id;
    const media = await driveFetch(
      `${DRIVE_UPLOAD_API}/files/${encodeURIComponent(id)}?uploadType=media&supportsAllDrives=true`,
      {
        method: "PATCH",
        headers: { "content-type": input.mimeType || "application/octet-stream" },
        body: input.bytes as unknown as BodyInit,
      },
    );
    if (!media.ok) throw await errorFrom(media);
    await driveFetch(
      fileEndpoint(id, { fields: "id,name,mimeType,size,createdTime,webViewLink,appProperties" }),
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, appProperties }),
      },
    );
    invalidateCache(`drive:documents:${protocolId}`);
    return {
      ...existing[0],
      name,
      createdTime: new Date().toISOString(),
      size: input.bytes.byteLength,
      mimeType: input.mimeType || existing[0].mimeType,
    };
  }

  const { body, contentType } = multipartBody(
    {
      name,
      parents: [driveFolderId()],
      mimeType: input.mimeType || "application/octet-stream",
      appProperties,
    },
    input.bytes,
    input.mimeType,
  );

  const params = new URLSearchParams({
    uploadType: "multipart",
    supportsAllDrives: "true",
    fields: "id,name,mimeType,size,createdTime,webViewLink,appProperties",
  });
  const response = await driveFetch(`${DRIVE_UPLOAD_API}/files?${params.toString()}`, {
    method: "POST",
    headers: { "content-type": contentType },
    body: body as unknown as BodyInit,
  });
  if (!response.ok) throw await errorFrom(response);
  const file = (await response.json()) as DriveFile;
  invalidateCache(`drive:documents:${protocolId}`);
  return (
    toDocument(file) ?? {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: Number(file.size ?? input.bytes.byteLength),
      createdTime: file.createdTime,
      protocolId,
      code,
      version,
    }
  );
}

/** Stream a stored document; the caller forwards the body to the browser. */
export async function downloadDocument(id: string): Promise<Response> {
  if (!driveConfigured()) throw new DriveError("Google Drive is not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON (or the split email/key variables).", 503);
  const response = await driveFetch(
    `${DRIVE_API}/files/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`,
  );
  if (!response.ok) throw await errorFrom(response);
  return response;
}

export async function deleteDocument(input: {
  protocolId: string;
  code: string;
  version?: number;
}): Promise<number> {
  if (!driveConfigured()) throw new DriveError("Google Drive is not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON (or the split email/key variables).", 503);
  const matches = await queryDocuments(input);
  let deleted = 0;
  for (const file of matches) {
    const response = await driveFetch(
      fileEndpoint(file.id, { fields: "id" }),
      { method: "DELETE" },
    );
    if (!response.ok && response.status !== 404) throw await errorFrom(response);
    deleted += 1;
  }
  invalidateCache(`drive:documents:${input.protocolId}`);
  return deleted;
}

/* ── Folder / system files ─────────────────────────────────────────────── */

type DriveFolderStatus = {
  connected: boolean;
  folderId: string;
  name?: string;
  webViewLink?: string;
  error?: string;
};

export async function driveFolderStatus(): Promise<DriveFolderStatus> {
  const folderId = driveFolderId();
  if (!driveConfigured()) {
    return {
      connected: false,
      folderId,
      error:
        "Set GOOGLE_SERVICE_ACCOUNT_JSON (or GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY) to connect Drive.",
    };
  }
  try {
    return await cached("drive:folder-status", 60_000, async () => {
      const response = await driveFetch(
        fileEndpoint(folderId, { fields: "id,name,mimeType,webViewLink" }),
      );
      if (!response.ok) throw await errorFrom(response);
      const file = (await response.json()) as DriveFile;
      if (file.mimeType !== FOLDER_MIME) {
        return {
          connected: false,
          folderId,
          error: "GOOGLE_DRIVE_FOLDER_ID points at a file, not a folder.",
        };
      }
      return {
        connected: true,
        folderId,
        name: file.name,
        webViewLink: file.webViewLink,
      };
    });
  } catch (cause) {
    return {
      connected: false,
      folderId,
      error: cause instanceof Error ? cause.message : "Google Drive could not be reached.",
    };
  }
}

async function findFileByName(parentId: string, name: string): Promise<DriveFile | null> {
  const params = new URLSearchParams({
    q: `'${escapeQueryValue(parentId)}' in parents and name = '${escapeQueryValue(name)}' and trashed = false`,
    fields: "files(id,name,mimeType,size,createdTime,webViewLink)",
    pageSize: "1",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });
  const response = await driveFetch(`${DRIVE_API}/files?${params.toString()}`);
  if (!response.ok) throw await errorFrom(response);
  const payload = (await response.json()) as { files?: DriveFile[] };
  return payload.files?.[0] ?? null;
}

/** Create (or reuse) the `_system` subfolder. */
export async function ensureSystemFolder(): Promise<string> {
  if (!driveConfigured()) throw new DriveError("Google Drive is not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON (or the split email/key variables).", 503);
  const globalRef = globalThis as typeof globalThis & { __irercSystemFolder__?: string };
  if (globalRef.__irercSystemFolder__) return globalRef.__irercSystemFolder__;

  const existing = await findFileByName(driveFolderId(), SYSTEM_FOLDER_NAME);
  if (existing && existing.mimeType === FOLDER_MIME) {
    globalRef.__irercSystemFolder__ = existing.id;
    return existing.id;
  }
  if (existing) {
    const response = await driveFetch(fileEndpoint(existing.id), {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mimeType: FOLDER_MIME }),
    });
    if (!response.ok) throw await errorFrom(response);
    globalRef.__irercSystemFolder__ = existing.id;
    return existing.id;
  }

  const response = await driveFetch(
    `${DRIVE_API}/files?supportsAllDrives=true&fields=id,name,mimeType`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: SYSTEM_FOLDER_NAME,
        mimeType: FOLDER_MIME,
        parents: [driveFolderId()],
      }),
    },
  );
  if (!response.ok) throw await errorFrom(response);
  const folder = (await response.json()) as DriveFile;
  globalRef.__irercSystemFolder__ = folder.id;
  return folder.id;
}

export async function readJsonFile<T>(name: string): Promise<T | null> {
  const folderId = await ensureSystemFolder();
  const file = await findFileByName(folderId, name);
  if (!file) return null;
  const response = await driveFetch(
    `${DRIVE_API}/files/${encodeURIComponent(file.id)}?alt=media&supportsAllDrives=true`,
  );
  if (response.status === 404) return null;
  if (!response.ok) throw await errorFrom(response);
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new DriveError(`The Drive file ${name} is not valid JSON.`);
  }
}

export async function writeJsonFile(name: string, value: unknown): Promise<void> {
  const folderId = await ensureSystemFolder();
  const bytes = new TextEncoder().encode(JSON.stringify(value, null, 2));
  const file = await findFileByName(folderId, name);
  if (file) {
    const response = await driveFetch(
      `${DRIVE_UPLOAD_API}/files/${encodeURIComponent(file.id)}?uploadType=media&supportsAllDrives=true`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: bytes as unknown as BodyInit,
      },
    );
    if (!response.ok) throw await errorFrom(response);
    return;
  }

  const { body, contentType } = multipartBody(
    { name, parents: [folderId], mimeType: "application/json" },
    bytes,
    "application/json",
  );
  const response = await driveFetch(
    `${DRIVE_UPLOAD_API}/files?uploadType=multipart&supportsAllDrives=true&fields=id`,
    {
      method: "POST",
      headers: { "content-type": contentType },
      body: body as unknown as BodyInit,
    },
  );
  if (!response.ok) throw await errorFrom(response);
}
