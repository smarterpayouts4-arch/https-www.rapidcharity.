import { createHash, createHmac, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE = "rc_admin";
const DEV_SECRET = "dev-only-rapid-charity-session-secret";

export type AdminSession = {
  email: string;
  exp: number;
  mode: "firebase" | "local";
};

export function sessionSecret(): string {
  const configured = process.env.ADMIN_SESSION_SECRET?.trim() ?? "";
  if (configured.length >= 16) return configured;
  if (process.env.VERCEL === "1") {
    throw new Error("ADMIN_SESSION_SECRET must be set (16+ characters) on Vercel.");
  }
  return DEV_SECRET;
}

export function signSession(session: AdminSession, secret = sessionSecret()): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function readSessionToken(token: string | undefined | null, now = Date.now()): AdminSession | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  let secret: string;
  try {
    secret = sessionSecret();
  } catch {
    return null;
  }
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const actualBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length || !timingSafeEqual(actualBuf, expectedBuf)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AdminSession;
    if (!data?.email || !data.exp || data.exp < now) return null;
    if (data.mode !== "firebase" && data.mode !== "local") return null;
    return data;
  } catch {
    return null;
  }
}

export function sessionFromCookieHeader(cookieHeader: string | null, now = Date.now()): AdminSession | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((part) => part.trim());
  const raw = parts.find((part) => part.startsWith(`${ADMIN_COOKIE}=`));
  if (!raw) return null;
  return readSessionToken(decodeURIComponent(raw.slice(ADMIN_COOKIE.length + 1)), now);
}

export function passwordsMatch(input: string, expected: string): boolean {
  const left = createHash("sha256").update(input).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

export function firebaseAuthConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID?.trim() && process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim(),
  );
}

/** Used only by `npm run dev` when no password and no Firebase Auth are configured. */
export const LOCAL_DEV_PASSWORD = "rapid-local";

export function localAdminPassword(): string {
  const configured = process.env.ADMIN_LOCAL_PASSWORD?.trim() ?? "";
  if (configured) return configured;
  if (process.env.NODE_ENV === "development" && !process.env.VERCEL && !firebaseAuthConfigured()) {
    return LOCAL_DEV_PASSWORD;
  }
  return "";
}

export function localAdminAllowed(): boolean {
  if (!localAdminPassword()) return false;
  if (process.env.ALLOW_LOCAL_ADMIN === "1") return true;
  return !firebaseAuthConfigured();
}

export function emailAllowed(email: string): boolean {
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
