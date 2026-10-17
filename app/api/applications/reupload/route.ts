import { NextResponse } from "next/server";
import { replaceReupload } from "@/lib/application/store";
import type { DocumentInput } from "@/lib/application/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The re-upload could not be read." }, { status: 400 });
  }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "The re-upload could not be read." }, { status: 400 });
  const record = body as { token?: string; document?: DocumentInput };
  if (!record.token || !record.document) return NextResponse.json({ error: "Upload the replacement file first." }, { status: 400 });
  try {
    await replaceReupload(record.token, {
      ...record.document,
      review_state: "pending",
      review_reason: "",
      reupload_token: "",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The file could not be saved.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
