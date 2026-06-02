/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  transpilePackages: ["@crownx-jewel/shared-design"]
};

export default nextConfig;
