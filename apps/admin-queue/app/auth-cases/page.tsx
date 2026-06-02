"use client";

import { useState } from "react";
import useSWR from "swr";
import { apiGet, apiPost } from "../../lib/api";

type AuthCase = {
  id: string;
  assetId: string;
  status: string;
  aiScore: number;
  reviewerId?: string;
};

const fetcher = (path: string) => apiGet<AuthCase[]>(path);

export default function AuthCasesPage() {
  const { data, mutate, isLoading } = useSWR<AuthCase[]>("/api/auth-cases", fetcher, {
    refreshInterval: 4000
  });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function approve(caseId: string, assetId: string) {
    setBusy(caseId);
    setMessage("");
    try {
      const result = await apiPost<{
        authCase: { id: string };
        coa: { id: string; coaNumber: string };
      }>(`/api/auth-cases/${caseId}/finalize`, {
        reviewerId: "admin-reviewer-1",
        decisionReason: "Approved after evidence review",
        assetId
      });
      setMessage(
        `Finalized case ${result.authCase.id} → issued COA ${result.coa.coaNumber}`
      );
      await mutate();
    } catch (err) {
      setMessage(`Error: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 920, margin: "0 auto" }}>
      <h1>Authentication Cases</h1>
      {message && (
        <p
          style={{
            padding: 12,
            background: "#eef9f1",
            border: "1px solid #b7e3c4",
            borderRadius: 8
          }}
        >
          {message}
        </p>
      )}
      {isLoading && <p>Loading…</p>}
      <ul style={{ padding: 0, listStyle: "none" }}>
        {(data || []).map((item) => (
          <li
            key={item.id}
            style={{
              padding: 12,
              border: "1px solid #e4e7ec",
              background: "white",
              borderRadius: 8,
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>{item.id}</div>
              <div style={{ color: "#475467", fontSize: 13 }}>
                asset {item.assetId} · status <strong>{item.status}</strong> · ai{" "}
                {Number(item.aiScore).toFixed(2)}
              </div>
            </div>
            {item.status === "pending" && (
              <button
                onClick={() => approve(item.id, item.assetId)}
                disabled={busy === item.id}
                style={{
                  padding: "8px 14px",
                  background: "#0a8043",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer"
                }}
              >
                {busy === item.id ? "Working…" : "Approve + Issue COA"}
              </button>
            )}
          </li>
        ))}
        {!isLoading && (data || []).length === 0 && (
          <li style={{ color: "#475467" }}>No cases yet.</li>
        )}
      </ul>
    </main>
  );
}
