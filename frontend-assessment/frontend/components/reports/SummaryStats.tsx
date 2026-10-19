import { CheckCircleOutlined, HistoryOutlined, UnorderedListOutlined } from "@ant-design/icons";
import { Card, Col, Row, Statistic } from "antd";
import type { ReactNode } from "react";
import type { TasksSummary } from "@/types/api";

type SummaryStatsProps = {
  summary: TasksSummary;
};

type Stat = {
  key: string;
  title: string;
  value: number;
  suffix?: string;
  icon: ReactNode;
};

function getStats(summary: TasksSummary): Stat[] {
  const completionRate = summary.total === 0 ? 0 : Math.round((summary.byStatus.done / summary.total) * 100);

  return [
    { key: "total", title: "Total tasks", value: summary.total, icon: <UnorderedListOutlined /> },
    { key: "completion", title: "Completion rate", value: completionRate, suffix: "%", icon: <CheckCircleOutlined /> },
    { key: "activity", title: "Recent activity", value: summary.recentActivityCount, icon: <HistoryOutlined /> },
  ];
}

export function SummaryStats({ summary }: SummaryStatsProps) {
  return (
    <Row gutter={[16, 16]}>
      {getStats(summary).map((stat) => (
        <Col key={stat.key} xs={24} sm={8}>
          <Card size="small" className="summary-stat">
            <Statistic title={stat.title} value={stat.value} suffix={stat.suffix} prefix={stat.icon} />
          </Card>
        </Col>
      ))}
    </Row>
  );
}
