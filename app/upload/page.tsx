"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

const API = "http://localhost:8000";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);
  const router = useRouter();

  const handleFile = async (f: File) => {
    setFile(f);
    setResult(null);

    // Auto-preview
    const formData = new FormData();
    formData.append("file", f);
    try {
      const res = await fetch(`${API}/upload/preview`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setPreview(data);
      }
    } catch {
      // Preview is optional
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setProgress(10);

    const formData = new FormData();
    formData.append("file", file);

    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 8, 85));
    }, 200);

    try {
      const res = await fetch(`${API}/upload`, {
        method: "POST",
        body: formData,
      });
      clearInterval(interval);
      setProgress(100);

      const data = await res.json();
      setResult(data);

      if (data.status === "success") {
        setTimeout(() => router.push("/dashboard"), 1500);
      }
    } catch (err) {
      clearInterval(interval);
      setResult({ status: "error", message: "Upload failed. Check backend." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 700 }}>
          {/* Header */}
          <h1
            style={{
              fontFamily: "var(--font-plex)",
              fontSize: 28,
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            Upload Supply Chain Data
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 32 }}>
            Upload CSV or Excel (.xlsx) files. Columns will be auto-detected and mapped.
          </p>

          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className="card"
            style={{
              padding: 40,
              textAlign: "center",
              borderStyle: "dashed",
              borderWidth: 2,
              borderColor: dragOver ? "var(--accent)" : "var(--border-medium)",
              background: dragOver ? "var(--accent-soft)" : "var(--bg-card)",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: "rgba(250,204,21,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              {file ? (
                <FileSpreadsheet size={24} color="#facc15" />
              ) : (
                <Upload size={24} color="#facc15" />
              )}
            </div>

            {file ? (
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{file.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                  {(file.size / 1024).toFixed(1)} KB · Ready to upload
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>
                  Drag & drop your CSV or Excel file here
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                  Supports .csv, .xlsx, .xls — up to 1M+ rows
                </div>
              </div>
            )}
          </div>

          {/* Column Preview */}
          {preview && (
            <div className="card" style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>
                🔍 Auto-Detected Columns
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {Object.entries(preview.auto_mapping).map(([target, source]: any) => (
                  <span
                    key={target}
                    style={{
                      background: "rgba(250,204,21,0.08)",
                      border: "1px solid rgba(250,204,21,0.15)",
                      borderRadius: 8,
                      padding: "4px 10px",
                      fontSize: 11,
                      color: "#facc15",
                    }}
                  >
                    {source} → {target}
                  </span>
                ))}
              </div>
              {preview.preview_rows?.length > 0 && (
                <div style={{ marginTop: 12, overflowX: "auto" }}>
                  <table className="data-table" style={{ fontSize: 11 }}>
                    <thead>
                      <tr>
                        {preview.columns.slice(0, 6).map((c: string) => (
                          <th key={c} style={{ padding: "6px 10px" }}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.preview_rows.slice(0, 3).map((row: any, i: number) => (
                        <tr key={i}>
                          {preview.columns.slice(0, 6).map((c: string) => (
                            <td key={c} style={{ padding: "6px 10px" }}>{String(row[c] ?? "")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Progress Bar */}
          {loading && (
            <div style={{ marginTop: 16 }}>
              <div className="risk-bar" style={{ height: 8 }}>
                <div
                  className="risk-bar-fill"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, #facc15, #f59e0b)",
                  }}
                />
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                Processing & analyzing data... {progress}%
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div
              className="card"
              style={{
                marginTop: 16,
                borderColor:
                  result.status === "success"
                    ? "rgba(34,197,94,0.3)"
                    : "rgba(239,68,68,0.3)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {result.status === "success" ? (
                  <CheckCircle2 size={20} color="#22c55e" />
                ) : (
                  <AlertCircle size={20} color="#ef4444" />
                )}
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {result.status === "success"
                      ? `${result.rows_inserted} rows imported successfully`
                      : "Upload failed"}
                  </div>
                  {result.rows_rejected > 0 && (
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {result.rows_rejected} rows skipped (invalid data)
                    </div>
                  )}
                </div>
              </div>
              {result.status === "success" && (
                <div style={{ fontSize: 12, color: "#22c55e", marginTop: 8 }}>
                  Redirecting to dashboard...
                </div>
              )}
            </div>
          )}

          {/* Upload Button */}
          {file && !loading && !result && (
            <button
              onClick={handleUpload}
              style={{
                marginTop: 20,
                width: "100%",
                background: "#facc15",
                color: "#000",
                border: "none",
                borderRadius: 12,
                padding: "14px",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              Upload & Analyze <ArrowRight size={16} />
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
