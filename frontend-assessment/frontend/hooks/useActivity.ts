"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { filterActivity } from "@/lib/activity";
import { getErrorMessage, isAbortError, requestJson } from "@/lib/http";
import type { ActivityLog } from "@/types/api";

export function useActivity() {
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const loadControllerRef = useRef<AbortController | null>(null);

  const fetchActivity = useCallback(async () => {
    // Cancel any in-flight load so an older response can't overwrite a newer one.
    loadControllerRef.current?.abort();
    const controller = new AbortController();
    loadControllerRef.current = controller;

    try {
      setError(null);

      const data = await requestJson<ActivityLog[]>("/api/activity", {
        signal: controller.signal,
      });

      if (!Array.isArray(data)) {
        throw new Error("Received an unexpected response from the activity service.");
      }

      setActivity(data);
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      setError(getErrorMessage(error, "Could not load activity right now."));
      setActivity([]);
    }
  }, []);

  useEffect(() => {
    fetchActivity();

    return () => loadControllerRef.current?.abort();
  }, [fetchActivity]);

  const visibleActivity = useMemo(() => filterActivity(activity, query), [activity, query]);

  return {
    activity,
    visibleActivity,
    query,
    error,
    setQuery,
    fetchActivity,
  };
}
