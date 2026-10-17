import styles from "./DeadlineBand.module.css";

type Deadline = { title: string; body: string };
export function DeadlineBand({ items, ariaLabel }: { items: Deadline[]; ariaLabel: string }) {
  return (
    <section className={styles.band} aria-label={ariaLabel}>
      <div className={`container ${styles.grid}`}>
        {items.map((item) => <div key={item.title} className={styles.col} data-reveal-item>
          <h3 className={styles.title}>{item.title}</h3><p className={styles.body}>{item.body}</p>
        </div>)}
      </div>
    </section>
  );
}
