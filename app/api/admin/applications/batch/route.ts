import { NextResponse } from "next/server";
import { isCycleId } from "@/lib/application/batches";
import { closeBatch } from "@/lib/application/store";
import { isAuthFailure, requireAdminWrite } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = requireAdminWrite(request);
  if (isAuthFailure(session)) return session;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The batch request could not be read." }, { status: 400 });
  }
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const cycle = typeof record.cycle === "string" ? record.cycle : "";
  if (record.action !== "close" || !isCycleId(cycle)) {
    return NextResponse.json({ error: "Choose a batch to close." }, { status: 400 });
  }
  try {
    const batch = await closeBatch(cycle);
    return NextResponse.json({ batch }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The batch could not be closed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
