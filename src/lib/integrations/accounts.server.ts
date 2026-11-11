/**
 * PI account records for the GitHub + Drive edition.
 *
 * Accounts are persisted as one JSON file inside the shared Drive folder
 * (`_system/aaphreml-irerc-pi-accounts.json`), so they survive restarts and are
 * available to every server instance without a database. When Drive is not
 * configured (local evaluation), an in-memory store keeps the PI flow usable
 * for the life of the server process only.
 */

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { driveConfigured } from "@/lib/integrations/config.server";
import { readJsonFile, writeJsonFile } from "@/lib/integrations/drive.server";
import { cached, invalidateCache } from "@/lib/integrations/cache.server";

const ACCOUNTS_FILE = "aaphreml-irerc-pi-accounts.json";
const CACHE_KEY = "accounts:pi";
const CACHE_TTL_MS = 20_000;

export type PiAccount = {
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
  provider: "password" | "google";
};

type AccountFile = { version: number; accounts: PiAccount[] };

const globalRef = globalThis as typeof globalThis & {
  __irercMemoryAccounts__?: PiAccount[];
};

function memoryAccounts(): PiAccount[] {
  globalRef.__irercMemoryAccounts__ ??= [];
  return globalRef.__irercMemoryAccounts__;
}

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function accountsPersisted(): boolean {
  return driveConfigured();
}

async function readAccounts(fresh = false): Promise<PiAccount[]> {
  if (!driveConfigured()) return [...memoryAccounts()];
  if (fresh) invalidateCache(CACHE_KEY);
  return cached(CACHE_KEY, CACHE_TTL_MS, async () => {
    const file = await readJsonFile<AccountFile>(ACCOUNTS_FILE);
    if (!file || !Array.isArray(file.accounts)) return [];
    return file.accounts.filter(
      (account): account is PiAccount =>
        Boolean(account && typeof account.email === "string" && typeof account.name === "string"),
    );
  });
}

async function writeAccounts(accounts: PiAccount[]): Promise<void> {
  if (!driveConfigured()) {
    globalRef.__irercMemoryAccounts__ = accounts;
    return;
  }
  await writeJsonFile(ACCOUNTS_FILE, { version: 1, accounts });
  invalidateCache(CACHE_KEY);
}

export async function findPiAccount(email: string): Promise<PiAccount | null> {
  const normalised = normaliseEmail(email);
  return (await readAccounts()).find((account) => account.email === normalised) ?? null;
}

export async function hasPiAccount(email: string): Promise<boolean> {
  return (await findPiAccount(email)) !== null;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPasswordHash(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  try {
    const expected = Buffer.from(hash, "hex");
    const actual = scryptSync(password, salt, expected.byteLength);
    return expected.byteLength === actual.byteLength && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export type CreateAccountResult =
  | { ok: true; account: PiAccount }
  | { ok: false; error: string };

export async function createPiAccount(input: {
  name: string;
  email: string;
  password?: string;
  provider: "password" | "google";
}): Promise<CreateAccountResult> {
  const name = input.name.trim();
  const email = normaliseEmail(input.email);
  if (!name) return { ok: false, error: "Enter your full name." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (input.provider === "password") {
    if (!input.password || input.password.length < 8) {
      return { ok: false, error: "Use a password of at least 8 characters." };
    }
  }

  const accounts = await readAccounts(true);
  if (accounts.some((account) => account.email === email)) {
    return { ok: false, error: "An account already exists for this email. Sign in instead." };
  }

  const account: PiAccount = {
    email,
    name,
    passwordHash: input.provider === "password" ? hashPassword(input.password ?? "") : "",
    createdAt: new Date().toISOString(),
    provider: input.provider,
  };
  accounts.push(account);
  await writeAccounts(accounts);
  return { ok: true, account };
}

export async function verifyPiPassword(email: string, password: string): Promise<PiAccount | null> {
  const account = await findPiAccount(email);
  if (!account || account.provider !== "password") return null;
  return verifyPasswordHash(password, account.passwordHash) ? account : null;
}

/**
 * Add or update a Google-backed PI account. Existing staff accounts are
 * handled before this function is called, so an account created here is always
 * an investigator.
 */
export async function upsertGooglePiAccount(input: {
  name: string;
  email: string;
}): Promise<PiAccount> {
  const email = normaliseEmail(input.email);
  const accounts = await readAccounts(true);
  const existing = accounts.find((account) => account.email === email);
  if (existing) return existing;

  const account: PiAccount = {
    email,
    name: input.name.trim() || email.split("@")[0] || "Investigator",
    passwordHash: "",
    createdAt: new Date().toISOString(),
    provider: "google",
  };
  accounts.push(account);
  await writeAccounts(accounts);
  return account;
}
