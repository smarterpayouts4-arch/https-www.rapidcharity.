"use client";

import styles from "@/app/admin/admin.module.css";
import { applicationStatus, formatIntakeDate } from "@/lib/application/intakes";
import {
  DEFAULT_ANNOUNCEMENT,
  DEFAULT_APPLICATION_FORM,
  DEFAULT_INTAKES,
  scholarshipIds,
  type ApplicationFormSettings,
  type Intake,
} from "@/lib/content/schema/schedule";
import { resolveFormState } from "@/lib/application/formState";
import type { SiteContent } from "@/lib/content/schema";
import type { ContentChange } from "../config";
import { Field } from "../Field";

const SCHOLARSHIP_LABELS: Record<(typeof scholarshipIds)[number], string> = {
  "john-ivy-azariah": "John-Ivy Azariah",
  "robert-mathias": "Robert Mathais",
  "ivy-azariah": "Ivy Azariah",
};

const STATE_LABELS = {
  upcoming: "Upcoming",
  open: "Open",
  "closing-soon": "Closing soon",
  closed: "Closed",
} as const;

type Props = {
  content: SiteContent;
  onChange: ContentChange;
};

export function ScheduleSection({ content, onChange }: Props) {
  const intakes = content.intakes ?? DEFAULT_INTAKES;
  const announcement = content.announcement ?? DEFAULT_ANNOUNCEMENT;
  const items = intakes.items as Intake[];
  const status = applicationStatus(intakes);
  const form = content.applicationForm ?? DEFAULT_APPLICATION_FORM;
  const formState = resolveFormState(form, intakes);
  const cycleValid = /^(spring|fall)-\d{4}$/.test(form.cycleId);
  const setForm = (key: keyof ApplicationFormSettings, value: unknown) => onChange(["applicationForm", key], value);

  const setItems = (next: Intake[]) => onChange(["intakes", "items"], next);
  const patchItem = (index: number, patch: Partial<Intake>) =>
    setItems(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const addIntake = () =>
    setItems([
      ...items,
      { id: `intake-${items.length + 1}`, name: "New Semester", opens: "", deadline: items.at(-1)?.deadline ?? "", scholarships: [] },
    ]);
  const removeIntake = (index: number) => {
    if (items.length <= 1) return;
    if (!window.confirm(`Remove intake "${items[index].name}"?`)) return;
    setItems(items.filter((_, i) => i !== index));
  };
  const moveIntake = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
  };
  const setAnnouncement = (key: keyof typeof announcement, value: unknown) =>
    onChange(["announcement", key], value);

  return (
    <>
      <section className={styles.card} data-testid="schedule-status">
        <h2>Application intakes</h2>
        <p className={styles.cardLead}>
          These dates drive the homepage application card, the deadline band on /apply, the deadline lines on each
          scholarship page and the {"{deadlines}"} text on the criteria page. Status is worked out on every page view in
          the {intakes.timezone} time zone: upcoming before the opens date, open, closing soon in the last{" "}
          {intakes.closingSoonDays} days, then closed. Save draft and Preview, then Publish to go live. No rebuild needed.
        </p>
        <p className={`${styles.status} ${styles.statusOk}`} role="status">
          Live status with these draft values: {STATE_LABELS[status.state]}. {status.title}. {status.deadlineLabel}:{" "}
          {status.deadlineValue}.
        </p>
        <div className={styles.row2}>
          <Field
            id="intakes-timezone"
            label="Time zone"
            mono
            value={intakes.timezone}
            onChange={(value) => onChange(["intakes", "timezone"], value)}
            hint="IANA name, for example Asia/Karachi."
          />
          <Field
            id="intakes-closing-soon"
            label="Closing soon window (days)"
            value={String(intakes.closingSoonDays)}
            onChange={(value) => {
              const n = Number.parseInt(value, 10);
              onChange(["intakes", "closingSoonDays"], Number.isFinite(n) ? Math.max(0, Math.min(90, n)) : 0);
            }}
          />
        </div>
      </section>

      {items.map((item, index) => (
        <section key={index} className={styles.card} data-testid={`intake-${index}`}>
          <h2>{item.name || item.id}</h2>
          <div className={styles.row2}>
            <Field
              id={`intake-${index}-name`}
              label="Name"
              value={item.name}
              onChange={(value) => patchItem(index, { name: value })}
              hint="Shown on the site, for example Spring Semester 2027."
            />
            <Field
              id={`intake-${index}-id`}
              label="ID"
              mono
              value={item.id}
              onChange={(value) => patchItem(index, { id: value })}
            />
          </div>
          <div className={styles.row2}>
            <Field
              id={`intake-${index}-opens`}
              label="Opens on"
              type="date"
              value={item.opens ?? ""}
              onChange={(value) => patchItem(index, { opens: value })}
              hint={item.opens ? formatIntakeDate(item.opens) : "Leave empty if not announced yet."}
            />
            <Field
              id={`intake-${index}-deadline`}
              label="Deadline (last day)"
              type="date"
              value={item.deadline}
              onChange={(value) => patchItem(index, { deadline: value })}
              hint={item.deadline ? formatIntakeDate(item.deadline) : undefined}
            />
          </div>
          <fieldset className={`${styles.field} ${styles.checkGroup}`}>
            <legend>Scholarships (none ticked = all)</legend>
            <div className={styles.actions}>
              {scholarshipIds.map((sid) => {
                const checked = item.scholarships?.includes(sid) ?? false;
                return (
                  <label key={sid}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        patchItem(index, {
                          scholarships: event.target.checked
                            ? [...(item.scholarships ?? []), sid]
                            : (item.scholarships ?? []).filter((x) => x !== sid),
                        })
                      }
                    />{" "}
                    {SCHOLARSHIP_LABELS[sid]}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div className={styles.actions}>
            <button type="button" className={styles.btnGhost} onClick={() => moveIntake(index, -1)} disabled={index === 0}>
              Move up
            </button>
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => moveIntake(index, 1)}
              disabled={index === items.length - 1}
            >
              Move down
            </button>
            <button type="button" className={styles.btnGhost} onClick={() => removeIntake(index)} disabled={items.length <= 1}>
              Remove intake
            </button>
          </div>
        </section>
      ))}

      <section className={styles.card}>
        <div className={styles.actions}>
          <button type="button" className={styles.btnGhost} onClick={addIntake}>
            Add intake
          </button>
        </div>
      </section>

      <section className={styles.card} data-testid="application-form-editor">
        <h2>Application form</h2>
        <p className={styles.cardLead}>
          The cycle new submissions on /apply/form are filed under. It sets the form header, the duplicate CNIC check
          (one submission per CNIC per cycle), the upload folder, and the default batch in the Applications tab.
          Existing batches keep their own cycle. Publish to apply.
        </p>
        <p className={`${styles.status} ${formState.open ? styles.statusOk : styles.statusErr}`} role="status">
          With these draft values the form is {formState.open ? "open" : "closed"} for {form.cycleName} ({form.cycleId}).
        </p>
        <div className={styles.row2}>
          <Field
            id="form-cycle-id"
            label="Cycle id"
            mono
            value={form.cycleId}
            onChange={(value) => setForm("cycleId", value.trim().toLowerCase())}
            hint={cycleValid ? "Batch id, for example spring-2027." : "Use spring-YYYY or fall-YYYY, for example fall-2027."}
          />
          <Field
            id="form-cycle-name"
            label="Display name"
            value={form.cycleName}
            onChange={(value) => setForm("cycleName", value)}
            hint="Shown on the form, for example Spring Semester 2027."
          />
        </div>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label htmlFor="form-availability">Availability</label>
            <select
              id="form-availability"
              value={form.availability}
              onChange={(event) => setForm("availability", event.target.value)}
            >
              <option value="always-open">Always open (default)</option>
              <option value="closed">Closed</option>
              <option value="follow-intake">Follow intake dates</option>
            </select>
            <p className={styles.hint}>
              Closed shows a friendly message naming the next intake and the server refuses new submissions and uploads.
              Re-upload links for existing applications keep working.
            </p>
          </div>
          <div className={styles.field}>
            <label htmlFor="form-intake">Intake to follow</label>
            <select
              id="form-intake"
              value={form.intakeId}
              disabled={form.availability !== "follow-intake"}
              onChange={(event) => setForm("intakeId", event.target.value)}
            >
              <option value="">Same id as the cycle</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.id})
                </option>
              ))}
            </select>
            <p className={styles.hint}>Used only with Follow intake dates: open from its opens date to its deadline.</p>
          </div>
        </div>
        <Field
          id="form-closed-message"
          label="Extra closed message (optional)"
          multiline
          value={form.closedMessage}
          onChange={(value) => setForm("closedMessage", value)}
        />
      </section>

      <section className={styles.card} data-testid="announcement-editor">
        <h2>Announcement banner</h2>
        <p className={styles.cardLead}>
          A slim bar above the header on every public page. It shows only while switched on and inside the optional date
          window.
        </p>
        <div className={styles.field}>
          <label>
            <input
              type="checkbox"
              checked={announcement.enabled}
              onChange={(event) => setAnnouncement("enabled", event.target.checked)}
            />{" "}
            Show the banner
          </label>
        </div>
        <Field
          id="announcement-text"
          label="Banner text"
          multiline
          value={announcement.text}
          onChange={(value) => setAnnouncement("text", value)}
        />
        <div className={styles.row2}>
          <Field
            id="announcement-link-label"
            label="Link label"
            value={announcement.linkLabel}
            onChange={(value) => setAnnouncement("linkLabel", value)}
          />
          <Field
            id="announcement-link-href"
            label="Link URL"
            mono
            value={announcement.linkHref}
            onChange={(value) => setAnnouncement("linkHref", value)}
            hint="A site path like /apply or a full https:// link."
          />
        </div>
        <div className={styles.row2}>
          <Field
            id="announcement-starts"
            label="Show from"
            type="date"
            value={announcement.startsOn ?? ""}
            onChange={(value) => setAnnouncement("startsOn", value)}
          />
          <Field
            id="announcement-ends"
            label="Show until"
            type="date"
            value={announcement.endsOn ?? ""}
            onChange={(value) => setAnnouncement("endsOn", value)}
          />
        </div>
      </section>
    </>
  );
}
