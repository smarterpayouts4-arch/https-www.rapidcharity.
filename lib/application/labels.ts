import type { CatalogOption } from "./catalogs";
import type { Choice } from "./types";

export function optionLabel(options: CatalogOption[], choice: Choice | null): string {
  if (!choice) return "";
  if (choice.option_id === "other") return choice.other_text.trim();
  return options.find((option) => option.id === choice.option_id)?.label ?? choice.other_text.trim();
}
