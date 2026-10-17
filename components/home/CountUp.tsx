"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (notify) => {
      const media = window.matchMedia("(prefers-reduced-motion: reduce)");
      media.addEventListener("change", notify);
      return () => media.removeEventListener("change", notify);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/** Counts a leading integer once it scrolls into view. Other values stay as written. */
export function CountUp({ value }: { value: string }) {
  const reduce = usePrefersReducedMotion();
  const match = /^(\d+)/.exec(value);
  const target = match ? Number(match[1]) : null;
  const rest = match ? value.slice(match[1].length) : "";
  const [shown, setShown] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (target == null || reduce) return;
    const node = ref.current;
    if (!node) return;
    let frame = 0;
    let started = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || started) return;
        started = true;
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / 1200);
          const eased = 1 - (1 - progress) ** 3;
          setShown(`${Math.round(target * eased)}${rest}`);
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        setShown(`0${rest}`);
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [reduce, rest, target]);

  return (
    <span ref={ref} style={{ fontVariantNumeric: "lining-nums tabular-nums" }}>
      {shown}
    </span>
  );
}
