import type { ReactNode } from "react";
import { isKeyFact, leadIn, splitSentences } from "@/lib/readable";

/** Lightweight markdown-ish renderer for post bodies (## H2, lists, quotes, **bold**). */
export function renderPostBody(body: string): ReactNode[] {
  const blocks = body.split(/\n\n+/);
  const nodes: ReactNode[] = [];
  let key = 0;

  for (const raw of blocks) {
    const block = raw.trim();
    if (!block) continue;

    if (block.startsWith("## ")) {
      nodes.push(<h2 key={key++}>{inline(block.slice(3))}</h2>);
      continue;
    }

    const lines = block.split("\n").filter((l) => l.trim());

    if (lines.length && lines.every((l) => /^>\s?/.test(l.trim()))) {
      const text = lines.map((l) => l.trim().replace(/^>\s?/, "")).join(" ");
      nodes.push(
        <blockquote key={key++} className="quote">
          {inline(text)}
        </blockquote>,
      );
      continue;
    }

    const isUl = lines.length > 0 && lines.every((l) => /^[-*]\s+/.test(l.trim()));
    if (isUl) {
      nodes.push(
        <ul key={key++}>
          {lines.map((l, i) => (
            <li key={i}>{inline(l.trim().replace(/^[-*]\s+/, ""))}</li>
          ))}
        </ul>,
      );
      continue;
    }

    const isOl = lines.length > 0 && lines.every((l) => /^\d+\.\s+/.test(l.trim()));
    if (isOl) {
      const steps = lines.flatMap((line) => splitSentences(line.trim().replace(/^\d+\.\s+/, "")));
      nodes.push(
        <ol key={key++} className="steps">
          {steps.map((step, i) => (
            <li key={i}>{stepLine(step)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    // Horizontal rule
    if (block === "---") {
      nodes.push(<hr key={key++} />);
      continue;
    }

    nodes.push(paragraphNode(block.replace(/\n/g, " "), key++));
  }

  return nodes;
}

function stepLine(step: string): ReactNode {
  if (step.includes("**") || step.includes("[")) return inline(step);
  const { lead, rest } = leadIn(step);
  if (!rest) return <strong>{lead}</strong>;
  return (
    <>
      <strong>{lead}</strong>
      {rest}
    </>
  );
}

function paragraphNode(block: string, key: number): ReactNode {
  const plain = block.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[[^\]]+\]\([^)]+\)/g, (match) => {
    const label = match.match(/\[([^\]]+)\]/);
    return label?.[1] ?? match;
  });
  const sentences = splitSentences(plain);
  if (sentences.length < 2 || plain.length < 240) {
    return (
      <p key={key} className={isKeyFact(plain) ? "callout" : undefined}>
        {inline(block)}
      </p>
    );
  }
  const facts = sentences.filter((sentence) => isKeyFact(sentence));
  const rest = sentences.filter((sentence) => !isKeyFact(sentence));
  const [first, ...more] = rest;
  return (
    <div key={key}>
      {facts.map((fact) => (
        <p key={fact} className="callout">
          {fact}
        </p>
      ))}
      {first ? <p>{first}</p> : null}
      {more.length > 0 ? (
        <details className="read-more">
          <summary>Read more</summary>
          <p>{inline(block)}</p>
        </details>
      ) : null}
    </div>
  );
}

function inline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  // Links [text](/path) or [text](https://...)
  const re = /(\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[0].startsWith("**")) {
      parts.push(<strong key={i++}>{m[2]}</strong>);
    } else {
      const href = m[4];
      const external = /^https?:\/\//.test(href);
      parts.push(
        <a
          key={i++}
          href={href}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {m[3]}
        </a>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
