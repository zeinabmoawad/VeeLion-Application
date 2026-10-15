"use client";

import { useActivity } from "@/hooks/useActivity";
import { ActivityList } from "@/components/activity/ActivityList";
import { ActivitySearch } from "@/components/activity/ActivitySearch";

type ActivityFeedProps = {
  initialQuery?: string;
};

export function ActivityFeed({ initialQuery }: ActivityFeedProps) {
  const { activity, visibleActivity, query, loading, error, setQuery, fetchActivity } =
    useActivity(initialQuery);

  const initialLoading = loading && activity.length === 0;

  function renderContent() {
    if (initialLoading) {
      return (
        <section className="card" role="status" style={{ padding: "1rem" }}>
          <p style={{ margin: 0 }}>Loading activity...</p>
        </section>
      );
    }

    if (error) {
      return (
        <section className="card" role="alert" style={{ padding: "1rem", borderColor: "#e3b4c0", background: "#fff8fa" }}>
          <p style={{ marginTop: 0, marginBottom: "0.75rem", color: "var(--danger)" }}>{error}</p>
          <button type="button" className="button" onClick={fetchActivity}>
            Retry
          </button>
        </section>
      );
    }

    if (activity.length === 0) {
      return (
        <section className="card" style={{ padding: "1rem" }}>
          <p style={{ margin: 0, color: "var(--muted)" }}>No activity yet.</p>
        </section>
      );
    }

    return (
      <>
        <p role="status" style={{ margin: 0, color: "var(--muted)", fontSize: "0.85rem" }}>
          Showing {visibleActivity.length} of {activity.length} entries, newest first
        </p>

        {visibleActivity.length === 0 ? (
          <section className="card" style={{ padding: "1rem" }}>
            <p style={{ marginTop: 0, marginBottom: "0.75rem", color: "var(--muted)" }}>
              No activity matches &ldquo;{query.trim()}&rdquo;.
            </p>
            <button type="button" className="button" onClick={() => setQuery("")}>
              Clear search
            </button>
          </section>
        ) : (
          <ActivityList items={visibleActivity} />
        )}
      </>
    );
  }

  return (
    <section className="stack">
      <header className="card" style={{ padding: "1rem" }}>
        <h1 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Activity Feed</h1>
        <ActivitySearch value={query} onChange={setQuery} />
      </header>

      {renderContent()}
    </section>
  );
}
