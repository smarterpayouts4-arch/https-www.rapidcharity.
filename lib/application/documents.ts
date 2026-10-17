import type { ApplicationInput, StoredApplication, StoredDocument } from "./types";

const BASE_REQUIRED = ["photo", "cnic", "guardian_cnic", "admission_proof", "result", "fee_voucher", "pastor_letter"];

export function requiredDocumentSlots(input: {
  applicant_type: string;
  disability: string;
  other_financial_support: string;
  reuse_photo: boolean;
  reuse_cnic: boolean;
  reuse_guardian: boolean;
}): string[] {
  const slots = [...BASE_REQUIRED];
  if (input.disability && input.disability !== "none") slots.push("disability_certificate");
  if (input.other_financial_support === "Yes") slots.push("other_award");
  if (input.applicant_type !== "continuing") return slots;
  return slots.filter((slot) => {
    if (slot === "photo" && input.reuse_photo) return false;
    if (slot === "cnic" && input.reuse_cnic) return false;
    if (slot === "guardian_cnic" && input.reuse_guardian) return false;
    return true;
  });
}

export function missingRequiredDocuments(input: Pick<
  ApplicationInput,
  | "documents"
  | "applicant_type"
  | "disability"
  | "other_financial_support"
  | "reuse_photo"
  | "reuse_cnic"
  | "reuse_guardian"
>): string[] {
  const required = requiredDocumentSlots(input);
  return required.filter((slot) => !input.documents.some((document) => document.slot === slot && !document.reused));
}

export function unverifiedRequired(application: StoredApplication): string[] {
  const required = requiredDocumentSlots(application);
  return required.filter((slot) => {
    const docs = application.documents.filter((document) => document.slot === slot);
    if (docs.length === 0) return true;
    return docs.some((document) => document.review_state !== "verified");
  });
}

export function emptyChecks() {
  return {
    magic_ok: true,
    readable: true,
    blur_score: null,
    brightness: null,
    width: null,
    height: null,
    page_count: null,
    warnings: [] as string[],
    name_score: null,
    cnic_match: null as boolean | null,
    fee_extracted: null,
    fee_match: null as boolean | null,
    duplicate_across: false,
    extracted_text: "",
  };
}

export function placeholderDocument(slot: string): StoredDocument {
  return {
    slot,
    index: 1,
    storage: "local",
    file_id: "",
    path: "",
    url: "",
    mime: "",
    bytes: 0,
    sha256: "",
    checks: emptyChecks(),
    reused: true,
    review_state: "pending",
    review_reason: "Continuing student marked this document unchanged.",
    reupload_token: "",
  };
}
