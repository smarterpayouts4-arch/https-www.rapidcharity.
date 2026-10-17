import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const WIDTHS = [390, 1440] as const;
const SHOTS = join(process.cwd(), "qa/apply-flow-shots");
const ESSAY =
  "I want to finish this degree and use the training to teach and care for people in my neighborhood.";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (window.sessionStorage.getItem("rapid-test-ready")) return;
    window.localStorage.clear();
    window.sessionStorage.setItem("rapid-test-ready", "1");
  });
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(error.message));
  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error" || text.includes("Image with src")) problems.push(text);
  });
  (page as Page & { __problems?: string[] }).__problems = problems;
});

test.afterEach(async ({ page }) => {
  const problems = (page as Page & { __problems?: string[] }).__problems ?? [];
  expect(problems, problems.join("\n")).toEqual([]);
});

function stamp() {
  return `${Date.now().toString().slice(-7)}${Math.floor(Math.random() * 90 + 10)}`;
}

async function documentImage(page: Page, token: string) {
  const dataUrl = await page.evaluate((label) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 900;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 1200, 900);
    context.strokeStyle = "#111111";
    context.lineWidth = 12;
    context.strokeRect(36, 36, 1128, 828);
    context.fillStyle = "#111111";
    context.font = "bold 54px sans-serif";
    context.fillText(label, 72, 140);
    context.font = "36px sans-serif";
    const lines = [
      "Islamic Republic of Pakistan",
      "CNIC NADRA B-Form identity",
      "Fee voucher challan payable 85000",
      "Semester result GPA grade transcript",
      "Church recommendation from the pastor, sincerely",
    ];
    lines.forEach((line, index) => context.fillText(line, 72, 230 + index * 64));
    for (let index = 0; index < label.length + 24; index += 1) {
      const x = 72 + ((label.charCodeAt(index % label.length) * 17 + index * 29) % 980);
      context.fillRect(x, 620 + (index % 8) * 28, 14, 70);
    }
    return canvas.toDataURL("image/png");
  }, token);
  const base64 = dataUrl.split(",")[1] ?? "";
  return {
    name: `${token.replace(/[^a-z0-9]+/gi, "-").slice(0, 40)}.png`,
    mimeType: "image/png",
    buffer: Buffer.from(base64, "base64"),
  };
}

async function shot(page: Page, width: number, name: string) {
  mkdirSync(join(SHOTS, String(width)), { recursive: true });
  await page.screenshot({ path: join(SHOTS, String(width), `${name}.png`), fullPage: false });
}

async function pick(page: Page, label: string, query: string, option: string) {
  const box = page.getByRole("combobox", { name: label });
  await box.click();
  await box.fill(query);
  await page.getByRole("option", { name: option, exact: true }).click({ force: true });
}

async function pickOther(page: Page, label: string, text: string) {
  const box = page.getByRole("combobox", { name: label });
  await box.click();
  await box.fill("zzzz-not-listed");
  await page.getByRole("option", { name: "Other (please specify)", exact: true }).click({ force: true });
  await page.getByRole("textbox", { name: `${label} other` }).fill(text);
}

async function continueTo(page: Page, heading: string) {
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: heading, level: 2 })).toBeVisible();
}

async function personal(page: Page, person: { first: string; last: string; email: string; cnic: string; phone: string; gender: "Female" | "Male" }) {
  await page.getByLabel("First name").fill(person.first);
  await page.getByLabel("Last name").fill(person.last);
  await page.getByLabel("Full name as on CNIC").fill(`${person.first} ${person.last}`);
  await page.getByLabel("Date of birth").fill("2004-04-12");
  await page.getByRole("radio", { name: person.gender, exact: true }).check();
  await page.getByRole("radio", { name: "None", exact: true }).check();
  await page.getByRole("radio", { name: "Single", exact: true }).check();
  await pick(page, "Religion", "Christ", "Christianity");
  await page.getByLabel("CNIC", { exact: true }).fill(person.cnic);
  await page.getByLabel("Email", { exact: true }).fill(person.email);
  await page.getByLabel("Confirm email").fill(person.email);
  await page.getByLabel("Mobile phone").fill(person.phone);
  await page.getByLabel("Home address").fill("12 Church Road");
  await pick(page, "City", "Lahore", "Lahore");
  await page.getByLabel("Province").selectOption("Punjab");
  await page.getByRole("radio", { name: "No", exact: true }).check();
}

