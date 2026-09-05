import { NextResponse } from "next/server";
import { getAdminFromRequest } from "./auth";

// Call at the top of any protected admin route. Returns the admin payload
// if authorized, or a NextResponse (401) to return immediately if not.
export function requireAdmin(request) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return {
      admin: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { admin, response: null };
}
