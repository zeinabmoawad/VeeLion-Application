"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getErrorMessage, isAbortError, requestJson } from "@/lib/http";
import type { ActivityLog } from "@/types/api";

function filterActivity(items: ActivityLog[], text: string): ActivityLog[] {
  const lower = text.trim().toLowerCase();

  if (!lower) {
    return items;
  }

  return items.filter(
    (item) =>
      (item.action || "").toLowerCase().includes(lower) ||
      (item.info || "").toLowerCase().includes(lower)
  );
}

export default function ActivityPage() {
  const [allActivity, setAllActivity] = useState<ActivityLog[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const loadControllerRef = useRef<AbortController | null>(null);

  function formatTimeA(value: string) {
    return new Date(value).toLocaleString();
  }

  function formatTimeB(value: string) {
    return new Date(value).toLocaleString();
  }

  const loadActivity = useCallback(async () => {
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

      setAllActivity(data);
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      setError(getErrorMessage(error, "Could not load activity right now."));
      setAllActivity([]);
    }
  }, []);

  useEffect(() => {
    loadActivity();

    return () => loadControllerRef.current?.abort();
  }, [loadActivity]);

  // Derived during render instead of being copied into extra state by effects.
  const visibleActivity = useMemo(() => filterActivity(allActivity, query), [allActivity, query]);

  return (
    <main className="stack">
      <nav>
        <Link href="/" className="button">
          Back
        </Link>
      </nav>

      <section className="card" style={{ padding: "1rem" }}>
        <h1 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Activity Feed</h1>

        <input
          className="input"
          placeholder="Search activity"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </section>

      {error ? (
        <section className="card" role="alert" style={{ padding: "1rem", borderColor: "#e3b4c0", background: "#fff8fa" }}>
          <p style={{ marginTop: 0, marginBottom: "0.75rem", color: "var(--danger)" }}>{error}</p>
          <button type="button" className="button" onClick={loadActivity}>
            Retry
          </button>
        </section>
      ) : null}

      <section className="card" style={{ padding: "1rem" }}>
        <small style={{ color: "var(--muted)" }}>
          Total: {allActivity.length} | Visible: {visibleActivity.length}
        </small>
      </section>

      <section className="card" style={{ padding: "1rem" }}>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "0.7rem" }}>
          {visibleActivity.map((item) => (
            <li key={item.id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.6rem" }}>
              <div style={{ fontWeight: 600 }}>{item.action || "(no action)"}</div>
              <div>{item.info || "(no info)"}</div>
              <small style={{ color: "var(--muted)" }}>{formatTimeA(item.when)}</small>
              <br />
              <small style={{ color: "var(--muted)" }}>{formatTimeB(item.when)}</small>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
