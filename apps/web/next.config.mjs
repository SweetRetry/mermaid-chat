/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  turbopack: {
    root: "../..",
  },
  env: {
    SITE_PASSWORD: process.env.SITE_PASSWORD,
  },
}

export default nextConfig
