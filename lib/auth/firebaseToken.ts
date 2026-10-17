import { decodeProtectedHeader, importX509, jwtVerify, type JWTPayload } from "jose";

const CERT_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

type CertCache = { certs: Record<string, string>; exp: number };
let certCache: CertCache | null = null;

async function loadCerts(): Promise<Record<string, string>> {
  if (certCache && certCache.exp > Date.now()) return certCache.certs;
  const response = await fetch(CERT_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load Firebase auth certificates.");
  const certs = (await response.json()) as Record<string, string>;
  const maxAge = Number(/max-age=(\d+)/.exec(response.headers.get("cache-control") ?? "")?.[1] ?? 3600);
  certCache = { certs, exp: Date.now() + maxAge * 1000 };
  return certs;
}

export async function verifyFirebaseIdToken(idToken: string, projectId: string): Promise<JWTPayload> {
  const header = decodeProtectedHeader(idToken);
  const kid = typeof header.kid === "string" ? header.kid : "";
  const certs = await loadCerts();
  const pem = certs[kid];
  if (!pem) throw new Error("Unknown Firebase token key.");
  const key = await importX509(pem, "RS256");
  const { payload } = await jwtVerify(idToken, key, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });
  return payload;
}

export function resetCertCacheForTests(): void {
  certCache = null;
}
