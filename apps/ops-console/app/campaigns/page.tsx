import { publicGet } from "../../lib/api";

type Campaign = {
  id: string;
  creatorId: string;
  campaignType: string;
  title: string;
  status: string;
  audienceType: string;
  rewardType: string | null;
  startsAt: string;
  endsAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  draft: "#7d83a3",
  scheduled: "#a78bfa",
  live: "#4ade80",
  ended: "#a4adcb",
  canceled: "#fb7185"
};

export default async function CampaignsPage() {
  const campaigns = (await publicGet<Campaign[]>("/api/campaigns")) || [];

  return (
    <section>
      <h1 style={{ margin: 0 }}>Campaigns</h1>
      <p style={{ color: "#a4adcb", marginTop: 6 }}>
        7 campaign types: countdown_drop · loyalty_reward · referral_boost ·
        watchlist_conversion · holder_only_drop · auction_promo ·
        post_sale_highlight.
      </p>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: 20,
          fontSize: 14
        }}
      >
        <thead>
          <tr style={{ textAlign: "left", color: "#7d83a3" }}>
            <th style={{ padding: 10 }}>title</th>
            <th style={{ padding: 10 }}>type</th>
            <th style={{ padding: 10 }}>creator</th>
            <th style={{ padding: 10 }}>audience</th>
            <th style={{ padding: 10 }}>status</th>
            <th style={{ padding: 10 }}>window</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => (
            <tr key={c.id} style={{ borderTop: "1px solid #1f2433" }}>
              <td style={{ padding: 10 }}>{c.title}</td>
              <td style={{ padding: 10, color: "#a4adcb" }}>{c.campaignType}</td>
              <td style={{ padding: 10, fontFamily: "monospace", fontSize: 12 }}>
                {c.creatorId.slice(0, 10)}…
              </td>
              <td style={{ padding: 10, color: "#a4adcb" }}>{c.audienceType}</td>
              <td style={{ padding: 10 }}>
                <span
                  style={{
                    color: STATUS_COLORS[c.status] || "#cdd2ec",
                    fontWeight: 600
                  }}
                >
                  {c.status}
                </span>
              </td>
              <td style={{ padding: 10, color: "#7d83a3", fontSize: 12 }}>
                {new Date(c.startsAt).toLocaleDateString()} →{" "}
                {new Date(c.endsAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {campaigns.length === 0 ? (
        <p style={{ color: "#7d83a3", marginTop: 24 }}>No campaigns yet.</p>
      ) : null}
    </section>
  );
}
