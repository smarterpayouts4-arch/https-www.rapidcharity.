import { NextResponse } from "next/server";
import { isCycleId } from "@/lib/application/batches";
import { submissionsToCsv, submissionsToPortalCsv } from "@/lib/application/csv";
import { listSubmissions, StorageNotConfiguredError } from "@/lib/application/store";
import { isAuthFailure, requireAdminRead } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = requireAdminRead(request);
  if (isAuthFailure(session)) return session;
  try {
    const params = new URL(request.url).searchParams;
    const cycle = params.get("cycle") ?? "";
    // Default: the scholarship portal's column order. ?format=full keeps every stored field.
    const full = params.get("format") === "full";
    if (cycle && !isCycleId(cycle)) {
      return NextResponse.json({ error: "Unknown batch." }, { status: 400 });
    }
    const items = (await listSubmissions()).filter((item) => (cycle ? item.cycle === cycle : true));
    const csv = full ? submissionsToCsv(items) : submissionsToPortalCsv(items);
    const base = full ? "scholarship-applications-full" : "export_applications";
    const filename = cycle ? `${base}-${cycle}.csv` : `${base}.csv`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("[export] the CSV could not be built", error);
    return NextResponse.json({ error: "The CSV could not be built." }, { status: 500 });
  }
}
