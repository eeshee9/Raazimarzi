/** @type {import('next').NextConfig} */
const nextConfig = {
  // ❌ REMOVE basePath and assetPrefix - they're causing conflicts
  // The React app will handle /app routes
  output: "standalone",
  
  // Add rewrites to handle routing
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://raazimarzi.com/api/:path*', // Proxy to backend
      },
    ];
  },
};

module.exports = nextConfig;