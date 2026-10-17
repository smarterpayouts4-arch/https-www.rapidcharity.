import { existsSync } from "fs";
import { join } from "path";
import Image from "next/image";
import Link from "next/link";
import type { SiteContent } from "@/lib/content/schema";
import { Reveal } from "@/components/motion/Reveal";
import { parseVideoEmbed, resolveMissionEmbedUrl } from "@/lib/content/media";
import styles from "./MissionOverview.module.css";

type Props = {
  content: SiteContent["missionOverview"];
};

function hasLocalVideoFile(publicSrc: string) {
  if (!publicSrc.startsWith("/")) return false;
  try {
    return existsSync(join(process.cwd(), "public", publicSrc.replace(/^\//, "")));
  } catch {
    return false;
  }
}

export function MissionOverview({ content }: Props) {
  const { video } = content;
  const embed = parseVideoEmbed(resolveMissionEmbedUrl(video.embedUrl));
  const useLocal = !embed && hasLocalVideoFile(video.src);
  const watchHref = video.facebookHref?.trim() || "";
  const words = content.title.trim().split(/\s+/);
  const accent = words.length > 1 ? words.pop() : "";
  const leadIn = words.join(" ");

  return (
    <section className={styles.section} aria-labelledby="who-we-are-heading">
      <div className={styles.band}>
        <Reveal className={styles.statement}>
          <p className={styles.eyebrow}>{content.eyebrow}</p>
          <h2 id="who-we-are-heading" className={styles.title}>
            {leadIn}{accent ? " " : ""}
            {accent ? <em>{accent}</em> : null}
          </h2>
          <p className={styles.lead}>{content.lead}</p>
          <Link className="btn-white" href={content.ctaHref}>
            {content.ctaLabel} <span aria-hidden="true">→</span>
          </Link>
        </Reveal>
        <div className={styles.visual}>
          <div className={styles.videoPanel}>
            <p className={styles.videoLabel}>{video.label}</p>
            {embed ? (
              <div className={styles.fbWrap}>
                <iframe
                  className={styles.fbFrame}
                  src={embed.src}
                  title={video.embedTitle}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            ) : useLocal ? (
              <video
                className={styles.video}
                controls
                playsInline
                preload="metadata"
                poster={video.poster}
                src={video.src}
                aria-label={video.ariaLabel}
              >
                {video.unsupportedText} <a href={video.src}>{video.downloadLabel}</a>.
              </video>
            ) : (
              <div className={styles.fallback}>
                {video.poster ? (
                  <Image src={video.poster} alt="" fill sizes="(max-width: 800px) 100vw, 50vw" />
                ) : null}
                <div className={styles.fallbackCopy}>
                  <p>{video.missingText}</p>
                  {watchHref ? (
                    <a href={watchHref} target="_blank" rel="noopener noreferrer">
                      Watch on Facebook
                    </a>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`container ${styles.journeyWrap}`}>
        <blockquote className={styles.quoteCard}>
          <p>&ldquo;{content.quote}&rdquo;</p>
        </blockquote>
        <ol className={styles.pillars}>
          {content.pillars.map((pillar, index) => (
            <li key={pillar.title} className={styles.pillar} data-current={index === 0}>
              <span className={styles.step}>Step {index + 1}</span>
              <h3>{pillar.title}</h3>
              <p>{pillar.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
