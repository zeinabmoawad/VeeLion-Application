import "server-only";

import { BACKEND_BASE_URL } from "@/lib/constants";
import { ApiError, parseErrorMessage } from "@/lib/http";
import { isRecord, parseActivityLog, parseList, parseTask, parseTasksSummary } from "@/lib/validators";
import type { ActivityLog, Task, TasksSummary } from "@/types/api";

function buildBackendUrl(path: string): string {
  return `${BACKEND_BASE_URL}${path}`;
}

function invalidResponse(resource: string): ApiError {
  return new ApiError(`Received an invalid ${resource} response from the backend.`, 502);
}

async function backendFetch(path: string, init?: RequestInit): Promise<unknown> {
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

  try {
    return await response.json();
  } catch {
    throw new ApiError("Backend returned a response that is not valid JSON.", 502);
  }
}

function parseListOrThrow<T>(value: unknown, parseItem: (item: unknown) => T | null, resource: string): T[] {
  const parsed = parseList(value, parseItem);

  if (!parsed) {
    throw invalidResponse(resource);
  }

  if (parsed.skipped > 0) {
    console.warn(`[backendApi] Skipped ${parsed.skipped} malformed ${resource} item(s).`);
  }

  return parsed.items;
}

export async function getTasksFromBackend(): Promise<Task[]> {
  const body = await backendFetch("/tasks");
  return parseListOrThrow(isRecord(body) ? body.data : undefined, parseTask, "tasks");
}

export async function updateTaskInBackend(taskId: string, completed: boolean): Promise<Task> {
  const body = await backendFetch(`/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ completed }),
  });

  const task = parseTask(isRecord(body) ? body.data : undefined);

  if (!task) {
    throw invalidResponse("task");
  }

  return task;
}

export async function getActivityFromBackend(): Promise<ActivityLog[]> {
  // The backend returns a raw array for activity (not wrapped in { data }).
  const body = await backendFetch("/activity");
  return parseListOrThrow(body, parseActivityLog, "activity");
}

export async function getTasksSummaryFromBackend(): Promise<TasksSummary> {
  // Like activity, the reports endpoint returns a raw object (not wrapped in { data }).
  const summary = parseTasksSummary(await backendFetch("/reports/tasks-summary"));

  if (!summary) {
    throw invalidResponse("tasks summary");
  }

  return summary;
}
