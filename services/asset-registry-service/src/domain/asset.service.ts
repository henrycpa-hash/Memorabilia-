import { newId, nowIso } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import { EventTypes } from "@crownx-jewel/shared-events/event-types";
import type {
  AssetType,
  EditionType,
  Listing
} from "@crownx-jewel/contracts";
import { assetRepo, listingRepo, type StoredAsset } from "../repo/asset.repo";
import { timelineService } from "./timeline.service";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64);
}

export const assetService = {
  async create(input: {
    originatorId: string;
    currentOwnerId: string;
    assetType: AssetType;
    title: string;
    description?: string;
    editionType: EditionType;
    editionNumber?: number;
    totalEditionSize?: number;
  }): Promise<StoredAsset> {
    const asset: StoredAsset = {
      id: newId(),
      originatorId: input.originatorId,
      currentOwnerId: input.currentOwnerId,
      assetType: input.assetType,
      title: input.title,
      description: input.description,
      slug: `${slugify(input.title)}-${Date.now().toString(36)}`,
      authenticityStatus: "draft",
      editionType: input.editionType,
      editionNumber: input.editionNumber,
      totalEditionSize: input.totalEditionSize,
      visibility: "private",
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    assetRepo.insert(asset);

    timelineService.append({
      assetId: asset.id,
      type: "asset_registered",
      label: "Asset registered",
      publicNote: `Registered as ${asset.title}`
    });

    await publishOutbox({
      id: newId(),
      eventType: EventTypes.AssetCreated,
      aggregateId: asset.id,
      aggregateType: "asset",
      payload: asset,
      occurredAt: nowIso()
    });

    return asset;
  },

  list() {
    return assetRepo.list();
  },

  listPublic() {
    return assetRepo.listPublic();
  },

  listByOwner(ownerId: string) {
    return assetRepo.listByOwner(ownerId);
  },

  getById(id: string) {
    return assetRepo.getById(id);
  },

  findBySlug(slug: string) {
    return assetRepo.findBySlug(slug);
  },

  async markPending(id: string) {
    return assetRepo.update(id, { authenticityStatus: "pending", updatedAt: nowIso() });
  },

  /**
   * Wave 2 rule: approving an asset also flips visibility to public so the
   * story page becomes accessible at /api/public/story/:slug.
   */
  async markApproved(id: string) {
    const asset = assetRepo.update(id, {
      authenticityStatus: "approved",
      visibility: "public",
      updatedAt: nowIso()
    });
    if (asset) {
      timelineService.append({
        assetId: asset.id,
        type: "auth_approved",
        label: "Authentication approved",
        publicNote: "The asset passed authentication review and is now public."
      });

      await publishOutbox({
        id: newId(),
        eventType: EventTypes.AssetApproved,
        aggregateId: asset.id,
        aggregateType: "asset",
        payload: { assetId: asset.id, slug: asset.slug },
        occurredAt: nowIso()
      });
    }
    return asset;
  },

  async transferOwnership(assetId: string, newOwnerId: string) {
    const asset = assetRepo.update(assetId, {
      currentOwnerId: newOwnerId,
      updatedAt: nowIso()
    });
    if (asset) {
      timelineService.append({
        assetId: asset.id,
        type: "ownership_transferred",
        label: "Ownership transferred",
        publicNote: `New holder: ${newOwnerId.slice(0, 8)}…`
      });

      await publishOutbox({
        id: newId(),
        eventType: EventTypes.AssetTransferred,
        aggregateId: asset.id,
        aggregateType: "asset",
        payload: { assetId: asset.id, newOwnerId },
        occurredAt: nowIso()
      });
    }
    return asset;
  },

  async createListing(input: { assetId: string; sellerId: string; price: number }): Promise<Listing> {
    const listing: Listing = {
      id: newId(),
      assetId: input.assetId,
      sellerId: input.sellerId,
      listingType: "fixed_price",
      price: input.price,
      status: "active",
      createdAt: nowIso()
    };
    listingRepo.insert(listing);

    timelineService.append({
      assetId: input.assetId,
      type: "listing_created",
      label: "Listed for sale",
      price: input.price
    });

    await publishOutbox({
      id: newId(),
      eventType: EventTypes.ListingCreated,
      aggregateId: listing.id,
      aggregateType: "listing",
      payload: listing,
      occurredAt: nowIso()
    });

    return listing;
  },

  listListings() {
    return listingRepo.list();
  },

  markListingSold(id: string) {
    return listingRepo.update(id, { status: "sold" });
  }
};
