import type { ApplicationInput } from "../../../lib/application/types";

/** The portal-aligned answers every valid test application needs (no personal data, all invented). */
export function portalFields(): Pick<
  ApplicationInput,
  | "country"
  | "permanent_same"
  | "permanent_address"
  | "guardian_relation"
  | "guardian_name"
  | "guardian_occupation"
  | "family_monthly_income"
  | "education"
  | "current_semester"
  | "current_gpa"
  | "gpa_scale"
  | "amount_requested"
  | "financial_need_statement"
> {
  return {
    country: "Pakistan",
    permanent_same: "Yes",
    permanent_address: "",
    guardian_relation: "father",
    guardian_name: "",
    guardian_occupation: "",
    family_monthly_income: 40000,
    education: [
      {
        qualification: "matriculation",
        qualification_other: "",
        institution: "Government Girls High School",
        board: "BISE Lahore",
        status: "completed",
        result_percent: 80,
        year: 2020,
        proof_index: null,
      },
    ],
    current_semester: "3",
    current_gpa: 3.5,
    gpa_scale: "4.00",
    amount_requested: 60000,
    financial_need_statement:
      "My family has one small income and four children in school. The semester fee is more than we can pay this term without help.",
  };
}
