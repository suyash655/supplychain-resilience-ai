"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function MapColumnsPage() {
  const router = useRouter();

  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState({
    supplier: "",
    sku: "",
    delay_days: "",
    cost: "",
  });

  // 🔹 Fetch CSV headers from backend
  useEffect(() => {
    fetch("http://localhost:8000/upload/columns")
      .then((res) => res.json())
      .then((data) => setColumns(data.columns));
  }, []);

  const handleSubmit = async () => {
    if (Object.values(mapping).some((v) => !v)) {
      alert("Please map all fields");
      return;
    }

    await fetch("http://localhost:8000/upload/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mapping),
    });

    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0e1116] text-white">
      <div className="w-full max-w-lg border border-white/15 rounded-xl p-8">
        <h1 className="text-2xl font-semibold mb-6">
          Map Your CSV Columns
        </h1>

        {["supplier", "sku", "delay_days", "cost"].map((field) => (
          <div key={field} className="mb-4">
            <label className="block mb-2 text-sm opacity-70">
              {field.toUpperCase()}
            </label>
            <select
              className="w-full bg-black border border-white/20 p-2 rounded"
              onChange={(e) =>
                setMapping({ ...mapping, [field]: e.target.value })
              }
            >
              <option value="">Select column</option>
              {columns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
        ))}

        <button
          onClick={handleSubmit}
          className="mt-6 w-full bg-[var(--accent)] text-black py-3 rounded font-semibold"
        >
          Confirm & Analyze
        </button>
      </div>
    </main>
  );
}
