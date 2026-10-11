import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  // Separate caches for the synthetic role fixtures; never an arbitrary path.
  ...(process.env.AIBEAN_LOCAL_ACCEPTANCE_RUN &&
  process.env.NODE_ENV === "development" &&
  /^[a-f0-9]{32}$/.test(process.env.AIBEAN_LOCAL_ACCEPTANCE_RUN) &&
  /^(admin|user|creator|vendor)$/.test(
    process.env.AIBEAN_LOCAL_ACCEPTANCE_ROLE || "",
  )
    ? {
        distDir: `test-results/product-acceptance-${process.env.AIBEAN_LOCAL_ACCEPTANCE_RUN}/next-${process.env.AIBEAN_LOCAL_ACCEPTANCE_ROLE}`,
      }
    : {}),
  devIndicators: false,
  agentRules: false,
  // Synthetic database credentials, data directories and private test logs
  // must never enter a production deployment through automatic file tracing.
  outputFileTracingExcludes: { "/*": ["./test-results/**/*"] },
  // Callback URLs may contain one-time codes. Never print incoming auth URLs.
  logging: { incomingRequests: false, serverFunctions: false },
};
export default nextConfig;
