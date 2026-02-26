"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { SynBarChart, SynAreaChart, SynPieChart } from "../components/Charts";
import {
  AlertTriangle,
  TrendingUp,
  ShieldAlert,
  Activity,
  Package,
  Users,
  MapPin,
  Warehouse,
} from "lucide-react";

const API = "http://localhost:8000";

type Summary = {
  total_records: number;
  unique_suppliers: number;
  unique_skus: number;
  unique_regions: number;
  unique_warehouses: number;
  avg_delay_days: number;
  max_delay_days: number;
  total_cost: number;
  delayed_shipments_pct: number;
  median_delay: number;
  avg_quality: number;
};

type RiskSupplier = {
  supplier: string;
  risk_score: number;
  tier: string;
  total_shipments: number;
  avg_delay: number;
  max_delay: number;
  total_cost: number;
  reliability_score: number;
};

type ExecutiveSummary = {
  overall_risk_level: string;
  risk_color: string;
  narrative: string;
  recommendations: { priority: string; action: string; detail: string; estimated_impact: string }[];
  key_metrics: Record<string, any>;
};

type AnomalyData = {
  anomaly_count: number;
  methods_used: string[];
  anomalies: { type: string; severity: string; supplier: string; risk_score: number }[];
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [suppliers, setSuppliers] = useState<RiskSupplier[]>([]);
  const [executive, setExecutive] = useState<ExecutiveSummary | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyData | null>(null);
  const [timeSeries, setTimeSeries] = useState<any>(null);
  const [bullwhip, setBullwhip] = useState<any>(null);
  const [resilience, setResilience] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [sumRes, supRes, execRes, anomRes, tsRes, bullRes, resRes] = await Promise.all([
          fetch(`${API}/analytics/summary`),
          fetch(`${API}/analytics/suppliers`),
          fetch(`${API}/copilot/summary`),
          fetch(`${API}/ml/anomalies`),
          fetch(`${API}/analytics/time-series`),
          fetch(`${API}/ml/bullwhip`),
          fetch(`${API}/graph/resilience`),
        ]);

        setSummary(await sumRes.json());
        setSuppliers(await supRes.json());
        setExecutive(await execRes.json());
        setAnomalies(await anomRes.json());
        setTimeSeries(await tsRes.json());
        setBullwhip(await bullRes.json());
        setResilience(await resRes.json());
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar />
        <main className="main-content" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <Activity size={32} color="#facc15" style={{ animation: "pulse-glow 2s infinite" }} />
            <p style={{ marginTop: 12, color: "var(--text-secondary)" }}>Loading intelligence dashboard...</p>
          </div>
        </main>
      </div>
    );
  }

  const riskTiers = {
    critical: suppliers.filter((s) => s.tier === "critical").length,
    elevated: suppliers.filter((s) => s.tier === "elevated").length,
    stable: suppliers.filter((s) => s.tier === "stable").length,
  };

  const tierData = [
    { name: "Critical", value: riskTiers.critical },
    { name: "Elevated", value: riskTiers.elevated },
    { name: "Stable", value: riskTiers.stable },
  ].filter((d) => d.value > 0);

  const topRiskSuppliers = suppliers
    .map((s) => ({
      name: s.supplier.length > 12 ? s.supplier.slice(0, 12) + "…" : s.supplier,
      risk_score: s.risk_score,
    }))
    .slice(0, 8);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1
            style={{
              fontFamily: "var(--font-plex)",
              fontSize: 28,
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            Supply Chain Command Center
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            Real-time intelligence across your supply chain network
          </p>
        </div>

        {/* Executive Risk Banner */}
        {executive && executive.overall_risk_level !== "UNKNOWN" && (
          <div
            className="card animate-fade-in"
            style={{
              marginBottom: 24,
              borderLeft: `4px solid ${executive.risk_color}`,
              display: "flex",
              gap: 16,
              alignItems: "flex-start",
            }}
          >
            <ShieldAlert size={22} color={executive.risk_color} style={{ marginTop: 2, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>
                  Overall Risk Level:{" "}
                  <span style={{ color: executive.risk_color }}>{executive.overall_risk_level}</span>
                </span>
              </div>
              <div
                style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}
                dangerouslySetInnerHTML={{
                  __html: executive.narrative
                    .split("\n\n")[0]
                    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
                }}
              />
            </div>
          </div>
        )}

        {/* KPI Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <KpiCard
            icon={<Package size={18} color="#facc15" />}
            label="Total Records"
            value={summary?.total_records?.toLocaleString() ?? "0"}
          />
          <KpiCard
            icon={<Users size={18} color="#38bdf8" />}
            label="Suppliers"
            value={summary?.unique_suppliers ?? 0}
          />
          <KpiCard
            icon={<TrendingUp size={18} color="#f59e0b" />}
            label="Avg Delay"
            value={`${summary?.avg_delay_days?.toFixed(1) ?? 0}d`}
            accent
          />
          <KpiCard
            icon={<AlertTriangle size={18} color="#ef4444" />}
            label="Anomalies"
            value={anomalies?.anomaly_count ?? 0}
            danger
          />
          <KpiCard
            icon={<MapPin size={18} color="#a78bfa" />}
            label="Regions"
            value={summary?.unique_regions ?? 0}
          />
          <KpiCard
            icon={<Warehouse size={18} color="#34d399" />}
            label="Cost Impact"
            value={`₹${((summary?.total_cost ?? 0) / 1000).toFixed(0)}K`}
          />
          <KpiCard
            icon={<Activity size={18} color="#22c55e" />}
            label="Resilience"
            value={`${resilience?.network_resilience_score ?? 50}%`}
            accent
          />
          <KpiCard
            icon={<TrendingUp size={18} color={bullwhip?.status === "high" ? "#ef4444" : "#facc15"} />}
            label="Bullwhip Ratio"
            value={bullwhip?.bullwhip_ratio ?? "1.0"}
            danger={bullwhip?.status === "high"}
          />
        </div>

        {/* Charts Row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {/* Risk Bar Chart */}
          <div className="card">
            <div className="chart-title">Supplier Risk Scores (0-100)</div>
            {topRiskSuppliers.length > 0 ? (
              <SynBarChart data={topRiskSuppliers} dataKey="risk_score" nameKey="name" color="#facc15" height={260} />
            ) : (
              <EmptyState />
            )}
          </div>

          {/* Risk Distribution Pie */}
          <div className="card">
            <div className="chart-title">Risk Distribution</div>
            {tierData.length > 0 ? (
              <SynPieChart data={tierData} dataKey="value" nameKey="name" height={260} />
            ) : (
              <EmptyState />
            )}
          </div>
        </div>

        {/* Time Series + Supplier Table Row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {/* Delay Trend */}
          <div className="card">
            <div className="chart-title">Delay Trend</div>
            {timeSeries?.delay_trend?.length > 0 ? (
              <SynAreaChart
                data={timeSeries.delay_trend}
                dataKey="avg_delay"
                xKey="period"
                color="#f59e0b"
                height={240}
              />
            ) : (
              <EmptyState msg="Upload time-stamped data for trends" />
            )}
          </div>

          {/* Cost Trend */}
          <div className="card">
            <div className="chart-title">Cost Trend</div>
            {timeSeries?.cost_trend?.length > 0 ? (
              <SynAreaChart
                data={timeSeries.cost_trend}
                dataKey="total_cost"
                xKey="period"
                color="#38bdf8"
                height={240}
              />
            ) : (
              <EmptyState msg="Upload time-stamped data for trends" />
            )}
          </div>
        </div>

        {/* Supplier Risk Leaderboard */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="chart-title">Supplier Risk Leaderboard</div>
          {suppliers.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Risk Score</th>
                  <th>Tier</th>
                  <th>Avg Delay</th>
                  <th>Shipments</th>
                  <th>Total Cost</th>
                  <th>Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.slice(0, 12).map((s, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{s.supplier}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 600, minWidth: 28 }}>
                          {s.risk_score}
                        </span>
                        <div className="risk-bar" style={{ width: 80 }}>
                          <div
                            className="risk-bar-fill"
                            style={{
                              width: `${s.risk_score}%`,
                              background:
                                s.risk_score >= 70
                                  ? "#ef4444"
                                  : s.risk_score >= 40
                                    ? "#f59e0b"
                                    : "#22c55e",
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`risk-badge risk-${s.tier === "critical" ? "critical" : s.tier === "elevated" ? "elevated" : "stable"}`}
                      >
                        <span
                          className={`risk-dot ${s.tier === "critical" ? "critical" : s.tier === "elevated" ? "elevated" : "stable"}`}
                        />
                        {s.tier}
                      </span>
                    </td>
                    <td>{s.avg_delay}d</td>
                    <td>{s.total_shipments}</td>
                    <td>₹{s.total_cost?.toLocaleString()}</td>
                    <td>
                      <div className="risk-bar" style={{ width: 60 }}>
                        <div
                          className="risk-bar-fill"
                          style={{
                            width: `${s.risk_score}%`,
                            background:
                              s.risk_score >= 70 ? "#ef4444" : s.risk_score >= 40 ? "#f59e0b" : "#22c55e",
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState />
          )}
        </div>

        {/* Recommendations */}
        {executive?.recommendations && executive.recommendations.length > 0 && (
          <div className="card">
            <div className="chart-title">AI Recommendations</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {executive.recommendations.slice(0, 4).map((rec, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color:
                        rec.priority === "critical"
                          ? "#ef4444"
                          : rec.priority === "high"
                            ? "#f59e0b"
                            : "#38bdf8",
                      minWidth: 55,
                      paddingTop: 2,
                    }}
                  >
                    {rec.priority}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{rec.action}</div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        marginTop: 2,
                        lineHeight: 1.5,
                      }}
                    >
                      {rec.detail}
                    </div>
                    <div style={{ fontSize: 11, color: "#22c55e", marginTop: 4 }}>
                      Est. impact: {rec.estimated_impact}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ---------- Components ---------- */

function KpiCard({
  icon,
  label,
  value,
  accent,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  value: any;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="card kpi-card animate-fade-in">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        {icon}
        <span className="kpi-label">{label}</span>
      </div>
      <div
        className="kpi-value"
        style={{
          color: danger ? "#ef4444" : accent ? "#facc15" : "var(--text-primary)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function EmptyState({ msg = "Upload data to see analytics" }: { msg?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: 200,
        color: "var(--text-muted)",
        fontSize: 13,
      }}
    >
      {msg}
    </div>
  );
}
