/**
 * Synthetic applicants for the mobile form simulations (tests/sims/simulate.spec.ts).
 * Every person here is invented: surnames end in "Test", emails are sim+NN@example.com,
 * CNICs start with 99999 (no real NADRA area code) and phones use 0300 000xxxx.
 */

export type Pick = { query: string; option: string } | { other: string };
export type Parent = {
  name: string;
  status: "Living" | "Late" | "Retired" | "Unemployed";
  occupation?: Pick;
  income?: number | "unknown";
};
export type EduRow = {
  qualification: "matriculation" | "intermediate" | "bachelor" | "other";
  otherName?: string;
  institution: string;
  board: string;
  status: "Completed" | "In progress";
  result?: string;
  year: string;
};
export type Device = { name: string; width: number; height: number; mobile: boolean };
export type Upload = "jpeg" | "png" | "heic" | "pdf";

export type Applicant = {
  id: string;
  scenario: string;
  device: Device;
  slow3g: boolean;
  backEdit: boolean;
  refreshResume: boolean;
  submit: boolean;
  mistakes: boolean;
  maleTriesIvy: boolean;
  urdu: boolean;
  scholarship: "john-ivy-azariah" | "robert-mathias" | "ivy-azariah";
  continuing: boolean;
  first: string;
  last: string;
  cnicName: string;
  cnic: string;
  dob: string;
  gender: "Female" | "Male";
  marital: "Single" | "Married" | "Widowed" | "Divorced";
  spouse?: { name: string; income: number };
  community: Pick;
  disability: "none" | "Visually impaired" | "Hearing impaired" | "Physical" | "Other";
  mobile: string;
  alternate?: string;
  email: string;
  address: string;
  city: Pick;
  province: string;
  permanent?: string;
  job?: { title: string; employer: string };
  father: Parent;
  mother: Parent;
  guardian: "Father" | "Husband" | "Guardian";
  guardianName?: string;
  guardianOccupation?: string;
  guardianPhone: string;
  household?: { members: number; earning: number };
  familyIncome: number;
  house?: "Owned" | "Rented" | "Other";
  siblings: [number, number, number, number, number];
  education: EduRow[];
  institution: Pick;
  campusCity: Pick;
  level: Pick;
  program: string;
  field: Pick;
  nursing?: "Generic BSN" | "Post-RN BSN";
  studyYears: string;
  completion: { term: "Spring" | "Fall"; year: string };
  semester: string;
  gpa?: { value: string; scale: "4.00" | "5.00" };
  prevInstitution: Pick;
  prevQualification: Pick;
  prevYear: string;
  fee: string;
  requested: string;
  dueDate: string;
  otherScholarship?: { provider: Pick; percent: string };
  heard: Pick;
  church: string;
  pastorTitle: "Pastor" | "Rev." | "Fr." | "Bishop";
  pastorName: string;
  faculty: { name: string; designation: string; email: string };
  familyRef: { name: string; relation: Pick };
  uploads: Upload[];
  attend: "Yes" | "No" | "Maybe";
};

const DEVICES: Device[] = [
  { name: "iPhone SE", width: 375, height: 667, mobile: true },
  { name: "iPhone 16", width: 393, height: 852, mobile: true },
  { name: "Pixel 7", width: 412, height: 915, mobile: true },
  { name: "Galaxy S8", width: 360, height: 740, mobile: true },
  { name: "Small Android", width: 320, height: 640, mobile: true },
  { name: "iPad", width: 768, height: 1024, mobile: true },
];

