import Link from "next/link";
import type { BlogTaxonomy } from "@/lib/content";
import styles from "./CategoryRail.module.css";

type Labels = {
  allPostsLabel: string;
  categoryAriaLabel: string;
};

type Props = {
  activeSlug?: string | null;
  categories: BlogTaxonomy[];
  labels: Labels;
};

/** Blog category strip matching Wix post/blog chrome. */
export function CategoryRail({
  activeSlug = null,
  categories,
  labels,
}: Props) {
  return (
    <nav className={styles.rail} aria-label={labels.categoryAriaLabel}>
      <div className={`container ${styles.inner}`}>
        <ul className={styles.list}>
          <li>
            <Link
              href="/blog"
              className={!activeSlug ? styles.active : undefined}
              aria-current={!activeSlug ? "page" : undefined}
            >
              {labels.allPostsLabel}
            </Link>
          </li>
          {categories.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/blog/categories/${category.slug}`}
                className={activeSlug === category.slug ? styles.active : undefined}
                aria-current={activeSlug === category.slug ? "page" : undefined}
              >
                {category.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
