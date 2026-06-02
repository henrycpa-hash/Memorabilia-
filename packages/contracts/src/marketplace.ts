export type ListingStatus = "draft" | "active" | "sold" | "cancelled";

export interface Listing {
  id: string;
  assetId: string;
  sellerId: string;
  listingType: "fixed_price";
  price: number;
  status: ListingStatus;
  createdAt: string;
}

export type OrderStatus = "paid" | "failed";

export interface Order {
  id: string;
  listingId: string;
  assetId: string;
  buyerId: string;
  sellerId: string;
  grossAmount: number;
  royaltyAmount: number;
  netToSeller: number;
  status: OrderStatus;
  createdAt: string;
}
