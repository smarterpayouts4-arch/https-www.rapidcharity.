import { NextResponse } from "next/server";
import { isAuthFailure, requireAdminRead } from "@/lib/auth/guard";
import { firestoreConfigured } from "@/lib/content/firestore";
import { listBatches, listSubmissions, StorageNotConfiguredError } from "@/lib/application/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = requireAdminRead(request);
  if (isAuthFailure(session)) return session;
  try {
    const submissions = await listSubmissions();
    const batches = await listBatches(submissions);
    return NextResponse.json(
      { submissions, batches, storage: firestoreConfigured() ? "firestore" : "local" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) {
      return NextResponse.json({ error: error.message, submissions: [] }, { status: 503 });
    }
    return NextResponse.json({ error: "Applications could not be loaded." }, { status: 500 });
  }
}
