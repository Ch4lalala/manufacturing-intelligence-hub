import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { raw, incidents } from "../src/lib/data";
import { makeBundle } from "../src/lib/evidence";
import { sourceTime, observationEligible } from "../src/lib/time";
import {
  replay,
  analyze,
  validateAnalysis,
  compositionContext,
} from "../src/lib/analysis";
import { summarizeSignals, linkedActionDrafts } from "../src/lib/signals";
import {
  reviewKey,
  actionTrackerMetrics,
  restoreWorkspace,
} from "../src/lib/actions";
import { sourceResponse } from "../src/lib/source-runtime";
import {
  DemoLimiter,
  issueSession,
  sessionId,
  sessionCookie,
  authorizeLive,
  liveAvailability,
  passcodeMatches,
  type LiveConfig,
} from "../src/lib/live-access";
import { guardedAnalysis } from "../src/lib/analysis-service";
import { GET as caseGET } from "../src/app/api/case/route";
import { GET as episodesGET } from "../src/app/api/episodes/route";
import { POST as analyzePOST } from "../src/app/api/analyze/route";
import {
  GET as sessionGET,
  POST as sessionPOST,
  DELETE as sessionDELETE,
} from "../src/app/api/demo-session/route";
import {
  providerPayload,
  fakeCompletion,
  actionScopeWorkspace,
} from "./fixtures";
test("Prospective metric evidence shares the asset/mode/cutoff gate and excludes historical acknowledgements", () => {
  const workspace = restoreWorkspace(
    JSON.stringify(actionScopeWorkspace(raw.version)),
    raw.version,
  ).workspace;
  const scope = {
    mode: "prospective" as const,
    caseId: "KO-3201",
    asOf: "2026-04-22 23:59:59",
  };
  const original = JSON.stringify(workspace);
  const result = actionTrackerMetrics(workspace, scope);
  assert.deepEqual(
    result.actions.map((a) => a.id),
    [
      "same-draft",
      "same-pending",
      "same-closed",
      "same-unreviewed",
      "same-no-evidence",
    ],
  );
  assert.deepEqual(
    result.metrics.map((m) => m.value),
    [5, 1, 1, 0],
  );
  assert.deepEqual(
    result.metrics[1].evidence.actions.map((a) => a.id),
    ["same-pending"],
  );
  assert.deepEqual(
    result.metrics[2].evidence.actions.map((a) => a.id),
    ["same-closed"],
  );
  assert.deepEqual(result.metrics[3].evidence, { actions: [], episodes: {} });
  assert.ok(
    result.metrics.every((m) => Object.keys(m.evidence.episodes).length === 0),
  );
  const evidence = JSON.stringify(result.metrics.map((m) => m.evidence));
  for (const id of [
    "historical-closed",
    "other-asset",
    "other-cutoff",
    "legacy-closed",
    "historical-ack",
  ])
    assert.ok(!evidence.includes(id));
  const onlyHistorical = {
    ...workspace,
    actions: workspace.actions.filter((a) => a.analysisMode === "historical"),
  };
  const empty = actionTrackerMetrics(onlyHistorical, scope);
  assert.deepEqual(
    empty.metrics.map((m) => m.value),
    [0, 0, 0, 0],
  );
  assert.ok(
    empty.metrics.every(
      (m) =>
        m.evidence.actions.length === 0 &&
        Object.keys(m.evidence.episodes).length === 0,
    ),
  );
  assert.equal(JSON.stringify(workspace), original);
});
const ko = raw.assets.find((a) => a.tag === "KO-3201")!;
const make = (time = "2026-04-22 23:59:59") =>
  makeBundle(ko, incidents, raw.version, "prospective", time);
const config: LiveConfig = {
  mode: "local",
  passcode: "regression-only-passcode",
  sessionSecret: "regression-only-secret-never-used-for-real-access",
  minuteLimit: 2,
  dailyLimit: 3,
  concurrencyLimit: 1,
  platformPublic: false,
};
const authenticated = () =>
  new Request("http://127.0.0.1:3100/api/analyze", {
    method: "POST",
    headers: {
      cookie: "caliber-live-demo=" + issueSession(config),
      origin: "http://127.0.0.1:3100",
    },
  });
