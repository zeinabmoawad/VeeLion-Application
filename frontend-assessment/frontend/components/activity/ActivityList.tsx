import { ActivityItem } from "@/components/activity/ActivityItem";
import type { ActivityLog } from "@/types/api";

type ActivityListProps = {
  items: ActivityLog[];
};

export function ActivityList({ items }: ActivityListProps) {
  return (
    <section aria-label="Activity list" className="card" style={{ padding: "1rem" }}>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "0.7rem" }}>
        {items.map((item) => (
          <ActivityItem key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}
