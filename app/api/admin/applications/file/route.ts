import { NextResponse } from "next/server";
import { readLocalFile, UploadStorageError } from "@/lib/application/blobStore";
import { getSubmission } from "@/lib/application/store";
import { isAuthFailure, requireAdminRead } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = requireAdminRead(request);
  if (isAuthFailure(session)) return session;
  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";
  const slot = url.searchParams.get("slot") ?? "";
  const index = Number(url.searchParams.get("index") ?? "1");
  const application = await getSubmission(id);
  const document = application?.documents.find((item) => item.slot === slot && item.index === index);
  if (!application || !document || !document.path) {
    return NextResponse.json({ error: "That file is not on the application." }, { status: 404 });
  }
  if (document.storage !== "local") {
    if (!document.url) return NextResponse.json({ error: "This file has no reviewer link yet." }, { status: 404 });
    return NextResponse.redirect(document.url);
  }
  try {
    const bytes = await readLocalFile(document.path);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": document.mime || "application/octet-stream",
        "Content-Disposition": `inline; filename="${slot}-${index}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof UploadStorageError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "The file could not be opened." }, { status: 404 });
  }
}
