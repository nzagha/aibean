import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  devIndicators: false,
  agentRules: false,
  // Callback URLs may contain one-time codes. Never print incoming auth URLs.
  logging: { incomingRequests: false, serverFunctions: false },
};
export default nextConfig;
