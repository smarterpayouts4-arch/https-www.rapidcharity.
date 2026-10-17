import { NextResponse } from "next/server";
import { isCycleId } from "@/lib/application/batches";
import { submissionsToCsv } from "@/lib/application/csv";
import { listSubmissions, StorageNotConfiguredError } from "@/lib/application/store";
import { isAuthFailure, requireAdminRead } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = requireAdminRead(request);
  if (isAuthFailure(session)) return session;
  try {
    const cycle = new URL(request.url).searchParams.get("cycle") ?? "";
    if (cycle && !isCycleId(cycle)) {
      return NextResponse.json({ error: "Unknown batch." }, { status: 400 });
    }
    const items = (await listSubmissions()).filter((item) => (cycle ? item.cycle === cycle : true));
    const csv = submissionsToCsv(items);
    const filename = cycle ? `scholarship-applications-${cycle}.csv` : "scholarship-applications.csv";
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
    return NextResponse.json({ error: "The CSV could not be built." }, { status: 500 });
  }
}
