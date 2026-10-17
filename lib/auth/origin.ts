/** Reject cross-site mutations. Same-origin admin fetches always send Origin. */
export function originAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const hostHeader = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!hostHeader) return false;
  const host = hostHeader.split(",")[0]?.trim();
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function requestIsSecure(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0]?.trim() === "https";
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}
