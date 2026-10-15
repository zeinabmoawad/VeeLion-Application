import { Badge, Segmented, theme } from "antd";
import type { TaskCounts } from "@/lib/tasks";
import type { TaskFilter } from "@/types/api";

const FILTERS: Array<{ label: string; value: TaskFilter }> = [
  { label: "All", value: "all" },
  { label: "Completed", value: "completed" },
  { label: "Pending", value: "pending" },
];

type StatusFilterProps = {
  value: TaskFilter;
  counts: TaskCounts;
  onChange: (value: TaskFilter) => void;
};

export function StatusFilter({ value, counts, onChange }: StatusFilterProps) {
  const { token } = theme.useToken();

  return (
    <Segmented<TaskFilter>
      aria-label="Filter tasks by status"
      value={value}
      onChange={onChange}
      options={FILTERS.map((filter) => ({
        value: filter.value,
        label: (
          <span className="status-filter__option">
            {filter.label}
            <Badge
              count={counts[filter.value]}
              showZero
              color={filter.value === value ? token.colorPrimary : token.colorTextQuaternary}
              size="small"
            />
          </span>
        ),
      }))}
    />
  );
}
