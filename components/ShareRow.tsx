"use client";

import { useCallback, useState } from "react";
import type { SiteContent } from "@/lib/content/schema";
import styles from "./ShareRow.module.css";

type ShareRowProps = {
  url: string;
  /** Apply page shows labeled circular icons; posts use compact icon buttons */
  variant?: "labeled" | "compact";
  /** Apply includes WhatsApp + Pinterest; posts typically FB/X/LinkedIn/Copy */
  networks?: Array<"facebook" | "x" | "whatsapp" | "linkedin" | "pinterest" | "copy">;
  title?: string;
  content: SiteContent["chrome"]["share"];
};

const DEFAULT_LABELED: ShareRowProps["networks"] = [
  "facebook",
  "x",
  "whatsapp",
  "linkedin",
  "pinterest",
  "copy",
];
const DEFAULT_COMPACT: ShareRowProps["networks"] = [
  "facebook",
  "x",
  "linkedin",
  "copy",
];

function shareHref(
  network: NonNullable<ShareRowProps["networks"]>[number],
  url: string,
  title?: string,
) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title ?? "");
  switch (network) {
    case "facebook":
      return `https://facebook.com/sharer/sharer.php?u=${u}`;
    case "x":
      return `https://twitter.com/intent/tweet?url=${u}${t ? `&text=${t}` : ""}`;
    case "whatsapp":
      return `https://api.whatsapp.com/send/?phone&text=${u}`;
    case "linkedin":
      return `https://www.linkedin.com/shareArticle?mini=true&url=${u}`;
    case "pinterest":
      return `https://pinterest.com/pin/create/button/?url=${u}`;
    default:
      return "#";
  }
}

function Icon({ name }: { name: string }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", "aria-hidden": true as const };
  switch (name) {
    case "facebook":
      return (
        <svg {...common} fill="currentColor">
          <path d="M14 8.5h2.5V5.2C16.1 5.1 15 5 13.7 5 11.1 5 9.3 6.6 9.3 9.5V12H6.5v3.5h2.8V22h3.5v-6.5H15l.5-3.5h-2.9V9.8c0-1 .3-1.3 1.4-1.3z" />
        </svg>
      );
    case "x":
      return (
        <svg {...common} fill="currentColor">
          <path d="M17.5 3h3l-6.6 7.5L22 21h-6.2l-4.8-6.3L5.4 21H2.4l7-8L2 3h6.4l4.4 5.8L17.5 3zm-1.1 16.2h1.7L7.7 4.7H5.9l10.5 14.5z" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg {...common} fill="currentColor">
          <path d="M12 2a9.9 9.9 0 0 0-8.6 14.8L2 22l5.4-1.4A9.9 9.9 0 1 0 12 2zm0 18a8.1 8.1 0 0 1-4.1-1.1l-.3-.2-3.2.8.9-3.1-.2-.3A8.1 8.1 0 1 1 12 20zm4.5-6.1c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.7.9-.1.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5l.4-.4c.1-.1.2-.3.3-.4.1-.2 0-.3 0-.4 0-.1-.5-1.3-.7-1.8-.2-.5-.4-.4-.5-.4h-.4c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.3c.1.2 1.6 2.4 3.8 3.4 2.2.9 2.2.6 2.6.6.4 0 1.3-.5 1.5-1 .2-.5.2-.9.1-1z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg {...common} fill="currentColor">
          <path d="M6.5 9.5H3.7V20h2.8V9.5zM5.1 4a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2zM20.3 20h-2.8v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9V20H10.8V9.5h2.7v1.4h.1c.4-.7 1.3-1.5 2.7-1.5 2.9 0 3.4 1.9 3.4 4.4V20z" />
        </svg>
      );
    case "pinterest":
      return (
        <svg {...common} fill="currentColor">
          <path d="M12 2C6.5 2 2 6.5 2 12c0 4.2 2.6 7.8 6.3 9.2-.1-.8-.2-2 0-2.9.2-.8 1.3-5.4 1.3-5.4s-.3-.7-.3-1.6c0-1.5.9-2.6 2-2.6.9 0 1.4.7 1.4 1.5 0 .9-.6 2.3-.9 3.5-.3 1.1.5 1.9 1.6 1.9 1.9 0 3.2-2.4 3.2-5.3 0-2.2-1.5-3.8-4.2-3.8-3.1 0-5 2.3-5 4.8 0 .9.3 1.5.7 2 .1.1.1.2.1.3l-.3 1c0 .1-.2.2-.3.1-1.2-.5-1.8-1.9-1.8-3.5 0-2.6 2.2-5.7 6.5-5.7 3.5 0 5.8 2.5 5.8 5.2 0 3.6-2 6.2-4.9 6.2-1 0-1.9-.5-2.2-1.1l-.6 2.3c-.2.8-.8 1.8-1.2 2.4A10 10 0 0 0 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2z" />
        </svg>
      );
    case "copy":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="8" y="8" width="12" height="12" rx="2" />
          <path d="M4 16V6a2 2 0 0 1 2-2h10" />
        </svg>
      );
    default:
      return null;
  }
}

export function ShareRow({
  url,
  variant = "labeled",
  networks,
  title,
  content,
}: ShareRowProps) {
  const [copied, setCopied] = useState(false);
  const items: NonNullable<ShareRowProps["networks"]> =
    networks ?? (variant === "compact" ? DEFAULT_COMPACT! : DEFAULT_LABELED!);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard may be denied; silent in Phase 1 */
    }
  }, [url]);

  return (
    <div className={`${styles.row} ${variant === "compact" ? styles.compact : styles.labeled}`}>
      {variant === "labeled" ? <p className={styles.heading}>{content.heading}</p> : null}
      <ul className={styles.list} aria-label={content.ariaLabel}>
        {items.map((name) => {
          if (name === "copy") {
            return (
              <li key={name}>
                <button
                  type="button"
                  className={`${styles.item} ${styles[name]}`}
                  onClick={onCopy}
                  aria-label={copied ? content.labels.copiedAria : content.labels.copyAria}
                >
                  <span className={styles.icon}>
                    <Icon name="copy" />
                  </span>
                  {variant === "labeled" ? (
                    <span className={styles.label}>{copied ? content.labels.copied : content.labels.copy}</span>
                  ) : null}
                </button>
              </li>
            );
          }
          return (
            <li key={name}>
              <a
                className={`${styles.item} ${styles[name]}`}
                href={shareHref(name, url, title)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={content.labels[name]}
              >
                <span className={styles.icon}>
                  <Icon name={name} />
                </span>
                {variant === "labeled" ? <span className={styles.label}>{content.labels[name]}</span> : null}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
