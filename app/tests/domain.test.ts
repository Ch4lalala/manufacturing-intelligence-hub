import test from "node:test";
import assert from "node:assert/strict";
import { raw, incidents } from "../src/lib/data";
import {
  aggregate,
  filterIncidents,
  qualifiedIncident,
  compareUnits,
  classify,
  eligibleTime,
  deriveEpisodes,
  assetMeta,
  retrieve,
  rankEpisodes,
} from "../src/lib/domain";
import { makeBundle, historicalActions } from "../src/lib/evidence";
import { replay, validateAnalysis, analyze } from "../src/lib/analysis";
import {
  transition,
  emptyWorkspace,
  restoreWorkspace,
  overdue,
} from "../src/lib/actions";
import {
  utilityMetrics,
  utilitySamples,
  DEFAULT_ASSUMPTIONS,
} from "../src/lib/utilities";
import type { WorkspaceAction } from "../src/lib/types";
const ko = raw.assets.find((a) => a.tag === "KO-3201")!;
const historical = makeBundle(
  ko,
  incidents,
  raw.version,
  "historical",
  "2026-04-30 23:00:00",
);
const prospective = makeBundle(
  ko,
  incidents,
  raw.version,
  "prospective",
  "2026-04-22 23:59:59",
);
test("Original totals, all stable rows, status composition and decimal financial invariants", () => {
  assert.equal(incidents.length, 380);
  assert.equal(new Set(incidents.map((i) => i.id)).size, 380);
  assert.deepEqual(aggregate(incidents), {
    count: 380,
    downtime: 2261.1,
    actual: 61886.46,
    potential: 5307.97,
    total: 67194.43,
    statuses: {
      "CA/PA EXECUTION": 92,
      "RCA PROCESS": 71,
      "RISK CANCELED": 47,
      "RISK CLOSED": 113,
      "MONITORING RESULT": 37,
      "NEW REGISTERED": 20,
    },
  });
  for (const r of incidents)
    assert.equal(
      Math.round(r.actual * 100) + Math.round(r.potential * 100),
      Math.round(r.total * 100),
    );
  assert.equal(
    incidents.filter((i) => i.rawAR === "n/a" && i.ar === null).length,
    226,
  );
});
test("Filtered totals derive only from matching rows, including n/a identifiers and no-results", () => {
  const rows = filterIncidents(incidents, {
    asset: "KO-3201",
    plant: "ZCU",
    from: "2026-04-01",
    to: "2026-04-30",
  });
  assert.equal(rows.length, 1);
  assert.equal(aggregate(rows).actual, 1584);
  assert.equal(aggregate(rows).downtime, 32);
  assert.equal(filterIncidents(incidents, { query: "n/a" }).length, 226);
  assert.equal(
    filterIncidents(incidents, { query: "mechanical seal" }).length > 0,
    true,
  );
  assert.deepEqual(
    aggregate(filterIncidents(incidents, { query: "not-a-real-case" })),
    { count: 0, downtime: 0, actual: 0, potential: 0, total: 0, statuses: {} },
  );
});
test("Duplicate ARs remain separate and qualified matching rejects wrong tag/plant/date", () => {
  for (const ar of ["AR-2026-OP2-0171", "AR-2024-ZCU-0236"]) {
    const rows = incidents.filter((i) => i.ar === ar);
    assert.equal(rows.length, 2);
    assert.notEqual(rows[0].id, rows[1].id);
    const r = rows[0];
    assert.equal(
      qualifiedIncident(
        { tag: r.tag, ar: r.ar!, plant: r.plant, eventDate: r.date },
        rows,
      )?.id,
      r.id,
    );
    assert.equal(
      qualifiedIncident(
        { tag: r.tag, ar: r.ar!, plant: "UNKNOWN", eventDate: r.date },
        rows,
      ),
      null,
    );
  }
  for (const a of raw.assets)
    assert.equal(qualifiedIncident(a, incidents)?.id, a.linked_incident_id);
});
test("All five assets cover hourly, weekly, report and correctly classified reading counts", () => {
  const expected: Record<string, number> = {
    "PU-2101B": 6,
    "KO-3201": 11,
    "PM-4405B": 6,
    "HE-3301": 10,
    "BL-5702": 15,
  };
  assert.equal(raw.assets.length, 5);
  for (const a of raw.assets) {
    assert.equal(a.production.length, 720);
    assert.equal(a.conditions.length, 26);
    assert.equal(a.report.slides.length, 11);
    assert.equal(
      a.conditions.filter((c) => c.status === "ALARM").length,
      expected[a.tag],
    );
    for (const c of a.conditions)
      assert.equal(classify(c.status_formula, c.measurements), c.status);
    assert.equal(historicalActions(a.report).length, 4);
  }
  assert.equal(
    classify(
      '=IF(OR(C2>=11,D2<=4,E2<=7.5,F2>=95),"TRIP",IF(OR(C2>=7,D2<=5,E2<=8.5,F2>=80),"ALARM","NORMAL"))',
      [1, 3, 10, 50],
    ),
    "TRIP",
  );
  assert.throws(() => classify('=EXEC("danger")', [1, 2, 3, 4]));
});
test("Unit and HE/PM conflicts persist with source-stated reliability caveats", () => {
  assert.equal(compareUnits("MM/S", "micron"), false);
  assert.equal(compareUnits("MM/S", "mm/s"), true);
  assert.equal(
    ko.conditions.find((c) => c.date === "2026-04-29")!.measurements[1],
    1530,
  );
  assert.ok(
    historical.evidence.some(
      (e) => e.category === "report" && e.excerpt.includes("1,800"),
    ),
  );
  assert.ok(
    historical.quality.some(
      (q) => q.id === "DQ03" && q.detail.includes("60 micron"),
    ),
  );
  const he = raw.assets.find((a) => a.tag === "HE-3301")!;
  const off = he.production.filter((p) => p.values.RUN_STATUS === "OFF");
  assert.equal(off.length, 13);
  assert.equal(
    Math.min(...off.map((p) => Number(p.values.PLANT_RATE))),
    12.094,
  );
  assert.equal(qualifiedIncident(he, incidents)!.downtime, 12);
  const pm = raw.assets.find((a) => a.tag === "PM-4405B")!;
  assert.equal(
    Math.max(
      ...pm.production
        .filter((p) => p.values.RUN_STATUS === "OFF")
        .map((p) => Number(p.values.PLANT_RATE)),
    ),
    0.104,
  );
  assert.equal(
    pm.production_metadata.find((m) => m.Name === "PLANT_RATE")!.engunits,
    "T/H (equiv.)",
  );
  for (const a of raw.assets) {
    assert.equal(
      a.summary.find((s) => s.name === "PM Compliance (%)")!.value,
      92,
    );
    assert.equal(a.summary.find((s) => s.name === "Period Hours")!.value, 4368);
  }
});
test("Prospective bundle for every asset excludes current/future outcomes across all fields", () => {
  for (const a of raw.assets) {
    const cutoff = a.eventDate + " 00:00:00";
    const b = makeBundle(a, incidents, raw.version, "prospective", cutoff);
    assert.equal(b.report, null);
    assert.equal(b.incident, null);
    assert.equal(b.summary.length, 0);
    assert.ok(
      b.conditions.every(
        (c) => eligibleTime(c.date + " 00:00:00", cutoff) && c.remark === null,
      ),
    );
    assert.ok(
      b.production.every((p) =>
        eligibleTime(String(p.values.Timestamp), cutoff),
      ),
    );
    assert.ok(
      b.evidence.every(
        (e) => e.category !== "report" && e.category !== "incident",
      ),
    );
    assert.equal(b.asset.eventDate, "");
    assert.equal(b.asset.reportFile, "");
    assert.ok(!JSON.stringify(b.asset).includes("failure_date_source"));
    assert.ok(!JSON.stringify(b.asset).includes("performance_source_values"));
  }
  assert.ok(
    !JSON.stringify(prospective).includes("cooler tube leak confirmed"),
  );
  assert.ok(!JSON.stringify(prospective).includes("1800 ppm"));
  assert.ok(!JSON.stringify(prospective).includes("1530"));
  assert.ok(prospective.episodes.every((e) => e.risk === null));
});
test("Episode acknowledgement identity and transparent severity/criticality/risk ordering", () => {
  const episodes = raw.assets.flatMap((a) =>
    deriveEpisodes(
      assetMeta(a),
      a.conditions,
      qualifiedIncident(a, incidents),
      "historical",
    ),
  );
  assert.equal(episodes.length, 5);
  assert.equal(new Set(episodes.map((e) => e.id)).size, 5);
  assert.equal(rankEpisodes(episodes)[0].tag, "KO-3201");
  assert.equal(prospective.episodes[0].severity, "ALARM");
  assert.equal(prospective.episodes[0].samples.length, 11);
});
test("Mechanism retrieval works beyond tag and distinguishes report availability", () => {
  const matches = retrieve(
    incidents,
    "bearing vibration",
    ko.linked_incident_id,
    undefined,
    raw.assets.map((a) => a.linked_incident_id),
  );
  assert.ok(matches.length > 0);
  assert.ok(
    matches.every(
      (m) => m.incident.id !== ko.linked_incident_id && m.matched.length > 0,
    ),
  );
  assert.ok(matches.some((m) => !m.hasReport));
  assert.deepEqual(retrieve(incidents, "zzzz no result"), []);
});
function action(): WorkspaceAction {
  const replayed = replay(historical),
    h = replayed.hypotheses[0];
  return {
    ...replayed.actions[0],
    id: "demo",
    caseId: ko.tag,
    hypothesisId: h.id,
    hypothesisTitle: h.title,
    priorityReason: "Trip/criticality/evidence reviewed",
    dependencies: "Engineering approval",
    owner: "Reliability engineer",
    due: "2026-10-03",
    state: "Draft",
    completionEvidence: "",
    reviewer: "",
    history: [],
    sources: historical.evidence.filter((e) =>
      replayed.actions[0].evidenceIds.includes(e.id),
    ),
  };
}
test("Action workflow prevents skipped approval and gates closure by evidence and reviewer confirmation", () => {
  let a = action();
  assert.throws(() =>
    transition(a, "Closed", { actor: "Engineering reviewer", confirmed: true }),
  );
  assert.throws(() =>
    transition({ ...a, owner: "" }, "Approved", { actor: "Plant manager" }),
  );
  a = transition(a, "Approved", { actor: "Plant manager" });
  a = transition(a, "In Progress", { actor: "Reliability engineer" });
  assert.throws(() =>
    transition(a, "Pending Verification", { actor: "Reliability engineer" }),
  );
  a = transition(a, "Pending Verification", {
    actor: "Reliability engineer",
    evidence:
      "Demo measurement-policy review reference; unit and alarm versions checked",
  });
  assert.throws(() =>
    transition(a, "Closed", { actor: "Plant manager", confirmed: true }),
  );
  assert.throws(() =>
    transition(a, "Closed", {
      actor: "Engineering reviewer",
      confirmed: false,
    }),
  );
  a = transition(a, "Closed", {
    actor: "Engineering reviewer",
    confirmed: true,
  });
  assert.equal(a.state, "Closed");
  assert.equal(a.history.length, 4);
  assert.ok(a.completionEvidence);
  assert.equal(overdue(a, "2026-10-04"), false);
  assert.throws(() =>
    transition(action(), "Rejected", { actor: "Plant manager" }),
  );
  assert.equal(
    transition(action(), "Cancelled", {
      actor: "Plant manager",
      reason: "Duplicate scope",
    }).state,
    "Cancelled",
  );
});
test("Versioned local state migration/reset and malformed-state recovery", () => {
  const w = emptyWorkspace(raw.version);
  w.actions = [action()];
  assert.equal(
    restoreWorkspace(JSON.stringify(w), raw.version).workspace.actions.length,
    1,
  );
  assert.equal(
    restoreWorkspace(JSON.stringify(w), "changed").workspace.actions.length,
    0,
  );
  assert.ok(restoreWorkspace("bad json", raw.version).notice);
  assert.deepEqual(emptyWorkspace(raw.version).actions, []);
});
test("Utility generator and forecast are deterministic, explicitly synthetic and isolated", () => {
  const samples = utilitySamples(DEFAULT_ASSUMPTIONS);
  assert.deepEqual(samples, utilitySamples(DEFAULT_ASSUMPTIONS));
  assert.ok(
    samples.every(
      (s) => s.data_kind === "synthetic" && s.assumptionIds.length === 5,
    ),
  );
  const m = utilityMetrics(DEFAULT_ASSUMPTIONS);
  assert.ok(
    m.forecast.every(
      (f) =>
        f.kwh === samples.slice(-24).reduce((s, p) => s + p.kwh, 0) / 24 &&
        f.data_kind === "synthetic",
    ),
  );
  assert.equal(
    utilityMetrics({ ...DEFAULT_ASSUMPTIONS, outputTon: 0 }).intensity,
    null,
  );
  const before = aggregate(incidents);
  utilityMetrics({ ...DEFAULT_ASSUMPTIONS, factor: 9 });
  assert.deepEqual(aggregate(incidents), before);
  assert.ok(!JSON.stringify(historical).includes("illustrative-utilities"));
});
test("Replay citations resolve; malformed claims, invented numbers and ineligible report citations fail", () => {
  const a = replay(prospective);
  assert.equal(a.execution, "replay");
  assert.doesNotThrow(() => validateAnalysis(a, prospective));
  const bad = structuredClone(a);
  bad.hypotheses[0].evidenceIds.push("KO-3201:report:7:50");
  assert.throws(() => validateAnalysis(bad, prospective), /citation/);
  assert.throws(() =>
    validateAnalysis({ ...a, summary: "95% certain cooler leak" }, prospective),
  );
  assert.throws(() => validateAnalysis({ caseId: ko.tag }, prospective));
  assert.throws(() =>
    validateAnalysis(
      {
        ...a,
        actions: [
          { ...a.actions[0], guidance: "Trip compressor now; order parts" },
        ],
      },
      prospective,
    ),
  );
});
test("API missing env, HTTP errors, invalid JSON, cancellation and timeouts visibly fall back without secrets", async () => {
  let calls = 0;
  const never = (async () => {
    calls++;
    throw new Error();
  }) as typeof fetch;
  const missing = await analyze(prospective, true, {}, never);
  assert.equal(calls, 0);
  assert.match(missing.message, /not-tested/);
  for (const f of [
    async () => new Response("provider secret", { status: 401 }),
    async () => new Response("invalid"),
    async () => {
      throw new DOMException("token secret", "AbortError");
    },
  ]) {
    const r = await analyze(
      prospective,
      true,
      { key: "secret", model: "explicit-test-model" },
      f as typeof fetch,
    );
    assert.equal(r.execution, "replay");
    assert.ok(!JSON.stringify(r).includes("secret"));
  }
});
test("Model request contains only eligible prospective evidence and uses ordinary completions", async () => {
  const f = (async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(String(input), "https://ai.sumopod.com/v1/chat/completions");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, "explicit-test-model");
    assert.ok(!("response_format" in body));
    assert.ok(!("stream" in body));
    const prompt = body.messages[1].content;
    assert.ok(!prompt.includes("report:7"));
    assert.ok(!prompt.includes("cooler tube"));
    assert.ok(!prompt.includes("1530"));
    return Response.json({
      choices: [{ message: { content: JSON.stringify(replay(prospective)) } }],
    });
  }) as typeof fetch;
  const response = await analyze(
    prospective,
    true,
    { key: "test-key", model: "explicit-test-model" },
    f,
  );
  assert.equal(response.execution, "live");
});

