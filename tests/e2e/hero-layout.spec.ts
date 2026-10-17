import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 440, height: 956 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const;

const SHOTS = new Set([360, 390, 430, 440]);
const SHOT_DIR = "/opt/cursor/artifacts/hero-cards";

test.beforeEach(async ({ page }) => {
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(error.message));
  page.on("console", (message) => {
    const text = message.text();
    if (text.includes("caret-color")) return;
    if (message.type() === "error" || text.includes("Image with src")) problems.push(text);
  });
  (page as Page & { __problems?: string[] }).__problems = problems;
});

test.afterEach(async ({ page }) => {
  const problems = (page as Page & { __problems?: string[] }).__problems ?? [];
  expect(problems, problems.join("\n")).toEqual([]);
});

test("hero text stays off the photos at every width and slide", async ({ page }) => {
  test.setTimeout(180_000);
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    const hero = page.locator("[data-hero-root]");
    await expect(hero.getByRole("heading", { level: 1 })).toContainText("Education Empowers");
    await expect(hero.getByRole("heading", { level: 1 })).toContainText("Brighter Futures.");

    const placement = await page.evaluate(() => {
      const header = document.querySelector("header")!.getBoundingClientRect();
      const root = document.querySelector("[data-hero-root]")!.getBoundingClientRect();
      const title = document.querySelector("[data-hero-copy] h1") as HTMLElement;
      const style = getComputedStyle(title);
      const family = style.fontFamily;
      const primary = family.split(",")[0].trim().replace(/^["']|["']$/g, "");
      const size = Number.parseFloat(style.fontSize);
      const lineHeight = Number.parseFloat(style.lineHeight);
      const lines = Math.round(title.getBoundingClientRect().height / lineHeight);
      const loaded = document.fonts.check(`${style.fontWeight} ${size}px "${primary}"`);
      const italic = [...document.querySelectorAll<HTMLElement>("[data-hero-copy] h1 span")].find((node) =>
        node.textContent?.includes("Brighter"),
      )!;
      const italicStyle = getComputedStyle(italic);
      const italicFamily = italicStyle.fontFamily.split(",")[0].trim().replace(/^["']|["']$/g, "");
      const italicLoaded = document.fonts.check(
        `italic ${italicStyle.fontWeight} ${Number.parseFloat(italicStyle.fontSize)}px "${italicFamily}"`,
      );
      return {
        headerTop: header.top,
        headerBottom: header.bottom,
        heroTop: root.top,
        scrollY: window.scrollY,
        primary,
        size,
        lines,
        loaded,
        italicLoaded,
        italicStyle: italicStyle.fontStyle,
      };
    });
    expect(placement.scrollY, `${viewport.width} initial scroll`).toBe(0);
    expect(placement.headerTop, `${viewport.width} header top`).toBeGreaterThanOrEqual(0);
    expect(placement.headerTop, `${viewport.width} header pinned`).toBeLessThan(2);
    expect(placement.headerBottom, `${viewport.width} header overlaps hero`).toBeLessThanOrEqual(placement.heroTop + 1);
    expect(placement.primary, `${viewport.width} headline font`).toContain("Cormorant");
    expect(placement.loaded, `${viewport.width} ${placement.primary}`).toBeTruthy();
    expect(placement.italicStyle).toBe("italic");
    expect(placement.italicLoaded, `${viewport.width} italic`).toBeTruthy();
    if (viewport.width <= 440) {
      expect(placement.size, `${viewport.width} headline size`).toBeGreaterThanOrEqual(40);
      expect(placement.size, `${viewport.width} headline size`).toBeLessThanOrEqual(44);
      expect(placement.lines, `${viewport.width} headline lines`).toBe(3);
    }

    if (SHOTS.has(viewport.width)) {
      const dir = join(SHOT_DIR, String(viewport.width));
      mkdirSync(dir, { recursive: true });
      await page.screenshot({ path: join(dir, "top.png"), fullPage: false });
    }

    await page.getByRole("button", { name: "Pause" }).click();

    const tabs = page.getByRole("tab");
    const count = await tabs.count();
    expect(count).toBeGreaterThan(1);

    for (let slide = 0; slide < count; slide += 1) {
      await tabs.nth(slide).click();
      await expect(tabs.nth(slide)).toHaveAttribute("aria-selected", "true");
      await page.mouse.move(0, 0);
      const report = await page.evaluate(() => {
        const overlaps: string[] = [];
        const contrastFails: string[] = [];

        const parse = (value: string) => {
          const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
          if (!match) return null;
          return {
            r: Number(match[1]),
            g: Number(match[2]),
            b: Number(match[3]),
            a: match[4] === undefined ? 1 : Number(match[4]),
          };
        };
        const channel = (value: number) => {
          const c = value / 255;
          return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        };
        const luminance = (color: { r: number; g: number; b: number }) =>
          0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
        const flatten = (
          fg: { r: number; g: number; b: number; a: number },
          bg: { r: number; g: number; b: number },
        ) => ({
          r: Math.round(fg.r * fg.a + bg.r * (1 - fg.a)),
          g: Math.round(fg.g * fg.a + bg.g * (1 - fg.a)),
          b: Math.round(fg.b * fg.a + bg.b * (1 - fg.a)),
        });
        const ratio = (fg: { r: number; g: number; b: number }, bg: { r: number; g: number; b: number }) => {
          const left = luminance(fg);
          const right = luminance(bg);
          const lighter = Math.max(left, right);
          const darker = Math.min(left, right);
          return (lighter + 0.05) / (darker + 0.05);
        };
        const backing = (element: Element) => {
          let node: Element | null = element;
          let fg = parse(getComputedStyle(element).backgroundColor) ?? { r: 0, g: 0, b: 0, a: 0 };
          while (node) {
            const color = parse(getComputedStyle(node).backgroundColor);
            if (color && color.a >= 0.98) return { r: color.r, g: color.g, b: color.b };
            if (color && color.a > 0) fg = { ...flatten(color, { r: 247, g: 244, b: 239 }), a: 1 };
            node = node.parentElement;
          }
          return { r: fg.r, g: fg.g, b: fg.b };
        };
        const hits = (a: DOMRect, b: DOMRect) =>
          a.width > 0 &&
          b.width > 0 &&
          a.left < b.right - 1 &&
          a.right > b.left + 1 &&
          a.top < b.bottom - 1 &&
          a.bottom > b.top + 1;

        const photos = [...document.querySelectorAll<HTMLElement>("[data-hero-photo]")].map((card) =>
          card.getBoundingClientRect(),
        );
        const copy = document.querySelector("[data-hero-copy]");
        const textNodes = [
          ...copy!.querySelectorAll<HTMLElement>(":scope > p, h1 span, blockquote p"),
          ...document.querySelectorAll<HTMLElement>("[data-hero-root] [aria-hidden='true']"),
          ...document.querySelectorAll<HTMLElement>("[data-hero-root] aside h2, [data-hero-root] aside li"),
        ];
        for (const node of textNodes) {
          const box = node.getBoundingClientRect();
          if (box.width < 2 || box.height < 2) continue;
          photos.forEach((photo, photoIndex) => {
            if (hits(box, photo)) overlaps.push(`${node.innerText.slice(0, 32)} overlaps photo ${photoIndex + 1}`);
          });
          const color = parse(getComputedStyle(node).color);
          if (!color) continue;
          const bg = backing(node);
          const fg = flatten(color, bg);
          const score = ratio(fg, bg);
          const size = Number.parseFloat(getComputedStyle(node).fontSize);
          const weight = Number.parseInt(getComputedStyle(node).fontWeight, 10);
          const large = size >= 24 || (size >= 18.66 && weight >= 700);
          const needed = large ? 3 : 4.5;
          if (score < needed) {
            contrastFails.push(`${node.innerText.slice(0, 32)} ${score.toFixed(2)} < ${needed}`);
          }
        }

        for (const control of document.querySelectorAll<HTMLElement>("[data-hero-controls] button")) {
          const box = control.getBoundingClientRect();
          photos.forEach((photo, photoIndex) => {
            if (hits(box, photo)) overlaps.push(`control overlaps photo ${photoIndex + 1}`);
          });
          const color = parse(getComputedStyle(control).color);
          const bg = backing(control);
          if (!color) continue;
          const score = ratio(flatten(color, bg), bg);
          if (score < 4.5) contrastFails.push(`control ${control.getAttribute("aria-label") || control.innerText} ${score.toFixed(2)}`);
        }

        for (const dot of document.querySelectorAll<HTMLElement>("[data-hero-controls] [role='tab']")) {
          const mark = parse(getComputedStyle(dot, "::before").backgroundColor);
          const bg = backing(dot);
          if (!mark) continue;
          const score = ratio(flatten(mark, bg), bg);
          if (score < 3) contrastFails.push(`dot ${score.toFixed(2)} < 3`);
        }

        const radius = Number.parseFloat(
          getComputedStyle(document.querySelector("[data-hero-photo]") as Element).borderRadius,
        );

        const gutterFails: string[] = [];
        const controls = document.querySelector("[data-hero-controls]");
        if (controls && window.innerWidth <= 440) {
          const buttons = [...controls.querySelectorAll<HTMLElement>("button")];
          buttons.forEach((button) => {
            const box = button.getBoundingClientRect();
            const name = button.getAttribute("aria-label") || button.innerText || "control";
            if (box.left < 12) gutterFails.push(`${name} left ${box.left.toFixed(1)}`);
            if (box.right > window.innerWidth - 12) gutterFails.push(`${name} right ${box.right.toFixed(1)}`);
          });
          for (let left = 0; left < buttons.length; left += 1) {
            for (let right = left + 1; right < buttons.length; right += 1) {
              const a = buttons[left].getBoundingClientRect();
              const b = buttons[right].getBoundingClientRect();
              const overlap =
                a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
              if (overlap) {
                gutterFails.push(
                  `${buttons[left].getAttribute("aria-label")} overlaps ${buttons[right].getAttribute("aria-label")}`,
                );
              }
            }
          }
        }
        return { overlaps, contrastFails, radius, gutterFails };
      });

      expect(report.overlaps, `${viewport.width} slide ${slide + 1}`).toEqual([]);
      expect(report.contrastFails, `${viewport.width} slide ${slide + 1}`).toEqual([]);
      expect(report.gutterFails, `${viewport.width} slide ${slide + 1}`).toEqual([]);
      expect(report.radius).toBeGreaterThanOrEqual(20);

      const copy = await page.locator("[data-hero-copy]").boundingBox();
      const media = await page.locator("[data-hero-media]").boundingBox();
      const card = await page
        .locator("[data-hero-root] aside")
        .nth(viewport.width < 960 ? 1 : 0)
        .boundingBox();
      expect(copy && media && copy.y + copy.height <= media.y + 2).toBeTruthy();
      if (viewport.width < 960) {
        expect(card && media && card.y >= media.y + media.height - 2).toBeTruthy();
        if (viewport.width < 768) {
          const photo = await page.locator("[data-hero-photo]").first().boundingBox();
          const scroller = await page.locator("[data-hero-scroller]").boundingBox();
          expect(photo && scroller && photo.width < scroller.width - 24).toBeTruthy();
        }
      } else {
        expect(card && copy && card.x >= copy.x + copy.width - 8).toBeTruthy();
        expect(card && media && card.y + 8 < media.y).toBeTruthy();
      }

      if (SHOTS.has(viewport.width)) {
        const dir = join(SHOT_DIR, String(viewport.width));
        mkdirSync(dir, { recursive: true });
        await page.mouse.move(0, 0);
        await page.locator("[data-hero-controls]").evaluate((element) => {
          element.scrollIntoView({ block: "center", inline: "nearest" });
        });
        await page.screenshot({ path: join(dir, `slide-${slide + 1}.png`), fullPage: false });
        await page.evaluate(() => window.scrollTo(0, 0));
      }
    }

    const pause = page.getByRole("button", { name: "Play" });
    await expect(pause).toBeVisible();
    const box = await pause.boundingBox();
    expect(box && box.width >= 44 && box.height >= 44).toBeTruthy();
    const arrow = page.getByRole("button", { name: "Next photo" });
    await expect(arrow).toBeVisible();
    const arrowBox = await arrow.boundingBox();
    expect(arrowBox && arrowBox.width >= 44 && arrowBox.height >= 44).toBeTruthy();
  }
});
