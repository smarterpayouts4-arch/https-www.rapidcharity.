import ivy from "@/content/mock-applications/ivy-azariah.json";
import johnIvy from "@/content/mock-applications/john-ivy-azariah.json";
import robert from "@/content/mock-applications/robert-mathias.json";
import type { ScholarshipId } from "./constants";
import type { ApplicationInput } from "./types";

/** Fully filled, schema-valid sample applications. Test use only; see lib/application/mockGate.ts. */
export type MockApplication = {
  id: "ivy" | "john-ivy" | "robert";
  scholarship: ScholarshipId;
  label: string;
  data: ApplicationInput;
};

export const MOCK_APPLICATIONS: MockApplication[] = [
  { id: "ivy", scholarship: "ivy-azariah", label: "Ivy Azariah", data: ivy as unknown as ApplicationInput },
  { id: "john-ivy", scholarship: "john-ivy-azariah", label: "John-Ivy Azariah", data: johnIvy as unknown as ApplicationInput },
  { id: "robert", scholarship: "robert-mathias", label: "Robert Mathias", data: robert as unknown as ApplicationInput },
];

/** Accepts the short id (ivy) or the scholarship id (ivy-azariah). */
export function findMock(value: string | undefined): MockApplication | undefined {
  if (!value) return undefined;
  return MOCK_APPLICATIONS.find((item) => item.id === value || item.scholarship === value);
}

export { SAMPLE_DOCUMENT_FILES } from "./sampleDocuments";
