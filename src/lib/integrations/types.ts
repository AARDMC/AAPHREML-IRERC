/** Shared client/server shapes for the GitHub + Drive integrations. */

import type { RoleKey } from "@/lib/irerc/model";

export type AuthUser = {
  email: string;
  name: string;
  role: RoleKey;
};

export type AuthConfig = {
  /** OAuth client IDs are public identifiers and are required by Google Sign-In. */
  googleClientId: string | null;
  googleEnabled: boolean;
  staffConfigured: boolean;
  driveConfigured: boolean;
  accountsPersisted: boolean;
  githubRepo: string;
  githubUrl: string;
  sessionConfigured: boolean;
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

export type DriveStatus = {
  connected: boolean;
  folderId: string;
  name?: string;
  webViewLink?: string;
  error?: string;
  /** Service account that must be shared on the (restricted) Drive folder. */
  serviceAccountEmail?: string;
  /** "env" = host environment, "runtime" = saved from Settings. */
  source?: "env" | "runtime" | "none";
  /** True when the connection was saved from Settings and can be removed there. */
  managedHere?: boolean;
  accountsPersisted: boolean;
};

export type DriveTestStep = { step: string; ok: boolean; detail?: string };

export type DriveTestResult = { ok: boolean; steps: DriveTestStep[] };

export type GithubCommit = {
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  date: string;
  url: string;
};

export type GithubStatus = {
  repo: string;
  url: string;
  connected: boolean;
  name?: string;
  description?: string;
  private?: boolean;
  defaultBranch?: string;
  stars?: number;
  forks?: number;
  openIssues?: number;
  pushedAt?: string;
  latestCommit?: GithubCommit | null;
  error?: string;
};
