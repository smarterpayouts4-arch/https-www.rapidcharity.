import styles from "@/app/admin/admin.module.css";

export function Field({
  label,
  value,
  onChange,
  multiline,
  disabled,
  mono,
  id: idProp,
  type = "text",
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  disabled?: boolean;
  mono?: boolean;
  id?: string;
  type?: "text" | "date" | "url";
  hint?: string;
}) {
  const id = idProp ?? label.replace(/\s+/g, "-").toLowerCase();
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          id={id}
          type={type}
          className={mono ? styles.pathMono : undefined}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {hint ? <p className={styles.hint}>{hint}</p> : null}
    </div>
  );
}
