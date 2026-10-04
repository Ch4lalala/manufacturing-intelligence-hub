import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("Direct production AI uses server provider without login, Redis or application quota", async ({
  page,
  request,
}) => {
  await page.route("**/api/**", async (route) => {
    const response = await route.fetch({
      headers: {
        ...(await route.request().allHeaders()),
        "x-forwarded-proto": "https",
        origin: process.env.CALIBER_TEST_HTTPS_ORIGIN!,
      },
    });
    await route.fulfill({ response });
  });
  await page.goto(
    "/?view=investigation&asset=KO-3201&mode=prospective&asOf=2026-04-22%2023:59:59",
  );
  await expect(
    page.getByText(
      "Live AI composition available. No demo passcode required.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Demo passcode", { exact: true })).toHaveCount(
    0,
  );
  const button = page.getByRole("button", {
    name: "Request live AI composition",
    exact: true,
  });
  for (let i = 0; i < 3; i++) {
    await expect(button).toBeEnabled();
    const response = page.waitForResponse(
      (r) =>
        r.url().includes("/api/analyze") && r.request().method() === "POST",
    );
    await button.focus();
    await page.keyboard.press("Enter");
    expect((await (await response).json()).liveState).toBe("validated");
    await expect(
      page.getByText(
        "Live response validated for this request; engineering review remains required",
        { exact: true },
      ),
    ).toBeVisible();
  }
  expect(
    (
      await (
        await request.get(process.env.CALIBER_TEST_PROVIDER! + "/calls")
      ).json()
    ).calls,
  ).toBe(3);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page
    .locator(".quality-card")
    .filter({
      has: page.getByRole("heading", { name: "Live AI Model Gateway" }),
    })
    .screenshot({ path: "screenshots/direct-gateway.png" });
  await page
    .getByRole("button", {
      name: "Evidence replay - no live AI call",
      exact: true,
    })
    .click();
  await expect(page.locator(".hypothesis-card").first()).toBeVisible();
  expect(
    (
      await (
        await request.get(process.env.CALIBER_TEST_PROVIDER! + "/calls")
      ).json()
    ).calls,
  ).toBe(3);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  const denied = await request.post("/api/analyze", {
    headers: { "x-forwarded-proto": "https", origin: "https://other.test" },
    data: {
      asset: "KO-3201",
      mode: "prospective",
      asOf: "2026-04-22 23:59:59",
      live: true,
    },
  });
  expect(denied.status()).toBe(403);
  expect(
    (
      await (
        await request.get(process.env.CALIBER_TEST_PROVIDER! + "/calls")
      ).json()
    ).calls,
  ).toBe(3);
  expect(
    JSON.stringify(await (await request.get("/api/status")).json()),
  ).not.toContain("direct-fixture-key");
});
