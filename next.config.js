/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    APP_ENV: process.env.APP_ENV || 'development',
  },
};

module.exports = nextConfig; 