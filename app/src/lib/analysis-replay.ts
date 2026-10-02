import type {
  Analysis,
  Bundle,
  Hypothesis,
  ActionDraft,
  Signal,
} from "./types";
import { summarizeSignals, selectedFacts, reference } from "./signals";
const descriptions: Record<string, { title: string; explanation: string }> = {
  lubrication: {
    title: "Lubrication condition may be contributing to bearing distress",
    explanation:
      "Oil condition or supply deviations could affect the bearing film. This is an engineering inference; the contamination source and bearing condition require inspection.",
  },
  bearing_condition: {
    title: "Bearing condition may contribute to the observed deviation",
    explanation:
      "Bearing condition could connect thermal or vibration changes. Calibration, operating load and physical inspection are needed to distinguish this candidate from other mechanisms.",
  },
  alignment: {
    title: "Alignment or coupling condition may contribute to vibration",
    explanation:
      "Mechanical alignment could explain comparable vibration or coupling deviations. This engineering inference requires an approved inspection review and corroborating condition checks.",
  },
  seal_flush: {
    title: "Seal flush deficiency may contribute to seal distress",
    explanation:
      "Restricted flush supply could affect the seal environment. The eligible flow evidence supports review; the restriction mechanism and actual seal condition remain unknown.",
  },
  hydraulic_conditions: {
    title: "Hydraulic operating conditions may contribute to the deviation",
    explanation:
      "Flow or pressure deviations could reflect operating demand, restriction or instrumentation. This is a candidate mechanism, requiring operating logs and measurement review.",
  },
  heat_transfer: {
    title: "Heat-transfer condition may require a fouling review",
    explanation:
      "Comparable duty, pressure or temperature deviations could be consistent with fouling. Feed conditions and instrument checks are required before diagnosing a physical cause.",
  },
  feed_conditions: {
    title: "Feed conditions may contribute to heat-transfer deviations",
    explanation:
      "Feed composition or demand could affect thermal performance. This engineering inference requires validated feed samples and matching operating context.",
  },
  thermal_loading: {
    title: "Thermal or electrical loading may contribute to the deviation",
    explanation:
      "Load, cooling and lubrication conditions could contribute to thermal changes. Matching electrical and operating evidence is needed to distinguish these possibilities.",
  },
  operating_state: {
    title: "Operating-state changes require context review",
    explanation:
      "Observed run-state or plant-rate changes may reflect scheduled operation or an issue. Operating schedules are missing; equipment failure and full plant shutdown cannot be inferred.",
  },
  instrumentation: {
    title: "Measurement conditions may contribute to the apparent deviation",
    explanation:
      "Instrument calibration, source timing or policy revisions could affect interpretation. Missing measurements remain unknown and do not establish normal operation.",
  },
};
export function mechanismDescription(mechanism: string) {
  return descriptions[mechanism];
}
const checks = [
  "Verify measurement units, calibration and source-local sample timing.",
  "Request engineering inspection review and matching operating logs.",
  "Confirm source threshold version and effective dates before deciding equipment work.",
];
export function historicalFinding(bundle: Bundle): Hypothesis | null {
  const root = bundle.evidence.find(
    (e) => e.category === "report" && e.excerpt.startsWith("ROOT CAUSE:"),
  );
  if (!root) return null;
  return {
    id: "finding",
    title: root.excerpt.replace(/^ROOT CAUSE:\s*/, ""),
    evidenceIds: [root.id],
    counterEvidenceIds: [],
    missingChecks: checks,
    strength: "supported",
    kind: "Historical RCA finding",
    mechanism: "historical_source",
    explanation:
      "This finding is stated in the completed source report after inspection. It is retrospective and does not establish an earlier prediction.",
    strengthReason:
      "Supported as a historical report statement; not independently validated causal certainty.",
    signalIds: [],
    knowledgeBasis: "Historical source finding",
  };
}
function draft(
  h: Hypothesis,
  type: ActionDraft["type"] = "engineering_review",
): ActionDraft {
  return {
    hypothesisId: h.id,
    type,
    title:
      type === "historical_review"
        ? "Review the historical corrective action proposal"
        : type === "evidence_review"
          ? "Verify condition evidence and measurement policy"
          : "Request engineering review of " + h.mechanism.replaceAll("_", " "),
    guidance:
      type === "historical_review"
        ? "Review the cited historical proposal with Maintenance and Operations. Confirm approvals, dependencies and verification criteria before any equipment work; execution procedures and available resources are unknown."
        : type === "evidence_review"
          ? "Ask the reliability reviewer to reconcile units, timing and threshold versions against the linked evidence. Record an approved interpretation and review evidence before proposing equipment work."
          : "Request Maintenance and Operations review of the linked evidence and candidate mechanism. Define approved inspection prerequisites and verification evidence. Execution procedures and resources remain unknown.",
    evidenceIds: h.evidenceIds,
    proposedOwnerRole:
      type === "evidence_review"
        ? "Reliability engineer"
        : "Maintenance reviewer",
    approvalRequired: true,
  };
}
export function replay(
  bundle: Bundle,
  message = "Evidence replay - no live AI call",
  liveState: Analysis["liveState"] = "not_requested",
): Analysis {
  const signals = summarizeSignals(bundle),
    finding = historicalFinding(bundle);
  const hypotheses: Hypothesis[] = finding ? [finding] : [];
  if (signals.state === "anomaly") {
    // Candidate mechanisms are selected by observed parameters, never by asset tag.
    const ranked = [...signals.signals].sort(
      (a, b) =>
        Number(/water|flush|duty/i.test(b.parameter)) -
        Number(/water|flush|duty/i.test(a.parameter)),
    );
    const mechanisms = [...new Set(ranked.flatMap((s) => s.mechanisms))].slice(
      0,
      2,
    );
    const normal = bundle.conditions.find((c) => c.status === "NORMAL");
    for (const mechanism of mechanisms) {
      const matches = ranked.filter((s) => s.mechanisms.includes(mechanism));
      const description = mechanismDescription(mechanism);
      hypotheses.push({
        id: "hypothesis-" + mechanism,
        mechanism,
        ...description,
        evidenceIds: [...new Set(matches.flatMap((s) => s.evidenceIds))].slice(
          -8,
        ),
        counterEvidenceIds: normal
          ? [`${bundle.asset.tag}:weekly:${normal.row}`]
          : [],
        missingChecks: checks,
        strength: matches.some((s) => s.type === "weekly_breach")
          ? "plausible"
          : "insufficient",
        strengthReason: matches.some((s) => s.type === "weekly_breach")
          ? "Eligible source-formula deviations support investigation of this candidate; a breach does not prove its cause."
          : "Only proposed trend or operating-state review signals support this candidate; industrial relevance is unvalidated.",
        kind: "Hypothesis",
        signalIds: matches.map((s) => s.id),
        knowledgeBasis: "Engineering inference",
      });
    }
  }
  const actions: ActionDraft[] =
    signals.state === "anomaly"
      ? hypotheses.flatMap((h, i) =>
          i === 0
            ? [
                draft(h, "evidence_review"),
                draft(
                  h,
                  h.kind === "Historical RCA finding"
                    ? "historical_review"
                    : "engineering_review",
                ),
              ]
            : [draft(h)],
        )
      : [];
  const summary =
    signals.state === "no_observations"
      ? "No eligible observations. Choose a later source-local cutoff; no mechanism hypothesis or maintenance draft is justified."
      : signals.state === "insufficient_anomaly"
        ? "Insufficient anomaly evidence. Eligible observations show no deviation under the documented rules; no mechanism diagnosis or maintenance draft is justified."
        : finding
          ? "Retrospective review: the report finding is known after inspection. Eligible observation signals guide review; source disagreements remain unresolved."
          : "Eligible observations contain review signals. Candidate mechanisms require engineering inspection; no cause is confirmed.";
  return {
    caseId: bundle.asset.tag,
    mode: bundle.mode,
    asOf: bundle.asOf,
    summary,
    hypotheses,
    actions,
    signals,
    observations: selectedFacts(signals).slice(0, 12).map(reference),
    limitations: [
      ...bundle.exclusions,
      ...bundle.quality.map((q) => q.title),
      ...signals.policy,
      "Qualitative strength is not a probability or causal proof. No validated industrial prediction or measured benefit.",
    ],
    execution: "replay",
    liveState,
    message,
    stages: [
      {
        title: "Collect evidence",
        result: `${signals.weekly} eligible weekly and ${signals.hourly} hourly observations`,
      },
      {
        title: "Summarize signals",
        result: `${signals.signals.length} deterministic review signals; ${signals.state}`,
      },
      {
        title: "Retrieve context",
        result:
          bundle.mode === "prospective"
            ? "Historical retrieval unavailable: publication/revision provenance missing"
            : `${bundle.similarIncidents.length} lexical historical matches; similarity is not causal evidence`,
      },
      {
        title: "Compose & validate",
        result:
          "Deterministic replay; source findings and engineering inferences remain distinct",
      },
    ],
  };
}
export function actionForHypothesis(h: Hypothesis, type: ActionDraft["type"]) {
  return draft(h, type);
}
export const signalMechanisms = (signal: Signal) => signal.mechanisms;
