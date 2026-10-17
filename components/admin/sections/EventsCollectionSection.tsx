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
  const updateItem = (index: number, patch: Partial<EventItem>) => {
    onChange({
      ...collection,
      items: collection.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });
  };

  const removeItem = (index: number) => {
    const item = collection.items[index];
    if (!window.confirm(`Remove event "${item.title}"? Its photos stay on disk.`)) return;
    onChange({ ...collection, items: collection.items.filter((_, i) => i !== index) });
  };

  const addItem = () => {
    const taken = new Set(collection.items.map((item) => item.id));
    let n = collection.items.length + 1;
    while (taken.has(`event-${n}`)) n += 1;
    const item: EventItem = {
      id: `event-${n}`,
      title: "New event",
      body: "",
      status: "draft",
      date: "",
      time: "",
      location: "",
      images: [],
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

      {collection.items.map((item, index) => {
        const key = `event-${index}`;
        const images = item.images ?? [];
        return (
          <section key={key} className={styles.card} data-testid={key}>
            <h2>{item.title || item.id}</h2>
            <div className={styles.row2}>
              <Field id={`${key}-id`} label="ID" mono value={item.id} onChange={(value) => updateItem(index, { id: value })} />
              <div className={styles.field}>
                <label htmlFor={`${key}-status`}>Status</label>
                <select
                  id={`${key}-status`}
                  value={item.status}
                  onChange={(event) => updateItem(index, { status: event.target.value as EventItem["status"] })}
                >
                  <option value="published">published</option>
                  <option value="draft">draft</option>
                </select>
              </div>
            </div>
            <Field id={`${key}-title`} label="Title" value={item.title} onChange={(value) => updateItem(index, { title: value })} />
            <div className={styles.row2}>
              <Field
                id={`${key}-date`}
                label="Date"
                type="date"
                value={item.date ?? ""}
                onChange={(value) => updateItem(index, { date: value })}
                hint="Today or later lists it under Upcoming events. Empty keeps the date read from the text."
              />
              <Field
                id={`${key}-time`}
                label="Time (optional)"
                value={item.time ?? ""}
                onChange={(value) => updateItem(index, { time: value })}
              />
            </div>
            <Field
              id={`${key}-location`}
              label="Location"
              value={item.location ?? ""}
              onChange={(value) => updateItem(index, { location: value })}
              hint="Venue or city. Empty uses the city named in the title."
            />
            <Field
              id={`${key}-body`}
              label="Description"
              multiline
              value={item.body}
              onChange={(value) => updateItem(index, { body: value })}
            />
            <fieldset className={`${styles.field} ${styles.checkGroup}`}>
              <legend>Photos ({images.length})</legend>
              {images.map((image, imageIndex) => (
                <div key={imageIndex} className={styles.row2}>
                  <Field
                    id={`${key}-img-${imageIndex}-src`}
                    label="Image path"
                    mono
                    value={image.src}
                    onChange={(value) =>
                      updateItem(index, { images: images.map((img, i) => (i === imageIndex ? { ...img, src: value } : img)) })
                    }
                  />
                  <Field
                    id={`${key}-img-${imageIndex}-alt`}
                    label="Alt text"
                    value={image.alt}
                    onChange={(value) =>
                      updateItem(index, { images: images.map((img, i) => (i === imageIndex ? { ...img, alt: value } : img)) })
                    }
                  />
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.btnGhost}
                      onClick={() => updateItem(index, { images: images.filter((_, i) => i !== imageIndex) })}
                    >
                      Remove photo
                    </button>
                  </div>
                </div>
              ))}
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => updateItem(index, { images: [...images, { src: "/assets/images/", alt: "" }] })}
                >
                  Add photo
                </button>
                <span className={styles.hint}>Use a path to an image already in public/, for example /assets/images/events/photo.jpg.</span>
              </div>
            </fieldset>
            <div className={styles.actions}>
              <button type="button" className={styles.btnGhost} onClick={() => removeItem(index)}>
                Remove event
              </button>
            </div>
          </section>
        );
      })}
    </>
  );
}
