/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [],
    unoptimized: false,
  },
  // Allow serving static files from uploads directory
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/uploads/:path*',
      },
    ];
  },
};

module.exports = nextConfig;

