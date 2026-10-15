import { Flex, Tooltip, Typography } from "antd";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import type { ActivityLog } from "@/types/api";

type ActivityItemProps = {
  item: ActivityLog;
};

export function ActivityItem({ item }: ActivityItemProps) {
  return (
    <div>
      <Flex justify="space-between" align="baseline" wrap gap="small">
        <Typography.Text strong={Boolean(item.action)} italic={!item.action} type={item.action ? undefined : "secondary"}>
          {item.action || "(no action)"}
        </Typography.Text>
        <Tooltip title={formatDateTime(item.when)}>
          <Typography.Text type="secondary" className="activity-item__time">
            <time dateTime={item.when}>{formatRelativeTime(item.when)}</time>
          </Typography.Text>
        </Tooltip>
      </Flex>
      <Typography.Text type="secondary" italic={!item.info}>
        {item.info || "(no info)"}
      </Typography.Text>
    </div>
  );
}
