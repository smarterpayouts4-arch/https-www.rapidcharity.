export type RankedOption = { id: string; label: string; score: number };

/** Hand aliases. The catalogs do not ship an aliases field. */
export const SCHOOL_ALIASES: Record<string, string[]> = {
  forman_christian_college_a_chartered_university_lahore: [
    "fccu",
    "fcc",
    "fc",
    "fc college",
    "forman",
    "forman christian",
    "forman christian college",
  ],
  kinnaird_college_for_women_university_lahore: ["kc", "kinnaird", "kinnaird college"],
  government_college_university_faisalabad: ["gcuf", "gcu faisalabad", "gc university faisalabad"],
  university_of_the_punjab_lahore: ["pu", "punjab university", "pu lahore"],
  university_of_peshawar: ["uop", "peshawar university"],
  university_of_sargodha: ["uos", "sargodha university"],
  university_of_sindh: ["sindh university", "jamshoro"],
  islamia_university_of_bahawalpur: ["iub", "islamia university"],
  allama_iqbal_open_university: ["aiou", "open university"],
  pmas_arid_agriculture_university_rawalpindi: ["uaar", "arid university"],
};

function norm(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function levenshtein(left: string, right: string): number {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let previous = i - 1;
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const current = row[j] ?? 0;
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      row[j] = Math.min((row[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1, previous + cost);
      previous = current;
    }
  }
  return row[right.length] ?? 0;
}

export function derivedAliases(label: string): string[] {
  const aliases: string[] = [];
  for (const match of label.matchAll(/\(([^)]+)\)/g)) {
    const inner = match[1]?.trim();
    if (inner) aliases.push(inner);
  }
  const words = label
    .split(/[^A-Za-z0-9]+/)
    .filter((word) => word.length > 2 && !/^(for|and|the|university|college)$/i.test(word));
  if (words.length >= 2) aliases.push(words.map((word) => word[0] ?? "").join(""));
  // Pakistani institutions are usually known by the full acronym, University and College included (GCUF, IUB).
  const full = label
    .replace(/\([^)]*\)/g, " ")
    .split(/[^A-Za-z0-9]+/)
    .filter((word) => word.length > 1 && !/^(of|the|for|and|in)$/i.test(word));
  const acronym = full.map((word) => word[0] ?? "").join("");
  if (full.length >= 3 && !aliases.includes(acronym)) aliases.push(acronym);
  return aliases;
}

export function programAliases(title: string): string[] {
  const extra = derivedAliases(title);
  const folded = title.toLowerCase();
  if (/nurs|bsn|post-rn|post rn/.test(folded)) {
    extra.push("nursing", "nurs", "bsn", "bachelor of science in nursing", "post rn", "generic bsn");
  }
  if (/pharm/.test(folded)) extra.push("pharmacy", "pharm d", "pharm-d");
  if (/physical therapy|\bdpt\b/.test(folded)) extra.push("dpt", "physiotherapy");
  if (/veterinary|\bdvm\b/.test(folded)) extra.push("dvm", "veterinary");
  if (/\bmbbs\b/.test(folded)) extra.push("mbbs", "medicine");
  if (/acca/.test(folded)) extra.push("acca");
  if (/chartered account/.test(folded)) extra.push("ca", "chartered accountant");
  return extra;
}

function aliasScore(query: string, aliases: string[]): number {
  if (!query) return 0;
  let best = 0;
  for (const alias of aliases) {
    const folded = norm(alias);
    if (!folded) continue;
    if (folded === query) best = Math.max(best, 96);
    else if (folded.startsWith(query) && query.length >= 2) best = Math.max(best, 88);
    else if (query.startsWith(folded) && folded.length >= 3) best = Math.max(best, 76);
    else if ((folded.includes(query) || query.includes(folded)) && query.length >= 3) best = Math.max(best, 70);
  }
  return best;
}

