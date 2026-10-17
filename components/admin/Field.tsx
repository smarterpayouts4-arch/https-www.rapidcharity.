import styles from "@/app/admin/admin.module.css";

export function Field({
  label,
  value,
  onChange,
  multiline,
  disabled,
  mono,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  disabled?: boolean;
  mono?: boolean;
}) {
  const id = label.replace(/\s+/g, "-").toLowerCase();
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
          className={mono ? styles.pathMono : undefined}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}
