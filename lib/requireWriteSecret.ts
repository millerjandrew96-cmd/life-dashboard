import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * Shared-secret check for dashboard write routes.
 *
 * Pepper (and any other trusted writer) sends the secret in the
 * `x-dashboard-secret` header. The secret lives only in the server
 * environment as DASHBOARD_WRITE_SECRET — it is never sent to the browser.
 *
 * While DASHBOARD_WRITE_SECRET is unset the check passes, so local dev and
 * the dashboard's own log boxes keep working until the secret is configured.
 * Once it is set, every write without the matching header gets a 401.
 *
 * Returns a 401 response when the request must be rejected, or null when
 * the request may proceed.
 */
export function requireWriteSecret(request: Request): NextResponse | null {
  const secret = process.env.DASHBOARD_WRITE_SECRET;
  if (!secret) return null;

  const provided = request.headers.get("x-dashboard-secret");
  if (!provided || !secretsMatch(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return null;
}

function secretsMatch(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}
