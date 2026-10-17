import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { submissionsToCsv } from "../../lib/application/csv";
import { emptyChecks } from "../../lib/application/documents";
import { emptyApplication, emptyTerms } from "../../lib/application/empty";
import { isBusinessField } from "../../lib/application/eligibility";
import { decodeFirestore, encodeFirestore } from "../../lib/application/firestoreValues";
import { isInvalidMapping, parseMappingCsv } from "../../lib/application/mapping";
import {
  ageInYears,
  formatCnic,
  isPakistanMobile,
  normalizeCnic,
  normalizePhone,
  parseMoneyPhrase,
  parseResultPhrase,
} from "../../lib/application/normalize";
import { buildSubmission } from "../../lib/application/record";
import { validateApplication } from "../../lib/application/schema";
import { DuplicateCnicError, saveSubmission } from "../../lib/application/store";
import type { ApplicationInput, DocumentInput } from "../../lib/application/types";

const now = new Date(Date.UTC(2026, 9, 16));
const essay = "I want to finish my degree and serve patients in my city with steady care.";

function stubDocument(slot: string, index = 1): DocumentInput {
  return {
    slot,
    index,
    storage: "local",
    file_id: slot,
    path: `spring-2027/test/${slot}-${index}.jpg`,
    url: "",
    mime: "image/jpeg",
    bytes: 2000,
    sha256: createHash("sha256").update(`${slot}-${index}`).digest("hex"),
    checks: { ...emptyChecks(), width: 900, height: 700, blur_score: 120, brightness: 140 },
    reused: false,
  };
}

function validTerms() {
  const terms = emptyTerms();
  terms[0] = { ...terms[0], status: "not_applicable" };
  terms[1] = { ...terms[1], status: "not_applicable" };
  terms[2] = {
    ...terms[2],
    unit: "semester",
    number: 3,
    status: "declared",
    result: { type: "CGPA", value: 3.5, max: 4, grade: "" },
  };
  terms[3] = { ...terms[3], unit: "semester", number: 4, status: "future" };
  terms[4] = { ...terms[4], unit: "semester", number: 5, status: "future" };
  return terms;
}

function filled(patch: Partial<ApplicationInput> = {}): ApplicationInput {
  const base = emptyApplication("ivy-azariah");
  base.applicant_type = "new";
  base.first_name = "Ayesha";
  base.last_name = "Khan";
  base.full_name_as_on_cnic = "Ayesha Khan";
  base.date_of_birth = "2004-01-15";
  base.gender = "Female";
  base.marital_status = "Single";
  base.religion = { option_id: "christianity", other_text: "" };
  base.cnic = "35202-9032439-2";
  base.email = "ayesha@example.com";
  base.email_confirm = "Ayesha@Example.com";
  base.mobile_phone = "0300-1234567";
  base.address_line = "12 Church Road";
  base.city = { option_id: "lahore", other_text: "" };
  base.province = "Punjab";
  base.disability = "none";
  base.employment_status = "No";
  base.father_name = "Imran Khan";
  base.mother_name = "Sana Khan";
  base.father_status = "Living";
  base.mother_status = "Living";
  base.father_occupation = { option_id: "teacher", other_text: "" };
  base.mother_occupation = { option_id: "homemaker", other_text: "" };
  base.father_monthly_income = { amount: 0, currency: "PKR", period: "month", value_state: "zero" };
  base.mother_monthly_income = { amount: null, currency: "PKR", period: "month", value_state: "unknown" };
  base.guardian_phone = "042-35891234";
  base.siblings_count = 0;
  base.siblings_studying_count = 0;
  base.siblings_working_count = 0;
  base.siblings_married_count = 0;
  base.siblings_other_count = 0;
  base.current_institution = { option_id: "allama_iqbal_open_university", other_text: "" };
  base.campus_city = { option_id: "lahore", other_text: "" };
  base.degree_level = { option_id: "bachelor", other_text: "" };
  base.field_of_study = { option_id: "english", other_text: "" };
  base.study_years = 4;
  base.completion_term = "Spring";
  base.completion_year = 2028;
  base.terms = validTerms();
  base.previous_institution = { option_id: "allama_iqbal_open_university", other_text: "" };
  base.previous_qualification = { option_id: "fsc_pre_medical", other_text: "" };
  base.previous_completion_year = 2022;
  base.fee = { amount: 120000, currency: "PKR", period: "semester", value_state: "known" };
  base.fee_due_date = "2026-11-01";
  base.rapid_received = "Never";
  base.pastor_title = "Pastor";
  base.other_financial_support = "No";
  base.heard_about = { option_id: "pastor_church", other_text: "" };
  base.church_name = "St Thomas Church";
  base.pastor_name = "Rev Daniel";
  base.pastor_phone = "+92 300 1112233";
  base.faculty_ref_name = "Dr Sara";
  base.faculty_ref_designation = "Lecturer";
  base.faculty_ref_phone = "03011112222";
  base.faculty_ref_email = "sara@example.edu";
  base.family_ref_name = "Imran Khan";
  base.family_ref_relationship = { option_id: "father", other_text: "" };
  base.family_ref_phone = "03012223333";
  base.family_ref_email = "imran@example.com";
  base.attend_events = "Yes";
  base.life_goal = essay;
  base.community_contribution = essay;
  base.plan_if_denied = essay;
  base.future_plan = essay;
  base.documents = ["photo", "cnic", "guardian_cnic", "admission_proof", "result", "fee_voucher", "pastor_letter"].map((slot) =>
    stubDocument(slot),
  );
  base.consent_accepted = true;
  base.consent_name = "Ayesha Khan";
  return { ...base, ...patch };
}

