import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { actionScopeWorkspace } from "./fixtures";
fs.mkdirSync("screenshots", { recursive: true });
async function ready(page: Page, view = "Executive Overview") {
  await expect(
    page.getByRole("heading", { name: view, exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Loading verified source scope…")).toHaveCount(0);
  await expect(page.locator('nav button[aria-current="page"]')).toHaveCSS(
    "background-color",
    "rgb(239, 246, 255)",
  );
}
async function goto(page: Page, url: string, view: string) {
  await page.goto(url);
  await ready(page, view);
}
async function choose(page: Page, label: string, value: string) {
  const text = await page
    .locator(`select[aria-label=${JSON.stringify(label)}] option`)
    .evaluateAll(
      (options, v) =>
        options.find((o) => (o as HTMLOptionElement).value === v)?.textContent,
      value,
    );
  expect(text).toBeTruthy();
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page
    .getByRole("listbox", { name: label, exact: true })
    .getByRole("option", { name: text!, exact: true })
    .click();
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
}
async function metricEvidence(page: Page, label: string, value: number) {
  const card = page
    .locator(".metric")
    .filter({ has: page.getByText(label, { exact: true }) });
  await expect(card.locator(".metric-value")).toHaveText(String(value));
  await card
    .getByRole("button", { name: "Definition & local evidence", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: label, exact: true }),
  ).toBeVisible();
  return {
    dialog,
    evidence: JSON.parse(await dialog.locator("pre.excerpt").innerText()),
  };
}
test("Action metric drawers explain only their scoped dataset; historical list filters do not change card totals", async ({
  page,
  request,
}) => {
  const bundle = await (await request.get("/api/case?asset=KO-3201")).json();
  const workspace = actionScopeWorkspace(bundle.version);
  await page.addInitScript(
    (w) => localStorage.setItem("caliber-workspace-v1", JSON.stringify(w)),
    workspace,
  );
  await goto(
    page,
    "/?view=actions&asset=KO-3201&actionAsset=HE-3301",
    "Action Tracker",
  );
  await expect(page.locator(".action-card")).toHaveCount(1);
  await choose(page, "Action state", "Closed");
  await expect(page.locator(".action-card")).toHaveCount(0);
  const historical = await metricEvidence(page, "Local action drafts", 9);
  expect(historical.evidence.actions.map((a: { id: string }) => a.id)).toEqual(
    workspace.actions.map((a) => a.id),
  );
  await page.keyboard.press("Escape");
  const historicalClosures = await metricEvidence(
    page,
    "Verified local closures",
    4,
  );
  expect(
    historicalClosures.evidence.actions.map((a: { id: string }) => a.id),
  ).toEqual([
    "historical-closed",
    "same-closed",
    "other-cutoff",
    "legacy-closed",
  ]);
  await page.keyboard.press("Escape");
  const historicalEpisodes = await metricEvidence(
    page,
    "Acknowledged local episodes",
    1,
  );
  expect(historicalEpisodes.evidence).toMatchObject({
    actions: [],
    episodes: { "historical-ack": "Acknowledged" },
  });
  await page.keyboard.press("Escape");
  await goto(
    page,
    "/?view=actions&asset=KO-3201&mode=prospective&asOf=2026-04-22%2023:59:59",
    "Action Tracker",
  );
  await expect(page.locator(".action-card")).toHaveCount(5);
  const definitions: [string, number, string[]][] = [
    [
      "Local action drafts",
      5,
      [
        "same-draft",
        "same-pending",
        "same-closed",
        "same-unreviewed",
        "same-no-evidence",
      ],
    ],
    ["Pending verification", 1, ["same-pending"]],
    ["Verified local closures", 1, ["same-closed"]],
    ["Acknowledged local episodes", 0, []],
  ];
  for (const [label, value, ids] of definitions) {
    const { dialog, evidence } = await metricEvidence(page, label, value);
    expect(evidence.actions.map((a: { id: string }) => a.id)).toEqual(ids);
    expect(evidence.episodes).toEqual({});
    await expect(dialog).toContainText("2026-04-22 23:59:59");
    for (const id of [
      "historical-closed",
      "other-asset",
      "other-cutoff",
      "legacy-closed",
      "historical-ack",
    ])
      await expect(dialog).not.toContainText(id);
    if (label === "Verified local closures")
      await page.screenshot({
        animations: "disabled",
        path: "screenshots/action-scope-matched-drawer.png",
      });
    await page.keyboard.press("Escape");
  }
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("caliber-workspace-v1")!),
    ),
  ).toEqual(JSON.parse(JSON.stringify(workspace)));
  await page.setViewportSize({ width: 390, height: 900 });
  await metricEvidence(page, "Verified local closures", 1);
  await noOverflow(page);
  await page.screenshot({
    animations: "disabled",
    path: "screenshots/action-scope-drawer-390.png",
  });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page
      .locator(".metric")
      .filter({
        has: page.getByText("Verified local closures", { exact: true }),
      })
      .getByRole("button"),
  ).toBeFocused();
});
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
      animations: "disabled",
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
    animations: "disabled",
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
    name: "Search",
    exact: true,
  });
  await search.fill("n/a");
  await expect(page.getByText(/226 matching source records/)).toBeVisible();
  await search.fill("not-a-real-case");
  await expect(
    page.getByText("No incidents match these filters."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
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
      await choose(page, "RCA slide", String(slide));
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
        animations: "disabled",
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
  // Native asset selection must retain each full historical window when no
  // cutoff was requested, rather than applying the previous asset's reference.
  for (const tag of ["KO-3201", "HE-3301"]) {
    await choose(page, "Asset scenario", tag);
    await expect(
      page.getByRole("heading", { name: `Historical RCA library · ${tag}` }),
    ).toBeVisible();
    await expect(page.getByText(/720 source observations/)).toBeVisible();
    expect(new URL(page.url()).searchParams.has("asOf")).toBe(false);
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
    animations: "disabled",
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
    page.getByRole("button", {
      name: "Create reviewed action draft",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Accept for action review", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Create reviewed action draft", exact: true })
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
  await choose(page, "Simulated role", "Engineering reviewer");
  await page.setViewportSize({ width: 390, height: 900 });
  await page
    .getByRole("button", { name: "Review closure", exact: true })
    .click();
  await page.getByRole("checkbox").check();
  await noOverflow(page);
  await page.screenshot({
    animations: "disabled",
    path: "screenshots/redesign-closure-390.png",
  });
  await page.getByRole("button", { name: "Confirm verified closure" }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(
    page.getByText(/Action closed with completion evidence/),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    animations: "disabled",
    path: "screenshots/ko-verified-action.png",
    fullPage: true,
  });
  await page.reload();
  await ready(page, "Action Tracker");
  await expect(
    page.locator(".action-head .badge[data-tone=Closed]"),
  ).toBeVisible();
  const persistedAction = await page.evaluate(
    () => JSON.parse(localStorage.getItem("caliber-workspace-v1")!).actions[0],
  );
  expect(persistedAction.state).toBe("Closed");
  expect(persistedAction.reviewer).toBe("Engineering reviewer");
  expect(persistedAction.history.length).toBeGreaterThanOrEqual(5);
  await expect(
    page.getByLabel("Completion evidence / review record"),
  ).toHaveValue(persistedAction.completionEvidence);
  const historicalClosure = await metricEvidence(
    page,
    "Verified local closures",
    1,
  );
  expect(historicalClosure.evidence.actions).toHaveLength(1);
  expect(historicalClosure.evidence.actions[0].reviewer).toBe(
    "Engineering reviewer",
  );
  expect(historicalClosure.evidence.actions[0].completionEvidence).toContain(
    "Demo review EV-KO",
  );
  await page.keyboard.press("Escape");
  await goto(
    page,
    "/?view=actions&asset=KO-3201&mode=prospective&asOf=2026-04-22%2023:59:59",
    "Action Tracker",
  );
  for (const label of [
    "Local action drafts",
    "Pending verification",
    "Verified local closures",
    "Acknowledged local episodes",
  ]) {
    const { dialog, evidence } = await metricEvidence(page, label, 0);
    // Same browser workspace still contains the historical Closed action.
    // The actual drawer must match the zero-valued pre-event metric.
    if (label === "Local action drafts")
      await page.screenshot({
        animations: "disabled",
        path: "screenshots/action-scope-zero-drawer.png",
      });
    expect(evidence.actions).toEqual([]);
    expect(evidence.episodes).toEqual({});
    await expect(dialog).not.toContainText("Demo review EV-KO");
    await expect(dialog).not.toContainText("Engineering reviewer");
    await page.keyboard.press("Escape");
  }
  await goto(page, "/?view=actions&asset=KO-3201", "Action Tracker");
  await expect(
    page.locator(".action-head .badge[data-tone=Closed]"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset workspace" }).click();
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
  await expect(
    page.locator(".metric-value").filter({ hasText: /^Unavailable$/ }),
  ).toHaveCount(3);
  await page
    .getByRole("button", { name: "Open illustrative utilities" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Illustrative utility assumptions" }),
  ).toBeVisible();
  await page.getByLabel("Matched output / hour (ton)").fill("0");
  await page.getByRole("button", { name: "Apply assumptions" }).click();
  await expect(
    page.locator(".metric-value").filter({ hasText: /^Unavailable$/ }),
  ).toHaveCount(1);
  await expect(
    page.getByText("61,886.46", { exact: false }).first(),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    animations: "disabled",
    path: "screenshots/illustrative-utilities.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Return to baseline utilities" })
    .click();
  await expect(
    page.locator(".metric-value").filter({ hasText: /^Unavailable$/ }),
  ).toHaveCount(3);
});
test("Live request without configuration is explicit replay; errors remain recoverable", async ({
  page,
}) => {
  await page.route("**/api/demo-session", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        enabled: true,
        authenticated: true,
        reason: "Mocked demo access",
      }),
    }),
  );
  const fixture = await (
    await page.request.post("/api/analyze", {
      data: {
        asset: "KO-3201",
        mode: "historical",
        asOf: "2026-04-30 23:00:00",
        live: false,
      },
    })
  ).json();
  await goto(page, "/?view=investigation", "Investigation");
  await page.route("**/api/analyze", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ...fixture,
        execution: "replay",
        liveState: "blocked",
        message:
          "Evidence replay - no live AI call. Live API not-tested: missing mock configuration.",
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
  for (const width of [1280, 1024, 390]) {
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
      const active = page.locator('nav button[aria-current="page"]');
      await expect(active).toHaveText(label);
      if (width === 390) {
        const bounds = await active.boundingBox();
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        animations: "disabled",
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

test("Episode acknowledgement/group/reopen, owner edits, select keyboard and reset history", async ({
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
  await page
    .locator(".kpi-definition")
    .filter({ hasText: "PM Compliance (%)" })
    .locator("summary")
    .click();
  const owner = page.getByLabel("Proposed owner · PM Compliance (%)", {
    exact: true,
  });
  await owner.fill("Maintenance data steward");
  await page
    .locator(".kpi-definition")
    .filter({ hasText: "PM Compliance (%)" })
    .getByRole("button", { name: "Save proposed owner" })
    .click();
  await page.reload();
  await ready(page, "Data & KPI Map");
  await page
    .locator(".kpi-definition")
    .filter({ hasText: "PM Compliance (%)" })
    .locator("summary")
    .click();
  await expect(owner).toHaveValue("Maintenance data steward");
  const asset = page.getByRole("combobox", {
    name: "Asset scenario",
    exact: true,
  });
  await asset.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page
    .getByRole("button", { name: "Reset workspace", exact: true })
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
  expect(Object.keys(status).sort()).toEqual([
    "configured",
    "liveAccess",
    "liveTested",
  ]);
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
    expect(body.liveState).toBe("blocked");
  }
});

test("Problem Tank carries exact pre-event cutoff into Investigation at midnight and end-of-day", async ({
  page,
  request,
}) => {
  for (const [time, last] of [
    ["2026-04-22 00:00:00", "2026-04-15"],
    ["2026-04-22 23:59:59", "2026-04-22"],
  ]) {
    const q = new URLSearchParams({
      view: "problems",
      tank: "conditions",
      mode: "prospective",
      asset: "KO-3201",
      episodeAsset: "KO-3201",
      asOf: time,
    });
    await goto(page, "/?" + q, "Problem Tank");
    await expect(
      page.getByRole("heading", { name: "KO-3201 · Condition family" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Historical register · 380 records" }),
    ).toBeDisabled();
    const ep = await (
      await request.get(
        "/api/episodes?" +
          new URLSearchParams({
            mode: "prospective",
            asset: "KO-3201",
            asOf: time,
          }),
      )
    ).json();
    await expect(
      page.locator(".episode-card").filter({ hasText: "KO-3201" }),
    ).toContainText(last);
    await page
      .getByRole("button", { name: "Investigate KO-3201", exact: true })
      .click();
    await ready(page, "Investigation");
    const url = new URL(page.url());
    expect(url.searchParams.get("asOf")).toBe(time);
    expect(url.searchParams.get("mode")).toBe("prospective");
    const bundle = await (
      await request.get(
        "/api/case?" +
          new URLSearchParams({
            mode: "prospective",
            asset: "KO-3201",
            asOf: time,
          }),
      )
    ).json();
    expect(bundle.conditions.at(-1).date).toBe(last);
    expect(bundle.episodes[0].samples).toEqual(ep[0].samples);
    await page
      .getByRole("button", {
        name: "Evidence replay - no live AI call",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Signal Observations",
      }),
    ).toBeVisible();
    await expect(page.locator("main")).not.toContainText("1,800");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      animations: "disabled",
      path: time.includes("00:00:00")
        ? "screenshots/repair-midnight.png"
        : "screenshots/repair-end-of-day.png",
      fullPage: true,
    });
  }
});
test("Normal-only replay offers no diagnosis or draft; second hypothesis can create a scoped pre-event action", async ({
  page,
}) => {
  await goto(
    page,
    "/?view=investigation&mode=prospective&asset=KO-3201&asOf=2025-12-10%2023:59:59",
    "Investigation",
  );
  await page
    .getByRole("button", {
      name: "Evidence replay - no live AI call",
      exact: true,
    })
    .click();
  await expect(
    page.getByText(/Insufficient anomaly evidence\. Eligible/),
  ).toBeVisible();
  await expect(page.locator(".hypothesis-card")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Create reviewed action draft/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Request live AI composition" }),
  ).toBeDisabled();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    animations: "disabled",
    path: "screenshots/repair-insufficient.png",
    fullPage: true,
  });
  await goto(
    page,
    "/?view=investigation&mode=prospective&asset=KO-3201&asOf=2026-04-22%2023:59:59",
    "Investigation",
  );
  await page
    .getByRole("button", {
      name: "Evidence replay - no live AI call",
      exact: true,
    })
    .click();
  const second = page.locator(".hypothesis-card").nth(1);
  const title = await second.locator("h3").first().innerText();
  await second
    .getByRole("button", { name: "Accept for action review", exact: true })
    .click();
  await second
    .getByRole("button", { name: /Create reviewed action draft/ })
    .click();
  await ready(page, "Action Tracker");
  await expect(page.locator(".action-card")).toContainText(title);
  await expect(
    page.getByRole("heading", { name: /Imported historical report actions/ }),
  ).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText(
    "leaking lube-oil cooler",
  );
  await page.reload();
  await ready(page, "Action Tracker");
  await expect(page.locator(".action-card")).toContainText(title);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    animations: "disabled",
    path: "screenshots/repair-second-hypothesis-action.png",
    fullPage: true,
  });
});
test("Empty historical observation cutoff keeps Data Map metadata sources navigable", async ({
  page,
}) => {
  await goto(
    page,
    "/?view=data&asset=KO-3201&asOf=2025-01-01%2000:00:00",
    "Data & KPI Map",
  );
  await expect(
    page.getByText(/^Hourly coverage: No eligible hourly observations/),
  ).toBeVisible();
  await expect(page.getByText(/^Hourly coverage:/)).toContainText(
    "No eligible weekly observations.",
  );
  await page.getByRole("button", { name: "PI Tag row 2", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("KO3201_FEED");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Investigation", exact: true })
    .click();
  await ready(page, "Investigation");
  await page
    .getByRole("button", {
      name: "Evidence replay - no live AI call",
      exact: true,
    })
    .click();
  await expect(
    page.getByText(/No eligible observations\. Choose/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Create reviewed action draft/ }),
  ).toHaveCount(0);
});
test("Demo access UI masks passcode, handles auth errors, unlocks explicitly and processes guarded quota fallback", async ({
  page,
  request,
}) => {
  let unlocked = false,
    failStatusOnce = true;
  await page.route("**/api/demo-session", (route) => {
    const method = route.request().method();
    if (method === "GET" && failStatusOnce) {
      failStatusOnce = false;
      return route.fulfill({ status: 503, body: "unavailable" });
    }
    if (method === "POST") {
      if (route.request().postDataJSON().passcode !== "browser-test-only")
        return route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Demo access could not be unlocked. Check the passcode.",
          }),
        });
      unlocked = true;
    } else if (method === "DELETE") unlocked = false;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        enabled: true,
        authenticated: unlocked,
        reason: "Mocked local access",
      }),
    });
  });
  await goto(page, "/?view=investigation&asset=KO-3201", "Investigation");
  await page
    .getByRole("button", { name: "Retry demo access status", exact: true })
    .click();
  const field = page.getByLabel("Demo passcode", { exact: true });
  await expect(field).toHaveAttribute("type", "password");
  await page
    .getByRole("button", { name: "Show demo passcode", exact: true })
    .click();
  await expect(field).toHaveAttribute("type", "text");
  await page
    .getByRole("button", { name: "Hide demo passcode", exact: true })
    .click();
  await field.fill("wrong-test-value");
  await page
    .getByRole("button", { name: "Unlock live access", exact: true })
    .click();
  await expect(
    page
      .getByText("Demo access could not be unlocked. Check the passcode.")
      .first(),
  ).toBeVisible();
  await field.fill("browser-test-only");
  await page
    .getByRole("button", { name: "Unlock live access", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Request live AI composition" }),
  ).toBeEnabled();
  const result = await (
    await request.post("/api/analyze", {
      data: {
        asset: "KO-3201",
        mode: "historical",
        asOf: "2026-04-30 23:00:00",
        live: false,
      },
    })
  ).json();
  await page.route("**/api/analyze", (r) =>
    r.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({
        ...result,
        liveState: "blocked",
        message:
          "Evidence replay - no live AI call. Live demo usage limit reached.",
      }),
    }),
  );
  await page
    .getByRole("button", { name: "Request live AI composition" })
    .click();
  await expect(page.getByText(/Live demo usage limit reached/)).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    animations: "disabled",
    path: "screenshots/repair-demo-access.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Lock live access", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Request live AI composition" }),
  ).toBeDisabled();
  expect(
    await page.evaluate(() => localStorage.getItem("caliber-workspace-v1")),
  ).not.toContain("browser-test-only");
});

