/** Spring Semester 2027 is the verified application cycle (deadline 15 October 2026). */
export const APPLICATION_CYCLE = "spring-2027";

export const SCHOLARSHIPS = [
  {
    id: "john-ivy-azariah",
    label: "John-Ivy Azariah",
    detail: "Non-business fields of study",
  },
  {
    id: "robert-mathias",
    label: "Robert Mathias",
    detail: "Business fields of study only",
  },
  {
    id: "ivy-azariah",
    label: "Ivy Azariah",
    detail: "Women students only",
  },
] as const;

export type ScholarshipId = (typeof SCHOLARSHIPS)[number]["id"];

export const SCHOLARSHIP_IDS: ScholarshipId[] = SCHOLARSHIPS.map((item) => item.id);

/**
 * Fields treated as the Business family for Robert Mathias (required) and
 * John-Ivy Azariah (not eligible). Human Resource Management is included
 * because it is awarded as a business degree.
 */
export const BUSINESS_FIELD_IDS = [
  "accounting",
  "accounting_finance",
  "business",
  "business_data_analytics",
  "business_administration",
  "economics",
  "finance",
  "human_resource_management",
  "marketing",
] as const;

export const NURSING_FIELD_ID = "nursing";

export const CITIES = [
  "Lahore",
  "Karachi",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Peshawar",
  "Quetta",
  "Multan",
  "Gujranwala",
  "Sialkot",
  "Hyderabad",
  "Sargodha",
  "Bahawalpur",
  "Abbottabad",
  "Gujrat",
  "Jhelum",
  "Sahiwal",
  "Sheikhupura",
  "Okara",
  "Kasur",
  "Mardan",
  "Mingora",
  "Kohat",
  "Dera Ghazi Khan",
  "Rahim Yar Khan",
  "Larkana",
  "Sukkur",
  "Nawabshah",
  "Mirpur",
  "Muzaffarabad",
  "Gilgit",
  "Skardu",
  "Wah Cantt",
  "Taxila",
  "Attock",
  "Jhang",
] as const;

export const PROVINCES = [
  "Punjab",
  "Sindh",
  "KP",
  "Balochistan",
  "Islamabad CT",
  "GB",
  "AJK",
  "Outside Pakistan",
] as const;

export const OCCUPATIONS = [
  "Unemployed",
  "Homemaker",
  "Daily-wage labourer",
  "Driver",
  "Domestic worker",
  "Factory worker",
  "Farmer",
  "Shopkeeper-small business",
  "Government employee",
  "Private-sector employee",
  "Teacher",
  "Nurse-health worker",
  "Pastor-ministry worker",
  "Retired",
  "Overseas worker",
  "Other",
] as const;

export const RELIGIONS = [
  "Christianity",
  "Islam",
  "Hinduism",
  "Sikhism",
  "Other",
  "Prefer not to say",
] as const;

export const EMPLOYMENT = [
  { id: "No", label: "No" },
  { id: "Yes", label: "Yes" },
] as const;

export const DISABILITIES = [
  { id: "none", label: "None" },
  { id: "visual", label: "Visually impaired" },
  { id: "hearing", label: "Hearing impaired" },
  { id: "physical", label: "Physical" },
  { id: "other", label: "Other" },
] as const;

export const PARENT_STATUSES = [
  { id: "Living", label: "Living" },
  { id: "Late", label: "Late" },
  { id: "Retired", label: "Retired" },
  { id: "Unemployed", label: "Unemployed" },
] as const;

export const PASTOR_TITLES = [
  { id: "Pastor", label: "Pastor" },
  { id: "Rev.", label: "Rev." },
  { id: "Fr.", label: "Fr." },
  { id: "Bishop", label: "Bishop" },
  { id: "Other", label: "Other" },
] as const;

export const TERM_UNITS = [
  { id: "semester", label: "Semester" },
  { id: "prof", label: "Prof" },
  { id: "year", label: "Year" },
  { id: "part", label: "Part" },
  { id: "paper", label: "Paper" },
] as const;

/** Last two terms, the Spring 2027 cycle, and the next two. */
export const CYCLE_TERMS = [
  { term: "Spring 2026", future: false },
  { term: "Fall 2026", future: false },
  { term: "Spring 2027", future: false },
  { term: "Fall 2027", future: true },
  { term: "Spring 2028", future: true },
] as const;

export const HEARD_ABOUT = [
  "Pastor/Church",
  "University financial-aid office",
  "Faculty member",
  "Friend or family",
  "Previous recipient",
  "Social media",
  "Website",
  "Other",
] as const;

export const DENOMINATIONS = [
  "Catholic",
  "Church of Pakistan",
  "Presbyterian",
  "Methodist",
  "Salvation Army",
  "Pentecostal",
  "Full Gospel",
  "Other",
] as const;

export const RELATIONSHIPS = [
  "Father",
  "Mother",
  "Brother",
  "Sister",
  "Uncle",
  "Aunt",
  "Spouse",
  "Guardian",
  "Other",
] as const;

export const SUPPORT_PROVIDERS = [
  "Institution financial aid",
  "HEC",
  "Ehsaas",
  "PEEF",
  "Other",
] as const;

export const PROGRAM_TRACKS = [
  { id: "generic_bsn", label: "Generic BSN (4-yr)" },
  { id: "post_rn_bsn", label: "Post-RN BSN (2-yr)" },
  { id: "other", label: "Other (please specify)" },
] as const;

export const RAPID_SEMESTERS = [
  "Spring 2023",
  "Fall 2023",
  "Spring 2024",
  "Fall 2024",
  "Spring 2025",
  "Fall 2025",
  "Spring 2026",
  "Fall 2026",
] as const;

export const WORKFLOW_STATUSES = [
  { id: "submitted", label: "Submitted" },
  { id: "incomplete", label: "Incomplete" },
  { id: "under_review", label: "Under review" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "did_not_reapply", label: "Did not re-apply" },
  { id: "pass_out", label: "Pass-out" },
] as const;

export const EXPORT_CATEGORY_OPTIONS = [
  { id: "", label: "Automatic" },
  { id: "medical", label: "Medical" },
  { id: "nursing", label: "Nursing" },
  { id: "undergrads", label: "Pre-Grads" },
  { id: "graduates", label: "Grads" },
  { id: "post_grads", label: "Post-Grads" },
  { id: "kc", label: "KC" },
  { id: "fccu", label: "FCCU" },
  { id: "business", label: "BBA" },
  { id: "blind", label: "Blind" },
] as const;

export const GRADES = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"] as const;

export const CURRENCIES = ["PKR", "USD", "GBP", "CAD"] as const;

export const SEMESTER_OPTIONS = [
  { id: "not_started", label: "Not started yet" },
  ...Array.from({ length: 10 }, (_, index) => ({
    id: String(index + 1),
    label: String(index + 1),
  })),
] as const;

export function isScholarshipId(value: string | undefined): value is ScholarshipId {
  return SCHOLARSHIP_IDS.includes(value as ScholarshipId);
}
