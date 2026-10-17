import { createWriteStream, existsSync, mkdirSync } from "fs";
import { basename, extname, join } from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { NextResponse } from "next/server";
import { isAuthFailure, requireAdminWrite } from "@/lib/auth/guard";
import { VIDEO_UPLOAD_DIR } from "@/lib/content/paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ALLOWED_EXT = new Set([".mp4", ".webm", ".mov", ".m4v"]);
/** Hobby-friendly ceiling. Large films belong on YouTube or Vimeo, not in the request body. */
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * POST multipart/form-data with field "file".
 * Local dev only — Vercel serverless disks do not persist uploaded media.
 */
export async function POST(request: Request) {
  const auth = requireAdminWrite(request);
  if (isAuthFailure(auth)) return auth;

  if (process.env.VERCEL === "1") {
    return NextResponse.json(
      {
        error:
          "File upload is unavailable on Vercel. Commit images under public/assets, or set a YouTube/Vimeo embed URL on the video.",
      },
      { status: 501, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    if (!existsSync(VIDEO_UPLOAD_DIR)) mkdirSync(VIDEO_UPLOAD_DIR, { recursive: true });
    const form = await request.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Expected multipart field "file"' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large (max ${MAX_BYTES / (1024 * 1024)} MB). Use a YouTube or Vimeo embed URL instead.` },
        { status: 413 },
      );
    }
    const original = basename(file.name || "upload.mp4");
    const ext = extname(original).toLowerCase() || ".mp4";
    if (!ALLOWED_EXT.has(ext)) {
      return NextResponse.json(
        { error: `Unsupported type ${ext}. Allowed: ${[...ALLOWED_EXT].join(", ")}` },
        { status: 400 },
      );
    }
    const safeBase =
      original
        .replace(ext, "")
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "video";
    const filename = `${safeBase}${ext}`;
    const dest = join(/*turbopackIgnore: true*/ VIDEO_UPLOAD_DIR, filename);
    const nodeReadable = Readable.fromWeb(file.stream() as import("stream/web").ReadableStream);
    await pipeline(nodeReadable, createWriteStream(dest));
    return NextResponse.json({
      ok: true,
      path: `/assets/videos/${filename}`,
      filename,
      size: file.size,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