test("Industrial light shell, independent catalog windows, source download, threshold direction and recoverable loading", async ({
  page,
  request,
}) => {
  const raw = JSON.parse(fs.readFileSync("data/normalized.json", "utf8"));
  const bundle = await (await request.get("/api/case?asset=KO-3201")).json();
  let release!: () => void;
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/case?*", async (route) => {
    await hold;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(bundle),
    });
  });
  await page.goto("/?view=overview");
  await expect(page.getByText("Loading verified source scope…")).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
  await noOverflow(page);
  await page.screenshot({
    animations: "disabled",
    path: "screenshots/redesign-loading.png",
  });
  release();
  await ready(page);
  await page.unroute("**/api/case?*");
  const style = await page.evaluate(() => ({
    canvas: getComputedStyle(document.body).backgroundColor,
    primary: getComputedStyle(document.querySelector(".button.primary")!)
      .backgroundColor,
    panel: getComputedStyle(document.querySelector(".panel")!).borderRadius,
    sidebar: getComputedStyle(document.querySelector(".sidebar")!)
      .backgroundColor,
    scrollbar: getComputedStyle(document.querySelector(".table-scroll")!)
      .scrollbarColor,
  }));
  expect(style).toMatchObject({
    canvas: "rgb(247, 249, 252)",
    primary: "rgb(37, 99, 235)",
    panel: "16px",
    sidebar: "rgb(255, 255, 255)",
  });
  expect(style.scrollbar).not.toBe("auto");
  await expect(
    page
      .locator("header")
      .getByRole("combobox", { name: "Asset scenario", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator("header")
      .getByRole("combobox", { name: "Simulated role", exact: true }),
  ).toBeVisible();
  const catalog = page.locator(".panel").filter({
    has: page.getByRole("heading", {
      name: "Asset scenario catalog",
      exact: true,
    }),
  });
  await expect(catalog.locator("tbody tr")).toHaveCount(5);
  for (const a of raw.assets) {
    const row = catalog.locator("tbody tr").filter({ hasText: a.tag });
    await expect(row).toContainText(String(a.production[0].values.Timestamp));
    await expect(row).toContainText(
      String(a.production.at(-1).values.Timestamp),
    );
  }
  const source = page
    .getByRole("button", { name: "Definition & source", exact: true })
    .first();
  await source.click();
  const dialog = page.getByRole("dialog");
  const downloadReady = page.waitForEvent("download");
  await dialog
    .getByRole("link", { name: "Download verified original" })
    .click();
  const download = await downloadReady;
  expect(download.suggestedFilename()).toBe("Incident Database.xlsx");
  const bytes = fs.readFileSync((await download.path())!);
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(
    raw.inventory.find((i: { path: string }) =>
      i.path.endsWith("incidents/Incident Database.xlsx"),
    ).sha256,
  );
  expect(
    await page.evaluate(() => getComputedStyle(document.body).overflow),
  ).toBe("hidden");
  const a11y = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(a11y.violations.map((v) => v.id)).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(source).toBeFocused();
  expect(
    await page.evaluate(() => getComputedStyle(document.body).overflow),
  ).not.toBe("hidden");
  await goto(page, "/?view=investigation&asset=HE-3301", "Investigation");
  await choose(page, "Weekly measurement", "1");
  await expect(page.locator(".chart-legend").first()).toContainText(
    "ALARM ≤ 90",
  );
  await expect(page.locator(".chart-legend").first()).toContainText(
    "TRIP ≤ 70",
  );
  const chart = page.locator(".panel").filter({
    has: page.getByRole("heading", { name: "Heat Duty", exact: true }),
  });
  await chart
    .getByRole("button", { name: "View readings", exact: true })
    .click();
  await expect(chart.locator("tbody tr")).toHaveCount(20);
  await chart.getByRole("button", { name: "Next", exact: true }).click();
  await expect(chart.locator("tbody tr")).toHaveCount(6);
  await chart
    .getByRole("button", { name: "View source", exact: true })
    .last()
    .click();
  await expect(page.getByRole("dialog")).toContainText("Condition History");
  await page.keyboard.press("Escape");
  await page.route("**/api/case?*", (r) =>
    r.fulfill({ status: 503, body: "unavailable" }),
  );
  await choose(page, "Asset scenario", "KO-3201");
  await expect(
    page.getByText(/Unable to load this source scope/),
  ).toBeVisible();
  await noOverflow(page);
  await page.screenshot({
    animations: "disabled",
    path: "screenshots/redesign-scope-error.png",
  });
  await page.unroute("**/api/case?*");
  await page.getByRole("button", { name: "Retry scope", exact: true }).click();
  await ready(page, "Investigation");
  await expect(
    page.getByRole("heading", { name: "Historical RCA library · KO-3201" }),
  ).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  const transition = await page
    .locator(".button")
    .first()
    .evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(transition).toBe("0s");
});

