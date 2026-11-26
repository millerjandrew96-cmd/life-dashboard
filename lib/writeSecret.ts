/**
 * Client-side write-secret handling for the dashboard's own log boxes.
 *
 * The server requires the `x-dashboard-secret` header on every write route
 * (see lib/requireWriteSecret.ts). Pepper sends the header from its own
 * stored credential. This module lets the browser do the same: the user
 * unlocks once per browser (see components/UnlockBox), the secret is kept
 * in localStorage, and every client write POST goes through writeFetch,
 * which attaches the header.
 *
 * No secret value ever lives in code — only in the user's browser storage.
 * The stored value is never displayed, logged, or sent anywhere except as
 * the `x-dashboard-secret` header to this dashboard's own API routes.
 */

const STORAGE_KEY = "life-dashboard-write-secret";

// In-memory fallback for browsers where localStorage is unavailable or
// wiped per session (e.g. private mode). Lasts until the tab closes.
let memorySecret: string | null = null;

export function getWriteSecret(): string | null {
  try {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) return stored;
    }
  } catch {
    // localStorage unavailable — fall through to the in-memory copy.
  }
  return memorySecret;
}

export function hasWriteSecret(): boolean {
  return getWriteSecret() !== null;
}

export function saveWriteSecret(secret: string): void {
  const value = secret.trim();
  memorySecret = value || null;
  try {
    if (typeof window !== "undefined") {
      if (value) window.localStorage.setItem(STORAGE_KEY, value);
      else window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage unavailable; the in-memory copy still works for this session.
  }
}

export function clearWriteSecret(): void {
  memorySecret = null;
  try {
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

/**
 * fetch wrapper for dashboard write routes. Attaches the stored write
 * secret as `x-dashboard-secret` when one is saved; otherwise the request
 * goes out exactly as before (and the server answers 401 while the secret
 * is configured). Reads are unaffected — use plain fetch for those.
 */
export async function writeFetch(input: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  const secret = getWriteSecret();
  if (secret) headers.set("x-dashboard-secret", secret);
  return fetch(input, { ...init, headers });
}
