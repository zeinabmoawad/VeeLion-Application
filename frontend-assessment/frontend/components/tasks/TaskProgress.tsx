import { Progress, Typography } from "antd";
import type { TaskCounts } from "@/lib/tasks";

type TaskProgressProps = {
  counts: TaskCounts;
};

export function TaskProgress({ counts }: TaskProgressProps) {
  const percent = counts.all === 0 ? 0 : Math.round((counts.completed / counts.all) * 100);

  return (
    <div className="task-progress">
      <Typography.Text type="secondary">
        <Typography.Text strong>{counts.completed}</Typography.Text> of {counts.all} completed
      </Typography.Text>
      <Progress percent={percent} size="small" aria-label="Tasks completed" />
    </div>
  );
}
