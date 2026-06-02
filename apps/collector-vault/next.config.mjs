/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // shared TS source packages are transpiled by Next at build time
  transpilePackages: ["@crownx-jewel/shared-design", "@crownx-jewel/shared-pricing", "@crownx-jewel/shared-xp"]
};

export default nextConfig;
