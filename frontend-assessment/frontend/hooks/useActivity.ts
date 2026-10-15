"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { filterActivity, sortActivityNewestFirst } from "@/lib/activity";
import { getErrorMessage, isAbortError, requestJson } from "@/lib/http";
import { replaceSearchParam } from "@/lib/url";
import type { ActivityLog } from "@/types/api";

const URL_SYNC_DELAY_MS = 300;

export function useActivity(initialQuery = "") {
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const loadControllerRef = useRef<AbortController | null>(null);

  const fetchActivity = useCallback(async () => {
    // Cancel any in-flight load so an older response can't overwrite a newer one.
    loadControllerRef.current?.abort();
    const controller = new AbortController();
    loadControllerRef.current = controller;

    try {
      setLoading(true);
      setError(null);

      const data = await requestJson<ActivityLog[]>("/api/activity", {
        signal: controller.signal,
      });

      if (!Array.isArray(data)) {
        throw new Error("Received an unexpected response from the activity service.");
      }

      setActivity(sortActivityNewestFirst(data));
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      setError(getErrorMessage(error, "Could not load activity right now."));
      setActivity([]);
    } finally {
      if (loadControllerRef.current === controller) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchActivity();

    return () => loadControllerRef.current?.abort();
  }, [fetchActivity]);

  // Keep ?q= in sync so searches survive reloads and can be shared; debounced while typing.
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      replaceSearchParam("q", query.trim() || null);
    }, URL_SYNC_DELAY_MS);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const visibleActivity = useMemo(() => filterActivity(activity, query), [activity, query]);

  return {
    activity,
    visibleActivity,
    query,
    loading,
    error,
    setQuery,
    fetchActivity,
  };
}
