import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Force naked domain → www (SSL cert is on www.savehxpe.com)
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'savehxpe.com' }],
        destination: 'https://www.savehxpe.com/:path*',
        permanent: true,
      },
      // Legacy route migration: /no-handouts → /arcade
      {
        source: '/no-handouts',
        destination: '/arcade',
        permanent: true,
      },
      {
        source: '/no-handouts/:path*',
        destination: '/arcade',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        // Apply to all routes — relaxes COOP to allow Firebase Auth redirect flow
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "unsafe-none",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
