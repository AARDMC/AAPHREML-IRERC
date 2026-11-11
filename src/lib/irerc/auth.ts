/**
 * Client helpers for the portal API.
 *
 * Sign-in is resolved by the server: credentials and Google ID tokens are never
 * verified in the browser, and the resulting session lives in an HttpOnly
 * cookie. This module only knows how to call `/api/auth/*`.
 */

import type { AuthConfig, AuthUser } from "@/lib/integrations/types";

export type { AuthConfig, AuthUser };

type Failure = { error: string; status: number };

async function readError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: unknown };
    if (typeof payload.error === "string" && payload.error.trim()) return payload.error;
  } catch {
    // Ignore a non-JSON error body and fall back to the status text.
  }
  return response.status === 401
    ? "Sign in to continue."
    : `The server could not complete this request (${response.status}).`;
}

async function postJson<T>(url: string, body: unknown): Promise<T | Failure> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
  } catch {
    return { error: "The server is unreachable. Check your connection and try again.", status: 0 };
  }
  if (!response.ok) return { error: await readError(response), status: response.status };
  try {
    return (await response.json()) as T;
  } catch {
    return { error: "The server returned an unreadable response.", status: response.status };
  }
}

function isFailure(value: unknown): value is Failure {
  return Boolean(value && typeof value === "object" && "error" in value);
}

/** Public integration flags. Returns null when the server cannot be reached. */
export async function getAuthConfig(): Promise<AuthConfig | null> {
  try {
    const response = await fetch("/api/auth/config", {
      credentials: "same-origin",
      headers: { accept: "application/json" },
    });
    if (!response.ok) return null;
    return (await response.json()) as AuthConfig;
  } catch {
    return null;
  }
}

/** The signed-in user for the current cookie, or null. */
export async function getSession(): Promise<AuthUser | null> {
  try {
    const response = await fetch("/api/auth/session", {
      credentials: "same-origin",
      headers: { accept: "application/json" },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { user?: AuthUser | null };
    return payload.user ?? null;
  } catch {
    return null;
  }
}

export type DetectMode = "staff" | "sign-in" | "register";

/**
 * Ask the server how this address signs in. Returns null when the lookup
 * fails so the caller can still fall back to showing a password field.
 */
export async function detectAccount(email: string): Promise<DetectMode | null> {
  const result = await postJson<{ mode?: DetectMode }>("/api/auth/detect", { email });
  if (isFailure(result)) return null;
  return result.mode ?? null;
}

/** Email + password sign-in for staff and registered investigators. */
export async function smartLogin(
  email: string,
  password: string,
): Promise<AuthUser | { error: string }> {
  const result = await postJson<{ user?: AuthUser }>("/api/auth/login", { email, password });
  if (isFailure(result)) return { error: result.error };
  if (!result.user) return { error: "The server did not return an account." };
  return result.user;
}

/** Create an investigator account and sign in with it. */
export async function registerPI(
  name: string,
  email: string,
  password: string,
): Promise<AuthUser | { error: string }> {
  const result = await postJson<{ user?: AuthUser }>("/api/auth/register", {
    name,
    email,
    password,
  });
  if (isFailure(result)) return { error: result.error };
  if (!result.user) return { error: "The server did not return an account." };
  return result.user;
}

/** Exchange a Google Identity Services credential for a portal session. */
export async function signInWithGoogle(
  credential: string,
): Promise<AuthUser | { error: string }> {
  const result = await postJson<{ user?: AuthUser }>("/api/auth/google", { credential });
  if (isFailure(result)) return { error: result.error };
  if (!result.user) return { error: "Google sign-in did not return an account." };
  return result.user;
}

/** Clear the session cookie. Safe to call even when already signed out. */
export async function logoutSession(): Promise<void> {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
  } catch {
    // A failed logout still clears local state; the cookie expires on its own.
  }
}

export type GoogleCredentialResponse = { credential: string };

/** Load Google Identity Services once. */
export function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Sign-In could not be loaded."));
    document.head.appendChild(script);
  });
}

/** Open the Google account chooser and return the ID token credential. */
export function requestGoogleCredential(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    void loadGoogleScript()
      .then(() => {
        const api = window.google?.accounts?.id;
        if (!api) {
          reject(new Error("Google Sign-In is unavailable in this browser."));
          return;
        }
        api.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) resolve(response.credential);
            else reject(new Error("Google did not return a credential."));
          },
        });
        api.prompt();
      })
      .catch(reject);
  });
}
