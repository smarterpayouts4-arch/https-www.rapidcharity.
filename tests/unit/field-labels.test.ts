import assert from "node:assert/strict";
import test from "node:test";
import { emptyApplication } from "../../lib/application/empty";
import { documentUploadPrompt, fieldLabel, namedFieldError } from "../../lib/application/fieldLabels";
import { validateApplication } from "../../lib/application/schema";

test("validation names the exact field, including a hidden scholarship", () => {
  const result = validateApplication(emptyApplication(""));
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.fieldErrors.scholarship, "Choose a scholarship.");
  assert.equal(namedFieldError("scholarship", result.fieldErrors.scholarship), "Scholarship: Choose a scholarship.");
  assert.equal(fieldLabel("applicant_type"), "New or Continuing applicant");
  assert.equal(fieldLabel("current_institution.other_text"), "Current institution");
  assert.match(namedFieldError("documents.0.slot", "Passport photo is unreadable."), /Uploaded file 1/);
});

test("a preselected scholarship does not fail scholarship validation", () => {
  const result = validateApplication(emptyApplication("ivy-azariah"));
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.fieldErrors.scholarship, undefined);
  assert.equal(result.fieldErrors.applicant_type, "Choose New or Continuing.");
  assert.equal(fieldLabel("documents.photo"), "Passport photo");
  assert.equal(result.fieldErrors["documents.photo"], documentUploadPrompt("photo"));
  assert.equal(result.fieldErrors["documents.cnic"], "Upload your CNIC or B-Form, front and back.");
  assert.equal(documentUploadPrompt("cnic"), "Upload your CNIC or B-Form, front and back.");
});