type Place = { city: Pick; province: string; area: string };
const PLACES: Place[] = [
  { city: { query: "Lahore", option: "Lahore" }, province: "Punjab", area: "Youhanabad, Ferozepur Road" },
  { city: { query: "Karachi", option: "Karachi" }, province: "Sindh", area: "Essa Nagri, Gulshan-e-Iqbal" },
  { city: { query: "Faisalabad", option: "Faisalabad" }, province: "Punjab", area: "Warispura, Satiana Road" },
  { city: { query: "Rawalpindi", option: "Rawalpindi" }, province: "Punjab", area: "Christian Colony, Dhok Kala Khan" },
  { city: { query: "Islamabad", option: "Islamabad" }, province: "Islamabad CT", area: "France Colony, F-7/4" },
  { city: { query: "Gujranwala", option: "Gujranwala" }, province: "Punjab", area: "Christian Town, GT Road" },
  { city: { query: "Sargodha", option: "Sargodha" }, province: "Punjab", area: "Satellite Town Block C" },
  { city: { query: "Sahiwal", option: "Sahiwal" }, province: "Punjab", area: "Fareed Town, Street 4" },
  { city: { query: "Multan", option: "Multan" }, province: "Punjab", area: "Gulgasht Colony" },
  { city: { query: "Peshawar", option: "Peshawar" }, province: "KP", area: "Kohati Gate, Christian Colony" },
  { city: { query: "Mardan", option: "Mardan" }, province: "KP", area: "Hoti, Mission Compound" },
  { city: { query: "Quetta", option: "Quetta" }, province: "Balochistan", area: "Shalkot, Joint Road" },
  { city: { query: "Hyderabad", option: "Hyderabad" }, province: "Sindh", area: "Latifabad Unit 8" },
  { city: { query: "Sialkot", option: "Sialkot" }, province: "Punjab", area: "Pasrur Road, Mission Hospital Lane" },
  { city: { query: "Bahawalpur", option: "Bahawalpur" }, province: "Punjab", area: "Model Town A" },
  { city: { other: "Chak 45 SB, Tehsil Sillanwali" }, province: "Punjab", area: "Gali Number 3, Masihi Basti" },
  { city: { other: "Goth Allah Rakhio, Tharparkar" }, province: "Sindh", area: "Near Government Primary School" },
  { city: { query: "Khanewal", option: "Khanewal" }, province: "Punjab", area: "Mian Channu Road, Chak 12" },
  { city: { query: "Mirpur Khas", option: "Mirpur Khas" }, province: "Sindh", area: "Satellite Town" },
  { city: { query: "Nankana Sahib", option: "Nankana Sahib" }, province: "Punjab", area: "Gurdwara Road" },
];

const FEMALE = ["Saima", "Ayesha", "Rimsha", "Mehwish", "Sana", "Kiran", "Nimra", "Shazia", "Anum", "Iqra", "Parveen", "Rani", "Komal", "Simran", "Harpreet", "Lata", "Pooja", "Mariam", "Esther", "Ruth"];
const MALE = ["Akram", "Bilal", "Danish", "Sohail", "Waqas", "Imran", "Haris", "Kamran", "Ravi", "Suneel", "Arjun", "Manpreet", "Gurpreet", "Daniel", "Samuel", "Yousaf", "Shahbaz", "Asif", "Naveed", "Javed"];

type Community = { pick: Pick; surname: string; church: string };
const COMMUNITIES: Community[] = [
  { pick: { query: "Christ", option: "Christian" }, surname: "Masih", church: "St. Thomas Church" },
  { pick: { query: "Christ", option: "Christian" }, surname: "Gill", church: "Sacred Heart Cathedral" },
  { pick: { query: "Hindu", option: "Hindu" }, surname: "Kumar", church: "Shri Swaminarayan Mandir" },
  { pick: { query: "Sikh", option: "Sikh" }, surname: "Singh", church: "Gurdwara Janam Asthan" },
  { pick: { query: "Christ", option: "Christian" }, surname: "Bhatti", church: "Presbyterian Church" },
  { pick: { other: "Parsi" }, surname: "Irani", church: "Zoroastrian Fire Temple" },
];

