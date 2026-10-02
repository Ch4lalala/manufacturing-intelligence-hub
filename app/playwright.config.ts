import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "browser.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: process.env.CALIBER_TEST_BASE_URL ?? "http://127.0.0.1:3100",
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  reporter: [
    ["list"],
    ["json", { outputFile: "verification/browser-results.json" }],
  ],
  webServer: {
    command: "npm run dev",
    url: process.env.CALIBER_TEST_BASE_URL ?? "http://127.0.0.1:3100",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
