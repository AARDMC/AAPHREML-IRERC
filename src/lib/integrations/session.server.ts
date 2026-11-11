/**
 * Signed, stateless session cookies.
 *
 * The browser only ever holds an opaque HttpOnly JWT; roles and email are
 * verified on every request. No database or external session store is needed,
 * and no secret is exposed in client code.
 */

import { randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { sessionSecret } from "@/lib/integrations/config.server";
import type { AuthUser } from "@/lib/integrations/types";
import type { RoleKey } from "@/lib/irerc/model";

export const SESSION_COOKIE = "irerc_session";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

const ROLES: RoleKey[] = ["investigator", "secretariat", "reviewer", "chair", "admin"];

const globalRef = globalThis as typeof globalThis & {
  __irercEphemeralSecret__?: Uint8Array;
  __irercSessionWarned__?: boolean;
};

function keyBytes(): Uint8Array {
  const configured = sessionSecret();
  if (configured) return new TextEncoder().encode(configured);
  globalRef.__irercEphemeralSecret__ ??= randomBytes(48);
  if (!globalRef.__irercSessionWarned__) {
    globalRef.__irercSessionWarned__ = true;
    console.warn(
      "[irerc] SESSION_SECRET is not set; using an ephemeral secret. Sessions will be invalidated when the server restarts.",
    );
  }
  return globalRef.__irercEphemeralSecret__;
}

export async function createSessionToken(user: AuthUser): Promise<string> {
  return new SignJWT({
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.email)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(keyBytes());
}

export async function readSessionUser(request: Request): Promise<AuthUser | null> {
  const header = request.headers.get("cookie");
  if (!header) return null;
  const token = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, keyBytes(), { algorithms: ["HS256"] });
    const email = typeof payload.email === "string" ? payload.email : "";
    const name = typeof payload.name === "string" ? payload.name : "";
    const role = payload.role as RoleKey;
    if (!email || !ROLES.includes(role)) return null;
    return { email, name, role };
  } catch {
    return null;
  }
}

function isSecureRequest(request: Request): boolean {
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

function cookieAttributes(request: Request): string {
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${
    isSecureRequest(request) ? "; Secure" : ""
  }`;
}

export function sessionCookie(request: Request, token: string): string {
  return `${SESSION_COOKIE}=${token}; ${cookieAttributes(request)}`;
}

export function clearedSessionCookie(request: Request): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${
    isSecureRequest(request) ? "; Secure" : ""
  }`;
}
