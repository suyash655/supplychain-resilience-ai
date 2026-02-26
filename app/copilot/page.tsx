"use client";

import { useState, useRef, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { Bot, Send, Sparkles, Lightbulb, AlertTriangle } from "lucide-react";

const API = "http://localhost:8000";

type Message = {
    role: "user" | "ai";
    content: string;
    data?: any;
};

const QUICK_PROMPTS = [
    "What is the overall risk status?",
    "Why is the top supplier risky?",
    "What if the top supplier fails?",
    "What if port congestion increases 30%?",
    "Suggest alternative suppliers",
    "What is the financial impact of delays?",
];

export default function CopilotPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<"ask" | "whatif">("ask");
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Load initial executive summary
        fetch(`${API}/copilot/summary`)
            .then((r) => r.json())
            .then((data) => {
                if (data.narrative) {
                    setMessages([
                        {
                            role: "ai",
                            content: `**Executive Summary**\n\n${data.narrative}\n\n**Risk Level: ${data.overall_risk_level}**`,
                            data: data,
                        },
                    ]);
                }
            })
            .catch(() => { });
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = async (text?: string) => {
        const msg = text || input;
        if (!msg.trim()) return;

        setMessages((prev) => [...prev, { role: "user", content: msg }]);
        setInput("");
        setLoading(true);

        try {
            const endpoint = mode === "whatif" ? "/copilot/what-if" : "/copilot/ask";
            const body = mode === "whatif" ? { scenario: msg } : { question: msg };

            const res = await fetch(`${API}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();

            // Format response
            let content = "";
            if (data.answer) {
                content = data.answer;
            } else if (data.narrative) {
                content = data.narrative;
            } else if (data.ripple_effects) {
                content = `**Scenario:** ${data.scenario}\n**Severity:** ${data.severity || "N/A"}\n\n`;
                content += data.ripple_effects.join("\n\n");
                if (data.mitigation_suggestions) {
                    content += "\n\n**Mitigation:**\n" + data.mitigation_suggestions.map((s: string) => `- ${s}`).join("\n");
                }
                if (data.financial_impact) {
                    content += `\n\n**Financial Impact:**\n- Cost at risk: ₹${data.financial_impact.direct_cost_at_risk?.toLocaleString() || "N/A"}`;
                }
            } else {
                content = JSON.stringify(data, null, 2);
            }

            setMessages((prev) => [...prev, { role: "ai", content, data }]);
        } catch (e) {
            setMessages((prev) => [
                ...prev,
                { role: "ai", content: "⚠️ Failed to process your request. Make sure the backend is running." },
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content" style={{ display: "flex", flexDirection: "column" }}>
                {/* Header */}
                <div style={{ marginBottom: 16 }}>
                    <h1 style={{ fontFamily: "var(--font-plex)", fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
                        <Bot size={24} style={{ display: "inline", marginRight: 10, verticalAlign: "middle" }} />
                        AI Co-Pilot
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                        Ask questions, run what-if simulations, and get AI-powered supply chain intelligence
                    </p>
                </div>

                {/* Mode Toggle */}
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    <button
                        onClick={() => setMode("ask")}
                        style={{
                            padding: "6px 16px",
                            borderRadius: 8,
                            border: "1px solid var(--border-medium)",
                            background: mode === "ask" ? "var(--accent-soft)" : "transparent",
                            color: mode === "ask" ? "#facc15" : "var(--text-secondary)",
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                        }}
                    >
                        <Lightbulb size={14} /> Ask Questions
                    </button>
                    <button
                        onClick={() => setMode("whatif")}
                        style={{
                            padding: "6px 16px",
                            borderRadius: 8,
                            border: "1px solid var(--border-medium)",
                            background: mode === "whatif" ? "rgba(239,68,68,0.08)" : "transparent",
                            color: mode === "whatif" ? "#ef4444" : "var(--text-secondary)",
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                        }}
                    >
                        <AlertTriangle size={14} /> What-If Simulation
                    </button>
                </div>

                {/* Quick Prompts */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                    {QUICK_PROMPTS.map((p) => (
                        <button
                            key={p}
                            onClick={() => sendMessage(p)}
                            style={{
                                padding: "4px 12px",
                                borderRadius: 8,
                                border: "1px solid var(--border-subtle)",
                                background: "transparent",
                                color: "var(--text-secondary)",
                                cursor: "pointer",
                                fontSize: 11,
                                transition: "all 0.2s",
                            }}
                            onMouseOver={(e) => {
                                (e.target as HTMLElement).style.borderColor = "var(--accent)";
                                (e.target as HTMLElement).style.color = "var(--accent)";
                            }}
                            onMouseOut={(e) => {
                                (e.target as HTMLElement).style.borderColor = "var(--border-subtle)";
                                (e.target as HTMLElement).style.color = "var(--text-secondary)";
                            }}
                        >
                            {p}
                        </button>
                    ))}
                </div>

                {/* Chat Messages */}
                <div className="chat-messages" style={{ flex: 1 }}>
                    {messages.length === 0 && (
                        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
                            <Sparkles size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
                            <p style={{ fontSize: 14 }}>Ask me anything about your supply chain</p>
                            <p style={{ fontSize: 12, marginTop: 4 }}>
                                Try: &quot;Why is Supplier A risky?&quot; or &quot;What if lead times increase 20%?&quot;
                            </p>
                        </div>
                    )}
                    {messages.map((msg, i) => (
                        <div key={i} className={`chat-message ${msg.role}`}>
                            <div
                                dangerouslySetInnerHTML={{
                                    __html: formatMarkdown(msg.content),
                                }}
                            />
                        </div>
                    ))}
                    {loading && (
                        <div className="chat-message ai" style={{ opacity: 0.5 }}>
                            <Sparkles size={14} style={{ animation: "pulse-glow 1.5s infinite" }} /> Analyzing...
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Input Bar */}
                <div className="chat-input-bar">
                    <input
                        className="chat-input"
                        placeholder={
                            mode === "whatif"
                                ? 'Describe a scenario... e.g. "What if Supplier A fails?"'
                                : 'Ask a question... e.g. "Why is Supplier B risky?"'
                        }
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !loading && sendMessage()}
                        disabled={loading}
                    />
                    <button
                        className="chat-send-btn"
                        onClick={() => sendMessage()}
                        disabled={loading || !input.trim()}
                    >
                        <Send size={16} />
                    </button>
                </div>
            </main>
        </div>
    );
}

function formatMarkdown(text: string): string {
    return text
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br/>")
        .replace(/- (.*?)(?:<br\/>|$)/g, "• $1<br/>");
}
