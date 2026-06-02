import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import { shareCardRepo, type ShareCard } from "../repo/ranking.repo";

const STORY_BASE = () =>
  process.env.NEXT_PUBLIC_PUBLIC_STORY_URL ||
  process.env.PUBLIC_STORY_URL ||
  "http://localhost:3004";

export const ShareCardTypes = [
  "auth_approved_card",
  "coa_issued_card",
  "listing_live_card",
  "auction_live_card",
  "record_sale_card",
  "legacy_holder_card",
  "royalty_enabled_card"
] as const;
export type ShareCardType = (typeof ShareCardTypes)[number];

export const shareCardService = {
  async create(input: {
    assetId: string;
    slug?: string;
    cardType: ShareCardType;
    title: string;
    subtitle: string;
    imageUrl?: string | null;
    publicUrl?: string;
  }): Promise<ShareCard> {
    const card: ShareCard = {
      id: newId(),
      assetId: input.assetId,
      cardType: input.cardType,
      title: input.title,
      subtitle: input.subtitle,
      imageUrl: input.imageUrl ?? null,
      publicUrl:
        input.publicUrl ||
        (input.slug ? `${STORY_BASE()}/collectible/${input.slug}` : `${STORY_BASE()}/asset/${input.assetId}`),
      createdAt: nowIso()
    };
    shareCardRepo.insert(card);

    await publishOutbox({
      id: newId(),
      eventType: "share.card.created",
      aggregateId: card.id,
      aggregateType: "share_card",
      payload: {
        cardId: card.id,
        assetId: card.assetId,
        cardType: card.cardType,
        publicUrl: card.publicUrl
      },
      occurredAt: nowIso()
    });

    return card;
  },

  listForAsset(assetId: string) {
    return shareCardRepo.listForAsset(assetId);
  },

  list() {
    return shareCardRepo.list();
  }
};
