"use client";
import { useEffect, useState } from "react";
import type { Episode } from "@/lib/types";
import { aggregate, filterIncidents, money, number } from "@/lib/domain";
import { useHub } from "./hub";
import {
  Badge,
  Button,
  Panel,
  Select,
  Field,
  Search,
  Pagination,
  Notice,
} from "./ui";

const statusOptions = [
  "RISK CLOSED",
  "CA/PA EXECUTION",
  "RCA PROCESS",
  "RISK CANCELED",
  "MONITORING RESULT",
  "NEW REGISTERED",
];

export function Problems() {
  const h = useHub();
  const prospective = h.bundle?.mode === "prospective";
  const tank = prospective ? "conditions" : (h.query.tank ?? "conditions");
  return (
    <>
      <div className="tabs" aria-label="Problem source">
        <Button
          className={tank === "register" ? "selected" : ""}
          aria-pressed={tank === "register"}
          onClick={() => h.setQuery({ tank: "register" })}
          disabled={prospective}
          title={
            prospective
              ? "Register outcomes are unavailable in pre-event scope"
              : undefined
          }
        >
          Historical register · 380 records
        </Button>
        <Button
          className={tank === "conditions" ? "selected" : ""}
          aria-pressed={tank === "conditions"}
          onClick={() => h.setQuery({ tank: "conditions" })}
        >
          Derived condition episodes
        </Button>
      </div>
      {tank === "register" ? <Register /> : <Episodes />}
    </>
  );
}

