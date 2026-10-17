import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_HEADER, DEMO_PARAM, sampleModeAllowed } from "@/lib/application/mockGate";
import { SAMPLE_DOCUMENT_FILES } from "@/lib/application/sampleDocuments";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(Object.values(SAMPLE_DOCUMENT_FILES).flat());
const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".png": "image/png", ".pdf": "application/pdf" };

/**
 * Serves the SAMPLE test documents to the sample applicant flow. 404 unless the env gate is on
 * or the request carries the unlock key (x-rapid-demo header, or ?demo=<key>).
 */
export async function GET(request: NextRequest) {
  const key = request.headers.get(DEMO_HEADER) ?? request.nextUrl.searchParams.get(DEMO_PARAM);
  if (!sampleModeAllowed(key)) return new NextResponse("Not found", { status: 404 });
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
