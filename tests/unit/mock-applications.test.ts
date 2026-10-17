import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { requiredDocumentSlots } from "../../lib/application/documents";
import { emptyChecks } from "../../lib/application/documents";
import { mockApplicationsEnabled } from "../../lib/application/mockGate";
import { MOCK_APPLICATIONS, SAMPLE_DOCUMENT_FILES, findMock } from "../../lib/application/mocks";
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
  } finally {
    for (const key of Object.keys(env)) if (!(key in saved)) delete env[key];
    Object.assign(env, saved);
  }
});