async function family(page: Page, phone: string) {
  await page.getByLabel("Father's name").fill("Yousaf Masih");
  await page.getByRole("radio", { name: "Living", exact: true }).first().check();
  await pick(page, "Father's occupation", "Teach", "Teacher");
  await page.getByLabel("Father's monthly income (PKR)").fill("20000");
  await page.getByLabel("Mother's name").fill("Sara Masih");
  await page.getByRole("radio", { name: "Living" }).nth(1).check();
  await pick(page, "Mother's occupation", "Home", "Homemaker");
  await page.getByLabel("Mother's monthly income (PKR)").fill("0");
  await page.getByLabel("Guardian phone").fill(phone);
  await page.getByLabel("Siblings, excluding yourself").fill("0");
  await page.getByLabel("Studying").fill("0");
  await page.getByLabel("Working").fill("0");
  await page.getByLabel("Married").fill("0");
  await page.getByLabel("Other", { exact: true }).fill("0");
}

async function academics(page: Page, field: { query: string; option: string }, other = false) {
  if (other) {
    await pickOther(page, "Current institution", "Neighborhood College");
    await pickOther(page, "Degree level", "Bridge year");
    await pickOther(page, "Field of study", "Community health");
  } else {
    await pick(page, "Current institution", "Kinnaird", "Kinnaird College for Women University, Lahore");
    await pick(page, "Degree level", "Bachelor", "Bachelor's (BS / BA / BSc / BBA / B.Ed)");
    await pick(page, "Field of study", field.query, field.option);
  }
  await pick(page, "Campus city", "Lahore", "Lahore");
  if (field.option === "Nursing") {
    await page.getByRole("radio", { name: /Generic BSN/ }).check();
  }
  await page.getByLabel("Period of study (years)").fill("4");
  await page.getByLabel("Completion term").selectOption("Spring");
  await page.getByRole("textbox", { name: "Completion year", exact: true }).fill("2028");
  for (const [term, number] of [["Spring 2026", "2"], ["Fall 2026", "3"], ["Spring 2027", "4"]] as const) {
    const group = page.getByRole("group", { name: term });
    await group.getByLabel("Progress unit").selectOption("semester");
    await group.getByLabel("Number").fill(number);
    await group.getByLabel("Result status").selectOption("awaited");
  }
  for (const [term, number] of [["Fall 2027", "5"], ["Spring 2028", "6"]] as const) {
    const group = page.getByRole("group", { name: new RegExp(term) });
    await group.getByLabel("Number").fill(number);
  }
  await pick(page, "Previous institution", "Forman", "Forman Christian College (A Chartered University), Lahore");
  await pick(page, "Previous qualification", "FSc", "FSc Pre-Medical");
  await page.getByLabel("Previous completion year").fill("2022");
  await page.getByLabel("Fee for the upcoming term (PKR)").fill("85000");
  await page.getByLabel("Fee due date").fill("2026-11-15");
}

async function support(page: Page, continuing: boolean, phone: string) {
  if (continuing) {
    await page.getByRole("radio", { name: /Yes, in these terms/ }).check();
    await page.getByRole("checkbox", { name: "Fall 2025" }).check();
    await page.getByLabel("Amount received (PKR)").fill("40000");
  } else {
    await page.getByRole("radio", { name: "Never", exact: true }).check();
  }
  await page.getByRole("group", { name: "Any other scholarship" }).getByLabel("No").check();
  await pick(page, "How did you hear about Rapid?", "Web", "Website");
  await page.getByLabel("Church or place of worship").fill("St Andrew Church");
  await page.getByLabel("Pastor or priest title").selectOption("Pastor");
  await page.getByLabel("Pastor or priest name").fill("Pastor Daniel");
  await page.getByLabel("Pastor phone").fill(phone);
  await page.getByLabel("Faculty reference name").fill("Dr Hina");
  await page.getByLabel("Faculty designation").fill("Lecturer");
  await page.getByLabel("Faculty phone").fill(phone);
  await page.getByLabel("Faculty email").fill("hina@example.com");
  await page.getByLabel("Family reference name").fill("Uncle Riaz");
  await pick(page, "Relationship", "Uncle", "Uncle");
  await page.getByLabel("Family reference phone").fill(phone);
  await page.getByRole("group", { name: "Can you attend Rapid events?" }).getByLabel("Yes").check();
}

