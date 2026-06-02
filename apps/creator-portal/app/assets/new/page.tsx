"use client";

import { useState } from "react";
import { apiPost } from "../../../lib/api";

export default function NewAssetPage() {
  const [message, setMessage] = useState("");

  async function onSubmit(formData: FormData) {
    const payload = {
      originatorId: String(formData.get("originatorId") || ""),
      currentOwnerId: String(formData.get("currentOwnerId") || ""),
      assetType: String(formData.get("assetType") || "memorabilia"),
      title: String(formData.get("title") || ""),
      description: String(formData.get("description") || ""),
      editionType: String(formData.get("editionType") || "one_of_one")
    };
    try {
      const asset = await apiPost<{ id: string }>("/api/assets", payload);
      setMessage(`Asset created: ${asset.id}`);
    } catch (err) {
      setMessage(`Error: ${(err as Error).message}`);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 640, margin: "0 auto" }}>
      <h1>Register Asset</h1>
      <form action={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input name="originatorId" placeholder="originatorId (creator id)" required />
        <input name="currentOwnerId" placeholder="currentOwnerId (user id)" required />
        <select name="assetType" defaultValue="memorabilia">
          <option value="memorabilia">memorabilia</option>
          <option value="art">art</option>
          <option value="nil_experience">nil_experience</option>
          <option value="hybrid">hybrid</option>
        </select>
        <input name="title" placeholder="Title" required />
        <textarea name="description" placeholder="Description" rows={3} />
        <select name="editionType" defaultValue="one_of_one">
          <option value="one_of_one">one_of_one</option>
          <option value="limited">limited</option>
          <option value="open">open</option>
        </select>
        <button type="submit">Create Asset</button>
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
