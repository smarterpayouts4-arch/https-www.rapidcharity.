import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { requiredDocumentSlots } from "../../lib/application/documents";
import { emptyChecks } from "../../lib/application/documents";
import { DEMO_UNLOCK_KEY, demoKeyMatches, mockApplicationsEnabled, sampleModeAllowed } from "../../lib/application/mockGate";
import { normalizeCnic } from "../../lib/application/normalize";
import { MOCK_APPLICATIONS, SAMPLE_DOCUMENT_FILES, findMock, isSampleEmail } from "../../lib/application/mocks";
import { FORM_STEPS, errorsForStep, validateApplication } from "../../lib/application/schema";
import type { ApplicationInput, DocumentInput } from "../../lib/application/types";

function withDocuments(data: ApplicationInput): ApplicationInput {
  const documents: DocumentInput[] = requiredDocumentSlots(data).map((slot, index) => ({
    slot,
    index: 1,
    storage: "local",
    file_id: "",
    path: `sample/${slot}.jpg`,
    url: "",
    mime: "image/jpeg",
    bytes: 120_000,
    sha256: String(index).padStart(64, "a"),
    checks: emptyChecks(),
    reused: false,
  }));
  return { ...data, client_id: crypto.randomUUID(), documents };
}

test("there is one mock per scholarship", () => {
  assert.deepEqual(
    MOCK_APPLICATIONS.map((item) => item.scholarship).sort(),
    ["ivy-azariah", "john-ivy-azariah", "robert-mathias"],
  );
  assert.equal(findMock("ivy")?.scholarship, "ivy-azariah");
  assert.equal(findMock("robert-mathias")?.id, "robert");
  assert.equal(findMock("nope"), undefined);
});

for (const mock of MOCK_APPLICATIONS) {
  test(`${mock.id} mock passes every form step without errors`, () => {
    const empty = validateApplication({ ...mock.data, client_id: crypto.randomUUID() });
    const fieldErrors = empty.ok ? {} : empty.fieldErrors;
    for (const step of FORM_STEPS) {
      const errors = errorsForStep(fieldErrors, step.fields);
      if (step.id === "documents") continue; // documents are uploaded in the browser
      assert.deepEqual(errors, {}, `${mock.id} step ${step.label}`);
    }
    const full = validateApplication(withDocuments(mock.data));
    assert.equal(full.ok, true, full.ok ? "" : JSON.stringify(full.fieldErrors));
  });

  test(`${mock.id} mock uses obviously fake contact details`, () => {
    assert.match(mock.data.email, /^sample\.applicant\+[a-z-]+@example\.com$/);
    assert.ok(isSampleEmail(mock.data.email));
    assert.equal(mock.data.email_confirm, mock.data.email);
    assert.ok(normalizeCnic(mock.data.cnic).ok, mock.data.cnic);
    assert.equal(mock.name, `${mock.data.first_name} ${mock.data.last_name}`);
    assert.equal(mock.data.consent_name, mock.data.full_name_as_on_cnic);
    assert.doesNotMatch(JSON.stringify(mock.data), /Sample|Tester/, "applicant text uses realistic names, not placeholders");
    assert.equal(mock.data.scholarship, mock.scholarship);
    assert.equal(mock.data.documents.length, 0);
    for (const slot of requiredDocumentSlots(mock.data)) {
      for (const file of SAMPLE_DOCUMENT_FILES[slot] ?? []) {
        assert.ok(existsSync(`tests/fixtures/sample-documents/${file}`), file);
      }
    }
  });
}

test("ivy mock is a female applicant", () => {
  assert.equal(findMock("ivy")?.data.gender, "Female");
});

test("sample applicants have realistic Pakistani names", () => {
  assert.equal(findMock("john-ivy")?.name, "Akram Naseem");
  assert.equal(findMock("john-ivy")?.data.gender, "Male");
  assert.equal(findMock("ivy")?.name, "Ayesha Khan");
  assert.equal(findMock("robert")?.name, "Bilal Masih");
  assert.equal(findMock(["robert-mathias"])?.id, "robert");
  assert.equal(isSampleEmail("ayesha@example.com"), false);
});

test("private unlock key: exact match only", () => {
  assert.equal(DEMO_UNLOCK_KEY, "rapid2027");
  assert.equal(demoKeyMatches("rapid2027"), true);
  assert.equal(demoKeyMatches(["rapid2027"]), true);
  assert.equal(demoKeyMatches("RAPID2027"), false);
  assert.equal(demoKeyMatches("off"), false);
  assert.equal(demoKeyMatches(""), false);
  assert.equal(demoKeyMatches(null), false);
  assert.equal(demoKeyMatches(undefined), false);
});

test("mock gate: on in dev, off in production unless opted in, always off on Vercel production", () => {
  const env = process.env as Record<string, string | undefined>;
  const saved = { ...env };
  try {
    delete env.VERCEL_ENV;
    delete env.NEXT_PUBLIC_ENABLE_MOCK_APPLICATIONS;
    delete env.ENABLE_MOCK_APPLICATIONS;
    env.NODE_ENV = "development";
    assert.equal(mockApplicationsEnabled(), true);
    env.NODE_ENV = "production";
    assert.equal(mockApplicationsEnabled(), false);
    env.NEXT_PUBLIC_ENABLE_MOCK_APPLICATIONS = "1";
    assert.equal(mockApplicationsEnabled(), true);
    env.VERCEL_ENV = "production";
    assert.equal(mockApplicationsEnabled(), false);
    // The private unlock works on Vercel production without any env var.
    delete env.NEXT_PUBLIC_ENABLE_MOCK_APPLICATIONS;
    assert.equal(sampleModeAllowed(), false);
    assert.equal(sampleModeAllowed("nope"), false);
    assert.equal(sampleModeAllowed("rapid2027"), true);
  } finally {
    for (const key of Object.keys(env)) if (!(key in saved)) delete env[key];
    Object.assign(env, saved);
  }
});
