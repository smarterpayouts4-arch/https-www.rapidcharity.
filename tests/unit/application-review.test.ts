import assert from "node:assert/strict";
import test from "node:test";
import { assignExportCategory, schoolExportGroup, summaryKey } from "../../lib/application/exportCategory";
import { buildWorkbook, resolvedCategory } from "../../lib/application/excel";
import {
  applicationToSheetRow,
  formatMobileExport,
  formatRapidTerms,
  parentExport,
  siblingsExport,
} from "../../lib/application/excelRows";
import {
  extractCnicDigits,
  extractFeeAmount,
  feeWithinTolerance,
  imageStats,
  nameSimilarity,
  readImageSize,
  sniffType,
  textContainsName,
} from "../../lib/application/fileRules";
import { cityOptions, occupationOptions, programTitles, religionOptions, schoolOptions } from "../../lib/application/catalogs";
import { emptyChecks } from "../../lib/application/documents";
import { emptyApplication, emptyTerms } from "../../lib/application/empty";
import { buildSubmission } from "../../lib/application/record";
import { validateApplication } from "../../lib/application/schema";
import { inferProgramSelection, rankOptions, resolveTypedOption, SCHOOL_ALIASES, searchPrograms } from "../../lib/application/search";
import type { DocumentInput } from "../../lib/application/types";
import { createHash } from "node:crypto";

const fccu = "forman_christian_college_a_chartered_university_lahore";
const kc = "kinnaird_college_for_women_university_lahore";

test("typed catalog text resolves exact, close, and single matches", () => {
  assert.equal(resolveTypedOption("Christian", religionOptions)?.label, "Christianity");
  assert.equal(resolveTypedOption("Lahore", cityOptions)?.label, "Lahore");
  assert.equal(resolveTypedOption("lahor", cityOptions)?.label, "Lahore");
  assert.equal(resolveTypedOption("La", cityOptions), null);
  assert.equal(resolveTypedOption("Teach", occupationOptions)?.label, "Teacher");
  assert.equal(resolveTypedOption("not a real city", cityOptions), null);
});

test("search finds nursing programs, abbreviations, and one-character typos", () => {
  const nursing = searchPrograms("nurs", programTitles).map((item) => item.label);
  assert.ok(nursing.some((label) => /nurs|bsn/i.test(label)));
  assert.ok(nursing.length >= 3);
  const schools = rankOptions("fccu", schoolOptions, SCHOOL_ALIASES);
  assert.equal(schools[0]?.id, fccu);
  const typo = rankOptions("forman chirstain", schoolOptions, SCHOOL_ALIASES);
  assert.equal(typo[0]?.id, fccu);
  const kinnaird = rankOptions("kc", schoolOptions, SCHOOL_ALIASES);
  assert.equal(kinnaird[0]?.id, kc);
  assert.equal(inferProgramSelection("BSN Generic (4-year)")?.fieldId, "nursing");
});

test("export category follows sheet priority and keeps FCCU business on the FCCU sheet", () => {
  assert.equal(schoolExportGroup(fccu), "FCCU");
  assert.equal(schoolExportGroup(kc), "KC");
  assert.equal(
    assignExportCategory({ disability: "visual", institutionId: "allama_iqbal_open_university", fieldId: "nursing", levelId: "bachelor" }),
    "blind",
  );
  assert.equal(
    assignExportCategory({ disability: "none", institutionId: fccu, fieldId: "business_administration", levelId: "bachelor" }),
    "fccu",
  );
  assert.equal(summaryKey("fccu", "business_administration", "bachelor"), "fccu_bba");
  assert.equal(summaryKey("kc", "english", "bachelor"), "kc");
  assert.equal(
    assignExportCategory({ disability: "none", institutionId: "allama_iqbal_open_university", fieldId: "pharmacy", levelId: "professional" }),
    "post_grads",
  );
  assert.equal(
    assignExportCategory({ disability: "none", institutionId: "allama_iqbal_open_university", fieldId: "nursing", levelId: "bachelor" }),
    "nursing",
  );
  assert.equal(
    assignExportCategory({ disability: "none", institutionId: "allama_iqbal_open_university", fieldId: "business", levelId: "bachelor" }),
    "business",
  );
});

