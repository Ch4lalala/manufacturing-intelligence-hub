import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
fs.mkdirSync("screenshots", { recursive: true });
async function ready(page: Page, view = "Executive Overview") {
  await expect(
    page.getByRole("heading", { name: view, exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Loading verified source scope…")).toHaveCount(0);
}
async function goto(page: Page, url: string, view: string) {
  await page.goto(url);
  await ready(page, view);
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
}
test("Five operational views, desktop screenshots, source drawer keyboard and accessibility", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const [id, label] of [
    ["overview", "Executive Overview"],
    ["data", "Data & KPI Map"],
    ["problems", "Problem Tank"],
    ["investigation", "Investigation"],
    ["actions", "Action Tracker"],
  ]) {
    await goto(page, `/?view=${id}`, label);
    await noOverflow(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `screenshots/${id}-1440.png`,
      fullPage: true,
    });
    const a11y = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      a11y.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
  await goto(page, "/", "Executive Overview");
  const source = page
    .getByRole("button", { name: "Definition & source", exact: true })
    .first();
  await source.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page
      .getByRole("dialog")
      .getByText("Incident Database", { exact: false })
      .first(),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "screenshots/source-drawer.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(source).toBeFocused();
  expect(errors).toEqual([]);
});
test("380-row search/filter, n/a rows, empty state and qualified source detail", async ({
  page,
}) => {
  await goto(page, "/?view=problems&tank=register", "Problem Tank");
  await expect(page.getByText(/380 matching source records/)).toBeVisible();
  const search = page.getByRole("searchbox", {
    name: "Search 380 register rows",
  });
  await search.fill("n/a");
  await expect(page.getByText(/226 matching source records/)).toBeVisible();
  await search.fill("not-a-real-case");
  await expect(
    page.getByText("No incidents match these filters."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear search 380 register rows" })
    .click();
  await expect(search).toHaveValue("");
  await page.getByLabel("Exact asset tag").fill("KO-3201");
  await expect(page.getByText(/1 matching source records/)).toBeVisible();
  await page.getByRole("button", { name: "Open case", exact: true }).click();
  await ready(page, "Investigation");
  await expect(
    page.getByText("incident-row-5", { exact: false }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Vibration comparison blocked" }),
  ).toBeVisible();
  await page.goBack();
  await ready(page, "Problem Tank");
  await expect(page.getByLabel("Exact asset tag")).toHaveValue("KO-3201");
});
test("Every asset and all report slides navigable; HE/PM contradictions remain visible", async ({
  page,
}) => {
  for (const tag of ["PU-2101B", "KO-3201", "PM-4405B", "HE-3301", "BL-5702"]) {
    await goto(page, `/?view=investigation&asset=${tag}`, "Investigation");
    await expect(
      page.getByRole("heading", { name: `Historical RCA library · ${tag}` }),
    ).toBeVisible();
    for (const slide of Array.from({ length: 11 }, (_, i) => i + 1)) {
      await page
        .getByLabel("RCA slide", { exact: true })
        .selectOption(String(slide));
      await expect(
        page.getByRole("button", {
          name: "Open full slide excerpt & original",
        }),
      ).toBeVisible();
    }
    if (tag === "HE-3301") {
      await expect(page.getByText(/13 hourly OFF samples, each/)).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: "screenshots/he-asset-plant.png",
        fullPage: true,
      });
    }
    if (tag === "PM-4405B")
      await expect(
        page.getByRole("heading", {
          name: "Standby supply has conflicting evidence",
        }),
      ).toBeVisible();
  }
});
test("Pre-event UI and API exclude current report, future readings and outcome summaries", async ({
  page,
  request,
}) => {
  const r = await request.get(
    "/api/case?asset=KO-3201&mode=prospective&asOf=2026-04-22%2023:59:59",
  );
  const b = await r.json();
  expect(b.report).toBeNull();
  expect(b.incident).toBeNull();
  expect(b.asset.eventDate).toBe("");
  expect(JSON.stringify(b)).not.toContain(
    "Journal-bearing babbitt distress caused",
  );
  await goto(
    page,
    "/?view=investigation&asset=KO-3201&mode=prospective&asOf=2026-04-22%2023:59:59",
    "Investigation",
  );
  await page
    .getByRole("button", {
      name: "Evidence replay - no live AI call",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Lubrication condition may be contributing to bearing distress",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Historical RCA library/ }),
  ).toHaveCount(0);
  await expect(page.getByText(/known cooler leak/i)).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText("1530");
  await expect(page.locator("main")).not.toContainText("1,800");
  await expect(
    page.getByRole("button", { name: "Executive Overview", exact: true }),
  ).toBeDisabled();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "screenshots/prospective-replay.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Return to historical review", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Historical RCA library/ }),
  ).toBeVisible();
});
test("KO action loop, gated approval/verification, persistence, rejection reason and reset", async ({
  page,
}) => {
  await goto(page, "/?view=investigation&asset=KO-3201", "Investigation");
  await page
    .getByRole("button", {
      name: "Evidence replay - no live AI call",
      exact: true,
    })
    .click();
  await expect(
    page.getByText(/Retrospective review: the report finding/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create reviewed action draft" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Accept for action review", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Create reviewed action draft" })
    .click();
  await ready(page, "Action Tracker");
  await page
    .getByRole("button", { name: "Approve action", exact: true })
    .click();
  await expect(page.getByText(/Approval needs owner/)).toBeVisible();
  await page
    .getByLabel("Proposed owner role (required for approval)")
    .fill("Reliability engineer");
  await page
    .getByLabel("Demo due date (required for approval)")
    .fill("2026-10-05");
  await page
    .getByRole("button", { name: "Approve action", exact: true })
    .click();
  await page.getByRole("button", { name: "Start action", exact: true }).click();
  await page
    .getByRole("button", { name: "Submit for verification", exact: true })
    .click();
  await expect(page.getByText(/Record completion evidence/)).toBeVisible();
  await page
    .getByLabel("Completion evidence / review record")
    .fill(
      "Demo review EV-KO: measurement units and sample timing reviewed; policy version requires an engineering sign-off. Verification recorded for the prototype exercise.",
    );
  await page
    .getByRole("button", { name: "Submit for verification", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Review closure", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Confirm verified closure" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Keep pending" }).click();
  await page.getByLabel("Simulated role").selectOption("Engineering reviewer");
  await page
    .getByRole("button", { name: "Review closure", exact: true })
    .click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Confirm verified closure" }).click();
  await expect(
    page.getByText(/Action closed with completion evidence/),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "screenshots/ko-verified-action.png",
    fullPage: true,
  });
  await page.reload();
  await ready(page, "Action Tracker");
  await expect(
    page.getByText(/Verified by Engineering reviewer/),
  ).toBeVisible();
  await expect(page.getByText(/Action change history/)).toBeVisible();
  await page.getByRole("button", { name: "Reset prototype workspace" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Reset workspace", exact: true })
    .click();
  await expect(page.getByText("No prototype actions yet")).toBeVisible();
  await page.reload();
  await ready(page, "Action Tracker");
  await expect(page.getByText("No prototype actions yet")).toBeVisible();
});
test("Synthetic utility assumptions, zero-output state and persistence forecast stay isolated", async ({
  page,
}) => {
  await goto(page, "/", "Executive Overview");
  await expect(page.getByText("Unavailable", { exact: true })).toHaveCount(3);
  await page
    .getByRole("button", { name: "Open illustrative utilities" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Illustrative utility assumptions" }),
  ).toBeVisible();
  await page.getByLabel("Matched output / hour (ton)").fill("0");
  await page.getByRole("button", { name: "Apply assumptions" }).click();
  await expect(page.getByText("Unavailable", { exact: true })).toHaveCount(1);
  await expect(
    page.getByText("61,886.46", { exact: false }).first(),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "screenshots/illustrative-utilities.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Return to baseline utilities" })
    .click();
  await expect(page.getByText("Unavailable", { exact: true })).toHaveCount(3);
});
test("Live request without configuration is explicit replay; errors remain recoverable", async ({
  page,
}) => {
  await goto(page, "/?view=investigation", "Investigation");
  await page.route("**/api/analyze", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        caseId: "KO-3201",
        mode: "historical",
        asOf: "2026-04-30 23:00:00",
        summary: "Replay due to missing test configuration",
        hypotheses: [],
        actions: [],
        limitations: [],
        execution: "replay",
        message:
          "Evidence replay - no live AI call. Live API not-tested: configure the server API key and exact model ID.",
        stages: [],
      }),
    }),
  );
  await page
    .getByRole("button", { name: "Request live AI composition" })
    .click();
  await expect(
    page.locator(".notice").filter({ hasText: /Live API not-tested/ }),
  ).toBeVisible();
  await page.unroute("**/api/analyze");
  await page.route("**/api/analyze", (r) =>
    r.fulfill({ status: 500, body: "error" }),
  );
  await page
    .getByRole("button", { name: "Request live AI composition" })
    .click();
  await expect(
    page.getByText(/Analysis request could not finish/),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Evidence replay - no live AI call",
      exact: true,
    })
    .click();
  await expect(
    page.getByText(/Retrospective review: the report finding/),
  ).toBeVisible();
});
test("Responsive layouts, keyboard navigation, reduced motion and source failure recovery", async ({
  page,
}) => {
  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [id, label] of [
      ["overview", "Executive Overview"],
      ["data", "Data & KPI Map"],
      ["problems", "Problem Tank"],
      ["investigation", "Investigation"],
      ["actions", "Action Tracker"],
    ]) {
      await goto(page, `/?view=${id}`, label);
      await noOverflow(page);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: `screenshots/${id}-${width}.png`,
        fullPage: true,
      });
    }
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await goto(page, "/?view=data", "Data & KPI Map");
  await page.route("**/api/source?*", (r) =>
    r.fulfill({ status: 503, body: "unavailable" }),
  );
  await page
    .getByRole("button", { name: "Open source content", exact: true })
    .first()
    .click();
  await expect(page.getByText(/Unable to load the excerpt/)).toBeVisible();
  await page.unroute("**/api/source?*");
  await page.getByRole("button", { name: "Retry excerpt" }).click();
  await expect(page.getByText(/Unable to load the excerpt/)).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe(
    "BODY",
  );
});

