/** Test-only: SAMPLE files in tests/fixtures/sample-documents for each document slot. No applicant data here. */
export const SAMPLE_DOCUMENT_FILES: Record<string, string[]> = {
  photo: ["photo-sample.jpg"],
  cnic: ["cnic-front-sample.jpg", "cnic-back-sample.jpg"],
  guardian_cnic: ["guardian-cnic-sample.png"],
  admission_proof: ["admission-letter-sample.pdf"],
  result: ["result-card-sample.png"],
  fee_voucher: ["fee-voucher-sample.jpg"],
  pastor_letter: ["pastor-letter-sample.pdf"],
  income_proof: ["income-proof-sample.pdf"],
  disability_certificate: ["disability-certificate-sample.pdf"],
  other_award: ["other-award-sample.pdf"],
};
