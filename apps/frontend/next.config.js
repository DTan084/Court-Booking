/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@court-booking/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'example.com', // Replace with actual production domain
      },
    ],
  },
};

module.exports = nextConfig;
