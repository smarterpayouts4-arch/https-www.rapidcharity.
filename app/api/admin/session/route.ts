import { NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/auth/firebaseToken";
import { originAllowed, requestIsSecure } from "@/lib/auth/origin";
import {
  ADMIN_COOKIE,
  SESSION_TTL_MS,
  emailAllowed,
  firebaseAuthConfigured,
  localAdminAllowed,
  localAdminPassword,
  passwordsMatch,
  sessionFromCookieHeader,
  signSession,
} from "@/lib/auth/session";
import { storageMode } from "@/lib/content/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

function cookieHeader(token: string, request: Request): string {
  const secure = requestIsSecure(request) ? "; Secure" : "";
  return `${ADMIN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${secure}`;
}

export async function GET(request: Request) {
  const session = sessionFromCookieHeader(request.headers.get("cookie"));
  if (!session) {
    return NextResponse.json({ ok: false }, { status: 401, headers: noStore });
  }
  return NextResponse.json(
    { ok: true, email: session.email, mode: session.mode, storage: storageMode() },
    { headers: noStore },
  );
}

export async function POST(request: Request) {
  if (!originAllowed(request)) {
    return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403, headers: noStore });
  }
  try {
    const body = (await request.json()) as { password?: string; idToken?: string };
    if (typeof body.idToken === "string" && body.idToken) {
      if (!firebaseAuthConfigured()) {
        return NextResponse.json({ error: "Firebase Auth is not configured." }, { status: 400, headers: noStore });
      }
      const projectId = process.env.FIREBASE_PROJECT_ID?.trim() ?? "";
      const payload = await verifyFirebaseIdToken(body.idToken, projectId);
      const email = typeof payload.email === "string" ? payload.email : "";
      if (!email) {
        return NextResponse.json({ error: "Firebase account has no email." }, { status: 403, headers: noStore });
      }
      if (!emailAllowed(email)) {
        return NextResponse.json({ error: "This account is not an editor." }, { status: 403, headers: noStore });
      }
      const token = signSession({ email, exp: Date.now() + SESSION_TTL_MS, mode: "firebase" });
      return NextResponse.json(
        { ok: true, email, mode: "firebase", storage: storageMode() },
        { headers: { ...noStore, "Set-Cookie": cookieHeader(token, request) } },
      );
    }

    if (!localAdminAllowed()) {
      return NextResponse.json(
        { error: "Local admin password is disabled. Sign in with Firebase." },
        { status: 403, headers: noStore },
      );
    }
    const expected = localAdminPassword();
    if (typeof body.password !== "string" || !passwordsMatch(body.password, expected)) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 401, headers: noStore });
    }
    const token = signSession({
      email: "local-admin",
      exp: Date.now() + SESSION_TTL_MS,
      mode: "local",
    });
    return NextResponse.json(
      { ok: true, email: "local-admin", mode: "local", storage: storageMode() },
      { headers: { ...noStore, "Set-Cookie": cookieHeader(token, request) } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sign-in failed";
    return NextResponse.json({ error: message }, { status: 401, headers: noStore });
  }
}

export async function DELETE(request: Request) {
  if (!originAllowed(request)) {
    return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403, headers: noStore });
  }
  const secure = requestIsSecure(request) ? "; Secure" : "";
  return NextResponse.json(
    { ok: true },
    {
      headers: {
        ...noStore,
        "Set-Cookie": `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`,
      },
    },
  );
}