test("file checks catch type, fee tolerance, CNIC digits, and unreadable images", () => {
  const png = new Uint8Array(24);
  png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  new DataView(png.buffer).setUint32(16, 800);
  new DataView(png.buffer).setUint32(20, 600);
  assert.equal(sniffType(png), "image/png");
  assert.deepEqual(readImageSize(png, "image/png"), { width: 800, height: 600 });
  assert.equal(sniffType(Uint8Array.from([0xff, 0xd8, 0xff, 0x00])), "image/jpeg");
  assert.equal(sniffType(Uint8Array.from([0x50, 0x4b, 0x03, 0x04])), "reject");
  assert.equal(feeWithinTolerance(100000, 102000), true);
  assert.equal(feeWithinTolerance(100000, 103000), false);
  assert.equal(extractFeeAmount("Fee voucher total Rs. 120,000 due date"), 120000);
  assert.equal(extractCnicDigits("35202-9032439-2"), "3520290324392");
  assert.ok(nameSimilarity("Ayesha Khan", "Ayesha Khan") >= 0.85);
  assert.ok(textContainsName("Name Ayesha Khan Identity Card", "Ayesha Khan") >= 0.85);
  const flat = new Uint8ClampedArray(40 * 40 * 4).fill(10);
  assert.ok(imageStats({ data: flat, width: 40, height: 40 }).blur < 12);
});

