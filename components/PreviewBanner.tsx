import Link from "next/link";
import type { SiteContent } from "@/lib/content/schema";

type Props = { liveHref?: string; content: SiteContent["chrome"]["preview"] };

export function PreviewBanner({ liveHref = "/", content }: Props) {
  return (
    <div role="status" style={{ background: "#8B0A24", color: "#fff", textAlign: "center",
      padding: "0.55rem 1rem", fontSize: "0.85rem", fontWeight: 500, letterSpacing: "0.02em" }}>
      {content.message}{" "}
      <Link href={liveHref} style={{ color: "#ffe8ee", textDecoration: "underline" }}>{content.liveLabel}</Link>
    </div>
  );
}
