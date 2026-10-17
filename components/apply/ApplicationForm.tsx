"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import styles from "@/app/apply/form/form.module.css";
import {
  cityOptions,
  denominationOptions,
  fieldOptions,
  heardAboutOptions,
  levelOptions,
  occupationOptions,
  providerOptions,
  relationshipOptions,
  religionOptions,
  schoolOptions,
  streamOptions,
  withPromoted,
} from "@/lib/application/catalogs";
import {
  DISABILITIES,
  EMPLOYMENT,
  GRADES,
  PARENT_STATUSES,
  PASTOR_TITLES,
  PROVINCES,
  PROGRAM_TRACKS,
  RAPID_SEMESTERS,
  SCHOLARSHIPS,
  TERM_UNITS,
  type ScholarshipId,
} from "@/lib/application/constants";
import { emptyApplication } from "@/lib/application/empty";
import { ageInYears } from "@/lib/application/normalize";
import { clearDraft, readDraftSnapshot, writeDraft } from "@/lib/application/draft";
import { requiredDocumentSlots } from "@/lib/application/documents";
import { eligibilitySuggestion } from "@/lib/application/eligibility";
import { documentUploadPrompt, fieldLabel } from "@/lib/application/fieldLabels";
import { missingRequiredDocuments } from "@/lib/application/documents";
import { FORM_STEPS, errorsForStep, validateApplication } from "@/lib/application/schema";
import { inferProgramSelection, SCHOOL_ALIASES } from "@/lib/application/search";
import type { ApplicationInput, DocumentInput, PromotedOption } from "@/lib/application/types";
import type { MockApplication } from "@/lib/application/mocks";
import { DocumentFields } from "./DocumentFields";
import { DraftNoticeView } from "./DraftNotice";
import { ProgramField } from "./ProgramField";
import {
  CnicField,
  FieldError,
  MoneyField,
  NumberField,
  PhoneField,
  RadioField,
  SelectField,
  SelectOther,
  TextAreaField,
  TextField,
} from "./widgets";

type Errors = Record<string, string>;
type FormIssue = { key: string; label: string; message: string };

function toIssues(fieldErrors: Errors): FormIssue[] {
  return Object.entries(fieldErrors).map(([key, message]) => ({
    key,
    label: fieldLabel(key),
    message,
  }));
}

function fromMock(mock: MockApplication): ApplicationInput {
  return { ...structuredClone(mock.data), client_id: crypto.randomUUID(), documents: [] };
}

