import { NextResponse, type NextRequest } from "next/server";
import { DEMO_HEADER, sampleModeAllowed } from "@/lib/application/mockGate";
import { MOCK_APPLICATIONS } from "@/lib/application/mocks";

export const dynamic = "force-dynamic";

/**
 * Sample applicants for the "Test with a sample applicant" chips, for browsers
 * that unlocked sample mode with ?demo=<key> earlier. 404 unless the env gate
 * is on or the x-rapid-demo header matches the key.
 */
export async function GET(request: NextRequest) {
  if (!sampleModeAllowed(request.headers.get(DEMO_HEADER))) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json(
    { mocks: MOCK_APPLICATIONS },
    { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } },
  );
}
