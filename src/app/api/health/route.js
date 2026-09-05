import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/lib/mongodb";
import { checkGeminiHealth } from "@/lib/gemini";

// One place to answer "why isn't it working?".
//
// The failure modes here (Atlas paused, IP not allow-listed, Gemini daily
// quota exhausted, model retired) all surface to the user as an identical
// generic 500, and none of them are visible from the UI. During a hackathon
// that ambiguity costs more time than the actual fix, so this reports each
// dependency separately with a hint about what to do.
//
// Public and unauthenticated on purpose — it must work before there's a
// database to authenticate an admin against. It therefore reveals only
// up/down status and setup hints, never credentials, connection strings, or
// raw upstream error bodies.
export async function GET() {
  const [database, gemini] = await Promise.all([
    checkDatabaseHealth(),
    checkGeminiHealth(),
  ]);

  const ok = database.ok && gemini.ok;

  return NextResponse.json(
    {
      ok,
      checkedAt: new Date().toISOString(),
      services: { database, gemini },
      // Only the paths that need BOTH dependencies are reported as blocked.
      canCheckClaims: database.ok && gemini.ok,
      canServeFaq: database.ok,
    },
    // 503 rather than 200-with-a-flag, so a uptime probe or a `curl -f`
    // treats a degraded app as down without parsing the body.
    { status: ok ? 200 : 503 }
  );
}
