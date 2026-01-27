
export const APP_BASE_PATH =
  process.env.NEXT_PUBLIC_APP_PATH || "/app";

export const API_BASE_PATH =
  process.env.NEXT_PUBLIC_API_PATH || "/api";

  // next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*`, // proxy to backend
      },
    ];
  },
};

module.exports = nextConfig;
