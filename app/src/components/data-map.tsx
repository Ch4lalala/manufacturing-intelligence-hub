"use client";
import { useState } from "react";
import { useHub } from "./hub";
import { Panel, Badge, Button, Field, Search, Notice, Accordion } from "./ui";
import { QualityPanel } from "./evidence-panels";
import { number } from "@/lib/domain";
import type { Quality } from "@/lib/types";

export function DataMap() {
  const { catalog, bundle, openSource, workspace, save, role } = useHub();
  const [query, setQuery] = useState(""),
    [owners, setOwners] = useState<Record<string, string>>({});
  if (!bundle) return null;
  const register = {
    file: "sources/baseline/incidents/Incident Database.xlsx",
    sheet: "Incident Database",
    cell: "A4:W383",
  };
  const extra: Quality[] = [
    {
      id: "DQ09",
      title: "226 AR placeholders remain searchable",
      detail:
        "Raw AR is literal n/a, normalized usable identifier null. Stable incident-row IDs preserve every record.",
      locators: [register],
    },
    {
      id: "DQ10",
      title: "Two AR identifiers are reused",
      detail:
        "AR-2026-OP2-0171 appears on Serial 129/331; AR-2024-ZCU-0236 on Serial 133/188. Reports link by AR + tag + plant + event date; no AR-only merge.",
      locators: [register],
    },
    {
      id: "DQ12",
      title: "Total exposure includes potential loss",
      detail:
        "Total Loss = Act. Loss + Pot. Loss per row. Total exposure is not a realized-loss or recoverable-savings figure.",
      locators: [register],
    },
    {
      id: "DQ15",
      title: "Additional sources require contracts",
      detail:
        "Energy/emission inputs, existing dashboard inventory, staff/stock/schedules, acknowledgement logs and benefit measurements were not supplied. Proposed integrations and synthetic utilities are explicitly labeled.",
      locators: [],
    },
  ];
  const sources = catalog.inventory.filter((s) =>
    s.path.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <>
      <div className="metric-grid">
        <div className="metric">
          <div className="metric-header">
            <span className="metric-label">Verified Sources</span>
            <Badge tone="neutral">SHA-256</Badge>
          </div>
          <div className="metric-value">22</div>
          <p className="caption">Verified Original Telemetry Files</p>
          <Button
            variant="text"
            onClick={() =>
              openSource({
                title: "Original source count",
                locators: catalog.inventory.map((s) => ({ file: s.path })),
                kind: "computed",
                unit: "files",
                period: "Production Inventory",
                formula:
                  "Count entries with verified original SHA-256 in supplied inventory",
                owner: "Data governance steward",
                excerpt: catalog.inventory
                  .map((s) => `${s.path}\nSHA-256 ${s.sha256}`)
                  .join("\n\n"),
              })
            }
          >
            Definition & source
          </Button>
        </div>
        <div className="metric">
          <div className="metric-header">
            <span className="metric-label">Baseline Datasets</span>
            <Badge tone="neutral">Core</Badge>
          </div>
          <div className="metric-value">16</div>
          <p className="caption">Production, Condition, RCA & Register</p>
          <Button
            variant="text"
            onClick={() =>
              openSource({
                title: "Baseline coverage",
                locators: catalog.inventory
                  .filter(
                    (s) =>
                      s.path.includes("/baseline/") &&
                      !s.path.includes("/explanation/"),
                  )
                  .map((s) => ({ file: s.path })),
                kind: "computed",
                unit: "files",
                period: "Production Baseline",
                formula: "5 production + 5 equipment + 5 RCA + 1 register = 16",
                owner: "Data governance steward",
                excerpt: catalog.inventory
                  .filter(
                    (s) =>
                      s.path.includes("/baseline/") &&
                      !s.path.includes("/explanation/"),
                  )
                  .map((s) => s.path)
                  .join("\n"),
              })
            }
          >
            Definition & source
          </Button>
        </div>
        <div className="metric">
          <div className="metric-header">
            <span className="metric-label">Incident Records</span>
            <Badge tone="neutral">Indexed</Badge>
          </div>
          <div className="metric-value">380</div>
          <p className="caption">Total Production Records</p>
          <Button
            variant="text"
            onClick={() =>
              openSource({
                title: "Stable incident coverage",
                locators: [register],
                kind: "computed",
                unit: "records",
                period: "2024-01-04 to 2026-07-25",
                formula:
                  "Count source rows 4–383; retain raw n/a AR; normalize usable AR to null",
                owner: "Reliability register steward",
                excerpt: `380 stable rows; 226 raw n/a identifiers; source IDs incident-row-4 to incident-row-383.\n${catalog.incidents
                  .filter((i) => i.ar === null)
                  .map((i) => `${i.id}: ${i.rawAR}`)
                  .join("\n")}`,
              })
            }
          >
            Definition & source
          </Button>
        </div>
        <div className="metric">
          <div className="metric-header">
            <span className="metric-label">Detailed RCA Reports</span>
            <Badge tone="neutral">Decks</Badge>
          </div>
          <div className="metric-value">5</div>
          <p className="caption">Multi-slide Engineering Investigations</p>
          <Button
            variant="text"
            onClick={() =>
              openSource({
                title: "Detailed report coverage",
                locators: catalog.assets.map((a) => ({ file: a.reportFile })),
                kind: "computed",
                unit: "reports",
                period: "Engineering Archives",
                formula:
                  "Count explicit AR + tag + plant + event date qualified links",
                owner: "Engineering reviewer",
                excerpt: catalog.assets
                  .map(
                    (a) =>
                      `${a.linked_incident_id}: ${a.ar} + ${a.tag} + ${a.plant} + ${a.eventDate}`,
                  )
                  .join("\n"),
              })
            }
          >
            Definition & source
          </Button>
        </div>
      </div>
      <Panel
        title="Enterprise Entity Model"
        sub="Relational architecture connecting plants, assets, and verification workflows"
      >
        <div className="mapping">
          <div>
            <strong>Plant → Asset → Observation</strong>
            Direct mapping connecting plant units to high-frequency telemetry.
          </div>
          <div>
            <strong>Incident → Qualified Report</strong>
            Structured foreign keys linking register records to root-cause
            decks.
          </div>
          <div>
            <strong>Problem → Action → Verification</strong>
            Audited lifecycle from detection through sign-off and closure.
          </div>
        </div>
        <Notice>
          Asset telemetry streams maintain independent measurement windows and
          engineering units.
        </Notice>
      </Panel>
      <Panel
        title="Measurement Units & Telemetry Coverage"
        sub={`${bundle.asset.tag} · Active Scope`}
      >
        <p className="caption">
          Hourly coverage:{" "}
          {bundle.production.length
            ? `${bundle.production[0].values.Timestamp} to ${bundle.production.at(-1)!.values.Timestamp}`
            : "No eligible hourly observations."}{" "}
          Weekly coverage:{" "}
          {bundle.conditions.length
            ? `${bundle.conditions[0].date} to ${bundle.conditions.at(-1)!.date}`
            : "No eligible weekly observations."}{" "}
          Source-local time; timezone unknown. Metadata retains its original
          source window.
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Hourly PI Tag</th>
                <th>Definition</th>
                <th>Engineering Unit</th>
                <th>Locator</th>
              </tr>
            </thead>
            <tbody>
              {bundle.asset.production_metadata.map((m, i) => (
                <tr key={m.Name}>
                  <td>
                    <code>{m.Name}</code>
                  </td>
                  <td>{m.Description}</td>
                  <td>{m.engunits}</td>
                  <td>
                    <Button
                      variant="text"
                      onClick={() =>
                        openSource({
                          title: m.Name,
                          locators: [
                            {
                              file: bundle.evidence.find(
                                (e) => e.id === `${bundle.asset.tag}:metadata`,
                              )!.locator.file,
                              sheet: "PI Tag",
                              cell: `A${i + 2}:H${i + 2}`,
                            },
                          ],
                          excerpt: JSON.stringify(m, null, 2),
                          kind: "source",
                          unit: m.engunits,
                          period: bundle.asset.hourlyWindow,
                        })
                      }
                    >
                      PI Tag row {i + 2}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="grid-two content-columns data-columns">
        <div className="panel-stack">
          <Panel
            title="Source Library"
            sub="Verified system files, technical manuals, and baseline workbooks"
          >
            <Search label="Search" value={query} onChange={setQuery} />
            <div
              className="source-list"
              tabIndex={0}
              role="region"
              aria-label="Source Library files"
            >
              {sources.map((s) => (
                <div key={s.path}>
                  <Badge tone="neutral">
                    {s.path.includes("/baseline/explanation/")
                      ? "Explanation"
                      : s.path.includes("/baseline/")
                        ? "Baseline"
                        : s.path.includes("/official/")
                          ? "Official"
                          : s.path.includes("/notes/")
                            ? "Summary"
                            : "Reference"}
                  </Badge>
                  <p>
                    <code>{s.path}</code>
                  </p>
                  <div className="button-row">
                    <Button
                      variant="text"
                      onClick={() =>
                        openSource({
                          title: s.path.split("/").at(-1)!,
                          locators: [{ file: s.path }],
                        })
                      }
                    >
                      Open source content
                    </Button>
                    <a
                      href={`/api/source?file=${encodeURIComponent(s.path)}&download=1`}
                    >
                      Download Original
                    </a>
                  </div>
                </div>
              ))}
            </div>
            {!sources.length && (
              <div className="empty">
                No matching files.{" "}
                <Button onClick={() => setQuery("")}>Clear search</Button>
              </div>
            )}
          </Panel>
          <Panel
            title="Enterprise Data Architecture"
            sub="Integration boundaries, telemetry grain, and stewardship allocation"
          >
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Enterprise Data Architecture table"
            >
              <table>
                <thead>
                  <tr>
                    <th>Source System</th>
                    <th>Governed Capability</th>
                    <th>Entity / Grain</th>
                    <th>Data Steward</th>
                    <th>Integration Boundary</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    [
                      "Production Historian",
                      "Asset performance and rate telemetry",
                      "Asset / Hourly",
                      "Operations Data Steward",
                      "Calibrated time-series buffer",
                    ],
                    [
                      "Condition Monitoring",
                      "Condition episodes and alarm thresholds",
                      "Asset / Weekly",
                      "Reliability Data Steward",
                      "Engineering threshold governance",
                    ],
                    [
                      "Incident Database",
                      "Event registry and financial exposure",
                      "Incident Row ID",
                      "Reliability Register Steward",
                      "Immutable event history",
                    ],
                    [
                      "Root Cause Decks",
                      "Engineering evidence and corrective actions",
                      "Report Slide / Action",
                      "Engineering Reviewer",
                      "Audited mitigation lifecycle",
                    ],
                    [
                      "Utility Grid",
                      "Energy, intensity, and carbon emissions",
                      "Meter / Hour",
                      "Utilities Data Steward",
                      "Standardized telemetry interface",
                    ],
                  ].map((row) => (
                    <tr key={row[0]}>
                      {row.map((cell, i) => (
                        <td key={i}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
        <div className="panel-stack">
          <Panel
            title="KPI Dictionary"
            sub={`${bundle.asset.tag} · Metric definitions, calculation basis, and designated stewards`}
          >
            {bundle.summary.map((s) => (
              <details className="definition-row kpi-definition" key={s.name}>
                <summary>
                  <strong>{s.name}</strong>
                  <span className="kpi-summary-value">
                    {typeof s.value === "number" ? number(s.value, 3) : s.value}{" "}
                    <Badge tone="neutral">Metric</Badge>
                  </span>
                </summary>
                <div className="definition-content">
                  <div>
                    <p className="caption">Basis: {String(s.basis)}</p>
                    <Field
                      label="Data Steward"
                      ariaLabel={`Proposed owner · ${s.name}`}
                      value={
                        owners[s.name] ??
                        workspace.owners[s.name] ??
                        "Reliability data steward"
                      }
                      onChange={(v) =>
                        setOwners((o) => ({ ...o, [s.name]: v }))
                      }
                    />
                    <Button
                      variant="text"
                      disabled={!(owners[s.name] ?? "").trim()}
                      onClick={() =>
                        save(
                          (w) => ({
                            ...w,
                            owners: {
                              ...w.owners,
                              [s.name]: owners[s.name].trim(),
                            },
                            history: [
                              ...w.history,
                              {
                                at: new Date().toISOString(),
                                actor: role,
                                description: `KPI steward updated: ${s.name}`,
                              },
                            ],
                          }),
                          "Designated steward updated.",
                        )
                      }
                    >
                      Save proposed owner
                    </Button>
                  </div>
                  <Button
                    variant="text"
                    onClick={() =>
                      openSource({
                        title: s.name,
                        locators: [s.source],
                        kind: "source-stated",
                        formula: String(s.formula),
                        period: bundle.asset.weeklyWindow,
                        unit: s.name.includes("%")
                          ? "%"
                          : s.name.includes("hours") ||
                              s.name === "Period Hours"
                            ? "h"
                            : s.name.includes("ton")
                              ? "ton"
                              : s.name.includes("USD")
                                ? "k USD"
                                : "count",
                        owner:
                          workspace.owners[s.name] ??
                          "Reliability data steward",
                        excerpt: `${s.name}: ${s.value}\nBasis: ${s.basis}\nFormula: ${s.formula}`,
                      })
                    }
                  >
                    Definition & source
                  </Button>
                </div>
              </details>
            ))}
          </Panel>
        </div>
      </div>
      <GovernanceRoadmap />
      <QualityPanel quality={[...bundle.quality, ...extra]} />
    </>
  );
}

function GovernanceRoadmap() {
  return (
    <Panel
      title="Governance & Integration Roadmap"
      sub="Operational readiness framework and integration milestones"
    >
      <div className="accordion-group">
        <Accordion title="Stewardship and Data Quality Governance" icon="user">
          <dl className="governance-content">
            <div>
              <dt>Review ownership</dt>
              <dd>
                Nominate domain data stewards and assign formal review ownership
                for each telemetry feed.
              </dd>
            </div>
            <div>
              <dt>Integration boundaries</dt>
              <dd>
                Ensure engineering units, threshold versions, and foreign key
                relationships are strictly maintained across integration
                boundaries.
              </dd>
            </div>
          </dl>
        </Accordion>
        <Accordion title="Operational Pilot Validation" icon="check">
          <dl className="governance-content">
            <div>
              <dt>Validation</dt>
              <dd>
                Validate telemetry latency, citation correctness, and action
                verification workflows in live operational environments.
              </dd>
            </div>
            <div>
              <dt>Measurement</dt>
              <dd>Measure resolution speed and compliance rate.</dd>
            </div>
          </dl>
        </Accordion>
        <Accordion title="Enterprise Rollout Sequence" icon="arrow">
          <ol className="governance-sequence">
            <li>
              <strong>Phase 1</strong>
              <span>Ingest asset historian feeds</span>
            </li>
            <li>
              <strong>Phase 2</strong>
              <span>Connect work management & incident tracking</span>
            </li>
            <li>
              <strong>Phase 3</strong>
              <span>Activate predictive analytics and utility monitoring.</span>
            </li>
          </ol>
        </Accordion>
      </div>
    </Panel>
  );
}
