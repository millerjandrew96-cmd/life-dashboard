import { ImageResponse } from "next/og";
import { AppIconMark } from "@/lib/appIcon";

// Plain route (not the `icon` file convention) so the manifest can reference a fixed
// 192x192 PNG URL directly, for the Android/desktop "Add to Home Screen" icon.
// Content never changes, so build it once instead of on every request.
export const dynamic = "force-static";

export async function GET() {
  return new ImageResponse(<AppIconMark size={192} />, { width: 192, height: 192 });
}
