import { NextResponse } from "next/server";
import { isAuthFailure, requireAdminRead, requireAdminWrite } from "@/lib/auth/guard";
import {
  publishCollection,
  readCollection,
  readDraftForPublish,
  saveDraft,
  type CollectionName,
} from "@/lib/content/repository";

const noStore = { "Cache-Control": "no-store" };

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function createCollectionHandlers<T extends { updatedAt?: string }>(options: {
  name: CollectionName;
  parse: (data: unknown) => T;
  draftLabel: string;
  publishedLabel: string;
}) {
  async function GET(request: Request) {
    const auth = requireAdminRead(request);
    if (isAuthFailure(auth)) return auth;
    try {
      const [draft, published] = await Promise.all([
        readCollection(options.name, "draft").then((value) => options.parse(value)),
        readCollection(options.name, "published").then((value) => options.parse(value)),
      ]);
      return NextResponse.json(
        {
          draft,
          published,
          draftPath: options.draftLabel,
          publishedPath: options.publishedLabel,
        },
        { headers: noStore },
      );
    } catch (error) {
      return NextResponse.json({ error: messageOf(error, "Failed to load content") }, { status: 500, headers: noStore });
    }
  }

  async function POST(request: Request) {
    const auth = requireAdminWrite(request);
    if (isAuthFailure(auth)) return auth;
    try {
      const body: unknown = await request.json();
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return NextResponse.json({ error: "Expected a JSON object" }, { status: 400, headers: noStore });
      }
      const content = options.parse({
        ...body,
        version: 1,
        updatedAt: new Date().toISOString(),
      });
      await saveDraft(options.name, content);
      return NextResponse.json(
        { ok: true, saved: "draft", path: options.draftLabel, updatedAt: content.updatedAt },
        { headers: noStore },
      );
    } catch (error) {
      return NextResponse.json({ error: messageOf(error, "Invalid content") }, { status: 400, headers: noStore });
    }
  }

  return { GET, POST };
}

export function createPublishHandler<T extends { updatedAt?: string }>(options: {
  name: CollectionName;
  parse: (data: unknown) => T;
  publishedLabel: string;
}) {
  async function POST(request: Request) {
    const auth = requireAdminWrite(request);
    if (isAuthFailure(auth)) return auth;
    try {
      const draft = await readDraftForPublish(options.name);
      const stamped = options.parse({
        ...(draft as object),
        updatedAt: new Date().toISOString(),
      });
      await publishCollection(options.name, stamped);
      return NextResponse.json(
        { ok: true, published: true, path: options.publishedLabel, updatedAt: stamped.updatedAt },
        { headers: noStore },
      );
    } catch (error) {
      const message = messageOf(error, "Publish failed");
      const status = message.includes("No draft") ? 400 : message.includes("Firestore is not configured") ? 503 : 500;
      return NextResponse.json({ error: message }, { status, headers: noStore });
    }
  }

  return { POST };
}
