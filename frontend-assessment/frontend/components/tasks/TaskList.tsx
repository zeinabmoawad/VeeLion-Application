import { Card, List } from "antd";
import type { Task } from "@/types/api";
import { TaskItem } from "@/components/tasks/TaskItem";
import { StateMessage } from "@/components/ui/StateMessage";

type TaskListProps = {
  tasks: Task[];
  pendingTaskIds: ReadonlySet<string>;
  emptyMessage: string;
  onToggle: (task: Task) => void;
};

export function TaskList({ tasks, pendingTaskIds, emptyMessage, onToggle }: TaskListProps) {
  if (tasks.length === 0) {
    return <StateMessage variant="empty">{emptyMessage}</StateMessage>;
  }

  return (
    <Card styles={{ body: { padding: "4px 20px" } }} aria-label="Task list">
      <List
        dataSource={tasks}
        rowKey="id"
        renderItem={(task) => (
          <TaskItem task={task} busy={pendingTaskIds.has(task.id)} onToggle={onToggle} />
        )}
      />
    </Card>
  );
}
