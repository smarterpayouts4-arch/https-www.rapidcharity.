import type { Metadata } from "next";
import Image from "next/image";
import { ReadableParagraph } from "@/components/content/Guide";
import { GiftChooser } from "@/components/donate/GiftChooser";
import { PreviewBanner } from "@/components/PreviewBanner";
import { ShareRow } from "@/components/ShareRow";
import { loadSiteContent, resolvePreview } from "@/lib/content";
import { site } from "@/lib/site";
import styles from "./donate.module.css";

export const metadata: Metadata = { title: "Donate" , alternates: { canonical: `${site.url}/donate` } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DonatePage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const params = searchParams ? await searchParams : undefined;
  const preview = await resolvePreview(params);
  const { donate, chrome } = await loadSiteContent({ preview });

  return (
    <>
      {preview ? <PreviewBanner content={chrome.preview} liveHref="/donate" /> : null}
      <section className={`section ${styles.top}`}>
        <div className={`container ${styles.wrap}`}>
          <h1 className={styles.heroTitle}>{donate.heroTitle}</h1>
          <p className={styles.ctaWrap}>
            <a
              id="donate-paypal"
              className={`text-link ${styles.donateCta}`}
              href={donate.paypalHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              {donate.ctaLabel}
            </a>
          </p>
          <p className={styles.intro}>{donate.intro}</p>
          <GiftChooser />
          <figure className={styles.heroImg}>
            <Image
              src={donate.heroImage}
              alt={donate.heroImageAlt}
              width={980}
              height={415}
              priority
              className={styles.img}
            />
          </figure>
          <ShareRow
            content={chrome.share}
            url={`${site.url}/donate`}
            title={donate.shareTitle}
            variant="labeled"
          />
        </div>
      </section>

      <section className={styles.dear} data-reveal>
        <div className={`container prose ${styles.wrap}`}>
          <h2 className={styles.dearTitle}>
            <span className={styles.dearAccent}>{donate.dearTitleAccent}</span>{" "}
            {donate.dearTitleRest}
          </h2>
          {donate.dearParagraphs.map((p, i) => {
            const isLast = i === donate.dearParagraphs.length - 1;
            if (!isLast || !p.includes(donate.donateLinkPhrase)) {
              return <ReadableParagraph key={i} text={p} />;
            }
            const parts = p.split(donate.donateLinkPhrase);
            return (
              <p key={i}>
                {parts[0]}
                <a
                  className="text-link"
                  href={donate.paypalHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {donate.donateLinkPhrase}
                </a>
                {parts.slice(1).join(donate.donateLinkPhrase)}
              </p>
            );
          })}
        </div>
      </section>

      <section className={styles.thanks} aria-label={donate.thanksAriaLabel}>
        <div className={styles.thanksInner}>
          <Image
            src={donate.thanksImage}
            alt={donate.thanksImageAlt}
            width={980}
            height={238}
            className={styles.thanksBg}
          />
          <div className={styles.thanksCopy}>
            <p className={styles.thanksLine}>{donate.thanksLine}</p>
            <p className={styles.team}>{donate.thanksTeam}</p>
          </div>
        </div>
      </section>
    </>
  );
}
