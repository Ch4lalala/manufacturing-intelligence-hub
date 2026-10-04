import { defineConfig } from "@playwright/test";
export default defineConfig({
  outputDir: "test-results-direct",
  testDir: "./tests",
  testMatch: "direct-browser.spec.ts",
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: process.env.CALIBER_TEST_BASE_URL,
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  reporter: [
    ["list"],
    ["json", { outputFile: "verification/direct-browser-results.json" }],
  ],
});
