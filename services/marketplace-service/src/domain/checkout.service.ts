import { newId, nowIso, round2 } from "@crownx-jewel/shared-kernel";
import { publishOutbox } from "@crownx-jewel/shared-events/outbox";
import { EventTypes } from "@crownx-jewel/shared-events/event-types";
import type { Order } from "@crownx-jewel/contracts";
import { orderRepo } from "../repo/order.repo";

const assetBase = () => process.env.ASSET_SERVICE_URL || "http://localhost:4002";
const royaltyBase = () => process.env.ROYALTY_SERVICE_URL || "http://localhost:4006";

export async function performCheckout(input: {
  listingId: string;
  buyerId: string;
}): Promise<Order> {
  // 1. Fetch listing from asset-registry-service.
  const listingsRes = await fetch(`${assetBase()}/listings`);
  if (!listingsRes.ok) {
    throw new Error(`Failed to fetch listings: ${listingsRes.status}`);
  }
  const listings = (await listingsRes.json()) as Array<{
    id: string;
    assetId: string;
    sellerId: string;
    price: number;
    status: string;
  }>;
  const listing = listings.find((l) => l.id === input.listingId);
  if (!listing) {
    throw new Error("Listing not found");
  }
  if (listing.status !== "active") {
    throw new Error("Listing is not active");
  }

  // 2. Fetch the asset to confirm it is approved.
  const assetRes = await fetch(`${assetBase()}/assets/${listing.assetId}`);
  if (!assetRes.ok) {
    throw new Error("Asset not found");
  }
  const asset = (await assetRes.json()) as {
    id: string;
    authenticityStatus: string;
  };
  if (asset.authenticityStatus !== "approved") {
    throw new Error("Asset must be approved before checkout");
  }

  // 3. Calculate royalties via royalty-engine-service.
  const orderId = newId();
  const royaltyRes = await fetch(`${royaltyBase()}/internal/calculate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      orderId,
      assetId: asset.id,
      saleAmount: listing.price
    })
  });
  if (!royaltyRes.ok) {
    throw new Error(`Royalty calculation failed: ${royaltyRes.status}`);
  }
  const royalty = (await royaltyRes.json()) as { totalRoyalty: number };

  const netToSeller = round2(listing.price - royalty.totalRoyalty);

  // 4. Persist the order.
  const order: Order = {
    id: orderId,
    listingId: listing.id,
    assetId: asset.id,
    buyerId: input.buyerId,
    sellerId: listing.sellerId,
    grossAmount: listing.price,
    royaltyAmount: royalty.totalRoyalty,
    netToSeller,
    status: "paid",
    createdAt: nowIso()
  };
  orderRepo.insert(order);

  // 5. Mark listing sold and transfer ownership.
  await fetch(`${assetBase()}/internal/listings/${listing.id}/mark-sold`, {
    method: "POST"
  });
  await fetch(`${assetBase()}/internal/assets/${asset.id}/transfer`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ newOwnerId: input.buyerId })
  });

  // 6. Publish completion event.
  await publishOutbox({
    id: newId(),
    eventType: EventTypes.OrderCompleted,
    aggregateId: order.id,
    aggregateType: "order",
    payload: order,
    occurredAt: nowIso()
  });
  await publishOutbox({
    id: newId(),
    eventType: EventTypes.ListingSold,
    aggregateId: listing.id,
    aggregateType: "listing",
    payload: { listingId: listing.id, orderId: order.id },
    occurredAt: nowIso()
  });

  return order;
}
