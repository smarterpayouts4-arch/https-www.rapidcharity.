import { NextResponse } from "next/server";
import { UploadStorageError } from "@/lib/application/blobStore";
import { purgeBatch } from "@/lib/application/store";
import { isAuthFailure, requireAdminWrite } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = requireAdminWrite(request);
  if (isAuthFailure(session)) return session;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The archive request could not be read." }, { status: 400 });
  }
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const cycle = typeof record.cycle === "string" ? record.cycle : "";
  const confirm = typeof record.confirm === "string" ? record.confirm : "";
  try {
    const result = await purgeBatch(cycle, confirm);
    return NextResponse.json(
      {
        submissions: result.submissions,
        files: result.files,
        batch: result.batch,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof UploadStorageError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    const message = error instanceof Error ? error.message : "The batch could not be archived.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
