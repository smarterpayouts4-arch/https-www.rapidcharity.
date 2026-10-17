import { ReadableParagraph } from "@/components/content/Guide";
import type { StoryFact } from "./ScholarshipStory";
import { ScholarshipStory } from "./ScholarshipStory";

type Landing = {
  paragraphs: string[];
  listItems?: string[];
  note?: string;
};

export function LandingBody({
  landing,
  facts,
}: {
  landing: Landing;
  facts: StoryFact[];
}) {
  const intro = landing.paragraphs[0] ?? "";
  return (
    <ScholarshipStory intro={intro} facts={facts} points={landing.listItems}>
      {landing.paragraphs.map((paragraph) => (
        <ReadableParagraph key={paragraph.slice(0, 48)} text={paragraph} />
      ))}
      {landing.note ? (
        <p>
          <em>{landing.note}</em>
        </p>
      ) : null}
    </ScholarshipStory>
  );
}

export function deadlineFact(deadlines: { title: string; body: string }[]): StoryFact {
  return {
    label: "Deadline",
    text: deadlines.map((item) => `${item.title}. ${item.body}`).join(" "),
  };
}
