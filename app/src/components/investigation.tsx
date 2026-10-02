"use client";
import { useRef, useState, useEffect } from "react";
import type { Analysis, Incident } from "@/lib/types";
import { retrieve } from "@/lib/domain";
import { replay } from "@/lib/analysis";
import { historicalActions } from "@/lib/evidence";
import { linkedActionDrafts } from "@/lib/signals";
import { DemoAccess } from "./demo-access";
import { SignalPanel } from "./signal-panel";
import { reviewKey } from "@/lib/actions";
import { useHub } from "./hub";
import {
  Badge,
  Button,
  Field,
  Notice,
  Panel,
  Search,
  Select,
  Pagination,
} from "./ui";
import { Chart } from "./chart";
import { Citations, IncidentDetail, QualityPanel } from "./evidence-panels";
export function Investigation() {
  const {
    catalog,
    bundle,
    query,
    setQuery,
    navigate,
    workspace,
    save,
    role,
    createAction,
    openSource,
    notify,
  } = useHub();
  const [analysis, setAnalysis] = useState<Analysis | null>(null),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState("");
  const [liveStatus, setLiveStatus] = useState("Live API not-tested");
  const [liveAllowed, setLiveAllowed] = useState(false);
  const [weekly, setWeekly] = useState(0),
    [hourly, setHourly] = useState("PLANT_RATE"),
    [slide, setSlide] = useState(7);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/status", { signal: controller.signal })
      .then((r) => r.json())
      .then((s) => {
        if (!controller.signal.aborted)
          setLiveStatus(
            s.configured
              ? "Server configured · live API not-tested until a validated request succeeds"
              : "Live API not-tested · server key/model missing",
          );
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  if (!bundle) return null;
  const a = bundle.asset,
    mode = bundle.mode;
  const selectedIncident =
    mode === "historical" && query.incident
      ? catalog.incidents.find((r) => r.id === query.incident)
      : bundle.incident;
  const regular =
    !!selectedIncident &&
    !catalog.assets.some((a) => a.linked_incident_id === selectedIncident.id);
  async function run(live: boolean) {
    if (!bundle || busy) return;
    setFailure("");
    setBusy(true);
    const controller = new AbortController();
    request.current = controller;
    try {
      const r = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset: a.tag,
          mode,
          asOf: bundle.asOf,
          observationCutoff: !!bundle.observationCutoff,
          live,
        }),
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(20000),
        ]),
      });
      const result = await r.json();
      if (!r.ok && result.execution !== "replay") throw new Error();
      if (!controller.signal.aborted) {
        setAnalysis(result);
        if (result.execution === "live")
          setLiveStatus(
            "Live response validated for this request; engineering review remains required",
          );
      }
    } catch {
      if (!controller.signal.aborted)
        setFailure(
          "Analysis request could not finish. Use local evidence replay or retry the request.",
        );
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  const u =
    a.production_metadata.find((m) => m.Name === hourly)?.engunits ??
    "Source unit";
  const breachThreshold =
    a.thresholds[weekly]?.limits_text.split(" / ").map(Number) ?? [];
  return (
    <>
      <div className="filter-bar">
        <Select
          label="Analysis scope"
          value={mode}
          onChange={(v) => {
            request.current?.abort();
            setAnalysis(null);
            setBusy(false);
            setQuery({
              mode: v,
              view: "investigation",
              incident: "",
              asOf: query.asOf ?? "2026-04-22 23:59:59",
            });
          }}
          options={[
            { value: "historical", label: "Historical review · completed RCA" },
            {
              value: "prospective",
              label: "Pre-event replay · no current RCA",
            },
          ]}
        />
        {(mode === "prospective" || bundle.observationCutoff) && (
          <Field
            label="As of (source-local; timezone unknown)"
            type="datetime-local"
            value={bundle.asOf.replace(" ", "T")}
            onChange={(v) => setQuery({ asOf: v.replace("T", " ") })}
          />
        )}
        {mode === "historical" && bundle.observationCutoff && (
          <Button onClick={() => setQuery({ asOf: "", episodeAsOf: "" })}>
            Show full historical observation windows
          </Button>
        )}
        <Badge>
          {mode === "historical"
            ? "Known historical outcome"
            : "Inspection required · no known outcome"}
        </Badge>
      </div>
      {(mode === "prospective" || bundle.observationCutoff) && (
        <Panel
          title="Temporal evidence boundary"
          sub={`${bundle.asOf} · source-local eligibility checked before rendering and analysis`}
        >
          {bundle.exclusions.map((x) => (
            <p className="caption" key={x}>
              {x}
            </p>
          ))}
          <p className="caption">
            Source observations are replayed by observation timestamp; actual
            ingestion availability is unknown. The result is an illustrative
            pre-event indication, not evidence of prior operational access.
          </p>
        </Panel>
      )}
      {selectedIncident && <IncidentDetail incident={selectedIncident} />}
      {regular ? (
        <>
          <Notice>
            Only a register record was supplied for this incident. Condition
            observations and a detailed RCA are unavailable. Select one of the
            five detailed scenarios for an evidence-backed investigation.
          </Notice>
          <SimilarIncidents current={selectedIncident} />
          <Button onClick={() => navigate("problems")}>
            Return to Problem Tank
          </Button>
        </>
      ) : (
        <>
          <div className="grid-two">
            <div>
              <div className="filter-bar">
                <Select
                  label="Weekly measurement"
                  value={String(weekly)}
                  onChange={(v) => setWeekly(Number(v))}
                  options={a.condition_headers.map((s, i) => ({
                    value: String(i),
                    label: s.replace(/\n/g, " "),
                  }))}
                />
              </div>
              <Chart
                title={a.condition_headers[weekly].split("\n")[0]}
                unit={
                  a.condition_headers[weekly].split("\n")[1] ?? "Source unit"
                }
                alarm={breachThreshold[0]}
                trip={breachThreshold[1]}
                points={bundle.conditions.map((c) => ({
                  time: c.date,
                  value: c.measurements[weekly],
                  status: c.status,
                  source: () =>
                    openSource({
                      title: `${a.tag} · weekly ${c.date}`,
                      locators: [c.source],
                      excerpt: bundle.evidence.find(
                        (e) => e.id === `${a.tag}:weekly:${c.row}`,
                      )!.excerpt,
                      period: c.date,
                      kind: "source",
                    }),
                }))}
                caption={`${a.weeklyWindow}. Alarm/trip lines are source-workbook policy with unknown historical effective dates. Direction is retained in the source formula; low pressure/flow/duty can be worse.`}
              />
              <div className="filter-bar">
                <Select
                  label="Hourly measurement (independent source)"
                  value={hourly}
                  onChange={setHourly}
                  options={a.production_metadata
                    .filter((m) => m.Name !== "RUN_STATUS")
                    .map((m) => ({
                      value: m.Name,
                      label: `${m.Name} (${m.engunits})`,
                    }))}
                />
              </div>
              <Chart
                title={`Hourly ${hourly}`}
                unit={u}
                points={bundle.production.map((p) => ({
                  time: String(p.values.Timestamp),
                  value: Number(p.values[hourly]),
                  status: String(p.values.RUN_STATUS),
                  source: () =>
                    openSource({
                      title: `${a.tag} hourly reading`,
                      locators: [p.source],
                      excerpt: Object.entries(p.values)
                        .map(
                          ([k, v]) =>
                            `${k}: ${v} ${a.production_metadata.find((m) => m.Name === k)?.engunits ?? ""}`,
                        )
                        .join("\n"),
                      kind: "source",
                      period: String(p.values.Timestamp),
                      unit: u,
                    }),
                }))}
                caption={`${a.hourlyWindow}. Hourly metadata units remain independent from weekly measurements; no interpolation or automatic conversion.`}
              />
              {mode === "historical" && a.tag === "HE-3301" && (
                <Notice tone="warning">
                  HE-3301: 13 hourly OFF samples, each with nonzero plant rate
                  12.094–12.397 T/H; source RCA reports 12 h downtime. This is
                  asset isolation with reported partial plant impact, not a
                  measured full shutdown.
                </Notice>
              )}
            </div>
            <div>
              <Panel
                title="Investigation evidence"
                sub={`${bundle.evidence.length} eligible source objects · ${mode}`}
              >
                <div className="chronology">
                  {bundle.conditions
                    .filter((c) => c.status !== "NORMAL")
                    .slice(-4)
                    .map((c) => (
                      <p key={c.row}>
                        <strong>{c.date}</strong> · {c.status}
                        <br />
                        {a.condition_headers
                          .map(
                            (h, i) =>
                              `${h.split("\n")[0]}: ${c.measurements[i]} ${h.split("\n")[1] ?? ""}`,
                          )
                          .join(" / ")}
                        <Citations
                          ids={[`${a.tag}:weekly:${c.row}`]}
                          evidence={bundle.evidence}
                        />
                      </p>
                    ))}
                </div>
                {!bundle.conditions.length && (
                  <p>No eligible weekly observations.</p>
                )}
                <p className="caption">
                  Source evidence, computed eligibility, proposed hypotheses and
                  historical findings are labeled independently.
                </p>
              </Panel>
              {bundle.quality.length > 0 && (
                <QualityPanel quality={bundle.quality} />
              )}
            </div>
          </div>
          <Panel
            title="Probable root cause & engineering review"
            sub="Evidence-backed indications; no definitive diagnosis before inspection"
          >
            <p className="caption">{liveStatus}</p>
            <DemoAccess onAccess={setLiveAllowed} />
            <div className="button-row">
              <Button
                variant="primary"
                onClick={() => {
                  request.current?.abort();
                  setBusy(false);
                  setFailure("");
                  setAnalysis(replay(bundle));
                }}
              >
                Evidence replay - no live AI call
              </Button>
              <Button
                busy={busy}
                disabled={
                  !liveAllowed || replay(bundle).signals.state !== "anomaly"
                }
                title={
                  !liveAllowed
                    ? "Unlock configured demo live access; evidence replay remains available"
                    : replay(bundle).signals.state !== "anomaly"
                      ? "Insufficient eligible anomaly evidence for composition"
                      : undefined
                }
                onClick={() => run(true)}
              >
                {busy ? "Live request running…" : "Request live AI composition"}
              </Button>
              {busy && (
                <Button
                  onClick={() => {
                    request.current?.abort();
                    setBusy(false);
                    setFailure(
                      "Live request cancelled. Evidence replay remains available.",
                    );
                  }}
                >
                  Cancel request
                </Button>
              )}
            </div>
            {failure && <Notice tone="error">{failure}</Notice>}
            {!analysis ? (
              <Notice>
                Choose evidence replay to review eligible observations and
                signals, or explicitly request live composition. Missing
                credentials/model select a visible replay result. Composed
                hypotheses are engineering inferences; factual bindings and
                citations are validated before review.
              </Notice>
            ) : (
              <>
                <Notice
                  tone={analysis.execution === "live" ? "info" : "warning"}
                >
                  <strong>{analysis.message}</strong>
                </Notice>
                <div className="steps">
                  {analysis.stages.map((s) => (
                    <div className="step complete" key={s.title}>
                      <strong>{s.title}</strong>
                      <span>{s.result}</span>
                    </div>
                  ))}
                </div>
                <p>{analysis.summary}</p>
                <SignalPanel analysis={analysis} bundle={bundle} />
                {analysis.hypotheses.map((h) => {
                  const reviewId = reviewKey(a.tag, mode, analysis.asOf, h),
                    review = workspace.reviews[reviewId];
                  return (
                    <div className="hypothesis-card" key={h.id}>
                      <Badge
                        tone={
                          h.kind === "Historical RCA finding"
                            ? "neutral"
                            : "warning"
                        }
                      >
                        {h.kind}
                      </Badge>{" "}
                      <Badge>Strength: {h.strength} · qualitative</Badge>
                      <h3>{h.title}</h3>
                      <p>{h.explanation}</p>
                      <p className="caption">
                        {h.knowledgeBasis} · {h.strengthReason}
                      </p>
                      <strong className="caption">Supporting evidence</strong>
                      <Citations
                        ids={h.evidenceIds}
                        evidence={bundle.evidence}
                      />
                      <strong className="caption">
                        Counter-evidence / alternative context
                      </strong>
                      {h.counterEvidenceIds.length ? (
                        <Citations
                          ids={h.counterEvidenceIds}
                          evidence={bundle.evidence}
                        />
                      ) : (
                        <p className="caption">
                          No resolved counter-evidence in this scope; inspection
                          remains necessary.
                        </p>
                      )}
                      <h3>Missing checks</h3>
                      <ul>
                        {h.missingChecks.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                      <div className="button-row">
                        <Button
                          disabled={review === "Accepted"}
                          onClick={() =>
                            save(
                              (w) => ({
                                ...w,
                                reviews: {
                                  ...w.reviews,
                                  [reviewId]: "Accepted",
                                },
                                history: [
                                  ...w.history,
                                  {
                                    at: new Date().toISOString(),
                                    actor: role,
                                    description: `Accepted ${a.tag} ${mode} ${h.id} for action review`,
                                  },
                                ],
                              }),
                              "Finding/hypothesis accepted for proposed follow-up.",
                            )
                          }
                        >
                          Accept for action review
                        </Button>
                        <Button
                          disabled={review === "Rejected"}
                          onClick={() =>
                            save(
                              (w) => ({
                                ...w,
                                reviews: {
                                  ...w.reviews,
                                  [reviewId]: "Rejected",
                                },
                                history: [
                                  ...w.history,
                                  {
                                    at: new Date().toISOString(),
                                    actor: role,
                                    description: `Rejected ${a.tag} ${mode} ${h.id}; inspection still required`,
                                  },
                                ],
                              }),
                              "Hypothesis rejected; no action created.",
                            )
                          }
                        >
                          Reject hypothesis
                        </Button>
                        {review && <Badge>{review} · simulated review</Badge>}
                      </div>
                      {linkedActionDrafts(analysis, h.id).map((draft, i) => (
                        <div className="quality-card" key={draft.title}>
                          <h3>Proposed action: {draft.title}</h3>
                          <p>{draft.guidance}</p>
                          <p className="caption">
                            Proposed role: {draft.proposedOwnerRole} · approval
                            required
                          </p>
                          <Citations
                            ids={draft.evidenceIds}
                            evidence={bundle.evidence}
                          />
                          <Button
                            disabled={review !== "Accepted"}
                            title={
                              review !== "Accepted"
                                ? "Accept the linked finding/hypothesis first"
                                : undefined
                            }
                            onClick={() => createAction(draft, h, mode)}
                          >
                            {i === 0
                              ? h.id === analysis.hypotheses[0]?.id
                                ? "Create reviewed action draft"
                                : `Create reviewed action draft · ${h.id}`
                              : "Create follow-up draft"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  );
                })}
                <details>
                  <summary>Analysis limits & review diagnostics</summary>
                  {analysis.limitations.map((x, i) => (
                    <p className="caption" key={i}>
                      {x}
                    </p>
                  ))}
                  <p className="caption">
                    No streaming, embeddings or special response format is
                    assumed. Observation numbers, units, times and assets bind
                    to exact source/derived facts; engineering mechanisms remain
                    inferences. API errors never count as live success.
                  </p>
                </details>
              </>
            )}
          </Panel>
          {mode === "historical" && (
            <>
              <SimilarIncidents current={bundle.incident} />
              <Panel
                title={`Historical RCA library · ${a.tag}`}
                sub="All 11 slides remain navigable; known report finding after inspection"
                action={<Badge>Historical RCA finding</Badge>}
              >
                <div className="filter-bar">
                  <Select
                    label="RCA slide"
                    value={String(slide)}
                    onChange={(v) => setSlide(Number(v))}
                    options={bundle.report!.slides.map((s) => ({
                      value: String(s.slide),
                      label: `Slide ${s.slide} · ${s.blocks.find((b) => b.shape_id === 6)?.text ?? s.blocks[0]?.text ?? "Report"}`,
                    }))}
                  />
                  <Button
                    onClick={() =>
                      openSource({
                        title: `${a.tag} report slide ${slide}`,
                        locators: [{ file: bundle.report!.file, slide }],
                        kind: "source",
                        period:
                          "Historical report; publication availability unknown",
                      })
                    }
                  >
                    Open full slide excerpt & original
                  </Button>
                </div>
                {slide === 9 ? (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Reference</th>
                          <th>Action (source snapshot)</th>
                          <th>Plan date</th>
                          <th>Source PIC</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historicalActions(bundle.report!).map((s, i) => (
                          <tr key={i}>
                            <td>{s.reference}</td>
                            <td>{s.title}</td>
                            <td>{s.date}</td>
                            <td>{s.pic}</td>
                            <td>{s.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="source-slide">
                    {bundle
                      .report!.slides.find((s) => s.slide === slide)!
                      .blocks.filter(
                        (b) =>
                          b.text &&
                          !b.text.startsWith("RCA & CAPA/PAA") &&
                          !/^\d\d\/11$/.test(b.text),
                      )
                      .map((b) => (
                        <div className="quality-card" key={b.shape_id}>
                          <p>{b.text}</p>
                          <Citations
                            ids={[`${a.tag}:report:${slide}:${b.shape_id}`]}
                            evidence={bundle.evidence}
                          />
                        </div>
                      ))}
                  </div>
                )}
                <p className="caption">
                  Imported findings and actions are read-only snapshots. Repair
                  completion does not close every CAPA or the source risk
                  register. This review is retrospective; no prior prediction is
                  demonstrated.
                </p>
              </Panel>
            </>
          )}
          <div className="button-row">
            <Button onClick={() => navigate("actions", a.tag)}>
              Open Action Tracker
            </Button>
            <Button
              onClick={() => {
                notify(
                  "Use the source-local as-of control to inspect evidence eligibility.",
                );
                setQuery({
                  mode: mode === "historical" ? "prospective" : "historical",
                  incident: "",
                  asOf:
                    mode === "prospective"
                      ? ""
                      : (query.asOf ?? "2026-04-22 23:59:59"),
                  episodeAsOf: "",
                });
              }}
            >
              {mode === "historical"
                ? "Inspect pre-event evidence boundary"
                : "Return to historical review"}
            </Button>
          </div>
        </>
      )}
    </>
  );
}
function SimilarIncidents({
  current,
}: {
  current: Incident | null | undefined;
}) {
  const { catalog, navigate, openSource } = useHub();
  const [search, setSearch] = useState(
      current
        ? `${current.component} ${current.mechanism}`
        : "bearing vibration",
    ),
    [page, setPage] = useState(1);
  const matches = retrieve(
      catalog.incidents,
      search,
      current?.id,
      undefined,
      catalog.assets.map((a) => a.linked_incident_id),
    ),
    safePage = Math.min(page, Math.max(1, Math.ceil(matches.length / 10)));
  return (
    <Panel
      title="Similar-incident retrieval"
      sub="Deterministic lexical retrieval across title, component, mechanism, equipment and plant context"
    >
      <Search
        label="Search related mechanisms"
        value={search}
        onChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
      />
      <Notice>
        {matches.length} matching register records. Relevance is an uncalibrated
        term-match ranking, not cause probability. Detailed reports are
        available only for the five qualified source cases.
      </Notice>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Incident</th>
              <th>Matched context</th>
              <th>RCA availability</th>
              <th>Review</th>
            </tr>
          </thead>
          <tbody>
            {matches.slice((safePage - 1) * 10, safePage * 10).map((m) => (
              <tr key={m.incident.id}>
                <td>
                  <strong>{m.incident.tag}</strong>
                  <span className="cell-sub">
                    {m.incident.title} · {m.incident.date}
                  </span>
                </td>
                <td>
                  {m.matched.join(", ")}
                  <span className="cell-sub">
                    {m.incident.component} / {m.incident.mechanism}
                  </span>
                </td>
                <td>
                  <Badge>
                    {m.hasReport ? "Detailed RCA supplied" : "Register only"}
                  </Badge>
                </td>
                <td>
                  <Button
                    variant="text"
                    onClick={() =>
                      navigate(
                        "investigation",
                        catalog.assets.find(
                          (a) => a.linked_incident_id === m.incident.id,
                        )?.tag,
                        m.incident.id,
                      )
                    }
                  >
                    Open matching case
                  </Button>
                  <Button
                    variant="text"
                    onClick={() =>
                      openSource({
                        title: m.incident.id,
                        locators: [m.incident.source],
                        excerpt: JSON.stringify(m.incident.raw, null, 2),
                        kind: "source",
                        period: m.incident.date,
                      })
                    }
                  >
                    Source
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!matches.length && (
        <div className="empty">
          No matching mechanism or component. Try bearing, seal, fouling or
          coupling.
        </div>
      )}
      <Pagination
        size={10}
        page={safePage}
        total={matches.length}
        onChange={setPage}
      />
    </Panel>
  );
}
