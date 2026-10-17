/** Test-only: SAMPLE files in tests/fixtures/sample-documents for each document slot. No applicant data here. */
export const SAMPLE_DOCUMENT_FILES: Record<string, string[]> = {
  photo: ["passport-photo-sample.jpg"],
  cnic: ["cnic-front-sample.jpg", "cnic-back-sample.jpg"],
  guardian_cnic: ["guardian-cnic-sample.png"],
  admission_proof: ["admission-letter-sample.pdf"],
  result: ["result-card-sample.png"],
  fee_voucher: ["fee-voucher-sample.jpg"],
  pastor_letter: ["pastor-letter-sample.pdf"],
  income_proof: ["income-proof-sample.pdf"],
  disability_certificate: ["disability-certificate-sample.pdf"],
  other_award: ["other-award-sample.pdf"],
  education_proof: ["result-card-sample.png"],
};

/** Other SAMPLE fixtures the sample route may serve (used by upload tests). */
export const EXTRA_SAMPLE_FILES = ["photo-sample.jpg"];

/**
 * In sample mode, when file storage is not set up (for example a Vercel preview
 * without Firebase or Drive keys), SAMPLE files are attached in the browser only.
 * They carry this file id prefix, show as "Sample file (not uploaded)", and the
 * submit route refuses them.
 */
export const LOCAL_SAMPLE_PREFIX = "sample-local:";

export function isLocalSampleDocument(document: { file_id: string }): boolean {
  return document.file_id.startsWith(LOCAL_SAMPLE_PREFIX);
}
