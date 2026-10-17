export const FORM_STEPS = [
  { id: "scholarship", label: "Scholarship", fields: ["scholarship", "applicant_type"] },
  {
    id: "personal",
    label: "Personal",
    fields: [
      "first_name", "last_name", "full_name_as_on_cnic", "date_of_birth", "gender", "disability", "disability_other",
      "marital_status", "spouse_name", "spouse_monthly_income", "religion", "cnic", "email", "email_confirm",
      "mobile_phone", "secondary_phone", "address_line", "city", "province", "employment_status", "employment_job",
      "employment_employer", "monthly_income",
    ],
  },
  {
    id: "family",
    label: "Family",
    fields: [
      "father_name", "mother_name", "father_status", "mother_status", "father_occupation", "mother_occupation",
      "father_monthly_income", "mother_monthly_income", "guardian_phone", "siblings_count", "siblings_studying_count",
      "siblings_working_count", "siblings_married_count", "siblings_other_count", "siblings_notes",
    ],
  },
  {
    id: "academics",
    label: "Academics",
    fields: [
      "current_institution", "campus_city", "degree_level", "field_of_study", "program_title", "program_track",
      "program_track_other", "specialization", "study_years", "completion_term", "completion_year", "roll_number",
      "terms", "previous_institution", "previous_qualification", "previous_completion_year", "fee", "fee_due_date",
      "institution_phone", "institution_address",
    ],
  },
  {
    id: "support",
    label: "Support",
    fields: [
      "rapid_received", "rapid_semesters", "rapid_amount", "other_financial_support", "support_provider",
      "support_value_kind", "support_percent", "support_amount", "heard_about", "church_name", "denomination",
      "pastor_title", "pastor_title_other", "pastor_name", "pastor_phone", "pastor_email", "faculty_ref_name",
      "faculty_ref_designation", "faculty_ref_phone", "faculty_ref_email", "family_ref_name", "family_ref_relationship",
      "family_ref_phone", "family_ref_email", "attend_events",
    ],
  },
  { id: "essays", label: "Essays", fields: ["life_goal", "community_contribution", "plan_if_denied", "future_plan"] },
  { id: "documents", label: "Documents", fields: ["documents", "reuse_photo", "reuse_cnic", "reuse_guardian"] },
  { id: "consent", label: "Review", fields: ["consent_accepted", "consent_name"] },
] as const;
