"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SELECTOR = "[data-reveal], [data-reveal-item]";

/**
 * One-shot scroll reveal. Without JavaScript, or with reduced motion, nothing
 * is ever hidden: the hiding rule only applies once `html.rc-reveal` is set
 * here. Elements already on screen (or above it) are marked shown before the
 * class is added, so nothing flashes, and every element is shown the first
 * time it touches the viewport. A timer reveals anything left as a fallback.
 */
export function RevealController() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;

    const show = (el: Element) => el.setAttribute("data-shown", "");
    const pending = (scope: ParentNode) =>
      [...scope.querySelectorAll(SELECTOR)].filter((el) => !el.hasAttribute("data-shown"));
    const reachedNow = (el: Element) => el.getBoundingClientRect().top < window.innerHeight * 0.98;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
            show(entry.target);
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -4% 0px", threshold: 0 },
    );

    const track = (scope: ParentNode) => {
      for (const el of pending(scope)) {
        if (reachedNow(el)) show(el);
        else io.observe(el);
      }
    };

    track(document);
    root.classList.add("rc-reveal");

    const mo = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches(SELECTOR) && !node.hasAttribute("data-shown")) {
            if (reachedNow(node)) show(node);
            else io.observe(node);
          }
          track(node);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    const revealAll = () => pending(document).forEach(show);
    window.addEventListener("beforeprint", revealAll);
    // Safety net: anything still hidden after 6s (e.g. a stalled observer) is shown.
    const fallback = window.setTimeout(revealAll, 6000);

    return () => {
      io.disconnect();
      mo.disconnect();
      window.removeEventListener("beforeprint", revealAll);
      window.clearTimeout(fallback);
    };
  }, [pathname]);

  return null;
}
