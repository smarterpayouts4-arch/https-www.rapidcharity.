"use client";

import { useState } from "react";
import type { SiteContent } from "@/lib/content/schema";
import styles from "@/app/admin/admin.module.css";
import { ContentFields } from "../ContentFields";
import { LegacyFields } from "../LegacyFields";
import type { ContentChange } from "../config";

export function VerifiedSection({ content, onChange }: { content: SiteContent; onChange: ContentChange }) {
  const [unlocked, setUnlocked] = useState(false);
  return <section className={styles.card}><h2>Verified organization facts</h2>
    <div className={styles.verifiedBox}><p><strong>Verified facts warning:</strong> These values are checked charity facts. Do not invent facts.</p>
      <label className={styles.unlock}><input type="checkbox" checked={unlocked} onChange={(event) => setUnlocked(event.target.checked)} />
        I understand. Unlock verified fields for this session</label></div>
    <ContentFields value={content.verified} path={["verified"]} onChange={onChange} disabled={!unlocked} />
    <LegacyFields content={content} onChange={onChange} prefixes={["verified"]} disabled={!unlocked} />
  </section>;
}
