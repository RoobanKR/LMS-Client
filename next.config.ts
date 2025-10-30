/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
    domains: ['images.unsplash.com'], // Add your image domains here
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Allow all HTTPS domains (be careful in production)
      },
    ],
  },
 
  reactStrictMode: false,
  eslint: {
    // ✅ Skip ESLint errors during build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ✅ Skip TypeScript type errors during build
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
