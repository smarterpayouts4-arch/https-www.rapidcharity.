import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  acceptanceError,
  closeBatchRecord,
  cycleLabel,
  openBatch,
  purgeAllowed,
} from "../../lib/application/batches";
import { rememberFile } from "../../lib/application/blobStore";
import { emptyChecks } from "../../lib/application/documents";
import { emptyApplication, emptyTerms } from "../../lib/application/empty";
import { buildSubmission } from "../../lib/application/record";
import { validateApplication } from "../../lib/application/schema";
import {
  BatchClosedError,
  closeBatch,
  getSubmission,
  listBatches,
  markBatchExported,
  purgeBatch,
  saveSubmission,
  updateApplicationReview,
} from "../../lib/application/store";
import type { ApplicationInput } from "../../lib/application/types";

const cycle = "fall-2099";
const batchesFile = path.join("data/submissions/batches.json");

async function forgetBatch(): Promise<void> {
  try {
    const parsed = JSON.parse(await readFile(batchesFile, "utf8")) as { batches?: { cycle: string }[] };
    const batches = (parsed.batches ?? []).filter((item) => item.cycle !== cycle);
    await writeFile(batchesFile, `${JSON.stringify({ batches }, null, 2)}\n`);
  } catch {
    await rm(batchesFile, { force: true });
  }
}

test("a batch cannot be purged until it is closed and the final export is newer", () => {
  const open = openBatch("spring-2027");
  assert.equal(cycleLabel(open.cycle), "Spring 2027");
  assert.equal(purgeAllowed(open), "Close the batch before archiving it.");
  const closed = closeBatchRecord(open, "2026-10-16T00:00:00.000Z");
  assert.equal(purgeAllowed(closed), "Download the final Excel export after closing the batch.");
  assert.match(acceptanceError(closed) ?? "", /closed/);
  assert.equal(acceptanceError(open), null);
});

test("archive and purge deletes one batch from local files and keeps the next batch out", async () => {
  const parsed = validateApplication(applicationFor(), { now: new Date(Date.UTC(2026, 9, 16)) });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const submission = buildSubmission(parsed.data, {
    id: "11111111-1111-4111-8111-111111111111",
    submittedAt: "2026-10-16T12:00:00.000Z",
  });
  submission.cycle = cycle;
  submission.cycle_cnic = `${cycle}_3520290324392`;
  const relative = `${cycle}/${submission.id}/photo-1.jpg`;
  submission.documents = submission.documents.map((document) => ({
    ...document,
    path: `${cycle}/${submission.id}/${document.slot}-${document.index}.jpg`,
    file_id: `${cycle}/${submission.id}/${document.slot}-${document.index}.jpg`,
    storage: "local",
  }));
  const full = path.join("data/uploads", relative);
  await forgetBatch();
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, Buffer.from([0xff, 0xd8, 0xff, 0xd8]));
  await rememberFile({
    sha256: submission.documents[0].sha256,
    applicationId: submission.id,
    slot: "photo",
    index: 1,
    path: relative,
    mime: "image/jpeg",
    bytes: 4,
    provider: "local",
    fileId: relative,
    url: "",
  });
  try {
    await saveSubmission(submission);
    await closeBatch(cycle, "2026-10-16T18:00:00.000Z");
    await assert.rejects(saveSubmission({ ...submission, id: "22222222-2222-4222-8222-222222222222" }), BatchClosedError);
    await assert.rejects(purgeBatch(cycle, cycle), /final Excel/);
    await markBatchExported(cycle, "2026-10-16T18:05:00.000Z");
    await updateApplicationReview(submission.id, { action: "remark", author: "local-admin", text: "Fee checked against the voucher." });
    await assert.rejects(purgeBatch(cycle, cycle), /final Excel/);
    await markBatchExported(cycle, "2026-10-16T18:10:00.000Z");
    await assert.rejects(purgeBatch(cycle, "spring-2027"), /batch id/);
    const result = await purgeBatch(cycle, cycle);
    assert.equal(result.submissions, 1);
    assert.ok(result.files >= 1);
    assert.equal(await getSubmission(submission.id), null);
    await assert.rejects(readFile(full));
    await assert.rejects(saveSubmission(submission), BatchClosedError);
    const stored = (await listBatches()).find((item) => item.cycle === cycle);
    assert.equal(stored?.status, "purged");
    assert.equal(stored?.purged_submissions, 1);
  } finally {
    await rm(path.join("data/submissions", `${submission.id}.json`), { force: true });
    await rm(path.join("data/submissions/keys", submission.cycle_cnic), { force: true });
    await rm(path.join("data/uploads", cycle), { recursive: true, force: true });
  }
});

