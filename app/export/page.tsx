"use client";

import { useState } from "react";
import Sidebar from "../components/Sidebar";
import { Download, FileSpreadsheet, FileJson, Table, CheckCircle2 } from "lucide-react";

const API = "http://localhost:8000";

export default function ExportPage() {
    const [downloading, setDownloading] = useState<string | null>(null);
    const [schema, setSchema] = useState<any>(null);

    const downloadFile = async (type: "csv" | "json") => {
        setDownloading(type);
        try {
            const res = await fetch(`${API}/export/${type}`);
            if (!res.ok) throw new Error("No data");

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = type === "csv" ? "synchain_tableau.csv" : "synchain_powerbi.json";
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            alert("No data to export. Upload data first.");
        } finally {
            setDownloading(null);
        }
    };

    const loadSchema = async () => {
        const res = await fetch(`${API}/export/tableau-schema`);
        setSchema(await res.json());
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div style={{ marginBottom: 32 }}>
                    <h1 style={{ fontFamily: "var(--font-plex)", fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
                        <Download size={24} style={{ display: "inline", marginRight: 10, verticalAlign: "middle" }} />
                        Export Hub
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                        Export enriched data with risk scores for Tableau, Power BI, and other BI tools
                    </p>
                </div>

                {/* Export Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, marginBottom: 32 }}>
                    {/* Tableau CSV */}
                    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 12,
                                    background: "rgba(56, 189, 248, 0.1)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <FileSpreadsheet size={22} color="#38bdf8" />
                            </div>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 16 }}>Tableau Export</div>
                                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>CSV with risk scores & enriched columns</div>
                            </div>
                        </div>
                        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                            Export your entire supply chain dataset as a CSV file enriched with computed risk scores and
                            tier classifications. Import directly into Tableau as a data source.
                        </div>
                        <ul style={{ fontSize: 12, color: "var(--text-secondary)", paddingLeft: 16 }}>
                            <li>All original columns preserved</li>
                            <li>Computed risk_score (0–100) column added</li>
                            <li>Risk tier classification (critical/elevated/stable)</li>
                            <li>Ready for Tableau Data Source import</li>
                        </ul>
                        <button
                            onClick={() => downloadFile("csv")}
                            disabled={downloading === "csv"}
                            style={{
                                marginTop: "auto",
                                background: "#38bdf8",
                                color: "#000",
                                border: "none",
                                borderRadius: 10,
                                padding: "12px 20px",
                                fontWeight: 600,
                                cursor: "pointer",
                                fontSize: 13,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                opacity: downloading === "csv" ? 0.6 : 1,
                            }}
                        >
                            {downloading === "csv" ? "Downloading..." : "Download CSV for Tableau"}
                            <Download size={14} />
                        </button>
                    </div>

                    {/* Power BI JSON */}
                    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 12,
                                    background: "rgba(250, 204, 21, 0.1)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <FileJson size={22} color="#facc15" />
                            </div>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 16 }}>Power BI Export</div>
                                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>JSON with analytics & risk data</div>
                            </div>
                        </div>
                        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                            Export a comprehensive JSON file containing the full analysis results, supplier risk scores,
                            anomaly data, and raw records. Use with Power BI&apos;s JSON data connector.
                        </div>
                        <ul style={{ fontSize: 12, color: "var(--text-secondary)", paddingLeft: 16 }}>
                            <li>Full summary statistics</li>
                            <li>Supplier risk scores with factor breakdown</li>
                            <li>Detected anomalies (top 100)</li>
                            <li>Raw data records</li>
                            <li>Compatible with Power BI JSON connector</li>
                        </ul>
                        <button
                            onClick={() => downloadFile("json")}
                            disabled={downloading === "json"}
                            style={{
                                marginTop: "auto",
                                background: "#facc15",
                                color: "#000",
                                border: "none",
                                borderRadius: 10,
                                padding: "12px 20px",
                                fontWeight: 600,
                                cursor: "pointer",
                                fontSize: 13,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                opacity: downloading === "json" ? 0.6 : 1,
                            }}
                        >
                            {downloading === "json" ? "Downloading..." : "Download JSON for Power BI"}
                            <Download size={14} />
                        </button>
                    </div>
                </div>

                {/* Schema Info */}
                <div className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <div className="chart-title" style={{ margin: 0 }}>Data Schema Reference</div>
                        <button
                            onClick={loadSchema}
                            style={{
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid var(--border-medium)",
                                borderRadius: 8,
                                padding: "6px 14px",
                                color: "var(--text-secondary)",
                                cursor: "pointer",
                                fontSize: 12,
                            }}
                        >
                            <Table size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
                            Load Schema
                        </button>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
                        Review the export schema to configure your BI tool connections correctly.
                    </p>
                    {schema && (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Column</th>
                                    <th>Type</th>
                                    <th>Role</th>
                                </tr>
                            </thead>
                            <tbody>
                                {schema.columns.map((col: any) => (
                                    <tr key={col.name}>
                                        <td style={{ fontWeight: 500 }}>{col.name}</td>
                                        <td style={{ color: "var(--text-muted)" }}>{col.type}</td>
                                        <td>
                                            <span
                                                style={{
                                                    padding: "2px 8px",
                                                    borderRadius: 6,
                                                    fontSize: 11,
                                                    background: col.role === "measure" ? "rgba(250,204,21,0.1)" : "rgba(56,189,248,0.1)",
                                                    color: col.role === "measure" ? "#facc15" : "#38bdf8",
                                                }}
                                            >
                                                {col.role}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>
        </div>
    );
}
