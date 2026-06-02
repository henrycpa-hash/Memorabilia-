import Link from "next/link";
import { publicGet } from "../../lib/api";
import { SectionTag, SlabCard, Panel, color, font } from "@crownx-jewel/shared-design";

type Listing = {
  id: string;
  assetId: string;
  sellerId: string;
  price: string;
  status: string;
  createdAt: string;
};

export default async function ListingsPage() {
  const listings = await publicGet<Listing[]>("/api/listings");
  const active = (listings || []).filter((l) => l.status === "active");

  return (
    <section>
      <SectionTag>Marketplace</SectionTag>
      <h1 style={{ fontFamily: font.display, fontWeight: 400, fontSize: 40, margin: "0 0 6px" }}>Active listings</h1>
      <p style={{ color: color.mut, margin: 0 }}>
        Fixed-price slabs on the open market. Tap one to make an offer or buy outright.
      </p>

      {active.length === 0 ? (
        <Panel style={{ marginTop: 24 }}>
          <p style={{ color: color.mut, margin: 0 }}>No active listings yet.</p>
        </Panel>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16, marginTop: 24 }}>
          {active.map((l) => (
            <Link key={l.id} href={`/listings/${l.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              {/* price comes verbatim from listing data — display only, never recomputed */}
              <SlabCard
                name={`${l.assetId.slice(0, 10)}…`}
                subtitle="LISTING"
                floor={`$${Number(l.price).toLocaleString()}`}
                badge={l.status.toUpperCase()}
              />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
