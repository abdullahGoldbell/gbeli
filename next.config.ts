import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Do not auto-generate AGENTS.md / CLAUDE.md into the repo.
  agentRules: false,
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
