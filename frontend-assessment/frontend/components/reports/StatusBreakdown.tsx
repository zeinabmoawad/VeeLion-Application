import { Card, Flex, Progress, Typography, theme } from "antd";
import type { GlobalToken } from "antd";
import { getStatusBreakdown } from "@/lib/reports";
import type { TaskStatus, TasksSummary } from "@/types/api";

type StatusBreakdownProps = {
  summary: TasksSummary;
};

function getStatusColor(status: TaskStatus, token: GlobalToken): string {
  if (status === "done") {
    return token.colorSuccess;
  }

  if (status === "in-progress") {
    return token.colorPrimary;
  }

  return token.colorWarning;
}

export function StatusBreakdown({ summary }: StatusBreakdownProps) {
  const { token } = theme.useToken();
  const rows = getStatusBreakdown(summary);

  return (
    <Card title="Tasks by status" size="small">
      <Flex vertical gap="middle">
        {rows.map((row) => (
          <div key={row.status} className="status-breakdown__row">
            <Flex justify="space-between" align="baseline">
              <Typography.Text>{row.label}</Typography.Text>
              <Typography.Text type="secondary">
                <Typography.Text strong>{row.count}</Typography.Text> · {row.percent}%
              </Typography.Text>
            </Flex>
            <Progress
              percent={row.percent}
              showInfo={false}
              strokeColor={getStatusColor(row.status, token)}
              aria-label={`${row.label}: ${row.count} of ${summary.total} tasks`}
            />
          </div>
        ))}

        {/* The backend derives status from the boolean `completed`, so "in-progress" is always 0. */}
        <Typography.Text type="secondary" className="status-breakdown__note">
          Tasks are either completed or not yet, so none are currently reported as in progress.
        </Typography.Text>
      </Flex>
    </Card>
  );
}
