import assert from "node:assert/strict";
import test from "node:test";
import { submissionsToPortalCsv } from "../../lib/application/csv";
import { applyDecision } from "../../lib/application/decision";
import { emptyChecks, requiredDocumentSlots } from "../../lib/application/documents";
import { MAX_PHOTO_BYTES, PHOTO_MAX_SIDE } from "../../lib/application/fileRules";
import { MOCK_APPLICATIONS } from "../../lib/application/mocks";
import {
  applicationSequence,
  formatApplicationNumber,
  migrateWorkflow,
  nextApplicationSequence,
  normalizeStored,
  PORTAL_CSV_HEADERS,
  portalRow,
  sessionCode,
  sessionName,
} from "../../lib/application/portal";
import { buildSubmission } from "../../lib/application/record";
import { LOCAL_SAMPLE_PREFIX, isLocalSampleDocument } from "../../lib/application/sampleDocuments";
import { validateApplication } from "../../lib/application/schema";
import type { ApplicationInput, DocumentInput, StoredApplication } from "../../lib/application/types";

/** The header line of the portal's export_applications.csv (headers only, no rows). */
const PORTAL_HEADER_LINE =
  '"Application Number","Applicant Name","Father / Guardian",CNIC,Gender,Community,"Mobile Number","Family Monthly Income",Scholarship,"Academic Session","Current Institution","Degree Program","Current Semester","Current GPA","GPA Scale","Amount Requested","Religious Leader","Religious Leader Contact",Status,"Submitted On","Reviewed On","Reviewed By",Remarks,"Rejection Reason"';

function doc(slot: string, index = 1, patch: Partial<DocumentInput> = {}): DocumentInput {
  return {
    slot,
    index,
    storage: "local",
    file_id: `${slot}-${index}`,
    path: `sample/${slot}-${index}.jpg`,
    url: "",
    mime: "image/jpeg",
    bytes: 120_000,
    sha256: `${slot}${index}`.padEnd(64, "0").replace(/[^0-9a-f]/g, "a"),
    checks: emptyChecks(),
    reused: false,
    ...patch,
  };
}

function input(id: string): ApplicationInput {
  const mock = MOCK_APPLICATIONS.find((item) => item.id === id);
  assert.ok(mock);
  const data = structuredClone(mock.data);
  return { ...data, client_id: crypto.randomUUID(), documents: requiredDocumentSlots(data).map((slot) => doc(slot)) };
}

function stored(id = "john-ivy", number = "RAPID-SP2027-000001"): StoredApplication {
  const parsed = validateApplication(input(id));
  assert.equal(parsed.ok, true, parsed.ok ? "" : JSON.stringify(parsed.fieldErrors));
  if (!parsed.ok) throw new Error("invalid");
  return buildSubmission(parsed.data, { id: `unit-${id}`, submittedAt: "2026-10-16T07:05:00.000Z", cycle: "spring-2027", applicationNumber: number });
}

test("session is derived from the admin cycle", () => {
  assert.equal(sessionCode("spring-2027"), "SP2027");
  assert.equal(sessionName("spring-2027"), "Spring 2027");
  assert.equal(sessionCode("fall-2026"), "FA2026");
  assert.equal(sessionCode("summer"), "");
});

test("application numbers are RAPID-<SESSION>-000001 and unique across sessions", () => {
  assert.equal(formatApplicationNumber("spring-2027", 1), "RAPID-SP2027-000001");
  assert.equal(formatApplicationNumber("fall-2027", 42), "RAPID-FA2027-000042");
  assert.equal(applicationSequence("RAPID-FA2026-000013"), 13);
  assert.equal(applicationSequence("RAPID-SP2027-13"), null);
  // The sequence is global: a new session continues after the highest number of any session.
  assert.equal(nextApplicationSequence(["RAPID-FA2026-000013", "RAPID-SP2027-000002", undefined, ""]), 14);
  assert.equal(nextApplicationSequence([]), 1);
  assert.throws(() => formatApplicationNumber("bad", 1));
  assert.throws(() => formatApplicationNumber("spring-2027", 0));
});

