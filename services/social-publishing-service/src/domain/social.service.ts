import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import { socialRepo, type SocialChannel, type SocialPost } from "../repo/social.repo";

/**
 * Wave 5 publishing adapter. Stub — synthesizes external post IDs. Wave 6
 * dispatches by channel to real provider SDKs (Twitter/X API, Meta Graph,
 * TikTok, YouTube Data API, LinkedIn Marketing, Discord webhooks).
 */
async function publishToChannel(input: {
  channel: SocialChannel;
  text: string;
  mediaUrls: string[];
  linkUrl: string | null;
}): Promise<{ externalPostId: string }> {
  const id = `${input.channel}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  return { externalPostId: id };
}

export const socialService = {
  draft(input: {
    creatorId: string;
    channel: SocialChannel;
    text: string;
    mediaUrls?: string[];
    linkUrl?: string;
    scheduledAt?: string;
  }): SocialPost {
    const p: SocialPost = {
      id: newId(),
      creatorId: input.creatorId,
      channel: input.channel,
      text: input.text,
      mediaUrls: input.mediaUrls || [],
      linkUrl: input.linkUrl || null,
      status: "draft",
      scheduledAt: input.scheduledAt || null,
      publishedAt: null,
      externalPostId: null,
      errorMessage: null,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    socialRepo.insert(p);
    return p;
  },

  approve(id: string) {
    return socialRepo.update(id, { status: "approved", updatedAt: nowIso() });
  },

  schedule(id: string, scheduledAt: string) {
    return socialRepo.update(id, {
      status: "scheduled",
      scheduledAt,
      updatedAt: nowIso()
    });
  },

  /** Publish immediately. Sets publishing → published or failed. */
  async publishNow(id: string): Promise<SocialPost | null> {
    const p = socialRepo.findById(id);
    if (!p) return null;
    socialRepo.update(p.id, { status: "publishing", updatedAt: nowIso() });
    try {
      const result = await publishToChannel({
        channel: p.channel,
        text: p.text,
        mediaUrls: p.mediaUrls,
        linkUrl: p.linkUrl
      });
      const updated = socialRepo.update(p.id, {
        status: "published",
        publishedAt: nowIso(),
        externalPostId: result.externalPostId,
        updatedAt: nowIso()
      });
      await publishOutbox({
        id: newId(),
        eventType: "social.post.published",
        aggregateId: p.id,
        aggregateType: "social_post",
        payload: { postId: p.id, channel: p.channel, externalPostId: result.externalPostId },
        occurredAt: nowIso()
      });
      return updated;
    } catch (err) {
      const updated = socialRepo.update(p.id, {
        status: "failed",
        errorMessage: String(err),
        updatedAt: nowIso()
      });
      return updated;
    }
  },

  /**
   * Wave 5 worker tick: publishes every "approved" or "scheduled-due" post.
   * Wave 6 swaps to a real cron loop.
   */
  async tick(): Promise<{ published: number; failed: number }> {
    let published = 0;
    let failed = 0;
    const due = [
      ...socialRepo.byStatus("approved"),
      ...socialRepo.byStatus("scheduled").filter(
        (p) => p.scheduledAt && new Date(p.scheduledAt).getTime() <= Date.now()
      )
    ];
    for (const p of due) {
      const result = await this.publishNow(p.id);
      if (result?.status === "published") published += 1;
      else failed += 1;
    }
    return { published, failed };
  },

  list: () => socialRepo.list(),
  findById: (id: string) => socialRepo.findById(id),
  forCreator: (c: string) => socialRepo.forCreator(c),
  byStatus: (s: SocialPost["status"]) => socialRepo.byStatus(s)
};
