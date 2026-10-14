"use client";

import { useCallback } from "react";
import { useTasks } from "@/hooks/useTasks";
import type { Task } from "@/types/api";
import { StatusFilter } from "@/components/tasks/StatusFilter";
import { TaskList } from "@/components/tasks/TaskList";

export function TaskDashboard() {
  const {
    tasks,
    filteredTasks,
    filter,
    loading,
    loadError,
    updateError,
    pendingTaskIds,
    setFilter,
    fetchTasks,
    updateTaskStatus,
    dismissUpdateError,
  } = useTasks();

  const handleToggle = useCallback(
    (task: Task) => {
      updateTaskStatus(task.id, !task.completed);
    },
    [updateTaskStatus]
  );

  // Only the first load blocks the list; refetches keep it mounted to avoid flicker.
  const initialLoading = loading && tasks.length === 0;
  const refreshing = loading && tasks.length > 0;

  return (
    <section className="stack">
      <header className="card" style={{ padding: "1rem" }}>
        <h1 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Task Dashboard</h1>
        {refreshing ? (
          <small role="status" style={{ color: "var(--muted)" }}>
            Refreshing...
          </small>
        ) : null}
      </header>

      <StatusFilter value={filter} onChange={setFilter} />

      {initialLoading ? (
        <section className="card" style={{ padding: "1rem" }}>
          <p style={{ margin: 0 }}>Loading tasks...</p>
        </section>
      ) : null}

      {loadError ? (
        <section className="card" role="alert" style={{ padding: "1rem", borderColor: "#e3b4c0", background: "#fff8fa" }}>
          <p style={{ marginTop: 0, marginBottom: "0.75rem", color: "var(--danger)" }}>{loadError}</p>
          <button type="button" className="button" onClick={fetchTasks}>
            Retry
          </button>
        </section>
      ) : null}

      {updateError ? (
        <section
          className="card"
          role="alert"
          style={{
            padding: "0.8rem 1rem",
            borderColor: "#e3b4c0",
            background: "#fff8fa",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "0.8rem",
          }}
        >
          <p style={{ margin: 0, color: "var(--danger)" }}>{updateError}</p>
          <button type="button" className="button" onClick={dismissUpdateError}>
            Dismiss
          </button>
        </section>
      ) : null}

      {!initialLoading && !loadError ? (
        <TaskList tasks={filteredTasks} pendingTaskIds={pendingTaskIds} onToggle={handleToggle} />
      ) : null}
    </section>
  );
}
