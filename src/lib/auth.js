import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-insecure-secret-change-me";
const COOKIE_NAME = "vitaura_admin_token";

export function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

export function signAdminToken({ id, email }) {
  return jwt.sign({ sub: id, email }, JWT_SECRET, { expiresIn: "12h" });
}

export function verifyAdminToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export { COOKIE_NAME };

// Pulls + verifies the admin JWT from a Next.js Request's cookies.
export function getAdminFromRequest(request) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}
