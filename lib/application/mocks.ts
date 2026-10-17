import ivy from "@/content/mock-applications/ivy-azariah.json";
import johnIvy from "@/content/mock-applications/john-ivy-azariah.json";
import robert from "@/content/mock-applications/robert-mathias.json";
import type { ScholarshipId } from "./constants";
import type { ApplicationInput } from "./types";

/** Fully filled, schema-valid sample applications. Test use only; see lib/application/mockGate.ts. */
export type MockApplication = {
  id: "ivy" | "john-ivy" | "robert";
  scholarship: ScholarshipId;
  /** Scholarship name, as shown in "Applying for: ...". */
  label: string;
  /** The fake applicant's name, shown on the sample chip. */
  name: string;
  /** Short line under the name on the chip. */
  detail: string;
  data: ApplicationInput;
};

function applicantName(data: ApplicationInput): string {
  return `${data.first_name} ${data.last_name}`.trim();
}

const IVY = ivy as unknown as ApplicationInput;
const JOHN_IVY = johnIvy as unknown as ApplicationInput;
const ROBERT = robert as unknown as ApplicationInput;

export const MOCK_APPLICATIONS: MockApplication[] = [
  { id: "john-ivy", scholarship: "john-ivy-azariah", label: "John-Ivy Azariah", name: applicantName(JOHN_IVY), detail: "John-Ivy Azariah", data: JOHN_IVY },
  { id: "ivy", scholarship: "ivy-azariah", label: "Ivy Azariah", name: applicantName(IVY), detail: "Ivy Azariah · women only", data: IVY },
  { id: "robert", scholarship: "robert-mathias", label: "Robert Mathias", name: applicantName(ROBERT), detail: "Robert Mathias · continuing", data: ROBERT },
];

/** Accepts the short id (ivy) or the scholarship id (ivy-azariah). */
export function findMock(value: string | string[] | undefined | null): MockApplication | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  return MOCK_APPLICATIONS.find((item) => item.id === raw || item.scholarship === raw);
}

/** True for any form data that came from a sample (all samples use sample.applicant+...@example.com). */
export function isSampleEmail(email: string): boolean {
  return /^sample\.applicant\+[a-z-]+@example\.com$/i.test(email.trim());
}

export { SAMPLE_DOCUMENT_FILES } from "./sampleDocuments";
