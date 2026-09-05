import { NextResponse } from "next/server";
import { runCheckPipeline } from "@/lib/checkPipeline";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

const MAX_CLAIM_LENGTH = 2000;
const SUPPORTED_LANGUAGES = ["ms", "en", "zh"];

export async function POST(request) {
  const ip = getClientIp(request);
  const limited = rateLimit(`check:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const language = SUPPORTED_LANGUAGES.includes(body.language) ? body.language : "en";
  const sessionId = typeof body.sessionId === "string" ? body.sessionId.slice(0, 100) : null;

  if (!text) {
    return NextResponse.json({ error: "Please paste a message to check." }, { status: 400 });
  }
  if (text.length > MAX_CLAIM_LENGTH) {
    return NextResponse.json(
      { error: `Message is too long (max ${MAX_CLAIM_LENGTH} characters).` },
      { status: 400 }
    );
  }

  try {
    const response = await runCheckPipeline({ text, language, sessionId, inputType: "paste" });
    return NextResponse.json(response);
  } catch (err) {
    console.error("[/api/claims/check] error:", err);
    return NextResponse.json(
      { error: "Something went wrong while checking this claim. Please try again." },
      { status: 500 }
    );
  }
}
