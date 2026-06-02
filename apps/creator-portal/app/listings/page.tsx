"use client";

import { useState } from "react";
import { apiPost } from "../../lib/api";

export default function ListingsPage() {
  const [message, setMessage] = useState("");

  async function onSubmit(formData: FormData) {
    const payload = {
      assetId: String(formData.get("assetId") || ""),
      sellerId: String(formData.get("sellerId") || ""),
      price: Number(formData.get("price") || 0)
    };
    try {
      const listing = await apiPost<{ id: string }>("/api/listings", payload);
      setMessage(`Listing created: ${listing.id}`);
    } catch (err) {
      setMessage(`Error: ${(err as Error).message}`);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 640, margin: "0 auto" }}>
      <h1>Create Listing</h1>
      <p style={{ color: "#475467" }}>
        The asset must already be COA-approved before a listing can be created.
      </p>
      <form action={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input name="assetId" placeholder="assetId" required />
        <input name="sellerId" placeholder="sellerId (user id)" required />
        <input name="price" placeholder="price (USD)" type="number" min="1" required />
        <button type="submit">Create Listing</button>
      </form>
      {message && (
        <p
          style={{
            marginTop: 16,
            padding: 12,
            background: "#eef4ff",
            borderRadius: 8
          }}
        >
          {message}
        </p>
      )}
    </main>
  );
}
