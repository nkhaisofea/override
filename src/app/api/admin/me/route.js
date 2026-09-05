import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";

// Cheap auth check used by the admin shell to decide whether to render
// the dashboard or bounce to /admin/login.
export async function GET(request) {
  const { admin, response } = requireAdmin(request);
  if (!admin) return response;
  return NextResponse.json({ email: admin.email });
}
