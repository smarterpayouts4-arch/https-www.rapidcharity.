import { NextResponse } from "next/server";
import { assertOwnedFiles, UploadStorageError } from "@/lib/application/blobStore";
import { buildSubmission } from "@/lib/application/record";
import { loadFormState } from "@/lib/application/formSettings";
import { validateApplication } from "@/lib/application/schema";
import { BatchClosedError } from "@/lib/application/batches";
import {
  DuplicateCnicError,
  getSubmission,
  loadPromoted,
  saveSubmission,
  StorageNotConfiguredError,
  submissionStorageReady,
} from "@/lib/application/store";
import { isLocalSampleDocument } from "@/lib/application/sampleDocuments";

const STORAGE_DOWN =
  "Applications cannot be submitted right now because storage is not set up. Your answers stay saved in this browser. Please try again later or contact us.";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const form = await loadFormState();
  if (!form.open) {
    return NextResponse.json({ formError: form.closedMessage, closed: true }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ formError: "The application could not be read." }, { status: 400 });
  }

  if (
    body &&
    typeof body === "object" &&
    "website" in body &&
    typeof body.website === "string" &&
    body.website.trim()
  ) {
    return NextResponse.json({ formError: "The application could not be submitted." }, { status: 400 });
  }

  let promoted: Awaited<ReturnType<typeof loadPromoted>> = [];
  try {
    promoted = await loadPromoted();
  } catch {
    promoted = [];
  }

  const result = validateApplication(body, { promoted });
  if (!result.ok) {
    return NextResponse.json({ fieldErrors: result.fieldErrors }, { status: 400 });
  }

  if (result.data.documents.some(isLocalSampleDocument)) {
    return NextResponse.json(
      {
        formError:
          "This sample used sample files that were not uploaded, because file storage is not set up here. Nothing was submitted.",
        sampleNotUploaded: true,
      },
      { status: 409 },
    );
  }
  if (!submissionStorageReady()) {
    console.error("[applications] submit refused: application storage is not configured (Firestore credentials missing).");
    return NextResponse.json({ formError: STORAGE_DOWN }, { status: 503 });
  }

  const id = result.data.client_id || crypto.randomUUID();
  try {
    const existing = await getSubmission(id);
    if (existing) {
      return NextResponse.json({ formError: "This application was already submitted." }, { status: 409 });
    }
    const missing = await assertOwnedFiles(id, result.data.documents);
    if (missing) return NextResponse.json({ fieldErrors: { documents: missing } }, { status: 400 });
  } catch (error) {
    if (error instanceof UploadStorageError) {
      return NextResponse.json({ formError: error.message }, { status: 503 });
    }
    if (error instanceof StorageNotConfiguredError) {
      return NextResponse.json({ formError: STORAGE_DOWN }, { status: 503 });
    }
    throw error;
  }

  const submission = buildSubmission(result.data, {
    id,
    submittedAt: new Date().toISOString(),
    cycle: form.cycleId,
  });

  try {
    await saveSubmission(submission);
  } catch (error) {
    if (error instanceof BatchClosedError) {
      return NextResponse.json({ formError: error.message }, { status: 403 });
    }
    if (error instanceof DuplicateCnicError) {
      return NextResponse.json(
        { fieldErrors: { cnic: `This CNIC was already submitted for ${form.cycleName}.` } },
        { status: 409 },
      );
    }
    if (error instanceof StorageNotConfiguredError) {
      return NextResponse.json({ formError: STORAGE_DOWN }, { status: 503 });
    }
    console.error("[applications] could not save the application", error);
    return NextResponse.json(
      { formError: "The application could not be saved. Try again in a moment." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { id: submission.id, submitted_at: submission.submitted_at, application_number: submission.application_number ?? "" },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
