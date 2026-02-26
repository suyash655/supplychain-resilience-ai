"use client";
import Link from "next/link";
import {
  ShieldAlert,
  BarChart3,
  Network,
  Bot,
  ArrowRight,
  Zap,
  Brain,
  Globe,
} from "lucide-react";

const FEATURES = [
  {
    icon: ShieldAlert,
    title: "ML Risk Scoring",
    desc: "6-factor composite scoring (0–100) with Isolation Forest anomaly detection",
  },
  {
    icon: BarChart3,
    title: "Time-Series Forecasting",
    desc: "Exponential smoothing, trend analysis, and delay prediction",
  },
  {
    icon: Network,
    title: "Graph Intelligence",
    desc: "Supply chain network modeling with PageRank centrality and cascade simulation",
  },
  {
    icon: Bot,
    title: "AI Co-Pilot",
    desc: 'Ask "Why is Supplier A risky?" — get real-time AI-powered answers',
  },
  {
    icon: Brain,
    title: "Explainable AI",
    desc: "Feature importance, counterfactual explanations, and causal reasoning",
  },
  {
    icon: Globe,
    title: "Tableau & Power BI",
    desc: "Export enriched data to your BI tools with risk scores included",
  },
];

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(to bottom, #030712, #0a0f1a, #030712)",
      }}
    >
      {/* Glow */}
      <div className="hero-glow" />

      {/* Nav */}
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 40px",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: 32,
              height: 32,
              background: "linear-gradient(135deg, #facc15, #f59e0b)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 14,
              color: "#000",
            }}
          >
            S
          </div>
          <span style={{ fontWeight: 700, fontSize: 16 }}>SynChain 2.0</span>
        </div>
        <div style={{ display: "flex", gap: "16px" }}>
          <Link href="/upload">
            <button
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                padding: "8px 20px",
                color: "#f1f5f9",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Upload Data
            </button>
          </Link>
          <Link href="/dashboard">
            <button
              style={{
                background: "#facc15",
                border: "none",
                borderRadius: 10,
                padding: "8px 20px",
                color: "#000",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Open Dashboard
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "100px 24px 60px",
        }}
      >
        <div
          className="animate-fade-in"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(250,204,21,0.08)",
            border: "1px solid rgba(250,204,21,0.15)",
            borderRadius: 20,
            padding: "6px 16px",
            fontSize: 12,
            color: "#facc15",
            marginBottom: 24,
          }}
        >
          <Zap size={14} />
          Enterprise AI Supply Chain Intelligence
        </div>

        <h1
          className="animate-fade-in delay-1"
          style={{
            fontFamily: "var(--font-plex)",
            fontSize: "clamp(36px, 5vw, 64px)",
            fontWeight: 700,
            lineHeight: 1.1,
            maxWidth: 800,
          }}
        >
          Predict Supply Chain
          <br />
          Disruptions{" "}
          <span style={{ color: "#facc15" }}>Before They Cost You</span>
        </h1>

        <p
          className="animate-fade-in delay-2"
          style={{
            marginTop: 20,
            fontSize: 17,
            color: "var(--text-secondary)",
            maxWidth: 600,
            lineHeight: 1.6,
          }}
        >
          SynChain 2.0 analyzes your CSV/Excel data with advanced ML, graph
          intelligence, and AI reasoning to detect risk, forecast delays, and
          simulate disruptions — all in real-time.
        </p>

        <div
          className="animate-fade-in delay-3"
          style={{ marginTop: 36, display: "flex", gap: 12 }}
        >
          <Link href="/upload">
            <button
              style={{
                background: "#facc15",
                border: "none",
                borderRadius: 12,
                padding: "14px 28px",
                fontWeight: 600,
                fontSize: 14,
                color: "#000",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              Upload Data <ArrowRight size={16} />
            </button>
          </Link>
          <Link href="/dashboard">
            <button
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                padding: "14px 28px",
                color: "#f1f5f9",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              View Demo Dashboard
            </button>
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "40px 24px 80px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 20,
        }}
      >
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className={`card animate-fade-in delay-${i + 1}`}
            style={{ display: "flex", gap: 14, alignItems: "flex-start" }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "rgba(250,204,21,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <f.icon size={18} color="#facc15" />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                {f.title}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {f.desc}
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer
        style={{
          textAlign: "center",
          padding: "30px",
          borderTop: "1px solid var(--border-subtle)",
          fontSize: 12,
          color: "var(--text-muted)",
        }}
      >
        SynChain 2.0 — The Palantir for SMEs · AI-Powered Supply Chain Intelligence
      </footer>
    </main>
  );
}
