import { calendarDay } from "@/lib/application/intakes";
import type { Announcement } from "./schema/schedule";

export type ActiveAnnouncement = { text: string; linkLabel: string; linkHref: string };

/** Returns the banner to show right now, or null. Window dates are inclusive, site time zone. */
export function activeAnnouncement(
  announcement: Announcement | undefined,
  timeZone = "Asia/Karachi",
  now = new Date(),
): ActiveAnnouncement | null {
  if (!announcement?.enabled || !announcement.text.trim()) return null;
  const today = calendarDay(now, timeZone);
  if (announcement.startsOn && today < announcement.startsOn) return null;
  if (announcement.endsOn && today > announcement.endsOn) return null;
  return {
    text: announcement.text.trim(),
    linkLabel: announcement.linkLabel.trim(),
    linkHref: announcement.linkHref.trim(),
  };
}