type Program = { level: Pick; program: string; field: Pick; nursing?: "Generic BSN" | "Post-RN BSN"; business: boolean; years: string };
const PROGRAMS: Program[] = [
  { level: { query: "Bachelor", option: "Bachelor's (BS / BA / BSc / BBA / B.Ed)" }, program: "BS Computer Science", field: { query: "Computer", option: "Computer Science" }, business: false, years: "4" },
  { level: { query: "Bachelor", option: "Bachelor's (BS / BA / BSc / BBA / B.Ed)" }, program: "Bachelor of Science in Nursing - track unspecified", field: { query: "nurs", option: "Nursing" }, nursing: "Generic BSN", business: false, years: "4" },
  { level: { query: "Bachelor", option: "Bachelor's (BS / BA / BSc / BBA / B.Ed)" }, program: "BBA", field: { query: "Business Admin", option: "Business Administration" }, business: true, years: "4" },
  { level: { query: "Bachelor", option: "Bachelor's (BS / BA / BSc / BBA / B.Ed)" }, program: "BS Accounting And Finance", field: { query: "Accounting &", option: "Accounting & Finance" }, business: true, years: "4" },
  { level: { query: "Bachelor", option: "Bachelor's (BS / BA / BSc / BBA / B.Ed)" }, program: "BS English", field: { query: "English", option: "English" }, business: false, years: "4" },
  { level: { query: "Professional degree", option: "Professional degree (MBBS, Pharm-D, DPT, DVM, LLB)" }, program: "Pharm-D", field: { query: "Pharm", option: "Pharmacy" }, business: false, years: "5" },
  { level: { query: "Master", option: "Master's (MS / MA / MBA)" }, program: "MA Economics", field: { query: "Econ", option: "Economics" }, business: true, years: "2" },
  { level: { query: "Associate", option: "Associate Degree (ADP, 2 years)" }, program: "Associate degree in Computer Science", field: { query: "Computer", option: "Computer Science" }, business: false, years: "2" },
  { level: { query: "Bachelor", option: "Bachelor's (BS / BA / BSc / BBA / B.Ed)" }, program: "B.Ed / BS Education", field: { query: "Educa", option: "Education" }, business: false, years: "4" },
  { level: { query: "Bachelor", option: "Bachelor's (BS / BA / BSc / BBA / B.Ed)" }, program: "Bachelor of Science in Nursing - track unspecified", field: { query: "nurs", option: "Nursing" }, nursing: "Post-RN BSN", business: false, years: "2" },
];

const SCHOOLS: Pick[] = [
  { query: "Kinnaird", option: "Kinnaird College for Women University, Lahore" },
  { query: "Punjab", option: "University of the Punjab, Lahore" },
  { query: "Peshawar", option: "University of Peshawar" },
  { query: "Sindh", option: "University of Sindh" },
  { query: "Sargodha", option: "University of Sargodha" },
  { query: "Islamia", option: "The Islamia University of Bahawalpur" },
  { query: "GCUF", option: "Government College University Faisalabad" },
  { other: "Government Associate College for Women, Chak Jhumra" },
];

const OCCUPATIONS: Pick[] = [
  { query: "Daily", option: "Daily-wage labourer" },
  { query: "Driver", option: "Driver" },
  { query: "Domestic", option: "Domestic worker" },
  { query: "Farmer", option: "Farmer" },
  { query: "Factory", option: "Factory worker" },
  { query: "Teacher", option: "Teacher" },
  { query: "Shop", option: "Shopkeeper-small business" },
  { other: "Sanitary worker (TMA)" },
];

const LONG_NAMES = [
  ["Muhammad", "Abdul Rehman Ghulam Mustafa Chaudhry Test"],
  ["Shumaila", "Naureen Bibi Sardar Masih Bhatti Test"],
  ["Gurpreet", "Kaur Harjinder Singh Sandhu Test"],
];

/** Small deterministic generator so every run gets the same 52 people. */
function rng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

