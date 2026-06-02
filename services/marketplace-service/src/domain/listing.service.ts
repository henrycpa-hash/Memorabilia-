/**
 * Wave 1: thin facade. Marketplace asks asset-registry for listing data over HTTP.
 * Wave 2 will move to a proper read model populated by domain events.
 */
export const listingClient = {
  base: () => process.env.ASSET_SERVICE_URL || "http://localhost:4002"
};
