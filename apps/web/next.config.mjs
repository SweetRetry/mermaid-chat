/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  serverExternalPackages: ["better-sqlite3"],
  turbopack: {
    root: "../..",
  },
}

export default nextConfig
