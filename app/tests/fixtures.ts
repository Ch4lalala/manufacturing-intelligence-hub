import type { Bundle, Workspace, WorkspaceAction } from "../src/lib/types";
import { emptyWorkspace } from "../src/lib/actions";
// Synthetic local-workspace records for regression only, never baseline/AI data.
export function actionScopeWorkspace(version: string): Workspace {
  const action = (
    id: string,
    overrides: Partial<WorkspaceAction> = {},
  ): WorkspaceAction => ({
    id,
    caseId: "KO-3201",
    analysisMode: "prospective",
    analysisAsOf: "2026-04-22 23:59:59",
    hypothesisId: "fixture-reviewed",
    hypothesisTitle: "Synthetic scope review",
    type: "engineering_review",
    title: `Synthetic scope fixture ${id}`,
    guidance: "Review fixture only",
    evidenceIds: [],
    sources: [],
    proposedOwnerRole: "Reliability engineer",
    approvalRequired: true,
    priorityReason: "Synthetic regression fixture",
    dependencies: "Demo engineering review",
    owner: "Reliability engineer",
    due: "2026-10-05",
    state: "Closed",
    reviewer: "Engineering reviewer",
    completionEvidence: `fixture-completion-${id}`,
    history: [],
    ...overrides,
  });
  return {
    ...emptyWorkspace(version),
    actions: [
      action("historical-closed", {
        analysisMode: "historical",
        analysisAsOf: "2026-04-30 23:00:00",
      }),
      action("same-draft", {
        state: "Draft",
        reviewer: "",
        completionEvidence: "",
      }),
      action("same-pending", { state: "Pending Verification", reviewer: "" }),
      action("same-closed"),
      action("same-unreviewed", { reviewer: "" }),
      action("same-no-evidence", { completionEvidence: "" }),
      action("other-asset", {
        caseId: "HE-3301",
        state: "Pending Verification",
        reviewer: "",
      }),
      action("other-cutoff", { analysisAsOf: "2026-04-22 00:00:00" }),
      action("legacy-closed", {
        analysisMode: undefined,
        analysisAsOf: undefined,
      }),
    ],
    episodes: {
      "historical-ack": "Acknowledged",
      "historical-group": "Grouped",
      "historical-open": "Open",
    },
  };
}
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
