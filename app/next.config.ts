import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  output: "standalone",
  outputFileTracingIncludes: {
    "/*": ["./data/normalized.json"],
    "/api/source": ["./runtime/**/*"],
  },
  outputFileTracingExcludes: {
    "/*": ["./.env*", "./verification/**/*", "./screenshots/**/*"],
  },
};
export default config;
