"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App, ConfigProvider, Layout } from "antd";
import type { ThemeConfig } from "antd";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";

const BRAND_COLOR = "#0f766e";

const THEME: ThemeConfig = {
  token: {
    colorPrimary: BRAND_COLOR,
    // Progress, Badge "processing" and links read colorInfo/colorLink, not colorPrimary.
    colorInfo: BRAND_COLOR,
    colorLink: BRAND_COLOR,
    colorBgLayout: "#f5f7fa",
    borderRadius: 10,
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
};

export function AppShell({ children }: { children: ReactNode }) {
  return (
    // Collects antd's CSS-in-JS styles during SSR so the first paint is already styled.
    // <AntdRegistry>
      <ConfigProvider theme={THEME}>
        <App>
          <Layout className="app-layout">
            <SiteHeader />
            <Layout.Content>{children}</Layout.Content>
          </Layout>
        </App>
      </ConfigProvider>
    // </AntdRegistry>
  );
}
