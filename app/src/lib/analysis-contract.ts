import type { Analysis, Bundle, Fact } from "./types";
import { reference } from "./signals";
import {
  INFERENCE_WORD_PATTERN,
  INFERENCE_TOKEN_PATTERN,
} from "./analysis-validation";

// Source-bound shape example, not a diagnosis. The provider composes its own
// inference prose; every returned value still passes the domain validator.
export function outputContract(bundle: Bundle, base: Analysis, facts: Fact[]) {
  const signal =
    base.signals.signals.find((s) => s.type === "weekly_breach") ??
    base.signals.signals[0];
  const normal = bundle.conditions.find((c) => c.status === "NORMAL");
  const supporting = signal?.evidenceIds.slice(0, 3) ?? [];
  const observation =
    facts.find((f) => signal?.factIds.includes(f.id)) ?? facts[0];
  const schema = {
    caseId: bundle.asset.tag,
    mode: bundle.mode,
    asOf: bundle.asOf,
    summary:
      "The eligible observations may support a condition review. A specific cause remains unconfirmed.",
    observations: observation ? [reference(observation)] : [],
    hypotheses: signal
      ? [
          {
            id: "candidate",
            title:
              "A candidate mechanism may contribute to the observed pattern",
            mechanism: signal.mechanisms[0],
            explanation:
              "The observed pattern could be consistent with a candidate condition, requiring engineering inspection before attributing a cause.",
            evidenceIds: supporting,
            counterEvidenceIds: normal
              ? [`${bundle.asset.tag}:weekly:${normal.row}`]
              : [],
            missingChecks: [
              "Verify units, calibration and source timing.",
              "Request approved engineering inspection review.",
            ],
            strength:
              signal.type === "weekly_breach" ? "plausible" : "insufficient",
            strengthReason:
              "The signal supports investigation but does not establish a physical cause.",
            kind: "Hypothesis",
            signalIds: [signal.id],
            knowledgeBasis: "Engineering inference",
          },
        ]
      : [],
    actions: signal
      ? [
          {
            hypothesisId: "candidate",
            type: "engineering_review",
            title: "Request engineering evidence review",
            guidance:
              "Request engineering review of the cited evidence and define approved inspection prerequisites and verification evidence.",
            evidenceIds: supporting,
            proposedOwnerRole: "Reliability engineer",
            approvalRequired: true,
          },
        ]
      : [],
    limitations: [
      "Engineering inspection and source verification remain necessary before attributing a cause.",
    ],
  };
  return {
    schema,
    outputRules: {
      purpose:
        "schema is a valid source-bound shape example, not a required canonical narrative. Compose your own concise summary, hypothesis explanation and review guidance. Copy valid metadata literally or choose from the permitted values below. Do not return outputRules in the answer.",
      identity: {
        pattern: "^[a-zA-Z_-]{1,60}$",
        reservedId: "finding",
        example: "candidate",
        rule: "Use unique alphabetic identifiers without digits; actions reference the corresponding hypothesis identifier exactly.",
      },
      metadata: {
        kind: "Hypothesis",
        knowledgeBasis: "Engineering inference",
        strengths: ["plausible", "insufficient"],
        actionTypes: ["evidence_review", "engineering_review"],
        ownerRoles: [
          "Reliability engineer",
          "Maintenance reviewer",
          "Engineering reviewer",
        ],
        approvalRequired: true,
      },
      narrative: {
        maxChars: 1400,
        titleMaxChars: 220,
        forbiddenTokensPattern: INFERENCE_TOKEN_PATTERN.source,
        forbiddenWordsPattern: INFERENCE_WORD_PATTERN.source,
        rule: "Narrative has no numbers (digits or spelled-out numbers), measurement units, URLs, certainty or execution commands. Blocked words are disallowed even when negated; use unconfirmed instead of not confirmed. Put exact factual quantities only in observations. Express hypotheses with may, could, possible, candidate, unconfirmed or unknown.",
      },
      missingChecks: {
        rule: "Include both source unit/calibration/timing verification and engineering inspection/review. These are required, not optional.",
        requiredExamples: schema.hypotheses[0]?.missingChecks ?? [
          "Verify units, calibration and source timing.",
          "Request approved engineering inspection review.",
        ],
      },
      signalChoices: base.signals.signals.map((s) => ({
        signalId: s.id,
        allowedMechanisms: s.mechanisms,
        allowedStrengths:
          s.type === "weekly_breach"
            ? ["plausible", "insufficient"]
            : ["insufficient"],
        supportingEvidenceIds: s.evidenceIds,
        rule: "Chosen mechanism must belong to every cited signal. Cite supporting evidence from each cited signal.",
      })),
      normalCounterEvidenceIds: normal
        ? [`${bundle.asset.tag}:weekly:${normal.row}`]
        : [],
      counterEvidenceRule: normal
        ? "Include the supplied normal baseline as counter-evidence in every hypothesis."
        : "No eligible normal baseline is supplied; use an empty counterEvidenceIds array.",
      emptyResultRule:
        "Empty hypotheses and actions are permitted when no defensible inference can be composed. Never invent missing facts, signals or citations.",
    },
  };
}
