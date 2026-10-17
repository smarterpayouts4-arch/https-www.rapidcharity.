"use client";

import { FormEvent, useState } from "react";
import type { SiteContent } from "@/lib/content/schema";
import styles from "./Footer.module.css";

type Props = { content: SiteContent["footer"]["subscribe"]; email: string };

/** Mailto-only UI: no newsletter backend is implied. */
export function SubscribeForm({ content, email: destination }: Props) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(true);
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!consent) return;
    const subject = encodeURIComponent(content.mailSubject);
    const body = encodeURIComponent(`${content.mailBodyIntro}\n\n${email}\n`);
    window.location.href = `mailto:${destination}?subject=${subject}&body=${body}`;
    setSent(true);
  }

  return (
    <form className={styles.subscribe} onSubmit={onSubmit}>
      <label className={styles.subscribeLabel} htmlFor="subscribe-email">{content.emailLabel}</label>
      <div className={styles.subscribeRow}>
        <input id="subscribe-email" type="email" required placeholder={content.placeholder} value={email}
          onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <button className="btn btn-sm" type="submit">{content.submitLabel}</button>
      </div>
      <label className={styles.consent}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>{content.consentLabel}</span>
      </label>
      {sent ? <p className={styles.note}>{content.successMessage}</p> : null}
    </form>
  );
}
