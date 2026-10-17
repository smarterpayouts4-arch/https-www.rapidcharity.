import { BUSINESS_FIELD_IDS, type ScholarshipId } from "./constants";

const business = new Set<string>(BUSINESS_FIELD_IDS);

export function isBusinessField(fieldId: string): boolean {
  return business.has(fieldId);
}

export function eligibilitySuggestion(input: {
  scholarship: string;
  gender: string;
  fieldId: string;
}): { message: string; switchTo: ScholarshipId; switchLabel: string } | null {
  if (input.scholarship === "ivy-azariah" && input.gender === "Male") {
    return {
      message:
        "Ivy Azariah is for women students. John-Ivy Azariah is open to men and women in non-business fields.",
      switchTo: "john-ivy-azariah",
      switchLabel: "Switch to John-Ivy Azariah",
    };
  }
  if (input.scholarship === "robert-mathias" && input.fieldId && !isBusinessField(input.fieldId)) {
    return {
      message:
        "Robert Mathias is for business fields only. John-Ivy Azariah covers other fields of study.",
      switchTo: "john-ivy-azariah",
      switchLabel: "Switch to John-Ivy Azariah",
    };
  }
  if (input.scholarship === "john-ivy-azariah" && input.fieldId && isBusinessField(input.fieldId)) {
    return {
      message:
        "John-Ivy Azariah is for non-business fields. Robert Mathias is the scholarship for business fields.",
      switchTo: "robert-mathias",
      switchLabel: "Switch to Robert Mathias",
    };
  }
  return null;
}

export function eligibilityIssues(input: {
  scholarship: string;
  gender: string;
  fieldId: string;
}): { path: (string | number)[]; message: string }[] {
  const issues: { path: (string | number)[]; message: string }[] = [];
  const scholarship = input.scholarship as ScholarshipId | "";
  if (scholarship === "robert-mathias") {
    if (!input.fieldId || input.fieldId === "other" || !isBusinessField(input.fieldId)) {
      issues.push({
        path: ["field_of_study", "option_id"],
        message:
          "Robert Mathias is for business fields only. Choose a business field of study, or apply for John-Ivy Azariah.",
      });
    }
  }
  if (scholarship === "john-ivy-azariah" && input.fieldId && isBusinessField(input.fieldId)) {
    issues.push({
      path: ["field_of_study", "option_id"],
      message:
        "John-Ivy Azariah is for non-business fields. Apply for Robert Mathias if you study a business field.",
    });
  }
  if (scholarship === "ivy-azariah" && input.gender && input.gender !== "Female") {
    issues.push({
      path: ["gender"],
      message: "Ivy Azariah is open to women students. Choose Female, or apply for another scholarship.",
    });
  }
  return issues;
}
