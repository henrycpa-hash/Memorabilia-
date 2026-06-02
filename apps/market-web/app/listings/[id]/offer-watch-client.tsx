"use client";

import { useState } from "react";

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

export default function OfferAndWatchClient({
  assetId,
  listingId,
  sellerId
}: {
  assetId: string;
  listingId: string;
  sellerId: string;
}) {
  const [message, setMessage] = useState("");

  async function watch() {
    setMessage("");
    const token = getCookie("cx_access");
    if (!token) {
      setMessage("Sign in via the Vault first to watch (cx_access cookie not set).");
      return;
    }
    try {
      const res = await fetch(`${GATEWAY}/api/watchlists`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ assetId })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMessage("Added to your watchlist.");
    } catch (err) {
      setMessage(`Error: ${(err as Error).message}`);
    }
  }

  async function makeOffer(formData: FormData) {
    setMessage("");
    const token = getCookie("cx_access");
    if (!token) {
      setMessage("Sign in via the Vault first.");
      return;
    }
    const amount = Number(formData.get("amount") || 0);
    if (!amount) return;
    try {
      const res = await fetch(`${GATEWAY}/api/offers`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ assetId, listingId, sellerId, amount })
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Offer failed: ${res.status} ${text}`);
      }
      const offer = await res.json();
      setMessage(`Offer submitted: ${offer.id} for $${offer.amount}.`);
    } catch (err) {
      setMessage(`Error: ${(err as Error).message}`);
    }
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={watch} style={btn}>Add to watchlist</button>
      </div>

      <form
        action={makeOffer}
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
        <h3 style={{ margin: 0 }}>Make an offer</h3>
        <input
          name="amount"
          type="number"
          min={1}
          required
          placeholder="Your offer amount in USD"
          style={input}
        />
        <button type="submit" style={btnPrimary}>Submit offer</button>
      </form>

      {message && (
        <p style={{ marginTop: 16, padding: 12, background: "#1f2433", borderRadius: 8 }}>
          {message}
        </p>
      )}
    </div>
  );
}

const btn: React.CSSProperties = {
  background: "transparent",
  border: "1px solid #2b3148",
  color: "#a4adcb",
  padding: "10px 14px",
  borderRadius: 8,
  cursor: "pointer"
};
const btnPrimary: React.CSSProperties = {
  background: "#3a86ff",
  border: "none",
  color: "white",
  padding: "10px 14px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600
};
const input: React.CSSProperties = {
  background: "#0a0c14",
  color: "#f0f2fa",
  border: "1px solid #2b3148",
  padding: "10px 12px",
  borderRadius: 8
};
