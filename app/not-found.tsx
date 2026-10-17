import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { loadSiteContent } from "@/lib/content";

export default async function NotFound() {
  const { chrome } = await loadSiteContent();
  const content = chrome.notFound;
  return (
    <>
      <PageHero title={content.title} subtitle={content.subtitle} />
      <section className="section">
        <div className="container prose">
          <p>{content.body}</p>
          <p><Link className="btn" href={content.cta.href}>{content.cta.label}</Link></p>
        </div>
      </section>
    </>
  );
}
