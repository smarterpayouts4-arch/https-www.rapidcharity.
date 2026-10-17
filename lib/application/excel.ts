import ExcelJS from "exceljs";
import { cityOptions } from "./catalogs";
import { assignExportCategory, categorySheet, SUMMARY_COLUMNS, summaryKey } from "./exportCategory";
import { applicationToSheetRow, awardOf, termHeaders } from "./excelRows";
import { optionLabel } from "./labels";
import type { StoredApplication } from "./types";

const PINK = "FFFDD8FB";
const YELLOW = "FFFFFF99";
const SHEET_ORDER = ["medical", "nursing", "undergrads", "graduates", "post_grads", "kc", "fccu", "business", "blind"];

const STREAMS = ["F.Sc", "BSN", "BBA", "BS", "BA", "MS", "M.Phil", "DPT", "PHARM D", "MBBS", "DVM", "PhD", "ACCA", "CA"];

export function studyStream(item: StoredApplication): string {
  const field = item.field_of_study.option_id;
  const level = item.degree_level.option_id;
  const title = `${item.program_title} ${item.program_track}`.toLowerCase();
  if (field === "nursing" || /bsn|nursing/.test(title)) return "BSN";
  if (field === "physical_therapy" || title.includes("dpt")) return "DPT";
  if (field === "pharmacy" || title.includes("pharm")) return "PHARM D";
  if (field === "medicine" || title.includes("mbbs")) return "MBBS";
  if (field === "veterinary_medicine" || title.includes("dvm")) return "DVM";
  if (level === "phd") return "PhD";
  if (level === "mphil") return "M.Phil";
  if (level === "master") return "MS";
  if (level === "professional_cert") return title.includes("acca") ? "ACCA" : "CA";
  if (level === "intermediate") return "F.Sc";
  if (
    field === "accounting" ||
    field === "business" ||
    field === "business_administration" ||
    field === "finance" ||
    field === "marketing" ||
    field === "economics"
  ) {
    return "BBA";
  }
  if (["english", "urdu", "history", "education", "sociology", "psychology", "political_science"].includes(field)) {
    return "BA";
  }
  return "BS";
}

export function resolvedCategory(item: StoredApplication): string {
  if (item.review.export_category) return item.review.export_category;
  return assignExportCategory({
    disability: item.disability,
    institutionId: item.current_institution.option_id,
    fieldId: item.field_of_study.option_id,
    levelId: item.degree_level.option_id,
  });
}

function paint(cell: ExcelJS.Cell, argb: string) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function writeCategorySheet(workbook: ExcelJS.Workbook, sheetName: string, title: string, rows: StoredApplication[]) {
  const sheet = workbook.addWorksheet(sheetName);
  const headers = termHeaders(rows[0]?.terms.map((term) => term.term) ?? ["Spring 2026", "Fall 2026", "Spring 2027", "Fall 2027", "Spring 2028"]);
  sheet.mergeCells(1, 1, 1, headers.length);
  sheet.getCell(1, 1).value = title;
  sheet.getCell(1, 1).font = { bold: true, size: 14 };
  sheet.mergeCells(2, 1, 2, headers.length);
  sheet.getCell(2, 1).value = sheetName;
  sheet.getCell(2, 1).font = { bold: true, size: 12 };
  headers.forEach((header, index) => {
    const cell = sheet.getCell(3, index + 1);
    cell.value = header;
    cell.font = { bold: true };
  });
  rows.forEach((item, index) => {
    const row = applicationToSheetRow(item, index + 1);
    const excelRow = 5 + index;
    row.values.forEach((value, column) => {
      const cell = sheet.getCell(excelRow, column + 1);
      cell.value = value;
      cell.alignment = { wrapText: true, vertical: "top" };
    });
    if (row.female) paint(sheet.getCell(excelRow, 4), PINK);
    for (const column of row.yellowColumns) paint(sheet.getCell(excelRow, column), YELLOW);
  });
  sheet.getColumn(1).width = 8;
  sheet.getColumn(2).width = 28;
  sheet.getColumn(3).width = 28;
  sheet.views = [{ state: "frozen", ySplit: 4 }];
}

function bucketOf(item: StoredApplication): string {
  const category = resolvedCategory(item);
  return summaryKey(category, item.field_of_study.option_id, item.degree_level.option_id);
}

