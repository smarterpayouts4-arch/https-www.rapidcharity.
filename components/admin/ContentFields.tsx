import styles from "@/app/admin/admin.module.css";
import type { ContentChange, ContentPath } from "./config";
import { labelFromKey } from "./contentPath";

type Props = { value: unknown; path: ContentPath; onChange: ContentChange; disabled?: boolean; label?: string };
const LONG_KEYS = /(body|lead|intro|description|paragraph|quote|tagline|subtitle|message|script|note|text)/i;
const MONO_KEYS = /(href|src|path|image|poster|url)/i;

export function ContentFields({ value, path, onChange, disabled = false, label }: Props) {
  const key = String(path[path.length - 1] ?? label ?? "field");
  const displayLabel = label ?? labelFromKey(key);
  const id = `field-${path.join("-")}`.replace(/[^a-zA-Z0-9_-]/g, "-");

  if (typeof value === "boolean") {
    return <label className={styles.toggle}><input type="checkbox" checked={value} disabled={disabled}
      onChange={(e) => onChange(path, e.target.checked)} />{displayLabel}</label>;
  }
  if (typeof value === "string" || typeof value === "number") {
    const text = String(value);
    const multiline = LONG_KEYS.test(key) || text.length > 120 || text.includes("\n");
    return <div className={styles.field}><label htmlFor={id}>{displayLabel}</label>
      {multiline ? <textarea id={id} value={text} disabled={disabled} onChange={(e) => onChange(path, e.target.value)} />
        : <input id={id} className={MONO_KEYS.test(key) ? styles.pathMono : undefined} value={text}
          disabled={disabled} onChange={(e) => onChange(path, e.target.value)} />}
    </div>;
  }
  if (Array.isArray(value)) {
    return <fieldset className={styles.objectGroup}><legend>{displayLabel}</legend>
      {value.map((item, index) => <div className={styles.arrayItem} key={`${path.join(".")}-${index}`}>
        <ContentFields value={item} path={[...path, index]} onChange={onChange} disabled={disabled}
          label={`${displayLabel} ${index + 1}`} />
      </div>)}
    </fieldset>;
  }
  if (value && typeof value === "object") {
    return <fieldset className={styles.objectGroup}><legend>{displayLabel}</legend>
      {Object.entries(value as Record<string, unknown>).map(([childKey, child]) =>
        <ContentFields key={childKey} value={child} path={[...path, childKey]} onChange={onChange} disabled={disabled} />)}
    </fieldset>;
  }
  return null;
}
