import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Keep the bot's root npm lockfile out of Next's standalone trace scope.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
