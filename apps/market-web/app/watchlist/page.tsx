import Link from "next/link";
import { authedGet } from "../../lib/api";

type WatchlistEntry = {
  id: string;
  userId: string;
  assetId: string;
  createdAt: string;
};

export default async function WatchlistPage() {
  const watchlist = await authedGet<WatchlistEntry[]>("/api/watchlists/me");

  if (watchlist === null) {
    return (
      <section>
        <h1>Watchlist</h1>
        <p style={{ color: "#a4adcb" }}>
          You&apos;re not signed in. Sign in via the{" "}
          <a
            href={
              (process.env.NEXT_PUBLIC_VAULT_URL || "http://localhost:3003") + "/login"
            }
            style={{ color: "#3a86ff" }}
          >
            Collector Vault
          </a>{" "}
          first — your auth cookie is shared across CrownX apps.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h1>Watchlist</h1>
      <p style={{ color: "#a4adcb" }}>
        Collectibles you&apos;re tracking. Wave 4 will surface listing changes, new offers,
        and auction-ending alerts here.
      </p>

      {watchlist.length === 0 ? (
        <p style={{ color: "#7d83a3", marginTop: 24 }}>
          You don&apos;t have anything on your watchlist yet. Browse{" "}
          <Link href="/listings" style={{ color: "#3a86ff" }}>listings</Link> or{" "}
          <Link href="/auctions" style={{ color: "#3a86ff" }}>auctions</Link>.
        </p>
      ) : (
        <ul style={{ padding: 0, listStyle: "none", marginTop: 16 }}>
          {watchlist.map((w) => (
            <li
              key={w.id}
              style={{
                padding: 16,
                background: "#11141f",
                border: "1px solid #1f2433",
                borderRadius: 12,
                marginBottom: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div>
                <code style={{ color: "#cdd2ec" }}>{w.assetId}</code>
                <div style={{ fontSize: 12, color: "#7d83a3", marginTop: 4 }}>
                  added {new Date(w.createdAt).toLocaleString()}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
