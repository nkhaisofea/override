import { NextResponse } from "next/server";
import { extractClaimFromImage } from "@/lib/gemini";
import { runCheckPipeline } from "@/lib/checkPipeline";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

const SUPPORTED_LANGUAGES = ["ms", "en", "zh"];
const SUPPORTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
// Base64 is ~33% larger than the raw bytes; this caps the raw image at ~8MB,
// generous for a phone screenshot while keeping the request body sane.
const MAX_BASE64_LENGTH = 11_000_000;

// "Reality Scan" — paste a screenshot instead of typing the claim. Shares
// the exact same verification pipeline as /api/claims/check once the claim
// text has been read out of the image (see lib/checkPipeline.js).
export async function POST(request) {
  const ip = getClientIp(request);
  // Image analysis is more expensive than text — a tighter limit than the
  // text check endpoint.
  const limited = rateLimit(`check-image:${ip}`, { limit: 5, windowMs: 60_000 });
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

  const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : "";
  const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
  const language = SUPPORTED_LANGUAGES.includes(body.language) ? body.language : "en";
  const sessionId = typeof body.sessionId === "string" ? body.sessionId.slice(0, 100) : null;

  if (!imageBase64) {
    return NextResponse.json({ error: "Please attach a screenshot to check." }, { status: 400 });
  }
  if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
    return NextResponse.json({ error: "Unsupported image type." }, { status: 400 });
  }
  if (imageBase64.length > MAX_BASE64_LENGTH) {
    return NextResponse.json({ error: "Image is too large. Try a smaller screenshot." }, { status: 400 });
  }

  try {
    const claimText = await extractClaimFromImage({ imageBase64, mimeType });
    if (!claimText) {
      return NextResponse.json(
        { error: "Couldn't find a health claim in that image. Try a clearer screenshot, or paste the text instead." },
        { status: 422 }
      );
    }

    const response = await runCheckPipeline({ text: claimText, language, sessionId, inputType: "scan" });
    return NextResponse.json(response);
  } catch (err) {
    console.error("[/api/claims/check-image] error:", err);
    return NextResponse.json(
      { error: "Something went wrong while reading this screenshot. Please try again." },
      { status: 500 }
    );
  }
}
