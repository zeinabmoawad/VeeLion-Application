import type { Task } from "@/types/api";
import { TaskItem } from "@/components/tasks/TaskItem";

type TaskListProps = {
  tasks: Task[];
  pendingTaskIds: ReadonlySet<string>;
  emptyMessage: string;
  onToggle: (task: Task) => void;
};

export function TaskList({ tasks, pendingTaskIds, emptyMessage, onToggle }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <section className="card" style={{ padding: "1rem" }}>
        <p style={{ margin: 0, color: "var(--muted)" }}>{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section aria-label="Task list">
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.7rem" }}>
        {tasks.map((task) => (
          <TaskItem key={task.id} task={task} busy={pendingTaskIds.has(task.id)} onToggle={onToggle} />
        ))}
      </ul>
    </section>
  );
}
