/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  env: {
    NEXT_PUBLIC_WS_URL:
      process.env.NEXT_PUBLIC_WS_URL ||
      "wss://examshield-api-production-1e2c.up.railway.app",

    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL ||
      "https://examshield-api-production-1e2c.up.railway.app",
  },
};

module.exports = nextConfig;