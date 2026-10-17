import { NextResponse } from "next/server";
import { cycleLabel, isCycleId } from "@/lib/application/batches";
import { buildWorkbook } from "@/lib/application/excel";
import { listSubmissions, markBatchExported, StorageNotConfiguredError } from "@/lib/application/store";
import { isAuthFailure, requireAdminRead } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = requireAdminRead(request);
  if (isAuthFailure(session)) return session;
  const url = new URL(request.url);
  const cycle = url.searchParams.get("cycle") ?? "";
  const finalExport = url.searchParams.get("final") === "1";
  if (cycle && !isCycleId(cycle)) {
    return NextResponse.json({ error: "Unknown batch." }, { status: 400 });
  }
  if (finalExport && !cycle) {
    return NextResponse.json({ error: "Choose a batch for the final Excel export." }, { status: 400 });
  }
  try {
    const rate = Number(process.env.REVIEW_USD_RATE ?? "278");
    const items = (await listSubmissions()).filter((item) => (cycle ? item.cycle === cycle : true));
    const buffer = await buildWorkbook(items, {
      usdRate: Number.isFinite(rate) && rate > 0 ? rate : 278,
      cycleLabel: cycle ? cycleLabel(cycle) : "Spring 2027",
    });
    if (finalExport) await markBatchExported(cycle);
    const filename = cycle ? `rapid-scholarship-${cycle}.xlsx` : "rapid-scholarship-review.xlsx";
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof StorageNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "The workbook could not be built.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
