import type { Workspace, WorkspaceAction, ActionState, Change } from "./types";
export const STATES: ActionState[] = [
  "Draft",
  "Approved",
  "In Progress",
  "Pending Verification",
  "Closed",
];
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value
  );
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
