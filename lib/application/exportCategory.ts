import degreesJson from "@/data/application/degrees.json";
import schoolsJson from "@/data/application/schools.json";
import { BUSINESS_FIELD_IDS } from "./constants";

export type ExportCategoryId = (typeof degreesJson.exportCategoryPriority)[number];

const businessFields = new Set<string>(BUSINESS_FIELD_IDS);
const medicalFields = new Set(["medicine", "veterinary_medicine", "physical_therapy"]);
const postLevels = new Set(["master", "mphil", "phd"]);

export function schoolExportGroup(institutionId: string): "FCCU" | "KC" | "" {
  const option = schoolsJson.options.find((item) => item.id === institutionId);
  if (!option || !("exportGroup" in option)) return "";
  if (option.exportGroup === "FCCU" || option.exportGroup === "KC") return option.exportGroup;
  return "";
}

export function isBusinessPlacement(fieldId: string, levelId: string): boolean {
  return businessFields.has(fieldId) || levelId === "professional_cert";
}

export function assignExportCategory(input: {
  disability: string;
  institutionId: string;
  fieldId: string;
  levelId: string;
}): ExportCategoryId {
  if (input.disability === "visual") return "blind";
  const group = schoolExportGroup(input.institutionId);
  if (group === "FCCU") return "fccu";
  if (group === "KC") return "kc";
  if (medicalFields.has(input.fieldId)) return "medical";
  if (input.fieldId === "nursing") return "nursing";
  if (isBusinessPlacement(input.fieldId, input.levelId)) return "business";
  if (input.fieldId === "pharmacy" || postLevels.has(input.levelId)) return "post_grads";
  if (input.levelId === "intermediate") return "undergrads";
  return "graduates";
}

export function categorySheet(id: string): string {
  const found = degreesJson.exportCategories.find((item) => item.id === id);
  return found?.sheet ?? "Grads";
}

/** FCCU and KC business students stay on that sheet. Summary splits them. */
export function summaryKey(categoryId: string, fieldId: string, levelId: string): string {
  if ((categoryId === "fccu" || categoryId === "kc") && isBusinessPlacement(fieldId, levelId)) {
    return categoryId === "fccu" ? "fccu_bba" : "kc_bba";
  }
  return categoryId;
}

export const SUMMARY_COLUMNS = [
  { key: "medical", label: "Medical" },
  { key: "nursing", label: "Nursing" },
  { key: "undergrads", label: "Pre-Grads" },
  { key: "graduates", label: "Grads" },
  { key: "post_grads", label: "Post-Grads" },
  { key: "kc", label: "KC" },
  { key: "kc_bba", label: "KC-BBA" },
  { key: "fccu", label: "FCCU" },
  { key: "fccu_bba", label: "FCCU-BBA" },
  { key: "business", label: "BBA" },
  { key: "blind", label: "Blind" },
] as const;
