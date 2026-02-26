"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import { Network, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

const API = "http://localhost:8000";

const NODE_COLORS: Record<string, string> = {
    supplier: "#facc15",
    sku: "#38bdf8",
    warehouse: "#34d399",
    region: "#a78bfa",
    unknown: "#64748b",
};

export default function GraphPage() {
    const [graphData, setGraphData] = useState<any>(null);
    const [graphSummary, setGraphSummary] = useState<any>(null);
    const [centrality, setCentrality] = useState<any>(null);
    const [criticalPaths, setCriticalPaths] = useState<any[]>([]);
    const [cascadeResult, setCascadeResult] = useState<any>(null);
    const [cascadeInput, setCascadeInput] = useState("");
    const [loading, setLoading] = useState(true);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        async function load() {
            try {
                const [gRes, gsRes, cRes, cpRes] = await Promise.all([
                    fetch(`${API}/graph/visualization`),
                    fetch(`${API}/graph/summary`),
                    fetch(`${API}/graph/centrality`),
                    fetch(`${API}/graph/critical-paths`),
                ]);
                setGraphData(await gRes.json());
                setGraphSummary(await gsRes.json());
                setCentrality(await cRes.json());
                setCriticalPaths(await cpRes.json());
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    // Draw graph on canvas
    useEffect(() => {
        if (!graphData || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const { nodes, edges } = graphData;
        if (!nodes?.length) return;

        const width = rect.width;
        const height = rect.height;

        // Calculate positions using force-directed-like layout
        const positions: Record<string, { x: number; y: number }> = {};
        const typeGroups: Record<string, string[]> = {};

        nodes.forEach((n: any) => {
            const t = n.type || "unknown";
            if (!typeGroups[t]) typeGroups[t] = [];
            typeGroups[t].push(n.id);
        });

        const typeOrder = ["supplier", "warehouse", "sku", "region"];
        let yLevel = 0;
        typeOrder.forEach((type) => {
            const group = typeGroups[type] || [];
            group.forEach((id, i) => {
                const xSpacing = width / (group.length + 1);
                positions[id] = {
                    x: xSpacing * (i + 1),
                    y: 60 + yLevel * (height / 5) + Math.random() * 30,
                };
            });
            yLevel++;
        });

        // Assign remaining
        Object.keys(typeGroups).forEach((type) => {
            if (!typeOrder.includes(type)) {
                typeGroups[type].forEach((id, i) => {
                    positions[id] = {
                        x: 50 + Math.random() * (width - 100),
                        y: 50 + Math.random() * (height - 100),
                    };
                });
            }
        });

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Draw edges
        ctx.strokeStyle = "rgba(148, 163, 184, 0.1)";
        ctx.lineWidth = 1;
        edges.forEach((e: any) => {
            const from = positions[e.source];
            const to = positions[e.target];
            if (from && to) {
                ctx.beginPath();
                ctx.moveTo(from.x, from.y);
                ctx.lineTo(to.x, to.y);
                ctx.stroke();
            }
        });

        // Draw nodes
        nodes.forEach((n: any) => {
            const pos = positions[n.id];
            if (!pos) return;

            const color = NODE_COLORS[n.type] || NODE_COLORS.unknown;
            const radius = 6 + Math.min((n.shipments || n.volume || n.throughput || n.activity || 1), 20);

            // Glow
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius + 4, 0, Math.PI * 2);
            ctx.fillStyle = color.replace(")", ", 0.15)").replace("rgb", "rgba").replace("#", "");
            const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius + 8);
            gradient.addColorStop(0, color + "30");
            gradient.addColorStop(1, "transparent");
            ctx.fillStyle = gradient;
            ctx.fill();

            // Node circle
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();

            // Label
            ctx.fillStyle = "#94a3b8";
            ctx.font = "10px monospace";
            ctx.textAlign = "center";
            ctx.fillText(n.name || "", pos.x, pos.y + radius + 14);
        });

        // Legend
        const legendY = height - 30;
        Object.entries(NODE_COLORS).forEach(([type, color], i) => {
            if (type === "unknown") return;
            const x = 20 + i * 100;
            ctx.beginPath();
            ctx.arc(x, legendY, 5, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.fillStyle = "#94a3b8";
            ctx.font = "10px monospace";
            ctx.textAlign = "left";
            ctx.fillText(type, x + 10, legendY + 4);
        });
    }, [graphData]);

    const runCascade = async () => {
        if (!cascadeInput) return;
        try {
            const res = await fetch(`${API}/graph/cascade/${encodeURIComponent(cascadeInput)}`);
            setCascadeResult(await res.json());
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) {
        return (
            <div className="app-layout">
                <Sidebar />
                <main className="main-content" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <p style={{ color: "var(--text-secondary)" }}>Building supply chain network...</p>
                </main>
            </div>
        );
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div style={{ marginBottom: 24 }}>
                    <h1 style={{ fontFamily: "var(--font-plex)", fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
                        <Network size={24} style={{ display: "inline", marginRight: 10, verticalAlign: "middle" }} />
                        Graph Intelligence
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                        Supply chain network analysis with centrality scoring and cascade simulation
                    </p>
                </div>

                {/* Graph Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
                    <div className="card" style={{ padding: 16 }}>
                        <div className="kpi-label">Nodes</div>
                        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{graphSummary?.total_nodes ?? 0}</div>
                    </div>
                    <div className="card" style={{ padding: 16 }}>
                        <div className="kpi-label">Edges</div>
                        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{graphSummary?.total_edges ?? 0}</div>
                    </div>
                    <div className="card" style={{ padding: 16 }}>
                        <div className="kpi-label">Density</div>
                        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{graphSummary?.density ?? 0}</div>
                    </div>
                    <div className="card" style={{ padding: 16 }}>
                        <div className="kpi-label">Components</div>
                        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{graphSummary?.components ?? 0}</div>
                    </div>
                </div>

                {/* Network Visualization */}
                <div className="card" style={{ marginBottom: 20, padding: 0, overflow: "hidden" }}>
                    <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border-subtle)" }}>
                        <span className="chart-title" style={{ margin: 0 }}>Supply Chain Network</span>
                    </div>
                    <canvas
                        ref={canvasRef}
                        style={{ width: "100%", height: 400, display: "block" }}
                    />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                    {/* Centrality Rankings */}
                    <div className="card">
                        <div className="chart-title">PageRank (Influence)</div>
                        {centrality?.pagerank?.length > 0 ? (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Node</th>
                                        <th>Type</th>
                                        <th>Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {centrality.pagerank.slice(0, 8).map((n: any, i: number) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 500 }}>{n.name}</td>
                                            <td>
                                                <span style={{ color: NODE_COLORS[n.type], fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>
                                                    {n.type}
                                                </span>
                                            </td>
                                            <td>{n.pagerank_score}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No data</p>
                        )}
                    </div>

                    {/* Critical Bottlenecks */}
                    <div className="card">
                        <div className="chart-title">Critical Bottlenecks</div>
                        {criticalPaths.length > 0 ? (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Node</th>
                                        <th>Betweenness</th>
                                        <th>Risk</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {criticalPaths.map((n: any, i: number) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 500 }}>{n.name}</td>
                                            <td>{n.betweenness_score}</td>
                                            <td>
                                                <span className={`risk-badge risk-${n.bottleneck_risk === "high" ? "critical" : n.bottleneck_risk === "medium" ? "elevated" : "stable"}`}>
                                                    {n.bottleneck_risk}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No data</p>
                        )}
                    </div>
                </div>

                {/* Cascade Simulation */}
                <div className="card">
                    <div className="chart-title">Cascade Failure Simulation</div>
                    <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
                        Simulate what happens when a node fails. Enter a supplier, warehouse, or region name.
                    </p>
                    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                        <input
                            className="chat-input"
                            placeholder='e.g. "Supplier A" or "Central Warehouse"'
                            value={cascadeInput}
                            onChange={(e) => setCascadeInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && runCascade()}
                        />
                        <button className="chat-send-btn" onClick={runCascade}>
                            Simulate
                        </button>
                    </div>

                    {cascadeResult && !cascadeResult.error && (
                        <div style={{ padding: 16, background: "rgba(255,255,255,0.02)", borderRadius: 12, border: "1px solid var(--border-subtle)" }}>
                            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
                                {cascadeResult.failed_node?.name} Failure Impact
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 12 }}>
                                <div>
                                    <div className="kpi-label">Direct Dependencies</div>
                                    <div style={{ fontSize: 24, fontWeight: 700, color: "#f59e0b" }}>{cascadeResult.direct_dependencies}</div>
                                </div>
                                <div>
                                    <div className="kpi-label">Total Affected</div>
                                    <div style={{ fontSize: 24, fontWeight: 700, color: "#ef4444" }}>{cascadeResult.total_affected}</div>
                                </div>
                                <div>
                                    <div className="kpi-label">Risk Level</div>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: cascadeResult.risk_assessment === "catastrophic" ? "#ef4444" : "#f59e0b", marginTop: 6 }}>
                                        {cascadeResult.risk_assessment?.toUpperCase()}
                                    </div>
                                </div>
                            </div>

                            {cascadeResult.affected_nodes?.length > 0 && (
                                <div style={{ fontSize: 12 }}>
                                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Affected nodes:</div>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                        {cascadeResult.affected_nodes.slice(0, 12).map((n: any, i: number) => (
                                            <span
                                                key={i}
                                                style={{
                                                    background: n.impact_level === "direct" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
                                                    border: `1px solid ${n.impact_level === "direct" ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)"}`,
                                                    borderRadius: 6,
                                                    padding: "2px 8px",
                                                    fontSize: 11,
                                                }}
                                            >
                                                {n.name} ({n.type})
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {cascadeResult?.error && (
                        <div style={{ color: "#ef4444", fontSize: 13 }}>{cascadeResult.error}</div>
                    )}
                </div>
            </main>
        </div>
    );
}
