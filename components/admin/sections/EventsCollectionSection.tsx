"use client";

import type { EventsCollection, EventItem } from "@/lib/content";
import styles from "@/app/admin/admin.module.css";
import { Field } from "../Field";

type Props = {
  collection: EventsCollection;
  onChange: (next: EventsCollection) => void;
  busy: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
  status: string;
  statusKind: "ok" | "err" | "";
};

export function EventsCollectionSection({
  collection,
  onChange,
  busy,
  onSaveDraft,
  onPublish,
  status,
  statusKind,
}: Props) {
  const updateItem = (id: string, patch: Partial<EventItem>) => {
    onChange({
      ...collection,
      items: collection.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    });
  };

  const addItem = () => {
    const item: EventItem = {
      id: `event-${collection.items.length + 1}`,
      title: "New event",
      body: "",
      status: "draft",
    };
    onChange({ ...collection, items: [item, ...collection.items] });
  };

  return (
    <>
      <section className={styles.card}>
        <h2>Events collection</h2>
        <p className={styles.cardLead}>
          Page title/subtitle stay in site chrome. Event cards live in{" "}
          <code>content/events.draft.json</code> → <code>content/events.json</code>.
        </p>
        <div className={styles.actions} style={{ marginBottom: "0.75rem" }}>
          <button type="button" className={styles.btnGhost} onClick={addItem}>
            Add event
          </button>
          <button
            type="button"
            className={styles.btn}
            disabled={busy}
            onClick={onSaveDraft}
          >
            Save events draft
          </button>
          <button
            type="button"
            className={styles.btnDanger}
            disabled={busy}
            onClick={onPublish}
          >
            Publish events
          </button>
        </div>
        <p
          className={`${styles.status} ${
            statusKind === "ok"
              ? styles.statusOk
              : statusKind === "err"
                ? styles.statusErr
                : ""
          }`}
          role="status"
        >
          {status || `${collection.items.length} events`}
        </p>
      </section>

      {collection.items.map((item) => (
        <section key={item.id} className={styles.card}>
          <h2>{item.title || item.id}</h2>
          <div className={styles.row2}>
            <Field
              label="ID"
              mono
              value={item.id}
              onChange={(value) => updateItem(item.id, { id: value })}
            />
            <div className={styles.field}>
              <label htmlFor={`event-status-${item.id}`}>Status</label>
              <select
                id={`event-status-${item.id}`}
                value={item.status}
                onChange={(event) =>
                  updateItem(item.id, {
                    status: event.target.value as EventItem["status"],
                  })
                }
              >
                <option value="published">published</option>
                <option value="draft">draft</option>
              </select>
            </div>
          </div>
          <Field
            label="Title"
            value={item.title}
            onChange={(value) => updateItem(item.id, { title: value })}
          />
          <Field
            label="Body"
            multiline
            value={item.body}
            onChange={(value) => updateItem(item.id, { body: value })}
          />
        </section>
      ))}
    </>
  );
}