function labelScore(query: string, label: string): number {
  const folded = norm(label);
  if (!query || !folded) return 0;
  if (folded === query) return 100;
  if (folded.startsWith(query)) return 92;
  if (folded.includes(query)) return 84;
  const queryTokens = query.split(" ").filter(Boolean);
  const labelTokens = folded.split(" ").filter(Boolean);
  if (queryTokens.length === 0) return 0;
  let total = 0;
  for (const token of queryTokens) {
    let best = 0;
    for (const labelToken of labelTokens) {
      if (labelToken === token) best = Math.max(best, 90);
      else if (labelToken.startsWith(token) && token.length >= 3) best = Math.max(best, 80);
      else if (token.length >= 4 && labelToken.length >= 4) {
        const distance = levenshtein(token, labelToken);
        const limit = token.length >= 8 ? 2 : 1;
        if (distance <= limit) best = Math.max(best, 64 - distance * 8);
      }
    }
    if (best === 0) return 0;
    total += best;
  }
  return total / queryTokens.length;
}

export function rankOptions(
  query: string,
  options: { id: string; label: string }[],
  extraAliases: Record<string, string[]> = {},
): RankedOption[] {
  const folded = norm(query);
  if (!folded) return options.map((option) => ({ ...option, score: 1 }));
  const ranked: RankedOption[] = [];
  for (const option of options) {
    if (option.id === "other") continue;
    const aliases = [...derivedAliases(option.label), ...(extraAliases[option.id] ?? [])];
    const score = Math.max(labelScore(folded, option.label), aliasScore(folded, aliases));
    if (score > 0) ranked.push({ ...option, score });
  }
  ranked.sort((left, right) => right.score - left.score || left.label.localeCompare(right.label));
  return ranked;
}

/** Exact label, a clearly better close match, or the only remaining match. */
export function resolveTypedOption(
  query: string,
  options: { id: string; label: string }[],
  extraAliases: Record<string, string[]> = {},
): { id: string; label: string } | null {
  const trimmed = query.trim();
  if (trimmed.length < 2) return null;
  const ranked = rankOptions(trimmed, options, extraAliases).filter((item) => item.id !== "other");
  const best = ranked[0];
  if (!best) return null;
  const runnerUp = ranked[1]?.score ?? 0;
  if (best.score >= 96) return best;
  if (ranked.length === 1 && best.score >= 56) return best;
  if (best.score >= 80 && best.score - runnerUp >= 8) return best;
  return null;
}

export function searchPrograms(
  query: string,
  titles: readonly string[],
  limit = 20,
): { id: string; label: string }[] {
  const aliases: Record<string, string[]> = {};
  for (const title of titles) aliases[title] = programAliases(title);
  const options = titles.map((title) => ({ id: title, label: title }));
  return rankOptions(query, options, aliases)
    .filter((item) => item.score > 1)
    .slice(0, limit)
    .map((item) => ({ id: item.id, label: item.label }));
}

const FIELD_BY_PROGRAM: Array<{ test: RegExp; fieldId: string; levelId?: string }> = [
  { test: /nurs|bsn|post-rn|post rn/, fieldId: "nursing" },
  { test: /pharm/, fieldId: "pharmacy", levelId: "professional" },
  { test: /physical therapy|\bdpt\b/, fieldId: "physical_therapy", levelId: "professional" },
  { test: /veterinary|\bdvm\b/, fieldId: "veterinary_medicine", levelId: "professional" },
  { test: /\bmbbs\b/, fieldId: "medicine", levelId: "professional" },
  { test: /acca|chartered account/, fieldId: "accounting", levelId: "professional_cert" },
];

export function inferProgramSelection(title: string): { fieldId: string; levelId?: string } | null {
  const folded = norm(title);
  for (const rule of FIELD_BY_PROGRAM) {
    if (rule.test.test(folded)) return { fieldId: rule.fieldId, levelId: rule.levelId };
  }
  return null;
}