function Register() {
  const { catalog, query: q, setQuery, navigate, openSource } = useHub();
  const rows = filterIncidents(catalog.incidents, {
    query: q.search,
    plant: q.plant,
    asset: q.tag,
    status: q.status,
    minRisk: q.risk,
    from: q.from,
    to: q.to,
  });
  const sort = q.sort ?? "risk";
  rows.sort((a, b) =>
    sort === "date"
      ? b.date.localeCompare(a.date)
      : sort === "tag"
        ? a.tag.localeCompare(b.tag)
        : (b.risk ?? -1) - (a.risk ?? -1),
  );
  const page = Math.max(
      1,
      Math.min(Number(q.page) || 1, Math.max(1, Math.ceil(rows.length / 20))),
    ),
    totals = aggregate(rows);
  const filter = (key: string, value: string) =>
    setQuery({ [key]: value, page: "1" });
  const clear = () =>
    setQuery({
      search: "",
      plant: "",
      tag: "",
      status: "",
      risk: "",
      from: "",
      to: "",
      page: "1",
    });

  return (
    <Panel
      title="Incident Register"
      sub="Master registry of operational events and downtime telemetry"
      action={<Badge tone="neutral">Production Register</Badge>}
    >
      <div className="filter-bar">
        <Search
          label="Search"
          value={q.search ?? ""}
          onChange={(v) => filter("search", v)}
        />
        <Select
          label="Plant"
          value={q.plant ?? ""}
          onChange={(v) => filter("plant", v)}
          options={[
            { value: "", label: "All plants" },
            ...[...new Set(catalog.incidents.map((i) => i.plant))]
              .sort()
              .map((s) => ({ value: s, label: s })),
          ]}
        />
        <Field
          label="Asset Tag"
          ariaLabel="Exact asset tag"
          value={q.tag ?? ""}
          onChange={(v) => filter("tag", v)}
        />
        <Select
          label="Status"
          ariaLabel="Source status"
          value={q.status ?? ""}
          onChange={(v) => filter("status", v)}
          options={[
            { value: "", label: "All statuses" },
            ...statusOptions.map((s) => ({ value: s, label: s })),
          ]}
        />
        <Field
          label="Min Risk"
          ariaLabel="Minimum source risk"
          value={q.risk ?? ""}
          onChange={(v) => filter("risk", v)}
          type="number"
          min="0"
        />
        <Field
          label="Date From"
          ariaLabel="Event date from"
          type="date"
          value={q.from ?? ""}
          onChange={(v) => filter("from", v)}
        />
        <Field
          label="Date To"
          ariaLabel="Event date to"
          type="date"
          value={q.to ?? ""}
          onChange={(v) => filter("to", v)}
        />
        <Select
          label="Sort"
          value={sort}
          onChange={(v) => setQuery({ sort: v, page: "1" })}
          options={[
            { value: "risk", label: "Risk descending" },
            { value: "date", label: "Latest event first" },
            { value: "tag", label: "Asset tag A–Z" },
          ]}
        />
        <Button onClick={clear}>Reset filters</Button>
      </div>
      <Notice>
        {rows.length} matching source records · {number(totals.downtime)} h
        downtime · Act. Loss {money(totals.actual)} k US$ · Pot. Loss{" "}
        {money(totals.potential)} k US$.
      </Notice>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Record / AR</th>
              <th>Asset / Plant</th>
              <th>Issue / Context</th>
              <th>Event Date</th>
              <th>Status</th>
              <th>Risk</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice((page - 1) * 20, page * 20).map((r) => (
              <tr key={r.id}>
                <td>
                  <code>{r.id}</code>
                  <span className="cell-sub">{r.rawAR}</span>
                </td>
                <td>
                  <strong>{r.tag}</strong>
                  <span className="cell-sub">{r.plant}</span>
                </td>
                <td>
                  <span className="cell-title">{r.title}</span>
                  <span className="cell-sub">
                    {r.equipment} · {r.component} · {r.mechanism}
                  </span>
                </td>
                <td>{r.date}</td>
                <td>
                  <Badge>{r.status}</Badge>
                </td>
                <td className="numeric">{r.risk ?? "Unavailable"}</td>
                <td>
                  <Button
                    variant="text"
                    onClick={() =>
                      navigate(
                        "investigation",
                        catalog.assets.find(
                          (a) => a.linked_incident_id === r.id,
                        )?.tag,
                        r.id,
                      )
                    }
                  >
                    Open case
                  </Button>
                  <Button
                    variant="text"
                    onClick={() =>
                      openSource({
                        title: r.id,
                        locators: [r.source],
                        excerpt: JSON.stringify(r.raw, null, 2),
                        kind: "source",
                        period: r.date,
                        unit: "h; k US$",
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
      {!rows.length && (
        <div className="empty">
          No incidents match these filters.{" "}
          <Button onClick={clear}>Reset filters</Button>
        </div>
      )}
      <Pagination
        page={page}
        total={rows.length}
        onChange={(p) => setQuery({ page: String(p) })}
      />
    </Panel>
  );
}

function Episodes() {
  const {
    query: q,
    setQuery,
    workspace,
    save,
    role,
    openSource,
    catalog,
    bundle,
  } = useHub();
  const [episodes, setEpisodes] = useState<Episode[]>([]),
    [error, setError] = useState(""),
    [loadedScope, setLoadedScope] = useState(""),
    [attempt, setAttempt] = useState(0);
  const mode = bundle?.mode ?? "historical";
  const cutoff =
    q.asOf ||
    q.episodeAsOf ||
    (mode === "prospective" ? bundle?.asOf : "") ||
    "";
  const scope = `${mode}:${cutoff}`;

  useEffect(() => {
    const c = new AbortController();
    const params = new URLSearchParams({ mode });
    if (cutoff) params.set("asOf", cutoff);
    fetch(`/api/episodes?${params}`, {
      signal: AbortSignal.any([c.signal, AbortSignal.timeout(10000)]),
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((e) => {
        if (c.signal.aborted) return;
        setEpisodes(e);
        setError("");
        setLoadedScope(scope);
      })
      .catch(() => {
        if (!c.signal.aborted)
          setError(
            "Condition episodes could not load. Check replay time and retry.",
          );
      });
    return () => c.abort();
  }, [mode, cutoff, scope, attempt]);

  const items = (loadedScope === scope ? episodes : []).filter(
    (e) =>
      (!q.episodeAsset || e.tag === q.episodeAsset) &&
      (!q.severity || e.severity === q.severity) &&
      (!q.episodeStatus ||
        (workspace.episodes[e.id] ?? "Open") === q.episodeStatus) &&
      (!q.episodeRisk ||
        (e.risk !== null && e.risk >= Number(q.episodeRisk))) &&
      (!q.episodePlant || e.plant === q.episodePlant),
  );

  return (
    <>
      <Panel
        title="Condition priority policy"
        sub="Operational severity prioritization based on threshold breaches and telemetry readings"
      >
        <div className="filter-bar">
          <Select
            label="Analysis Mode"
            ariaLabel="Episode analysis scope"
            value={mode}
            onChange={(v) =>
              setQuery({
                mode: v,
                asOf:
                  v === "prospective" ? cutoff || "2026-04-22 23:59:59" : "",
                episodeAsOf: "",
                tank: "conditions",
                incident: "",
              })
            }
            options={[
              { value: "historical", label: "Historical review" },
              { value: "prospective", label: "Pre-event replay" },
            ]}
          />
          <Select
            label="Asset"
            ariaLabel="Episode asset"
            value={q.episodeAsset ?? ""}
            onChange={(v) => setQuery({ episodeAsset: v })}
            options={[
              { value: "", label: "All five assets" },
              ...catalog.assets.map((a) => ({ value: a.tag, label: a.tag })),
            ]}
          />
          <Select
            label="Plant"
            ariaLabel="Episode plant"
            value={q.episodePlant ?? ""}
            onChange={(v) => setQuery({ episodePlant: v })}
            options={[
              { value: "", label: "All plants" },
              ...[...new Set(catalog.assets.map((a) => a.plant))].map((s) => ({
                value: s,
                label: s,
              })),
            ]}
          />
          <Select
            label="Severity"
            value={q.severity ?? ""}
            onChange={(v) => setQuery({ severity: v })}
            options={[
              { value: "", label: "All severities" },
              { value: "TRIP", label: "TRIP" },
              { value: "ALARM", label: "ALARM" },
            ]}
          />
          <Select
            label="Status"
            ariaLabel="Local review status"
            value={q.episodeStatus ?? ""}
            onChange={(v) => setQuery({ episodeStatus: v })}
            options={[
              { value: "", label: "All statuses" },
              ...["Open", "Acknowledged", "Grouped"].map((s) => ({
                value: s,
                label: s,
              })),
            ]}
          />
          <Field
            label="Cutoff Time"
            ariaLabel="Replay cutoff (source-local)"
            type="datetime-local"
            value={cutoff.replace(" ", "T")}
            onChange={(v) =>
              setQuery({ asOf: v.replace("T", " "), episodeAsOf: "" })
            }
          />
          <Field
            label="Min Risk"
            ariaLabel="Minimum eligible source risk"
            type="number"
            value={q.episodeRisk ?? ""}
            onChange={(v) => setQuery({ episodeRisk: v })}
          />
          <Button
            onClick={() =>
              setQuery({
                episodeAsset: "",
                episodePlant: "",
                severity: "",
                episodeStatus: "",
                episodeRisk: "",
                episodeAsOf: "",
                asOf: "",
              })
            }
          >
            Reset episode filters
          </Button>
        </div>
        {error && (
          <Notice tone="error">
            {error}{" "}
            <Button onClick={() => setAttempt((v) => v + 1)}>
              Retry episodes
            </Button>
          </Notice>
        )}
        {loadedScope !== scope && !error && (
          <p role="status">Loading condition episodes…</p>
        )}
        {items.map((e) => (
          <div className="episode-card" key={e.id}>
            <div className="episode-head">
              <div>
                <h3>{e.tag} · Condition family</h3>
                <p className="caption">
                  {e.first} to {e.last} · {e.samples.length} supporting weekly
                  samples
                </p>
              </div>
              <Badge tone={e.severity}>{e.severity}</Badge>
            </div>
            <p>{e.reason}</p>
            <div style={{ display: "flex", gap: "8px", margin: "10px 0" }}>
              <Badge tone="warning">Pending Review</Badge>
              <Badge tone="neutral">{workspace.episodes[e.id] ?? "Open"} · local review</Badge>
            </div>
            <div className="button-row">
              <Button
                variant="primary"
                onClick={() =>
                  setQuery({
                    view: "investigation",
                    asset: e.tag,
                    mode,
                    asOf: cutoff,
                    episodeAsOf: "",
                    incident: "",
                  })
                }
              >
                Investigate {e.tag}
              </Button>
              {["Acknowledged", "Grouped", "Open"].map((status) => (
                <Button
                  key={status}
                  disabled={(workspace.episodes[e.id] ?? "Open") === status}
                  onClick={() =>
                    save(
                      (w) => ({
                        ...w,
                        episodes: {
                          ...w.episodes,
                          [e.id]: status as "Open" | "Acknowledged" | "Grouped",
                        },
                        history: [
                          ...w.history,
                          {
                            at: new Date().toISOString(),
                            actor: role,
                            description: `${e.id}: ${status}`,
                          },
                        ],
                      }),
                      `Episode marked as ${status.toLowerCase()}.`,
                    )
                  }
                >
                  {status === "Open"
                    ? "Reopen episode"
                    : status === "Grouped"
                      ? "Group supporting samples"
                      : "Acknowledge episode"}
                </Button>
              ))}
              <Button
                variant="text"
                onClick={() =>
                  openSource({
                    title: `${e.tag} episode support`,
                    locators: e.samples.map((id) => ({
                      file: catalog.assets.find((a) => a.tag === e.tag)!
                        .info_source.file,
                      sheet: "Condition History",
                      cell: `A${id.split(":").at(-1)}:H${id.split(":").at(-1)}`,
                    })),
                    kind: "computed",
                    period: `${e.first} to ${e.last}`,
                    formula: e.conditions.join("\n"),
                    excerpt: `Supporting sample IDs:\n${e.samples.join("\n")}\n\n${e.reason}`,
                  })
                }
              >
                Priority & supporting sample IDs
              </Button>
            </div>
          </div>
        ))}
        {!items.length && !error && loadedScope === scope && (
          <div className="empty">
            No condition episodes match the active filters.
          </div>
        )}
      </Panel>
    </>
  );
}
