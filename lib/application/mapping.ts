export type MappingRow = {
  raw_value: string;
  count: string;
  canonical: string;
  field_of_study: string;
  canonical_program: string;
  match_method: string;
};

/** Small CSV reader for the reference mapping files. Quoted commas are preserved. */
export function parseMappingCsv(text: string): MappingRow[] {
  const rows = parseRows(text);
  const [header, ...body] = rows;
  if (!header) return [];
  return body.filter((row) => row.some((cell) => cell.trim())).map((row) => {
    const record: Record<string, string> = {};
    header.forEach((key, index) => {
      record[key] = row[index] ?? "";
    });
    return {
      raw_value: record.raw_value ?? "",
      count: record.count ?? "",
      canonical: record.canonical ?? "",
      field_of_study: record.field_of_study ?? "",
      canonical_program: record.canonical_program ?? "",
      match_method: record.match_method ?? "",
    };
  });
}

export function isInvalidMapping(row: MappingRow): boolean {
  return row.canonical === "(none / invalid answer)" || row.field_of_study === "(none / invalid answer)";
}

function parseRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    if (char !== "\r") cell += char;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
