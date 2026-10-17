import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { mockApplicationsEnabled } from "@/lib/application/mockGate";
import { SAMPLE_DOCUMENT_FILES } from "@/lib/application/sampleDocuments";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(Object.values(SAMPLE_DOCUMENT_FILES).flat());
const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".png": "image/png", ".pdf": "application/pdf" };

/** Serves the SAMPLE test documents to the "Upload sample documents" button. 404 unless mocks are enabled. */
export async function GET(request: NextRequest) {
  if (!mockApplicationsEnabled()) return new NextResponse("Not found", { status: 404 });
  const name = request.nextUrl.searchParams.get("file") ?? "";
  if (!ALLOWED.has(name)) return new NextResponse("Not found", { status: 404 });
  try {
    const bytes = await readFile(path.join(process.cwd(), "tests", "fixtures", "sample-documents", name));
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": TYPES[path.extname(name)] ?? "application/octet-stream",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
