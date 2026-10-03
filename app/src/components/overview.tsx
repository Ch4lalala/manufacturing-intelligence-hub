"use client";
import { useState } from "react";
import { aggregate, filterIncidents, money, number } from "@/lib/domain";
import { useHub } from "./hub";
import { Badge, Button, Panel, Select, Field } from "./ui";
import { Icon } from "./icons";
import { Chart } from "./chart";
import { QualityPanel } from "./evidence-panels";
import { Utilities } from "./utilities";

export function Overview() {
  const { catalog, bundle, query, setQuery, navigate, openSource, workspace } =
    useHub();
  const [parameter, setParameter] = useState(0);
  if (!bundle) return null;
  const rows = filterIncidents(catalog.incidents, {
      plant: query.regPlant,
      from: query.regFrom,
      to: query.regTo,
    }),
    totals = aggregate(rows),
    a = bundle.asset;
  const scope = `${query.regPlant || "All plants"} · ${query.regFrom || "2024-01-04"} to ${query.regTo || "2026-07-25"}`;
  const definitions = [
    {
      label: "Register incidents",
      value: number(totals.count, 0),
      unit: "records",
      caption: "Verified Register Records",
      formula:
        "Count of stable source row IDs within the visible register filters.",
    },
    {
      label: "Registered downtime",
      value: number(totals.downtime, 1),
      unit: "h",
      caption: "Cumulative Register Hours",
      formula:
        "Sum of source Downtime (hrs) within the visible register filters; not avoidable plant shutdown.",
    },
    {
      label: "Act. Loss",
      value: money(totals.actual),
      unit: "k US$",
      caption: "Realized Loss Exposure",
      formula:
        "Sum of source Act. Loss (k US$), in integer hundredths; source column, not externally audited cash.",
    },
    {
      label: "Pot. Loss",
      value: money(totals.potential),
      unit: "k US$",
      caption: "Potential Risk Exposure",
      formula:
        "Sum of source Pot. Loss (k US$), separate from actual loss and savings.",
    },
  ];
  const trip = bundle.conditions.find((c) => c.status === "TRIP");
  const alarmCount = bundle.conditions.filter(
    (c) => c.status === "ALARM" && (!trip || c.date < trip.date),
  ).length;
  const metadata = a.production_metadata.find((m) => m.Name === "PLANT_RATE")!;

  return (
    <>
      <div className="section-label">
        <div>
          <h2>Enterprise Register Analytics</h2>
          <p>{scope} · Telemetry records across operational plants</p>
        </div>
        <Badge tone="neutral">Production Records</Badge>
      </div>
      <div className="filter-bar">
        <Select
          label="Plant"
          ariaLabel="Register plant scope"
          value={query.regPlant ?? ""}
          onChange={(v) => setQuery({ regPlant: v })}
          options={[
            { value: "", label: "All plants" },
            ...[...new Set(catalog.incidents.map((r) => r.plant))]
              .sort()
              .map((s) => ({ value: s, label: s })),
          ]}
        />
        <Field
          label="Date From"
          ariaLabel="Register date from"
          type="date"
          value={query.regFrom ?? ""}
          onChange={(v) => setQuery({ regFrom: v })}
        />
        <Field
          label="Date To"
          ariaLabel="Register date to"
          type="date"
          value={query.regTo ?? ""}
          onChange={(v) => setQuery({ regTo: v })}
        />
        <Button
          onClick={() => setQuery({ regPlant: "", regFrom: "", regTo: "" })}
        >
          Reset scope
        </Button>
      </div>
      <div className="metric-grid">
        {definitions.map((k) => (
          <section className="metric" key={k.label}>
            <div className="metric-header">
              <span className="metric-label">{k.label}</span>
              <Badge tone="neutral">{k.unit}</Badge>
            </div>
            <div className="metric-value">
              {k.value} <small>{k.unit}</small>
            </div>
            <p className="caption">{k.caption}</p>
            <Button
              variant="text"
              onClick={() =>
                openSource({
                  title: k.label,
                  kind: "computed",
                  locators: [
                    {
                      file: "sources/baseline/incidents/Incident Database.xlsx",
                      sheet: "Incident Database",
                      cell: "A4:W383",
                    },
                  ],
                  period: scope,
                  unit: k.unit,
                  formula: k.formula,
                  owner:
                    workspace.owners[k.label] ?? "Reliability data steward",
                  excerpt: `Filtered calculation: ${k.value} ${k.unit}\nRecord IDs:\n${rows.map((r) => `${r.id} / ${r.source.cell}`).join("\n")}`,
                })
              }
            >
              Definition & source
            </Button>
          </section>
        ))}
      </div>
      <div className="section-label">
        <div>
          <h2>{a.tag} · Operational Telemetry</h2>
          <p>{a.plant_text} · High-frequency production and condition streams</p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setQuery({
              view: "problems",
              tank: "conditions",
              episodeAsset: a.tag,
            });
          }}
        >
          <Icon name="problems" /> Open prioritized issues
        </Button>
      </div>
      <div className="grid-two overview-trends">
        <div>
          <Chart
            title="Plant rate · hourly observations"
            unit={metadata.engunits}
            points={bundle.production.map((p) => ({
              time: String(p.values.Timestamp),
              value: Number(p.values.PLANT_RATE),
              status: String(p.values.RUN_STATUS),
              source: () =>
                openSource({
                  title: `${a.tag} hourly observation`,
                  locators: [p.source],
                  excerpt: JSON.stringify(p.values, null, 2),
                  period: String(p.values.Timestamp),
                  unit: metadata.engunits,
                  kind: "source",
                }),
            }))}
            caption={`${a.hourlyWindow} · Production rate monitoring`}
          />
          <div className="filter-bar">
            <Select
              label="Weekly Parameter"
              ariaLabel="Weekly condition parameter"
              value={String(parameter)}
              onChange={(v) => setParameter(Number(v))}
              options={a.condition_headers.map((s, i) => ({
                value: String(i),
                label: s.replace(/\n/g, " "),
              }))}
            />
          </div>
          <Chart
            title={a.condition_headers[parameter].split("\n")[0]}
            unit={
              a.condition_headers[parameter].split("\n")[1] ?? "Source unit"
            }
            points={bundle.conditions.map((c) => ({
              time: c.date,
              value: c.measurements[parameter],
              status: c.status,
              source: () =>
                openSource({
                  title: `${a.tag} weekly observation`,
                  locators: [c.source],
                  excerpt: bundle.evidence.find(
                    (e) => e.id === `${a.tag}:weekly:${c.row}`,
                  )!.excerpt,
                  period: c.date,
                  kind: "source",
                }),
            }))}
            caption={`${a.weeklyWindow} · ${alarmCount} ALARM readings prior to first TRIP`}
          />
        </div>
        <div>
          <Panel
            title="Decision context"
            sub={`${a.tag} · Operational Assessment`}
          >
            <Badge tone="TRIP">TRIP Event</Badge>
            <h3>{bundle.incident?.title}</h3>
            <p>
              {a.criticality_source} criticality · Risk score{" "}
              {bundle.incident?.risk ?? "unavailable"}
            </p>
            <p>
              <strong>{bundle.incident?.downtime} h</strong> reported downtime ·{" "}
              <strong>{alarmCount}</strong> ALARM readings prior to TRIP
            </p>
            <Button
              variant="primary"
              onClick={() => navigate("investigation", a.tag)}
            >
              <Icon name="investigation" /> Investigate {a.tag}
            </Button>
          </Panel>
          <QualityPanel quality={bundle.quality} compact />
          <Panel
            title="Reliability & Health KPIs"
            sub="Standard operational reliability benchmarks"
          >
            {bundle.summary
              .filter(
                (s) =>
                  s.name.includes("Availability") ||
                  s.name.includes("PM Compliance"),
              )
              .map((s) => (
                <div className="definition-row" key={s.name}>
                  <div>
                    <p>{s.name}</p>
                    <strong>{number(Number(s.value), 3)}%</strong>
                    <p className="caption">Target benchmark</p>
                  </div>
                  <Button
                    variant="text"
                    onClick={() =>
                      openSource({
                        title: s.name,
                        kind: "source-stated",
                        locators: [s.source],
                        period: a.weeklyWindow,
                        unit: "%",
                        formula: String(s.formula),
                        owner:
                          workspace.owners[s.name] ??
                          "Reliability data steward",
                        excerpt: `${s.name}: ${s.value}\nBasis: ${s.basis}`,
                      })
                    }
                  >
                    Definition & source
                  </Button>
                </div>
              ))}
          </Panel>
        </div>
      </div>
      <div className="grid-equal">
        <Panel
          title="Status Composition"
          sub={`${rows.length} records in active scope`}
        >
          <div>
            {Object.entries(totals.statuses).map(([status, count]) => (
              <div className="status-row" key={status}>
                <span>{status}</span>
                <progress max={Math.max(1, rows.length)} value={count} />
                <strong>{count}</strong>
              </div>
            ))}
          </div>
          {!rows.length && <p>No records match this scope.</p>}
        </Panel>
        <Panel
          title="Priority Incidents"
          sub="Ranked by operational risk score"
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Risk Score</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {[...rows]
                  .sort((x, y) => (y.risk ?? -1) - (x.risk ?? -1))
                  .slice(0, 4)
                  .map((r) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.tag}</strong>
                        <span className="cell-sub">
                          {r.title} · {r.date}
                        </span>
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
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
      <Panel
        title="Asset scenario catalog"
        sub="Monitored industrial assets across manufacturing units"
        action={<Badge tone="neutral">Fleet Directory</Badge>}
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Asset</th>
                <th>Hourly Window</th>
                <th>Weekly Window</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {catalog.assets.map((asset) => (
                <tr key={asset.tag}>
                  <td>
                    <code>{asset.tag}</code>
                    <span className="cell-sub">
                      {asset.name} · {asset.plant}
                    </span>
                  </td>
                  <td>{asset.hourlyWindow}</td>
                  <td>{asset.weeklyWindow}</td>
                  <td>
                    <Button
                      variant="text"
                      onClick={() => {
                        setQuery({
                          view: "investigation",
                          asset: asset.tag,
                          incident: "",
                          asOf: "",
                          episodeAsOf: "",
                        });
                      }}
                    >
                      Inspect Telemetry <Icon name="arrow" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Utilities />
    </>
  );
}
