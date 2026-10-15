import { Checkbox, List, Spin, Tag, Tooltip, Typography } from "antd";
import { memo } from "react";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import type { Task } from "@/types/api";

type TaskItemProps = {
  task: Task;
  busy: boolean;
  onToggle: (task: Task) => void;
};

// Memoised so toggling one task only re-renders that row (props are stable otherwise).
export const TaskItem = memo(function TaskItem({ task, busy, onToggle }: TaskItemProps) {
  const nextStatus = task.completed ? "pending" : "completed";

  return (
    <List.Item
      aria-busy={busy}
      extra={
        <Tag color={task.completed ? "success" : "warning"} bordered={false}>
          {task.completed ? "Completed" : "Pending"}
        </Tag>
      }
    >
      <List.Item.Meta
        avatar={
          busy ? (
            <Spin size="small" className="task-item__control" />
          ) : (
            <Checkbox
              className="task-item__control"
              checked={task.completed}
              onChange={() => onToggle(task)}
              aria-label={`Mark ${task.title} as ${nextStatus}`}
            />
          )
        }
        title={
          <Typography.Text delete={task.completed} type={task.completed ? "secondary" : undefined}>
            {task.title}
          </Typography.Text>
        }
        description={
          <Typography.Text type="secondary" className="task-item__meta">
            Updated{" "}
            <Tooltip title={formatDateTime(task.updatedAt)}>
              <time dateTime={task.updatedAt}>{formatRelativeTime(task.updatedAt)}</time>
            </Tooltip>
          </Typography.Text>
        }
      />
    </List.Item>
  );
});