async function essays(page: Page) {
  await page.getByLabel("What is your life goal?").fill(ESSAY);
  await page.getByLabel("How will you contribute to your community?").fill(ESSAY);
  await page.getByLabel("What is your plan if this scholarship is not awarded?").fill(ESSAY);
  await page.getByLabel("What is your plan after this program?").fill(ESSAY);
}

async function documents(page: Page, id: string, reuse: boolean) {
  if (reuse) {
    await page.getByRole("checkbox", { name: "Passport photo is unchanged" }).check();
    await page.getByRole("checkbox", { name: "My CNIC or B-Form is unchanged" }).check();
    await page.getByRole("checkbox", { name: "Father or guardian document is unchanged" }).check();
  }
  const slots = reuse
    ? ["admission_proof", "result", "fee_voucher", "pastor_letter"]
    : ["photo", "cnic", "guardian_cnic", "admission_proof", "result", "fee_voucher", "pastor_letter"];
  const files = [];
  for (const slot of slots) {
    files.push({ slot, file: await documentImage(page, `${id} ${slot} document`) });
  }
  for (const { slot, file } of files) {
    await page.locator(`#doc-${slot}`).setInputFiles(file);
  }
  for (const slot of slots) {
    await expect(page.locator(`[data-field="documents.${slot}"]`).getByText(/Uploaded|Result \d/)).toBeVisible({
      timeout: 90000,
    });
  }
}

