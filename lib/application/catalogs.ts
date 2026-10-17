import degreesJson from "@/data/application/degrees.json";
import schoolsJson from "@/data/application/schools.json";
import {
  CITIES,
  DENOMINATIONS,
  HEARD_ABOUT,
  OCCUPATIONS,
  RELIGION_IDS,
  RELIGIONS,
  RELATIONSHIPS,
  SUPPORT_PROVIDERS,
} from "./constants";
import { slugify } from "./normalize";
import type { PromotedList, PromotedOption } from "./types";

export type CatalogOption = { id: string; label: string };

function fromLabels(labels: readonly string[]): CatalogOption[] {
  return labels.map((label) => ({
    id: label === "Other" || label.startsWith("Other ") ? "other" : slugify(label),
    label: label.startsWith("Other") ? "Other (please specify)" : label,
  }));
}

export const schoolOptions: CatalogOption[] = [
  ...schoolsJson.options.map((option) => ({ id: option.id, label: option.name })),
  { id: schoolsJson.other.id, label: schoolsJson.other.name },
];

export const levelOptions: CatalogOption[] = degreesJson.levels.map((level) => ({
  id: level.id,
  label: level.label,
}));

export const fieldOptions: CatalogOption[] = degreesJson.fieldsOfStudy.map((field) => ({
  id: field.id,
  label: field.label,
}));

export const streamOptions: CatalogOption[] = degreesJson.previousStudyStreams.map((label) => ({
  id: label.startsWith("Other") ? "other" : slugify(label),
  label,
}));

export const programTitles: string[] = [...degreesJson.programs];

export const cityOptions = fromLabels([...CITIES, "Other"]);
export const occupationOptions = fromLabels(OCCUPATIONS);
export const religionOptions: CatalogOption[] = RELIGIONS.map((label) => ({
  id: RELIGION_IDS[label],
  label: label === "Other" ? "Other (please specify)" : label,
}));
export const heardAboutOptions = fromLabels(HEARD_ABOUT);
export const denominationOptions = fromLabels(DENOMINATIONS);
export const relationshipOptions = fromLabels(RELATIONSHIPS);
export const providerOptions = fromLabels(SUPPORT_PROVIDERS);

export const OPTION_LISTS = {
  schools: schoolOptions,
  fields: fieldOptions,
  levels: levelOptions,
  streams: streamOptions,
  cities: cityOptions,
  occupations: occupationOptions,
  religions: religionOptions,
  denominations: denominationOptions,
  heard_about: heardAboutOptions,
  relationships: relationshipOptions,
  providers: providerOptions,
} as const satisfies Record<PromotedList, CatalogOption[]>;

export function withPromoted(
  list: CatalogOption[],
  promoted: PromotedOption[],
  key: PromotedList,
): CatalogOption[] {
  const extras = promoted.filter(
    (item) => item.list === key && !list.some((option) => option.id === item.id),
  );
  const other = list.filter((option) => option.id === "other");
  const rest = list.filter((option) => option.id !== "other");
  return [
    ...rest,
    ...extras.map((item) => ({ id: item.id, label: item.label })),
    ...other,
  ];
}

export function allowedIds(list: CatalogOption[], promoted: PromotedOption[], key: PromotedList): Set<string> {
  return new Set(withPromoted(list, promoted, key).map((option) => option.id));
}
