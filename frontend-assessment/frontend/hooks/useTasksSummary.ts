"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage, isAbortError, requestJson } from "@/lib/http";
import type { TasksSummary, TasksSummaryResponse } from "@/types/api";

export function useTasksSummary() {
  const [summary, setSummary] = useState<TasksSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const loadControllerRef = useRef<AbortController | null>(null);

  const fetchSummary = useCallback(async () => {
    // Cancel any in-flight load so an older response can't overwrite a newer one.
    loadControllerRef.current?.abort();
    const controller = new AbortController();
    loadControllerRef.current = controller;

    try {
      setLoading(true);
      setError(null);

      const body = await requestJson<TasksSummaryResponse>("/api/reports/tasks-summary", {
        signal: controller.signal,
      });

      setSummary(body.data);
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      setError(getErrorMessage(error, "Could not load the report right now."));
    } finally {
      if (loadControllerRef.current === controller) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchSummary();

    return () => loadControllerRef.current?.abort();
  }, [fetchSummary]);

  return {
    summary,
    loading,
    error,
    fetchSummary,
  };
}
