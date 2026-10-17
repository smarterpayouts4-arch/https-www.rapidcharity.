import styles from "@/app/admin/admin.module.css";
import type { SiteContent } from "@/lib/content/schema";
import type { ContentChange } from "./config";
import { ContentFields } from "./ContentFields";

/**
 * Fields kept in storage but no longer rendered on the site: the live values
 * are computed from Dates & announcements. Hidden from the normal editors and
 * shown here in a collapsed group so nothing is deleted.
 */
export const LEGACY_PATHS = [
  "applicationCard.title",
  "applicationCard.deadlineLabel",
  "applicationCard.deadlineValue",
  "apply.deadlines",
  "verified.applicationCycle",
  "verified.applicationDeadline",
] as const;

const LEGACY = new Set<string>(LEGACY_PATHS);

export function isLegacyPath(path: Array<string | number>): boolean {
  return LEGACY.has(path.join("."));
}

function valueAt(content: unknown, dotted: string): unknown {
  return dotted.split(".").reduce<unknown>((acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined), content);
}

export function LegacyFields({
  content,
  onChange,
  prefixes,
  disabled = false,
}: {
  content: SiteContent;
  onChange: ContentChange;
  prefixes: string[];
  disabled?: boolean;
}) {
  const paths = LEGACY_PATHS.filter((item) => prefixes.some((prefix) => item.startsWith(`${prefix}.`)));
  if (!paths.length) return null;
  return (
    <details className={styles.legacy} data-testid="legacy-fields">
      <summary>Legacy (not shown on site)</summary>
      <p className={styles.hint}>
        Kept for reference only. The site now shows the dates from the Dates &amp; announcements tab.
      </p>
      {paths.map((dotted) => (
        <ContentFields
          key={dotted}
          value={valueAt(content, dotted)}
          path={dotted.split(".")}
          onChange={onChange}
          disabled={disabled}
          showLegacy
        />
      ))}
    </details>
  );
}
