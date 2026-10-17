import type { SiteContent } from "@/lib/content/schema";
import styles from "@/app/admin/admin.module.css";
import { ContentFields } from "../ContentFields";
import type { ContentChange } from "../config";

type Props = { title: string; lead?: string; content: SiteContent; keys: Array<keyof SiteContent>; onChange: ContentChange };
export function GroupSection({ title, lead, content, keys, onChange }: Props) {
  return <section className={styles.card}><h2>{title}</h2>{lead ? <p className={styles.cardLead}>{lead}</p> : null}
    {keys.map((key) => <ContentFields key={key} value={content[key]} path={[key]} onChange={onChange} />)}
  </section>;
}
