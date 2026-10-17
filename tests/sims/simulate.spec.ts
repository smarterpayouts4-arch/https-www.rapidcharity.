/**
 * Mobile form simulations: synthetic applicants fill /apply/form through the UI (never the sample
 * chips) on several phone sizes, up to Review. A few submit into the local data/ store.
 * Run with: npm run test:sims (see playwright.sims.config.ts). Results land in SIM_OUT (one JSON per sim).
 */
import { expect, test, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { join } from "node:path";
import { buildApplicants, type Applicant, type Pick, type Upload } from "./applicants";

const OUT = process.env.SIM_OUT ?? join(process.cwd(), "qa/sims");
const FIX = join(process.cwd(), "tests/fixtures/sample-documents");
const ONLY = process.env.SIM_ONLY ? new Set(process.env.SIM_ONLY.split(",")) : null;
const APPLICANTS = buildApplicants(Number(process.env.SIM_COUNT ?? 52)).filter((item) => !ONLY || ONLY.has(item.id));

type Finding = { step: string; detail: string };
type Result = {
  id: string;
  scenario: string;
  device: string;
  viewport: string;
  slow3g: boolean;
  status: "pass" | "fail";
  error?: string;
  ms: number;
  steps: Array<{ step: string; ms: number; scrollHeight: number }>;
  validation: Array<{ step: string; text: string; expected: boolean }>;
  confusing: Finding[];
  overflow: Finding[];
  clipped: Finding[];
  smallTargets: Finding[];
  submitted: boolean;
  applicationNumber?: string;
};

const URDU = {
  need:
    "ہمارے گھر میں صرف والد کماتے ہیں اور ان کی آمدنی بہت کم ہے۔ فیس ادا کرنا ہمارے لیے ممکن نہیں۔ My father is a daily-wage worker and the fee for this semester is more than the whole family earns in two months.",
  essay: "میں تعلیم مکمل کر کے اپنے علاقے کے بچوں کو پڑھانا چاہتی ہوں۔ I want to teach children in my area after this degree.",
  address: "مکان نمبر 12، گلی نمبر 4، مسیحی بستی",
};
const NEED =
  "My father earns a small and irregular wage and my mother works in two houses. Rent, electricity and my younger siblings' school fees leave nothing for my semester fee.";
const ESSAY = "I want to finish this degree and use it to teach and serve children and families in my own neighbourhood.";

type FilePayload = { name: string; mimeType: string; buffer: Buffer };
const PDF_FIXTURE: Record<string, string> = {
  cnic: "admission-letter-sample.pdf",
  guardian_cnic: "income-proof-sample.pdf",
  admission_proof: "admission-letter-sample.pdf",
  result: "other-award-sample.pdf",
  education_proof: "other-award-sample.pdf",
  fee_voucher: "income-proof-sample.pdf",
  pastor_letter: "pastor-letter-sample.pdf",
  disability_certificate: "disability-certificate-sample.pdf",
  other_award: "other-award-sample.pdf",
};

/** A document photo with text unique to this applicant and slot, so the server's same-file check never trips. */
async function documentPhoto(tag: string, format: "jpeg" | "png"): Promise<FilePayload> {
  const lines = ["Islamic Republic of Pakistan", "SAMPLE DOCUMENT FOR TESTING", tag, `Generated ${tag.length * 37} ref`];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="#fff"/><rect x="36" y="36" width="1128" height="828" fill="none" stroke="#111" stroke-width="12"/>${lines
    .map((line, index) => `<text x="72" y="${150 + index * 90}" font-family="sans-serif" font-size="${index === 2 ? 60 : 44}" fill="#111">${line.replace(/[<&>]/g, "")}</text>`)
    .join("")}</svg>`;
  const image = sharp(Buffer.from(svg));
  const buffer = format === "jpeg" ? await image.jpeg({ quality: 80 }).toBuffer() : await image.png().toBuffer();
  return { name: `${tag.replace(/[^a-z0-9]+/gi, "-")}.${format === "jpeg" ? "jpg" : "png"}`, mimeType: `image/${format}`, buffer };
}

/** HEIC is used once per applicant (the fixture cannot be made unique); later HEIC picks fall back to JPEG. */
async function files(a: Applicant, kind: Upload, slot: string, used: Set<string>): Promise<Array<FilePayload | string>> {
  const tag = `${a.id} ${slot}`;
  if (kind === "heic" && !used.has("heic")) {
    used.add("heic");
    return [join(FIX, "phone-photo-sample.heic")];
  }
  if (kind === "pdf") {
    const base = readFileSync(join(FIX, PDF_FIXTURE[slot] ?? "pastor-letter-sample.pdf"));
    return [{ name: `${tag.replace(/\s+/g, "-")}.pdf`, mimeType: "application/pdf", buffer: Buffer.concat([base, Buffer.from(`\n% ${tag}\n`)]) }];
  }
  const format = kind === "png" ? "png" : "jpeg";
  if (slot === "cnic" || slot === "guardian_cnic") return [await documentPhoto(`${tag} front`, format), await documentPhoto(`${tag} back`, format)];
  return [await documentPhoto(tag, format)];
}

async function choose(page: Page | Locator, label: string, value: Pick) {
  const box = page.getByRole("combobox", { name: label, exact: true });
  await box.click();
  const root = "getByRole" in page && "context" in page ? page : (page as Locator).page();
  if ("other" in value) {
    await box.fill("zzzz not listed");
    await root.getByRole("option", { name: "Other (please specify)", exact: true }).click({ force: true });
    await page.getByRole("textbox", { name: `${label} other`, exact: true }).fill(value.other);
    return;
  }
  await box.fill(value.query);
  await root.getByRole("option", { name: value.option, exact: true }).click({ force: true });
  await expect(box).toHaveValue(value.option);
}

async function chip(scope: Page | Locator, group: string, answer: string) {
  const radio = scope.getByRole("group", { name: group, exact: true }).getByRole("radio", { name: answer, exact: true });
  await radio.check();
  await expect(radio).toBeChecked();
}

async function fill(scope: Page | Locator, label: string, value: string) {
  await scope.getByLabel(label, { exact: true }).fill(value);
}

/** Layout checks on the visible step: horizontal overflow, clipped text, tap targets under 44px. */
async function auditOnce(page: Page, result: Result, step: string) {
  // Let step transitions settle so mid-animation positions are not reported.
  await page.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => undefined))));
  const report = await page.evaluate(() => {
    const out = { overflow: [] as string[], clipped: [] as string[], small: [] as string[] };
    const vw = window.innerWidth;
    if (document.documentElement.scrollWidth > vw + 1) out.overflow.push(`page scrollWidth ${document.documentElement.scrollWidth} > ${vw}`);
    const form = document.querySelector("form");
    if (!form) return out;
    const visible = (el: Element) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none" && !el.closest("[hidden],[aria-hidden='true'],[data-testid='mock-tools']");
    };
    /** True when an ancestor scrolls or clips horizontally, so sticking out is by design (e.g. a swipe row). */
    const clippedByAncestor = (el: Element) => {
      for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
        const ox = getComputedStyle(node).overflowX;
        if (ox === "auto" || ox === "scroll" || ox === "hidden" || ox === "clip") return true;
      }
      return false;
    };
    /** Hit area including an absolutely positioned ::after used to enlarge small icon buttons. */
    const hitBox = (el: Element) => {
      const rect = el.getBoundingClientRect();
      const after = getComputedStyle(el, "::after");
      if (after.content !== "none" && after.position === "absolute") {
        const px = (value: string) => (value.endsWith("px") ? parseFloat(value) : 0);
        return {
          width: Math.max(rect.width, rect.width - px(after.left) - px(after.right)),
          height: Math.max(rect.height, rect.height - px(after.top) - px(after.bottom)),
        };
      }
      return { width: rect.width, height: rect.height };
    };
    const name = (el: Element) => `${el.tagName.toLowerCase()} "${(el.textContent || (el as HTMLInputElement).value || el.getAttribute("aria-label") || "").trim().slice(0, 40)}"`;
    for (const el of form.querySelectorAll("label, legend, button, h2, h3, h4, p, span, dt, dd, input, select, textarea")) {
      if (!visible(el)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.right > vw + 1 && !el.closest("[role='listbox']") && !clippedByAncestor(el)) out.overflow.push(`${name(el)} right edge ${Math.round(rect.right)} > ${vw}`);
      if (el instanceof HTMLSelectElement) {
        const canvas = document.createElement("canvas").getContext("2d");
        const style = getComputedStyle(el);
        if (canvas) {
          canvas.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          const text = el.selectedOptions[0]?.textContent ?? "";
          const room = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 18;
          if (canvas.measureText(text).width > room) out.clipped.push(`select "${text}" needs ${Math.round(canvas.measureText(text).width)}px, has ${Math.round(room)}px`);
        }
        continue;
      }
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) continue;
      const style = getComputedStyle(el);
      if ((style.overflow !== "visible" || style.textOverflow === "ellipsis" || style.whiteSpace === "nowrap") && el.scrollWidth > el.clientWidth + 1 && el.children.length === 0) {
        out.clipped.push(`${name(el)} scrollWidth ${el.scrollWidth} > ${el.clientWidth}`);
      }
    }
    const targets: Element[] = [];
    form.querySelectorAll("button, select, textarea, a[href]").forEach((el) => targets.push(el));
    form.querySelectorAll("input").forEach((el) => {
      const type = el.type;
      if (type === "hidden" || type === "file") return;
      if (type === "radio" || type === "checkbox") {
        const label = el.closest("label");
        targets.push(label ?? el);
        return;
      }
      targets.push(el);
    });
    for (const el of targets) {
      if (!visible(el) || el.closest("[class*='hp']")) continue;
      if (el.tagName === "A" && el.closest("p")) continue; // inline text link
      const box = hitBox(el);
      if (box.height < 43.5 || box.width < 43.5) out.small.push(`${name(el)}${el.getAttribute("aria-label") ? ` [${el.getAttribute("aria-label")}]` : ""} ${Math.round(box.width)}x${Math.round(box.height)}`);
    }
    if (out.overflow.length) {
      const card = form.getBoundingClientRect();
      const vv = window.visualViewport;
      out.overflow.unshift(`diag scrollX=${window.scrollX} innerWidth=${vw} clientWidth=${document.documentElement.clientWidth} vv=${vv?.width}x${vv?.scale}@${vv?.offsetLeft} form=${Math.round(card.left)}..${Math.round(card.right)} active=${document.activeElement?.tagName}`);
    }
    return out;
  });
  for (const detail of report.overflow) result.overflow.push({ step, detail });
  for (const detail of report.clipped) result.clipped.push({ step, detail });
  for (const detail of report.small) result.smallTargets.push({ step, detail });
}

/** Audit twice, 600ms apart: a step change can leave the card mid-animation for one frame. Only findings seen twice count. */
async function audit(page: Page, result: Result, step: string) {
  const first: Result = { ...result, overflow: [], clipped: [], smallTargets: [] };
  await auditOnce(page, first, step);
  if (!first.overflow.length && !first.clipped.length && !first.smallTargets.length) return;
  await page.waitForTimeout(600);
  const second: Result = { ...result, overflow: [], clipped: [], smallTargets: [] };
  await auditOnce(page, second, step);
  const keep = (list: Finding[], other: Finding[]) => list.filter((item) => other.some((o) => o.detail === item.detail));
  result.overflow.push(...keep(second.overflow, first.overflow));
  result.clipped.push(...keep(second.clipped, first.clipped));
  result.smallTargets.push(...keep(second.smallTargets, first.smallTargets));
}

async function next(page: Page, result: Result, step: string, heading: string, expected = false) {
  await audit(page, result, step);
  const started = Date.now();
  await page.getByRole("button", { name: /^(Continue|Back to review)$/ }).click();
  const target = page.getByRole("heading", { name: heading, level: 2 });
  const banner = page.locator("[data-form-issues]");
  await expect(target.or(banner).first()).toBeVisible({ timeout: 30_000 });
  if (await banner.isVisible()) {
    const text = (await banner.innerText()).replace(/\s+/g, " ").trim();
    result.validation.push({ step, text, expected });
    if (!expected) throw new Error(`Unexpected validation on ${step}: ${text}`);
    return false;
  }
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  result.steps.push({ step, ms: Date.now() - started, scrollHeight: height });
  return true;
}

async function upload(page: Page, selector: string, payload: Array<FilePayload | string>) {
  await page.locator(selector).setInputFiles(payload as never);
}

async function scholarshipStep(page: Page, a: Applicant) {
  // Applicants arrive from the scholarship page link (?scholarship=...), as on the live site.
  const label = a.maleTriesIvy || a.scholarship === "ivy-azariah" ? "Ivy Azariah" : a.scholarship === "robert-mathias" ? "Robert Mathias" : "John-Ivy Azariah";
  await expect(page.getByText(`Applying for: ${label}`)).toBeVisible();
  await page.getByRole("radio", { name: a.continuing ? "Continuing" : "New", exact: true }).check();
}

async function personalStep(page: Page, a: Applicant, result: Result) {
  if (a.continuing && a.slow3g) {
    await page.getByRole("checkbox", { name: "Passport photo is unchanged" }).check();
  } else {
    const photo = a.uploads[0] === "heic" ? "phone-photo-sample.heic" : a.uploads[0] === "png" ? "phone-photo-sample.png" : "passport-photo-sample.jpg";
    await upload(page, "#doc-photo", [join(FIX, photo)]);
    await expect(page.locator("[data-field='documents.photo']").getByText(/^Uploaded, \d+ KB$/)).toBeVisible({ timeout: 120_000 });
  }
  await fill(page, "First name", a.first);
  await fill(page, "Last name", a.last);
  await fill(page, "Full name as on CNIC", a.cnicName);
  const cnicBox = page.getByLabel("National ID (CNIC)", { exact: true });
  await cnicBox.pressSequentially(a.mistakes ? a.cnic.slice(0, 12) : a.cnic, { delay: 5 });
  if (!a.mistakes) await expect(cnicBox).toHaveValue(`${a.cnic.slice(0, 5)}-${a.cnic.slice(5, 12)}-${a.cnic.slice(12)}`);
  await fill(page, "Date of birth", a.dob);
  if (a.maleTriesIvy) {
    await expect(page.getByText("The Ivy Azariah Scholarship is for women.")).toBeVisible();
    await chip(page, "Gender", "Male");
    await expect(page.locator("[data-callout]")).toContainText("Ivy Azariah is for women students");
    await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeDisabled();
    result.validation.push({ step: "Personal", text: "Male on Ivy Azariah: Continue disabled, callout explains and offers Switch to John-Ivy Azariah", expected: true });
    await page.getByRole("button", { name: "Switch to John-Ivy Azariah" }).click();
    await expect(page.getByText("Applying for: John-Ivy Azariah")).toBeVisible();
    await expect(page.locator("[data-callout]")).toHaveCount(0);
  } else {
    await chip(page, "Gender", a.gender);
  }
  await choose(page, "Community", a.community);
  await chip(page, "Marital status", a.marital);
  if (a.spouse) {
    await fill(page, "Spouse name", a.spouse.name);
    await fill(page, "Spouse monthly income (PKR)", String(a.spouse.income));
  }
  await chip(page, "Disability", a.disability === "none" ? "No" : "Yes");
  if (a.disability !== "none") await chip(page, "Type of disability", a.disability);
  await fill(page, "Mobile number", a.mobile);
  if (a.alternate) await fill(page, "Alternate (optional)", a.alternate);
  await fill(page, "Email", a.email);
  await fill(page, "Confirm email", a.mistakes ? a.email.replace("@", "1@") : a.email);
  await fill(page, "Current address", a.urdu ? `${URDU.address}، ${a.address}` : a.address);
  await choose(page, "City or district", a.city);
  await page.getByLabel("Province", { exact: true }).selectOption(a.province);
  await chip(page, "Permanent address same as current?", a.permanent ? "No" : "Yes");
  if (a.permanent) await fill(page, "Permanent address", a.permanent);
  await chip(page, "Are you currently employed?", a.job ? "Yes" : "No");
  if (a.job) {
    await fill(page, "Job title", a.job.title);
    await fill(page, "Employer", a.job.employer);
  }
  if (a.mistakes) {
    const moved = await next(page, result, "Personal", "Family", true);
    expect(moved).toBe(false);
    const banner = await page.locator("[data-form-issues]").innerText();
    expect(banner).toContain("Email addresses do not match");
    expect(banner).toMatch(/13-digit CNIC/);
    await expect(page.getByLabel("Confirm email", { exact: true })).toBeFocused().catch(() => undefined);
    await page.getByLabel("National ID (CNIC)", { exact: true }).fill(a.cnic);
    await fill(page, "Confirm email", a.email);
  }
}

async function parent(page: Page, who: "Father" | "Mother", p: Applicant["father"]) {
  const scope = page.getByRole("region", { name: who, exact: true });
  await fill(scope, `${who}'s name`, p.name);
  await chip(scope, `${who}'s status`, p.status);
  if (p.status === "Late") {
    await expect(scope.getByLabel(new RegExp(`${who}'s monthly`))).toHaveCount(0);
    return;
  }
  if (p.status === "Retired" || p.status === "Unemployed") {
    await expect(scope.getByRole("combobox", { name: `${who}'s occupation` })).toHaveCount(0);
  } else if (p.occupation) {
    await choose(scope, `${who}'s occupation`, p.occupation);
  }
  const label = p.status === "Retired" ? `${who}'s monthly pension (PKR)` : `${who}'s monthly income (PKR)`;
  if (p.income === "unknown") {
    await scope.getByRole("checkbox", { name: "Unknown", exact: true }).check();
    await expect(scope.getByLabel(label, { exact: true })).toBeDisabled();
  } else {
    await fill(scope, label, String(p.income ?? 0));
    if ((p.income ?? 0) >= 1000) await expect(scope.getByLabel(label, { exact: true })).toHaveValue(/,/);
  }
}

async function familyStep(page: Page, a: Applicant) {
  await parent(page, "Father", a.father);
  await parent(page, "Mother", a.mother);
  if (a.guardian === "Husband") await expect(page.getByRole("group", { name: "Father / Husband / Guardian" }).getByRole("radio", { name: "Husband" })).toBeVisible();
  else if (a.marital !== "Married") await expect(page.getByRole("group", { name: "Father / Husband / Guardian" }).getByRole("radio", { name: "Husband" })).toHaveCount(0);
  await chip(page, "Father / Husband / Guardian", a.guardian);
  if (a.guardian === "Guardian") await fill(page, "Guardian name", a.guardianName ?? "");
  if (a.guardian === "Husband") await fill(page, "Husband's occupation", a.guardianOccupation ?? "");
  if (a.guardian === "Guardian") await fill(page, "Guardian occupation", a.guardianOccupation ?? "");
  await fill(page, "Guardian phone", a.guardianPhone);
  if (a.household) {
    await fill(page, "People at home", String(a.household.members));
    await fill(page, "Earning members", String(a.household.earning));
  }
  await fill(page, "Family monthly income (PKR)", String(a.familyIncome));
  if (a.house) await chip(page, "House (optional)", a.house);
  const [total, studying, working, married, other] = a.siblings;
  const counts = page.locator("[data-field='siblings']");
  for (const [label, value] of [["Siblings", total], ["Studying", studying], ["Working", working], ["Married", married], ["Other", other]] as const) {
    await counts.getByRole("textbox", { name: label, exact: true }).fill(String(value));
  }
}

async function academicsStep(page: Page, a: Applicant, used: Set<string>) {
  const rows = page.getByTestId("education-row");
  for (let index = 0; index < a.education.length; index += 1) {
    const edu = a.education[index]!;
    if (index > 0) await page.getByRole("button", { name: "Add another qualification" }).click();
    const row = rows.nth(index);
    await row.getByLabel("Qualification", { exact: true }).selectOption(edu.qualification);
    if (edu.qualification === "other") await row.getByLabel("Qualification name").fill(edu.otherName ?? "Diploma");
    await row.getByLabel("Institution", { exact: true }).fill(edu.institution);
    await row.getByLabel("Board or university").fill(edu.board);
    await row.getByRole("radio", { name: edu.status, exact: true }).check();
    if (edu.result) await row.getByLabel(/^Result/).fill(edu.result);
    await row.getByLabel(edu.status === "In progress" ? "Expected year" : "Year", { exact: true }).fill(edu.year);
    if (index === 0 && a.uploads[1]) {
      await row.locator("input[type='file']").setInputFiles((await files(a, a.uploads[1], "education_proof", used)) as never);
      await expect(row.getByText(/Proof uploaded/)).toBeVisible({ timeout: 120_000 });
    }
  }
  if (a.education.length > 1) {
    // Earlier rows fold into a one-line summary once complete.
    await expect(rows.first()).toHaveAttribute("data-folded", "true");
  }
  await choose(page, "Current institution", a.institution);
  await choose(page, "Campus city", a.campusCity);
  const program = page.getByRole("combobox", { name: "Program title" });
  await program.click();
  await program.fill(a.program);
  const option = page.getByRole("option", { name: a.program, exact: true });
  if (await option.count()) await option.first().click({ force: true });
  await choose(page, "Degree level", a.level);
  await choose(page, "Field of study", a.field);
  if (a.nursing) await page.getByRole("group", { name: "Nursing track", exact: true }).getByRole("radio", { name: new RegExp(`^${a.nursing}`) }).check();
  await fill(page, "Years of study", a.studyYears);
  await chip(page, "Completion term", a.completion.term);
  await fill(page, "Completion year", a.completion.year);
  await page.getByLabel("Current semester", { exact: true }).selectOption(a.semester);
  if (a.gpa && (await page.getByLabel("Current GPA", { exact: true }).count())) {
    await fill(page, "Current GPA", a.gpa.value);
    await chip(page, "Out of", a.gpa.scale);
  }
  for (const [term, number] of [["Spring 2026", "2"], ["Fall 2026", "3"], ["Spring 2027", "4"]] as const) {
    const group = page.getByRole("group", { name: term, exact: true });
    await group.getByLabel("Progress unit").selectOption("semester");
    await group.getByLabel("Number").fill(number);
    await group.getByLabel("Result status").selectOption(term === "Spring 2026" ? "declared" : "awaited");
    if (term === "Spring 2026") {
      await chip(group, "Result type", "CGPA");
      await group.getByRole("textbox", { name: "CGPA", exact: true }).fill("3.1");
    }
  }
  for (const [term, number] of [["Fall 2027", "5"], ["Spring 2028", "6"]] as const) {
    await page.getByRole("group", { name: new RegExp(term) }).getByLabel("Number").fill(number);
  }
  await choose(page, "Previous institution", a.prevInstitution);
  await choose(page, "Previous qualification", a.prevQualification);
  await fill(page, "Previous completion year", a.prevYear);
  await fill(page, "Term fee (PKR)", a.fee);
  await fill(page, "Amount requested (PKR)", a.requested);
  await expect(page.getByLabel("Amount requested (PKR)", { exact: true })).toHaveValue(Number(a.requested).toLocaleString("en-US"));
  await fill(page, "Fee due date", a.dueDate);
}

async function supportStep(page: Page, a: Applicant) {
  if (a.continuing) {
    await chip(page, "Received a RAPID scholarship before?", "Yes");
    await page.getByRole("checkbox", { name: "Fall 2025", exact: true }).check();
    await fill(page, "Amount received (PKR)", "30000");
  } else {
    await chip(page, "Received a RAPID scholarship before?", "No");
  }
  await chip(page, "Receiving any other scholarship?", a.otherScholarship ? "Yes" : "No");
  if (a.otherScholarship) {
    await choose(page, "Provider", a.otherScholarship.provider);
    await chip(page, "Support value", "Percent");
    await page.getByRole("textbox", { name: "Percent", exact: true }).fill(a.otherScholarship.percent);
  }
  await choose(page, "How did you hear about Rapid?", a.heard);
  await fill(page, "Church or place of worship", a.church);
  await page.getByLabel("Title", { exact: true }).selectOption(a.pastorTitle);
  await fill(page, "Priest or pastor name", a.pastorName);
  await fill(page, "Priest or pastor phone", a.guardianPhone);
  await fill(page, "Faculty name", a.faculty.name);
  await fill(page, "Designation", a.faculty.designation);
  await fill(page, "Faculty phone", "0301 0000001");
  await fill(page, "Faculty email", a.faculty.email);
  await fill(page, "Family reference name", a.familyRef.name);
  await choose(page, "Relationship", a.familyRef.relation);
  await fill(page, "Reference phone", "0302 0000002");
  await chip(page, "Can you attend Rapid events?", a.attend);
}

async function essaysStep(page: Page, a: Applicant) {
  await fill(page, "Statement of financial need", a.urdu ? URDU.need : NEED);
  for (const label of ["What is your life goal?", "How will you contribute to your community?", "What is your plan if this scholarship is not awarded?", "What is your plan after this program?"]) {
    await fill(page, label, a.urdu ? URDU.essay : ESSAY);
  }
}

async function documentsStep(page: Page, a: Applicant, used: Set<string>) {
  const required = ["cnic", "guardian_cnic", "admission_proof", "result", "fee_voucher", "pastor_letter"];
  if (a.disability !== "none") required.push("disability_certificate");
  if (a.otherScholarship) required.push("other_award");
  let slots = required;
  if (a.continuing) {
    await page.getByRole("checkbox", { name: "My CNIC or B-Form is unchanged" }).check();
    await page.getByRole("checkbox", { name: "Father or guardian document is unchanged" }).check();
    slots = required.filter((slot) => slot !== "cnic" && slot !== "guardian_cnic");
  }
  for (const [index, slot] of slots.entries()) {
    const kind = a.uploads[index % a.uploads.length] as Upload;
    await upload(page, `#doc-${slot}`, await files(a, kind, slot, used));
  }
  for (const slot of slots) {
    await expect(page.locator(`[data-field="documents.${slot}"]`).getByText(/Uploaded|Result \d/).first()).toBeVisible({ timeout: 180_000 });
  }
}

async function openContext(browser: import("@playwright/test").Browser, a: Applicant): Promise<BrowserContext> {
  return browser.newContext({
    viewport: { width: a.device.width, height: a.device.height },
    deviceScaleFactor: 2,
    isMobile: a.device.mobile,
    hasTouch: a.device.mobile,
    userAgent: a.device.width >= 768
      ? "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
      : "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36",
  });
}

test.describe.configure({ mode: "parallel", timeout: 600_000 });

for (const a of APPLICANTS) {
  test(`${a.id}: ${a.scenario}`, async ({ browser }) => {
    const context = await openContext(browser, a);
    const page = await context.newPage();
    const errors: string[] = [];
    const used = new Set<string>();
    page.on("pageerror", (error) => errors.push(error.message));
    if (a.slow3g) {
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 });
    }
    const result: Result = {
      id: a.id,
      scenario: a.scenario,
      device: a.device.name,
      viewport: `${a.device.width}x${a.device.height}`,
      slow3g: a.slow3g,
      status: "fail",
      ms: 0,
      steps: [],
      validation: [],
      confusing: [],
      overflow: [],
      clipped: [],
      smallTargets: [],
      submitted: false,
    };
    const started = Date.now();
    try {
      await page.goto(`/apply/form?scholarship=${a.maleTriesIvy ? "ivy-azariah" : a.scholarship}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await expect(page.locator("form[data-hydrated='true']")).toBeVisible({ timeout: 120_000 });
      await scholarshipStep(page, a);
      await next(page, result, "Scholarship", "Personal");
      await personalStep(page, a, result);
      await next(page, result, "Personal", "Family");
      await familyStep(page, a);
      await next(page, result, "Family", "Academics");
      if (a.refreshResume) {
        await page.waitForTimeout(1500);
        await page.reload({ waitUntil: "domcontentloaded" });
        await expect(page.locator("form[data-hydrated='true']")).toBeVisible({ timeout: 120_000 });
        await page.getByRole("button", { name: "Resume", exact: true }).click();
        await expect(page.getByRole("heading", { name: "Academics", level: 2 })).toBeVisible();
      }
      await academicsStep(page, a, used);
      await next(page, result, "Academics", "Support");
      await supportStep(page, a);
      if (a.backEdit) {
        await page.getByRole("button", { name: "Back", exact: true }).click();
        await page.getByRole("button", { name: "Back", exact: true }).click();
        await expect(page.getByRole("heading", { name: "Family", level: 2 })).toBeVisible();
        await expect(page.getByLabel("Family monthly income (PKR)", { exact: true })).toHaveValue(a.familyIncome.toLocaleString("en-US"));
        await fill(page, "Family monthly income (PKR)", String(a.familyIncome + 1500));
        await next(page, result, "Family (edit)", "Academics");
        await next(page, result, "Academics (again)", "Support");
        await expect(page.getByLabel("Priest or pastor name", { exact: true })).toHaveValue(a.pastorName);
      }
      await next(page, result, "Support", "Essays");
      await essaysStep(page, a);
      await next(page, result, "Essays", "Documents");
      await documentsStep(page, a, used);
      await next(page, result, "Documents", "Review");
      await audit(page, result, "Review");
      await expect(page.getByText(a.first, { exact: false }).first()).toBeVisible();
      if (a.backEdit) {
        await page.locator("article").filter({ has: page.getByRole("heading", { name: "Family", level: 3 }) }).getByRole("button", { name: "Edit" }).click();
        await expect(page.getByRole("heading", { name: "Family", level: 2 })).toBeVisible();
        await next(page, result, "Family (from review)", "Review");
      }
      await page.getByRole("checkbox", { name: "I agree" }).check();
      await fill(page, "Type your full name", `${a.first} ${a.last}`);
      if (a.submit) {
        await page.getByRole("button", { name: "Submit application" }).click();
        await expect(page.getByRole("heading", { name: "Application received" })).toBeVisible({ timeout: 120_000 });
        result.submitted = true;
        result.applicationNumber = (await page.locator("[class*='ref']").first().innerText()).trim();
      }
      if (errors.length) result.confusing.push({ step: "page", detail: `Page errors: ${errors.join(" | ")}` });
      result.status = errors.length ? "fail" : "pass";
      if (errors.length) result.error = errors.join(" | ");
    } catch (error) {
      result.error = error instanceof Error ? error.message.split("\n").slice(0, 6).join(" ") : String(error);
      const heading = await page.locator("h2").first().textContent().catch(() => "");
      mkdirSync(join(OUT, "failures"), { recursive: true });
      await page.screenshot({ path: join(OUT, "failures", `${a.id}.png`), fullPage: true }).catch(() => undefined);
      const text = await page.locator("form").innerText().catch(() => "");
      writeFileSync(join(OUT, "failures", `${a.id}.txt`), text);
      result.confusing.push({ step: heading ?? "", detail: "Failed here; see failures screenshot" });
    } finally {
      result.ms = Date.now() - started;
      mkdirSync(OUT, { recursive: true });
      writeFileSync(join(OUT, `${a.id}.json`), JSON.stringify(result, null, 2));
      await context.close();
    }
    expect(result.status, result.error).toBe("pass");
  });
}
