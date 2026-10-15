"use client";

import { Card, Flex, Space, Spin, Typography } from "antd";
import { useCallback } from "react";
import { useTasks } from "@/hooks/useTasks";
import { getEmptyTasksMessage } from "@/lib/tasks";
import type { Task, TaskFilter } from "@/types/api";
import { StatusFilter } from "@/components/tasks/StatusFilter";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskProgress } from "@/components/tasks/TaskProgress";
import { PageHeader } from "@/components/ui/PageHeader";
import { StateMessage } from "@/components/ui/StateMessage";

type TaskDashboardProps = {
  initialFilter?: TaskFilter;
};

export function TaskDashboard({ initialFilter }: TaskDashboardProps) {
  const {
    tasks,
    filteredTasks,
    counts,
    filter,
    loading,
    loadError,
    updateError,
    pendingTaskIds,
    setFilter,
    fetchTasks,
    updateTaskStatus,
    dismissUpdateError,
  } = useTasks(initialFilter);

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
    <Space direction="vertical" size="middle" className="full-width">
      <PageHeader
        title="Task Dashboard"
        description="Track progress and keep every task's status up to date."
        actions={
          refreshing ? (
            <Space role="status">
              <Spin size="small" />
              <Typography.Text type="secondary">Refreshing</Typography.Text>
            </Space>
          ) : null
        }
      />

      <Card size="small">
        <Flex justify="space-between" align="center" wrap gap="middle">
          <StatusFilter value={filter} counts={counts} onChange={setFilter} />
          {counts.all > 0 ? <TaskProgress counts={counts} /> : null}
        </Flex>
      </Card>

      {initialLoading ? <StateMessage variant="loading">Loading tasks...</StateMessage> : null}

      {loadError ? (
        <StateMessage variant="error" action={{ label: "Retry", onClick: fetchTasks }}>
          {loadError}
        </StateMessage>
      ) : null}

      {updateError ? (
        <StateMessage variant="error" action={{ label: "Dismiss", onClick: dismissUpdateError }}>
          {updateError}
        </StateMessage>
      ) : null}

      {!initialLoading && !loadError ? (
        <TaskList
          tasks={filteredTasks}
          pendingTaskIds={pendingTaskIds}
          emptyMessage={getEmptyTasksMessage(tasks.length, filter)}
          onToggle={handleToggle}
        />
      ) : null}
    </Space>
  );
}
