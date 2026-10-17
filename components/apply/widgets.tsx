"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "@/app/apply/form/form.module.css";
import type { CatalogOption } from "@/lib/application/catalogs";
import { formatCnic } from "@/lib/application/normalize";
import { rankOptions, resolveTypedOption } from "@/lib/application/search";
import type { Choice, Money } from "@/lib/application/types";

export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p className={styles.error} id={id} role="alert">
      <svg className={styles.errorIcon} viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M8 4.2v4.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="8" cy="11.4" r="0.7" fill="currentColor" />
      </svg>
      {message}
    </p>
  );
}

/** Turns Urdu / Arabic-Indic digits (۰-۹, ٠-٩) into 0-9 so numeric fields accept either keyboard. */
export function asciiDigits(value: string): string {
  return value
    .replace(/[\u06F0-\u06F9]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));
}

/** 75000 -> "75,000". Grouped in thousands, the way amounts are printed on vouchers and salary slips. */
export function groupThousands(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/** Reads a typed whole amount: drops commas, spaces and "Rs"; null for empty; undefined when it is not a number. */
export function parseWhole(raw: string): number | null | undefined {
  const cleaned = asciiDigits(raw).replace(/[,\s]/g, "").replace(/^(rs\.?|pkr)/i, "");
  if (!cleaned) return null;
  if (!/^\d+$/.test(cleaned)) return undefined;
  return Number(cleaned);
}

type InputMode = "text" | "numeric" | "decimal" | "tel" | "email" | "none";

export function TextField({
  label,
  value,
  onChange,
  error,
  type = "text",
  hint,
  autoComplete,
  maxLength,
  list,
  field,
  placeholder,
  inputMode,
  autoCapitalize,
  spellCheck,
  dir,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  hint?: string;
  autoComplete?: string;
  maxLength?: number;
  list?: string;
  field?: string;
  placeholder?: string;
  inputMode?: InputMode;
  autoCapitalize?: "off" | "none" | "on" | "sentences" | "words" | "characters";
  spellCheck?: boolean;
  /** "auto" lets Urdu script typed into a field read right to left while Latin text stays left to right. */
  dir?: "auto" | "ltr";
}) {
  const id = useId();
  const described = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className={styles.field} data-field={field} data-invalid={error ? "true" : undefined}>
      <label htmlFor={id}>{label}</label>
      {hint ? <p className={styles.hint} id={`${id}-hint`}>{hint}</p> : null}
      <input
        id={id}
        className={styles.control}
        type={type}
        value={value}
        autoComplete={autoComplete}
        maxLength={maxLength}
        list={list}
        placeholder={placeholder}
        inputMode={inputMode}
        autoCapitalize={autoCapitalize}
        spellCheck={spellCheck}
        dir={dir ?? (type === "text" ? "auto" : undefined)}
        aria-invalid={error ? true : undefined}
        aria-describedby={described}
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  error,
  maxLength,
  field,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  maxLength: number;
  field?: string;
  hint?: string;
}) {
  const id = useId();
  const described = [hint ? `${id}-hint` : "", `${id}-count`, error ? `${id}-error` : ""].filter(Boolean).join(" ");
  return (
    <div className={styles.field} data-field={field} data-invalid={error ? "true" : undefined}>
      <div className={styles.labelRow}>
        <label htmlFor={id}>{label}</label>
        <span className={styles.counter} id={`${id}-count`}>
          {value.trim().length} / {maxLength}
        </span>
      </div>
      {hint ? <p className={styles.hint} id={`${id}-hint`}>{hint}</p> : null}
      <textarea
        id={id}
        className={styles.textarea}
        value={value}
        maxLength={maxLength}
        dir="auto"
        aria-invalid={error ? true : undefined}
        aria-describedby={described}
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

type Option = { id: string; label: string; detail?: string };

/** Short answers (up to five options, no detail line) are shown as tappable chips that wrap. */
function fitsChips(options: Option[]): boolean {
  return options.length <= 5 && options.every((option) => !option.detail && option.label.length <= 22);
}

export function RadioField({
  legend,
  name,
  value,
  options,
  onChange,
  error,
  hint,
  field,
}: {
  legend: string;
  name: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  field?: string;
}) {
  const id = useId();
  if (fitsChips(options)) {
    return <SegmentedField legend={legend} name={name} value={value} options={options} onChange={onChange} error={error} hint={hint} field={field} />;
  }
  return (
    <fieldset className={styles.radios} data-field={field} data-invalid={error ? "true" : undefined} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} tabIndex={error ? -1 : undefined}>
      <legend className={styles.legend}>{legend}</legend>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
      {options.map((option) => (
        <label key={option.id} className={styles.choice}>
          <input
            type="radio"
            name={name}
            value={option.id}
            checked={value === option.id}
            onChange={() => onChange(option.id)}
          />
          <span>
            {option.label}
            {option.detail ? <span className={styles.detail}>{option.detail}</span> : null}
          </span>
        </label>
      ))}
      <FieldError id={`${id}-error`} message={error} />
    </fieldset>
  );
}

export function SelectField({
  label,
  value,
  options,
  onChange,
  error,
  field,
  autoComplete,
  hint,
}: {
  label: string;
  value: string;
  options: Array<{ id: string; label: string }>;
  onChange: (value: string) => void;
  error?: string;
  field?: string;
  autoComplete?: string;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className={styles.field} data-field={field} data-invalid={error ? "true" : undefined}>
      <label htmlFor={id}>{label}</label>
      {hint ? <p className={styles.hint} id={`${id}-hint`}>{hint}</p> : null}
      <select
        id={id}
        className={styles.control}
        value={value}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Choose</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

export function SelectOther({
  label,
  options,
  value,
  onChange,
  error,
  hint,
  aliases,
  field,
  autoComplete,
}: {
  label: string;
  options: CatalogOption[];
  value: Choice;
  onChange: (value: Choice) => void;
  error?: string;
  hint?: string;
  aliases?: Record<string, string[]>;
  field?: string;
  autoComplete?: string;
}) {
  const id = useId();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const skipOpen = useRef(false);
  const typedRef = useRef("");
  const commitRef = useRef<(raw: string) => void>(() => {});
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.id === value.option_id);
  const other = options.find((option) => option.id === "other");
  const ranked = query.trim()
    ? rankOptions(query, options, aliases).slice(0, 30)
    : options.filter((option) => option.id !== "other");
  const filtered = other ? [...ranked, other] : ranked;

  function commitTyped(raw: string) {
    const typed = raw.trim();
    if (!typed) return;
    const exact = options.find(
      (option) => option.label.localeCompare(typed, undefined, { sensitivity: "accent" }) === 0,
    );
    if (exact?.id === "other") {
      onChange({ option_id: "other", other_text: value.other_text });
      return;
    }
    const match = exact ?? resolveTypedOption(typed, options, aliases);
    if (match) {
      onChange({ option_id: match.id, other_text: "" });
      return;
    }
    if (other) onChange({ option_id: "other", other_text: typed.slice(0, 120) });
  }

  useEffect(() => {
    commitRef.current = commitTyped;
  });

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      const root = rootRef.current;
      if (!root || root.contains(event.target as Node)) return;
      const input = root.querySelector<HTMLInputElement>("input[role='combobox']");
      const raw = input?.value.trim() ? input.value : typedRef.current;
      commitRef.current(raw);
      typedRef.current = "";
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className={styles.field} ref={rootRef} data-field={field} data-invalid={error ? "true" : undefined}>
      <label htmlFor={id}>{label}</label>
      {hint ? <p className={styles.hint} id={`${id}-hint`}>{hint}</p> : null}
      <div className={styles.combo}>
        <input
          id={id}
          className={styles.control}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete={autoComplete}
          placeholder="Search or choose"
          value={open ? query : selected?.label ?? ""}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined}
          onFocus={() => {
            if (skipOpen.current) {
              skipOpen.current = false;
              return;
            }
            setOpen(true);
          }}
          onBlur={(event) => {
            const raw = event.currentTarget.value.trim() ? event.currentTarget.value : typedRef.current;
            commitTyped(raw);
            typedRef.current = "";
            setOpen(false);
            setQuery("");
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== "Tab") return;
            const raw = event.currentTarget.value.trim() ? event.currentTarget.value : typedRef.current;
            commitTyped(raw);
            if (event.key === "Enter") event.preventDefault();
            setOpen(false);
            setQuery("");
          }}
          onChange={(event) => {
            const typed = event.target.value;
            typedRef.current = typed;
            setQuery(typed);
            setOpen(true);
            const match = resolveTypedOption(typed, options, aliases);
            if (match && match.id !== value.option_id) onChange({ option_id: match.id, other_text: "" });
          }}
        />
        {selected && !open ? (
          <button
            type="button"
            className={styles.clear}
            aria-label={`Clear ${label}`}
            onClick={() => onChange({ option_id: "", other_text: "" })}
          >
            ×
          </button>
        ) : null}
        {open ? (
          <div className={styles.menu} role="listbox" id={listId}>
            {filtered.length === 0 ? <p className={styles.hint}>No matches. Choose Other if it is not listed.</p> : null}
            {filtered.map((option) => (
              <button
                key={option.id}
                type="button"
                className={styles.option}
                role="option"
                aria-selected={option.id === value.option_id}
                data-active={option.id === value.option_id}
                onMouseDown={(event) => {
                  event.preventDefault();
                  skipOpen.current = true;
                }}
                onClick={() => {
                  typedRef.current = "";
                  onChange({
                    option_id: option.id,
                    other_text: option.id === "other" ? value.other_text : "",
                  });
                  setOpen(false);
                  setQuery("");
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {value.option_id === "other" ? (
        <input
          className={styles.control}
          value={value.other_text}
          maxLength={120}
          placeholder="Please specify"
          aria-label={`${label} other`}
          data-field={field ? `${field.replace(/\.option_id$/, "")}.other_text` : undefined}
          onChange={(event) => onChange({ option_id: "other", other_text: event.target.value })}
        />
      ) : null}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

export function PhoneField({
  label,
  value,
  onChange,
  error,
  hint,
  field,
  autoComplete = "off",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  field?: string;
  /** "tel" only for the applicant's own number, so the browser does not offer it for a pastor or a reference. */
  autoComplete?: string;
}) {
  return (
    <TextField
      label={label}
      field={field}
      value={value}
      onChange={(next) => onChange(asciiDigits(next))}
      error={error}
      type="tel"
      inputMode="tel"
      autoComplete={autoComplete}
      placeholder="0300 1234567"
      hint={hint}
    />
  );
}

export function CnicField({
  value,
  onChange,
  error,
  field,
  hint = "B-Form number if you are under 18.",
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  field?: string;
  hint?: string;
}) {
  return (
    <TextField
      label="National ID (CNIC)"
      field={field}
      value={value}
      error={error}
      type="text"
      dir="ltr"
      autoComplete="off"
      placeholder="35202-1234567-1"
      inputMode="numeric"
      maxLength={15}
      hint={hint}
      onChange={(next) => onChange(formatCnic(asciiDigits(next)))}
    />
  );
}

export function MoneyField({
  label,
  value,
  onChange,
  error,
  allowUnknown = false,
  allowCurrency = false,
  hint,
  field,
}: {
  label: string;
  value: Money;
  onChange: (value: Money) => void;
  error?: string;
  allowUnknown?: boolean;
  allowCurrency?: boolean;
  hint?: string;
  field?: string;
}) {
  const id = useId();
  const unknown = value.value_state === "unknown";
  return (
    <div className={styles.field} data-field={field} data-invalid={error ? "true" : undefined}>
      <label htmlFor={id}>{label}</label>
      {hint ? <p className={styles.hint} id={`${id}-hint`}>{hint}</p> : null}
      <div className={styles.inlineRow}>
        <input
          id={id}
          className={styles.control}
          inputMode="numeric"
          autoComplete="off"
          dir="ltr"
          placeholder={unknown ? "Unknown" : "e.g. 25,000"}
          value={unknown ? "" : groupThousands(value.amount)}
          disabled={unknown}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined}
          onChange={(event) => {
            const amount = parseWhole(event.target.value);
            if (amount === undefined) return;
            if (amount === null) {
              onChange({ ...value, amount: null, value_state: "known" });
              return;
            }
            if (amount > 100_000_000) return;
            onChange({ ...value, amount, value_state: amount === 0 ? "zero" : "known" });
          }}
        />
        {allowCurrency ? (
          <select
            className={styles.control}
            aria-label={`${label} currency`}
            value={value.currency}
            onChange={(event) => onChange({ ...value, currency: event.target.value as Money["currency"] })}
          >
            <option value="PKR">PKR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
            <option value="CAD">CAD</option>
          </select>
        ) : null}
        {allowUnknown ? (
          <label className={styles.toggleChip}>
            <input
              type="checkbox"
              checked={unknown}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? { ...value, amount: null, value_state: "unknown" }
                    : { ...value, amount: null, value_state: "known" },
                )
              }
            />
            <span>Unknown</span>
          </label>
        ) : null}
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  error,
  hint,
  max,
  field,
  thousands = false,
  placeholder,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
  hint?: string;
  max?: number;
  field?: string;
  /** Show 75,000 instead of 75000 (amounts in PKR). */
  thousands?: boolean;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className={styles.field} data-field={field} data-invalid={error ? "true" : undefined}>
      <label htmlFor={id}>{label}</label>
      {hint ? <p className={styles.hint} id={`${id}-hint`}>{hint}</p> : null}
      <input
        id={id}
        className={styles.control}
        inputMode="numeric"
        autoComplete="off"
        dir="ltr"
        placeholder={placeholder}
        value={thousands ? groupThousands(value) : value ?? ""}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined}
        onChange={(event) => {
          const next = parseWhole(event.target.value);
          if (next === undefined) return;
          if (next === null) {
            onChange(null);
            return;
          }
          if (max !== undefined && next > max) return;
          onChange(next);
        }}
      />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

/** Short choices (Yes / No, gender, status, scale) as chips built from real radio inputs. Chips wrap onto a new row when space runs out. */
export function SegmentedField({
  legend,
  name,
  value,
  onChange,
  error,
  hint,
  field,
  options = [
    { id: "Yes", label: "Yes" },
    { id: "No", label: "No" },
  ],
}: {
  legend: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  field?: string;
  options?: Array<{ id: string; label: string }>;
}) {
  const id = useId();
  return (
    <fieldset
      className={styles.radios}
      data-field={field}
      data-invalid={error ? "true" : undefined}
      aria-invalid={error ? true : undefined}
      aria-describedby={[hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined}
      tabIndex={error ? -1 : undefined}
    >
      <legend className={styles.legend}>{legend}</legend>
      {hint ? <p className={styles.hint} id={`${id}-hint`}>{hint}</p> : null}
      <div className={styles.segmented} data-count={options.length}>
        {options.map((option) => (
          <label key={option.id} className={styles.segment}>
            <input
              type="radio"
              name={name}
              value={option.id}
              checked={value === option.id}
              onChange={() => onChange(option.id)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </fieldset>
  );
}

/** Decimal input with up to two places (GPA, percentages). */
export function DecimalField({
  label,
  value,
  onChange,
  error,
  hint,
  field,
  placeholder,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
  hint?: string;
  field?: string;
  placeholder?: string;
}) {
  const id = useId();
  const [text, setText] = useState(value === null ? "" : String(value));
  const parsed = text === "" || text === "." ? null : Number(text);
  // Show what was typed (keeps "3." while typing) unless the value was changed from outside.
  const shown = parsed === value || (parsed !== null && Number.isNaN(parsed) && value === null) ? text : value === null ? "" : String(value);
  return (
    <div className={styles.field} data-field={field} data-invalid={error ? "true" : undefined}>
      <label htmlFor={id}>{label}</label>
      {hint ? <p className={styles.hint} id={`${id}-hint`}>{hint}</p> : null}
      <input
        id={id}
        className={styles.control}
        inputMode="decimal"
        autoComplete="off"
        dir="ltr"
        value={shown}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined}
        onChange={(event) => {
          const raw = asciiDigits(event.target.value.trim()).replace("٫", ".");
          if (!/^\d{0,3}(\.\d{0,2})?$/.test(raw)) return;
          setText(raw);
          const next = raw === "" || raw === "." ? null : Number(raw);
          onChange(next !== null && Number.isFinite(next) ? next : null);
        }}
      />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}
