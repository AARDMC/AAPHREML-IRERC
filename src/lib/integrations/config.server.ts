/**
 * Server-only configuration for the GitHub + Google Drive edition.
 *
 * Nothing here is imported by client components: credentials and tokens must
 * never reach the browser bundle. Public identifiers (folder ID, repository
 * slug) have safe defaults from the project brief and can be overridden with
 * environment variables.
 */

import { env } from "@/lib/env.server";
import { readRuntimeDriveConfig } from "@/lib/integrations/drive-config.server";

export const DEFAULT_DRIVE_FOLDER_ID = "1IKIdODOiY_0hwanRQ4xk-MhzKVlXVprF";
export const DEFAULT_GITHUB_REPO = "AARDMC/AAPHREML-IRERC";

export type ServiceAccountCredentials = {
  clientEmail: string;
  privateKey: string;
};

export function driveFolderId(): string {
  return (
    env("GOOGLE_DRIVE_FOLDER_ID") ??
    readRuntimeDriveConfig()?.folderId ??
    DEFAULT_DRIVE_FOLDER_ID
  );
}

/** Where the Drive credentials came from, for the Settings card. */
export function driveConfigSource(): "env" | "runtime" | "none" {
  if (env("GOOGLE_SERVICE_ACCOUNT_JSON") || (env("GOOGLE_SERVICE_ACCOUNT_EMAIL") && env("GOOGLE_PRIVATE_KEY"))) {
    return "env";
  }
  return readRuntimeDriveConfig() ? "runtime" : "none";
}

export function githubRepo(): string {
  return env("GITHUB_REPO") ?? DEFAULT_GITHUB_REPO;
}

export function githubToken(): string | undefined {
  return env("GITHUB_TOKEN");
}

export function googleOAuthClientId(): string | undefined {
  return env("GOOGLE_CLIENT_ID");
}

export function sessionSecret(): string | undefined {
  return env("SESSION_SECRET");
}

function normalisePrivateKey(value: string): string {
  // Environment files commonly store the PEM on one line with literal \n.
  return value.includes("\\n") ? value.replace(/\\n/g, "\n") : value;
}
export { normalisePrivateKey };

/**
 * Read a Google service account either as a full JSON document
 * (`GOOGLE_SERVICE_ACCOUNT_JSON`) or as split email/key variables.
 */
export function serviceAccountCredentials(): ServiceAccountCredentials | null {
  const json = env("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (json) {
    try {
      const parsed = JSON.parse(json) as {
        client_email?: string;
        private_key?: string;
      };
      if (parsed.client_email && parsed.private_key) {
        return {
          clientEmail: parsed.client_email,
          privateKey: normalisePrivateKey(parsed.private_key),
        };
      }
    } catch {
      // Fall through to the split variables so a malformed JSON value is
      // reported by the status endpoint instead of crashing the server.
    }
  }

  const clientEmail = env("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const privateKey = env("GOOGLE_PRIVATE_KEY");
  if (clientEmail && privateKey) {
    return { clientEmail, privateKey: normalisePrivateKey(privateKey) };
  }

  // Credentials entered in Settings and stored on the server.
  const runtime = readRuntimeDriveConfig();
  if (runtime) {
    return {
      clientEmail: runtime.clientEmail,
      privateKey: normalisePrivateKey(runtime.privateKey),
    };
  }
  return null;
}

export function driveConfigured(): boolean {
  return serviceAccountCredentials() !== null;
}

export function sessionConfigured(): boolean {
  return Boolean(sessionSecret());
}

export function githubConfigured(): boolean {
  return Boolean(githubRepo());
}

/** Human-readable project links shown in Settings. */
export function driveFolderUrl(): string {
  return `https://drive.google.com/drive/folders/${driveFolderId()}`;
}

export function githubRepoUrl(): string {
  return `https://github.com/${githubRepo()}`;
}
