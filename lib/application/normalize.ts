import type { Currency } from "./types";

const PK_MOBILE = /^\+923\d{9}$/;
const E164 = /^\+[1-9]\d{7,14}$/;

export type PhoneResult =
  | { ok: true; e164: string; raw: string }
  | { ok: false; raw: string; reason: string };

/** First recognizable number in a cell, stored as E.164. Blank stays blank. */
export function normalizePhone(input: string): PhoneResult {
  const raw = input.trim();
  if (!raw) return { ok: false, raw, reason: "empty" };
  const chunk = raw.split(/\s*(?:\/|;|\band\b)\s*/i)[0] ?? raw;
  let token = chunk.replace(/[^\d+]/g, "");
  if (token.startsWith("00")) token = `+${token.slice(2)}`;

  if (token.startsWith("+")) {
    const body = token.slice(1).replace(/\D/g, "");
    const e164 = `+${body}`;
    if (!E164.test(e164)) return { ok: false, raw, reason: "invalid" };
    return { ok: true, e164, raw };
  }

  const digits = token.replace(/\D/g, "");
  if (/^03\d{9}$/.test(digits)) return { ok: true, e164: `+92${digits.slice(1)}`, raw };
  if (/^923\d{9}$/.test(digits)) return { ok: true, e164: `+${digits}`, raw };
  if (/^3\d{9}$/.test(digits)) return { ok: true, e164: `+92${digits}`, raw };
  if (/^0\d{8,11}$/.test(digits)) return { ok: true, e164: `+92${digits.slice(1)}`, raw };
  return { ok: false, raw, reason: "invalid" };
}

export function isPakistanMobile(e164: string): boolean {
  return PK_MOBILE.test(e164);
}

export function isE164(e164: string): boolean {
  return E164.test(e164);
}

export function normalizeCnic(input: string): { ok: boolean; digits: string; raw: string } {
  const raw = input.trim();
  const digits = raw.replace(/\D/g, "");
  return { ok: digits.length === 13, digits, raw };
}

export function formatCnic(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

export type MoneyPhrase = {
  amount: number | null;
  currency: Currency;
  period: "month" | "semester" | "year" | null;
  value_state: "known" | "zero" | "unknown";
  raw: string;
};

function detectCurrency(lower: string): Currency {
  if (/£|gbp/.test(lower)) return "GBP";
  if (/\bcad\b|c\$/.test(lower)) return "CAD";
  if (/\$|usd/.test(lower)) return "USD";
  return "PKR";
}

function detectPeriod(lower: string): MoneyPhrase["period"] {
  if (/year|\/yr|annual|per annum|\bp\.a\b/.test(lower)) return "year";
  if (/semester/.test(lower)) return "semester";
  if (/month|\/mo|per month|\bp\.m\b/.test(lower)) return "month";
  return null;
}

/**
 * Historical free-text money. A blank string is unknown, never zero.
 * "35 thousand", "2 lack and 75 thousand", "£20,000/year" are parsed when the
 * number and scale are explicit.
 */
export function parseMoneyPhrase(input: string): MoneyPhrase {
  const raw = input.trim();
  const currency = detectCurrency(raw.toLowerCase());
  const period = detectPeriod(raw.toLowerCase());
  if (!raw) {
    return { amount: null, currency, period, value_state: "unknown", raw };
  }
  const lower = raw.toLowerCase().replace(/,/g, "").replace(/\s+/g, " ");
  if (
    /^(0|zero|nil|nill|none|no income|nothing)$/.test(lower) ||
    /^(pkr|rs|rupees?)\.?\s*0$/.test(lower)
  ) {
    return { amount: 0, currency: currency === "USD" && !/\$|usd/.test(lower) ? "PKR" : currency, period, value_state: "zero", raw };
  }

  const unit: Record<string, number> = {
    k: 1_000,
    thousand: 1_000,
    thousands: 1_000,
    lac: 100_000,
    lakh: 100_000,
    lakhs: 100_000,
    lack: 100_000,
    lacks: 100_000,
    crore: 10_000_000,
    million: 1_000_000,
  };
  let total = 0;
  let found = false;
  const pattern = /(\d+(?:\.\d+)?)\s*(thousand|thousands|lakh|lakhs|lac|lack|lacks|crore|million|k)?/gi;
  for (const match of lower.matchAll(pattern)) {
    const value = Number(match[1]);
    if (!Number.isFinite(value)) continue;
    const scale = match[2] ? unit[match[2].toLowerCase()] ?? 1 : 1;
    total += value * scale;
    found = true;
  }
  if (!found) {
    return { amount: null, currency, period, value_state: "unknown", raw };
  }
  const amount = Math.round(total);
  if (amount === 0) return { amount: 0, currency, period, value_state: "zero", raw };
  return { amount, currency, period, value_state: "known", raw };
}

export type ResultPhrase = {
  type: "CGPA" | "Percentage" | "Grade" | "Marks" | null;
  value: number | null;
  max: number | null;
  grade: string | null;
  ambiguous: boolean;
  raw: string;
};

/** Historical free-text results. The live form asks for type, value, and scale separately. */
export function parseResultPhrase(input: string): ResultPhrase {
  const raw = input.trim();
  const base: ResultPhrase = {
    type: null,
    value: null,
    max: null,
    grade: null,
    ambiguous: true,
    raw,
  };
  if (!raw) return base;
  const grade = raw.match(/^([A-F][+-]?)$/i);
  if (grade?.[1]) {
    return { ...base, type: "Grade", grade: grade[1].toUpperCase(), ambiguous: false };
  }
  const marks = raw.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (marks?.[1] && marks[2]) {
    return {
      ...base,
      type: "Marks",
      value: Number(marks[1]),
      max: Number(marks[2]),
      ambiguous: false,
    };
  }
  const percent = raw.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)/i);
  if (percent?.[1]) {
    return { ...base, type: "Percentage", value: Number(percent[1]), max: 100, ambiguous: false };
  }
  const gpa = raw.match(/(\d+(?:\.\d+)?)\s*(?:cgpa|gpa)/i);
  if (gpa?.[1]) {
    const scale = raw.match(/(?:out of|\/)\s*(4|5)/i);
    return {
      ...base,
      type: "CGPA",
      value: Number(gpa[1]),
      max: scale?.[1] ? Number(scale[1]) : null,
      ambiguous: !scale,
    };
  }
  return base;
}

export function ageInYears(dob: string, now: Date): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const born = new Date(Date.UTC(year, month - 1, day));
  if (
    born.getUTCFullYear() !== year ||
    born.getUTCMonth() !== month - 1 ||
    born.getUTCDate() !== day
  ) {
    return null;
  }
  let age = now.getUTCFullYear() - year;
  const monthDelta = now.getUTCMonth() + 1 - month;
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < day)) age -= 1;
  return age;
}

export function addMonths(ym: string, months: number): string | null {
  const match = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1 + months, 1));
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 60);
  return base || "other_value";
}
