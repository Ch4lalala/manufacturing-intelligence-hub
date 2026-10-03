"use client";
import { useState } from "react";
import { useHub } from "./hub";
import { Panel, Badge, Button, Field, Search, Notice } from "./ui";
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
          <p className="metric-label">Verified original sources</p>
          <p className="metric-value">22</p>
          <p className="caption">SHA-256 matched · 02 October 2026</p>
          <Button
            variant="text"
            onClick={() =>
              openSource({
                title: "Original source count",
                locators: catalog.inventory.map((s) => ({ file: s.path })),
                kind: "computed",
                unit: "files",
                period: "02 October 2026 snapshot",
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
          <p className="metric-label">Baseline files</p>
          <p className="metric-value">16</p>
          <p className="caption">
            5 production / 5 condition / 5 RCA / 1 register
          </p>
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
                period: "Supplied snapshot",
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
          <p className="metric-label">Stable incident records</p>
          <p className="metric-value">380</p>
          <p className="caption">226 literal n/a AR identifiers retained</p>
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
          <p className="metric-label">Detailed RCA coverage</p>
          <p className="metric-value">5</p>
          <p className="caption">11 slides per asset · other 375 lack decks</p>
          <Button
            variant="text"
            onClick={() =>
              openSource({
                title: "Detailed report coverage",
                locators: catalog.assets.map((a) => ({ file: a.reportFile })),
                kind: "computed",
                unit: "reports",
                period: "Historical snapshot; publication dates unknown",
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
        title="Governed source relationships"
        sub="Proposed entity model; source observations and historical records remain immutable"
      >
        <div className="mapping">
          <div>
            <strong>Plant → Asset → Observation</strong>Explicit source plant
            mapping.
            <br />
            Hourly and weekly grains stored separately.
          </div>
          <div>
            <strong>Incident → Qualified report</strong>Stable row ID plus AR,
            tag, plant and date.
            <br />
            Unknown links remain needs-review.
          </div>
          <div>
            <strong>Problem → Action → Verification</strong>Accepted evidence,
            proposed owner, approval.
            <br />
            Completion evidence and reviewer-confirmed closure.
          </div>
        </div>
        <Notice>
          Generic tag names and source scenario labels do not establish
          simultaneous stream aggregation. Plant rate from different asset
          months is never summed.
        </Notice>
      </Panel>
      <Panel
        title="Measurement units & source clock coverage"
        sub={`${bundle.asset.tag} · Review reference ${bundle.asOf} · source-local timezone unknown`}
      >
        <p className="caption">
          Hourly coverage: {bundle.asset.hourlyWindow}. Weekly coverage:{" "}
          {bundle.asset.weeklyWindow}.{" "}
          {bundle.conditions.length ? (
            <>
              Latest weekly date is{" "}
              {bundle.conditions.at(-1)!.date > bundle.asOf.slice(0, 10)
                ? "after"
                : bundle.conditions.at(-1)!.date === bundle.asOf.slice(0, 10)
                  ? "on"
                  : "before"}{" "}
              the review reference date.{" "}
            </>
          ) : (
            "No eligible weekly observations. "
          )}
          {bundle.observationCutoff
            ? "The cutoff limits observations; completed report context is retrospective. "
            : "Historical review retains the complete separately labeled source window. "}
          Ingestion freshness and report availability cannot be established
          without availability timestamps.
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Hourly PI tag</th>
                <th>Source definition</th>
                <th>Source unit</th>
                <th>Metadata locator</th>
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
        <p className="caption">
          Weekly condition parameters retain their own units:{" "}
          {bundle.asset.condition_headers
            .map((s) => s.replace(/\n/g, " "))
            .join("; ")}
          . KO velocity MM/S and radial displacement micron remain incompatible;
          no conversion or shared alarm line.
        </p>
      </Panel>
      <div className="grid-two">
        <Panel
          title="Source library"
          sub="16 baseline files + explanation + supplemental note + 2 official PDFs + 2 workflow-reference snapshots"
        >
          <Search
            label="Search source files"
            value={query}
            onChange={setQuery}
          />
          <div className="source-list">
            {sources.map((s) => (
              <div key={s.path}>
                <Badge>
                  {s.path.includes("/baseline/explanation/")
                    ? "Explanation"
                    : s.path.includes("/baseline/")
                      ? "Baseline"
                      : s.path.includes("/official/")
                        ? "Official"
                        : s.path.includes("/notes/")
                          ? "Supplemental summary"
                          : "Workflow reference"}
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
                        warnings: s.path.includes("/notes/")
                          ? [
                              "User-supplied summary; not a verified verbatim official transcript.",
                            ]
                          : s.path.includes("/reference/")
                            ? [
                                "Workflow inspiration only; no tire-factory data or Azure dependency imported.",
                              ]
                            : [],
                      })
                    }
                  >
                    Open source content
                  </Button>
                  <a
                    href={`/api/source?file=${encodeURIComponent(s.path)}&download=1`}
                  >
                    Original
                  </a>
                </div>
                <details>
                  <summary>Integrity & scope</summary>
                  <code>SHA-256 {s.sha256}</code>
                  <p className="caption">
                    {s.bytes.toLocaleString("en-US")} bytes · baseline snapshot.
                    Retrieval date is not report publication availability.
                  </p>
                </details>
              </div>
            ))}
          </div>
          {!sources.length && (
            <div className="empty">
              No source matches.{" "}
              <Button onClick={() => setQuery("")}>Clear search</Button>
            </div>
          )}
        </Panel>
        <Panel
          title="KPI dictionary"
          sub={`${bundle.asset.tag} · Source-stated values, formulas and proposed owners`}
        >
          <p className="caption">
            Source weekly window: {bundle.asset.weeklyWindow}. Definition
            changes require reviewed approval in an operational rollout.
          </p>
          {bundle.summary.map((s) => (
            <details className="definition-row kpi-definition" key={s.name}>
              <summary>
                <strong>{s.name}</strong>
                <span className="kpi-summary-value">
                  {typeof s.value === "number" ? number(s.value, 3) : s.value}{" "}
                  <Badge>Source-stated</Badge>
                </span>
              </summary>
              <div className="definition-content">
                <div>
                  <p className="caption">Basis: {String(s.basis)}</p>
                  <Field
                    label={`Proposed owner · ${s.name}`}
                    value={
                      owners[s.name] ??
                      workspace.owners[s.name] ??
                      "Reliability data steward"
                    }
                    onChange={(v) => setOwners((o) => ({ ...o, [s.name]: v }))}
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
                              description: `Proposed KPI owner updated: ${s.name}`,
                            },
                          ],
                        }),
                        "Proposed KPI owner saved locally.",
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
                        : s.name.includes("hours") || s.name === "Period Hours"
                          ? "h"
                          : s.name.includes("ton")
                            ? "ton"
                            : s.name.includes("USD")
                              ? "k USD"
                              : "source count / weeks",
                      owner:
                        workspace.owners[s.name] ?? "Reliability data steward",
                      excerpt: `${s.name}: ${s.value}\nBasis: ${s.basis}\nFormula: ${s.formula}`,
                      warnings: [
                        "Source denominator 4368 h is a workbook convention; no validated planned-operation calendar or PM work logs supplied.",
                        "No remaining-life or independently validated reliability prediction.",
                      ],
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
      <Panel
        title="Proposed consolidation - existing dashboard inventory not supplied"
        sub="Answers Case 2 question 1: map source, entity, grain, definition and stewardship before integration"
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Source view family</th>
                <th>Governed capability</th>
                <th>Entity / grain</th>
                <th>Proposed steward</th>
                <th>Integration boundary</th>
              </tr>
            </thead>
            <tbody>
              {[
                [
                  "Production spreadsheets",
                  "Executive scenario trends",
                  "Asset / hourly",
                  "Operations data steward",
                  "Explicit window; no cross-month aggregate",
                ],
                [
                  "Equipment workbooks",
                  "Condition episodes and KPI dictionary",
                  "Asset / weekly",
                  "Reliability data steward",
                  "Threshold versions and units require review",
                ],
                [
                  "Incident register",
                  "Historical exposure / retrieval",
                  "Stable incident source row",
                  "Reliability register steward",
                  "Immutable status; qualified report links",
                ],
                [
                  "RCA & action plans",
                  "Evidence and reviewed follow-up",
                  "Report / slide / action",
                  "Engineering reviewer",
                  "Historical snapshots separate from prototype actions",
                ],
                [
                  "Utilities (not supplied)",
                  "Energy, intensity, emissions and forecast",
                  "Meter / matched interval",
                  "Utilities data steward",
                  "Proposed contract; synthetic illustration only",
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
      <QualityPanel quality={[...bundle.quality, ...extra]} />
      <Panel
        title="Governance & pilot plan"
        sub="Proposed operational readiness; no measured improvement claims"
      >
        <details>
          <summary>Review ownership and definitions before rollout</summary>
          <p>
            Nominate source stewards, an engineering reviewer and action owners.
            Approve units, policy versions, clock alignment and qualified
            mappings. Review identity, access, retention and external AI
            data-sharing rights before operational integration. This local role
            simulation does not establish enterprise authorization.
          </p>
        </details>
        <details>
          <summary>Measure usefulness with a domain pilot</summary>
          <p>
            Measure time to locate correct evidence, citation validity,
            engineer-reviewed hypothesis usefulness, priority agreement and the
            fraction of completed actions with verified closure. Define baseline
            and sampling before targets; no financial improvement or prediction
            performance has been measured.
          </p>
        </details>
        <details>
          <summary>Integration sequence</summary>
          <p>
            Local prototype → domain review and pilot →
            historian/maintenance/utility contracts → tested identity and audit
            → independently validated forecasting or failure models. Staff
            scheduling and procurement need approved resources and procedures.
          </p>
        </details>
      </Panel>
    </>
  );
}