function e164(input: string): string {
  const parsed = normalizePhone(input);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return "";
  return parsed.e164;
}

test("phones, CNIC, money, and results normalize without treating blanks as zero", () => {
  assert.equal(e164("0333-5700016"), "+923335700016");
  assert.equal(e164("+92 3234707418"), "+923234707418");
  assert.equal(e164("923370401062"), "+923370401062");
  const stripped = e164("3244651072");
  assert.equal(stripped, "+923244651072");
  assert.equal(isPakistanMobile(stripped), true);
  assert.equal(e164("(055) 3893266"), "+92553893266");
  assert.equal(e164("0333-5700016 / 042-1234567"), "+923335700016");
  assert.equal(normalizeCnic("35202-9032439-2").digits, "3520290324392");
  assert.equal(formatCnic("3520290324392"), "35202-9032439-2");
  assert.equal(parseMoneyPhrase("").value_state, "unknown");
  assert.equal(parseMoneyPhrase("").amount, null);
  assert.equal(parseMoneyPhrase("35 thousand").amount, 35000);
  assert.equal(parseMoneyPhrase("2 lack and 75 thousand").amount, 275000);
  assert.equal(parseMoneyPhrase("PKR.0").value_state, "zero");
  assert.equal(parseMoneyPhrase("Zero").amount, 0);
  assert.equal(parseMoneyPhrase("No income").value_state, "zero");
  assert.equal(parseMoneyPhrase("Rs.347,500").amount, 347500);
  const pounds = parseMoneyPhrase("£20,000/year");
  assert.equal(pounds.amount, 20000);
  assert.equal(pounds.currency, "GBP");
  assert.equal(pounds.period, "year");
  const dollars = parseMoneyPhrase("$20,000/year");
  assert.equal(dollars.currency, "USD");
  assert.equal(dollars.period, "year");
  const gpa = parseResultPhrase("3.62 gpa");
  assert.equal(gpa.type, "CGPA");
  assert.equal(gpa.value, 3.62);
  assert.equal(gpa.max, null);
  const marks = parseResultPhrase("613/1100");
  assert.equal(marks.type, "Marks");
  assert.equal(marks.value, 613);
  assert.equal(marks.max, 1100);
  assert.equal(parseResultPhrase("A").type, "Grade");
  assert.equal(parseResultPhrase("545").ambiguous, true);
  assert.equal(ageInYears("2012-10-16", now), 14);
  assert.equal(ageInYears("2012-10-17", now), 13);
  assert.equal(ageInYears("1966-10-16", now), 60);
  assert.equal(ageInYears("1965-10-16", now), 61);
});

