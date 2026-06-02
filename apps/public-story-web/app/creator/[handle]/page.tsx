import { publicGet } from "../../../lib/api";

type Creator = {
  id: string;
  publicHandle: string;
  creatorType: string;
  verified: boolean;
};

export default async function CreatorPage({
  params
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  // Wave 2: gateway returns the full creator list; we filter client-side here.
  // Wave 3 introduces a dedicated /api/public/creators/:handle aggregation route.
  const creators = await publicGet<Creator[]>("/api/creators");
  const creator = (creators || []).find((c) => c.publicHandle === handle);

  if (!creator) {
    return (
      <main style={{ padding: 64, maxWidth: 880, margin: "0 auto" }}>
        <h1>Creator not found</h1>
        <p style={{ color: "#9ea2bd" }}>
          We couldn&apos;t find a creator with the handle <code>{handle}</code>.
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: 48, maxWidth: 880, margin: "0 auto" }}>
      <h1 style={{ fontSize: 44, marginBottom: 12 }}>{creator.publicHandle}</h1>
      <p style={{ color: "#cbceea", fontSize: 18 }}>
        {creator.creatorType} · {creator.verified ? "verified" : "unverified"}
      </p>
      <p style={{ marginTop: 32, color: "#9ea2bd" }}>
        Wave 3 will add the full creator showcase: drops, sales history, follower count,
        and originator legacy.
      </p>
    </main>
  );
}
