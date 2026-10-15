import type { Task, TaskFilter } from "@/types/api";

const TASK_FILTERS: readonly TaskFilter[] = ["all", "completed", "pending"];

export type TaskCounts = Record<TaskFilter, number>;

export function parseTaskFilter(value: string | undefined): TaskFilter {
  return TASK_FILTERS.includes(value as TaskFilter) ? (value as TaskFilter) : "all";
}

export function filterTasks(tasks: Task[], filter: TaskFilter): Task[] {
  if (filter === "completed") {
    return tasks.filter((task) => task.completed);
  }

  if (filter === "pending") {
    return tasks.filter((task) => !task.completed);
  }

  return tasks;
}

export function countTasks(tasks: Task[]): TaskCounts {
  const completed = tasks.filter((task) => task.completed).length;

  return {
    all: tasks.length,
    completed,
    pending: tasks.length - completed,
  };
}

export function getEmptyTasksMessage(totalCount: number, filter: TaskFilter): string {
  if (totalCount === 0) {
    return "No tasks yet.";
  }

  if (filter === "completed") {
    return "No completed tasks yet.";
  }

  if (filter === "pending") {
    return "No pending tasks. Everything is done!";
  }

  return "No tasks to show.";
}
