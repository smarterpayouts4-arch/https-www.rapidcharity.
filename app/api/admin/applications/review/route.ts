import { NextResponse } from "next/server";
import { reviewOtherField, updateApplicationReview } from "@/lib/application/store";
import { isAuthFailure, requireAdminWrite } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = requireAdminWrite(request);
  if (isAuthFailure(session)) return session;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The review request could not be read." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "The review request could not be read." }, { status: 400 });
  }
  const record = body as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : "";
  const action = typeof record.action === "string" ? record.action : "";
  if (!id || !action) return NextResponse.json({ error: "Choose an application and an action." }, { status: 400 });
  try {
    if (action === "promote" || action === "dismiss") {
      const field = typeof record.field === "string" ? record.field : "";
      if (!field) return NextResponse.json({ error: "Choose a field." }, { status: 400 });
      const submission = await reviewOtherField(id, field, action);
      return NextResponse.json({ submission }, { headers: { "Cache-Control": "no-store" } });
    }
    const result = await updateApplicationReview(id, {
      action: action as "workflow" | "decision" | "award" | "category" | "remark" | "document" | "flag",
      author: session.email,
      workflow: typeof record.workflow === "string" ? record.workflow : undefined,
      award_amount: typeof record.award_amount === "number" || record.award_amount === null ? record.award_amount : undefined,
      rejection_reason: typeof record.rejection_reason === "string" ? record.rejection_reason : undefined,
      remarks: typeof record.remarks === "string" ? record.remarks : undefined,
      export_category: typeof record.export_category === "string" ? record.export_category : undefined,
      text: typeof record.text === "string" ? record.text : undefined,
      slot: typeof record.slot === "string" ? record.slot : undefined,
      index: typeof record.index === "number" ? record.index : undefined,
      doc_state: typeof record.doc_state === "string" ? record.doc_state : undefined,
      reason: typeof record.reason === "string" ? record.reason : undefined,
      flag: typeof record.flag === "string" ? record.flag : undefined,
      verified: typeof record.verified === "boolean" ? record.verified : undefined,
    });
    return NextResponse.json(
      { submission: result.application, reuploadPath: result.reuploadPath },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "The review could not be saved.";
    const status = message === "Application not found." ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