async function openForm(page: Page, width: number, scholarship: string) {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
  await page.goto(`/apply?scholarship=${scholarship}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("form[data-hydrated='true']")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Scholarship application" })).toBeVisible();
}

async function throughEssays(page: Page, opts: {
  continuing: boolean;
  gender: "Female" | "Male";
  field: { query: string; option: string };
  other?: boolean;
  id: string;
  stop?: "academics";
  capture?: (step: string) => Promise<void>;
}) {
  const phone = `0300${opts.id.slice(0, 7)}`;
  const guardian = `+92${phone.slice(1)}`;
  await page.getByRole("radio", { name: opts.continuing ? /^Continuing/ : /^New$/ }).check();
  await continueTo(page, "Personal");
  await personal(page, {
    first: "Amina",
    last: "Masih",
    email: `${opts.id}@example.com`,
    cnic: `35202${opts.id.slice(0, 8)}`,
    phone,
    gender: opts.gender,
  });
  await opts.capture?.("02-personal");
  if (opts.gender === "Male") return;
  await continueTo(page, "Family");
  await family(page, guardian);
  await opts.capture?.("03-family");
  await continueTo(page, "Academics");
  await academics(page, opts.field, opts.other);
  await opts.capture?.("04-academics");
  if (opts.stop === "academics") return;
  await continueTo(page, "Support");
  await support(page, opts.continuing, guardian);
  await opts.capture?.("05-support");
  await continueTo(page, "Essays");
  await essays(page);
}

test.describe.configure({ timeout: 90_000 });

test("home mobile keeps news and programs to about four compact cards", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const news = page.locator("section:has(#news-heading)");
  await expect(news.locator("article:visible")).toHaveCount(4);
  await expect(news.getByRole("link", { name: "See all" })).toBeVisible();
  const programs = page.locator("section:has(#scholarships-heading)");
  await expect(programs.getByRole("link", { name: "See all" })).toBeVisible();
  const cards = programs.locator("article:visible");
  await expect(cards).toHaveCount(3);
  const box = await cards.first().boundingBox();
  expect(box?.height ?? 999).toBeLessThan(160);
});

test("robert mathais page leads with eligibility bullets and a short deadline", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/robert-mathais-scholarship", { waitUntil: "domcontentloaded" });
  const list = page.getByRole("list").filter({ hasText: "studying business" });
  await expect(list.getByRole("listitem")).toHaveCount(3);
  await expect(list.getByText("Only students studying business are eligible to apply.")).toBeVisible();
  const deadline = page.locator("dd").filter({ hasText: "Spring 2027:" });
  await expect(deadline).toHaveText("Spring 2027: 15 October 2026. Fall 2027: 15 April 2027.");
  await expect(page.getByText("The last date of submitting")).toHaveCount(0);
});

test("type-ahead commits an exact match on tab and offers other", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/apply/form?scholarship=john-ivy-azariah", { waitUntil: "domcontentloaded" });
  await expect(page.locator("form[data-hydrated='true']")).toBeVisible();
  await page.getByRole("radio", { name: /^New$/ }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Personal", level: 2 })).toBeVisible();
  const religion = page.getByRole("combobox", { name: "Religion" });
  await religion.fill("christianity");
  await religion.press("Tab");
  await expect(religion).toHaveValue("Christianity");
  const city = page.getByRole("combobox", { name: "City" });
  await city.fill("Lahore");
  await city.press("Tab");
  await expect(city).toHaveValue("Lahore");
  await page.getByRole("button", { name: "Continue" }).click();
  const alert = page.locator("[data-form-issues]");
  await expect(alert).toBeVisible();
  await expect(alert).not.toContainText("Choose a religion.");
  await expect(alert).not.toContainText("Choose a city.");
  await page.getByLabel("First name").fill("Amina");
  await page.getByLabel("Last name").fill("Masih");
  await page.getByLabel("Full name as on CNIC").fill("Amina Masih");
  await page.getByLabel("Date of birth").fill("2004-04-12");
  await page.getByRole("radio", { name: "Female", exact: true }).check();
  await page.getByRole("radio", { name: "None", exact: true }).check();
  await page.getByRole("radio", { name: "Single", exact: true }).check();
  await page.getByLabel("CNIC", { exact: true }).fill("3520290324392");
  await page.getByLabel("Email", { exact: true }).fill("tab-match@example.com");
  await page.getByLabel("Confirm email").fill("tab-match@example.com");
  await page.getByLabel("Mobile phone").fill("03001234567");
  await page.getByLabel("Home address").fill("12 Church Road");
  await page.getByLabel("Province").selectOption("Punjab");
  await page.getByRole("radio", { name: "No", exact: true }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Family", level: 2 })).toBeVisible();
  const occupation = page.getByRole("combobox", { name: "Father's occupation" });
  await occupation.fill("Teach");
  await occupation.press("Tab");
  await expect(occupation).toHaveValue("Teacher");
  const mother = page.getByRole("combobox", { name: "Mother's occupation" });
  await mother.fill("Not a listed job");
  await mother.press("Enter");
  await expect(page.getByRole("textbox", { name: "Mother's occupation other" })).toHaveValue("Not a listed job");
});

test("home images do not warn about the logo or news photos", async ({ page }) => {
  for (const width of [1440, 1000, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("img", { name: "RAPID Charity logo" }).first()).toBeVisible();
    await expect(page.getByRole("img", { name: /Get-Together 2025/ }).first()).toBeVisible();
  }
});

test.describe("scholarship pages", () => {
  test("ivy story keeps the original wording behind the summary", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/ivy-azariah-scholarship", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Who it's for")).toBeVisible();
    await expect(page.getByText("Eligibility")).toBeVisible();
    await expect(page.getByText("Deadline")).toBeVisible();
    const story = page.getByText("Read the full story");
    await story.click();
    await expect(page.getByText("Granddaughter of Ivy Azariah")).toBeVisible();
    await shot(page, 390, "ivy-scholarship-story");
  });
});

for (const width of WIDTHS) {
  test.describe(`apply ${width}`, () => {
    test("deep link hides the picker and the mobile step list", async ({ page }) => {
      await openForm(page, width, "ivy-azariah");
      await expect(page.getByText("Applying for: Ivy Azariah")).toBeVisible();
      await expect(page.getByRole("radio", { name: /^Ivy Azariah/ })).toHaveCount(0);
      const steps = page.locator("aside ol");
      if (width < 900) await expect(steps).toBeHidden();
      else await expect(steps).toBeVisible();
      if (width < 900) await expect(page.getByText("Step 1 of 8 · Scholarship")).toBeVisible();
      else await expect(page.getByText("Step 1 of 8 · Scholarship")).toBeHidden();
      await page.getByRole("button", { name: "Continue" }).click();
      const alert = page.locator("[data-form-issues]");
      await expect(alert).toContainText("New or Continuing applicant");
      await expect(alert).toContainText("Choose New or Continuing.");
      await expect(page.getByText("Fix the highlighted fields")).toHaveCount(0);
      await expect(page.getByRole("radio", { name: /^New/ })).toBeFocused();
      await shot(page, width, "inline-field-error");
      await page.getByRole("button", { name: "Change" }).click();
      await expect(page.getByRole("radio", { name: /^Ivy Azariah/ })).toBeChecked();
      await shot(page, width, "step-01-scholarship-change");
    });

    test("ivy male is blocked with a switch to John-Ivy", async ({ page }) => {
      await openForm(page, width, "ivy-azariah");
      await page.getByRole("radio", { name: "New", exact: true }).check();
      await continueTo(page, "Personal");
      await page.getByRole("radio", { name: "Male", exact: true }).check();
      await expect(page.locator("[data-callout]")).toContainText("Gender:");
      await expect(page.locator("[data-callout]")).toContainText("Ivy Azariah is for women students.");
      await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
      await shot(page, width, "invalid-ivy-male");
      await page.getByRole("button", { name: "Switch to John-Ivy Azariah" }).click();
      await expect(page.getByText("Applying for: John-Ivy Azariah")).toBeVisible();
      await expect(page.getByText("Ivy Azariah is for women students.")).toHaveCount(0);
    });

    test("robert mathias rejects a non-business field immediately", async ({ page }) => {
      const id = stamp();
      await openForm(page, width, "robert-mathias");
      await throughEssays(page, { continuing: false, gender: "Female", field: { query: "Nurs", option: "Nursing" }, id, stop: "academics" });
      await expect(page.getByRole("heading", { name: "Academics", level: 2 })).toBeVisible();
      await expect(page.locator("[data-callout]")).toContainText("Field of study:");
      await expect(page.locator("[data-callout]")).toContainText("Robert Mathias is for business fields only.");
      await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
      await shot(page, width, "invalid-robert-nursing");
      await page.getByRole("button", { name: "Switch to John-Ivy Azariah" }).click();
      await expect(page.getByText("Applying for: John-Ivy Azariah")).toBeVisible();
    });

    test("missing documents stay on the documents step", async ({ page }) => {
      const id = stamp();
      await openForm(page, width, "john-ivy-azariah");
      await throughEssays(page, { continuing: false, gender: "Female", field: { query: "Nurs", option: "Nursing" }, id });
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(page.getByRole("heading", { name: "Documents", level: 2 })).toBeVisible();
      await page.getByRole("button", { name: "Continue" }).click();
      const alert = page.locator("[data-form-issues]");
      await expect(alert).toContainText("Passport photo");
      await expect(alert).toContainText("Upload your passport photo.");
      await expect(alert).toContainText("Upload your CNIC or B-Form, front and back.");
      await expect(page.locator("[data-field='documents.photo'] [data-focus]")).toBeFocused();
      await expect(page.getByRole("heading", { name: "Documents", level: 2 })).toBeVisible();
      const photo = await documentImage(page, `${id} photo passport`);
      await page.locator("#doc-photo").setInputFiles(photo);
      await expect(page.locator("[data-field='documents.photo']").getByText(/Uploaded/)).toBeVisible({ timeout: 30000 });
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(alert).toContainText("Upload your CNIC or B-Form, front and back.");
      await expect(alert).not.toContainText("Upload cnic.");
      await expect(page.locator("[data-field='documents.cnic'] [data-focus]")).toBeFocused();
      await shot(page, width, "invalid-missing-docs");
    });

    test("other school and degree must be specified, then continue", async ({ page }) => {
      const id = stamp();
      await openForm(page, width, "ivy-azariah");
      await page.getByRole("radio", { name: "New", exact: true }).check();
      await continueTo(page, "Personal");
      await personal(page, {
        first: "Hanna",
        last: "Bibi",
        email: `${id}@example.com`,
        cnic: `35202${id.slice(0, 8)}`,
        phone: `0300${id.slice(0, 7)}`,
        gender: "Female",
      });
      await continueTo(page, "Family");
      await family(page, `+92${`0300${id.slice(0, 7)}`.slice(1)}`);
      await continueTo(page, "Academics");
      const school = page.getByRole("combobox", { name: "Current institution" });
      await school.click();
      await school.fill("zzzz-not-listed");
      await page.getByRole("option", { name: "Other (please specify)", exact: true }).click({ force: true });
      await page.getByRole("button", { name: "Continue" }).click();
      const alert = page.locator("[data-form-issues]");
      await expect(alert).toContainText("Current institution");
      await expect(alert).toContainText("Please specify.");
      await expect(page.getByRole("textbox", { name: "Current institution other" })).toBeFocused();
      await shot(page, width, "invalid-other-blank");
      await page.getByRole("textbox", { name: "Current institution other" }).fill("Neighborhood College");
      await pickOther(page, "Degree level", "Bridge year");
      await pickOther(page, "Field of study", "Community health");
      await pick(page, "Campus city", "Lahore", "Lahore");
      await page.getByLabel("Period of study (years)").fill("4");
      await page.getByLabel("Completion term").selectOption("Spring");
      await page.getByRole("textbox", { name: "Completion year", exact: true }).fill("2028");
      for (const [term, number] of [["Spring 2026", "2"], ["Fall 2026", "3"], ["Spring 2027", "4"]] as const) {
        const group = page.getByRole("group", { name: term });
        await group.getByLabel("Progress unit").selectOption("semester");
        await group.getByLabel("Number").fill(number);
        await group.getByLabel("Result status").selectOption("awaited");
      }
      for (const [term, number] of [["Fall 2027", "5"], ["Spring 2028", "6"]] as const) {
        const group = page.getByRole("group", { name: new RegExp(term) });
        await group.getByLabel("Number").fill(number);
      }
      await pick(page, "Previous institution", "Forman", "Forman Christian College (A Chartered University), Lahore");
      await pick(page, "Previous qualification", "FSc", "FSc Pre-Medical");
      await page.getByLabel("Previous completion year").fill("2022");
      await page.getByLabel("Fee for the upcoming term (PKR)").fill("85000");
      await page.getByLabel("Fee due date").fill("2026-11-15");
      await shot(page, width, "other-school-degree");
      await continueTo(page, "Support");
    });
  });
}

const CASES = [
  { scholarship: "ivy-azariah", continuing: false, field: { query: "Nurs", option: "Nursing" } },
  { scholarship: "ivy-azariah", continuing: true, field: { query: "Nurs", option: "Nursing" } },
  { scholarship: "john-ivy-azariah", continuing: false, field: { query: "Nurs", option: "Nursing" } },
  { scholarship: "john-ivy-azariah", continuing: true, field: { query: "Biol", option: "Biology" } },
  { scholarship: "robert-mathias", continuing: false, field: { query: "Business Admin", option: "Business Administration" } },
  { scholarship: "robert-mathias", continuing: true, field: { query: "Account", option: "Accounting" } },
] as const;

for (const width of WIDTHS) {
  for (const item of CASES) {
    test(`submit ${item.scholarship} ${item.continuing ? "continuing" : "new"} at ${width}`, async ({ page }) => {
      test.setTimeout(300_000);
      const id = stamp();
      await openForm(page, width, item.scholarship);
      await shot(page, width, `${item.scholarship}-${item.continuing ? "continuing" : "new"}-01-scholarship`);
      await page.getByRole("radio", { name: item.continuing ? /^Continuing/ : /^New$/ }).check();
      await shot(page, width, `${item.scholarship}-${item.continuing ? "continuing" : "new"}-01b-type`);
      const prefix = `${item.scholarship}-${item.continuing ? "continuing" : "new"}`;
      await throughEssays(page, {
        continuing: item.continuing,
        gender: "Female",
        field: item.field,
        id,
        capture: (step) => shot(page, width, `${prefix}-${step}`),
      });
      await shot(page, width, `${item.scholarship}-${item.continuing ? "continuing" : "new"}-06-essays`);
      await continueTo(page, "Documents");
      await shot(page, width, `${item.scholarship}-${item.continuing ? "continuing" : "new"}-07-documents`);
      await documents(page, id, item.continuing);
      await continueTo(page, "Review");
      await expect(page.getByRole("button", { name: "Edit" }).first()).toBeVisible();
      await shot(page, width, `${item.scholarship}-${item.continuing ? "continuing" : "new"}-08-review`);
      await page.getByRole("checkbox", { name: "I agree" }).check();
      await page.getByLabel("Type your full name").fill("Amina Masih");
      await page.getByRole("button", { name: "Submit application" }).click();
      await expect(page.getByRole("heading", { name: "Application received" })).toBeVisible({ timeout: 20000 });
      await shot(page, width, `${item.scholarship}-${item.continuing ? "continuing" : "new"}-09-received`);
    });
  }
}

test("draft resumes after a reload", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/apply?scholarship=ivy-azariah", { waitUntil: "domcontentloaded" });
  await page.getByRole("radio", { name: "New", exact: true }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("First name").fill("Ruth");
  await page.waitForTimeout(1200);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText(/application in progress/i)).toBeVisible();
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(page.getByLabel("First name")).toHaveValue("Ruth");
  await shot(page, 390, "draft-resumed");
});
