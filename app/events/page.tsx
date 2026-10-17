import Image from "next/image";
import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { PreviewBanner } from "@/components/PreviewBanner";
import {
  loadEventsContent,
  loadSiteContent,
  resolvePreview,
  visibleEvents,
} from "@/lib/content";
import { site } from "@/lib/site";
import styles from "./events.module.css";

const PLACES = ["Peshawar", "Karachi", "Lahore", "Rawalpindi", "FCCU", "Kinnaird", "Islamabad"];

function eventPlace(title: string, body: string): string {
  const source = `${title} ${body}`;
  return PLACES.find((place) => source.toLowerCase().includes(place.toLowerCase())) ?? "Gathering";
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function dateBadge(title: string, body: string): { month: string; day: string } | null {
  const source = `${title} ${body}`;
  const named = source.match(new RegExp(`\\b(${MONTHS.join("|")})\\s+(\\d{1,2})`, "i"));
  if (named) return { month: named[1].slice(0, 3).toUpperCase(), day: named[2] };
  const reversed = source.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTHS.join("|")})`, "i"));
  if (reversed) return { month: reversed[2].slice(0, 3).toUpperCase(), day: reversed[1] };
  return null;
}

function eventWhen(title: string, body: string): string {
  const dated = body.match(
    /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i,
  );
  if (dated) return dated[0];
  const year = `${title} ${body}`.match(/\b20\d{2}\b/);
  return year?.[0] ?? "";
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: SearchParams;
}): Promise<Metadata> {
  const params = searchParams ? await searchParams : undefined;
  const preview = await resolvePreview(params);
  const { events } = await loadSiteContent({ preview });
  return {
    title: events.title,
    description: events.subtitle,
    alternates: { canonical: `${site.url}/events` },
  };
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const params = searchParams ? await searchParams : undefined;
  const preview = await resolvePreview(params);
  const siteContent = await loadSiteContent({ preview });
  const { events } = siteContent;
  const items = visibleEvents(await loadEventsContent({ preview }), preview);

  return (
    <>
      {preview ? <PreviewBanner content={siteContent.chrome.preview} liveHref="/events" /> : null}
      <PageHero title={events.title} subtitle={events.subtitle} />
      <section className="section">
        <div className="container">
          <div className={styles.list}>
            {items.map((item) => {
              const place = eventPlace(item.title, item.body);
              const when = eventWhen(item.title, item.body);
              const badge = dateBadge(item.title, item.body);
              return (
                <article key={item.id} className={styles.row} data-reveal-item data-dated={badge ? "true" : undefined}>
                  <div className={styles.meta}>
                    <span className={styles.badge}>{place}</span>
                    {badge ? (
                      <span className={styles.dateBadge}>
                        <span>{badge.month}</span>
                        <span>{badge.day}</span>
                      </span>
                    ) : null}
                    {when ? <p className={styles.when}>{when}</p> : null}
                  </div>
                  <div className={styles.copy}>
                    <h3>{item.title}</h3>
                    <p className={styles.place}>{place}</p>
                    <div className={styles.detail}>
                      {item.body.split(/\n\n+/).map((paragraph) => (
                        <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                      ))}
                    </div>
                    {item.images?.length ? (
                      <ul className={styles.gallery} aria-label={`${item.title} photos`}>
                        {item.images.map((image) => (
                          <li key={image.src}>
                            <a href={image.src} target="_blank" rel="noopener noreferrer">
                              <Image
                                src={image.src}
                                alt={image.alt}
                                width={480}
                                height={360}
                                sizes="(max-width: 767px) 50vw, 240px"
                              />
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
