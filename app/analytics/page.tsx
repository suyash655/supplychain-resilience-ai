"use client";

import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { SynBarChart, SynLineChart, SynPieChart, SynAreaChart } from "../components/Charts";
import { BarChart3 } from "lucide-react";

const API = "http://localhost:8000";

export default function AnalyticsPage() {
    const [summary, setSummary] = useState<any>(null);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [timeSeries, setTimeSeries] = useState<any>(null);
    const [quality, setQuality] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const [sumRes, supRes, tsRes, qRes] = await Promise.all([
                    fetch(`${API}/analytics/summary`),
                    fetch(`${API}/analytics/suppliers`),
                    fetch(`${API}/analytics/time-series`),
                    fetch(`${API}/analytics/data-quality`),
                ]);
                setSummary(await sumRes.json());
                setSuppliers(await supRes.json());
                setTimeSeries(await tsRes.json());
                setQuality(await qRes.json());
            } catch (e) {
                console.error(e);
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
                    <p style={{ color: "var(--text-secondary)" }}>Loading analytics...</p>
                </main>
            </div>
        );
    }

    const delayDist = suppliers.map((s: any) => ({
        name: s.supplier?.length > 10 ? s.supplier.slice(0, 10) + "…" : s.supplier,
        avg_delay: s.avg_delay,
        total_cost: s.total_cost,
        risk_score: s.risk_score ?? 0,
        shipments: s.total_shipments ?? s.rows ?? 0,
    }));

    const costBySupplier = suppliers.map((s: any) => ({
        name: s.supplier?.length > 10 ? s.supplier.slice(0, 10) + "…" : s.supplier,
        value: s.total_cost,
    }));

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div style={{ marginBottom: 32 }}>
                    <h1 style={{ fontFamily: "var(--font-plex)", fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
                        <BarChart3 size={24} style={{ display: "inline", marginRight: 10, verticalAlign: "middle" }} />
                        Deep Analytics
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                        Explore supply chain metrics with interactive charts
                    </p>
                </div>

                {/* Summary Cards */}
                <div
                    style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}
                >
                    <StatCard label="Total Records" value={summary?.total_records?.toLocaleString() ?? "0"} />
                    <StatCard label="Avg Delay" value={`${(summary?.avg_delay_days ?? 0).toFixed(1)}d`} />
                    <StatCard label="Max Delay" value={`${summary?.max_delay_days ?? 0}d`} />
                    <StatCard label="Total Cost" value={`₹${((summary?.total_cost ?? 0) / 1000).toFixed(0)}K`} />
                    <StatCard
                        label="Data Completeness"
                        value={`${quality?.completeness_pct ?? 0}%`}
                    />
                </div>

                {/* Charts Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                    {/* Delay by Supplier */}
                    <div className="card">
                        <div className="chart-title">Average Delay by Supplier</div>
                        <SynBarChart data={delayDist} dataKey="avg_delay" nameKey="name" color="#f59e0b" height={280} />
                    </div>

                    {/* Cost Distribution */}
                    <div className="card">
                        <div className="chart-title">Cost Distribution</div>
                        {costBySupplier.length > 0 ? (
                            <SynPieChart data={costBySupplier} dataKey="value" nameKey="name" height={280} />
                        ) : (
                            <NoData />
                        )}
                    </div>

                    {/* Risk vs Delay Comparison */}
                    <div className="card">
                        <div className="chart-title">Risk Score vs Delay</div>
                        <SynLineChart
                            data={delayDist}
                            lines={[
                                { key: "risk_score", color: "#ef4444", name: "Risk Score" },
                                { key: "avg_delay", color: "#facc15", name: "Avg Delay" },
                            ]}
                            xKey="name"
                            height={280}
                        />
                    </div>

                    {/* Volume by Supplier */}
                    <div className="card">
                        <div className="chart-title">Shipment Volume by Supplier</div>
                        <SynBarChart data={delayDist} dataKey="shipments" nameKey="name" color="#38bdf8" height={280} />
                    </div>
                </div>

                {/* Time Series */}
                {timeSeries && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div className="card">
                            <div className="chart-title">Delay Trend Over Time</div>
                            {timeSeries.delay_trend?.length > 0 ? (
                                <SynAreaChart data={timeSeries.delay_trend} dataKey="avg_delay" xKey="period" color="#f59e0b" height={250} />
                            ) : (
                                <NoData />
                            )}
                        </div>
                        <div className="card">
                            <div className="chart-title">Volume Trend</div>
                            {timeSeries.volume_trend?.length > 0 ? (
                                <SynAreaChart data={timeSeries.volume_trend} dataKey="count" xKey="period" color="#a78bfa" height={250} />
                            ) : (
                                <NoData />
                            )}
                        </div>
                    </div>
                )}

                {/* Data Quality */}
                {quality?.columns && (
                    <div className="card" style={{ marginTop: 24 }}>
                        <div className="chart-title">Data Quality Report</div>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Column</th>
                                    <th>Type</th>
                                    <th>Missing (%)</th>
                                    <th>Unique Values</th>
                                    <th>Quality</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(quality.columns).map(([col, info]: any) => (
                                    <tr key={col}>
                                        <td style={{ fontWeight: 500 }}>{col}</td>
                                        <td style={{ color: "var(--text-muted)" }}>{info.dtype}</td>
                                        <td>
                                            <span style={{ color: info.missing_pct > 10 ? "#ef4444" : info.missing_pct > 0 ? "#f59e0b" : "#22c55e" }}>
                                                {info.missing_pct}%
                                            </span>
                                        </td>
                                        <td>{info.unique_values}</td>
                                        <td>
                                            <div className="risk-bar" style={{ width: 60 }}>
                                                <div
                                                    className="risk-bar-fill"
                                                    style={{
                                                        width: `${100 - info.missing_pct}%`,
                                                        background: info.missing_pct > 10 ? "#ef4444" : "#22c55e",
                                                    }}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: any }) {
    return (
        <div className="card">
            <div className="kpi-label">{label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6, fontFamily: "var(--font-plex)" }}>{value}</div>
        </div>
    );
}

function NoData() {
    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "var(--text-muted)", fontSize: 13 }}>
            Upload data to see analytics
        </div>
    );
}
