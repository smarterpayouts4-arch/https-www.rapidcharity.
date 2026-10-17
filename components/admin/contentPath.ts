import type { SiteContent } from "@/lib/content/schema";
import type { ContentPath } from "./config";

export function setContentAtPath(content: SiteContent, path: ContentPath, value: unknown): SiteContent {
  const clone = structuredClone(content) as Record<string, unknown>;
  let target: Record<string | number, unknown> = clone;
  for (let index = 0; index < path.length - 1; index += 1) {
    target = target[path[index]] as Record<string | number, unknown>;
  }
  target[path[path.length - 1]] = value;
  return clone as SiteContent;
}

export function labelFromKey(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_]/g, " ").replace(/^./, (c) => c.toUpperCase());
}
