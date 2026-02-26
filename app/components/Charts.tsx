"use client";
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

const COLORS = ["#facc15", "#38bdf8", "#a78bfa", "#34d399", "#fb923c", "#f472b6"];

const tooltipStyle = {
    backgroundColor: "rgba(10, 15, 26, 0.95)",
    border: "1px solid rgba(148, 163, 184, 0.15)",
    borderRadius: "10px",
    color: "#f1f5f9",
    fontSize: "12px",
};

type ChartDatum = Record<string, any>;

/* ============================
   BAR CHART
   ============================ */
export function SynBarChart({
    data,
    dataKey,
    nameKey = "name",
    color = "#facc15",
    height = 300,
}: {
    data: ChartDatum[];
    dataKey: string;
    nameKey?: string;
    color?: string;
    height?: number;
}) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                    dataKey={nameKey}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}

/* ============================
   LINE CHART
   ============================ */
export function SynLineChart({
    data,
    lines,
    xKey = "name",
    height = 300,
}: {
    data: ChartDatum[];
    lines: { key: string; color?: string; name?: string }[];
    xKey?: string;
    height?: number;
}) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                    dataKey={xKey}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
                {lines.map((line, i) => (
                    <Line
                        key={line.key}
                        type="monotone"
                        dataKey={line.key}
                        stroke={line.color || COLORS[i % COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3, fill: line.color || COLORS[i % COLORS.length] }}
                        name={line.name || line.key}
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
}

/* ============================
   AREA CHART
   ============================ */
export function SynAreaChart({
    data,
    dataKey,
    xKey = "name",
    color = "#facc15",
    height = 300,
}: {
    data: ChartDatum[];
    dataKey: string;
    xKey?: string;
    color?: string;
    height?: number;
}) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <defs>
                    <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey={xKey} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                    type="monotone"
                    dataKey={dataKey}
                    stroke={color}
                    fill={`url(#grad-${dataKey})`}
                    strokeWidth={2}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}

/* ============================
   PIE CHART
   ============================ */
export function SynPieChart({
    data,
    dataKey,
    nameKey = "name",
    height = 300,
}: {
    data: ChartDatum[];
    dataKey: string;
    nameKey?: string;
    height?: number;
}) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <PieChart>
                <Pie
                    data={data}
                    dataKey={dataKey}
                    nameKey={nameKey}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={55}
                    paddingAngle={3}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: "#64748b" }}
                >
                    {data.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
        </ResponsiveContainer>
    );
}
