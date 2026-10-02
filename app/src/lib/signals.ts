import type {
  Bundle,
  Fact,
  FactReference,
  Signal,
  SignalSummary,
} from "./types";
import { classify } from "./domain";
export const unitOf = (header: string) =>
  (header.split("\n")[1] ?? "").replace(/^\(|\)$/g, "");
const unique = (ids: string[]) => [...new Set(ids)];
function mechanisms(parameter: string): string[] {
  const p = parameter.toLowerCase();
  if (/water|lube/.test(p)) return ["lubrication", "bearing_condition"];
  if (/flush/.test(p)) return ["seal_flush", "hydraulic_conditions"];
  if (/duty|heavy.ends|tube.side|outlet/.test(p))
    return ["heat_transfer", "feed_conditions"];
  if (/vibration|harmonic|offset/.test(p))
    return ["alignment", "bearing_condition"];
  if (/temp|ampere/.test(p)) return ["thermal_loading", "bearing_condition"];
  if (/pressure/.test(p)) return ["hydraulic_conditions", "instrumentation"];
  return ["operating_state", "instrumentation"];
}
export function summarizeSignals(bundle: Bundle): SignalSummary {
  const tag = bundle.asset.tag,
    facts: Fact[] = [],
    signals: Signal[] = [];
  const add = (
    id: string,
    field: string,
    value: string | number,
    unit: string,
    time: string | null,
    evidenceIds: string[],
    inputs: string[] = [],
    formula: string | null = null,
  ) => {
    facts.push({
      id,
      asset: tag,
      field,
      value,
      unit,
      time,
      kind: formula ? "computed" : "source",
      evidenceIds: unique(evidenceIds),
      inputs,
      formula,
    });
    return id;
  };
  const weeklyId = (row: number) => `${tag}:weekly:${row}`;
  const numericId = (row: number, i: number) =>
    `${weeklyId(row)}#measurement-${i}`;
  for (const c of bundle.conditions) {
    const id = weeklyId(c.row);
    c.measurements.forEach((value, i) =>
      add(
        numericId(c.row, i),
        bundle.asset.condition_headers[i].split("\n")[0],
        value,
        unitOf(bundle.asset.condition_headers[i]),
        c.date,
        [id],
      ),
    );
    add(
      id + "#classification",
      "Workbook classification",
      classify(c.status_formula, c.measurements),
      "classification",
      c.date,
      [id],
    );
  }
  for (const p of bundle.production) {
    const id = `${tag}:hourly:${p.source.cell}`;
    for (const [field, value] of Object.entries(p.values)) {
      if (field === "Timestamp") continue;
      add(
        id + "#" + field,
        field,
        value,
        bundle.asset.production_metadata.find((m) => m.Name === field)
          ?.engunits ?? "",
        String(p.values.Timestamp),
        [id],
      );
    }
  }
  for (let i = 0; i < bundle.asset.condition_headers.length; i++) {
    const parameter = bundle.asset.condition_headers[i].split("\n")[0],
      unit = unitOf(bundle.asset.condition_headers[i]);
    const [alarm, trip] = bundle.asset.thresholds[i].limits_text
      .split(" / ")
      .map(Number);
    if (!Number.isFinite(alarm) || !Number.isFinite(trip)) continue;
    const alarmId = add(
      `${tag}:threshold:${i}#alarm`,
      parameter + " alarm",
      alarm,
      unit,
      null,
      [`${tag}:threshold:${i}`],
    );
    const tripId = add(
      `${tag}:threshold:${i}#trip`,
      parameter + " trip",
      trip,
      unit,
      null,
      [`${tag}:threshold:${i}`],
    );
    // Direction comes from the original formula, never a guessed high-is-bad rule.
    const direction = bundle.conditions[0]?.status_formula.match(
      new RegExp(`${String.fromCharCode(67 + i)}\\d+(>=|<=)`),
    )?.[1];
    if (!direction) continue;
    const crosses = (value: number, limit: number) =>
      direction === ">=" ? value >= limit : value <= limit;
    const breached = bundle.conditions.filter(
      (c) =>
        crosses(c.measurements[i], alarm) || crosses(c.measurements[i], trip),
    );
    if (breached.length) {
      const sampleIds = breached.map((c) => weeklyId(c.row)),
        selected = breached.slice(-3);
      const count = add(
        `${tag}:derived:breach-count:${i}`,
        "Eligible breached weekly readings: " + parameter,
        breached.length,
        "readings",
        selected.at(-1)!.date,
        sampleIds,
        breached.map((c) => numericId(c.row, i)).concat(alarmId, tripId),
        `Count eligible measurements satisfying the source formula comparison ${direction} alarm or trip; threshold effective date unknown.`,
      );
      signals.push({
        id: `signal:weekly:${i}`,
        type: "weekly_breach",
        parameter,
        severity: breached.some((c) => crosses(c.measurements[i], trip))
          ? "TRIP"
          : "ALARM",
        rule: `Source formula ${direction}; source-workbook threshold version, effective date unknown. Classification is not an alarm-delivery record.`,
        evidenceIds: selected.map((c) => weeklyId(c.row)),
        factIds: [
          ...selected.map((c) => numericId(c.row, i)),
          alarmId,
          tripId,
          count,
        ],
        mechanisms: mechanisms(parameter),
      });
    }
    const recent = bundle.conditions.slice(-4);
    if (recent.length === 4) {
      const values = recent.map((c) => c.measurements[i]),
        delta = values[3] - values[0],
        initialDistance = Math.abs(alarm - values[0]);
      const toward = direction === ">=" ? 1 : -1;
      const consistent = values
        .slice(1)
        .every((v, k) => (v - values[k]) * toward > 0);
      if (
        consistent &&
        delta * toward > 0 &&
        Math.abs(delta) >= initialDistance / 4
      ) {
        const ids = recent.map((c) => weeklyId(c.row));
        const derived = add(
          `${tag}:derived:weekly-delta:${i}`,
          "Within-source change: " + parameter,
          Number(delta.toFixed(6)),
          unit,
          recent[3].date,
          ids,
          recent.map((c) => numericId(c.row, i)),
          "Latest eligible value minus value three weekly observations earlier; same source parameter and unit.",
        );
        signals.push({
          id: `signal:trend:${i}`,
          type: "weekly_trend",
          parameter,
          severity: "Review",
          rule: "Proposed review trigger: four successive readings move toward the source alarm, with movement at least one quarter of the initial distance to that alarm. Not an industrially validated rule.",
          evidenceIds: ids,
          factIds: [
            derived,
            alarmId,
            ...recent.map((c) => numericId(c.row, i)),
          ],
          mechanisms: mechanisms(parameter),
        });
      }
    }
  }
  const off = bundle.production.filter((p) => p.values.RUN_STATUS === "OFF");
  if (off.length) {
    const ids = off.map((p) => `${tag}:hourly:${p.source.cell}`),
      unit =
        bundle.asset.production_metadata.find((m) => m.Name === "PLANT_RATE")
          ?.engunits ?? "";
    const count = add(
      `${tag}:derived:off-count`,
      "Hourly OFF samples",
      off.length,
      "samples",
      String(off.at(-1)!.values.Timestamp),
      ids,
      ids.map((id) => id + "#RUN_STATUS"),
      "Count eligible hourly rows with RUN_STATUS exactly OFF; sample count is not reported downtime.",
    );
    const min = add(
      `${tag}:derived:off-plant-min`,
      "Minimum plant rate during asset OFF",
      Math.min(...off.map((p) => Number(p.values.PLANT_RATE))),
      unit,
      null,
      ids,
      ids.map((id) => id + "#PLANT_RATE"),
      "Minimum eligible PLANT_RATE among asset OFF samples; same source unit, no cross-window aggregate.",
    );
    const max = add(
      `${tag}:derived:off-plant-max`,
      "Maximum plant rate during asset OFF",
      Math.max(...off.map((p) => Number(p.values.PLANT_RATE))),
      unit,
      null,
      ids,
      ids.map((id) => id + "#PLANT_RATE"),
      "Maximum eligible PLANT_RATE among asset OFF samples; same source unit.",
    );
    signals.push({
      id: "signal:hourly:off",
      type: "hourly_state",
      parameter: "Asset run status",
      severity: "Review",
      rule: "Source OFF state warrants context review; planned/unplanned availability unknown. OFF does not establish a fault or full plant shutdown.",
      evidenceIds: unique([ids[0], ids.at(-1)!]),
      factIds: [count, min, max],
      mechanisms: ["operating_state", "instrumentation"],
    });
  }
  const on = bundle.production.filter((p) => p.values.RUN_STATUS === "ON");
  if (on.length >= 12) {
    const start = on.slice(0, 6),
      end = on.slice(-6);
    const avg = (rows: typeof on) =>
      rows.reduce((n, p) => n + Number(p.values.PLANT_RATE), 0) / rows.length;
    const first = avg(start),
      last = avg(end);
    if (first > 0 && Math.abs(last - first) >= first / 4) {
      const ids = [...start, ...end].map(
        (p) => `${tag}:hourly:${p.source.cell}`,
      );
      const delta = add(
        `${tag}:derived:hourly-rate-change`,
        "Plant-rate endpoint mean change",
        Number((last - first).toFixed(6)),
        bundle.asset.production_metadata.find((m) => m.Name === "PLANT_RATE")
          ?.engunits ?? "",
        String(end.at(-1)!.values.Timestamp),
        ids,
        ids.map((id) => id + "#PLANT_RATE"),
        "Mean last six eligible ON plant-rate samples minus mean first six; independent source window.",
      );
      signals.push({
        id: "signal:hourly:change",
        type: "hourly_change",
        parameter: "Plant-rate change",
        severity: "Review",
        rule: "Proposed review trigger: endpoint mean movement at least one quarter of the starting mean. Operating demand changes and schedules are unknown; not a validated fault detector.",
        evidenceIds: ids,
        factIds: [delta],
        mechanisms: ["operating_state", "instrumentation"],
      });
    }
  }
  return {
    state:
      !bundle.conditions.length && !bundle.production.length
        ? "no_observations"
        : signals.length
          ? "anomaly"
          : "insufficient_anomaly",
    weekly: bundle.conditions.length,
    hourly: bundle.production.length,
    signals,
    facts,
    policy: [
      "Date-only weekly eligibility: source-local end-of-day; actual publication availability unknown.",
      "Weekly and hourly values remain independent; no cross-unit trend or shared threshold inferred.",
      "Missing measurements are unknown, not normal. Proposed trends/OFF flags request review and do not prove equipment damage.",
    ],
  };
}
export function reference(fact: Fact): FactReference {
  return {
    factId: fact.id,
    value: fact.value,
    unit: fact.unit,
    time: fact.time,
    asset: fact.asset,
  };
}
export function selectedFacts(summary: SignalSummary): Fact[] {
  const wanted = new Set(summary.signals.flatMap((s) => s.factIds));
  // Retain normal baseline for counter-evidence and interpretation when no signal exists.
  summary.facts
    .filter((f) => f.kind === "source" && !f.id.includes(":threshold:"))
    .slice(0, 8)
    .forEach((f) => wanted.add(f.id));
  return summary.facts.filter((f) => wanted.has(f.id));
}
export function linkedActionDrafts<T extends { hypothesisId: string }>(
  analysis: { actions: T[] },
  hypothesisId: string,
): T[] {
  return analysis.actions.filter((a) => a.hypothesisId === hypothesisId);
}
