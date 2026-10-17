"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "@/app/apply/form/form.module.css";
import { programTitles } from "@/lib/application/catalogs";
import { searchPrograms } from "@/lib/application/search";
import { FieldError } from "./widgets";

export function ProgramField({
  value,
  onChange,
  error,
  field,
}: {
  value: string;
  onChange: (title: string) => void;
  error?: string;
  field?: string;
}) {
  const id = useId();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const matches = query.trim().length >= 2 ? searchPrograms(query, programTitles) : [];

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className={styles.field} ref={rootRef} data-field={field} data-invalid={error ? "true" : undefined}>
      <label htmlFor={id}>Program title</label>
      <p className={styles.hint}>
        Type the program, for example nurs for every nursing degree. Pick the title from the list. Do not add the
        semester or a future plan, and do not type a grade or Yes.
      </p>
      <div className={styles.combo}>
      <input
        id={id}
        className={styles.control}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        value={query}
        aria-invalid={error ? true : undefined}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          onChange(event.target.value);
          setOpen(true);
        }}
      />
      {query ? (
        <button
          type="button"
          className={styles.clear}
          aria-label="Clear program"
          onClick={() => {
            setQuery("");
            onChange("");
            setOpen(false);
          }}
        >
          ×
        </button>
      ) : null}
      {open && matches.length > 0 ? (
        <div className={styles.menu} role="listbox" id={listId}>
          {matches.map((match) => (
            <button
              key={match.id}
              type="button"
              className={styles.option}
              role="option"
              aria-selected={match.label === value}
              data-active={match.label === value}
              onClick={() => {
                setQuery(match.label);
                onChange(match.label);
                setOpen(false);
              }}
            >
              {match.label}
            </button>
          ))}
        </div>
      ) : null}
      </div>
      <FieldError message={error} />
    </div>
  );
}
