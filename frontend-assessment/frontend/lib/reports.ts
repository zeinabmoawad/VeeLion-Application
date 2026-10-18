import type { TaskStatus, TasksSummary } from "@/types/api";

// Display order and labels for the backend's status keys.
const STATUS_ORDER: readonly TaskStatus[] = ["todo", "in-progress", "done"];

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  "in-progress": "In progress",
  done: "Done",
};

export type StatusBreakdownRow = {
  status: TaskStatus;
  label: string;
  count: number;
  percent: number;
};

export function getStatusBreakdown(summary: TasksSummary): StatusBreakdownRow[] {
  return STATUS_ORDER.map((status) => {
    const count = summary.byStatus[status];

    return {
      status,
      label: STATUS_LABELS[status],
      count,
      percent: summary.total === 0 ? 0 : Math.round((count / summary.total) * 100),
    };
  });
}
