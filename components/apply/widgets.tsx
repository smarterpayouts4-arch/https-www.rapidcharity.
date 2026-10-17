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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  maxLength: number;
  field?: string;
}) {
  const id = useId();
  return (
    <div className={styles.field} data-field={field} data-invalid={error ? "true" : undefined}>
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        className={styles.textarea}
        value={value}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      <p className={styles.counter}>
        {value.trim().length} / {maxLength}
      </p>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
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
  options: Array<{ id: string; label: string; detail?: string }>;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  field?: string;
}) {
  const id = useId();
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
            aria-invalid={error ? true : undefined}
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
}: {
  label: string;
  value: string;
  options: Array<{ id: string; label: string }>;
  onChange: (value: string) => void;
  error?: string;
  field?: string;
  autoComplete?: string;
}) {
  const id = useId();
  return (
    <div className={styles.field} data-field={field} data-invalid={error ? "true" : undefined}>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        className={styles.control}
        value={value}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
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
  commitRef.current = commitTyped;

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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  field?: string;
}) {
  return (
    <TextField
      label={label}
      field={field}
      value={value}
      onChange={onChange}
      error={error}
      type="tel"
      autoComplete="tel"
      hint={hint ?? "Pakistan mobile, for example 0300 1234567. Landlines can include an area code."}
    />
  );
}

export function CnicField({
  value,
  onChange,
  error,
  field,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  field?: string;
}) {
  return (
    <TextField
      label="CNIC"
      field={field}
      value={value}
      error={error}
      autoComplete="off"
      hint="13 digits, shown as #####-#######-#."
      onChange={(next) => onChange(formatCnic(next))}
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
  return (
    <div className={styles.field} data-field={field} data-invalid={error ? "true" : undefined}>
      <label htmlFor={id}>{label}</label>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
      <input
        id={id}
        className={styles.control}
        inputMode="numeric"
        value={value.value_state === "unknown" ? "" : value.amount ?? ""}
        disabled={value.value_state === "unknown"}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => {
          const raw = event.target.value.trim();
          if (!/^\d*$/.test(raw)) return;
          if (!raw) {
            onChange({ ...value, amount: null, value_state: "known" });
            return;
          }
          const amount = Number(raw);
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
        <label className={styles.choice}>
          <input
            type="checkbox"
            checked={value.value_state === "unknown"}
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
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
  hint?: string;
  max?: number;
  field?: string;
}) {
  const id = useId();
  return (
    <div className={styles.field} data-field={field} data-invalid={error ? "true" : undefined}>
      <label htmlFor={id}>{label}</label>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
      <input
        id={id}
        className={styles.control}
        inputMode="numeric"
        value={value ?? ""}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => {
          const raw = event.target.value.trim();
          if (!raw) {
            onChange(null);
            return;
          }
          if (!/^\d+$/.test(raw)) return;
          const next = Number(raw);
          if (max !== undefined && next > max) return;
          onChange(next);
        }}
      />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}
