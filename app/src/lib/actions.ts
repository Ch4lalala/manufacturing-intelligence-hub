import type {
  Workspace,
  WorkspaceAction,
  ActionState,
  Change,
  Hypothesis,
  Mode,
} from "./types";
import { validSourceDate } from "./time";
export type ActionMetricScope = { mode: Mode; caseId: string; asOf: string };
export function actionTrackerMetrics(
  workspace: Workspace,
  scope: ActionMetricScope,
) {
  const actions = workspace.actions.filter(
    (a) =>
      scope.mode === "historical" ||
      (a.analysisMode === "prospective" &&
        a.caseId === scope.caseId &&
        a.analysisAsOf === scope.asOf),
  );
  const episodes: Workspace["episodes"] =
    scope.mode === "historical"
      ? Object.fromEntries(
          Object.entries(workspace.episodes).filter(
            ([, state]) => state === "Acknowledged",
          ),
        )
      : {};
  const metric = (
    label: string,
    formula: string,
    rows: WorkspaceAction[],
    acknowledged: Workspace["episodes"] = {},
  ) => {
    const evidence = {
      actions: rows.map((a) => ({
        id: a.id,
        state: a.state,
        caseId: a.caseId,
        analysisMode: a.analysisMode,
        analysisAsOf: a.analysisAsOf,
        reviewer: a.reviewer,
        completionEvidence: a.completionEvidence,
      })),
      episodes: acknowledged,
    };
    return {
      label,
      formula,
      value: evidence.actions.length + Object.keys(evidence.episodes).length,
      evidence,
    };
  };
  return {
    actions,
    description:
      scope.mode === "prospective"
        ? `Pre-event actions only: ${scope.caseId}, source-local cutoff ${scope.asOf}. Historical actions and episode acknowledgements are excluded.`
        : "All local workspace actions across assets and review scopes. Action state and asset filters affect the list only.",
    metrics: [
      metric(
        "Local action drafts",
        "Count all local actions in this metric scope, across workflow states",
        actions,
      ),
      metric(
        "Pending verification",
        "Count in-scope actions with state Pending Verification",
        actions.filter((a) => a.state === "Pending Verification"),
      ),
      metric(
        "Verified local closures",
        "Count in-scope Closed actions with reviewer and completion evidence",
        actions.filter(
          (a) => a.state === "Closed" && a.reviewer && a.completionEvidence,
        ),
      ),
      metric(
        "Acknowledged local episodes",
        scope.mode === "prospective"
          ? "Zero: workspace episode acknowledgements have no asset/mode/cutoff provenance and are excluded from pre-event metrics"
          : "Count locally Acknowledged episode IDs; Grouped and Open episodes are excluded",
        [],
        episodes,
      ),
    ],
  };
}
export const STATES: ActionState[] = [
  "Draft",
  "Approved",
  "In Progress",
  "Pending Verification",
  "Closed",
];
export function validDate(value: string) {
  return validSourceDate(value);
}
export function reviewKey(
  tag: string,
  mode: string,
  asOf: string,
  h: Hypothesis,
) {
  // Content-bound review identity prevents an accepted prior narrative from approving a changed model hypothesis.
  const content = JSON.stringify([
    h.title,
    h.explanation,
    h.mechanism,
    h.strength,
    h.evidenceIds,
    h.counterEvidenceIds,
    h.missingChecks,
  ]);
  let fingerprint = 2166136261;
  for (const character of content)
    fingerprint =
      Math.imul(fingerprint ^ character.charCodeAt(0), 16777619) >>> 0;
  return `${tag}:${mode}:${asOf}:${h.id}:${fingerprint.toString(16)}`;
}
export function emptyWorkspace(version: string): Workspace {
  return {
    version,
    actions: [],
    owners: {},
    reviews: {},
    episodes: {},
    history: [],
  };
}
export function restoreWorkspace(
  text: string | null,
  version: string,
): { workspace: Workspace; notice: string } {
  if (!text) return { workspace: emptyWorkspace(version), notice: "" };
  try {
    const w = JSON.parse(text) as Workspace;
    if (w.version !== version)
      return {
        workspace: emptyWorkspace(version),
        notice:
          "Dataset version changed. Stale prototype workspace cleared; originals preserved.",
      };
    if (
      !Array.isArray(w.actions) ||
      !w.actions.every(
        (a) =>
          typeof a.id === "string" &&
          [...STATES, "Rejected", "Cancelled"].includes(a.state) &&
          Array.isArray(a.history) &&
          Array.isArray(a.sources) &&
          typeof a.due === "string" &&
          typeof a.owner === "string",
      ) ||
      !Array.isArray(w.history) ||
      !w.owners ||
      !w.reviews ||
      !w.episodes
    )
      throw new Error("Invalid workspace");
    return { workspace: w, notice: "" };
  } catch {
    return {
      workspace: emptyWorkspace(version),
      notice:
        "Invalid local workspace was cleared. You can create a new reviewed draft.",
    };
  }
}
export function transition(
  a: WorkspaceAction,
  next: ActionState,
  options: {
    actor: string;
    reason?: string;
    evidence?: string;
    confirmed?: boolean;
    at?: string;
  },
): WorkspaceAction {
  const allowed: Record<ActionState, ActionState[]> = {
    Draft: ["Approved", "Rejected", "Cancelled"],
    Approved: ["In Progress", "Cancelled"],
    "In Progress": ["Pending Verification", "Cancelled"],
    "Pending Verification": ["Closed", "In Progress", "Cancelled"],
    Closed: [],
    Rejected: [],
    Cancelled: [],
  };
  if (!allowed[a.state].includes(next))
    throw new Error("Follow the review workflow in order.");
  if (!options.actor.trim()) throw new Error("Choose a simulated review role.");
  if (
    next === "Approved" &&
    (!a.owner.trim() ||
      !validDate(a.due) ||
      !a.evidenceIds.length ||
      !a.hypothesisId ||
      !a.priorityReason.trim())
  )
    throw new Error(
      "Approval needs owner, due date, linked hypothesis, evidence and priority reason.",
    );
  if (["Rejected", "Cancelled"].includes(next) && !options.reason?.trim())
    throw new Error("A rejection or cancellation reason is required.");
  const evidence = options.evidence?.trim() || a.completionEvidence.trim();
  if (next === "Pending Verification" && !evidence)
    throw new Error(
      "Record completion evidence before submitting for verification.",
    );
  if (
    next === "Closed" &&
    (!evidence ||
      !options.confirmed ||
      options.actor !== "Engineering reviewer")
  )
    throw new Error(
      "Closure requires completion evidence and Engineering reviewer confirmation.",
    );
  const history: Change = {
    at: options.at ?? new Date().toISOString(),
    actor: options.actor,
    description: `${a.state} → ${next}${options.reason ? `: ${options.reason}` : ""}${next === "Closed" ? "; completion evidence reviewed and confirmed" : ""}`,
  };
  return {
    ...a,
    state: next,
    completionEvidence: evidence,
    reviewer: next === "Closed" ? options.actor : a.reviewer,
    history: [...a.history, history],
  };
}
export function overdue(a: WorkspaceAction, clock: string) {
  return (
    !["Closed", "Rejected", "Cancelled"].includes(a.state) &&
    !!a.due &&
    a.due < clock
  );
}
