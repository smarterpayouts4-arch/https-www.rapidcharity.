import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

const EM_DASH = "\u2014";
const ESCAPE = "\\u2014";
const BRACED_ESCAPE = "\\u{2014}";
const ENTITIES = ["&mdash;", "&#8212;", "&#x2014;"];

type Hit = { where: string; snippet: string };

function walkFiles(dir: string, extensions: string[]): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      found.push(...walkFiles(path, extensions));
      continue;
    }
    if (extensions.some((extension) => path.endsWith(extension))) found.push(path);
  }
  return found;
}

/** Replace comments with spaces so line numbers still match the source file. */
export function maskComments(source: string): string {
  const chars = [...source];
  let index = 0;

  const skipString = (quote: string) => {
    index += 1;
    while (index < chars.length) {
      const current = chars[index];
      if (current === "\\") {
        index += 2;
        continue;
      }
      if (quote === "`" && current === "$" && chars[index + 1] === "{") {
        index += 2;
        let depth = 1;
        while (index < chars.length && depth > 0) {
          const nested = chars[index];
          const nestedNext = chars[index + 1];
          if (nested === "/" && (nestedNext === "/" || nestedNext === "*")) {
            maskComment();
            continue;
          }
          if (nested === '"' || nested === "'" || nested === "`") {
            skipString(nested);
            continue;
          }
          if (nested === "{") depth += 1;
          if (nested === "}") depth -= 1;
          index += 1;
        }
        continue;
      }
      index += 1;
      if (current === quote) return;
    }
  };

  const maskComment = () => {
    const next = chars[index + 1];
    if (next === "/") {
      index += 2;
      while (index < chars.length && chars[index] !== "\n") {
        chars[index] = " ";
        index += 1;
      }
      return;
    }
    chars[index] = " ";
    chars[index + 1] = " ";
    index += 2;
    while (index < chars.length && !(chars[index] === "*" && chars[index + 1] === "/")) {
      if (chars[index] !== "\n") chars[index] = " ";
      index += 1;
    }
    if (index < chars.length) {
      chars[index] = " ";
      chars[index + 1] = " ";
      index += 2;
    }
  };

  while (index < chars.length) {
    const current = chars[index];
    const next = chars[index + 1];
    if (current === "/" && (next === "/" || next === "*")) {
      maskComment();
      continue;
    }
    if (current === '"' || current === "'" || current === "`") {
      skipString(current);
      continue;
    }
    index += 1;
  }

  return chars.join("");
}

function lineOf(source: string, index: number): number {
  let line = 1;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (source[cursor] === "\n") line += 1;
  }
  return line;
}

function snippetAt(source: string, index: number): string {
  const line = source.split("\n")[lineOf(source, index) - 1] ?? "";
  return line.trim().slice(0, 160);
}

function findMarkers(source: string): { index: number; label: string }[] {
  const hits: { index: number; label: string }[] = [];
  const needles = [
    { text: EM_DASH, label: "em dash" },
    { text: ESCAPE, label: "\\\\u2014" },
    { text: BRACED_ESCAPE, label: "\\\\u{2014}" },
    ...ENTITIES.map((entity) => ({ text: entity, label: entity })),
  ];
  const lower = source.toLowerCase();
  for (const needle of needles) {
    const haystack = needle.text.startsWith("&") ? lower : source;
    const probe = needle.text.toLowerCase();
    let from = 0;
    while (from < haystack.length) {
      const index = haystack.indexOf(probe, from);
      if (index === -1) break;
      hits.push({ index, label: needle.label });
      from = index + probe.length;
    }
  }
  return hits;
}

function contentHits(): Hit[] {
  const hits: Hit[] = [];
  for (const path of walkFiles("content", [".json"])) {
    const raw = readFileSync(path, "utf8");
    const data = JSON.parse(raw) as unknown;
    const visit = (value: unknown, pointer: string) => {
      if (typeof value === "string") {
        for (const hit of findMarkers(value)) {
          hits.push({
            where: `${relative(process.cwd(), path)} ${pointer}`,
            snippet: `${hit.label}: ${snippetAt(value, hit.index)}`,
          });
        }
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((item, index) => visit(item, `${pointer}[${index}]`));
        return;
      }
      if (value && typeof value === "object") {
        for (const [key, child] of Object.entries(value)) visit(child, `${pointer}.${key}`);
      }
    };
    visit(data, "$");
  }
  return hits;
}

function sourceHits(): Hit[] {
  const hits: Hit[] = [];
  for (const root of ["app", "components", "lib"]) {
    for (const path of walkFiles(root, [".ts", ".tsx"])) {
      const raw = readFileSync(path, "utf8");
      const visible = maskComments(raw);
      for (const hit of findMarkers(visible)) {
        hits.push({
          where: `${relative(process.cwd(), path)}:${lineOf(raw, hit.index)}`,
          snippet: `${hit.label}: ${snippetAt(raw, hit.index)}`,
        });
      }
    }
  }
  return hits;
}

test("commented em dashes are ignored and copy em dashes are reported", () => {
  const sample = [
    'const ok = "fine"; // note — ignored',
    "/* block — ignored */",
    'const bad = "shown — to readers";',
    "const escaped = \"shown \\u2014 too\";",
    "const entity = \"shown &mdash; too\";",
  ].join("\n");
  const visible = maskComments(sample);
  const labels = findMarkers(visible).map((hit) => `${lineOf(sample, hit.index)}:${hit.label}`);
  assert.deepEqual(labels, ["3:em dash", "4:\\\\u2014", "5:&mdash;"]);
});

test("published and draft content and UI strings contain no em dashes", () => {
  const hits = [...contentHits(), ...sourceHits()];
  assert.deepEqual(
    hits,
    [],
    hits.map((hit) => `${hit.where} ${hit.snippet}`).join("\n"),
  );
});
