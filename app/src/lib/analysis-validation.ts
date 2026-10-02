import type {
  Analysis,
  Bundle,
  FactReference,
  Hypothesis,
  ActionDraft,
} from "./types";
import { replay } from "./analysis-replay";
import { selectedFacts } from "./signals";
const record = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === "object" && !Array.isArray(x);
const keys = (o: Record<string, unknown>, allowed: string[]) =>
  Object.keys(o).every((k) => allowed.includes(k));
const list = (x: unknown, max = 12): x is string[] =>
  Array.isArray(x) &&
  x.length <= max &&
  x.every((s) => typeof s === "string" && s.length <= 1400);
// Narrative is hypothesis/inference only. Exact observations live in typed bindings.
export function inferenceText(x: unknown, max = 1400): x is string {
  return (
    typeof x === "string" &&
    x.trim().length > 0 &&
    x.length <= max &&
    !/\d|%|https?:\/\//.test(x) &&
    !/\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|percent|ppm|micron|barg|confirmed|definitive diagnosis|certain|probability|confidence|predictive accuracy|will fail|is caused by|caused by|has failed|fault proven|technician|in stock|spare stock|trip (?:the )?(?:compressor|pump|asset)|shut ?down|bypass|retube|plug (?:the )?tube|purchase|procure|order parts|replace (?:the )?(?:bearing|seal)|start (?:the )?(?:compressor|pump)|stop (?:the )?(?:compressor|pump))\b/i.test(
      x,
    )
  );
}
export function validateAnalysis(value: unknown, bundle: Bundle): Analysis {
  const base = replay(bundle),
    registry = selectedFacts(base.signals),
    factMap = new Map(registry.map((f) => [f.id, f]));
  const eligible = new Set(bundle.evidence.map((e) => e.id));
  if (
    !record(value) ||
    !keys(value, [
      "caseId",
      "mode",
      "asOf",
      "summary",
      "observations",
      "hypotheses",
      "actions",
      "limitations",
    ]) ||
    value.caseId !== bundle.asset.tag ||
    value.mode !== bundle.mode ||
    value.asOf !== bundle.asOf ||
    !inferenceText(value.summary) ||
    !Array.isArray(value.observations) ||
    value.observations.length > 16 ||
    !Array.isArray(value.hypotheses) ||
    value.hypotheses.length > 3 ||
    !Array.isArray(value.actions) ||
    value.actions.length > 4 ||
    !list(value.limitations)
  )
    throw new Error("Invalid analysis schema or unsupported narrative");
  const observations: FactReference[] = value.observations.map((binding) => {
    if (
      !record(binding) ||
      !keys(binding, ["factId", "value", "unit", "time", "asset"]) ||
      typeof binding.factId !== "string"
    )
      throw new Error("Invalid factual binding");
    const fact = factMap.get(binding.factId);
    if (
      !fact ||
      binding.value !== fact.value ||
      binding.unit !== fact.unit ||
      binding.time !== fact.time ||
      binding.asset !== fact.asset
    )
      throw new Error("Unsupported fact, number, unit, asset or timestamp");
    return {
      factId: fact.id,
      value: fact.value,
      unit: fact.unit,
      time: fact.time,
      asset: fact.asset,
    };
  });
  if (new Set(observations.map((f) => f.factId)).size !== observations.length)
    throw new Error("Duplicate factual binding");
  const cite = (ids: unknown, required = true): string[] => {
    if (
      !list(ids) ||
      (required && !ids.length) ||
      ids.some((id) => !eligible.has(id))
    )
      throw new Error("Unknown or ineligible citation");
    return ids;
  };
  const anomaly = base.signals.state === "anomaly";
  if (!anomaly && (value.hypotheses.length || value.actions.length))
    throw new Error("Insufficient anomaly evidence");
  const hypotheses: Hypothesis[] = value.hypotheses.map((h) => {
    if (
      !record(h) ||
      !keys(h, [
        "id",
        "title",
        "mechanism",
        "explanation",
        "evidenceIds",
        "counterEvidenceIds",
        "missingChecks",
        "strength",
        "strengthReason",
        "kind",
        "signalIds",
        "knowledgeBasis",
      ]) ||
      typeof h.id !== "string" ||
      !/^[a-zA-Z_-]{1,60}$/.test(h.id) ||
      h.id === "finding" ||
      !inferenceText(h.title, 220) ||
      !inferenceText(h.explanation) ||
      !inferenceText(h.strengthReason) ||
      !list(h.missingChecks) ||
      !h.missingChecks.length ||
      !h.missingChecks.every((c) => inferenceText(c)) ||
      !h.missingChecks.some((c) => /calibrat|unit|timing/i.test(c)) ||
      !h.missingChecks.some((c) => /review|inspect/i.test(c)) ||
      h.kind !== "Hypothesis" ||
      h.knowledgeBasis !== "Engineering inference" ||
      !["plausible", "insufficient"].includes(String(h.strength)) ||
      !list(h.signalIds) ||
      !h.signalIds.length
    )
      throw new Error("Unsupported hypothesis or inflated strength");
    if (
      !/may|could|possible|candidate|requires? (?:inspection|review)|unconfirmed|unknown/i.test(
        h.title + " " + h.explanation,
      )
    )
      throw new Error("Hypothesis must be expressed as an inference");
    const signals = h.signalIds.map((id) =>
      base.signals.signals.find((s) => s.id === id),
    );
    if (signals.some((s) => !s || !s.mechanisms.includes(String(h.mechanism))))
      throw new Error("Mechanism not linked to observed signals");
    const support = cite(h.evidenceIds),
      counter = cite(h.counterEvidenceIds, false);
    if (signals.some((s) => !s!.evidenceIds.some((id) => support.includes(id))))
      throw new Error("Hypothesis lacks abnormal supporting context");
    if (
      h.strength === "plausible" &&
      !signals.some((s) => s!.type === "weekly_breach")
    )
      throw new Error("Strength exceeds proposed review signals");
    const normal = bundle.conditions.find((c) => c.status === "NORMAL");
    if (
      normal &&
      !counter.some((id) =>
        bundle.conditions.some(
          (c) =>
            c.status === "NORMAL" &&
            id === `${bundle.asset.tag}:weekly:${c.row}`,
        ),
      )
    )
      throw new Error("Normal baseline counter-evidence omitted");
    return {
      ...h,
      evidenceIds: support,
      counterEvidenceIds: counter,
    } as Hypothesis;
  });
  if (new Set(hypotheses.map((h) => h.id)).size !== hypotheses.length)
    throw new Error("Duplicate hypothesis identity");
  const actions: ActionDraft[] = value.actions.map((a) => {
    if (
      !record(a) ||
      !keys(a, [
        "hypothesisId",
        "type",
        "title",
        "guidance",
        "evidenceIds",
        "proposedOwnerRole",
        "approvalRequired",
      ]) ||
      !inferenceText(a.title, 220) ||
      !inferenceText(a.guidance) ||
      !["evidence_review", "engineering_review"].includes(String(a.type)) ||
      ![
        "Reliability engineer",
        "Maintenance reviewer",
        "Engineering reviewer",
      ].includes(String(a.proposedOwnerRole)) ||
      a.approvalRequired !== true ||
      !/review|verify|reconcile|request/i.test(a.guidance)
    )
      throw new Error("Unsupported action guidance");
    const h = hypotheses.find((h) => h.id === a.hypothesisId),
      ids = cite(a.evidenceIds);
    if (!h || !ids.some((id) => h.evidenceIds.includes(id)))
      throw new Error(
        "Action must link to its reviewed hypothesis and supporting evidence",
      );
    return { ...a, evidenceIds: ids } as ActionDraft;
  });
  if (!value.limitations.every((l) => inferenceText(l)))
    throw new Error("Unsupported limitation narrative");
  const findings = base.hypotheses.filter(
    (h) => h.kind === "Historical RCA finding",
  );
  return {
    ...base,
    summary: value.summary,
    observations,
    hypotheses: [...findings, ...hypotheses],
    actions: [
      ...base.actions.filter((a) =>
        findings.some((h) => a.hypothesisId === h.id),
      ),
      ...actions,
    ],
    limitations: [...new Set([...base.limitations, ...value.limitations])],
    execution: "live",
    liveState: "validated",
    message:
      "Live AI composition - fact bindings and eligible citations validated; engineering inferences require review",
    stages: base.stages.map((s) =>
      s.title === "Compose & validate"
        ? {
            ...s,
            result:
              "Live structured composition; facts validated against source/derived IDs; causality not validated",
          }
        : s,
    ),
  };
}
