import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@defindex/sdk",
    "@neko/backstop",
    "@neko/defindex-vault",
    "@neko/lending",
  ],
};

export default nextConfig;
