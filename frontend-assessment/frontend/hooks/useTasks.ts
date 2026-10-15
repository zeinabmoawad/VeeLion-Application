"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getErrorMessage, isAbortError, requestJson } from "@/lib/http";
import { countTasks, filterTasks } from "@/lib/tasks";
import { replaceSearchParam } from "@/lib/url";
import type { Task, TaskFilter, TaskResponse, TasksResponse } from "@/types/api";

function setTaskCompleted(tasks: Task[], taskId: string, completed: boolean): Task[] {
  return tasks.map((task) => (task.id === taskId ? { ...task, completed } : task));
}

export function useTasks(initialFilter: TaskFilter = "all") {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilterState] = useState<TaskFilter>(initialFilter);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [pendingTaskIds, setPendingTaskIds] = useState<ReadonlySet<string>>(() => new Set());
  const loadControllerRef = useRef<AbortController | null>(null);

  const setFilter = useCallback((next: TaskFilter) => {
    setFilterState(next);
    replaceSearchParam("status", next === "all" ? null : next);
  }, []);

  const fetchTasks = useCallback(async () => {
    // Cancel any in-flight load so an older response can't overwrite a newer one.
    loadControllerRef.current?.abort();
    const controller = new AbortController();
    loadControllerRef.current = controller;

    try {
      setLoading(true);
      setLoadError(null);

      const body = await requestJson<TasksResponse>("/api/tasks", {
        method: "GET",
        signal: controller.signal,
      });

      setTasks(body.data);
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      setLoadError(getErrorMessage(error, "Could not load tasks right now."));
    } finally {
      if (loadControllerRef.current === controller) {
        setLoading(false);
      }
    }
  }, []);

  const updateTaskStatus = useCallback(async (taskId: string, completed: boolean) => {
    setPendingTaskIds((previous) => new Set(previous).add(taskId));
    setUpdateError(null);
    // Optimistic update: reflect the change immediately, roll back if the request fails.
    setTasks((previous) => setTaskCompleted(previous, taskId, completed));

    try {
      const body = await requestJson<TaskResponse>(`/api/tasks/${encodeURIComponent(taskId)}`, {
        method: "PATCH",
        body: JSON.stringify({ completed }),
      });

      setTasks((previous) =>
        previous.map((task) => (task.id === taskId ? body.data : task))
      );
    } catch (error) {
      setTasks((previous) => setTaskCompleted(previous, taskId, !completed));
      setUpdateError(getErrorMessage(error, "Could not update task status."));
    } finally {
      setPendingTaskIds((previous) => {
        const next = new Set(previous);
        next.delete(taskId);
        return next;
      });
    }
  }, []);

  const dismissUpdateError = useCallback(() => setUpdateError(null), []);

  useEffect(() => {
    fetchTasks();

    return () => loadControllerRef.current?.abort();
  }, [fetchTasks]);

  const filteredTasks = useMemo(() => filterTasks(tasks, filter), [tasks, filter]);
  const counts = useMemo(() => countTasks(tasks), [tasks]);

  return {
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
  };
}
