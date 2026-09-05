import { NextResponse } from "next/server";
import { getCollections } from "@/lib/mongodb";
import { verifyPassword, signAdminToken, COOKIE_NAME } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(request) {
  const ip = getClientIp(request);
  const limited = rateLimit(`admin-login:${ip}`, { limit: 8, windowMs: 60_000 });
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  try {
    const { admins } = await getCollections();
    const admin = await admins.findOne({ email });
    if (!admin || !verifyPassword(password, admin.passwordHash)) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = signAdminToken({ id: admin._id.toString(), email: admin.email });
    const res = NextResponse.json({ email: admin.email });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12, // 12h, matches JWT expiry
    });
    return res;
  } catch (err) {
    console.error("[/api/admin/login] error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
