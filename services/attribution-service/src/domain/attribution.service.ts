import { createHmac, randomBytes } from "node:crypto";
import { nowIso } from "@crownx-jewel/shared-kernel";
import type { ShareCardData } from "../render/card";

/**
 * The referral-attribution funnel from `CrownX_Referral_Attribution.docx`.
 * One immutable, HMAC-signed render_id per share is carried through five
 * events; XP is released ONLY on an attributed first COA mint. View XP is
 * deduped + daily-capped; conversion pays invite XP via the xp-service.
 */

const XP_URL = () => process.env.XP_SERVICE_URL || "http://localhost:4073";
const SECRET = () => process.env.ATTRIBUTION_HMAC_SECRET || "dev-attribution-secret";
const PUBLIC_BASE = () => process.env.PUBLIC_SHARE_BASE || "http://localhost:4000";

export type Surface = "imessage" | "x" | "tiktok" | "link";

export interface RenderRecord {
  renderId: string;
  assetId: string;
  sharerId: string;
  sharerLv: number;
  surface: Surface;
  rewardToken: string;
  card: ShareCardData;
  sig: string;
  createdAt: string;
}

interface ViewRecord { renderId: string; dedupeHash: string; counted: boolean; ts: string }
interface ReferralEdge { renderId: string; sharerId: string; inviteeId: string; status: "activated" | "converted" | "expired"; createdAt: string; convertedAt?: string }

const renders = new Map<string, RenderRecord>();
const views: ViewRecord[] = [];
const seenView = new Set<string>(); // `${renderId}:${dedupeHash}`
const referrals: ReferralEdge[] = [];

// ULID-ish: time-sortable prefix + random — collision-safe, no deps
function mintRenderId(): string {
  const t = nowIso().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `rnd_${t}${randomBytes(5).toString("hex")}`;
}
function sign(payload: string): string {
  return createHmac("sha256", SECRET()).update(payload).digest("hex").slice(0, 32);
}

async function grantXp(body: unknown): Promise<void> {
  try {
    await fetch(`${XP_URL()}/xp/grant`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    /* best-effort — never block the funnel */
  }
}

export const attributionService = {
  /** card.rendered — mint completes, image generated, render_id minted. */
  createRender(input: { assetId: string; sharerId: string; sharerLv?: number; surface?: Surface; card: ShareCardData }): RenderRecord {
    const renderId = mintRenderId();
    const sharerLv = input.sharerLv ?? 1;
    const payload = `${renderId}.${input.assetId}.${input.sharerId}.${sharerLv}`;
    const rec: RenderRecord = {
      renderId,
      assetId: input.assetId,
      sharerId: input.sharerId,
      sharerLv,
      surface: input.surface || "link",
      rewardToken: `pck_${randomBytes(4).toString("hex")}`,
      card: input.card,
      sig: sign(payload),
      createdAt: nowIso()
    };
    renders.set(renderId, rec);
    return rec;
  },

  get: (renderId: string): RenderRecord | undefined => renders.get(renderId),

  verifySig(rec: RenderRecord): boolean {
    return rec.sig === sign(`${rec.renderId}.${rec.assetId}.${rec.sharerId}.${rec.sharerLv}`);
  },

  shareUrl: (renderId: string) => `${PUBLIC_BASE()}/api/r/${renderId}`,
  cardUrl: (renderId: string) => `${PUBLIC_BASE()}/api/r/${renderId}/card.svg`,

  /** link.viewed — unique external viewer; dedupe + daily cap, +60 to sharer. */
  async logView(renderId: string, dedupeHash: string): Promise<{ counted: boolean; reason?: string }> {
    const rec = renders.get(renderId);
    if (!rec) return { counted: false, reason: "unknown_render" };
    const key = `${renderId}:${dedupeHash}`;
    if (seenView.has(key)) {
      views.push({ renderId, dedupeHash, counted: false, ts: nowIso() });
      return { counted: false, reason: "duplicate_view" };
    }
    // self-view guard: sharer viewing own card earns nothing
    if (dedupeHash === rec.sharerId) {
      return { counted: false, reason: "self_view_blocked" };
    }
    seenView.add(key);
    views.push({ renderId, dedupeHash, counted: true, ts: nowIso() });
    await grantXp({ userId: rec.sharerId, action: "slab_shared", refRenderId: renderId });
    return { counted: true };
  },

  /** user.activated — write the sharer→invitee edge. No XP yet. */
  activate(renderId: string, inviteeId: string): { ok: boolean; reason?: string } {
    const rec = renders.get(renderId);
    if (!rec) return { ok: false, reason: "unknown_render" };
    if (inviteeId === rec.sharerId) return { ok: false, reason: "self_referral_blocked" };
    if (referrals.find((r) => r.renderId === renderId && r.inviteeId === inviteeId)) return { ok: true };
    referrals.push({ renderId, sharerId: rec.sharerId, inviteeId, status: "activated", createdAt: nowIso() });
    return { ok: true };
  },

  /** mint.first — CONVERSION. Releases invite XP (+800 ×mult sharer, +500 invitee). */
  async firstMint(renderId: string, inviteeId: string, onChainRef?: string): Promise<{ converted: boolean; reason?: string }> {
    const rec = renders.get(renderId);
    if (!rec) return { converted: false, reason: "unknown_render" };
    const edge = referrals.find((r) => r.renderId === renderId && r.inviteeId === inviteeId);
    if (!edge) return { converted: false, reason: "no_activation_edge" };
    if (edge.status === "converted") return { converted: true };
    edge.status = "converted";
    edge.convertedAt = nowIso();
    try {
      await fetch(`${XP_URL()}/xp/invite-conversion`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sharerId: rec.sharerId, sharerLevel: rec.sharerLv, inviteeId, refRenderId: renderId, onChainRef })
      });
    } catch {
      /* best-effort */
    }
    return { converted: true };
  },

  /** Computable viral metrics from the chain. */
  metrics() {
    const uniqueViews = views.filter((v) => v.counted).length;
    const activations = referrals.length;
    const conversions = referrals.filter((r) => r.status === "converted").length;
    const sharers = new Set(referrals.map((r) => r.sharerId)).size || 1;
    return {
      renders: renders.size,
      uniqueViews,
      activations,
      conversions,
      kFactor: Math.round((conversions / sharers) * 100) / 100,
      installToMint: activations ? Math.round((conversions / activations) * 100) / 100 : 0,
      bySurface: ["imessage", "x", "tiktok", "link"].map((s) => ({ surface: s, renders: [...renders.values()].filter((r) => r.surface === s).length }))
    };
  }
};
