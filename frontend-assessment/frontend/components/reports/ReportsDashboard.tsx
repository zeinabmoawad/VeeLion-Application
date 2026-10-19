"use client";

import { ReloadOutlined } from "@ant-design/icons";
import { Button, Space } from "antd";
import { useTasksSummary } from "@/hooks/useTasksSummary";
import { StatusBreakdown } from "@/components/reports/StatusBreakdown";
import { SummaryStats } from "@/components/reports/SummaryStats";
import { PageHeader } from "@/components/ui/PageHeader";
import { StateMessage } from "@/components/ui/StateMessage";

export function ReportsDashboard() {
  const { summary, loading, error, fetchSummary } = useTasksSummary();

  function renderContent() {
    // Only the first load blocks the page; refreshes keep the last report on screen.
    if (loading && !summary) {
      return <StateMessage variant="loading">Loading report...</StateMessage>;
    }

    if (error) {
      return (
        <StateMessage variant="error" action={{ label: "Retry", onClick: fetchSummary }}>
          {error}
        </StateMessage>
      );
    }

    if (!summary) {
      return null;
    }

    if (summary.total === 0) {
      return (
        <>
          <SummaryStats summary={summary} />
          <StateMessage variant="empty">No tasks yet, so there is nothing to break down.</StateMessage>
        </>
      );
    }

    return (
      <>
        <SummaryStats summary={summary} />
        <StatusBreakdown summary={summary} />
      </>
    );
  }

  return (
    <Space direction="vertical" size="middle" className="full-width">
      <PageHeader
        title="Reports"
        description="A snapshot of task progress and system activity."
        actions={
          summary ? (
            <Button icon={<ReloadOutlined />} loading={loading} onClick={fetchSummary}>
              Refresh
            </Button>
          ) : null
        }
      />

      {renderContent()}
    </Space>
  );
}
