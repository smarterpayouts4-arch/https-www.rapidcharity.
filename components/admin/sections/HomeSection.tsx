import type { HomepageSectionId, SiteContent } from "@/lib/content/schema";
import styles from "@/app/admin/admin.module.css";
import { ContentFields } from "../ContentFields";
import { LegacyFields } from "../LegacyFields";
import { HOME_KEYS, SECTION_LABELS, type ContentChange } from "../config";

type Props = { content: SiteContent; onChange: ContentChange; uploadBusy: boolean; onUpload: (file: File | null) => void };
export function HomeSection({ content, onChange, uploadBusy, onUpload }: Props) {
  function move(index: number, direction: -1 | 1) {
    const sections = [...content.homepage.sections]; const next = index + direction;
    if (next < 0 || next >= sections.length) return;
    [sections[index], sections[next]] = [sections[next], sections[index]];
    onChange(["homepage", "sections"], sections);
  }
  function toggle(id: HomepageSectionId) {
    onChange(["homepage", "sections"], content.homepage.sections.map((item) => item.id === id ? { ...item, visible: !item.visible } : item));
  }
  return <>
    <section className={styles.card}><h2>Homepage sections</h2><p className={styles.cardLead}>Show and reorder homepage blocks.</p>
      <ul className={styles.sectionList}>{content.homepage.sections.map((item, index) => <li key={item.id} className={styles.sectionItem}>
        <label className={styles.toggle}><input type="checkbox" checked={item.visible} onChange={() => toggle(item.id)} />Show section</label>
        <span>{SECTION_LABELS[item.id]}</span><div className={styles.moveBtns}>
          <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)}>↑</button>
          <button type="button" aria-label="Move down" disabled={index === content.homepage.sections.length - 1} onClick={() => move(index, 1)}>↓</button>
        </div></li>)}</ul>
    </section>
    <section className={styles.card}><h2>Homepage content and assets</h2>
      <p className={styles.cardLead}>All homepage copy, links, image paths, alt text, and video settings.</p>
      <div className={styles.uploadRow}><input type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v"
        disabled={uploadBusy} onChange={(event) => { onUpload(event.target.files?.[0] ?? null); event.target.value = ""; }} />
        <span className={styles.hint}>Optional local clip (8 MB max, dev only). Prefer Mission Overview → Video → Embed Url with a YouTube or Vimeo link. Set MISSION_VIDEO_EMBED_URL to override on the server.</span></div>
      {HOME_KEYS.map((key) => <ContentFields key={key} value={content[key]} path={[key]} onChange={onChange} />)}
      <LegacyFields content={content} onChange={onChange} prefixes={["applicationCard"]} />
    </section>
  </>;
}
