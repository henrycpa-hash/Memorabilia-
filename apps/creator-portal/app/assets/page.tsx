import Link from "next/link";
import { apiGet } from "../../lib/api";

type Asset = {
  id: string;
  title: string;
  assetType: string;
  authenticityStatus: string;
};

export default async function AssetsPage() {
  const assets = await apiGet<Asset[]>("/api/assets").catch(() => [] as Asset[]);

  return (
    <main style={{ padding: 24, maxWidth: 920, margin: "0 auto" }}>
      <h1>Assets</h1>
      <p>
        <Link href="/assets/new">+ Register new asset</Link>
      </p>
      <ul style={{ padding: 0, listStyle: "none" }}>
        {assets.map((asset) => (
          <li
            key={asset.id}
            style={{
              padding: 12,
              border: "1px solid #e4e7ec",
              background: "white",
              borderRadius: 8,
              marginBottom: 8
            }}
          >
            <strong>{asset.title}</strong>
            <div style={{ color: "#475467", fontSize: 13 }}>
              {asset.assetType} · {asset.authenticityStatus} · {asset.id}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
