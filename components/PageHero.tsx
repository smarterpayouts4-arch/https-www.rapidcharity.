import styles from "./PageHero.module.css";

export function PageHero({ title, subtitle }: { title: string; subtitle?: string }) {
  return <section className={styles.hero}><div className="container">
    <h1>{title}</h1>{subtitle ? <p>{subtitle}</p> : null}
  </div></section>;
}
