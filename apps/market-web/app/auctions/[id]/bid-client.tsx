"use client";

import { useState } from "react";

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

export default function BidClient({
  auctionId,
  minNext,
  status
}: {
  auctionId: string;
  minNext: number;
  status: string;
}) {
  const [message, setMessage] = useState("");

  if (!["scheduled", "live"].includes(status)) {
    return (
      <div style={{ marginTop: 24, color: "#7d83a3" }}>
        Bidding is closed (status: {status}).
      </div>
    );
  }

  async function placeBid(formData: FormData) {
    setMessage("");
    const token = getCookie("cx_access");
    if (!token) {
      setMessage("Sign in via the Vault first to bid.");
      return;
    }
    const amount = Number(formData.get("amount") || 0);
    if (!amount) return;
    try {
      const res = await fetch(`${GATEWAY}/api/auctions/${auctionId}/bids`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount })
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Bid failed: ${res.status} ${text}`);
      }
      const bid = await res.json();
      setMessage(`Bid placed: $${bid.amount} — refresh to see it in the history.`);
    } catch (err) {
      setMessage(`Error: ${(err as Error).message}`);
    }
  }

  return (
    <form
      action={placeBid}
      style={{
        marginTop: 24,
        padding: 16,
        background: "#11141f",
        border: "1px solid #1f2433",
        borderRadius: 12,
        display: "grid",
        gap: 12,
        maxWidth: 360
      }}
    >
      <h3 style={{ margin: 0 }}>Place a bid</h3>
      <input
        name="amount"
        type="number"
        min={minNext}
        defaultValue={minNext}
        required
        style={{
          background: "#0a0c14",
          color: "#f0f2fa",
          border: "1px solid #2b3148",
          padding: "10px 12px",
          borderRadius: 8
        }}
      />
      <div style={{ color: "#7d83a3", fontSize: 12 }}>
        Min next bid: ${minNext.toLocaleString()}
      </div>
      <button
        type="submit"
        style={{
          background: "#3a86ff",
          border: "none",
          color: "white",
          padding: "10px 14px",
          borderRadius: 8,
          cursor: "pointer",
          fontWeight: 600
        }}
      >
        Submit bid
      </button>
      {message && (
        <div style={{ padding: 8, background: "#1f2433", borderRadius: 6, fontSize: 13 }}>
          {message}
        </div>
      )}
    </form>
  );
}
