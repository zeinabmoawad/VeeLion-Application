import { BACKEND_BASE_URL } from "@/lib/constants";
import { ApiError, parseErrorMessage } from "@/lib/http";
import type { ActivityLog, Task, TaskResponse, TasksResponse } from "@/types/api";

function buildBackendUrl(path: string): string {
  return `${BACKEND_BASE_URL}${path}`;
}

async function backendFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(buildBackendUrl(path), {
      ...init,
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Backend service is unavailable.", 502);
  }

  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }

  return (await response.json()) as T;
}

export async function getTasksFromBackend(): Promise<Task[]> {
  const body = await backendFetch<TasksResponse>("/tasks");
  return body.data;
}

export async function updateTaskInBackend(taskId: string, completed: boolean): Promise<Task> {
  const body = await backendFetch<TaskResponse>(`/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ completed }),
  });

  return body.data;
}

export async function getActivityFromBackend(): Promise<ActivityLog[]> {
  return backendFetch<ActivityLog[]>("/activity");
}
