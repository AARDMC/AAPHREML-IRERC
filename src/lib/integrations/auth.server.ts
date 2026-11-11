/**
 * Server-side account resolution.
 *
 * Staff credentials come from environment variables only (never bundled).
 * Investigators either self-register (PI account in Drive) or sign in with
 * Google, whose ID token is verified before an account is created.
 */

import { createHash, timingSafeEqual } from "node:crypto";
import {
  driveConfigured,
  githubRepo,
  githubRepoUrl,
  googleOAuthClientId,
  sessionConfigured,
} from "@/lib/integrations/config.server";
import { upsertGooglePiAccount } from "@/lib/integrations/accounts.server";
import type { AuthConfig, AuthUser } from "@/lib/integrations/types";
import type { RoleKey } from "@/lib/irerc/model";
import { findUserByEmail } from "@/lib/irerc/users";

export type StaffAccount = AuthUser & { password: string };

const ROLES: RoleKey[] = ["investigator", "secretariat", "reviewer", "chair", "admin"];

type LegacyStaffDefinition = {
  role: RoleKey;
  emailVar: string;
  passwordVar: string;
  nameVar: string;
  fallbackName: string;
};

const LEGACY_STAFF: LegacyStaffDefinition[] = [
  {
    role: "admin",
    emailVar: "STAFF_ADMIN_EMAIL",
    passwordVar: "STAFF_ADMIN_PASS",
    nameVar: "STAFF_ADMIN_NAME",
    fallbackName: "System Administrator",
  },
  {
    role: "chair",
    emailVar: "STAFF_CHAIR_EMAIL",
    passwordVar: "STAFF_CHAIR_PASS",
    nameVar: "STAFF_CHAIR_NAME",
    fallbackName: "Chairperson",
  },
  {
    role: "secretariat",
    emailVar: "STAFF_SECRETARIAT_EMAIL",
    passwordVar: "STAFF_SECRETARIAT_PASS",
    nameVar: "STAFF_SECRETARIAT_NAME",
    fallbackName: "IRERC Secretariat",
  },
  {
    role: "reviewer",
    emailVar: "STAFF_REVIEWER1_EMAIL",
    passwordVar: "STAFF_REVIEWER1_PASS",
    nameVar: "STAFF_REVIEWER1_NAME",
    fallbackName: "Reviewer 1",
  },
  {
    role: "reviewer",
    emailVar: "STAFF_REVIEWER2_EMAIL",
    passwordVar: "STAFF_REVIEWER2_PASS",
    nameVar: "STAFF_REVIEWER2_NAME",
    fallbackName: "Reviewer 2",
  },
];

function readEnv(key: string): string {
  return process.env[key]?.trim() ?? "";
}

function validRole(value: unknown): RoleKey | null {
  return typeof value === "string" && ROLES.includes(value as RoleKey) ? (value as RoleKey) : null;
}

function fromJson(): StaffAccount[] {
  const raw = readEnv("STAFF_ACCOUNTS");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const record = entry as Record<string, unknown>;
      const email = typeof record.email === "string" ? record.email.trim().toLowerCase() : "";
      const password = typeof record.password === "string" ? record.password : "";
      const role = validRole(record.role);
      if (!email || !password || !role) return [];
      const name =
        (typeof record.name === "string" && record.name.trim()) ||
        findUserByEmail(email)?.name ||
        email.split("@")[0] ||
        "Staff";
      return [{ email, name, role, password }];
    });
  } catch {
    console.warn("[irerc] STAFF_ACCOUNTS is not valid JSON; ignoring it.");
    return [];
  }
}

function fromLegacyVariables(): StaffAccount[] {
  return LEGACY_STAFF.flatMap((definition) => {
    const email = readEnv(definition.emailVar).toLowerCase();
    const password = readEnv(definition.passwordVar);
    if (!email || !password) return [];
    const name =
      readEnv(definition.nameVar) ||
      findUserByEmail(email)?.name ||
      definition.fallbackName;
    return [{ email, name, role: definition.role, password }];
  });
}

/** Configured staff accounts, keyed by email (JSON entries win). */
export function staffAccounts(): StaffAccount[] {
  const byEmail = new Map<string, StaffAccount>();
  for (const account of fromLegacyVariables()) byEmail.set(account.email, account);
  for (const account of fromJson()) byEmail.set(account.email, account);
  return [...byEmail.values()];
}

export function staffConfigured(): boolean {
  return staffAccounts().length > 0;
}

export function findStaffAccount(email: string): StaffAccount | null {
  const normalised = email.trim().toLowerCase();
  return staffAccounts().find((account) => account.email === normalised) ?? null;
}

function equalSecret(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** Constant-time staff password check. */
export function verifyStaffCredentials(email: string, password: string): AuthUser | null {
  const account = findStaffAccount(email);
  if (!account) return null;
  if (!equalSecret(password, account.password)) return null;
  return { email: account.email, name: account.name, role: account.role };
}

export async function resolveGoogleAccount(identity: {
  email: string;
  name: string;
}): Promise<AuthUser> {
  const staff = findStaffAccount(identity.email);
  if (staff) {
    return { email: staff.email, name: staff.name, role: staff.role };
  }
  const account = await upsertGooglePiAccount({
    email: identity.email,
    name: identity.name,
  });
  return { email: account.email, name: account.name, role: "investigator" };
}

export function authConfigPayload(): AuthConfig {
  const clientId = googleOAuthClientId() ?? null;
  const drive = driveConfigured();
  return {
    googleClientId: clientId,
    googleEnabled: Boolean(clientId),
    staffConfigured: staffConfigured(),
    driveConfigured: drive,
    accountsPersisted: drive,
    githubRepo: githubRepo(),
    githubUrl: githubRepoUrl(),
    sessionConfigured: sessionConfigured(),
  };
}
