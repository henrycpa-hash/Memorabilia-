/**
 * Wave 1 placeholder: in later waves this becomes a Fastify plugin
 * that loads + validates environment variables via Zod and decorates
 * the Fastify instance with a typed config object.
 */
export const envConfig = {
  identityServiceUrl: process.env.IDENTITY_SERVICE_URL || "http://localhost:4001",
  assetServiceUrl: process.env.ASSET_SERVICE_URL || "http://localhost:4002",
  authServiceUrl: process.env.AUTH_SERVICE_URL || "http://localhost:4003",
  coaServiceUrl: process.env.COA_SERVICE_URL || "http://localhost:4004",
  marketServiceUrl: process.env.MARKET_SERVICE_URL || "http://localhost:4005",
  royaltyServiceUrl: process.env.ROYALTY_SERVICE_URL || "http://localhost:4006",
  jwtSecret: process.env.JWT_SECRET || "dev-secret"
};
