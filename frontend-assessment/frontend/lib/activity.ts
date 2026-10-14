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