test("Calendar and whitespace evidence gates cannot produce invalid approval or closure", () => {
  assert.throws(() =>
    transition({ ...action(), due: "2026-02-31" }, "Approved", {
      actor: "Plant manager",
    }),
  );
  const pending = {
    ...action(),
    state: "Pending Verification" as const,
    completionEvidence: "   ",
  };
  assert.throws(() =>
    transition(pending, "Closed", {
      actor: "Engineering reviewer",
      confirmed: true,
    }),
  );
});
test("Date-only observations are not available at midnight and post-event data never enters pre-event scope", () => {
  const midnight = makeBundle(
    ko,
    incidents,
    raw.version,
    "prospective",
    "2026-04-22 00:00:00",
  );
  assert.ok(midnight.conditions.every((c) => c.date < "2026-04-22"));
  const late = makeBundle(
    ko,
    incidents,
    raw.version,
    "prospective",
    "2026-06-30 23:59:59",
  );
  assert.ok(late.conditions.every((c) => c.date < ko.eventDate));
  assert.ok(
    late.production.every(
      (p) => String(p.values.Timestamp).slice(0, 10) < ko.eventDate,
    ),
  );
  assert.ok(!JSON.stringify(late).includes("1530"));
});
test("Provider output cannot erase missing checks, attach unsupported guidance or echo extra payload fields", () => {
  const a = replay(prospective),
    bad = structuredClone(a);
  bad.hypotheses[0].missingChecks = [];
  assert.throws(() => validateAnalysis(bad, prospective));
  assert.throws(() => validateAnalysis({ ...a, limitations: [] }, prospective));
  const result = validateAnalysis(
    { ...a, extraProviderPayload: "not accepted as output" },
    prospective,
  );
  assert.ok(!JSON.stringify(result).includes("extraProviderPayload"));
});
