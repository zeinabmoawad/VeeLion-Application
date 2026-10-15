import type { ActivityLog, Task } from "@/types/api";

// Runtime checks for data coming from the backend. TypeScript types alone are only
// promises; these make sure a malformed payload can't reach the UI as a "Task".

type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function parseTask(value: unknown): Task | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    typeof value.completed !== "boolean" ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return null;
  }

  return {
    id: value.id,
    title: value.title,
    completed: value.completed,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

// action/info are not validated by the backend, so anything that isn't a string becomes undefined.
export function parseActivityLog(value: unknown): ActivityLog | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.when !== "string") {
    return null;
  }

  return {
    id: value.id,
    action: optionalString(value.action),
    info: optionalString(value.info),
    when: value.when,
  };
}

export type ParsedList<T> = {
  items: T[];
  skipped: number;
};

// Returns null when the value is not an array at all; otherwise keeps the valid items.
export function parseList<T>(value: unknown, parseItem: (item: unknown) => T | null): ParsedList<T> | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const items: T[] = [];

  for (const entry of value) {
    const parsed = parseItem(entry);

    if (parsed) {
      items.push(parsed);
    }
  }

  return { items, skipped: value.length - items.length };
}
