import { Flex, Typography } from "antd";
import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <Flex component="header" justify="space-between" align="flex-end" wrap gap="small" className="page-header">
      <div>
        <Typography.Title level={2} className="page-header__title">
          {title}
        </Typography.Title>
        {description ? <Typography.Text type="secondary">{description}</Typography.Text> : null}
      </div>
      {actions}
    </Flex>
  );
}
