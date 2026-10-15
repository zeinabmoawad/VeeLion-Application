import type { ActivityLog } from "@/types/api";

export function filterActivity(items: ActivityLog[], text: string): ActivityLog[] {
  const lower = text.trim().toLowerCase();

  if (!lower) {
    return items;
  }

  return items.filter(
    (item) =>
      (item.action || "").toLowerCase().includes(lower) ||
      (item.info || "").toLowerCase().includes(lower)
  );
}

function toTimestamp(value: string): number {
  const time = Date.parse(value);
  return Number.isNaN(time) ? -Infinity : time;
}

// Newest first; entries with an invalid date go last.
export function sortActivityNewestFirst(items: ActivityLog[]): ActivityLog[] {
  return [...items].sort((a, b) => toTimestamp(b.when) - toTimestamp(a.when));
}
