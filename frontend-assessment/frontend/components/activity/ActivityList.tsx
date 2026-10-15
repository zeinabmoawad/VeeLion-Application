import { Card, Timeline } from "antd";
import { ActivityItem } from "@/components/activity/ActivityItem";
import type { ActivityLog } from "@/types/api";

type ActivityListProps = {
  items: ActivityLog[];
};

export function ActivityList({ items }: ActivityListProps) {
  return (
    <Card aria-label="Activity list">
      <Timeline
        className="activity-timeline"
        items={items.map((item) => ({
          key: item.id,
          children: <ActivityItem item={item} />,
        }))}
      />
    </Card>
  );
}