function applicationFor(): ApplicationInput {
  const essay = "I want to finish my degree and serve patients in my city with steady care.";
  const terms = emptyTerms();
  terms[0] = { ...terms[0], status: "not_applicable" };
  terms[1] = { ...terms[1], status: "not_applicable" };
  terms[2] = { ...terms[2], unit: "semester", number: 3, status: "declared", result: { type: "CGPA", value: 3.5, max: 4, grade: "" } };
  terms[3] = { ...terms[3], unit: "semester", number: 4, status: "future" };
  terms[4] = { ...terms[4], unit: "semester", number: 5, status: "future" };
  const base = emptyApplication("ivy-azariah");
  return {
    ...base,
    applicant_type: "new",
    first_name: "Ayesha",
    last_name: "Khan",
    full_name_as_on_cnic: "Ayesha Khan",
    date_of_birth: "2004-01-15",
    gender: "Female",
    marital_status: "Single",
    religion: { option_id: "christianity", other_text: "" },
    cnic: "35202-9032439-2",
    email: "ayesha@example.com",
    email_confirm: "ayesha@example.com",
    mobile_phone: "0300-1234567",
    address_line: "12 Church Road",
    city: { option_id: "lahore", other_text: "" },
    province: "Punjab",
    disability: "none",
    employment_status: "No",
    father_name: "Imran Khan",
    mother_name: "Sana Khan",
    father_status: "Living",
    mother_status: "Living",
    father_occupation: { option_id: "teacher", other_text: "" },
    mother_occupation: { option_id: "homemaker", other_text: "" },
    father_monthly_income: { amount: 0, currency: "PKR", period: "month", value_state: "zero" },
    mother_monthly_income: { amount: null, currency: "PKR", period: "month", value_state: "unknown" },
    guardian_phone: "042-35891234",
    siblings_count: 0,
    siblings_studying_count: 0,
    siblings_working_count: 0,
    siblings_married_count: 0,
    siblings_other_count: 0,
    current_institution: { option_id: "allama_iqbal_open_university", other_text: "" },
    campus_city: { option_id: "lahore", other_text: "" },
    degree_level: { option_id: "bachelor", other_text: "" },
    field_of_study: { option_id: "english", other_text: "" },
    study_years: 4,
    completion_term: "Spring",
    completion_year: 2028,
    terms,
    previous_institution: { option_id: "allama_iqbal_open_university", other_text: "" },
    previous_qualification: { option_id: "fsc_pre_medical", other_text: "" },
    previous_completion_year: 2022,
    fee: { amount: 120000, currency: "PKR", period: "semester", value_state: "known" },
    fee_due_date: "2026-11-01",
    rapid_received: "Never",
    pastor_title: "Pastor",
    other_financial_support: "No",
    heard_about: { option_id: "pastor_church", other_text: "" },
    church_name: "St Thomas Church",
    pastor_name: "Rev Daniel",
    pastor_phone: "+92 300 1112233",
    faculty_ref_name: "Dr Sara",
    faculty_ref_designation: "Lecturer",
    faculty_ref_phone: "03011112222",
    faculty_ref_email: "sara@example.edu",
    family_ref_name: "Imran Khan",
    family_ref_relationship: { option_id: "father", other_text: "" },
    family_ref_phone: "03012223333",
    family_ref_email: "imran@example.com",
    attend_events: "Yes",
    life_goal: essay,
    community_contribution: essay,
    plan_if_denied: essay,
    future_plan: essay,
    documents: ["photo", "cnic", "guardian_cnic", "admission_proof", "result", "fee_voucher", "pastor_letter"].map((slot) => ({
      slot,
      index: 1,
      storage: "local" as const,
      file_id: slot,
      path: `spring-2027/test/${slot}-1.jpg`,
      url: "",
      mime: "image/jpeg",
      bytes: 2000,
      sha256: createHash("sha256").update(slot).digest("hex"),
      checks: { ...emptyChecks(), width: 900, height: 700, blur_score: 120, brightness: 140 },
      reused: false,
    })),
    consent_accepted: true,
    consent_name: "Ayesha Khan",
  };
}
