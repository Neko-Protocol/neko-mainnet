import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(appDir, "../..");

const nextConfig: NextConfig = {
  turbopack: {
    root: repoRoot,
  },
  transpilePackages: [
    "@defindex/sdk",
    "@neko/backstop",
    "@neko/defindex-vault",
    "@neko/lending",
    "@neko/reflector",
  ],
};

export default nextConfig;
