import type { Bundle } from "../src/lib/types";
import { summarizeSignals, selectedFacts, reference } from "../src/lib/signals";
export function providerPayload(bundle: Bundle) {
  const summary = summarizeSignals(bundle),
    signal =
      summary.signals.find((s) => s.type === "weekly_breach") ??
      summary.signals[0];
  const facts = selectedFacts(summary),
    normal = bundle.conditions.find((c) => c.status === "NORMAL");
  const observation =
    facts.find((f) => signal?.factIds.includes(f.id)) ?? facts[0];
  return {
    caseId: bundle.asset.tag,
    mode: bundle.mode,
    asOf: bundle.asOf,
    summary:
      "The eligible observations may support a condition review. Physical inspection is needed before attributing a cause.",
    observations: observation ? [reference(observation)] : [],
    hypotheses: signal
      ? [
          {
            id: "composed_candidate",
            title:
              "A physical condition may contribute to the observed pattern",
            mechanism: signal.mechanisms[0],
            explanation:
              "This candidate could connect the observed deviations to equipment condition. It is general engineering inference, requiring corroboration.",
            evidenceIds: signal.evidenceIds,
            counterEvidenceIds: normal
              ? [`${bundle.asset.tag}:weekly:${normal.row}`]
              : [],
            missingChecks: [
              "Verify units, calibration and source timing.",
              "Request an approved engineering inspection review.",
            ],
            strength:
              signal.type === "weekly_breach" ? "plausible" : "insufficient",
            strengthReason:
              "The signal supports investigation but does not prove a physical mechanism.",
            kind: "Hypothesis",
            signalIds: [signal.id],
            knowledgeBasis: "Engineering inference",
          },
        ]
      : [],
    actions: signal
      ? [
          {
            hypothesisId: "composed_candidate",
            type: "engineering_review",
            title: "Request a review of the candidate mechanism",
            guidance:
              "Request engineering review of the cited evidence and define approved inspection prerequisites and verification evidence.",
            evidenceIds: signal.evidenceIds,
            proposedOwnerRole: "Reliability engineer",
            approvalRequired: true,
          },
        ]
      : [],
    limitations: ["Engineering review remains necessary."],
  };
}
export function fakeCompletion(bundle: Bundle) {
  return Response.json({
    choices: [
      { message: { content: JSON.stringify(providerPayload(bundle)) } },
    ],
  });
}