export function summaryMatrix(items: StoredApplication[], usdRate: number): { labels: string[]; rows: (string | number)[][] } {
  const labels = SUMMARY_COLUMNS.map((column) => column.label);
  const groups = Object.fromEntries(SUMMARY_COLUMNS.map((column) => [column.key, [] as StoredApplication[]])) as Record<
    string,
    StoredApplication[]
  >;
  for (const item of items) {
    const key = bucketOf(item);
    (groups[key] ?? groups.graduates)?.push(item);
  }
  const line = (label: string, pick: (group: StoredApplication[]) => number) => [
    label,
    ...SUMMARY_COLUMNS.map((column) => pick(groups[column.key] ?? [])),
  ];
  const complete = (group: StoredApplication[]) => group.filter((item) => item.review.workflow !== "incomplete");
  const approved = (group: StoredApplication[]) => group.filter((item) => item.review.workflow === "approved");
  const rows = [
    line("Approved last term", () => 0),
    line("Did not re-apply", (group) => group.filter((item) => item.review.workflow === "did_not_reapply").length),
    line("Pass-outs", (group) => group.filter((item) => item.review.workflow === "pass_out").length),
    line("Received online applications", (group) => group.length),
    line(
      "Continuing w/ complete info",
      (group) => complete(group).filter((item) => item.applicant_type === "continuing").length,
    ),
    line("New w/ complete info", (group) => complete(group).filter((item) => item.applicant_type === "new").length),
    line("Total complete", (group) => complete(group).length),
    line("Approved", (group) => approved(group).length),
    line("Approved F", (group) => approved(group).filter((item) => item.gender === "Female").length),
    line("Approved M", (group) => approved(group).filter((item) => item.gender === "Male").length),
    line("50% fee PKR", (group) => approved(group).reduce((sum, item) => sum + awardOf(item).amount, 0)),
    line("50% fee USD", (group) =>
      Math.round(approved(group).reduce((sum, item) => sum + awardOf(item).amount, 0) / usdRate),
    ),
  ];
  return { labels, rows };
}

export async function buildWorkbook(
  items: StoredApplication[],
  options?: { usdRate?: number; cycleLabel?: string },
): Promise<Buffer> {
  const usdRate = options?.usdRate && options.usdRate > 0 ? options.usdRate : 278;
  const cycleLabel = options?.cycleLabel ?? "Spring 2027";
  const title = `Reconciliation And Peace Innovative Development – Applicants for ${cycleLabel}`;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Rapid Charity";
  const approved = items.filter((item) => item.review.workflow === "approved");
  for (const id of SHEET_ORDER) {
    const sheetName = categorySheet(id);
    writeCategorySheet(
      workbook,
      sheetName,
      title,
      approved.filter((item) => resolvedCategory(item) === id),
    );
  }
  const summary = workbook.addWorksheet("Summary");
  summary.getCell(1, 1).value = title;
  summary.getCell(2, 1).value = `Approved last term is 0 until a prior-cycle workbook is imported. USD rate: ${usdRate} PKR per 1 USD.`;
  const matrix = summaryMatrix(items, usdRate);
  summary.getCell(3, 1).value = "Metric";
  matrix.labels.forEach((label, index) => {
    summary.getCell(3, index + 2).value = label;
    summary.getCell(3, index + 2).font = { bold: true };
  });
  matrix.rows.forEach((row, rowIndex) => {
    row.forEach((value, column) => {
      summary.getCell(4 + rowIndex, column + 1).value = value;
    });
  });

  const cities = workbook.addWorksheet("Cities");
  cities.getCell(1, 1).value = title;
  cities.getCell(3, 1).value = "City";
  cities.getCell(3, 2).value = "Students";
  const cityCounts = new Map<string, number>();
  const streamCounts = new Map<string, number>(STREAMS.map((stream) => [stream, 0]));
  for (const item of approved) {
    const city = optionLabel(cityOptions, item.city) || "Unknown";
    cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
    const stream = studyStream(item);
    streamCounts.set(stream, (streamCounts.get(stream) ?? 0) + 1);
  }
  [...cityCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .forEach(([city, count], index) => {
      cities.getCell(4 + index, 1).value = city;
      cities.getCell(4 + index, 2).value = count;
    });
  cities.getCell(3, 4).value = "Stream";
  cities.getCell(3, 5).value = "Students";
  STREAMS.forEach((stream, index) => {
    cities.getCell(4 + index, 4).value = stream;
    cities.getCell(4 + index, 5).value = streamCounts.get(stream) ?? 0;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