export function ApplicationForm({
  initialScholarship,
  promoted,
  cycleName = "Spring Semester 2027",
  mocks,
  initialMock = "",
}: {
  initialScholarship: ScholarshipId | "";
  promoted: PromotedOption[];
  cycleName?: string;
  /** Test-only sample applications. Passed by the server only when mocks are enabled. */
  mocks?: MockApplication[];
  initialMock?: string;
}) {
  const startMock = mocks?.find((item) => item.id === initialMock);
  const [data, setData] = useState<ApplicationInput>(() =>
    startMock
      ? fromMock(startMock)
      : {
          ...emptyApplication(initialScholarship),
          client_id: crypto.randomUUID(),
        },
  );
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [issues, setIssues] = useState<FormIssue[]>([]);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<{ id: string; submitted_at: string } | null>(null);
  const [picking, setPicking] = useState(!initialScholarship && !startMock);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [stepAttempted, setStepAttempted] = useState(false);
  const [returnToReview, setReturnToReview] = useState(false);
  const [draftDismissed, setDraftDismissed] = useState(Boolean(startMock));
  const [savedLabel, setSavedLabel] = useState("");
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const storedDraft = useSyncExternalStore(
    () => () => {},
    () => readDraftSnapshot(),
    () => null,
  );
  const pendingDraft = draftDismissed ? null : storedDraft;
  const dirty = useRef(Boolean(startMock));
  const dataRef = useRef(data);
  const formRef = useRef<HTMLFormElement>(null);
  const pendingFocusRef = useRef<string | null>(null);

  const lists = useMemo(
    () => ({
      schools: withPromoted(schoolOptions, promoted, "schools"),
      cities: withPromoted(cityOptions, promoted, "cities"),
      levels: withPromoted(levelOptions, promoted, "levels"),
      fields: withPromoted(fieldOptions, promoted, "fields"),
      streams: withPromoted(streamOptions, promoted, "streams"),
      occupations: withPromoted(occupationOptions, promoted, "occupations"),
      religions: withPromoted(religionOptions, promoted, "religions"),
      heard: withPromoted(heardAboutOptions, promoted, "heard_about"),
      denominations: withPromoted(denominationOptions, promoted, "denominations"),
      relationships: withPromoted(relationshipOptions, promoted, "relationships"),
      providers: withPromoted(providerOptions, promoted, "providers"),
    }),
    [promoted],
  );


  function updateTerm(index: number, partial: Partial<ApplicationInput["terms"][number]>) {
    setData((current) => {
      const terms = current.terms.map((term, termIndex) => (termIndex === index ? { ...term, ...partial } : term));
      const next = { ...current, terms };
      dataRef.current = next;
      return next;
    });
  }

  function patch(partial: Partial<ApplicationInput>) {
    dirty.current = true;
    const next = { ...dataRef.current, ...partial };
    dataRef.current = next;
    setData(next);
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(partial)) {
        for (const errorKey of Object.keys(next)) {
          if (errorKey === key || errorKey.startsWith(`${key}.`)) delete next[errorKey];
        }
      }
      return next;
    });
    setIssues((current) =>
      current.filter((issue) => !Object.keys(partial).some((key) => issue.key === key || issue.key.startsWith(`${key}.`))),
    );
  }

  function visible(...keys: string[]): string | undefined {
    const seen = keys.some((key) => {
      if (stepAttempted) return true;
      const root = key.split(".")[0] ?? key;
      for (const item of touched) {
        if (item === key || item === root || item.startsWith(`${root}.`)) return true;
      }
      return false;
    });
    if (!seen) return undefined;
    return keys.map((key) => errors[key]).find(Boolean);
  }

  function reveal(key: string) {
    setTouched((current) => {
      const next = new Set(current);
      next.add(key);
      return next;
    });
    const result = validateApplication(dataRef.current, { promoted });
    const message = result.ok ? undefined : result.fieldErrors[key];
    setErrors((current) => {
      const next = { ...current };
      if (message) next[key] = message;
      else delete next[key];
      return next;
    });
  }

  useEffect(() => {
    if (!dirty.current) return;
    const handle = window.setTimeout(() => {
      const draft = { data: dataRef.current, step, savedAt: new Date().toISOString() };
      writeDraft(draft);
      setSavedLabel("Saved just now");
    }, 1000);
    return () => window.clearTimeout(handle);
  }, [data, step]);

  useEffect(() => {
    if (!startMock) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("mock")) return;
    url.searchParams.delete("mock");
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, [startMock]);

  function loadMock(mock: MockApplication) {
    const next = fromMock(mock);
    dirty.current = true;
    dataRef.current = next;
    setData(next);
    setStep(0);
    setPicking(false);
    setErrors({});
    setIssues([]);
    setTouched(new Set());
    setStepAttempted(false);
    setReturnToReview(false);
    setDraftDismissed(true);
    const url = new URL(window.location.href);
    url.searchParams.set("scholarship", mock.scholarship);
    url.searchParams.delete("mock");
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  const focusField = useCallback((key: string) => {
    const root = formRef.current;
    if (!root) return;
    const keys = [key];
    if (key.includes(".")) {
      const parts = key.split(".");
      keys.push(parts.slice(0, -1).join("."), parts[0] ?? key);
    }
    if (key.startsWith("documents")) keys.push("documents");
    const indexed = /^documents\.(\d+)/.exec(key);
    if (indexed) {
      const slotName = dataRef.current.documents[Number(indexed[1])]?.slot;
      if (slotName) keys.unshift(`documents.${slotName}`);
    }
    let slot: HTMLElement | null = null;
    for (const candidate of keys) {
      slot = root.querySelector<HTMLElement>(`[data-field="${CSS.escape(candidate)}"]`);
      if (slot) break;
    }
    if (!slot) {
      const fallback = root.querySelector<HTMLElement>("[data-callout], [data-form-issues]");
      if (fallback && !fallback.hasAttribute("tabindex")) fallback.tabIndex = -1;
      fallback?.scrollIntoView({ block: "center" });
      fallback?.focus({ preventScroll: true });
      return;
    }
    const control =
      slot.querySelector<HTMLElement>("[data-focus]") ??
      slot.querySelector<HTMLElement>("input:not([type='file']), select, textarea");
    const target = control ?? slot;
    if (!control && !slot.hasAttribute("tabindex")) slot.tabIndex = -1;
    target.scrollIntoView({ block: "center" });
    target.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const key = pendingFocusRef.current;
    if (!key) return;
    pendingFocusRef.current = null;
    focusField(key);
  });

  const suggestion = eligibilitySuggestion({
    scholarship: data.scholarship,
    gender: data.gender,
    fieldId: data.field_of_study.option_id,
  });
  const blocked =
    (step === 1 && data.scholarship === "ivy-azariah" && data.gender === "Male") ||
    (step === 3 &&
      Boolean(data.field_of_study.option_id) &&
      ((data.scholarship === "robert-mathias" && suggestion?.switchTo === "john-ivy-azariah") ||
        (data.scholarship === "john-ivy-azariah" && suggestion?.switchTo === "robert-mathias")));

  function showIssues(fieldErrors: Errors) {
    const next = toIssues(fieldErrors);
    setStepAttempted(true);
    setTouched((current) => {
      const touchedNext = new Set(current);
      for (const issue of next) touchedNext.add(issue.key);
      return touchedNext;
    });
    setErrors(fieldErrors);
    setIssues(next);
    if (next.some((issue) => issue.key === "scholarship" || issue.key.startsWith("scholarship."))) {
      setPicking(true);
    }
    pendingFocusRef.current = next[0]?.key ?? null;
  }

  function validateCurrent(): boolean {
    const currentData = dataRef.current;
    const result = validateApplication(currentData, { promoted });
    if (result.ok) {
      setErrors({});
      setIssues([]);
      return true;
    }
    const stepFields = FORM_STEPS[step]?.fields ?? [];
    const stepErrors = errorsForStep(result.fieldErrors, stepFields);
    const mine: Errors = {};
    if (stepFields.some((field) => field === "documents")) {
      for (const slot of missingRequiredDocuments(currentData)) {
        mine[`documents.${slot}`] = documentUploadPrompt(slot);
      }
    }
    for (const [key, message] of Object.entries(stepErrors)) {
      if (!mine[key]) mine[key] = message;
    }
    if (Object.keys(mine).length === 0) {
      setErrors({});
      setIssues([]);
      return true;
    }
    showIssues(mine);
    return false;
  }

  function goNext() {
    if (blocked) {
      const message = suggestion?.message ?? "This answer does not match the selected scholarship.";
      const key = step === 1 ? "gender" : "field_of_study.option_id";
      setIssues([{ key, label: fieldLabel(key), message }]);
      pendingFocusRef.current = key;
      return;
    }
    if (!validateCurrent()) return;
    setStepAttempted(false);
    setIssues([]);
    if (returnToReview) {
      setReturnToReview(false);
      setStep(FORM_STEPS.length - 1);
      return;
    }
    setStep((current) => Math.min(current + 1, FORM_STEPS.length - 1));
  }

  function chooseScholarship(id: ScholarshipId) {
    patch({ scholarship: id });
    setPicking(false);
    const url = new URL(window.location.href);
    url.searchParams.set("scholarship", id);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  function presentFieldErrors(fieldErrors: Errors) {
    const first = FORM_STEPS.findIndex(
      (item) => Object.keys(errorsForStep(fieldErrors, item.fields)).length > 0,
    );
    if (first >= 0) setStep(first);
    const scoped = errorsForStep(fieldErrors, FORM_STEPS[first >= 0 ? first : step]?.fields ?? []);
    const orphans = Object.fromEntries(
      Object.entries(fieldErrors).filter(([key]) => !FORM_STEPS.some((item) => {
        const allowed = new Set<string>(item.fields);
        return allowed.has(key) || allowed.has(key.split(".")[0] ?? "");
      })),
    );
    showIssues({ ...scoped, ...orphans });
  }

  function upsertDocument(document: DocumentInput) {
    dirty.current = true;
    setData((current) => {
      const documents = [
        ...current.documents.filter((item) => !(item.slot === document.slot && item.index === document.index)),
        document,
      ];
      const next = { ...current, documents };
      dataRef.current = next;
      return next;
    });
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(next)) {
        if (key === "documents" || key.startsWith("documents.")) delete next[key];
      }
      return next;
    });
    setIssues((current) => current.filter((issue) => issue.key !== "documents" && !issue.key.startsWith("documents.")));
  }

  function removeDocument(slot: string, index: number) {
    dirty.current = true;
    setData((current) => {
      const documents = current.documents.filter((item) => !(item.slot === slot && item.index === index));
      const next = { ...current, documents };
      dataRef.current = next;
      return next;
    });
  }

  async function submit() {
    const snapshot = dataRef.current;
    const result = validateApplication(snapshot, { promoted });
    if (!result.ok) {
      presentFieldErrors(result.fieldErrors);
      return;
    }
    setBusy(true);
    setIssues([]);
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
      });
      const body = (await response.json()) as {
        id?: string;
        submitted_at?: string;
        fieldErrors?: Errors;
        formError?: string;
      };
      if (!response.ok) {
        if (body.fieldErrors && Object.keys(body.fieldErrors).length > 0) {
          presentFieldErrors(body.fieldErrors);
        }
        if (body.formError) {
          setIssues((current) => [
            ...current,
            { key: "form", label: "Application", message: body.formError ?? "The application was not saved." },
          ]);
        } else if (!body.fieldErrors) {
          setIssues([{ key: "form", label: "Application", message: "The application was not saved." }]);
        }
        return;
      }
      if (body.id && body.submitted_at) {
        clearDraft();
        setReceipt({ id: body.id, submitted_at: body.submitted_at });
      }
    } catch {
      setIssues([{ key: "form", label: "Application", message: "The application could not be sent. Check your connection and try again." }]);
    } finally {
      setBusy(false);
    }
  }

  if (receipt) {
    return (
      <div className={`${styles.card} ${styles.success}`}>
        <div className={styles.confetti} aria-hidden="true">
          <span /><span /><span /><span /><span />
        </div>
        <h2 className={styles.sectionTitle}>Application received</h2>
        <p>{cycleName}. Keep this reference. If a reviewer asks for a new file, they will give you a re-upload link.</p>
        <p className={styles.ref}>{receipt.id}</p>
        <p className={styles.hint}>Submitted {new Date(receipt.submitted_at).toLocaleString()}</p>
        <a className="text-link" href="/apply">
          Return to the apply page
        </a>
      </div>
    );
  }

  const current = FORM_STEPS[step];
  const progress = Math.round(((step + 1) / FORM_STEPS.length) * 100);
  const scholarship = SCHOLARSHIPS.find((item) => item.id === data.scholarship);
  return (
    <form
      ref={formRef}
      className={styles.layout}
      data-hydrated={ready ? "true" : "false"}
      noValidate
      onBlur={(event) => {
        const target = event.target as HTMLElement;
        const slot = target.closest("[data-field]");
        if (!slot) return;
        const next = event.relatedTarget as Node | null;
        if (next && slot.contains(next)) return;
        const key = slot.getAttribute("data-field");
        if (key) reveal(key);
      }}
      onSubmit={(event) => {
        event.preventDefault();
        if (step === FORM_STEPS.length - 1) void submit();
        else goNext();
      }}
    >
      <button type="submit" hidden disabled={!ready || busy} tabIndex={-1} aria-hidden="true" />
      {data.scholarship ? <input type="hidden" name="scholarship" value={data.scholarship} /> : null}
      <aside className={styles.sidebar}>
        <p className={styles.progressLabel}>
          Step {step + 1} of {FORM_STEPS.length} · {progress}%
        </p>
        <div className={styles.track} aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
        <ol className={styles.steps}>
          {FORM_STEPS.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                className={styles.stepBtn}
                data-active={index === step}
                data-done={index < step}
                onClick={() => {
                  if (index <= step || returnToReview) setStep(index);
                }}
              >
                <span className={styles.stepMark}>{index < step ? "✓" : index + 1}</span>
                {item.label}
              </button>
            </li>
          ))}
        </ol>
      </aside>
      <div className={styles.card}>
      <div className={styles.mobileProgress}>
        <p className={styles.progressLabel}>
          Step {step + 1} of {FORM_STEPS.length} · {current?.label}
          <span className={styles.progressPct}>{progress}%</span>
        </p>
        <div
          className={styles.segments}
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={FORM_STEPS.length}
          aria-valuenow={step + 1}
          aria-valuetext={`Step ${step + 1} of ${FORM_STEPS.length}, ${current?.label ?? ""}`}
          aria-label="Application progress"
        >
          {FORM_STEPS.map((item, index) => (
            <span key={item.id} data-filled={index <= step} />
          ))}
        </div>
      </div>
      {savedLabel ? <p className={styles.saved}>{savedLabel}</p> : null}
      {mocks && mocks.length > 0 ? (
        <div className={styles.testTools} data-testid="mock-tools">
          <p className={styles.testToolsLabel}>Test mode: fill the form with a sample application</p>
          <div className={styles.testToolsActions}>
            {mocks.map((mock) => (
              <button key={mock.id} type="button" className="btn-secondary btn-sm" onClick={() => loadMock(mock)}>
                {mock.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {pendingDraft ? (
        <DraftNoticeView
          step={pendingDraft.step}
          savedAt={pendingDraft.savedAt}
          onResume={() => {
            dataRef.current = pendingDraft.data;
            setData(pendingDraft.data);
            setStep(Math.min(pendingDraft.step, FORM_STEPS.length - 1));
            setPicking(!pendingDraft.data.scholarship);
            dirty.current = true;
            setDraftDismissed(true);
          }}
          onStartOver={() => {
            clearDraft();
            setDraftDismissed(true);
            setSavedLabel("");
          }}
        />
      ) : null}
      <h2 className={styles.sectionTitle}>{current?.label}</h2>
      {data.scholarship && !picking ? (
        <p className={styles.chip}>
          <span>Applying for: {scholarship?.label ?? "Scholarship"}</span>
          <button type="button" className={styles.chipChange} onClick={() => { setPicking(true); setStep(0); }}>
            Change
          </button>
        </p>
      ) : null}
      {issues.length > 0 ? (
        <div className={styles.banner} role="alert" data-form-issues>
          <p>These fields need attention:</p>
          <ul>
            {issues.map((issue) => (
              <li key={issue.key}>
                <button type="button" onClick={() => focusField(issue.key)}>
                  {issue.label}
                </button>
                {": "}
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {step === 0 ? (
        <div className={styles.grid}>
          <RadioField
            legend="New or Continuing applicant"
            name="applicant_type"
            field="applicant_type"
            value={data.applicant_type}
            error={visible("applicant_type")}
            hint="Continuing means you received a Rapid scholarship before."
            onChange={(value) => patch({ applicant_type: value as ApplicationInput["applicant_type"] })}
            options={[
              { id: "new", label: "New" },
              { id: "continuing", label: "Continuing", detail: "Received a Rapid scholarship before" },
            ]}
          />
          {picking || !data.scholarship ? (
            <RadioField
              legend="Scholarship"
              name="scholarship"
              field="scholarship"
              value={data.scholarship}
              error={visible("scholarship")}
              onChange={(value) => chooseScholarship(value as ScholarshipId)}
              options={SCHOLARSHIPS.map((item) => ({ id: item.id, label: item.label, detail: item.detail }))}
            />
          ) : null}
        </div>
      ) : null}

      {step === 1 ? (
        <div className={styles.grid}>
          <div className={styles.two}>
            <TextField label="First name" autoComplete="given-name" value={data.first_name} error={visible("first_name")} field="first_name" onChange={(first_name) => patch({ first_name })} />
            <TextField label="Last name" autoComplete="family-name" value={data.last_name} error={visible("last_name")} field="last_name" onChange={(last_name) => patch({ last_name })} />
          </div>
          <TextField label="Full name as on CNIC" hint="Use the name printed on the CNIC. Phone and email are separate fields below." value={data.full_name_as_on_cnic} error={visible("full_name_as_on_cnic")} field="full_name_as_on_cnic" onChange={(full_name_as_on_cnic) => patch({ full_name_as_on_cnic })} />
          <TextField label="Date of birth" type="date" autoComplete="bday" value={data.date_of_birth} error={visible("date_of_birth")} field="date_of_birth" onChange={(date_of_birth) => patch({ date_of_birth })} />
          <RadioField legend="Gender" name="gender" field="gender" value={data.gender} error={data.scholarship === "ivy-azariah" && data.gender === "Male" && suggestion ? `Gender: ${suggestion.message}` : visible("gender")} onChange={(gender) => patch({ gender: gender as ApplicationInput["gender"] })} options={[{ id: "Female", label: "Female" }, { id: "Male", label: "Male" }]} />
          {step === 1 && data.scholarship === "ivy-azariah" && data.gender === "Male" && suggestion ? (
            <div className={styles.callout} role="status" data-callout tabIndex={-1}>
              <p>Gender: {suggestion.message}</p>
              <button type="button" className={styles.chipChange} onClick={() => chooseScholarship(suggestion.switchTo)}>
                {suggestion.switchLabel}
              </button>
            </div>
          ) : null}
          <RadioField legend="Disability" name="disability" value={data.disability} error={visible("disability")} field="disability" onChange={(disability) => patch({ disability: disability as ApplicationInput["disability"] })} options={DISABILITIES.map((item) => ({ id: item.id, label: item.label }))} />
          {data.disability === "other" ? <TextField label="Disability" value={data.disability_other} error={visible("disability_other")} field="disability_other" onChange={(disability_other) => patch({ disability_other })} /> : null}
          <RadioField legend="Marital status" name="marital_status" value={data.marital_status} error={visible("marital_status")} field="marital_status" onChange={(marital_status) => patch({ marital_status: marital_status as ApplicationInput["marital_status"] })} options={["Single", "Married", "Widowed", "Divorced"].map((id) => ({ id, label: id }))} />
          {data.marital_status === "Married" ? (
            <div className={styles.two}>
              <TextField label="Spouse name" value={data.spouse_name} error={visible("spouse_name")} field="spouse_name" onChange={(spouse_name) => patch({ spouse_name })} />
              <MoneyField label="Spouse monthly income (PKR)" value={data.spouse_monthly_income} error={visible("spouse_monthly_income.amount")} field="spouse_monthly_income.amount" onChange={(spouse_monthly_income) => patch({ spouse_monthly_income })} />
            </div>
          ) : null}
          <SelectOther label="Religion" options={lists.religions} value={data.religion} error={visible("religion.option_id", "religion.other_text")} field="religion.option_id" onChange={(religion) => patch({ religion })} />
          <CnicField value={data.cnic} error={visible("cnic")} field="cnic" onChange={(cnic) => patch({ cnic })} />
          <div className={styles.two}>
            <TextField label="Email" type="email" autoComplete="email" value={data.email} error={visible("email")} field="email" onChange={(email) => patch({ email })} />
            <TextField label="Confirm email" type="email" autoComplete="email" value={data.email_confirm} error={visible("email_confirm")} field="email_confirm" onChange={(email_confirm) => patch({ email_confirm })} />
          </div>
          <PhoneField label="Mobile phone" value={data.mobile_phone} error={visible("mobile_phone")} field="mobile_phone" hint="Pakistan mobile only, for example 0300 1234567. Do not type an email in this box." onChange={(mobile_phone) => patch({ mobile_phone })} />
          <PhoneField label="Secondary phone (optional)" value={data.secondary_phone} error={visible("secondary_phone")} field="secondary_phone" hint="Optional Pakistan mobile." onChange={(secondary_phone) => patch({ secondary_phone })} />
          <TextField label="Home address" autoComplete="street-address" value={data.address_line} error={visible("address_line")} field="address_line" onChange={(address_line) => patch({ address_line })} />
          <div className={styles.two}>
            <SelectOther label="City" options={lists.cities} value={data.city} error={visible("city.option_id", "city.other_text")} field="city.option_id" onChange={(city) => patch({ city })} />
            <SelectField label="Province" value={data.province} error={visible("province")} field="province" options={PROVINCES.map((id) => ({ id, label: id }))} onChange={(province) => patch({ province })} />
          </div>
          <RadioField legend="Are you working?" name="employment_status" value={data.employment_status} error={visible("employment_status")} field="employment_status" hint="Choose Yes if you have any job. Reviewers ask about work that was left off the form." onChange={(employment_status) => patch({ employment_status: employment_status as ApplicationInput["employment_status"] })} options={EMPLOYMENT.map((item) => ({ id: item.id, label: item.label }))} />
          {data.employment_status === "Yes" ? (
            <div className={styles.two}>
              <TextField label="Job title" value={data.employment_job} error={visible("employment_job")} field="employment_job" onChange={(employment_job) => patch({ employment_job })} />
              <TextField label="Employer" value={data.employment_employer} error={visible("employment_employer")} field="employment_employer" onChange={(employment_employer) => patch({ employment_employer })} />
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 2 ? (
        <div className={styles.grid}>
          <p className={styles.noteBox}>
            A retired parent who receives a pension is Retired, not Unemployed with 0. Enter the monthly pension if you know it.
            Sibling counts exclude you. Enter numbers, not a sentence.
          </p>
          <TextField label="Father's name" hint="The name reviewers should see, without occupation or income." value={data.father_name} error={visible("father_name")} field="father_name" onChange={(father_name) => patch({ father_name })} />
          <RadioField legend="Father's status" name="father_status" value={data.father_status} error={visible("father_status")} field="father_status" onChange={(father_status) => patch({ father_status: father_status as ApplicationInput["father_status"] })} options={PARENT_STATUSES.map((item) => ({ id: item.id, label: item.label }))} />
          {data.father_status === "Late" ? null : (
            <>
              <SelectOther label="Father's occupation" options={lists.occupations} value={data.father_occupation} error={visible("father_occupation.option_id", "father_occupation.other_text")} field="father_occupation.option_id" onChange={(father_occupation) => patch({ father_occupation })} />
              <MoneyField label="Father's monthly income (PKR)" allowUnknown value={data.father_monthly_income} error={visible("father_monthly_income.amount")} field="father_monthly_income.amount" onChange={(father_monthly_income) => patch({ father_monthly_income })} />
            </>
          )}
          <TextField label="Mother's name" value={data.mother_name} error={visible("mother_name")} field="mother_name" onChange={(mother_name) => patch({ mother_name })} />
          <RadioField legend="Mother's status" name="mother_status" value={data.mother_status} error={visible("mother_status")} field="mother_status" onChange={(mother_status) => patch({ mother_status: mother_status as ApplicationInput["mother_status"] })} options={PARENT_STATUSES.map((item) => ({ id: item.id, label: item.label }))} />
          {data.mother_status === "Late" ? null : (
            <>
              <SelectOther label="Mother's occupation" options={lists.occupations} value={data.mother_occupation} error={visible("mother_occupation.option_id", "mother_occupation.other_text")} field="mother_occupation.option_id" onChange={(mother_occupation) => patch({ mother_occupation })} />
              <MoneyField label="Mother's monthly income (PKR)" allowUnknown value={data.mother_monthly_income} error={visible("mother_monthly_income.amount")} field="mother_monthly_income.amount" onChange={(mother_monthly_income) => patch({ mother_monthly_income })} />
            </>
          )}
          <PhoneField label="Guardian phone" value={data.guardian_phone} error={visible("guardian_phone")} field="guardian_phone" hint="Mobile or landline, with country code if it is not a Pakistan number." onChange={(guardian_phone) => patch({ guardian_phone })} />
          <NumberField label="Siblings, excluding yourself" hint="Use 0 if you have none. Do not count yourself." max={20} value={data.siblings_count} error={visible("siblings_count")} field="siblings_count" onChange={(siblings_count) => patch({ siblings_count })} />
          <div className={styles.two}>
            <NumberField label="Studying" max={20} value={data.siblings_studying_count} error={visible("siblings_studying_count")} field="siblings_studying_count" onChange={(siblings_studying_count) => patch({ siblings_studying_count })} />
            <NumberField label="Working" max={20} value={data.siblings_working_count} error={visible("siblings_working_count")} field="siblings_working_count" onChange={(siblings_working_count) => patch({ siblings_working_count })} />
          </div>
          <div className={styles.two}>
            <NumberField label="Married" max={20} value={data.siblings_married_count} error={visible("siblings_married_count")} field="siblings_married_count" onChange={(siblings_married_count) => patch({ siblings_married_count })} />
            <NumberField label="Other" max={20} value={data.siblings_other_count} error={visible("siblings_other_count")} field="siblings_other_count" onChange={(siblings_other_count) => patch({ siblings_other_count })} />
          </div>
          <TextField label="Notes about siblings (optional)" maxLength={300} value={data.siblings_notes} error={visible("siblings_notes")} field="siblings_notes" onChange={(siblings_notes) => patch({ siblings_notes })} />
        </div>
      ) : null}

      {step === 3 ? (
        <div className={styles.grid}>
          <p className={styles.noteBox}>
            Choose the institution and program from the lists. FCCU and Kinnaird can be found by typing FCCU or KC.
            Do not mix the semester or a future plan into the program name, and do not type a grade or Yes.
            The fee is the whole number on the upcoming-term voucher, in PKR. Do not write “2 lakh” or a yearly figure in another currency.
          </p>
          <SelectOther label="Current institution" aliases={SCHOOL_ALIASES} options={lists.schools} value={data.current_institution} error={visible("current_institution.option_id", "current_institution.other_text")} field="current_institution.option_id" hint="Type to search. Abbreviations and small typos are accepted. Choose Other if it is not listed." onChange={(current_institution) => patch({ current_institution })} />
          <SelectOther label="Campus city" options={lists.cities} value={data.campus_city} error={visible("campus_city.option_id", "campus_city.other_text")} field="campus_city.option_id" onChange={(campus_city) => patch({ campus_city })} />
          <SelectOther label="Degree level" options={lists.levels} value={data.degree_level} error={visible("degree_level.option_id", "degree_level.other_text")} field="degree_level.option_id" onChange={(degree_level) => patch({ degree_level })} />
          <SelectOther
            label="Field of study"
            options={lists.fields}
            value={data.field_of_study}
            error={suggestion && data.field_of_study.option_id && suggestion.switchTo !== data.scholarship ? `Field of study: ${suggestion.message}` : visible("field_of_study.option_id", "field_of_study.other_text")} field="field_of_study.option_id"
            hint="Typing nurs shows Nursing."
            onChange={(field_of_study) =>
              patch({
                field_of_study,
                program_track: field_of_study.option_id === "nursing" ? data.program_track : "",
                program_track_other: field_of_study.option_id === "nursing" ? data.program_track_other : "",
              })
            }
          />
          {step === 3 && data.field_of_study.option_id && suggestion && suggestion.switchTo !== data.scholarship ? (
            <div className={styles.callout} role="status" data-callout tabIndex={-1}>
              <p>Field of study: {suggestion.message}</p>
              <button type="button" className={styles.chipChange} onClick={() => chooseScholarship(suggestion.switchTo)}>
                {suggestion.switchLabel}
              </button>
            </div>
          ) : null}
          <ProgramField
            value={data.program_title}
            error={visible("program_title")} field="program_title"
            onChange={(program_title) => {
              const inferred = inferProgramSelection(program_title);
              patch({
                program_title,
                field_of_study: inferred ? { option_id: inferred.fieldId, other_text: "" } : data.field_of_study,
                degree_level: inferred?.levelId ? { option_id: inferred.levelId, other_text: "" } : data.degree_level,
                program_track: inferred?.fieldId === "nursing" ? data.program_track : "",
              });
            }}
          />
          {data.field_of_study.option_id === "nursing" ? (
            <>
              <RadioField legend="Nursing track" name="program_track" value={data.program_track} error={visible("program_track")} field="program_track" onChange={(program_track) => patch({ program_track: program_track as ApplicationInput["program_track"] })} options={PROGRAM_TRACKS.map((item) => ({ id: item.id, label: item.label }))} />
              {data.program_track === "other" ? (
                <TextField label="Nursing track" value={data.program_track_other} error={visible("program_track_other")} field="program_track_other" onChange={(program_track_other) => patch({ program_track_other })} />
              ) : null}
            </>
          ) : null}
          <TextField label="Specialization (optional)" maxLength={80} value={data.specialization} error={visible("specialization")} field="specialization" hint="For example Marketing or Clinical Psychology. Keep this out of the program title." onChange={(specialization) => patch({ specialization })} />
          <div className={styles.two}>
            <NumberField label="Period of study (years)" max={7} value={data.study_years} error={visible("study_years")} field="study_years" onChange={(study_years) => patch({ study_years })} />
            <SelectField label="Completion term" value={data.completion_term} error={visible("completion_term")} field="completion_term" options={[{ id: "Spring", label: "Spring" }, { id: "Fall", label: "Fall" }]} onChange={(completion_term) => patch({ completion_term: completion_term as ApplicationInput["completion_term"] })} />
          </div>
          <NumberField label="Completion year" max={2100} value={data.completion_year} error={visible("completion_year")} field="completion_year" onChange={(completion_year) => patch({ completion_year })} />
          <TextField label="Roll number (optional)" value={data.roll_number} error={visible("roll_number")} field="roll_number" onChange={(roll_number) => patch({ roll_number })} />
          <p className={styles.noteBox}>
            These five terms are the last two, this term, and the next two. For a past term, choose the unit and a status.
            If the result is awaited or delayed, say so. Do not invent a GPA. Future terms only need the semester you expect to be in.
          </p>
          {visible("terms") ? <p className={styles.error} data-field="terms">{visible("terms")}</p> : null}
          {data.terms.map((term, index) => (
            <fieldset key={term.term} className={styles.checks} data-field={`terms.${index}`}>
              <legend className={styles.legend}>{term.term}{term.status === "future" ? " (expected)" : ""}</legend>
              <SelectField label="Progress unit" value={term.unit} error={visible(`terms.${index}.unit`)} field={`terms.${index}.unit`} options={TERM_UNITS.map((item) => ({ id: item.id, label: item.label }))} onChange={(unit) => updateTerm(index, { unit: unit as ApplicationInput["terms"][number]["unit"] })} />
              <NumberField label="Number" max={12} value={term.number} error={visible(`terms.${index}.number`)} field={`terms.${index}.number`} onChange={(number) => updateTerm(index, { number })} />
              {term.status === "future" ? null : (
                <SelectField
                  label="Result status"
                  value={term.status}
                  error={visible(`terms.${index}.status`)} field={`terms.${index}.status`}
                  options={[
                    { id: "declared", label: "Result declared" },
                    { id: "awaited", label: "Awaited" },
                    { id: "failed_repeat", label: "Failed or repeat" },
                    { id: "delayed", label: "Delayed" },
                    { id: "not_applicable", label: "Not in the program yet" },
                  ]}
                  onChange={(status) => updateTerm(index, { status: status as ApplicationInput["terms"][number]["status"] })}
                />
              )}
              {term.status === "declared" ? (
                <>
                  <RadioField legend="Result type" name={`result-${index}`} value={term.result.type} onChange={(type) => updateTerm(index, { result: { type: type as ApplicationInput["terms"][number]["result"]["type"], value: null, max: type === "CGPA" ? 4 : type === "Percentage" ? 100 : null, grade: "" } })} options={["CGPA", "Percentage", "Grade", "Marks"].map((id) => ({ id, label: id }))} />
                  {term.result.type === "CGPA" ? (
                    <div className={styles.two}>
                      <Numberish label="CGPA" value={term.result.value} error={visible(`terms.${index}.result.value`)} field={`terms.${index}.result.value`} onChange={(value) => updateTerm(index, { result: { ...term.result, value } })} />
                      <SelectField label="Out of" value={String(term.result.max ?? "")} options={[{ id: "4", label: "4" }, { id: "5", label: "5" }]} error={visible(`terms.${index}.result.max`)} field={`terms.${index}.result.max`} onChange={(max) => updateTerm(index, { result: { ...term.result, max: Number(max) } })} />
                    </div>
                  ) : null}
                  {term.result.type === "Percentage" ? <Numberish label="Percentage" value={term.result.value} error={visible(`terms.${index}.result.value`)} field={`terms.${index}.result.value`} onChange={(value) => updateTerm(index, { result: { ...term.result, value, max: 100 } })} /> : null}
                  {term.result.type === "Grade" ? <SelectField label="Grade" value={term.result.grade} error={visible(`terms.${index}.result.grade`)} field={`terms.${index}.result.grade`} options={GRADES.map((id) => ({ id, label: id }))} onChange={(grade) => updateTerm(index, { result: { ...term.result, grade, value: null, max: null } })} /> : null}
                  {term.result.type === "Marks" ? (
                    <div className={styles.two}>
                      <NumberField label="Marks obtained" value={term.result.value} error={visible(`terms.${index}.result.value`)} field={`terms.${index}.result.value`} onChange={(value) => updateTerm(index, { result: { ...term.result, value } })} />
                      <NumberField label="Out of" value={term.result.max} error={visible(`terms.${index}.result.max`)} field={`terms.${index}.result.max`} onChange={(max) => updateTerm(index, { result: { ...term.result, max } })} />
                    </div>
                  ) : null}
                </>
              ) : null}
            </fieldset>
          ))}
          <SelectOther aliases={SCHOOL_ALIASES} label="Previous institution" options={lists.schools} value={data.previous_institution} error={visible("previous_institution.option_id", "previous_institution.other_text")} field="previous_institution.option_id" onChange={(previous_institution) => patch({ previous_institution })} />
          <SelectOther label="Previous qualification" options={lists.streams} value={data.previous_qualification} error={visible("previous_qualification.option_id", "previous_qualification.other_text")} field="previous_qualification.option_id" onChange={(previous_qualification) => patch({ previous_qualification })} />
          <NumberField label="Previous completion year" value={data.previous_completion_year} error={visible("previous_completion_year")} field="previous_completion_year" max={2100} onChange={(previous_completion_year) => patch({ previous_completion_year })} />
          <MoneyField label="Fee for the upcoming term (PKR)" value={data.fee} error={visible("fee.amount")} field="fee.amount" hint="The whole number printed on the current voucher. A blank is not zero." onChange={(fee) => patch({ fee: { ...fee, period: "semester", currency: "PKR" } })} />
          <TextField label="Fee due date" type="date" value={data.fee_due_date} error={visible("fee_due_date")} field="fee_due_date" onChange={(fee_due_date) => patch({ fee_due_date })} />
          <PhoneField label="Institution phone (optional)" value={data.institution_phone} error={visible("institution_phone")} field="institution_phone" onChange={(institution_phone) => patch({ institution_phone })} />
          <TextField label="Institution address (optional)" value={data.institution_address} error={visible("institution_address")} field="institution_address" onChange={(institution_address) => patch({ institution_address })} />
        </div>
      ) : null}

      {step === 4 ? (
        <div className={styles.grid}>
          <p className={styles.noteBox}>
            Disclose every other scholarship and any job. Phone numbers and email addresses stay in their own fields.
          </p>
          <RadioField legend="Rapid scholarship before" name="rapid_received" value={data.rapid_received} error={visible("rapid_received")} field="rapid_received" onChange={(rapid_received) => patch({ rapid_received: rapid_received as ApplicationInput["rapid_received"], rapid_semesters: rapid_received === "Yes" ? data.rapid_semesters : [] })} options={[{ id: "Never", label: "Never" }, { id: "Yes", label: "Yes, in these terms" }]} />
          {data.rapid_received === "Yes" ? (
            <>
              <fieldset className={styles.checks} data-field="rapid_semesters" aria-invalid={visible("rapid_semesters") ? true : undefined}>
                <legend className={styles.legend}>Past terms</legend>
                {RAPID_SEMESTERS.map((semester) => (
                  <label key={semester} className={styles.choice}>
                    <input
                      type="checkbox"
                      checked={data.rapid_semesters.includes(semester)}
                      onChange={(event) =>
                        patch({
                          rapid_semesters: event.target.checked
                            ? [...data.rapid_semesters, semester]
                            : data.rapid_semesters.filter((item) => item !== semester),
                        })
                      }
                    />
                    <span>{semester}</span>
                  </label>
                ))}
                <FieldError message={visible("rapid_semesters")} />
              </fieldset>
              <MoneyField label="Amount received (PKR)" value={data.rapid_amount} error={visible("rapid_amount.amount")} field="rapid_amount.amount" onChange={(rapid_amount) => patch({ rapid_amount: { ...rapid_amount, period: "semester", currency: "PKR" } })} />
            </>
          ) : null}
          <RadioField legend="Any other scholarship" name="other_financial_support" value={data.other_financial_support} error={visible("other_financial_support")} field="other_financial_support" hint="Choose Yes if another office is paying any part of the fee." onChange={(other_financial_support) => patch({ other_financial_support: other_financial_support as ApplicationInput["other_financial_support"] })} options={[{ id: "No", label: "No" }, { id: "Yes", label: "Yes" }]} />
          {data.other_financial_support === "Yes" ? (
            <>
              <SelectOther label="Provider" options={lists.providers} value={data.support_provider} error={visible("support_provider.option_id", "support_provider.other_text")} field="support_provider.option_id" onChange={(support_provider) => patch({ support_provider })} />
              <RadioField legend="Support value" name="support_value_kind" value={data.support_value_kind} error={visible("support_value_kind")} field="support_value_kind" onChange={(support_value_kind) => patch({ support_value_kind: support_value_kind as ApplicationInput["support_value_kind"] })} options={[{ id: "percent", label: "Percent" }, { id: "amount", label: "PKR amount" }]} />
              {data.support_value_kind === "percent" ? (
                <Numberish label="Percent" value={data.support_percent} error={visible("support_percent")} field="support_percent" onChange={(support_percent) => patch({ support_percent })} />
              ) : null}
              {data.support_value_kind === "amount" ? (
                <MoneyField label="Support amount (PKR)" value={data.support_amount} error={visible("support_amount.amount")} field="support_amount.amount" onChange={(support_amount) => patch({ support_amount: { ...support_amount, currency: "PKR", period: "semester" } })} />
              ) : null}
            </>
          ) : null}
          <SelectOther label="How did you hear about Rapid?" options={lists.heard} value={data.heard_about} error={visible("heard_about.option_id", "heard_about.other_text")} field="heard_about.option_id" onChange={(heard_about) => patch({ heard_about })} />
          <TextField label="Church or place of worship" value={data.church_name} error={visible("church_name")} field="church_name" onChange={(church_name) => patch({ church_name })} />
          <SelectOther label="Denomination (optional)" options={lists.denominations} value={data.denomination} error={visible("denomination.option_id", "denomination.other_text")} field="denomination.option_id" onChange={(denomination) => patch({ denomination })} />
          <SelectField label="Pastor or priest title" value={data.pastor_title} error={visible("pastor_title")} field="pastor_title" options={PASTOR_TITLES.map((item) => ({ id: item.id, label: item.label }))} onChange={(pastor_title) => patch({ pastor_title: pastor_title as ApplicationInput["pastor_title"] })} />
          {data.pastor_title === "Other" ? <TextField label="Title" value={data.pastor_title_other} error={visible("pastor_title_other")} field="pastor_title_other" onChange={(pastor_title_other) => patch({ pastor_title_other })} /> : null}
          <TextField label="Pastor or priest name" value={data.pastor_name} error={visible("pastor_name")} field="pastor_name" onChange={(pastor_name) => patch({ pastor_name })} />
          <PhoneField label="Pastor phone" value={data.pastor_phone} error={visible("pastor_phone")} field="pastor_phone" onChange={(pastor_phone) => patch({ pastor_phone })} />
          <TextField label="Pastor email (optional)" type="email" value={data.pastor_email} error={visible("pastor_email")} field="pastor_email" onChange={(pastor_email) => patch({ pastor_email })} />
          <TextField label="Faculty reference name" value={data.faculty_ref_name} error={visible("faculty_ref_name")} field="faculty_ref_name" onChange={(faculty_ref_name) => patch({ faculty_ref_name })} />
          <TextField label="Faculty designation" value={data.faculty_ref_designation} error={visible("faculty_ref_designation")} field="faculty_ref_designation" onChange={(faculty_ref_designation) => patch({ faculty_ref_designation })} />
          <PhoneField label="Faculty phone" value={data.faculty_ref_phone} error={visible("faculty_ref_phone")} field="faculty_ref_phone" onChange={(faculty_ref_phone) => patch({ faculty_ref_phone })} />
          <TextField label="Faculty email" type="email" value={data.faculty_ref_email} error={visible("faculty_ref_email")} field="faculty_ref_email" onChange={(faculty_ref_email) => patch({ faculty_ref_email })} />
          <TextField label="Family reference name" value={data.family_ref_name} error={visible("family_ref_name")} field="family_ref_name" onChange={(family_ref_name) => patch({ family_ref_name })} />
          <SelectOther label="Relationship" options={lists.relationships} value={data.family_ref_relationship} error={visible("family_ref_relationship.option_id", "family_ref_relationship.other_text")} field="family_ref_relationship.option_id" onChange={(family_ref_relationship) => patch({ family_ref_relationship })} />
          <PhoneField label="Family reference phone" value={data.family_ref_phone} error={visible("family_ref_phone")} field="family_ref_phone" onChange={(family_ref_phone) => patch({ family_ref_phone })} />
          <TextField label="Family reference email (optional)" type="email" hint="Leave blank if you only have a phone number." value={data.family_ref_email} error={visible("family_ref_email")} field="family_ref_email" onChange={(family_ref_email) => patch({ family_ref_email })} />
          <RadioField legend="Can you attend Rapid events?" name="attend_events" value={data.attend_events} error={visible("attend_events")} field="attend_events" onChange={(attend_events) => patch({ attend_events: attend_events as ApplicationInput["attend_events"] })} options={[{ id: "Yes", label: "Yes" }, { id: "No", label: "No" }, { id: "Maybe", label: "Maybe" }]} />
        </div>
      ) : null}

      {step === 5 ? (
        <div className={styles.grid}>
          <p className={styles.sectionLead}>Each answer needs 50 to 1500 characters.</p>
          <TextAreaField label="What is your life goal?" value={data.life_goal} error={visible("life_goal")} field="life_goal" maxLength={1500} onChange={(life_goal) => patch({ life_goal })} />
          <TextAreaField label="How will you contribute to your community?" value={data.community_contribution} error={visible("community_contribution")} field="community_contribution" maxLength={1500} onChange={(community_contribution) => patch({ community_contribution })} />
          <TextAreaField label="What is your plan if this scholarship is not awarded?" value={data.plan_if_denied} error={visible("plan_if_denied")} field="plan_if_denied" maxLength={1500} onChange={(plan_if_denied) => patch({ plan_if_denied })} />
          <TextAreaField label="What is your plan after this program?" value={data.future_plan} error={visible("future_plan")} field="future_plan" maxLength={1500} onChange={(future_plan) => patch({ future_plan })} />
        </div>
      ) : null}

      {step === 6 ? (
        <div className={styles.grid}>
          {data.applicant_type === "continuing" ? (
            <fieldset className={styles.checks}>
              <legend className={styles.legend}>Unchanged from the previous term</legend>
              <p className={styles.hint}>Photo and CNICs can be reused. The result card, fee voucher, and pastor letter are required every term.</p>
              <label className={styles.choice}><input type="checkbox" checked={data.reuse_photo} onChange={(event) => patch({ reuse_photo: event.target.checked })} /><span>Passport photo is unchanged</span></label>
              <label className={styles.choice}><input type="checkbox" checked={data.reuse_cnic} onChange={(event) => patch({ reuse_cnic: event.target.checked })} /><span>My CNIC or B-Form is unchanged</span></label>
              <label className={styles.choice}><input type="checkbox" checked={data.reuse_guardian} onChange={(event) => patch({ reuse_guardian: event.target.checked })} /><span>Father or guardian document is unchanged</span></label>
            </fieldset>
          ) : null}
          <DocumentFields
            applicationId={data.client_id}
            documents={data.documents}
            error={
              Object.entries(errors)
                .filter(([key]) => stepAttempted && (key === "documents" || key.startsWith("documents.")))
                .map(([key, message]) => `${fieldLabel(key)}: ${message}`)
                .join(" ") || undefined
            }
            field="documents"
            invalidSlots={Object.keys(errors).flatMap((key) => {
              if (!stepAttempted) return [];
              const named = /^documents\.([a-z0-9_]+)$/.exec(key);
              if (named?.[1]) return [named[1]];
              const indexed = /^documents\.(\d+)\./.exec(key);
              const slot = indexed ? data.documents[Number(indexed[1])]?.slot : "";
              return slot ? [slot] : [];
            })}
            context={{
              name: data.full_name_as_on_cnic,
              cnic: data.cnic,
              fatherName: data.father_name,
              fee: data.fee.amount,
              fatherLate: data.father_status === "Late",
              under18: (ageInYears(data.date_of_birth, new Date()) ?? 18) < 18,
            }}
            hints={[
              { slot: "photo", text: "A clear face photo on a plain background." },
              { slot: "fee_voucher", text: "The voucher must show the same whole-number fee you entered." },
              { slot: "pastor_letter", text: "Signed, on letterhead, and dated for this cycle." },
              { slot: "result", text: "Up to five files. Include the latest term you marked as declared." },
              { slot: "income_proof", text: "Recommended when a parent or you have income above zero." },
              ...(data.disability && data.disability !== "none" ? [{ slot: "disability_certificate", text: "Required because a disability is selected." }] : []),
              ...(data.other_financial_support === "Yes" ? [{ slot: "other_award", text: "Required because another scholarship was declared." }] : []),
            ]}
            sampleSlots={mocks && mocks.length > 0 ? requiredDocumentSlots(data) : undefined}
            onUpsert={upsertDocument}
            onRemove={removeDocument}
          />
        </div>
      ) : null}

      {step === 7 ? (
        <div className={styles.grid}>
          <p className={styles.sectionLead}>You are responsible for this application. Review each section, then agree and submit.</p>
          {FORM_STEPS.slice(0, 7).map((item, index) => (
            <article key={item.id} className={styles.reviewCard}>
              <header className={styles.reviewHead}>
                <h3>{item.label}</h3>
                <button
                  type="button"
                  className={styles.chipChange}
                  onClick={() => {
                    setReturnToReview(true);
                    setStepAttempted(false);
                    setStep(index);
                  }}
                >
                  Edit
                </button>
              </header>
              <p>{reviewLine(item.id, data)}</p>
            </article>
          ))}
          <p className={styles.noteBox}>
            I confirm that the information in this application is true, that Rapid Charity may contact the pastor,
            faculty member, and family reference I named, and that a scholarship is not guaranteed.
          </p>
          <label className={styles.choice} data-field="consent_accepted">
            <input
              type="checkbox"
              checked={data.consent_accepted}
              aria-invalid={visible("consent_accepted") ? true : undefined}
              onChange={(event) => patch({ consent_accepted: event.target.checked })}
            />
            <span>I agree</span>
          </label>
          <FieldError message={visible("consent_accepted")} />
          <TextField label="Type your full name" value={data.consent_name} error={visible("consent_name")} field="consent_name" onChange={(consent_name) => patch({ consent_name })} />
        </div>
      ) : null}

      <div className={styles.hp} aria-hidden="true">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={data.website} onChange={(event) => patch({ website: event.target.value })} />
        </label>
      </div>

      <div className={styles.actions}>
        <button type="button" className="btn-secondary" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>
          Back
        </button>
        {step < FORM_STEPS.length - 1 ? (
          <button type="button" className="btn" disabled={blocked || !ready} onClick={() => goNext()}>{returnToReview ? "Back to review" : "Continue"}</button>
        ) : (
          <button type="button" className="btn" disabled={busy || !ready} onClick={() => void submit()}>
            {busy ? "Submitting…" : "Submit application"}
          </button>
        )}
      </div>
      </div>
    </form>
  );
}

function reviewLine(id: string, data: ApplicationInput): string {
  if (id === "scholarship") {
    const name = SCHOLARSHIPS.find((item) => item.id === data.scholarship)?.label ?? "Not chosen";
    const kind = data.applicant_type === "continuing" ? "Continuing" : data.applicant_type === "new" ? "New" : "Applicant type not chosen";
    return `${kind} · ${name}`;
  }
  if (id === "personal") return [data.first_name, data.last_name].filter(Boolean).join(" ") || "Name not entered yet";
  if (id === "family") return data.father_name ? `Father: ${data.father_name}` : "Family details not entered yet";
  if (id === "academics") return data.program_title || data.field_of_study.other_text || data.field_of_study.option_id || "Program not entered yet";
  if (id === "support") return data.church_name || data.pastor_name || "References not entered yet";
  if (id === "essays") return data.life_goal ? `${data.life_goal.slice(0, 140)}${data.life_goal.length > 140 ? "…" : ""}` : "Essays not entered yet";
  if (id === "documents") return data.documents.length ? `${data.documents.length} file${data.documents.length === 1 ? "" : "s"} uploaded` : "No files uploaded yet";
  return "";
}

function Numberish({
  label,
  value,
  onChange,
  error,
  field,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
  field?: string;
}) {
  return (
    <TextField
      label={label}
      field={field}
      value={value === null ? "" : String(value)}
      error={error}
      onChange={(raw) => {
        const trimmed = raw.trim();
        if (!trimmed) {
          onChange(null);
          return;
        }
        if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) return;
        onChange(Number(trimmed));
      }}
    />
  );
}
