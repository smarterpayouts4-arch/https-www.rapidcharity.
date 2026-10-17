import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { PreviewBanner } from "@/components/PreviewBanner";
import { loadSiteContent, resolvePreview } from "@/lib/content";
import styles from "./about-us.module.css";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "About Us" , alternates: { canonical: `${site.url}/about-us` } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AboutUsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const params = searchParams ? await searchParams : undefined;
  const preview = await resolvePreview(params);
  const { about, verified, chrome } = await loadSiteContent({ preview });

  return (
    <>
      {preview ? <PreviewBanner content={chrome.preview} liveHref="/about-us" /> : null}
      <PageHero title={about.heroTitle} subtitle={about.heroSubtitle} />
      <section className="section">
        <div className={`container ${styles.stack}`}>
          <div className={styles.block}>
            <h2>{about.whoWeAre.title}</h2>
            <p className={styles.lead}>{about.whoWeAre.lead}</p>
            <p>{about.whoWeAre.body}</p>
            <ul className={styles.meta} aria-label={about.whoWeAre.factsAriaLabel}>
              {about.whoWeAre.meta.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>

          <div className={styles.block}>
            <h2>{about.mission.title}</h2>
            {about.mission.paragraphs.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
          </div>

          <div className={styles.block}>
            <h2>{about.whatWeDo.title}</h2>
            <p>{about.whatWeDo.intro}</p>
            <div className={styles.grid2}>
              <article className={styles.card}>
                <h3>{about.whatWeDo.scholarshipProgramsTitle}</h3>
                <ul>
                  {about.whatWeDo.scholarshipPrograms.map((prog) => (
                    <li key={prog.href}>
                      <Link href={prog.href}>{prog.label}</Link>:{" "}
                      {prog.description}
                    </li>
                  ))}
                </ul>
              </article>
              <article className={styles.card}>
                <h3>{about.whatWeDo.awardsTitle}</h3>
                <ul>
                  {about.whatWeDo.awards.map((a) => (
                    <li key={a.slice(0, 36)}>{a}</li>
                  ))}
                </ul>
              </article>
            </div>
          </div>

          <div className={styles.block}>
            <h2>{about.howItWorks.title}</h2>
            <p>{about.howItWorks.intro}</p>
            <ol className={styles.steps}>
              {about.howItWorks.steps.map((s) => (
                <li key={s.title}>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </li>
              ))}
            </ol>
            <div className={styles.ctaRow}>
              <Link className="btn" href={about.howItWorks.primaryCta.href}>
                {about.howItWorks.primaryCta.label}
              </Link>
              <Link
                className="btn-secondary"
                href={about.howItWorks.secondaryCta.href}
              >
                {about.howItWorks.secondaryCta.label}
              </Link>
            </div>
          </div>

          <div className={`${styles.block} ${styles.alt}`}>
            <h2>{about.leadership.title}</h2>
            <p>{about.leadership.body}</p>
          </div>

          <div className={styles.block}>
            <h2>{about.contact.title}</h2>
            <ul className={styles.contactList}>
              <li>
                {about.contact.emailLabel}:{" "}
                <a href={`mailto:${verified.contactEmail}`}>
                  {verified.contactEmail}
                </a>
              </li>
              <li>
                {about.contact.websiteLabel}:{" "}
                <a
                  href={about.contact.websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {about.contact.websiteDisplay}
                </a>
              </li>
              <li>
                {about.contact.facebookLabel}:{" "}
                <a
                  href={about.contact.facebookHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {about.contact.facebookDisplay}
                </a>
              </li>
              <li>
                {about.contact.instagramLabel}:{" "}
                <a
                  href={about.contact.instagramHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {about.contact.instagramDisplay}
                </a>
              </li>
            </ul>
            <div className={styles.ctaRow}>
              <Link className="btn" href={about.contact.primaryCta.href}>
                {about.contact.primaryCta.label}
              </Link>
              <Link
                className="btn-secondary"
                href={about.contact.secondaryCta.href}
              >
                {about.contact.secondaryCta.label}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
