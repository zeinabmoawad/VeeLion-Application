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
  return (
    <section aria-label="Filter tasks by status" className="card" style={{ padding: "0.8rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {FILTERS.map((filter) => {
          const active = filter.value === value;

          return (
            <button
              key={filter.value}
              type="button"
              className={active ? "button primary" : "button"}
              onClick={() => onChange(filter.value)}
              aria-pressed={active}
            >
              {filter.label} ({counts[filter.value]})
            </button>
          );
        })}
      </div>
    </section>
  );
}
