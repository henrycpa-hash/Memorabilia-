export type SocialChannel = "twitter" | "instagram" | "tiktok" | "youtube" | "linkedin" | "discord";

export type PostStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed";

export type SocialPost = {
  id: string;
  creatorId: string;
  channel: SocialChannel;
  text: string;
  mediaUrls: string[];
  linkUrl: string | null;
  status: PostStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  externalPostId: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

const posts: SocialPost[] = [];

export const socialRepo = {
  insert(p: SocialPost) { posts.push(p); return p; },
  findById(id: string) { return posts.find((p) => p.id === id) || null; },
  list() { return [...posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); },
  forCreator(creatorId: string) { return posts.filter((p) => p.creatorId === creatorId); },
  byStatus(status: PostStatus) { return posts.filter((p) => p.status === status); },
  update(id: string, patch: Partial<SocialPost>) {
    const p = posts.find((x) => x.id === id);
    if (p) Object.assign(p, patch);
    return p || null;
  }
};
