import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces .next/standalone - a minimal, self-contained server bundle
  // (pruned node_modules included) that the Windows release zip runs
  // directly with `node server.js`, instead of shipping the whole
  // node_modules tree.
  output: "standalone",
};

export default nextConfig;