test("Mocked live pending state preserves button width, cancels safely and returns to replay", async ({
  page,
  request,
}) => {
  const fixture = await (
    await request.post("/api/analyze", {
      data: {
        asset: "KO-3201",
        mode: "historical",
        asOf: "2026-04-30 23:00:00",
        live: false,
      },
    })
  ).json();
  await page.route("**/api/demo-session", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        enabled: true,
        authenticated: true,
        reason: "Mocked demo access",
      }),
    }),
  );
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/analyze", async (r) => {
    await pending;
    try {
      await r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(fixture),
      });
    } catch {
      /* Browser cancelled this mocked transport. */
    }
  });
  await goto(page, "/?view=investigation", "Investigation");
  const button = page.locator(".analysis-request");
  await expect(button).toBeEnabled();
  const width = (await button.boundingBox())!.width;
  await button.click();
  await expect(button).toHaveAttribute("aria-busy", "true");
  await expect(button).toBeDisabled();
  await expect(button).toHaveText("Live request running…");
  expect((await button.boundingBox())!.width).toBe(width);
  await page.screenshot({
    animations: "disabled",
    path: "screenshots/redesign-live-pending.png",
  });
  await page
    .getByRole("button", { name: "Cancel request", exact: true })
    .click();
  await expect(
    page.getByText(
      "Live request cancelled. Evidence replay remains available.",
    ),
  ).toBeVisible();
  release();
  await expect(button).toBeEnabled();
  await expect(button).toHaveText("Request live AI composition");
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

