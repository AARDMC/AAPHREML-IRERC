/**
 * Document access for the portal.
 *
 * Files live in the configured Google Drive folder and are proxied through the
 * portal API, so the browser never holds Google credentials. Metadata queries
 * are scoped to one protocol/code and cached briefly to avoid repeat calls when
 * a panel re-renders.
 */

export type StoredDocument = {
  key: string;
  protocolId: string;
  code: string;
  version: number;
  name: string;
  type: string;
  size: number;
  blob: Blob;
  uploadedAt: string;
};

export type DriveDocumentInfo = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdTime: string;
  protocolId: string;
  code: string;
  version: number;
};

const METADATA_TTL_MS = 15_000;
const metadataCache = new Map<string, { expiresAt: number; documents: DriveDocumentInfo[] }>();

function keyFor(protocolId: string, code: string, version?: number): string {
  return version ? `${protocolId}:${code}:v${version}` : `${protocolId}:${code}`;
}

/** Parse the filename the server put in Content-Disposition. */
function filenameFrom(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const quoted = /filename="([^"]+)"/i.exec(header);
  if (quoted?.[1]) return quoted[1];
  const bare = /filename=([^;]+)/i.exec(header);
  return bare?.[1]?.trim() || fallback;
}

async function errorFrom(response: Response): Promise<Error> {
  try {
    const payload = (await response.json()) as { error?: unknown };
    if (typeof payload.error === "string" && payload.error.trim()) return new Error(payload.error);
  } catch {
    // Non-JSON body; fall through to a status message.
  }
  if (response.status === 401) return new Error("Sign in to open this document.");
  if (response.status === 404) return new Error("The document has not been uploaded.");
  return new Error(`The document service returned an error (${response.status}).`);
}

/** Metadata for one protocol/code pair. Cached briefly per page. */
export async function listDocuments(
  protocolId: string,
  code: string,
  version?: number,
): Promise<DriveDocumentInfo[]> {
  const cacheKey = keyFor(protocolId, code, version);
  const hit = metadataCache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) return hit.documents;

  const params = new URLSearchParams({ protocolId, code });
  if (version !== undefined) params.set("version", String(version));
  const response = await fetch(`/api/drive/documents?${params.toString()}`, {
    credentials: "same-origin",
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw await errorFrom(response);
  const payload = (await response.json()) as { documents?: DriveDocumentInfo[] };
  const documents = payload.documents ?? [];
  metadataCache.set(cacheKey, { expiresAt: Date.now() + METADATA_TTL_MS, documents });
  return documents;
}

/** Upload (or replace) one logical document version. */
export async function saveDocument(
  protocolId: string,
  code: string,
  file: File,
  version = 1,
): Promise<void> {
  const body = new FormData();
  body.set("protocolId", protocolId);
  body.set("code", code);
  body.set("version", String(version));
  body.set("file", file);

  let response: Response;
  try {
    response = await fetch("/api/drive/documents", {
      method: "POST",
      credentials: "same-origin",
      body,
    });
  } catch {
    throw new Error("The upload could not reach the server. Check your connection and try again.");
  }
  if (!response.ok) throw await errorFrom(response);
  metadataCache.delete(keyFor(protocolId, code));
  metadataCache.delete(keyFor(protocolId, code, version));
}

/** True when at least one version of the document is stored. */
export async function hasDocument(protocolId: string, code: string): Promise<boolean> {
  if (!protocolId || !code) return false;
  try {
    return (await listDocuments(protocolId, code)).length > 0;
  } catch {
    return false;
  }
}

/** Download one document into memory for preview or file restoration. */
export async function getDocument(
  protocolId: string,
  code: string,
  version?: number,
): Promise<StoredDocument | null> {
  const params = new URLSearchParams({ protocolId, code });
  if (version !== undefined) params.set("version", String(version));
  const response = await fetch(`/api/drive/file?${params.toString()}`, {
    credentials: "same-origin",
  });
  if (response.status === 404) return null;
  if (!response.ok) throw await errorFrom(response);

  const blob = await response.blob();
  const name = filenameFrom(response.headers.get("content-disposition"), code);
  return {
    key: keyFor(protocolId, code, version),
    protocolId,
    code,
    version: version ?? 0,
    name,
    type: response.headers.get("content-type") || blob.type || "application/octet-stream",
    size: blob.size,
    blob,
    uploadedAt: new Date().toISOString(),
  };
}

/** Remove every stored version of a document. */
export async function deleteDocument(protocolId: string, code: string): Promise<void> {
  const params = new URLSearchParams({ protocolId, code });
  const response = await fetch(`/api/drive/documents?${params.toString()}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  if (!response.ok) throw await errorFrom(response);
  metadataCache.delete(keyFor(protocolId, code));
}

export async function openDocument(protocolId: string, code: string, version?: number): Promise<void> {
  const record = await getDocument(protocolId, code, version);
  if (!record) throw new Error("The document has not been uploaded.");
  const url = URL.createObjectURL(record.blob);
  const opened = window.open(url, "_blank");
  if (!opened) downloadUrl(url, record.name);
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function downloadDocument(protocolId: string, code: string, version?: number): Promise<void> {
  const record = await getDocument(protocolId, code, version);
  if (!record) throw new Error("The document has not been uploaded.");
  const url = URL.createObjectURL(record.blob);
  downloadUrl(url, record.name);
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function downloadUrl(url: string, name: string): void {
  const link = document.createElement("a");
  link.href = url;
  link.download = name || "document";
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}
