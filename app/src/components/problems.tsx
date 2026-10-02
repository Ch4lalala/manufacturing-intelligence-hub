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
  const tank = h.query.tank ?? "conditions";
  return (
    <>
      <div className="tabs" aria-label="Problem source">
        <Button
          className={tank === "register" ? "selected" : ""}
          aria-pressed={tank === "register"}
          onClick={() => h.setQuery({ tank: "register" })}
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
      title="Historical incident register"
      sub="Every original row remains distinct; imported status and source risk scores"
      action={<Badge>Source snapshot</Badge>}
    >
      <div className="filter-bar">
        <Search
          label="Search 380 register rows"
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
          label="Exact asset tag"
          value={q.tag ?? ""}
          onChange={(v) => filter("tag", v)}
        />
        <Select
          label="Source status"
          value={q.status ?? ""}
          onChange={(v) => filter("status", v)}
          options={[
            { value: "", label: "All statuses" },
            ...statusOptions.map((s) => ({ value: s, label: s })),
          ]}
        />
      </div>
      <div className="filter-bar">
        <Field
          label="Minimum source risk"
          value={q.risk ?? ""}
          onChange={(v) => filter("risk", v)}
          type="number"
          min="0"
        />
        <Field
          label="Event date from"
          type="date"
          value={q.from ?? ""}
          onChange={(v) => filter("from", v)}
        />
        <Field
          label="Event date to"
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
        {money(totals.potential)} k US$. Computed within these filters; no
        benefit claim.
      </Notice>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Record / AR</th>
              <th>Asset / plant</th>
              <th>Issue / context</th>
              <th>Event date</th>
              <th>Source status</th>
              <th>Risk</th>
              <th>Review</th>
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
      <p className="caption">
        226 raw n/a identifiers remain searchable. Two AR identifiers are
        reused; the source row ID is the primary identity. Only five records
        have supplied detailed RCA decks.
      </p>
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
    navigate,
    openSource,
    catalog,
  } = useHub();
  const [episodes, setEpisodes] = useState<Episode[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    const c = new AbortController();
    fetch(
      `/api/episodes${q.episodeAsOf ? `?asOf=${encodeURIComponent(q.episodeAsOf)}` : ""}`,
      { signal: AbortSignal.any([c.signal, AbortSignal.timeout(10000)]) },
    )
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((e) => {
        setEpisodes(e);
        setError("");
      })
      .catch(() => {
        if (!c.signal.aborted)
          setError(
            "Condition episodes could not load. Check replay time and retry.",
          );
      });
    return () => c.abort();
  }, [q.episodeAsOf]);
  const items = episodes.filter(
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
        sub="Proposed policy · source-workbook classifications · threshold version uncertain"
      >
        <p>
          TRIP precedes ALARM, then source criticality, available source risk
          and latest supporting observation. Missing risk stays unavailable. One
          condition-family episode per asset retains its source samples;
          acknowledgement, grouping and reopening preserve that same identity.
        </p>
        <p className="caption">
          Default: all five supplied weekly windows, with distinct dates. A
          replay cutoff filters samples before priority computation. Source
          criticality is metadata; risk is excluded until the linked event date.
        </p>
        <div className="filter-bar">
          <Select
            label="Episode asset"
            value={q.episodeAsset ?? ""}
            onChange={(v) => setQuery({ episodeAsset: v })}
            options={[
              { value: "", label: "All five assets" },
              ...catalog.assets.map((a) => ({ value: a.tag, label: a.tag })),
            ]}
          />
          <Select
            label="Episode plant"
            value={q.episodePlant ?? ""}
            onChange={(v) => setQuery({ episodePlant: v })}
            options={[
              { value: "", label: "All scenario plants" },
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
            label="Local review status"
            value={q.episodeStatus ?? ""}
            onChange={(v) => setQuery({ episodeStatus: v })}
            options={[
              { value: "", label: "All local statuses" },
              ...["Open", "Acknowledged", "Grouped"].map((s) => ({
                value: s,
                label: s,
              })),
            ]}
          />
        </div>
        <div className="filter-bar">
          <Field
            label="Replay cutoff (source-local)"
            type="datetime-local"
            value={(q.episodeAsOf ?? "").replace(" ", "T")}
            onChange={(v) => setQuery({ episodeAsOf: v.replace("T", " ") })}
          />
          <Field
            label="Minimum eligible source risk"
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
              })
            }
          >
            Reset episode filters
          </Button>
        </div>
        {error && <Notice tone="error">{error}</Notice>}
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
            <Badge tone="warning">Needs data review</Badge>{" "}
            <Badge>{workspace.episodes[e.id] ?? "Open"} · local review</Badge>
            <div className="button-row">
              <Button
                variant="primary"
                onClick={() => navigate("investigation", e.tag)}
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
                      `Episode ${status.toLowerCase()} locally; source samples preserved.`,
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
                    locators: [
                      {
                        file: catalog.assets.find((a) => a.tag === e.tag)!
                          .info_source.file,
                        sheet: "Condition History",
                        cell: "A2:H27",
                      },
                    ],
                    kind: "computed",
                    period: `${e.first} to ${e.last}`,
                    formula: e.conditions.join("\n"),
                    excerpt: `Supporting sample IDs:\n${e.samples.join("\n")}\n\n${e.reason}`,
                    warnings: [
                      "Counts describe workbook-classified weekly readings; not alarm deliveries or ignored alerts.",
                    ],
                  })
                }
              >
                Priority & supporting sample IDs
              </Button>
            </div>
          </div>
        ))}
        {!items.length && !error && (
          <div className="empty">
            No condition episodes match. Clear filters or move the source replay
            time forward.
          </div>
        )}
      </Panel>
    </>
  );
}
