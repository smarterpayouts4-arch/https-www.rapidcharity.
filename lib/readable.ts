/** Titles, abbreviations and initials that end in a period but do not end a sentence. */
const NOT_A_SENTENCE_END = /(?:^|[\s(])(?:Mr|Mrs|Ms|Mx|Dr|Rev|Fr|Sr|Jr|St|Prof|Hon|Rt|Mt|No|Nos|vs|etc|e\.g|i\.e|[A-Z])\.$/;

/** Split on sentence boundaries without breaking decimals such as 3.5, titles such as
 *  "Ms." / "Rev. Dr." or initials such as "Jonathan S. Addleton". */
export function splitSentences(text: string): string[] {
  const parts = text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+(?=[A-Z“"'])/);
  const sentences: string[] = [];
  for (const raw of parts) {
    const part = raw.trim();
    if (!part) continue;
    const previous = sentences[sentences.length - 1];
    if (previous !== undefined && NOT_A_SENTENCE_END.test(previous)) {
      sentences[sentences.length - 1] = `${previous} ${part}`;
    } else {
      sentences.push(part);
    }
  }
  return sentences.length > 0 ? sentences : [text.trim()];
}

export function leadIn(sentence: string): { lead: string; rest: string } {
  const comma = sentence.indexOf(",");
  if (comma >= 12 && comma <= 72) {
    return { lead: sentence.slice(0, comma), rest: sentence.slice(comma) };
  }
  const words = sentence.split(" ");
  if (words.length > 12) {
    return { lead: words.slice(0, 6).join(" "), rest: ` ${words.slice(6).join(" ")}` };
  }
  return { lead: sentence, rest: "" };
}

export function isKeyFact(text: string): boolean {
  return /\b(deadline|last date|GPA|90th percentile|90%|US\$|\$\d|501\(c\)|tax-deductible|eligible|eligibility)\b/i.test(
    text,
  );
}
