"use client";

import { Layout, Menu, theme } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/tasks", label: "Tasks" },
  { href: "/activity", label: "Activity" },
];

function getActiveKeys(pathname: string): string[] {
  return NAV_LINKS.filter((link) => pathname === link.href || pathname.startsWith(`${link.href}/`)).map(
    (link) => link.href
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const { token } = theme.useToken();

  return (
    <Layout.Header
      className="site-header"
      style={{ background: token.colorBgContainer, borderBottom: `1px solid ${token.colorBorderSecondary}` }}
    >
      <div className="page-container site-header__inner">
        <Link href="/" className="brand">
          <span className="brand__mark" aria-hidden="true">
            V
          </span>
          <span className="brand__name">VeeLion</span>
        </Link>

        <Menu
          mode="horizontal"
          selectedKeys={getActiveKeys(pathname)}
          items={NAV_LINKS.map((link) => ({
            key: link.href,
            label: <Link href={link.href}>{link.label}</Link>,
          }))}
          className="site-header__menu"
          style={{ background: "transparent", borderBottom: 0 }}
          aria-label="Main"
        />
      </div>
    </Layout.Header>
  );
}
