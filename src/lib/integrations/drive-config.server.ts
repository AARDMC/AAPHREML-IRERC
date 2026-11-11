/**
 * Runtime Drive configuration (server only).
 *
 * A service-account key can be supplied two ways:
 *   1. Environment variables (`GOOGLE_SERVICE_ACCOUNT_JSON` or the split
 *      email/key pair) — the deployment-friendly path.
 *   2. This runtime file — written by the administrator from Settings so the
 *      Drive connection can be completed in the app without a redeploy.
 *
 * The key never leaves the server: the browser only ever receives the service
 * account address and a status. The file is created with mode 0600 inside a
 * data directory (`IRERC_DATA_DIR`, default `.data`).
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export type RuntimeDriveConfig = {
  clientEmail: string;
  privateKey: string;
  folderId?: string;
};

const FILE_NAME = "google-drive.json";
const CACHE_TTL_MS = 15_000;

type Cache = { at: number; value: RuntimeDriveConfig | null };

const globalRef = globalThis as typeof globalThis & { __irercDriveConfig__?: Cache };

export class DriveConfigError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "DriveConfigError";
    this.status = status;
  }
}

function dataDir(): string {
  const configured = process.env.IRERC_DATA_DIR?.trim();
  return resolve(configured || ".data");
}

export function driveConfigPath(): string {
  return join(dataDir(), FILE_NAME);
}

function normalise(value: unknown): RuntimeDriveConfig | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const clientEmail = typeof record.clientEmail === "string" ? record.clientEmail.trim() : "";
  const privateKey = typeof record.privateKey === "string" ? record.privateKey.trim() : "";
  if (!clientEmail || !privateKey) return null;
  const folderId = typeof record.folderId === "string" ? record.folderId.trim() : "";
  return { clientEmail, privateKey, folderId: folderId || undefined };
}

/** Credentials saved from Settings, if any. Never throws. */
export function readRuntimeDriveConfig(): RuntimeDriveConfig | null {
  const cached = globalRef.__irercDriveConfig__;
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  let value: RuntimeDriveConfig | null = null;
  try {
    value = normalise(JSON.parse(readFileSync(driveConfigPath(), "utf8")));
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code && code !== "ENOENT") {
      console.error("[irerc-drive-config]", (error as Error).message);
    }
  }
  globalRef.__irercDriveConfig__ = { at: Date.now(), value };
  return value;
}

export function writeRuntimeDriveConfig(value: RuntimeDriveConfig): void {
  try {
    mkdirSync(dataDir(), { recursive: true, mode: 0o700 });
    writeFileSync(driveConfigPath(), JSON.stringify(value, null, 2), {
      encoding: "utf8",
      mode: 0o600,
    });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "EROFS" || code === "EACCES" || code === "EPERM") {
      throw new DriveConfigError(
        "This host does not allow the app to store files, so Drive cannot be connected from Settings. Set GOOGLE_SERVICE_ACCOUNT_JSON in the host environment instead.",
        409,
      );
    }
    throw new DriveConfigError("The Drive configuration could not be saved on the server.");
  }
  globalRef.__irercDriveConfig__ = { at: Date.now(), value };
}

export function clearRuntimeDriveConfig(): void {
  try {
    rmSync(driveConfigPath(), { force: true });
  } catch {
    throw new DriveConfigError("The saved Drive configuration could not be removed.");
  }
  globalRef.__irercDriveConfig__ = { at: Date.now(), value: null };
}
