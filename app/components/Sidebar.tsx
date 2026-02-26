"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  BarChart3,
  Network,
  Bot,
  Download,
  Activity,
  ShieldAlert,
  Brain,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Upload Data", href: "/upload", icon: Upload },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Graph Intelligence", href: "/graph", icon: Network },
  { label: "AI Co-Pilot", href: "/copilot", icon: Bot },
  { label: "XAI / Explainability", href: "/xai", icon: Brain },
  { label: "Export Hub", href: "/export", icon: Download },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <Link href="/" style={{ textDecoration: "none" }}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">S</div>
          <div className="sidebar-logo-text">SynChain 2.0</div>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section">Intelligence</div>
        {NAV_ITEMS.slice(0, 2).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link ${pathname === item.href ? "active" : ""}`}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </Link>
        ))}

        <div className="sidebar-section">Analysis</div>
        {NAV_ITEMS.slice(2, 6).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link ${pathname === item.href ? "active" : ""}`}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </Link>
        ))}

        <div className="sidebar-section">Data</div>
        {NAV_ITEMS.slice(6).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link ${pathname === item.href ? "active" : ""}`}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border-subtle)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Activity size={14} color="var(--risk-low)" />
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            System Online
          </span>
        </div>
      </div>
    </aside>
  );
}
