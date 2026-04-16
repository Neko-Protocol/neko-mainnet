import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@defindex/sdk",
    "@neko/backstop",
    "@neko/defindex-vault",
    "@neko/lending",
    "@neko/reflector",
  ],
};

export default nextConfig;
