/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: '/login', destination: '/' },
      { source: '/admin', destination: '/' },
      { source: '/customer', destination: '/' },
      { source: '/customer/product/:path*', destination: '/' },
      { source: '/onboarding', destination: '/' },
    ];
  },
};

export default nextConfig;
