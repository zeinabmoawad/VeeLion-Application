"use client";

import { ArrowRightOutlined, BarChartOutlined, CheckSquareOutlined, HistoryOutlined } from "@ant-design/icons";
import { Card, Col, Row, Tag, Typography } from "antd";
import Link from "next/link";
import type { ReactNode } from "react";

const MODULES: Array<{ href: string; title: string; description: string; icon: ReactNode }> = [
  {
    href: "/tasks",
    title: "Task Dashboard",
    description: "Track progress, filter by status and mark tasks as done.",
    icon: <CheckSquareOutlined />,
  },
  {
    href: "/activity",
    title: "Activity Feed",
    description: "Search everything that happened across the system, newest first.",
    icon: <HistoryOutlined />,
  },
  {
    href: "/reports",
    title: "Reports",
    description: "See task totals, progress by status and recent activity at a glance.",
    icon: <BarChartOutlined />,
  },
];

export default function HomePage() {
  return (
    <main className="page-container">
      <header className="hero">
        <Tag color="cyan" bordered={false}>
          VeeLion workspace
        </Tag>
        <Typography.Title className="hero__title">Stay on top of your tasks and activity</Typography.Title>
        <Typography.Paragraph type="secondary" className="hero__lead">
          Three focused modules built against the provided backend.
        </Typography.Paragraph>
      </header>

      <Row gutter={[16, 16]}>
        {MODULES.map((module) => (
          <Col key={module.href} xs={24} md={8}>
            <Link href={module.href} className="module-link">
              <Card hoverable className="module-card">
                <span className="module-card__icon">{module.icon}</span>
                <Typography.Title level={4}>{module.title}</Typography.Title>
                <Typography.Paragraph type="secondary">{module.description}</Typography.Paragraph>
                <Typography.Text strong className="module-card__cta">
                  Open <ArrowRightOutlined />
                </Typography.Text>
              </Card>
            </Link>
          </Col>
        ))}
      </Row>
    </main>
  );
}