test("excel rows use the review-sheet phrases", async () => {
  assert.equal(formatMobileExport("+923001234567"), "0300-1234567");
  assert.equal(formatRapidTerms(["Fall 2024", "Spring 2025", "Fall 2025", "Spring 2026"]), "Fall 2024, Spring-Fall 2025, Spring 2026");
  assert.equal(
    parentExport("Naeem Anwar", "Living", "Clerk", { amount: 43000, currency: "PKR", period: "month", value_state: "known" }),
    "Naeem Anwar Clerk 43K",
  );
  assert.equal(
    parentExport("Zarin", "Late", "", { amount: null, currency: "PKR", period: "month", value_state: "unknown" }),
    "Zarin Late",
  );
  assert.equal(
    siblingsExport({
      siblings_count: 3,
      siblings_studying_count: 2,
      siblings_working_count: 1,
      siblings_married_count: 0,
      siblings_other_count: 0,
    } as never),
    "3-2 studying, 1 working",
  );

  const input = emptyApplication("ivy-azariah");
  input.applicant_type = "new";
  input.first_name = "Ayesha";
  input.last_name = "Khan";
  input.full_name_as_on_cnic = "Ayesha Khan";
  input.date_of_birth = "2004-01-15";
  input.gender = "Female";
  input.disability = "none";
  input.marital_status = "Single";
  input.religion = { option_id: "christianity", other_text: "" };
  input.cnic = "35202-9032439-2";
  input.email = "ayesha@example.com";
  input.email_confirm = "ayesha@example.com";
  input.mobile_phone = "03001234567";
  input.address_line = "12 Church Road";
  input.city = { option_id: "lahore", other_text: "" };
  input.province = "Punjab";
  input.employment_status = "Yes";
  input.employment_job = "Tutor";
  input.employment_employer = "City School";
  input.father_name = "Naeem Anwar";
  input.mother_name = "Maryam";
  input.father_status = "Living";
  input.mother_status = "Living";
  input.father_occupation = { option_id: "teacher", other_text: "" };
  input.mother_occupation = { option_id: "homemaker", other_text: "" };
  input.father_monthly_income = { amount: 43000, currency: "PKR", period: "month", value_state: "known" };
  input.mother_monthly_income = { amount: 0, currency: "PKR", period: "month", value_state: "zero" };
  input.guardian_phone = "04235891234";
  input.siblings_count = 3;
  input.siblings_studying_count = 2;
  input.siblings_working_count = 1;
  input.siblings_married_count = 0;
  input.siblings_other_count = 0;
  input.current_institution = { option_id: fccu, other_text: "" };
  input.campus_city = { option_id: "lahore", other_text: "" };
  input.degree_level = { option_id: "bachelor", other_text: "" };
  input.field_of_study = { option_id: "english", other_text: "" };
  input.study_years = 4;
  input.completion_term = "Spring";
  input.completion_year = 2028;
  const terms = emptyTerms();
  terms[2] = { ...terms[2], unit: "semester", number: 5, status: "awaited", result: terms[2].result };
  terms[3] = { ...terms[3], unit: "semester", number: 6, status: "future" };
  terms[4] = { ...terms[4], unit: "semester", number: 7, status: "future" };
  input.terms = terms.map((term, index) => (index < 2 ? { ...term, status: "not_applicable" } : term));
  input.previous_institution = { option_id: "allama_iqbal_open_university", other_text: "" };
  input.previous_qualification = { option_id: "fsc_pre_medical", other_text: "" };
  input.previous_completion_year = 2022;
  input.fee = { amount: 120000, currency: "PKR", period: "semester", value_state: "known" };
  input.fee_due_date = "2026-11-01";
  input.rapid_received = "Never";
  input.other_financial_support = "Yes";
  input.support_provider = { option_id: "hec", other_text: "" };
  input.support_value_kind = "percent";
  input.support_percent = 25;
  input.heard_about = { option_id: "pastor_church", other_text: "" };
  input.church_name = "St Thomas";
  input.pastor_title = "Rev.";
  input.pastor_name = "Daniel";
  input.pastor_phone = "03001112233";
  input.faculty_ref_name = "Dr Sara";
  input.faculty_ref_designation = "Lecturer";
  input.faculty_ref_phone = "03011112222";
  input.faculty_ref_email = "sara@example.edu";
  input.family_ref_name = "Rahat";
  input.family_ref_relationship = { option_id: "brother", other_text: "" };
  input.family_ref_phone = "03012223333";
  input.attend_events = "Yes";
  const essay = "I want to finish my degree and serve patients in my city with steady care.";
  input.life_goal = essay;
  input.community_contribution = essay;
  input.plan_if_denied = essay;
  input.future_plan = essay;
  input.documents = ["photo", "cnic", "guardian_cnic", "admission_proof", "result", "fee_voucher", "pastor_letter", "other_award"].map(
    (slot): DocumentInput => ({
      slot,
      index: 1,
      storage: "local",
      file_id: slot,
      path: `spring-2027/test/${slot}-1.jpg`,
      url: "",
      mime: "image/jpeg",
      bytes: 2000,
      sha256: createHash("sha256").update(slot).digest("hex"),
      checks: { ...emptyChecks(), width: 900, height: 700 },
      reused: false,
    }),
  );
  input.consent_accepted = true;
  input.consent_name = "Ayesha Khan";
  const parsed = validateApplication(input, { now: new Date(Date.UTC(2026, 9, 16)) });
  assert.equal(parsed.ok, true, parsed.ok ? "" : JSON.stringify(parsed.fieldErrors));
  if (!parsed.ok) return;
  const stored = buildSubmission(parsed.data, { id: "sheet-1", submittedAt: "2026-10-16T12:00:00.000Z" });
  stored.review.workflow = "approved";
  stored.review.award_amount = 50000;
  stored.review.award_override = true;
  const row = applicationToSheetRow(stored, 1);
  assert.equal(row.female, true);
  assert.equal(row.values[1], "Ayesha Khan");
  assert.match(String(row.values[2]), /0300-1234567/);
  assert.match(String(row.values[5]), /Yes Tutor, City School/);
  assert.equal(row.values[6], "Naeem Anwar Teacher 43K");
  assert.equal(row.values[8], "3-2 studying, 1 working");
  assert.ok(row.yellowColumns.includes(6));
  assert.ok(row.yellowColumns.includes(26));
  assert.equal(resolvedCategory(stored), "fccu");
  const workbook = await buildWorkbook([stored], { usdRate: 278 });
  assert.ok(workbook.byteLength > 1000);
});
