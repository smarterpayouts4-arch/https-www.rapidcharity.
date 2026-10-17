import { importPKCS8, SignJWT } from "jose";
import { buildFirestoreCommit, documentName } from "./publish";

type TokenCache = { token: string; exp: number };
let tokenCache: TokenCache | null = null;

export function firestoreConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID?.trim() &&
      process.env.FIREBASE_CLIENT_EMAIL?.trim() &&
      process.env.FIREBASE_PRIVATE_KEY?.trim(),
  );
}

export function firestoreProjectId(): string {
  const id = process.env.FIREBASE_PROJECT_ID?.trim();
  if (!id) throw new Error("FIREBASE_PROJECT_ID is not set.");
  return id;
}

function privateKey(): string {
  return (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
}

export async function firestoreAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.exp > Date.now() + 60_000) return tokenCache.token;
  const email = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  if (!email) throw new Error("FIREBASE_CLIENT_EMAIL is not set.");
  const key = await importPKCS8(privateKey(), "RS256");
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/datastore" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(email)
    .setSubject(email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Firebase token exchange failed (${response.status}).`);
  }
  const body = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw new Error("Firebase token exchange returned no access token.");
  tokenCache = {
    token: body.access_token,
    exp: Date.now() + (body.expires_in ?? 3600) * 1000,
  };
  return body.access_token;
}

function collectionUrl(docId: string): string {
  return `https://firestore.googleapis.com/v1/${documentName(firestoreProjectId(), docId)}`;
}

export async function firestoreGet(docId: string): Promise<unknown | null> {
  const token = await firestoreAccessToken();
  const response = await fetch(collectionUrl(docId), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Firestore read failed (${response.status}).`);
  const body = (await response.json()) as {
    fields?: { json?: { stringValue?: string } };
  };
  const raw = body.fields?.json?.stringValue;
  if (!raw) return null;
  return JSON.parse(raw) as unknown;
}

export async function firestoreSet(docId: string, data: unknown): Promise<void> {
  const json = `${JSON.stringify(data, null, 2)}\n`;
  const updatedAt =
    data && typeof data === "object" && "updatedAt" in data && typeof data.updatedAt === "string"
      ? data.updatedAt
      : new Date().toISOString();
  await firestoreCommit([
    { id: docId, json, updatedAt },
  ]);
}

export async function firestoreCommit(
  documents: { id: string; json: string; updatedAt: string }[],
): Promise<void> {
  const token = await firestoreAccessToken();
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${firestoreProjectId()}/databases/(default)/documents:commit`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildFirestoreCommit(firestoreProjectId(), documents)),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Firestore commit failed (${response.status}): ${detail.slice(0, 280)}`);
  }
}
