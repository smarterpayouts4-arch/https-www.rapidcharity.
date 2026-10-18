"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./Hero.module.css";

export type HeroSlide = {
  src: string;
  alt: string;
  objectPosition?: string;
};

const INTERVAL_MS = 4000;

type Props = {
  slides: HeroSlide[];
  ariaLabel: string;
};

export function HeroMedia({ slides, ariaLabel }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef(false);
  const indexRef = useRef(0);
  const heldRef = useRef(false);
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
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
    if (reduceMotion) {
      scrollToIndex(0, "auto");
    }
  }, [reduceMotion, scrollToIndex]);

  useEffect(() => {
    if (reduceMotion || held || slides.length < 2) return;
    const id = window.setInterval(() => {
      if (document.hidden || heldRef.current) return;
      const next = (indexRef.current + 1) % slides.length;
      scrollToIndex(next, "smooth");
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [held, reduceMotion, scrollToIndex, slides.length]);

  const hold = useCallback(() => {
    heldRef.current = true;
    setHeld(true);
  }, []);

  const release = useCallback(() => {
    heldRef.current = false;
    setHeld(false);
  }, []);

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

  return (
    <div
      className={styles.media}
      data-hero-media
      role="region"
      aria-label={ariaLabel}
      aria-live="off"
      onMouseEnter={hold}
      onMouseLeave={release}
      onPointerDown={hold}
      onPointerUp={release}
      onPointerCancel={release}
      onTouchStart={hold}
      onTouchEnd={release}
      onTouchCancel={release}
    >
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
              priority={slideIndex === 0}
              fetchPriority={slideIndex === 0 ? "high" : "low"}
              decoding={slideIndex === 0 ? "sync" : "async"}
              loading={slideIndex === 0 ? "eager" : "lazy"}
              sizes="(max-width: 767px) calc(100vw - 4.5rem), (max-width: 1099px) calc(50vw - 2rem), 360px"
              style={{ objectPosition: slide.objectPosition ?? "center 40%" }}
            />
          </figure>
        ))}
      </div>
      {slides.length > 1 ? (
        <div className={styles.dots} data-hero-dots aria-hidden="true">
          {slides.map((slide, slideIndex) => (
            <span
              key={slide.src}
              className={`${styles.dot} ${slideIndex === index ? styles.dotActive : ""}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
