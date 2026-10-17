import { NextResponse } from "next/server";
import { originAllowed } from "./origin";
import { sessionFromCookieHeader, type AdminSession } from "./session";

function unauthorized() {
  return NextResponse.json(
    { error: "Authentication required" },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

function forbidden(message: string) {
  return NextResponse.json(
    { error: message },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
}

export function requireAdminRead(request: Request): AdminSession | NextResponse {
  const session = sessionFromCookieHeader(request.headers.get("cookie"));
  if (!session) return unauthorized();
  return session;
}

export function requireAdminWrite(request: Request): AdminSession | NextResponse {
  const session = sessionFromCookieHeader(request.headers.get("cookie"));
  if (!session) return unauthorized();
  if (!originAllowed(request)) return forbidden("Cross-origin request blocked");
  return session;
}

export function isAuthFailure(value: AdminSession | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}
