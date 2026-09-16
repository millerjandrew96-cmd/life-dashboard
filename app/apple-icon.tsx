import { ImageResponse } from "next/og";
import { AppIconMark } from "@/lib/appIcon";

// iOS uses this exact convention for the "Add to Home Screen" icon — no manifest entry needed.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<AppIconMark size={180} />, size);
}
