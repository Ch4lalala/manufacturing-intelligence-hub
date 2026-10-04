import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
const origin = process.env.CALIBER_TEST_HTTPS_ORIGIN!;
async function control(
  request: APIRequestContext,
  action: string,
  id?: string,
) {
  const response = await request.post(
    process.env.CALIBER_TEST_GATEWAY! + "/test-control",
    { data: { action, id } },
  );
  expect(response.ok()).toBe(true);
  return response.json();
}
async function unlock(page: Page) {
  await page
    .getByLabel("Demo passcode", { exact: true })
    .fill("browser-fixture-passcode");
  const response = page.waitForResponse(
    (r) =>
      r.url().includes("/api/demo-session") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Unlock live access", exact: true })
    .click();
  const result = await response;
  expect(result.status(), await result.text()).toBe(200);
  await expect(
    page.getByRole("button", { name: "Lock live access", exact: true }),
  ).toBeVisible();
}
test.beforeEach(async ({ page, request }) => {
  fs.mkdirSync("screenshots", { recursive: true });
  await control(request, "reset");
  // Simulate HTTPS ingress to the private HTTP Next server. Only headers are
  // rewritten: all session/analysis/status responses come from the real build.
  await page.route("**/api/**", async (route) => {
    const response = await route.fetch({
      headers: {
        ...(await route.request().allHeaders()),
        "x-forwarded-proto": "https",
        origin,
      },
    });
    await route.fulfill({ response });
  });
  await page.goto(
    "/?view=investigation&asset=KO-3201&mode=prospective&asOf=2026-04-22%2023:59:59",
  );
  await expect(page.getByLabel("Demo passcode", { exact: true })).toBeVisible();
});
test("Hosted production login, validated fixture composition, Secure cookie, keyboard and logout", async ({
  page,
  context,
  request,
}) => {
  await page
    .getByLabel("Demo passcode", { exact: true })
    .fill("wrong-fixture-passcode");
  await page
    .getByRole("button", { name: "Unlock live access", exact: true })
    .click();
  await expect(
    page
      .getByText("Demo access could not be unlocked. Check the passcode.", {
        exact: true,
      })
      .first(),
  ).toBeVisible();
  await unlock(page);
  const cookie = (await context.cookies()).find(
    (c) => c.name === "caliber-live-demo",
  )!;
  expect(cookie.httpOnly).toBe(true);
  expect(cookie.secure).toBe(true);
  expect(cookie.sameSite).toBe("Strict");
  const button = page.getByRole("button", {
    name: "Request live AI composition",
    exact: true,
  });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText(
      "Live response validated for this request; engineering review remains required",
      { exact: true },
    ),
  ).toBeVisible();
  expect((await control(request, "state")).providerCalls).toBe(1);
  await expect(page.locator(".hypothesis-card").first()).toBeVisible();
  await page.screenshot({
    path: "screenshots/hosted-validated-fixture.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page
    .getByRole("button", { name: "Lock live access", exact: true })
    .click();
  await expect(page.getByLabel("Demo passcode", { exact: true })).toBeVisible();
  await expect(button).toBeDisabled();
  await page.reload();
  await expect(page.getByLabel("Demo passcode", { exact: true })).toBeVisible();
});
test("Revoked hosted session returns to the passcode form without a provider call or losing the selected cutoff", async ({
  page,
  context,
  request,
}) => {
  await unlock(page);
  const cookie = (await context.cookies()).find(
    (c) => c.name === "caliber-live-demo",
  )!;
  const payload = JSON.parse(
    Buffer.from(cookie.value.split(".")[0], "base64url").toString(),
  );
  await control(request, "revoke", payload.id);
  await page
    .getByRole("button", { name: "Request live AI composition", exact: true })
    .click();
  await expect(page.getByLabel("Demo passcode", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Request live AI composition",
      exact: true,
    }),
  ).toBeDisabled();
  expect((await control(request, "state")).providerCalls).toBe(0);
  await expect(
    page.getByLabel("As of (source-local; timezone unknown)", { exact: true }),
  ).toHaveValue("2026-04-22T23:59:59");
  await page.screenshot({
    path: "screenshots/hosted-reauth.png",
    fullPage: true,
    animations: "disabled",
  });
  await unlock(page);
  await expect(
    page.getByRole("button", {
      name: "Request live AI composition",
      exact: true,
    }),
  ).toBeEnabled();
});
test("Shared hosted quota and Redis outage preserve replay and recoverable access at a narrow viewport", async ({
  page,
  request,
}) => {
  await unlock(page);
  const button = page.getByRole("button", {
    name: "Request live AI composition",
    exact: true,
  });
  for (let i = 0; i < 2; i++) {
    const response = page.waitForResponse(
      (r) =>
        r.url().includes("/api/analyze") && r.request().method() === "POST",
    );
    await button.click();
    expect((await (await response).json()).liveState).toBe("validated");
    await expect(button).toBeEnabled();
  }
  const denied = page.waitForResponse(
    (r) => r.url().includes("/api/analyze") && r.status() === 429,
  );
  await button.click();
  await denied;
  expect((await control(request, "state")).providerCalls).toBe(2);
  await control(request, "down");
  await button.click();
  await expect(
    page.getByRole("button", { name: "Retry demo access status", exact: true }),
  ).toBeVisible();
  await expect(button).toBeDisabled();
  await page
    .getByRole("button", {
      name: "Evidence replay - no live AI call",
      exact: true,
    })
    .click();
  await expect(page.locator(".hypothesis-card").first()).toBeVisible();
  expect((await control(request, "state")).providerCalls).toBe(2);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "screenshots/hosted-store-outage-390.png",
    fullPage: true,
    animations: "disabled",
  });
  await control(request, "up");
  await page
    .getByRole("button", { name: "Retry demo access status", exact: true })
    .click();
  await expect(button).toBeEnabled();
  const stillLimited = page.waitForResponse(
    (r) => r.url().includes("/api/analyze") && r.status() === 429,
  );
  await button.click();
  await stillLimited;
  expect((await control(request, "state")).providerCalls).toBe(2);
  const wrongOrigin = await request.post("/api/demo-session", {
    headers: { "x-forwarded-proto": "https", origin: "https://attacker.test" },
    data: { passcode: "browser-fixture-passcode" },
  });
  expect(wrongOrigin.status()).toBe(403);
});
