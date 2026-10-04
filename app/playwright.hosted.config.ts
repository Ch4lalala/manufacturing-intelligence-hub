import { defineConfig } from "@playwright/test";
export default defineConfig({
  outputDir: "test-results-hosted",
  testDir: "./tests",
  testMatch: "hosted-browser.spec.ts",
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: process.env.CALIBER_TEST_BASE_URL,
    viewport: { width: 1440, height: 1000 },
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
  },
  reporter: [
    ["list"],
    ["json", { outputFile: "verification/hosted-browser-results.json" }],
  ],
});