test("application schema enforces consent, email, spouse, siblings, and scholarship rules", () => {
  const ok = validateApplication(filled(), { now });
  assert.equal(ok.ok, true);
  if (!ok.ok) return;
  const stored = buildSubmission(ok.data, { id: "app-1", submittedAt: "2026-10-16T12:00:00.000Z" });
  assert.equal(stored.mobile_phone, "+923001234567");
  assert.equal(stored.mobile_phone_raw, "0300-1234567");
  assert.equal(stored.cnic, "3520290324392");
  assert.equal(stored.mother_monthly_income.value_state, "unknown");
  assert.equal(stored.mother_monthly_income.amount, null);
  assert.equal(stored.father_monthly_income.amount, 0);
  assert.equal(stored.cycle, "spring-2027");
  assert.equal(stored.review.status, "clear");
  assert.equal("email_confirm" in stored, false);

  const blankIncome = validateApplication(emptyApplication(), { now });
  assert.equal(blankIncome.ok, false);
  if (!blankIncome.ok) {
    assert.match(blankIncome.fieldErrors["father_monthly_income.amount"] ?? "", /blank is not zero/i);
    assert.match(blankIncome.fieldErrors.consent_accepted ?? "", /Consent/);
  }

  const mismatch = validateApplication(filled({ email_confirm: "other@example.com" }), { now });
  assert.equal(mismatch.ok, false);
  if (!mismatch.ok) assert.match(mismatch.fieldErrors.email_confirm ?? "", /do not match/i);

  const married = validateApplication(filled({ marital_status: "Married", spouse_name: "" }), { now });
  assert.equal(married.ok, false);
  if (!married.ok) assert.ok(married.fieldErrors.spouse_name);

  const siblings = validateApplication(filled({ siblings_count: 1, siblings_studying_count: 2 }), { now });
  assert.equal(siblings.ok, false);

  const robert = validateApplication(
    filled({ scholarship: "robert-mathias", gender: "Male", field_of_study: { option_id: "english", other_text: "" } }),
    { now },
  );
  assert.equal(robert.ok, false);
  const robertBusiness = validateApplication(
    filled({
      scholarship: "robert-mathias",
      gender: "Male",
      field_of_study: { option_id: "business_administration", other_text: "" },
    }),
    { now },
  );
  assert.equal(robertBusiness.ok, true);
  const johnBusiness = validateApplication(
    filled({ scholarship: "john-ivy-azariah", field_of_study: { option_id: "business", other_text: "" } }),
    { now },
  );
  assert.equal(johnBusiness.ok, false);
  const ivyMale = validateApplication(filled({ gender: "Male" }), { now });
  assert.equal(ivyMale.ok, false);
  assert.equal(isBusinessField("human_resource_management"), true);
  assert.equal(isBusinessField("nursing"), false);

  const otherSchool = validateApplication(
    filled({
      current_institution: { option_id: "other", other_text: "City Grammar School" },
    }),
    { now },
  );
  assert.equal(otherSchool.ok, true);
  if (otherSchool.ok) {
    const queued = buildSubmission(otherSchool.data, { id: "app-2", submittedAt: "2026-10-16T12:00:00.000Z" });
    assert.equal(queued.review.status, "needs_review");
    assert.equal(queued.current_institution.other_text, "City Grammar School");
    const csv = submissionsToCsv([queued]);
    assert.match(csv.split("\n")[0] ?? "", /religion_other_text/);
    assert.match(csv, /City Grammar School/);
    assert.match(csv, /3520290324392/);
  }
});

test("mapping files keep raw values and mark junk answers invalid", () => {
  const present = parseMappingCsv(readFileSync("data/application/mapping-present-institution.csv", "utf8"));
  const cecos = present.find((row) => row.raw_value === "cecos university");
  assert.equal(cecos?.canonical, "CECOS University of IT and Emerging Sciences, Peshawar");
  const nill = present.find((row) => row.raw_value === "Nill");
  assert.equal(isInvalidMapping(nill!), true);
  const previous = parseMappingCsv(readFileSync("data/application/mapping-previous-institution.csv", "utf8"));
  assert.equal(previous.find((row) => row.raw_value === "none")?.canonical, "(none / invalid answer)");
  const degrees = parseMappingCsv(readFileSync("data/application/mapping-degree-program.csv", "utf8"));
  for (const raw of ["3.3", "Yes", "Nill"]) {
    const row = degrees.find((item) => item.raw_value === raw);
    assert.equal(row?.field_of_study, "(none / invalid answer)");
  }
  const nursing = degrees.find((row) => row.raw_value === "Bachelor of science in nursing");
  assert.equal(nursing?.field_of_study, "Nursing");
  assert.equal(nursing?.canonical_program, "BSN Generic (4-year)");
});

test("firestore values round-trip named fields", () => {
  const original = {
    cnic: "3520290324392",
    amount: 0,
    note: null,
    flags: [true, false],
    income: { amount: null, value_state: "unknown" },
  };
  const decoded = decodeFirestore(encodeFirestore(original));
  assert.deepEqual(decoded, original);
});

test("the same file may be uploaded again into the same slot", () => {
  const sameSlot = filled();
  const photo = sameSlot.documents.find((item) => item.slot === "photo");
  assert.ok(photo);
  sameSlot.documents = [...sameSlot.documents, { ...photo, index: 2 }];
  const kept = validateApplication(sameSlot, { now });
  if (!kept.ok) {
    const messages = Object.values(kept.fieldErrors).join(" ");
    assert.equal(messages.includes("same file"), false, messages);
  }

  const across = filled();
  const source = across.documents.find((item) => item.slot === "photo");
  assert.ok(source);
  across.documents = across.documents.map((item) => (item.slot === "cnic" ? { ...item, sha256: source.sha256 } : item));
  const flagged = validateApplication(across, { now });
  assert.equal(flagged.ok, false);
  if (!flagged.ok) {
    assert.match(Object.values(flagged.fieldErrors).join(" "), /same file as another slot/);
  }
});

test("a CNIC can be stored once per cycle", async () => {
  const parsed = validateApplication(filled({ cnic: "35202-6552614-2" }), { now });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const submission = buildSubmission(parsed.data, { id: "unit-cnic-1", submittedAt: "2026-10-16T12:00:00.000Z" });
  const file = path.join("data/submissions", `${submission.id}.json`);
  const key = path.join("data/submissions/keys", submission.cycle_cnic);
  try {
    await saveSubmission(submission);
    await assert.rejects(
      () => saveSubmission({ ...submission, id: "unit-cnic-2" }),
      DuplicateCnicError,
    );
  } finally {
    await rm(file, { force: true });
    await rm(key, { force: true });
  }
});