test("Episode acknowledgement/group/reopen, owner edits, native select keyboard and reset history", async ({
  page,
}) => {
  await goto(
    page,
    "/?view=problems&tank=conditions&episodeAsset=KO-3201",
    "Problem Tank",
  );
  await expect(
    page.getByRole("heading", { name: "KO-3201 · Condition family" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Acknowledge episode" }).click();
  await expect(
    page.getByText("Acknowledged · local review", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Group supporting samples" }).click();
  await expect(
    page.getByText("Grouped · local review", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reopen episode" }).click();
  await expect(
    page.getByRole("heading", { name: "KO-3201 · Condition family" }),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Data & KPI Map", exact: true })
    .click();
  await ready(page, "Data & KPI Map");
  const owner = page.getByLabel("Proposed owner · PM Compliance (%)", {
    exact: true,
  });
  await owner.fill("Maintenance data steward");
  await owner
    .locator("..")
    .locator("..")
    .getByRole("button", { name: "Save proposed owner" })
    .click();
  await page.reload();
  await ready(page, "Data & KPI Map");
  await expect(owner).toHaveValue("Maintenance data steward");
  const asset = page.getByLabel("Asset scenario", { exact: true });
  await asset.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page
    .getByRole("button", { name: "Reset prototype workspace", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Reset workspace", exact: true })
    .click();
  await expect(
    page.getByLabel("Proposed owner · PM Compliance (%)", { exact: true }),
  ).toHaveValue("Reliability data steward");
  const w = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("caliber-workspace-v1") ?? "{}"),
  );
  expect(w.history).toEqual([]);
  expect(w.episodes).toEqual({});
  expect(w.owners).toEqual({});
});
test("Read-only server source whitelist and actual missing-config fallback expose no secrets", async ({
  request,
}) => {
  expect(
    (await request.get("/api/source?file=../../.env.local")).status(),
  ).toBe(404);
  expect((await request.get("/api/case?asset=unknown")).status()).toBe(400);
  const source = await request.get(
    "/api/source?file=sources%2Fbaseline%2Fequipment%2FEquipment%20Performance%20-%20RCA2%20KO-3201.xlsx&sheet=Condition%20History&cell=A21%3AH22",
  );
  expect(source.ok()).toBe(true);
  const content = await source.json();
  expect(content.excerpt).toContain("1530");
  expect(content.excerpt).toContain("1372.791");
  const status = await (await request.get("/api/status")).json();
  expect(Object.keys(status).sort()).toEqual(["configured", "liveTested"]);
  if (!status.configured) {
    const response = await request.post("/api/analyze", {
      data: {
        asset: "KO-3201",
        mode: "historical",
        asOf: "2026-04-30 23:00:00",
        live: true,
      },
    });
    const body = await response.json();
    expect(body.execution).toBe("replay");
    expect(body.message).toContain("not-tested");
  }
});
