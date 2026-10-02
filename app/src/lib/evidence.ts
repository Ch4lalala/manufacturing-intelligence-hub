import type {
  Asset,
  Bundle,
  Evidence,
  Mode,
  Incident,
  Deck,
  Locator,
} from "./types";
import {
  assetMeta,
  qualifiedIncident,
  eligibleTime,
  deriveEpisodes,
} from "./domain";
import { qualityFor } from "./quality";
export function reportEvidence(a: Asset): Evidence[] {
  return a.report.slides.flatMap((s) =>
    s.blocks
      .filter(
        (b) =>
          b.text &&
          !/^\d\d\/11$/.test(b.text) &&
          !b.text.startsWith("RCA & CAPA/PAA"),
      )
      .map((b) => ({
        id: `${a.tag}:report:${s.slide}:${b.shape_id}`,
        locator: { file: a.report.file, slide: s.slide, shape: b.shape_id },
        excerpt: b.text ?? JSON.stringify(b.rows),
        kind: "source" as const,
        time: null,
        availability: null,
        category: "report" as const,
      })),
  );
}
export function makeBundle(
  a: Asset,
  rows: Incident[],
  version: string,
  mode: Mode,
  asOf: string,
): Bundle {
  const historical = mode === "historical";
  // Date-only samples become eligible at end-of-day, never assumed available
  // at midnight. Current event day and subsequent observations stay excluded.
  const conditions = a.conditions
    .filter(
      (c) =>
        historical ||
        (c.date < a.eventDate && eligibleTime(`${c.date} 23:59:59`, asOf)),
    )
    .map((c) => (historical ? c : { ...c, remark: null }));
  const production = a.production.filter(
    (p) =>
      historical ||
      (String(p.values.Timestamp).slice(0, 10) < a.eventDate &&
        eligibleTime(String(p.values.Timestamp), asOf)),
  );
  const incident = historical ? qualifiedIncident(a, rows) : null;
  const evidence: Evidence[] = [
    ...conditions.map((c) => ({
      id: `${a.tag}:weekly:${c.row}`,
      locator: c.source,
      excerpt: `${c.date}\n${a.condition_headers.map((h, i) => `${h.replace(/\n/g, " ")}: ${c.measurements[i]}`).join("\n")}\nWorkbook classification: ${c.status}\nFormula: ${c.status_formula}${c.remark ? `\nRemark: ${c.remark}` : ""}`,
      kind: "source" as const,
      time: c.date,
      availability: null,
      category: "weekly" as const,
    })),
    ...production.map((p) => ({
      id: `${a.tag}:hourly:${p.source.cell}`,
      locator: p.source,
      excerpt: Object.entries(p.values)
        .map(
          ([k, v]) =>
            `${k}: ${v} ${a.production_metadata.find((m) => m.Name === k)?.engunits ?? ""}`,
        )
        .join("\n"),
      kind: "source" as const,
      time: String(p.values.Timestamp),
      availability: null,
      category: "hourly" as const,
    })),
    {
      id: `${a.tag}:metadata`,
      locator: {
        file: a.production[0].source.file,
        sheet: "PI Tag",
        cell: "A2:H8",
      },
      excerpt: a.production_metadata
        .map((m) => `${m.Name}: ${m.Description} (${m.engunits})`)
        .join("\n"),
      kind: "source",
      time: null,
      availability: null,
      category: "metadata",
    },
    ...(historical ? reportEvidence(a) : []),
    ...(incident
      ? [
          {
            id: incident.id,
            locator: incident.source,
            excerpt: JSON.stringify(incident.raw, null, 2),
            kind: "source" as const,
            time: incident.date,
            availability: null,
            category: "incident" as const,
          },
        ]
      : []),
  ];
  const meta = assetMeta(a);
  // Prospective output exposes only source-local observation scope; strips event/AR/report pointers.
  const scopedMeta = historical
    ? meta
    : {
        ...meta,
        ar: "Unavailable in pre-event context",
        eventDate: "",
        linked_incident_id: "",
        reportFile: "",
        hourlyWindow: production.length
          ? `${production[0].values.Timestamp} to ${production.at(-1)!.values.Timestamp}`
          : "No eligible hourly observations",
        weeklyWindow: conditions.length
          ? `${conditions[0].date} to ${conditions.at(-1)!.date}`
          : "No eligible weekly observations",
      };
  return {
    version,
    asset: scopedMeta,
    mode,
    asOf,
    conditions,
    production,
    summary: historical ? a.summary : [],
    incident,
    report: historical ? a.report : null,
    evidence,
    quality: historical
      ? qualityFor(a)
      : a.tag === "KO-3201"
        ? [qualityFor(a)[0]]
        : [],
    episodes: deriveEpisodes(scopedMeta, conditions, incident, mode),
    exclusions: historical
      ? [
          "Report availability dates are unknown. Findings are retrospective; no prior-prediction claim.",
        ]
      : [
          "Current event day and subsequent observations excluded. Date-only weekly samples are eligible at end-of-day; no midnight availability assumption.",
          "Entire current-event RCA excluded; publication availability unknown.",
          "All other RCA reports excluded; publication availability unknown.",
          "Future observations, all observation remarks, current incident, historical status/risk/loss summaries and CAPA snapshots excluded.",
          "Register retrieval excluded: report/register availability and status revision dates unknown. No historical outcome labels are supplied to this pre-event analysis.",
          "Thresholds use the source-workbook policy as an illustrative replay assumption; historical effective dates and source timezone unknown.",
        ],
  };
}
export function sourceText(a: Asset, locator: Locator): string {
  if (locator.slide)
    return (
      a.report.slides
        .find((s) => s.slide === locator.slide)
        ?.blocks.filter((b) => !locator.shape || b.shape_id === locator.shape)
        .map((b) => b.text ?? JSON.stringify(b.rows))
        .join("\n") ?? "Excerpt unavailable"
    );
  if (locator.sheet === "Performance Summary")
    return a.summary
      .filter(
        (s) => s.source.cell === locator.cell || locator.cell === undefined,
      )
      .map(
        (s) =>
          `${s.name}: ${s.value}\nFormula/basis: ${s.formula} / ${s.basis}`,
      )
      .join("\n");
  if (locator.sheet === "Condition History")
    return (
      a.conditions
        .filter((c) => c.source.cell === locator.cell)
        .map((c) => JSON.stringify(c, null, 2))
        .join("\n") || a.condition_headers.join(" | ")
    );
  return a.production_metadata
    .map((m) => `${m.Name}: ${m.engunits}`)
    .join("\n");
}
export function historicalActions(deck: Deck) {
  const s = deck.slides.find((s) => s.slide === 9);
  if (!s) return [];
  const text = (id: number) =>
    s.blocks.find((b) => b.shape_id === id)?.text ?? "Unknown";
  return [19, 29, 50, 60].map((id) => ({
    reference: text(id),
    title: text(id + 2),
    date: text(id + 4),
    pic: text(id + 6),
    status: text(id + 8),
    source: { file: deck.file, slide: 9, shape: id + 2 },
  }));
}
