// Controlled diagnostics only: never expose provider content, raw errors or credentials.
const reasons = {
  endpoint: "The server provider base URL is invalid. Check AI_BASE_URL.",
  network:
    "The provider connection failed. Check endpoint availability and retry explicitly.",
  timeout:
    "The provider did not complete within the fifteen-second request deadline. Retry explicitly or use replay.",
  cancelled:
    "The live request was cancelled. Request composition again if still needed.",
  response_empty: "The provider returned an empty response.",
  response_oversized:
    "The provider response exceeded the supported response size.",
  provider_json: "The provider returned a body that is not valid JSON.",
  response_shape:
    "The provider response did not contain a chat-completion message with text content. Check model and endpoint compatibility.",
  provider_truncated:
    "The provider reported that its output was cut off before completion. No partial result was accepted.",
  provider_refused:
    "The provider refused or filtered this response. No live result was accepted.",
  content_json:
    "The model message is not a complete JSON object. It must follow the supplied response schema.",
  schema_invalid:
    "The model output did not match the analysis schema or inference-only narrative rules.",
  fact_mismatch:
    "A model observation did not match a supplied fact, value, unit, asset or source time.",
  citation_ineligible:
    "The model cited unknown evidence or evidence outside this review scope.",
  hypothesis_schema:
    "A hypothesis has unsupported fields or an invalid object shape.",
  hypothesis_identity:
    "Hypothesis IDs must be unique alphabetic identifiers without digits, and actions must use the same ID.",
  hypothesis_narrative:
    "Hypothesis prose violates inference-only rules. Keep quantities in observations and use unconfirmed rather than blocked certainty terms, even when negated.",
  hypothesis_missing_checks:
    "Every hypothesis needs both unit/calibration/timing verification and engineering inspection/review checks.",
  hypothesis_metadata:
    "Hypothesis kind must be Hypothesis and knowledgeBasis must be Engineering inference.",
  hypothesis_strength:
    "Hypothesis strength must be the literal plausible or insufficient.",
  hypothesis_signal_ids:
    "A hypothesis must cite a nonempty list of supplied signal IDs.",
  hypothesis_signal_link:
    "The hypothesis mechanism must be allowed by every cited signal.",
  hypothesis_support:
    "Each cited signal requires its own supporting evidence in the hypothesis.",
  hypothesis_strength_rule:
    "Plausible strength requires a source weekly breach; proposed review signals require insufficient strength.",
  hypothesis_counter_evidence:
    "The hypothesis omitted the supplied normal baseline counter-evidence.",
  hypothesis_inference:
    "The hypothesis must be phrased as an unconfirmed inference with may, could or equivalent qualifying language.",
  hypothesis_invalid:
    "A model hypothesis did not meet the signal, strength or missing-check requirements.",
  action_invalid:
    "A model action did not meet guidance or reviewed-hypothesis linkage requirements.",
  limitation_invalid: "The model included unsupported limitation narrative.",
  validation_failed:
    "The model response failed evidence validation. Replay remains available.",
} as const;
export type LiveFailureCode = keyof typeof reasons;
export class LiveResponseError extends Error {
  constructor(readonly code: LiveFailureCode) {
    super(code);
  }
}
export function failureMessage(code: LiveFailureCode) {
  return `Evidence replay - live attempted but failed [${code}]. ${reasons[code]} No live result accepted.`;
}
export function parseCompletion(text: string): unknown {
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new LiveResponseError("provider_json");
  }
  const choice = body?.choices?.[0];
  if (choice?.finish_reason === "length")
    throw new LiveResponseError("provider_truncated");
  if (
    choice?.finish_reason === "content_filter" ||
    (typeof choice?.message?.refusal === "string" &&
      choice.message.refusal.trim())
  )
    throw new LiveResponseError("provider_refused");
  const content = choice?.message?.content;
  if (typeof content !== "string" || !content.trim())
    throw new LiveResponseError("response_shape");
  const trimmed = content.trim();
  // Accept a complete JSON code fence, including trailing newline/whitespace.
  // Never extract/salvage a partial object from prose or truncated responses.
  const fence = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\s*```$/i);
  try {
    return JSON.parse(fence ? fence[1] : trimmed);
  } catch {
    throw new LiveResponseError("content_json");
  }
}
export function validationFailure(error: unknown): LiveFailureCode {
  const message = error instanceof Error ? error.message : "";
  const map: Record<string, LiveFailureCode> = {
    "Invalid analysis schema or unsupported narrative": "schema_invalid",
    "Invalid factual binding": "fact_mismatch",
    "Unsupported fact, number, unit, asset or timestamp": "fact_mismatch",
    "Duplicate factual binding": "fact_mismatch",
    "Unknown or ineligible citation": "citation_ineligible",
    "Insufficient anomaly evidence": "hypothesis_invalid",
    "Unsupported hypothesis or inflated strength": "hypothesis_invalid",
    "Hypothesis schema invalid": "hypothesis_schema",
    "Hypothesis identity invalid": "hypothesis_identity",
    "Hypothesis narrative invalid": "hypothesis_narrative",
    "Hypothesis missing checks invalid": "hypothesis_missing_checks",
    "Hypothesis metadata invalid": "hypothesis_metadata",
    "Hypothesis strength invalid": "hypothesis_strength",
    "Hypothesis signal IDs invalid": "hypothesis_signal_ids",
    "Hypothesis must be expressed as an inference": "hypothesis_inference",
    "Mechanism not linked to observed signals": "hypothesis_signal_link",
    "Hypothesis lacks abnormal supporting context": "hypothesis_support",
    "Strength exceeds proposed review signals": "hypothesis_strength_rule",
    "Normal baseline counter-evidence omitted": "hypothesis_counter_evidence",
    "Duplicate hypothesis identity": "hypothesis_identity",
    "Unsupported action guidance": "action_invalid",
    "Action must link to its reviewed hypothesis and supporting evidence":
      "action_invalid",
    "Unsupported limitation narrative": "limitation_invalid",
  };
  return Object.hasOwn(map, message) ? map[message] : "validation_failed";
}