test("Hosted live mode accepts explicit HTTPS origins only with configured shared storage", () => {
  const hosted = {
    ...config,
    mode: "public",
    platformPublic: true,
    allowedOrigins: ["https://caliber.example.test"],
    redis: {
      url: "https://redis.example.test",
      token: "test-only-redis-token",
      namespace: "caliber-test",
    },
  };
  assert.equal(liveAvailability(hosted).enabled, true);
  assert.equal(
    liveAvailability({ ...hosted, redis: undefined }).enabled,
    false,
  );
  assert.equal(
    liveAvailability({ ...hosted, allowedOrigins: [] }).enabled,
    false,
  );
  assert.equal(
    liveAvailability({
      ...hosted,
      allowedOrigins: ["http://caliber.example.test"],
    }).enabled,
    false,
  );
  assert.equal(liveAvailability({ ...hosted, mode: "local" }).enabled, false);
});
test("API episode and case gates agree at midnight/end-of-day; calendar and event-day exclusions hold", async () => {
  for (const [time, last] of [
    ["2026-04-22 00:00:00", "2026-04-15"],
    ["2026-04-22 23:59:59", "2026-04-22"],
  ]) {
    const query = new URLSearchParams({
      asset: ko.tag,
      mode: "prospective",
      asOf: time,
    });
    const episode = await (
      await episodesGET(new Request("http://localhost/api/episodes?" + query))
    ).json();
    const bundle = await (
      await caseGET(new Request("http://localhost/api/case?" + query))
    ).json();
    assert.equal(bundle.conditions.at(-1).date, last);
    assert.equal(episode[0].last, last);
    assert.deepEqual(episode[0].samples, bundle.episodes[0].samples);
    assert.ok(
      episode[0].samples.every((id: string) =>
        bundle.evidence.some((e: { id: string }) => e.id === id),
      ),
    );
  }
  for (const time of [
    "2026-02-30 00:00:00",
    "2026-04-31 00:00:00",
    "2026-04-22 24:00:00",
    "2026-04-22 12:60:00",
    "2026-04-22 12:00:60",
  ]) {
    assert.throws(() => sourceTime(time));
    const q = new URLSearchParams({
      asset: ko.tag,
      mode: "prospective",
      asOf: time,
    });
    assert.equal(
      (await caseGET(new Request("http://localhost/api/case?" + q))).status,
      400,
    );
    assert.equal(
      (await episodesGET(new Request("http://localhost/api/episodes?" + q)))
        .status,
      400,
    );
    assert.equal(
      (
        await analyzePOST(
          new Request("http://localhost/api/analyze", {
            method: "POST",
            body: JSON.stringify({
              asset: ko.tag,
              mode: "prospective",
              asOf: time,
              live: false,
            }),
          }),
        )
      ).status,
      400,
    );
  }
  assert.equal(sourceTime("2024-02-29T12:00"), "2024-02-29 12:00:00");
  assert.equal(
    observationEligible(
      "2026-04-29",
      "weekly",
      "prospective",
      "2026-05-30 23:59:59",
      ko.eventDate,
    ),
    false,
  );
  const historical = makeBundle(
    ko,
    incidents,
    raw.version,
    "historical",
    "2026-04-22 00:00:00",
    true,
  );
  assert.equal(historical.conditions.at(-1)!.date, "2026-04-15");
  assert.ok(historical.report);
  assert.match(historical.exclusions.join(" "), /retrospective context/);
});
test("Replay follows evidence: empty/normal has no diagnosis or maintenance draft; comparable normal trend/hourly OFF can trigger review", () => {
  const empty = replay(make("2025-01-01 00:00:00"));
  assert.equal(empty.signals.state, "no_observations");
  assert.deepEqual(empty.hypotheses, []);
  assert.deepEqual(empty.actions, []);
  const normal = replay(make("2025-12-10 23:59:59"));
  assert.equal(normal.signals.state, "insufficient_anomaly");
  assert.match(normal.summary, /Insufficient anomaly evidence/);
  assert.deepEqual(normal.hypotheses, []);
  assert.deepEqual(normal.actions, []);
  const trend = make("2026-01-01 23:59:59");
  trend.conditions = trend.conditions.slice(0, 4).map((c, i) => ({
    ...c,
    measurements: [20 + i * 5, 100, 1.8, 78],
    status: "NORMAL",
  }));
  const signals = summarizeSignals(trend);
  assert.equal(signals.state, "anomaly");
  assert.ok(signals.signals.some((s) => s.type === "weekly_trend"));
  assert.ok(signals.signals.every((s) => s.type !== "weekly_breach"));
  assert.ok(
    replay(trend).hypotheses.every((h) => h.strength === "insufficient"),
  );
  const he = raw.assets.find((a) => a.tag === "HE-3301")!,
    hourly = makeBundle(
      he,
      incidents,
      raw.version,
      "historical",
      "2026-05-30 23:00:00",
    );
  hourly.conditions = [];
  hourly.report = null;
  hourly.evidence = hourly.evidence.filter(
    (e) => e.category === "hourly" || e.category === "metadata",
  );
  const off = summarizeSignals(hourly);
  assert.ok(off.signals.some((s) => s.type === "hourly_state"));
  assert.equal(off.facts.find((f) => f.id.endsWith("off-count"))!.value, 13);
  assert.equal(
    off.facts.find((f) => f.id.endsWith("off-plant-min"))!.value,
    12.094,
  );
  const map = new Map(off.facts.map((f) => [f.id, f]));
  for (const f of off.facts.filter((f) => f.kind === "computed")) {
    assert.ok(f.formula);
    assert.ok(f.inputs.every((id) => map.has(id)));
  }
});
test("ALARM mechanisms derive from breached parameters; normal is explicit counter-evidence; report findings remain retrospective", () => {
  const early = replay(make("2026-02-11 23:59:59"));
  assert.ok(early.hypotheses.some((h) => h.mechanism === "lubrication"));
  assert.ok(!early.hypotheses.some((h) => h.mechanism === "alignment"));
  const later = replay(make());
  assert.ok(
    later.signals.signals.some((s) => s.parameter.includes("Vibration")),
  );
  for (const h of later.hypotheses) {
    assert.ok(h.signalIds.length);
    assert.ok(h.counterEvidenceIds.length);
    assert.ok(h.missingChecks.length);
    assert.notEqual(h.strength, "supported");
  }
  const context = compositionContext(make());
  assert.deepEqual(context.similarIncidents, []);
  assert.deepEqual(context.historicalFindings, []);
  assert.ok(!JSON.stringify(context).includes("1800"));
  assert.ok(!JSON.stringify(context).includes("cooler tube"));
  const retrospective = makeBundle(
    ko,
    incidents,
    raw.version,
    "historical",
    "2026-04-30 23:00:00",
  );
  assert.ok(
    replay(retrospective).hypotheses.some(
      (h) => h.kind === "Historical RCA finding",
    ),
  );
  assert.ok(
    compositionContext(retrospective).similarIncidents.every(
      (m) =>
        m.matchedTerms.length > 0 && m.difference.includes("Different event"),
    ),
  );
});
test("Composed live narrative can differ; observations bind exact source/derived facts; empty hypotheses supported", async () => {
  const bundle = make(),
    payload = providerPayload(bundle);
  const accepted = validateAnalysis(payload, bundle);
  assert.equal(accepted.liveState, "validated");
  assert.equal(accepted.execution, "live");
  assert.notEqual(
    accepted.hypotheses[0].title,
    replay(bundle).hypotheses[0].title,
  );
  const response = await analyze(
    bundle,
    true,
    { key: "fake-key", model: "fake-model" },
    (async () => fakeCompletion(bundle)) as typeof fetch,
  );
  assert.equal(response.liveState, "validated");
  const empty = validateAnalysis(
    {
      ...payload,
      hypotheses: [],
      actions: [],
      summary:
        "The available signals require review; a specific cause remains unknown.",
    },
    bundle,
  );
  assert.deepEqual(empty.hypotheses, []);
  assert.deepEqual(empty.actions, []);
  for (const mutate of [
    (p: ReturnType<typeof providerPayload>) => {
      p.observations[0].value = 99999;
    },
    (p: ReturnType<typeof providerPayload>) => {
      p.observations[0].unit = "MM/S";
    },
    (p: ReturnType<typeof providerPayload>) => {
      p.observations[0].asset = "HE-3301";
    },
    (p: ReturnType<typeof providerPayload>) => {
      p.observations[0].time = "2026-04-29";
    },
    (p: ReturnType<typeof providerPayload>) => {
      p.hypotheses[0].evidenceIds = ["HE-3301:weekly:21"];
    },
    (p: ReturnType<typeof providerPayload>) => {
      p.hypotheses[0].evidenceIds = ["KO-3201:report:7:47"];
    },
    (p: ReturnType<typeof providerPayload>) => {
      p.hypotheses[0].strength = "supported";
    },
    (p: ReturnType<typeof providerPayload>) => {
      p.actions[0].hypothesisId = "unreviewed";
    },
  ]) {
    const bad = structuredClone(payload);
    mutate(bad);
    assert.throws(() => validateAnalysis(bad, bundle));
  }
  const proposed = make("2026-01-01 23:59:59");
  proposed.conditions = proposed.conditions.slice(0, 4).map((c, i) => ({
    ...c,
    measurements: [20 + i * 5, 100, 1.8, 78],
    status: "NORMAL",
  }));
  const inflated = providerPayload(proposed);
  inflated.hypotheses[0].strength = "plausible";
  assert.throws(() => validateAnalysis(inflated, proposed), /Strength/);
  const contexts = compositionContext(bundle);
  for (const fact of contexts.facts.filter((f) => f.kind === "computed"))
    assert.ok(fact.inputs.length && fact.formula);
});
test("Every hypothesis gets its own action link; review identity changes when composed content changes", () => {
  const result = replay(make());
  assert.ok(result.hypotheses.length > 1);
  for (const h of result.hypotheses) {
    const drafts = linkedActionDrafts(result, h.id);
    assert.ok(drafts.length > 0);
    assert.ok(
      drafts.every(
        (a) =>
          a.hypothesisId === h.id &&
          a.evidenceIds.some((id) => h.evidenceIds.includes(id)),
      ),
    );
  }
  const h = result.hypotheses[1];
  assert.notEqual(
    reviewKey(ko.tag, "prospective", result.asOf, h),
    reviewKey(ko.tag, "prospective", result.asOf, {
      ...h,
      title: "Changed inference may require review",
    }),
  );
});
test("Unauthorized/public/missing-config/quota/concurrency rejection produces zero extra provider calls", async () => {
  const bundle = make();
  let calls = 0;
  const fetcher = (async () => {
    calls++;
    return fakeCompletion(bundle);
  }) as typeof fetch;
  const provider = { key: "fake-key", model: "fake-model" };
  let result = await guardedAnalysis(
    new Request("http://127.0.0.1:3100/api/analyze"),
    bundle,
    true,
    config,
    provider,
    fetcher,
    new DemoLimiter(),
  );
  assert.equal(result.status, 401);
  assert.equal(calls, 0);
  assert.equal(result.analysis.liveState, "blocked");
  result = await guardedAnalysis(
    authenticated(),
    bundle,
    true,
    { ...config, platformPublic: true },
    provider,
    fetcher,
    new DemoLimiter(),
  );
  assert.equal(result.status, 403);
  assert.equal(calls, 0);
  result = await guardedAnalysis(
    authenticated(),
    bundle,
    true,
    { ...config, dailyLimit: 0 },
    provider,
    fetcher,
    new DemoLimiter(),
  );
  assert.equal(result.status, 403);
  assert.equal(calls, 0);
  result = await guardedAnalysis(
    authenticated(),
    bundle,
    false,
    config,
    {},
    fetcher,
    new DemoLimiter(),
  );
  assert.equal(result.status, 200);
  assert.equal(calls, 0);
  const limiter = new DemoLimiter(),
    limited = { ...config, minuteLimit: 1, dailyLimit: 1 };
  result = await guardedAnalysis(
    authenticated(),
    bundle,
    true,
    limited,
    provider,
    fetcher,
    limiter,
  );
  assert.equal(result.analysis.liveState, "validated");
  assert.equal(calls, 1);
  result = await guardedAnalysis(
    authenticated(),
    bundle,
    true,
    limited,
    provider,
    fetcher,
    limiter,
  );
  assert.equal(result.status, 429);
  assert.equal(calls, 1);
  let finish!: () => void;
  const wait = new Promise<void>((resolve) => {
      finish = resolve;
    }),
    parallel = new DemoLimiter();
  const slow = (async () => {
    calls++;
    await wait;
    return fakeCompletion(bundle);
  }) as typeof fetch;
  const running = guardedAnalysis(
    authenticated(),
    bundle,
    true,
    config,
    provider,
    slow,
    parallel,
  );
  const second = await guardedAnalysis(
    authenticated(),
    bundle,
    true,
    config,
    provider,
    fetcher,
    parallel,
  );
  assert.equal(second.status, 429);
  assert.equal(calls, 2);
  finish();
  await running;
});
test("Sessions are signed/expiring/HttpOnly/origin-bound; login/revocation and limits are single-process and conservative", async () => {
  const now = Date.now(),
    token = issueSession(config, now),
    id = sessionId(token, config, now);
  assert.ok(id);
  assert.equal(sessionId(token + "x", config, now), null);
  assert.equal(sessionId(token, config, now + 31 * 60 * 1000), null);
  assert.ok(
    sessionCookie(token, new Request("https://localhost/")).includes(
      "HttpOnly; SameSite=Strict",
    ),
  );
  assert.ok(
    sessionCookie(token, new Request("https://localhost/")).endsWith(
      "; Secure",
    ),
  );
  assert.equal(passcodeMatches("wrong", config), false);
  assert.equal(passcodeMatches(config.passcode, config), true);
  const cross = new Request("http://127.0.0.1:3100/api/analyze", {
    headers: {
      cookie: "caliber-live-demo=" + token,
      origin: "https://unrelated.example",
    },
  });
  assert.equal(
    (await authorizeLive(cross, config, new DemoLimiter(), now)).ok,
    false,
  );
  const lim = new DemoLimiter();
  lim.revoke(id!, now);
  const different = new Request("http://127.0.0.1:3100/api/analyze", {
    headers: { cookie: "caliber-live-demo=" + issueSession(config, now) },
  });
  assert.equal((await authorizeLive(different, config, lim, now)).ok, true);
  assert.ok(lim.isRevoked(id!, now));
  const same = new Request("http://127.0.0.1:3100/api/analyze", {
    headers: { cookie: "caliber-live-demo=" + token },
  });
  assert.equal((await authorizeLive(same, config, lim, now)).ok, false);
  for (let i = 0; i < 5; i++) assert.equal(lim.loginAllowed(now), true);
  assert.equal(lim.loginAllowed(now), false);
  assert.equal(liveAvailability({ ...config, mode: "public" }).enabled, false);
  const quota = new DemoLimiter(),
    daily = { ...config, minuteLimit: 2, dailyLimit: 1 };
  const slot = quota.acquire(daily, now);
  assert.ok(slot.ok);
  if (slot.ok) slot.release();
  assert.equal(quota.acquire(daily, now + 60001).ok, false);
});
test("Runtime source locator/download behavior handles unknown/missing/corrupt files without parent lookup or source substitution", async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "caliber-sources-"));
  try {
    const q = new URLSearchParams({
      file: ko.info_source.file,
      sheet: "Condition History",
      cell: "A21:H22",
    });
    assert.equal(sourceResponse(q, temp).status, 503);
    fs.cpSync("runtime", temp, { recursive: true });
    const response = sourceResponse(q, temp);
    assert.equal(response.status, 200);
    const content = await response.json();
    assert.ok(content.excerpt.includes("1372.791"));
    assert.ok(content.excerpt.includes("1530"));
    assert.equal(
      sourceResponse(
        new URLSearchParams({
          file: ko.info_source.file,
          sheet: "Not a sheet",
        }),
        temp,
      ).status,
      404,
    );
    assert.equal(
      sourceResponse(new URLSearchParams({ file: "../../.env.local" }), temp)
        .status,
      404,
    );
    const download = new URLSearchParams({
      file: ko.info_source.file,
      download: "1",
    });
    const bytes = await sourceResponse(download, temp).arrayBuffer();
    assert.equal(
      crypto.createHash("sha256").update(new Uint8Array(bytes)).digest("hex"),
      raw.inventory.find((s) => s.path === ko.info_source.file)!.sha256,
    );
    fs.unlinkSync(path.join(temp, ko.info_source.file));
    assert.equal(sourceResponse(download, temp).status, 404);
    fs.writeFileSync(path.join(temp, "workbook-excerpts.json"), "{}");
    assert.equal(sourceResponse(q, temp).status, 503);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test("Real demo-session handlers issue/revoke HttpOnly cookies and fail closed without configured access", async () => {
  const overrides: Record<string, string | undefined> = {
    AI_LIVE_MODE: "local",
    DEMO_PASSCODE: "session-handler-test-passcode",
    DEMO_SESSION_SECRET:
      "session-handler-test-secret-for-local-regression-only",
    AI_MAX_CALLS_PER_MINUTE: "2",
    AI_MAX_CALLS_PER_DAY: "3",
    AI_MAX_CONCURRENT: "1",
    VERCEL: undefined,
    NETLIFY: undefined,
    AWS_LAMBDA_FUNCTION_NAME: undefined,
  };
  const previous = Object.fromEntries(
    Object.keys(overrides).map((k) => [k, process.env[k]]),
  );
  const request = (method = "GET", cookie = "", passcode = "") =>
    new Request("http://127.0.0.1:3100/api/demo-session", {
      method,
      headers: { origin: "http://127.0.0.1:3100", cookie },
      body: method === "POST" ? JSON.stringify({ passcode }) : undefined,
    });
  try {
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    assert.equal(
      (await (await sessionGET(request())).json()).authenticated,
      false,
    );
    assert.equal((await sessionPOST(request("POST", "", "wrong"))).status, 401);
    const response = await sessionPOST(
      request("POST", "", overrides.DEMO_PASSCODE),
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { authenticated: true });
    const header = response.headers.get("set-cookie")!;
    assert.match(header, /HttpOnly; SameSite=Strict/);
    const cookie = header.split(";")[0];
    assert.equal(
      (await (await sessionGET(request("GET", cookie))).json()).authenticated,
      true,
    );
    const locked = await sessionDELETE(request("DELETE", cookie));
    assert.match(locked.headers.get("set-cookie")!, /Max-Age=0/);
    assert.equal(
      (await (await sessionGET(request("GET", cookie))).json()).authenticated,
      false,
    );
    process.env.AI_MAX_CALLS_PER_DAY = "";
    assert.equal(
      (await sessionPOST(request("POST", "", overrides.DEMO_PASSCODE))).status,
      403,
    );
    assert.equal((await (await sessionGET(request())).json()).enabled, false);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
test("Provider deadline actually aborts hanging transport; caller cancellation before contact makes zero calls", async () => {
  let calls = 0;
  const hanging: typeof fetch = async (_input, init) => {
    calls++;
    return new Promise((_resolve, reject) => {
      const signal = init?.signal;
      assert.ok(signal);
      if (signal.aborted) reject(signal.reason);
      else
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        });
    });
  };
  const cancelled = new AbortController();
  cancelled.abort();
  const before = await analyze(
    make(),
    true,
    { key: "test-only", model: "test-only" },
    hanging,
    cancelled.signal,
  );
  assert.equal(calls, 0);
  assert.equal(before.liveState, "not_requested");
  assert.match(before.message, /before provider contact/);
  const started = Date.now();
  // Keep the test process alive: AbortSignal.timeout is an unref timer in Node.
  const keepAlive = setInterval(() => {}, 1000);
  try {
    const result = await analyze(
      make(),
      true,
      { key: "test-only", model: "test-only" },
      hanging,
    );
    assert.equal(calls, 1);
    assert.equal(result.execution, "replay");
    assert.equal(result.liveState, "failed");
    assert.ok(Date.now() - started >= 14000 && Date.now() - started < 20000);
  } finally {
    clearInterval(keepAlive);
  }
});

test("Explicit direct hosted mode composes without passcode, Redis or application quotas", async () => {
  const access: LiveConfig = {
    mode: "direct",
    platformPublic: true,
    minuteLimit: 0,
    dailyLimit: 0,
    concurrencyLimit: 0,
    providerConfigured: true,
  };
  assert.equal(liveAvailability(access).enabled, true);
  const bundle = makeBundle(
    raw.assets.find((a) => a.tag === "KO-3201")!,
    incidents,
    raw.version,
    "prospective",
    "2026-04-22 23:59:59",
  );
  let calls = 0;
  const fetcher: typeof fetch = async () => {
    calls++;
    return fakeCompletion(bundle);
  };
  const request = (origin = "https://caliber.test") =>
    new Request("https://caliber.test/api/analyze", {
      method: "POST",
      headers: { origin },
    });
  for (let i = 0; i < 12; i++) {
    const result = await guardedAnalysis(
      request(),
      bundle,
      true,
      access,
      { key: "fixture-only", model: "fixture-model" },
      fetcher,
    );
    assert.equal(result.status, 200);
    assert.equal(result.analysis.liveState, "validated");
  }
  assert.equal(calls, 12);
  assert.equal(
    (
      await guardedAnalysis(
        request("https://other.test"),
        bundle,
        true,
        access,
        { key: "fixture-only", model: "fixture-model" },
        fetcher,
      )
    ).status,
    403,
  );
  assert.equal(calls, 12);
  assert.equal(
    liveAvailability({ ...access, providerConfigured: false }).enabled,
    false,
  );
  await guardedAnalysis(request(), bundle, false, access, {}, fetcher);
  assert.equal(calls, 12);
});

test("Direct gateway status needs only provider configuration and never issues session cookies", async () => {
  const names = [
    "AI_LIVE_MODE",
    "AI_API_KEY",
    "AI_MODEL",
    "VERCEL",
    "DEMO_PASSCODE",
    "DEMO_SESSION_SECRET",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
  ];
  const saved = names.map((name) => [name, process.env[name]] as const);
  try {
    for (const name of names) delete process.env[name];
    Object.assign(process.env, {
      AI_LIVE_MODE: "direct",
      AI_API_KEY: "direct-test-private-key",
      AI_MODEL: "direct-test-model",
      VERCEL: "1",
    });
    const response = await sessionGET(
      new Request("https://caliber.test/api/demo-session"),
    );
    const body = await response.json();
    assert.equal(body.enabled, true);
    assert.equal(body.authenticated, true);
    assert.equal(body.accessMode, "direct");
    assert.equal(response.headers.get("set-cookie"), null);
    assert.equal(
      JSON.stringify(body).includes("direct-test-private-key"),
      false,
    );
    delete process.env.AI_MODEL;
    assert.equal(
      (
        await (
          await sessionGET(new Request("https://caliber.test/api/demo-session"))
        ).json()
      ).enabled,
      false,
    );
  } finally {
    for (const [name, value] of saved)
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
  }
});

test("Live completion accepts a complete fenced JSON object with surrounding whitespace", async () => {
  const bundle = make();
  const result = await analyze(
    bundle,
    true,
    { key: "private-fixture", model: "fixture" },
    (async () =>
      Response.json({
        choices: [
          {
            finish_reason: "stop",
            message: {
              content:
                "\n```json\n" +
                JSON.stringify(providerPayload(bundle)) +
                "\n```\n\n",
            },
          },
        ],
      })) as typeof fetch,
  );
  assert.equal(result.liveState, "validated");
});

test("Live failure diagnostics separate transport, truncation, JSON and evidence rejection without leaking provider data", async () => {
  const bundle = make(),
    config = { key: "secret-fixture-key", model: "fixture" };
  const citation = providerPayload(bundle);
  citation.hypotheses[0].evidenceIds = ["private-provider-string"];
  const cases: [string, typeof fetch][] = [
    [
      "provider_truncated",
      (async () =>
        Response.json({
          choices: [
            {
              finish_reason: "length",
              message: { content: "partial-private-provider-string" },
            },
          ],
        })) as typeof fetch,
    ],
    [
      "provider_json",
      (async () => new Response("private-provider-string")) as typeof fetch,
    ],
    [
      "response_shape",
      (async () => Response.json({ choices: [] })) as typeof fetch,
    ],
    [
      "content_json",
      (async () =>
        Response.json({
          choices: [{ message: { content: "private-provider-string" } }],
        })) as typeof fetch,
    ],
    [
      "citation_ineligible",
      (async () =>
        Response.json({
          choices: [{ message: { content: JSON.stringify(citation) } }],
        })) as typeof fetch,
    ],
    [
      "timeout",
      (async () => {
        throw new DOMException("secret-fixture-key", "TimeoutError");
      }) as typeof fetch,
    ],
    [
      "network",
      (async () => {
        throw new Error("secret-fixture-key private-provider-string");
      }) as typeof fetch,
    ],
  ];
  for (const [code, fetcher] of cases) {
    const result = await analyze(bundle, true, config, fetcher);
    assert.equal(result.liveState, "failed");
    assert.ok(result.message.includes(code), result.message);
    assert.equal(result.message.includes("private-provider-string"), false);
    assert.equal(result.message.includes("secret-fixture-key"), false);
  }
});

test("Every asset receives a directly valid source-bound output template instead of enum descriptions", () => {
  for (const asset of raw.assets) {
    for (const mode of ["historical", "prospective"] as const) {
      const bundle = makeBundle(
        asset,
        incidents,
        raw.version,
        mode,
        "2026-04-22 23:59:59",
      );
      const context = compositionContext(bundle);
      const result = validateAnalysis(context.schema, bundle);
      assert.equal(result.liveState, "validated");
      assert.equal(result.caseId, asset.tag);
      assert.equal(result.mode, mode);
      for (const h of result.hypotheses.filter(
        (h) => h.kind === "Hypothesis",
      )) {
        assert.ok(
          h.signalIds.every((id) =>
            context.signals.some(
              (s) => s.id === id && s.mechanisms.includes(h.mechanism),
            ),
          ),
        );
        assert.ok(
          h.evidenceIds.every((id) =>
            context.evidence.some((e) => e.id === id),
          ),
        );
      }
    }
  }
});

test("Hypothesis diagnostics identify the failed invariant without accepting malformed model hypotheses", async () => {
  const cases: [string, (p: ReturnType<typeof providerPayload>) => void][] = [
    [
      "hypothesis_identity",
      (p) => {
        p.hypotheses[0].id = "hypothesis_1";
      },
    ],
    [
      "hypothesis_narrative",
      (p) => {
        p.hypotheses[0].explanation = "The condition is not confirmed.";
      },
    ],
    [
      "hypothesis_missing_checks",
      (p) => {
        p.hypotheses[0].missingChecks = ["Request inspection review."];
      },
    ],
    [
      "hypothesis_metadata",
      (p) => {
        p.hypotheses[0].kind = "Engineering hypothesis";
      },
    ],
    [
      "hypothesis_strength",
      (p) => {
        p.hypotheses[0].strength = "plausible for source breaches";
      },
    ],
    [
      "hypothesis_signal_ids",
      (p) => {
        p.hypotheses[0].signalIds = [];
      },
    ],
    [
      "hypothesis_signal_link",
      (p) => {
        p.hypotheses[0].mechanism = "unsupported";
      },
    ],
    [
      "hypothesis_counter_evidence",
      (p) => {
        p.hypotheses[0].counterEvidenceIds = [];
      },
    ],
  ];
  const bundle = make();
  for (const [code, mutate] of cases) {
    const payload = providerPayload(bundle);
    mutate(payload);
    assert.throws(() => validateAnalysis(payload, bundle));
    const result = await analyze(
      bundle,
      true,
      { key: "test-only", model: "test-only" },
      (async () =>
        Response.json({
          choices: [{ message: { content: JSON.stringify(payload) } }],
        })) as typeof fetch,
    );
    assert.equal(result.liveState, "failed");
    assert.ok(result.message.includes(`[${code}]`), result.message);
    assert.equal(result.message.includes("hypothesis_1"), false);
  }
});