export function buildApplicants(count = 52): Applicant[] {
  const random = rng(2027);
  const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)] as T;
  const list: Applicant[] = [];
  for (let index = 0; index < count; index += 1) {
    const n = String(index + 1).padStart(2, "0");
    const device = DEVICES[index % DEVICES.length] as Device;
    const place = PLACES[index % PLACES.length] as Place;
    const community = COMMUNITIES[index % COMMUNITIES.length] as Community;
    const female = index % 2 === 0 || index % 7 === 3;
    const gender: Applicant["gender"] = female ? "Female" : "Male";
    let program = PROGRAMS[index % PROGRAMS.length] as Program;
    // Ivy Azariah is for women; Robert Mathias is for business fields; John-Ivy for the rest.
    const scholarship: Applicant["scholarship"] = program.business ? "robert-mathias" : female && index % 3 === 0 ? "ivy-azariah" : "john-ivy-azariah";
    if (scholarship === "ivy-azariah" && program.business) program = PROGRAMS[0] as Program;
    const maleTriesIvy = !female && index % 9 === 1;
    const fatherStatus: Parent["status"] = (["Living", "Late", "Retired", "Unemployed"] as const)[index % 4] as Parent["status"];
    const orphan = index % 13 === 5;
    const married = female && index % 10 === 4;
    const widowed = female && index % 17 === 8;
    const guardian: Applicant["guardian"] = married ? "Husband" : orphan || (fatherStatus === "Late" && index % 3 === 0) ? "Guardian" : "Father";
    const first = pick(female ? FEMALE : MALE);
    const long = index % 11 === 2 ? LONG_NAMES[index % LONG_NAMES.length] : null;
    const last = long ? (long[1] as string) : `${community.surname} Test`;
    const firstName = long ? (long[0] as string) : first;
    const incomeKind = index % 6;
    const fatherIncome: number | "unknown" | undefined =
      fatherStatus === "Late" || orphan ? undefined : incomeKind === 0 ? 0 : incomeKind === 1 ? "unknown" : incomeKind === 2 ? 6500 : 18000 + (index % 5) * 7000;
    const motherStatus: Parent["status"] = orphan ? "Late" : index % 5 === 0 ? "Unemployed" : "Living";
    const motherIncome: number | "unknown" | undefined = motherStatus === "Late" ? undefined : index % 4 === 1 ? "unknown" : index % 3 === 0 ? 0 : 9000;
    const known = (value: number | "unknown" | undefined) => (typeof value === "number" ? value : 0);
    const familyIncome = index % 8 === 0 ? 0 : known(fatherIncome) + known(motherIncome) + (married ? 15000 : 0);
    const eduCount = 1 + (index % 4);
    const eduRows: EduRow[] = [
      { qualification: "matriculation", institution: `Govt. High School No. ${index + 1}, ${place.area.split(",")[0]}`, board: "BISE Lahore", status: "Completed", result: String(60 + (index % 35)), year: "2019" },
      { qualification: "intermediate", institution: "Govt. Degree College", board: "BISE Gujranwala", status: "Completed", result: "71.5", year: "2021" },
      { qualification: "bachelor", institution: "Forman Christian College", board: "University of the Punjab", status: index % 2 ? "In progress" : "Completed", result: index % 2 ? undefined : "68", year: index % 2 ? "2027" : "2025" },
      { qualification: "other", otherName: "DAE Electrical", institution: "Govt. College of Technology", board: "Punjab Board of Technical Education", status: "Completed", result: "74", year: "2022" },
    ].slice(0, eduCount) as EduRow[];
    const continuing = index % 4 === 2;
    const semester = String(1 + (index % 8));
    const urdu = index % 8 === 6;
    const slow = index % 10 === 7;
    const uploadsCycle: Upload[][] = [["jpeg", "pdf"], ["png", "jpeg"], ["heic", "pdf"], ["pdf", "png"]];
    list.push({
      id: `sim-${n}`,
      scenario: "",
      device,
      slow3g: slow,
      backEdit: index % 5 === 1,
      refreshResume: index % 6 === 3,
      submit: index % 13 === 0,
      mistakes: index % 7 === 4,
      maleTriesIvy,
      urdu,
      scholarship,
      continuing,
      first: firstName,
      last,
      cnicName: `${firstName} ${last}`,
      cnic: `99999${String(1000000 + index).slice(-7)}${index % 10}`,
      dob: `${2000 + (index % 7)}-0${1 + (index % 9)}-1${index % 9}`,
      gender,
      marital: married ? "Married" : widowed ? "Widowed" : "Single",
      spouse: married ? { name: `${pick(MALE)} ${community.surname} Test`, income: index % 3 ? 15000 : 0 } : undefined,
      community: community.pick,
      disability: index % 9 === 4 ? "Physical" : index % 19 === 10 ? "Visually impaired" : "none",
      mobile: `0300${String(1000000 + index * 37).slice(-7)}`,
      alternate: index % 3 === 0 ? `0345${String(2000000 + index).slice(-7)}` : undefined,
      email: `sim+${n}@example.com`,
      address:
        index % 11 === 2
          ? `House No. 1234-B, Gali Number 17, Mohallah Masihi Abadi near Government Girls High School, ${place.area}`
          : `House ${10 + index}, ${place.area}`,
      city: place.city,
      province: place.province,
      permanent: index % 5 === 3 ? `Village ${10 + index} GB, Tehsil Jaranwala, District Faisalabad` : undefined,
      job: index % 6 === 5 ? { title: "Part-time tutor", employer: "Self-employed home tuition" } : undefined,
      father: {
        name: `${pick(MALE)} ${community.surname} Test`,
        status: orphan ? "Late" : fatherStatus,
        occupation: fatherStatus === "Living" && !orphan ? pick(OCCUPATIONS) : undefined,
        income: fatherIncome,
      },
      mother: {
        name: `${pick(FEMALE)} Bibi Test`,
        status: motherStatus,
        occupation: motherStatus === "Living" ? (index % 2 ? { query: "Home", option: "Homemaker" } : { query: "Domestic", option: "Domestic worker" }) : undefined,
        income: motherIncome,
      },
      guardian,
      guardianName: guardian === "Guardian" ? `${pick(MALE)} ${community.surname} Uncle Test` : undefined,
      guardianOccupation: guardian === "Guardian" ? "Rickshaw driver" : guardian === "Husband" ? "Electrician" : undefined,
      guardianPhone: `+92 301 ${String(1000000 + index).slice(-7)}`,
      household: index % 2 ? { members: 4 + (index % 6), earning: index % 3 } : undefined,
      familyIncome,
      house: index % 3 === 0 ? "Rented" : index % 3 === 1 ? "Owned" : undefined,
      siblings: [index % 6, Math.min(index % 6, 1), 0, Math.min(Math.max((index % 6) - 1, 0), 1), 0],
      education: eduRows,
      institution: SCHOOLS[index % SCHOOLS.length] as Pick,
      campusCity: place.city,
      level: program.level,
      program: program.program,
      field: program.field,
      nursing: program.nursing,
      studyYears: program.years,
      completion: { term: index % 2 ? "Fall" : "Spring", year: String(2027 + (index % 3)) },
      semester,
      gpa: semester === "1" ? undefined : { value: (2.4 + (index % 16) / 10).toFixed(2), scale: index % 9 === 0 ? "5.00" : "4.00" },
      prevInstitution: { query: "Forman", option: "Forman Christian College (A Chartered University), Lahore" },
      prevQualification: index % 3 ? { query: "FSc", option: "FSc Pre-Medical" } : { query: "FA", option: "FA (Humanities)" },
      prevYear: "2022",
      fee: String(35000 + (index % 9) * 12500),
      requested: String(25000 + (index % 7) * 5000),
      dueDate: "2026-11-30",
      otherScholarship: index % 8 === 3 ? { provider: { query: "Ehsaas", option: "Ehsaas" }, percent: "25" } : undefined,
      heard: index % 2 ? { query: "Pastor", option: "Pastor/Church" } : { query: "Friend", option: "Friend or family" },
      church: community.church,
      pastorTitle: (["Pastor", "Rev.", "Fr.", "Bishop"] as const)[index % 4] as Applicant["pastorTitle"],
      pastorName: `${pick(MALE)} ${community.surname} Test`,
      faculty: { name: `Dr. ${pick(FEMALE)} Test`, designation: "Assistant Professor", email: `faculty+${n}@example.com` },
      familyRef: { name: `${pick(MALE)} Test`, relation: index % 2 ? { query: "Uncle", option: "Uncle" } : { query: "Brother", option: "Brother" } },
      uploads: uploadsCycle[index % uploadsCycle.length] as Upload[],
      attend: (["Yes", "Maybe", "No"] as const)[index % 3] as Applicant["attend"],
    });
    const item = list[list.length - 1] as Applicant;
    const tags = [
      `${item.device.name} ${item.device.width}px`,
      item.gender,
      item.scholarship,
      item.continuing ? "continuing" : "new",
      `father ${item.father.status}`,
      orphan ? "orphan" : "",
      item.guardian !== "Father" ? `guardian ${item.guardian}` : "",
      item.disability !== "none" ? `disability ${item.disability}` : "",
      item.job ? "employed" : "",
      item.familyIncome === 0 ? "zero income" : item.father.income === "unknown" ? "unknown income" : "",
      long ? "long names" : "",
      item.address.length > 80 ? "long address" : "",
      urdu ? "Urdu script" : "",
      `${eduCount} education rows`,
      item.slow3g ? "slow 3G" : "",
      item.backEdit ? "back and edit" : "",
      item.refreshResume ? "refresh and resume" : "",
      item.mistakes ? "typos then fixes" : "",
      maleTriesIvy ? "male tries Ivy" : "",
      item.submit ? "submits locally" : "",
      "other" in item.city ? "village or town typed under Other" : "",
      `uploads ${item.uploads.join("/")}`,
    ].filter(Boolean);
    item.scenario = tags.join(", ");
  }
  return list;
}
