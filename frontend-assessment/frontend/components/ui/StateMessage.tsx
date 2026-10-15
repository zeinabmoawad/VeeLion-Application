import { Alert, Button, Card, Empty, Spin } from "antd";
import type { ReactNode } from "react";

type StateMessageVariant = "loading" | "empty" | "error";

type StateMessageProps = {
  variant: StateMessageVariant;
  children: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
};

// One component for loading / empty / error states so every module handles them the same way.
export function StateMessage({ variant, children, action }: StateMessageProps) {
  const actionButton = action ? (
    <Button size="small" onClick={action.onClick}>
      {action.label}
    </Button>
  ) : null;

  if (variant === "error") {
    return <Alert type="error" showIcon message={children} action={actionButton} role="alert" />;
  }

  if (variant === "loading") {
    return (
      <Card role="status">
        <Spin tip={children} size="large">
          <div className="state-message__spin-area" />
        </Spin>
      </Card>
    );
  }

  return (
    <Card>
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={children}>
        {actionButton}
      </Empty>
    </Card>
  );
}
