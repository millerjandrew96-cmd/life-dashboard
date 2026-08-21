import { NextResponse } from "next/server";
import { parseBusinessChat } from "@/lib/business/parseChat";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const message = (body as { message?: unknown })?.message;
  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: '"message" is required.' }, { status: 400 });
  }

  const result = parseBusinessChat(message);
  return NextResponse.json(result);
}
