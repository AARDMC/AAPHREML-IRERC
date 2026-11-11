/**
 * Google server helpers: service-account access tokens for Drive, and
 * verification of Google Identity Services ID tokens for sign-in.
 *
 * Uses the already-installed `jose` package, so no extra SDK or native module
 * is needed. Secrets stay on the server.
 */

import { SignJWT, createRemoteJWKSet, importPKCS8, jwtVerify } from "jose";
import {
  googleOAuthClientId,
  serviceAccountCredentials,
  type ServiceAccountCredentials,
} from "@/lib/integrations/config.server";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

type TokenCache = { accessToken: string; expiresAt: number };

const globalRef = globalThis as typeof globalThis & {
  __irercDriveToken__?: TokenCache;
  __irercGoogleJwks__?: ReturnType<typeof createRemoteJWKSet>;
};

/** Exchange a specific service account for a Drive access token. */
export async function accessTokenFor(
  credentials: ServiceAccountCredentials,
): Promise<{ accessToken: string; expiresIn: number }> {
  const key = await importPKCS8(credentials.privateKey, "RS256").catch(() => {
    throw new Error(
      "GOOGLE_PRIVATE_KEY is not a valid PEM private key. Paste the key exactly as issued, with newlines intact.",
    );
  });
  const assertion = await new SignJWT({ scope: DRIVE_SCOPE })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(credentials.clientEmail)
    .setSubject(credentials.clientEmail)
    .setAudience(TOKEN_ENDPOINT)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Google service-account authentication failed (${response.status}). ${detail.slice(0, 240)}`.trim(),
    );
  }

  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!payload.access_token) {
    throw new Error("Google did not return an access token.");
  }
  return {
    accessToken: payload.access_token,
    expiresIn: payload.expires_in ?? 3600,
  };
}

/** Exchange the service-account JWT for a Drive access token (cached). */
export async function driveAccessToken(): Promise<string> {
  const cached = globalRef.__irercDriveToken__;
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.accessToken;
  }

  const credentials = serviceAccountCredentials();
  if (!credentials) {
    throw new Error(
      "Google Drive is not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON (or the split email/key variables).",
    );
  }

  const { accessToken, expiresIn } = await accessTokenFor(credentials);
  globalRef.__irercDriveToken__ = {
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
  };
  return accessToken;
}

export function clearDriveAccessToken(): void {
  globalRef.__irercDriveToken__ = undefined;
}

export type GoogleIdentity = {
  sub: string;
  email: string;
  name: string;
};

/**
 * Verify a Google Identity Services credential. The browser never sends a
 * trusted email: the signature, issuer, audience and expiry are all checked
 * against Google's published keys.
 */
export async function verifyGoogleIdToken(credential: string): Promise<GoogleIdentity> {
  const clientId = googleOAuthClientId();
  if (!clientId) {
    throw new Error("Google Sign-In is not configured. Set GOOGLE_CLIENT_ID on the server.");
  }

  const jwks =
    globalRef.__irercGoogleJwks__ ??
    createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
  globalRef.__irercGoogleJwks__ = jwks;

  const { payload } = await jwtVerify(credential, jwks, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId,
  });

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (!email || payload.email_verified === false) {
    throw new Error("Google did not return a verified email address.");
  }

  return {
    sub: String(payload.sub ?? ""),
    email,
    name:
      (typeof payload.name === "string" && payload.name.trim()) ||
      email.split("@")[0] ||
      "Investigator",
  };
}
