/**
 * Pure resolver for the application form's active cycle and availability.
 * Safe to import from client components.
 */
import {
  DEFAULT_APPLICATION_FORM,
  DEFAULT_INTAKES,
  type ApplicationFormSettings,
  type IntakesConfig,
} from "@/lib/content/schema/schedule";
import { calendarDay, formatIntakeDate } from "./intakes";

export type FormState = {
  cycleId: string;
  cycleName: string;
  open: boolean;
  availability: ApplicationFormSettings["availability"];
  /** Friendly text for the closed form. */
  closedMessage: string;
};

export function resolveFormState(
  settings: ApplicationFormSettings | undefined,
  intakes: IntakesConfig | undefined,
  now = new Date(),
): FormState {
  const form = settings ?? DEFAULT_APPLICATION_FORM;
  const config = intakes ?? DEFAULT_INTAKES;
  let open = true;
  if (form.availability === "closed") open = false;
  if (form.availability === "follow-intake") {
    const id = form.intakeId || form.cycleId;
    const intake = config.items.find((item) => item.id === id);
    const today = calendarDay(now, config.timezone);
    open = Boolean(intake && intake.opens && intake.opens <= today && today <= intake.deadline);
  }
  const today = calendarDay(now, config.timezone);
  const upcoming = [...config.items]
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .filter((item) => item.deadline >= today);
  const next = upcoming.find((item) => item.id !== form.cycleId) ?? upcoming[0];
  const nextText = next
    ? next.opens && next.opens > today
      ? `The next intake is ${next.name}: applications open on ${formatIntakeDate(next.opens)} and close on ${formatIntakeDate(next.deadline)}.`
      : `The next intake is ${next.name}, with a deadline of ${formatIntakeDate(next.deadline)}.`
    : "The next intake has not been announced yet.";
  const closedMessage = [
    `Applications for ${form.cycleName} are not being accepted right now.`,
    nextText,
    form.closedMessage.trim(),
  ]
    .filter(Boolean)
    .join(" ");
  return { cycleId: form.cycleId, cycleName: form.cycleName, open, availability: form.availability, closedMessage };
}

