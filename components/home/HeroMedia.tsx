"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./Hero.module.css";

export type HeroSlide = {
  src: string;
  alt: string;
  objectPosition?: string;
};

const INTERVAL_MS = 5500;

type Props = {
  slides: HeroSlide[];
  ariaLabel: string;
};

export function HeroMedia({ slides, ariaLabel }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef(false);
  const indexRef = useRef(0);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const scrollToIndex = useCallback((next: number, behavior: ScrollBehavior) => {
    const scroller = scrollerRef.current;
    const card = scroller?.children[next] as HTMLElement | undefined;
    const first = scroller?.children[0] as HTMLElement | undefined;
    if (!scroller || !card || !first) return;
    lockRef.current = true;
    indexRef.current = next;
    setIndex(next);
    scroller.scrollTo({ left: Math.max(0, card.offsetLeft - first.offsetLeft), behavior });
    window.setTimeout(() => {
      lockRef.current = false;
    }, behavior === "smooth" ? 650 : 40);
  }, []);

  useEffect(() => {
    if (reduceMotion || paused || slides.length < 2) return;
    const id = window.setInterval(() => {
      const next = (indexRef.current + 1) % slides.length;
      scrollToIndex(next, "smooth");
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused, reduceMotion, scrollToIndex, slides.length]);

  function onScroll() {
    const scroller = scrollerRef.current;
    if (!scroller || lockRef.current) return;
    const cards = [...scroller.children] as HTMLElement[];
    const first = cards[0];
    if (!first) return;
    const origin = scroller.scrollLeft + first.offsetLeft;
    let best = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    cards.forEach((card, cardIndex) => {
      const dist = Math.abs(card.offsetLeft - origin);
      if (dist < bestDist) {
        bestDist = dist;
        best = cardIndex;
      }
    });
    indexRef.current = best;
    setIndex(best);
  }

  if (!slides.length) return null;

  const go = (delta: number) => {
    const next = (index + delta + slides.length) % slides.length;
    scrollToIndex(next, reduceMotion ? "auto" : "smooth");
  };

  return (
    <div className={styles.media} data-hero-media>
      <div
        className={styles.scroller}
        ref={scrollerRef}
        onScroll={onScroll}
        data-hero-scroller
      >
        {slides.map((slide, slideIndex) => (
          <figure key={slide.src} className={styles.card} data-hero-photo>
            <Image
              className={styles.photo}
              src={slide.src}
              alt={slide.alt}
              width={1600}
              height={1000}
              priority={slideIndex < 3}
              sizes="(max-width: 767px) 86vw, (max-width: 1099px) 46vw, 30vw"
              style={{ objectPosition: slide.objectPosition ?? "center 40%" }}
            />
          </figure>
        ))}
      </div>
      {slides.length > 1 ? (
        <div className={styles.controls} data-hero-controls>
          <button type="button" className={`${styles.arrow} ${styles.arrowPrev}`} aria-label="Previous photo" onClick={() => go(-1)}>
            <Chevron dir="left" />
          </button>
          <button
            type="button"
            className={styles.pause}
            aria-pressed={paused}
            aria-label={paused ? "Play" : "Pause"}
            onClick={() => setPaused((value) => !value)}
          >
            <span className={styles.pauseLabel} aria-hidden="true">
              {paused ? "Play" : "Pause"}
            </span>
            <span className={styles.pauseIcon} aria-hidden="true">
              {paused ? <PlayIcon /> : <PauseIcon />}
            </span>
          </button>
          <div className={styles.dots} role="tablist" aria-label={ariaLabel}>
            {slides.map((slide, slideIndex) => (
              <button
                key={slide.src}
                type="button"
                role="tab"
                aria-selected={slideIndex === index}
                aria-label={`Show image ${slideIndex + 1}: ${slide.alt}`}
                className={`${styles.dot} ${slideIndex === index ? styles.dotActive : ""}`}
                onClick={() => scrollToIndex(slideIndex, reduceMotion ? "auto" : "smooth")}
              />
            ))}
          </div>
          <button type="button" className={`${styles.arrow} ${styles.arrowNext}`} aria-label="Next photo" onClick={() => go(1)}>
            <Chevron dir="right" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
      <path d="M6.5 4.5h2.2v11H6.5zm4.8 0h2.2v11h-2.2z" fill="currentColor" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
      <path d="M7.2 4.8v10.4L15.2 10 7.2 4.8z" fill="currentColor" />
    </svg>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
      <path
        d={dir === "left" ? "M12.5 4.5 7 10l5.5 5.5" : "M7.5 4.5 13 10l-5.5 5.5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