test("old statuses migrate to portal statuses and stay readable", () => {
  assert.deepEqual(migrateWorkflow("incomplete"), { workflow: "under_review", legacy: "incomplete" });
  assert.deepEqual(migrateWorkflow("did_not_reapply"), { workflow: "withdrawn", legacy: "did_not_reapply" });
  assert.deepEqual(migrateWorkflow("pass_out"), { workflow: "closed", legacy: "pass_out" });
  assert.deepEqual(migrateWorkflow("approved"), { workflow: "approved", legacy: "" });
  assert.deepEqual(migrateWorkflow(undefined), { workflow: "submitted", legacy: "" });

  const old = stored();
  const legacy = { ...old, review: { ...old.review, workflow: "pass_out" as never, history: undefined, legacy_workflow: undefined } };
  const normalized = normalizeStored(legacy);
  assert.equal(normalized.review.workflow, "closed");
  assert.equal(normalized.review.legacy_workflow, "pass_out");
  assert.ok((normalized.review.history ?? []).length >= 1);
});

test("decisions require an approved amount or a rejection reason, and keep history", () => {
  const base = stored();
  base.documents = base.documents.map((item) => ({ ...item, review_state: "verified" }));
  assert.throws(() => applyDecision(base, { workflow: "approved", approved_amount: null, author: "admin" }), /approved scholarship amount/);
  assert.throws(() => applyDecision(base, { workflow: "rejected", rejection_reason: " ", author: "admin" }), /rejection reason/);
  assert.throws(() => applyDecision(base, { workflow: "pending", author: "admin" }), /Choose a status/);

  const review = applyDecision(base, { workflow: "under_review", author: "admin", at: "2026-10-17T05:00:00.000Z" });
  const approved = applyDecision(review, { workflow: "approved", approved_amount: 55000, remarks: "Fee checked.", author: "admin", at: "2026-10-17T06:00:00.000Z" });
  assert.equal(approved.review.workflow, "approved");
  assert.equal(approved.review.award_amount, 55000);
  assert.deepEqual(
    (approved.review.history ?? []).map((item) => item.to),
    ["submitted", "under_review", "approved"],
  );
  assert.equal(approved.review.remarks.at(-1)?.text, "Fee checked.");

  const rejected = applyDecision(base, { workflow: "rejected", rejection_reason: "Income above the limit.", author: "admin" });
  assert.equal(rejected.review.rejection_reason, "Income above the limit.");
});

test("portal CSV keeps the portal header line and column order", () => {
  const csv = submissionsToPortalCsv([stored()]);
  const [header, row] = csv.replace(/^\uFEFF/, "").split(/\r?\n/);
  assert.equal(header, PORTAL_HEADER_LINE);
  assert.equal(PORTAL_CSV_HEADERS.length, 24);
  assert.ok(row?.startsWith("RAPID-SP2027-000001,"), row);
});

test("portal rows fix the portal export bugs", () => {
  const application = stored("ivy", "RAPID-SP2027-000002");
  const row = portalRow(application);
  assert.equal(row["Application Number"], "RAPID-SP2027-000002");
  assert.match(row.CNIC, /^\d{5}-\d{7}-\d$/);
  assert.match(row["Mobile Number"], /^03\d{9}$/);
  assert.equal(row["Academic Session"], "Spring 2027");
  assert.equal(row["Father / Guardian"], "Samuel Khan");
  assert.equal(row.Community, "Christian");
  assert.equal(row["GPA Scale"], "4.00");
  assert.equal(row["Submitted On"], "2026-10-16 12:05");
  // No reviewer yet, and a rejection reason only appears on a rejected application.
  assert.equal(row["Reviewed On"], "");
  assert.equal(row["Rejection Reason"], "");
});

test("the photo is limited to a 600 px, 500 KB JPEG or PNG", () => {
  assert.equal(PHOTO_MAX_SIDE, 600);
  assert.equal(MAX_PHOTO_BYTES, 500 * 1024);
  const big = input("ivy");
  big.documents = big.documents.map((item) => (item.slot === "photo" ? { ...item, bytes: MAX_PHOTO_BYTES + 1 } : item));
  const tooBig = validateApplication(big);
  assert.equal(tooBig.ok, false);
  if (!tooBig.ok) assert.ok(tooBig.fieldErrors["documents.photo"]);
  const pdf = input("ivy");
  pdf.documents = pdf.documents.map((item) => (item.slot === "photo" ? { ...item, mime: "application/pdf" } : item));
  assert.equal(validateApplication(pdf).ok, false);
});

test("sample files attached without storage are marked and never count as uploaded", () => {
  const local = doc("cnic", 1, { file_id: `${LOCAL_SAMPLE_PREFIX}cnic-1`, path: "" });
  assert.equal(isLocalSampleDocument(local), true);
  assert.equal(isLocalSampleDocument(doc("cnic")), false);
});
