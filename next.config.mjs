/** @type {import('next').NextConfig} */

const nextConfig = {
  experimental: {
    serverActions: {},
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's.gravatar.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.auth0.com',
      },
    ],
  },
  serverExternalPackages: ['mongoose', '@typegoose/typegoose'],
};

export default nextConfig;
