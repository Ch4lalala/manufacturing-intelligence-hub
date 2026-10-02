import type {
  Asset,
  AssetMeta,
  Incident,
  Condition,
  Episode,
  Retrieval,
  Mode,
} from "./types";
export const money = (n: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
export const number = (n: number, decimals = 1) =>
  n.toLocaleString("en-US", { maximumFractionDigits: decimals });
export function normalizeIncident(row: {
  id: string;
  values: Record<string, string | number | null>;
  source: Incident["source"];
}): Incident {
  const v = row.values;
  const rawAR = String(v["AR No."] ?? "");
  return {
    id: row.id,
    serial: Number(v["Serial No"]),
    rawAR,
    ar: rawAR.toLowerCase() === "n/a" ? null : rawAR,
    tag: String(v["Tag Number"]),
    plant: String(v.Plant),
    date: String(v["Date of Occur."]),
    title: String(v["Risk Case Title"]),
    status: String(v["Overall Status"]),
    risk: v["Risk Score"] == null ? null : Number(v["Risk Score"]),
    equipment: String(v["Eq. Type"]),
    component: String(v.Component),
    mechanism: String(v["F Mechanism"]),
    downtime: Number(v["Downtime (hrs)"]),
    actual: Number(v["Act. Loss (k US$)"]),
    potential: Number(v["Pot. Loss (k US$)"]),
    total: Number(v["Total Loss (k US$)"]),
    due: String(v["RCA Due Date"]),
    source: row.source,
    raw: v,
  };
}
export type Filter = {
  query?: string;
  plant?: string;
  asset?: string;
  status?: string;
  minRisk?: string;
  from?: string;
  to?: string;
};
export function filterIncidents(rows: Incident[], f: Filter): Incident[] {
  const q = (f.query ?? "").trim().toLowerCase();
  return rows.filter(
    (r) =>
      (!q ||
        [
          r.id,
          r.rawAR,
          r.tag,
          r.plant,
          r.title,
          r.equipment,
          r.component,
          r.mechanism,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q)) &&
      (!f.plant || r.plant === f.plant) &&
      (!f.asset || r.tag === f.asset) &&
      (!f.status || r.status === f.status) &&
      (!f.minRisk || (r.risk !== null && r.risk >= Number(f.minRisk))) &&
      (!f.from || r.date >= f.from) &&
      (!f.to || r.date <= f.to),
  );
}
export function aggregate(rows: Incident[]) {
  const sum = (key: "actual" | "potential" | "total") =>
    rows.reduce((s, r) => s + Math.round(r[key] * 100), 0) / 100;
  return {
    count: rows.length,
    downtime: rows.reduce((s, r) => s + Math.round(r.downtime * 10), 0) / 10,
    actual: sum("actual"),
    potential: sum("potential"),
    total: sum("total"),
    statuses: rows.reduce<Record<string, number>>((s, r) => {
      s[r.status] = (s[r.status] ?? 0) + 1;
      return s;
    }, {}),
  };
}
export function qualifiedIncident(
  asset: Pick<Asset, "tag" | "ar" | "plant" | "eventDate">,
  rows: Incident[],
) {
  return (
    rows.find(
      (r) =>
        r.tag === asset.tag &&
        r.ar === asset.ar &&
        r.plant === asset.plant &&
        r.date === asset.eventDate,
    ) ?? null
  );
}
export function assetMeta(a: Asset): AssetMeta {
  // Explicit whitelist avoids extra extraction fields (failure_date_source,
  // performance_source_values) accidentally escaping through object spread.
  return {
    tag: a.tag,
    name: a.name,
    plant: a.plant,
    plant_text: a.plant_text,
    class: a.class,
    criticality_source: a.criticality_source,
    ar: a.ar,
    eventDate: a.eventDate,
    linked_incident_id: a.linked_incident_id,
    info_source: a.info_source,
    thresholds: a.thresholds,
    condition_headers: a.condition_headers,
    production_metadata: a.production_metadata,
    hourlyWindow: `${a.production[0].values.Timestamp} to ${a.production.at(-1)!.values.Timestamp}`,
    weeklyWindow: `${a.conditions[0].date} to ${a.conditions.at(-1)!.date}`,
    reportFile: a.report.file,
  };
}
export function compareUnits(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
export function eligibleTime(time: string, asOf: string) {
  return (
    time.replace("T", " ").slice(0, 19) <= asOf.replace("T", " ").slice(0, 19)
  );
}
export function classify(formula: string, measurements: number[]) {
  // Whitelist numeric comparisons only. Never evaluate Excel/JS code.
  const groups = [...formula.matchAll(/OR\(([^)]+)\)/g)];
  const breach = (group: string) =>
    group.split(",").some((term) => {
      const m = term.match(/^([C-F])\d+(>=|<=)(\d+(?:\.\d+)?)$/);
      if (!m) throw new Error("Unsupported threshold formula");
      const v = measurements[m[1].charCodeAt(0) - 67],
        lim = Number(m[3]);
      return m[2] === ">=" ? v >= lim : v <= lim;
    });
  if (groups.length !== 2) throw new Error("Unsupported threshold formula");
  return breach(groups[0][1])
    ? "TRIP"
    : breach(groups[1][1])
      ? "ALARM"
      : "NORMAL";
}
export function deriveEpisodes(
  a: AssetMeta,
  c: Condition[],
  incident: Incident | null,
  mode: Mode,
): Episode[] {
  const samples = c.filter(
    (s) => classify(s.status_formula, s.measurements) !== "NORMAL",
  );
  if (!samples.length) return [];
  const severity = samples.some(
    (s) => classify(s.status_formula, s.measurements) === "TRIP",
  )
    ? "TRIP"
    : "ALARM";
  const risk = mode === "historical" ? (incident?.risk ?? null) : null;
  return [
    {
      id: `episode:${a.tag}:condition`,
      tag: a.tag,
      plant: a.plant,
      severity,
      first: samples[0].date,
      last: samples.at(-1)!.date,
      samples: samples.map((s) => `${a.tag}:weekly:${s.row}`),
      criticality: a.criticality_source,
      risk,
      conditions: [...new Set(samples.map((s) => s.status_formula))],
      reason: `${severity} workbook-classified episode; source criticality ${a.criticality_source}; ${risk === null ? "risk unavailable in this scope" : `source risk ${risk}`}. Grouped condition family; ${samples.length} supporting weekly readings. Proposed ordering: TRIP, criticality, eligible source risk, latest observed time. Workbook threshold effective dates unknown; no alarm-delivery claim.`,
    },
  ];
}
export function rankEpisodes(episodes: Episode[]) {
  return [...episodes].sort(
    (a, b) =>
      (b.severity === "TRIP" ? 1 : 0) - (a.severity === "TRIP" ? 1 : 0) ||
      (b.criticality === "High" ? 1 : 0) - (a.criticality === "High" ? 1 : 0) ||
      (b.risk ?? -1) - (a.risk ?? -1) ||
      b.last.localeCompare(a.last),
  );
}
export function retrieve(
  rows: Incident[],
  query: string,
  currentId?: string,
  asOf?: string,
  reportIds: string[] = [],
): Retrieval[] {
  const terms = [
    ...new Set(query.toLowerCase().match(/[a-z0-9]+/g) ?? []),
  ].filter(
    (t) =>
      t.length > 2 &&
      !["the", "and", "with", "from", "high", "source"].includes(t),
  );
  return rows
    .filter((r) => r.id !== currentId && (!asOf || r.date < asOf.slice(0, 10)))
    .map((r) => {
      const text = [r.title, r.component, r.mechanism, r.equipment, r.plant]
        .join(" ")
        .toLowerCase();
      const matched = terms.filter((t) => text.includes(t));
      return {
        incident: r,
        score: matched.reduce(
          (s, t) => s + (r.component.toLowerCase().includes(t) ? 3 : 1),
          0,
        ),
        matched,
        hasReport: reportIds.includes(r.id),
      };
    })
    .filter((r) => r.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.incident.date.localeCompare(a.incident.date) ||
        a.incident.id.localeCompare(b.incident.id),
    );
}
