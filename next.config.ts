/** @type {import('next').NextConfig} */
const nextConfig = {
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
