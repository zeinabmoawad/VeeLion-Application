"use client";

import { Card, Flex, Space, Typography } from "antd";
import { useActivity } from "@/hooks/useActivity";
import { ActivityList } from "@/components/activity/ActivityList";
import { ActivitySearch } from "@/components/activity/ActivitySearch";
import { PageHeader } from "@/components/ui/PageHeader";
import { StateMessage } from "@/components/ui/StateMessage";

type ActivityFeedProps = {
  initialQuery?: string;
};

export function ActivityFeed({ initialQuery }: ActivityFeedProps) {
  const { activity, visibleActivity, query, loading, error, setQuery, fetchActivity } =
    useActivity(initialQuery);

  const initialLoading = loading && activity.length === 0;
  const loaded = !initialLoading && !error && activity.length > 0;

  function renderContent() {
    if (initialLoading) {
      return <StateMessage variant="loading">Loading activity...</StateMessage>;
    }

    if (error) {
      return (
        <StateMessage variant="error" action={{ label: "Retry", onClick: fetchActivity }}>
          {error}
        </StateMessage>
      );
    }

    if (activity.length === 0) {
      return <StateMessage variant="empty">No activity yet.</StateMessage>;
    }

    if (visibleActivity.length === 0) {
      return (
        <StateMessage variant="empty" action={{ label: "Clear search", onClick: () => setQuery("") }}>
          No activity matches &ldquo;{query.trim()}&rdquo;.
        </StateMessage>
      );
    }

    return <ActivityList items={visibleActivity} />;
  }

  return (
    <Space direction="vertical" size="middle" className="full-width">
      <PageHeader title="Activity Feed" description="Everything that happened across the system, newest first." />

      <Card size="small">
        <Flex justify="space-between" align="center" wrap gap="middle">
          <ActivitySearch value={query} onChange={setQuery} />
          {loaded ? (
            <Typography.Text type="secondary" role="status">
              Showing <Typography.Text strong>{visibleActivity.length}</Typography.Text> of {activity.length}
            </Typography.Text>
          ) : null}
        </Flex>
      </Card>

      {renderContent()}
    </Space>
  );
}
