export type VideoEmbed = { kind: "youtube" | "vimeo" | "facebook"; src: string };

const YOUTUBE_ID = /^[\w-]{6,}$/;

export function parseVideoEmbed(input: string | undefined | null): VideoEmbed | null {
  const trimmed = input?.trim() ?? "";
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return YOUTUBE_ID.test(id)
      ? { kind: "youtube", src: `https://www.youtube-nocookie.com/embed/${id}` }
      : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    let id = url.searchParams.get("v") ?? "";
    const parts = url.pathname.split("/").filter(Boolean);
    if (!id && (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live")) {
      id = parts[1] ?? "";
    }
    return YOUTUBE_ID.test(id)
      ? { kind: "youtube", src: `https://www.youtube-nocookie.com/embed/${id}` }
      : null;
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = [...url.pathname.split("/").filter(Boolean)].reverse().find((part) => /^\d+$/.test(part));
    return id ? { kind: "vimeo", src: `https://player.vimeo.com/video/${id}` } : null;
  }

  if (host === "facebook.com" || host === "m.facebook.com" || host === "fb.watch") {
    if (url.pathname.startsWith("/plugins/video.php")) return { kind: "facebook", src: url.toString() };
    if (/\/(videos|reel|watch)\b/.test(url.pathname) || url.searchParams.has("v")) {
      return {
        kind: "facebook",
        src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url.toString())}&show_text=false`,
      };
    }
  }

  return null;
}

export function resolveMissionEmbedUrl(contentUrl: string | undefined): string {
  const fromEnv = process.env.MISSION_VIDEO_EMBED_URL?.trim() || "";
  return fromEnv || contentUrl?.trim() || "";
}

export type ReportLinks = {
  downloadHref: string;
  localDownload: boolean;
  embedSrc: string | null;
  available: boolean;
};

function officeEmbedFor(fileUrl: string): string {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
}

export function resolveReportLinks(input: {
  pptxPath: string;
  publicSrc: string;
  officeEmbedSrc: string;
  localFileExists: boolean;
  configuredUrl?: string;
}): ReportLinks {
  const configured = input.configuredUrl?.trim() || process.env.REPORT_2025_URL?.trim() || "";
  if (input.localFileExists && !configured) {
    return {
      downloadHref: input.pptxPath,
      localDownload: true,
      embedSrc: input.officeEmbedSrc.trim() || null,
      available: true,
    };
  }
  if (configured) {
    const looksLikeDeck = /\.pptx?($|\?)/i.test(configured);
    return {
      downloadHref: configured,
      localDownload: false,
      embedSrc: looksLikeDeck ? officeEmbedFor(configured) : null,
      available: true,
    };
  }
  if (input.publicSrc.trim()) {
    return {
      downloadHref: input.publicSrc.trim(),
      localDownload: false,
      embedSrc: null,
      available: true,
    };
  }
  return { downloadHref: "", localDownload: false, embedSrc: null, available: false };
}