test("Sidebar branding/reset fit short viewports and require confirmation", async ({
  page,
}) => {
  await goto(page, "/?view=overview", "Executive Overview");
  const sidebar = page.locator(".sidebar");
  await expect(sidebar.locator(".brand strong")).toHaveText("CALIBER");
  await expect(sidebar.locator(".brand-edition")).toHaveText("2026Case 2");
  await expect(sidebar).not.toContainText("Local prototype");
  await expect(sidebar).not.toContainText("Source-led review.");
  await expect(sidebar).not.toContainText("Simulated approvals.");
  await expect(sidebar).not.toContainText("Source snapshot");
  const reset = sidebar.getByRole("button", {
    name: "Reset workspace",
    exact: true,
  });
  const box = (await sidebar.boundingBox())!;
  const button = (await reset.boundingBox())!;
  expect(button.x).toBeGreaterThan(box.x + 12);
  expect(button.x + button.width).toBeLessThan(box.x + box.width - 12);
  expect(button.y + button.height).toBeLessThan(box.y + box.height);
  await page.screenshot({
    path: "screenshots/refinement-A-sidebar.png",
    animations: "disabled",
  });
  const before = await page.evaluate(() =>
    localStorage.getItem("caliber-workspace-v1"),
  );
  await page.setViewportSize({ width: 1024, height: 360 });
  await reset.scrollIntoViewIfNeeded();
  await reset.focus();
  await expect(reset).toBeFocused();
  expect(
    await reset.evaluate((el) => getComputedStyle(el).outlineStyle),
  ).not.toBe("none");
  const short = (await reset.boundingBox())!;
  expect(short.y).toBeGreaterThanOrEqual(0);
  expect(short.y + short.height).toBeLessThanOrEqual(360);
  await noOverflow(page);
  await page.screenshot({
    path: "screenshots/refinement-sidebar-short.png",
    animations: "disabled",
  });
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toContainText(
    "Original sources and historical snapshots are preserved.",
  );
  await expect(
    page.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(reset).toBeFocused();
  expect(
    await page.evaluate(() => localStorage.getItem("caliber-workspace-v1")),
  ).toBe(before);
  for (const width of [1440, 1280, 1024, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await reset.scrollIntoViewIfNeeded();
    await expect(reset).toBeVisible();
    await noOverflow(page);
    expect(
      await sidebar
        .locator(".brand strong")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
  }
});

test("Status distribution uses filtered source counts, aligned bars and a zero-record state", async ({
  page,
}) => {
  const raw = JSON.parse(fs.readFileSync("data/normalized.json", "utf8"));
  await goto(page, "/?view=overview", "Executive Overview");
  const card = page.locator(".status-composition");
  const check = async (plant: string) => {
    const records = raw.incidents.filter(
      (r: { values: Record<string, string> }) =>
        !plant || r.values.Plant === plant,
    );
    const counts: Record<string, number> = {};
    for (const r of records)
      counts[r.values["Overall Status"]] =
        (counts[r.values["Overall Status"]] ?? 0) + 1;
    await expect(card).toContainText(
      `${records.length} records in active scope`,
    );
    const rows = card.locator(".status-distribution-row");
    await expect(rows).toHaveCount(Object.keys(counts).length);
    const geometry = await rows.evaluateAll((nodes) =>
      nodes.map((node) => ({
        raw: (node as HTMLElement).dataset.sourceStatus!,
        count: Number(node.querySelector(".status-count")!.textContent),
        bar: node.querySelector(".status-track")!.getBoundingClientRect().x,
        ratio:
          node.querySelector(".status-track > span")!.getBoundingClientRect()
            .width /
          node.querySelector(".status-track")!.getBoundingClientRect().width,
        right: node.querySelector(".status-count")!.getBoundingClientRect()
          .right,
      })),
    );
    expect(geometry.reduce((n, r) => n + r.count, 0)).toBe(records.length);
    for (const row of geometry) {
      expect(row.count).toBe(counts[row.raw]);
      expect(row.ratio).toBeCloseTo(row.count / records.length, 2);
      expect(row.bar).toBeCloseTo(geometry[0].bar, 1);
      expect(row.right).toBeCloseTo(geometry[0].right, 1);
    }
  };
  await check("");
  await choose(page, "Register plant scope", "ZCU");
  await check("ZCU");
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "screenshots/refinement-B-overview.png",
    animations: "disabled",
  });
  await page
    .getByLabel("Register date from", { exact: true })
    .fill("2030-01-01");
  await expect(card).toContainText("0 records in active scope");
  await expect(card.locator(".status-distribution-row")).toHaveCount(0);
  await expect(card).toContainText("No records match this scope.");
  await noOverflow(page);
  await card.screenshot({
    path: "screenshots/refinement-status-empty.png",
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Reset scope", exact: true }).click();
  await check("");
});

test("Data Map flows independently; governance disclosures, source search and KPI expansion stay accessible", async ({
  page,
}) => {
  await goto(page, "/?view=data", "Data & KPI Map");
  const panel = (name: string) =>
    page
      .locator(".panel")
      .filter({ has: page.getByRole("heading", { name, exact: true }) });
  const library = panel("Source Library"),
    architecture = panel("Enterprise Data Architecture"),
    dictionary = panel("KPI Dictionary");
  const lb = (await library.boundingBox())!,
    ab = (await architecture.boundingBox())!;
  expect(ab.y - (lb.y + lb.height)).toBeCloseTo(20, 0);
  expect(ab.y).toBeLessThan(
    (await dictionary.boundingBox())!.y +
      (await dictionary.boundingBox())!.height,
  );
  const search = library.getByRole("searchbox");
  await search.fill("Equipment Performance - RCA2 KO-3201.xlsx");
  await expect(library.locator(".source-list > div")).toHaveCount(1);
  await library
    .getByRole("button", { name: "Open source content", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Equipment Performance - RCA2 KO-3201.xlsx",
  );
  await page.keyboard.press("Escape");
  await search.fill("no-matching-source-file");
  await expect(library).toContainText("No matching files.");
  await library.locator(".search-clear-btn").click();
  await expect(library.locator(".source-list > div")).toHaveCount(22);
  const kpi = dictionary
    .locator("details")
    .filter({ hasText: "PM Compliance (%)" });
  await kpi.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(kpi).toHaveAttribute("open", "");
  await expect(
    kpi.getByLabel("Proposed owner · PM Compliance (%)", { exact: true }),
  ).toBeVisible();
  await kpi
    .getByRole("button", { name: "Definition & source", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("PM Compliance (%)");
  await page.keyboard.press("Escape");
  const roadmap = panel("Governance & Integration Roadmap");
  const accordion = roadmap.locator(".accordion");
  await expect(accordion).toHaveCount(3);
  await roadmap.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "screenshots/refinement-C-governance-closed.png",
    animations: "disabled",
  });
  for (const row of await accordion.all()) {
    await row.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(row).toHaveAttribute("open", "");
    await expect(row.locator(".accordion-content")).toBeVisible();
    expect(
      await row
        .locator("summary")
        .evaluate((el) => getComputedStyle(el).outlineStyle),
    ).not.toBe("none");
  }
  await expect(roadmap).toContainText(
    "Measure resolution speed and compliance rate.",
  );
  await expect(roadmap).toContainText(
    "Connect work management & incident tracking",
  );
  await noOverflow(page);
  await page.screenshot({
    path: "screenshots/refinement-C-governance-open.png",
    animations: "disabled",
  });
  await architecture.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "screenshots/refinement-D-data-flow.png",
    animations: "disabled",
  });
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(axe.violations.map((v) => v.id)).toEqual([]);
  await accordion.first().locator("summary").focus();
  await page.keyboard.press("Space");
  await expect(accordion.first()).not.toHaveAttribute("open", "");
});

test("Investigation embeds hourly selector and review flows without waiting for the evidence rail", async ({
  page,
}) => {
  await goto(
    page,
    "/?view=investigation&asset=KO-3201&mode=prospective&asOf=2026-04-22%2023:59:59",
    "Investigation",
  );
  const chart = page.locator(".panel").filter({
    has: page.getByRole("heading", {
      name: "Hourly PLANT_RATE",
      exact: true,
    }),
  });
  const selector = chart.getByRole("combobox", {
    name: "Hourly measurement (independent source)",
    exact: true,
  });
  await selector.focus();
  await page.keyboard.press("Space");
  const popup = page.getByRole("listbox", {
    name: "Hourly measurement (independent source)",
    exact: true,
  });
  await expect(popup).toBeVisible();
  const trigger = await selector.boundingBox(),
    menu = await popup.boundingBox();
  expect(menu!.width).toBeCloseTo(trigger!.width, 0);
  await page.keyboard.press("Escape");
  await expect(selector).toBeFocused();
  await choose(page, "Hourly measurement (independent source)", "KO3201_VIB");
  const vib = page.locator(".panel").filter({
    has: page.getByRole("heading", {
      name: "Hourly KO3201_VIB",
      exact: true,
    }),
  });
  await expect(vib).toContainText("MM/S");
  await expect(vib).toContainText("source observations");
  const slider = vib.getByRole("slider");
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveValue("1");
  await vib.getByRole("button", { name: "View source", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("KO3201_VIB");
  await page.keyboard.press("Escape");
  await vib.getByRole("button", { name: "View readings", exact: true }).click();
  await expect(vib.locator("tbody tr")).toHaveCount(20);
  const review = page.locator(".panel").filter({
    has: page.getByRole("heading", {
      name: "Probable root cause & engineering review",
      exact: true,
    }),
  });
  const vb = (await vib.boundingBox())!,
    rb = (await review.boundingBox())!;
  expect(rb.y - (vb.y + vb.height)).toBeCloseTo(20, 0);
  await vib.getByRole("button", { name: "Show chart", exact: true }).click();
  await review.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "screenshots/refinement-E-investigation-flow.png",
    animations: "disabled",
  });
  await page
    .getByRole("button", {
      name: "Evidence replay - no live AI call",
      exact: true,
    })
    .click();
  await expect(page.locator(".hypothesis-card")).not.toHaveCount(0);
  await noOverflow(page);
  await page.setViewportSize({ width: 390, height: 900 });
  await vib
    .getByRole("combobox", {
      name: "Hourly measurement (independent source)",
      exact: true,
    })
    .focus();
  await page.keyboard.press("Space");
  await expect(popup).toBeVisible();
  await noOverflow(page);
  await page.keyboard.press("Escape");
  await review.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "screenshots/refinement-investigation-390.png",
    animations: "disabled",
  });
});
