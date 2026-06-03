/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self), payment=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }
        ]
      }
    ];
  },
  reactStrictMode: true,
  output: "standalone",
  // shared TS source packages are transpiled by Next at build time
  transpilePackages: ["@crownx-jewel/shared-design", "@crownx-jewel/shared-pricing", "@crownx-jewel/shared-xp"]
};

export default nextConfig;
