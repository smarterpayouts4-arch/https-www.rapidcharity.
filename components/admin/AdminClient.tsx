"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BlogCollection, EventsCollection, SiteContent } from "@/lib/content";
import type { BatchRecord } from "@/lib/application/batches";
import type { StoredApplication } from "@/lib/application/types";
import styles from "@/app/admin/admin.module.css";
import { TABS, type Tab } from "./config";
import { useAdminContent } from "./useAdminContent";
import { useCollectionAdmin } from "./useCollectionAdmin";
import { GroupSection } from "./sections/GroupSection";
import { HomeSection } from "./sections/HomeSection";
import { VerifiedSection } from "./sections/VerifiedSection";
import { ScheduleSection } from "./sections/ScheduleSection";
import { BlogCollectionSection } from "./sections/BlogCollectionSection";
import { EventsCollectionSection } from "./sections/EventsCollectionSection";
import { ApplicationsPanel } from "./ApplicationsPanel";

type Props = {
  initial: SiteContent;
  initialBlog: BlogCollection;
  initialEvents: EventsCollection;
  email: string;
  storage: "firestore" | "local-files";
  applications: StoredApplication[];
  batches: BatchRecord[];
  applicationsError: string;
  activeCycle?: string;
};

export function AdminClient({
  initial,
  initialBlog,
  initialEvents,
  email,
  storage,
  applications,
  batches,
  applicationsError,
  activeCycle,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("home");
  const admin = useAdminContent(initial);
  const blogAdmin = useCollectionAdmin(initialBlog, {
    draft: "/api/admin/blog",
    publish: "/api/admin/blog/publish",
  }, {
    draftFile: "content/blog.draft.json",
    publishedFile: "content/blog.json",
  });
  const eventsAdmin = useCollectionAdmin(initialEvents, {
    draft: "/api/admin/events",
    publish: "/api/admin/events/publish",
  }, {
    draftFile: "content/events.draft.json",
    publishedFile: "content/events.json",
  });
  const previewPath = useMemo(
    () => TABS.find((item) => item.id === tab)?.previewPath ?? "/?preview=1",
    [tab],
  );

  const isCollectionTab = tab === "news" || tab === "events";
  const busy = isCollectionTab
    ? tab === "news"
      ? blogAdmin.busy
      : eventsAdmin.busy
    : admin.busy;
  const status = isCollectionTab
    ? tab === "news"
      ? blogAdmin.status
      : eventsAdmin.status
    : admin.status;
  const statusKind = isCollectionTab
    ? tab === "news"
      ? blogAdmin.statusKind
      : eventsAdmin.statusKind
    : admin.statusKind;

  return (
    <div className={styles.wrap}>
      <div className={styles.banner} role="status">
        <strong>Signed in as {email}.</strong>{" "}
        {storage === "firestore"
          ? "Drafts and publishes are stored in Firestore."
          : "Drafts are stored in local JSON files. Configure Firestore before deploying."}{" "}
        Header and footer use the published copy until you publish.
      </div>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <p className={styles.brandMark}>RAPID Content Admin</p>
          <p className={styles.brandSub}>
            {isCollectionTab
              ? "Preview above · Collection Save draft / Publish buttons are inside this editor"
              : `Site content · Save draft · Preview · Publish${
                  admin.content.updatedAt ? ` · ${admin.content.updatedAt}` : ""
                }`}
          </p>
        </div>
        <div className={styles.actions}>
          <a className="btn-secondary btn-sm" href={previewPath} target="_blank" rel="noreferrer">
            Preview
          </a>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => {
              void fetch("/api/admin/session", { method: "DELETE" }).then(() => {
                router.refresh();
              });
            }}
          >
            Sign out
          </button>
          {!isCollectionTab && tab !== "applications" ? (
            <>
              <button
                type="button"
                className="btn btn-sm"
                disabled={busy}
                onClick={() => void admin.saveDraft()}
              >
                Save draft
              </button>
              <button
                type="button"
                className="btn-danger btn-sm"
                disabled={busy}
                onClick={() => void admin.publish()}
              >
                Publish
              </button>
            </>
          ) : null}
        </div>
      </header>
      <p
        className={`${styles.status} ${
          statusKind === "ok"
            ? styles.statusOk
            : statusKind === "err"
              ? styles.statusErr
              : ""
        }`}
        role="status"
      >
        {status}
      </p>
      <div className={styles.shell}>
        <nav className={styles.sideNav} aria-label="Content sections">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              data-active={tab === item.id}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className={styles.mainPane}>
          {tab === "home" ? (
            <HomeSection
              content={admin.content}
              onChange={admin.change}
              uploadBusy={admin.uploadBusy}
              onUpload={(file) => void admin.uploadVideo(file)}
            />
          ) : null}
          {tab === "schedule" ? <ScheduleSection content={admin.content} onChange={admin.change} /> : null}
          {tab === "about" ? (
            <GroupSection
              title="About Us"
              content={admin.content}
              keys={["about"]}
              onChange={admin.change}
            />
          ) : null}
          {tab === "apply" ? (
            <GroupSection
              title="Apply and scholarship landings"
              content={admin.content}
              keys={["apply"]}
              onChange={admin.change}
            />
          ) : null}
          {tab === "donate" ? (
            <GroupSection
              title="Donate"
              lead="PayPal remains an external href; no SDK is embedded."
              content={admin.content}
              keys={["donate"]}
              onChange={admin.change}
            />
          ) : null}
          {tab === "reports" ? (
            <GroupSection
              title="Reports"
              content={admin.content}
              keys={["reports"]}
              onChange={admin.change}
            />
          ) : null}
          {tab === "news" ? (
            <BlogCollectionSection
              collection={blogAdmin.content}
              onChange={blogAdmin.setContent}
              busy={blogAdmin.busy}
              onSaveDraft={() => void blogAdmin.saveDraft()}
              onPublish={() => void blogAdmin.publish()}
              status={blogAdmin.status}
              statusKind={blogAdmin.statusKind}
            />
          ) : null}
          {tab === "events" ? (
            <EventsCollectionSection
              collection={eventsAdmin.content}
              onChange={eventsAdmin.setContent}
              busy={eventsAdmin.busy}
              onSaveDraft={() => void eventsAdmin.saveDraft()}
              onPublish={() => void eventsAdmin.publish()}
              status={eventsAdmin.status}
              statusKind={eventsAdmin.statusKind}
            />
          ) : null}
          {tab === "chrome" ? (
            <GroupSection
              title="Shared and collection chrome"
              lead="Blog/event bodies are collection-managed under News posts / Events list. This controls surrounding UI labels."
              content={admin.content}
              keys={["chrome", "blog", "events"]}
              onChange={admin.change}
            />
          ) : null}
          {tab === "nav" ? (
            <GroupSection
              title="Navigation"
              content={admin.content}
              keys={["nav"]}
              onChange={admin.change}
            />
          ) : null}
          {tab === "footer" ? (
            <GroupSection
              title="Footer"
              content={admin.content}
              keys={["footer"]}
              onChange={admin.change}
            />
          ) : null}
          {tab === "verified" ? (
            <VerifiedSection content={admin.content} onChange={admin.change} />
          ) : null}
          {tab === "applications" ? (
            <ApplicationsPanel
              initial={applications}
              initialBatches={batches}
              storage={storage === "firestore" ? "firestore" : "local"}
              initialError={applicationsError}
              activeCycle={activeCycle}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
