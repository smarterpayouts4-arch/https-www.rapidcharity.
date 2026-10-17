import { isKeyFact, leadIn, splitSentences } from "@/lib/readable";

export function ReadableParagraph({ text }: { text: string }) {
  const sentences = splitSentences(text);
  if (sentences.length < 2 || text.length < 240) {
    return <p className={isKeyFact(text) ? "callout" : undefined}>{text}</p>;
  }
  const facts = sentences.filter(isKeyFact);
  const rest = sentences.filter((sentence) => !isKeyFact(sentence));
  const [first, ...more] = rest;
  return (
    <>
      {facts.map((fact) => (
        <p key={fact} className="callout">
          {fact}
        </p>
      ))}
      {first ? <p>{first}</p> : null}
      {more.length > 0 ? (
        <details className="read-more">
          <summary>Read more</summary>
          <p>{more.join(" ")}</p>
        </details>
      ) : null}
    </>
  );
}

function Lead({ text }: { text: string }) {
  if (text.length < 90) return text;
  const { lead, rest } = leadIn(text);
  if (!rest) return <strong>{lead}</strong>;
  return (
    <>
      <strong>{lead}</strong>
      {rest}
    </>
  );
}

export function StepList({ items }: { items: string[] }) {
  const steps = items.flatMap((item) => splitSentences(item));
  return (
    <ol className="steps">
      {steps.map((step) => {
        const { lead, rest } = leadIn(step);
        return (
          <li key={step}>
            <span>
              <strong>{lead}</strong>
              {rest}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function GuideSections({
  sections,
}: {
  sections: Array<{
    title: string;
    paragraphs?: string[];
    listItems?: string[];
    orderedItems?: string[];
  }>;
}) {
  return (
    <>
      {sections.map((section) => {
        const factual = /deadline|eligib/i.test(section.title);
        return (
          <section key={section.title} className={factual ? "callout" : undefined}>
            <h2>{section.title}</h2>
            {section.paragraphs?.map((paragraph) => (
              <ReadableParagraph key={paragraph.slice(0, 48)} text={paragraph} />
            ))}
            {section.listItems && section.listItems.length > 0 ? (
              <ul>
                {section.listItems.map((item) => (
                  <li key={item}>
                    <Lead text={item} />
                  </li>
                ))}
              </ul>
            ) : null}
            {section.orderedItems && section.orderedItems.length > 0 ? (
              <StepList items={section.orderedItems} />
            ) : null}
          </section>
        );
      })}
    </>
  );
}
