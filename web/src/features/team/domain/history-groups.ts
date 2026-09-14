import { shopDate } from "@/shared/workspace";
import type { CompletedWork } from "../types/work-history";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "numeric",
  minute: "2-digit",
});

export const completedWorkTime = (value: string) =>
  timeFormatter.format(new Date(value));

/** Group the current page using the shop's calendar, not the device's timezone. */
export function groupCompletedWork(entries: CompletedWork[], today: string) {
  const yesterday = shopDate(
    new Date(new Date(`${today}T12:00:00+05:30`).getTime() - 86_400_000),
  );
  const groups = new Map<
    string,
    { date: string; label: string; dateLabel: string; entries: CompletedWork[] }
  >();
  for (const entry of entries) {
    const completed = new Date(entry.completedAt);
    const date = shopDate(completed);
    const dateLabel = dateFormatter.format(completed);
    let group = groups.get(date);
    if (!group) {
      group = {
        date,
        label:
          date === today
            ? "Today"
            : date === yesterday
              ? "Yesterday"
              : dateLabel,
        dateLabel,
        entries: [],
      };
      groups.set(date, group);
    }
    group.entries.push(entry);
  }
  return [...groups.values()];
}
