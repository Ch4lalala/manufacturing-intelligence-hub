"use client";
import { useRef, useState } from "react";
import type { ActionState, WorkspaceAction } from "@/lib/types";
import {
  STATES,
  transition,
  overdue,
  actionTrackerMetrics,
} from "@/lib/actions";
import { historicalActions } from "@/lib/evidence";
import { useHub } from "./hub";
import { Badge, Button, Field, Notice, Panel, Select, Modal } from "./ui";
import { Icon } from "./icons";
import { Citations } from "./evidence-panels";
export function Actions() {
  const { workspace, bundle, query, setQuery, navigate, openSource } = useHub();
  const [status, setStatus] = useState("");
  if (!bundle) return null;
  const clock = query.clock ?? "2026-10-02",
    metricScope = actionTrackerMetrics(workspace, {
      mode: bundle.mode,
      caseId: bundle.asset.tag,
      asOf: bundle.asOf,
    }),
    all = metricScope.actions,
    actions = all.filter(
      (a) =>
        (!status || a.state === status) &&
        (!query.actionAsset || a.caseId === query.actionAsset),
    );
  return (
    <>
      <Notice>
        Prototype workspace · approvals and owner roles are simulated. Local
        actions never change imported register statuses or historical report
        actions.
      </Notice>
      <div className="metric-grid">
        {metricScope.metrics.map((k) => (
          <div className="metric" key={k.label}>
            <p className="metric-label">{k.label}</p>
            <p className="metric-value">{k.value}</p>
            <Badge>Local computed</Badge>
            <Button
              variant="text"
              onClick={() =>
                openSource({
                  title: k.label,
                  locators: [],
                  kind: "computed prototype workspace",
                  period: `Demo clock ${clock}`,
                  formula: k.formula,
                  excerpt: JSON.stringify(
                    {
                      scope: metricScope.description,
                      ...k.evidence,
                    },
                    null,
                    2,
                  ),
                  warnings: [
                    "Metric totals and their evidence use the review scope; action state and asset filters affect the list only.",
                    "Local activity is not historical CAPA completion or a measured industrial benefit.",
                  ],
                })
              }
            >
              Definition & local evidence
            </Button>
          </div>
        ))}
      </div>
      <Panel
        title="Reviewed action workspace"
        sub="Draft → Approved → In Progress → Pending Verification → Closed"
      >
        <div className="filter-bar">
          <Select
            label="Action state"
            value={status}
            onChange={setStatus}
            options={[
              { value: "", label: "All states" },
              ...[...STATES, "Rejected", "Cancelled"].map((s) => ({
                value: s,
                label: s,
              })),
            ]}
          />
          <Select
            label="Action asset"
            value={query.actionAsset ?? ""}
            onChange={(v) => setQuery({ actionAsset: v })}
            options={[
              { value: "", label: "All workspace assets" },
              ...[...new Set(all.map((a) => a.caseId))].map((s) => ({
                value: s,
                label: s,
              })),
            ]}
          />
          <Field
            label="Demo clock for due-date review"
            type="date"
            value={clock}
            onChange={(v) => setQuery({ clock: v })}
          />
        </div>
        {actions.map((a) => (
          <ActionCard key={a.id} action={a} clock={clock} />
        ))}
        {!actions.length && (
          <div className="empty">
            <h3>
              {all.length
                ? "No actions match these filters"
                : "No prototype actions yet"}
            </h3>
            <p>
              Open Investigation, replay the evidence, accept a finding or
              hypothesis and create an action draft.
            </p>
            <Button variant="primary" onClick={() => navigate("investigation")}>
              Open Investigation
            </Button>
          </div>
        )}
      </Panel>
      {bundle.report && (
        <Panel
          title={`Imported historical report actions · ${bundle.asset.tag}`}
          sub="Read-only snapshot: source PIC, plan date and status; not actual overdue status today"
          className="snapshot"
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Historical action</th>
                  <th>Plan date</th>
                  <th>Source PIC</th>
                  <th>Source status</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {bundle.report &&
                  historicalActions(bundle.report).map((a, i) => (
                    <tr key={i}>
                      <td>{a.reference}</td>
                      <td>{a.title}</td>
                      <td>{a.date}</td>
                      <td>{a.pic}</td>
                      <td>
                        <Badge>{a.status}</Badge>
                      </td>
                      <td>
                        <Button
                          variant="text"
                          onClick={() =>
                            openSource({
                              title: `Historical action ${a.reference}`,
                              locators: [a.source],
                              excerpt: `${a.title}\nPlan date: ${a.date}\nSource PIC: ${a.pic}\nSource status: ${a.status}`,
                              kind: "source snapshot",
                              warnings: [
                                "Historical action tables and repair remarks have different status meanings; source register closure is not changed by prototype actions.",
                              ],
                            })
                          }
                        >
                          View source
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="caption">
            Slide 9 corrective/pro-active snapshot. Preventive actions, risk
            analysis and PM schedules remain available on slide 10 in
            Investigation.
          </p>
        </Panel>
      )}
      {bundle.mode === "historical" && (
        <Panel
          title="Local workspace history"
          sub="UTC timestamps · simulated actor roles; source histories unchanged"
        >
          {workspace.history.length ? (
            <ol className="history">
              {workspace.history
                .slice(-30)
                .reverse()
                .map((c, i) => (
                  <li key={i}>
                    <time>{c.at}</time> · {c.actor}
                    <br />
                    {c.description}
                  </li>
                ))}
            </ol>
          ) : (
            <p className="caption">
              No local episode, owner or hypothesis changes recorded.
            </p>
          )}
        </Panel>
      )}
    </>
  );
}
function ActionCard({
  action: a,
  clock,
}: {
  action: WorkspaceAction;
  clock: string;
}) {
  const { save, role } = useHub();
  const [error, setError] = useState(""),
    [confirmation, setConfirmation] = useState(false),
    [reason, setReason] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [terminal, setTerminal] = useState<ActionState | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const active = !["Closed", "Rejected", "Cancelled"].includes(a.state);
  function edit(patch: Partial<WorkspaceAction>) {
    save(
      (w) => ({
        ...w,
        actions: w.actions.map((x) =>
          x.id === a.id
            ? {
                ...x,
                ...patch,
                history: [
                  ...x.history,
                  {
                    at: new Date().toISOString(),
                    actor: role,
                    description: `Local details updated: ${Object.keys(patch).join(", ")}`,
                  },
                ],
              }
            : x,
        ),
      }),
      "Draft details saved locally.",
    );
  }
  function move(next: ActionState) {
    try {
      const updated = transition(a, next, {
        actor: role,
        reason,
        evidence: a.completionEvidence,
        confirmed,
      });
      save(
        (w) => ({
          ...w,
          actions: w.actions.map((x) => (x.id === a.id ? updated : x)),
        }),
        next === "Closed"
          ? "Action closed with completion evidence and reviewer confirmation."
          : `Action moved to ${next}.`,
      );
      setError("");
      setConfirmation(false);
      setTerminal(null);
      setConfirmed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action could not update.");
      const invalid = !a.owner ? "owner" : !a.due ? "due" : null;
      if (invalid)
        form.current
          ?.querySelector<HTMLInputElement>(`[data-field="${invalid}"]`)
          ?.focus();
    }
  }
  const next =
    a.state === "Draft"
      ? "Approved"
      : a.state === "Approved"
        ? "In Progress"
        : a.state === "In Progress"
          ? "Pending Verification"
          : a.state === "Pending Verification"
            ? "Closed"
            : null;
  return (
    <article className="action-card">
      <div className="action-head">
        <div>
          <h3>{a.title}</h3>
          <p className="caption">
            {a.caseId} · Prototype workspace · Linked review:{" "}
            {a.hypothesisTitle}
          </p>
        </div>
        <Badge tone={a.state}>{a.state}</Badge>
      </div>
      <p>{a.guidance}</p>
      <Citations ids={a.evidenceIds} evidence={a.sources} />
      <p className="caption">Priority reason: {a.priorityReason}</p>
      <div className="flow-track" aria-label="Action progress">
        {STATES.map((s) => (
          <span
            key={s}
            className={
              s === a.state
                ? "current"
                : STATES.indexOf(s) < STATES.indexOf(a.state)
                  ? "complete"
                  : ""
            }
          >
            {STATES.indexOf(s) < STATES.indexOf(a.state) && (
              <Icon name="check" />
            )}
            {s}
          </span>
        ))}
      </div>
      <form
        ref={form}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (next && next !== "Closed") move(next);
        }}
      >
        <div className="form-grid">
          <div className="field">
            <label htmlFor={`${a.id}-owner`}>
              Proposed owner role (required for approval)
            </label>
            <input
              data-field="owner"
              id={`${a.id}-owner`}
              value={a.owner}
              onChange={(e) => edit({ owner: e.target.value })}
              disabled={!active || a.state !== "Draft"}
              aria-invalid={!!error && !a.owner}
              aria-describedby={error ? `${a.id}-error` : undefined}
            />
          </div>
          <div className="field">
            <label htmlFor={`${a.id}-due`}>
              Demo due date (required for approval)
            </label>
            <input
              data-field="due"
              id={`${a.id}-due`}
              type="date"
              value={a.due}
              onChange={(e) => edit({ due: e.target.value })}
              disabled={!active || a.state !== "Draft"}
              aria-invalid={!!error && !a.due}
              aria-describedby={error ? `${a.id}-error` : undefined}
            />
          </div>
          <div className="field full">
            <label htmlFor={`${a.id}-dep`}>
              Dependencies / review prerequisites
            </label>
            <input
              id={`${a.id}-dep`}
              value={a.dependencies}
              onChange={(e) => edit({ dependencies: e.target.value })}
              disabled={!active || a.state !== "Draft"}
            />
          </div>
          <div className="field full">
            <label htmlFor={`${a.id}-evidence`}>
              Completion evidence / review record
            </label>
            <textarea
              className="resize-none"
              id={`${a.id}-evidence`}
              style={{ resize: "none" }}
              value={a.completionEvidence}
              onChange={(e) => edit({ completionEvidence: e.target.value })}
              disabled={!active}
              rows={4}
              aria-describedby={`${a.id}-evidence-help`}
            />
            <span id={`${a.id}-evidence-help`} className="caption">
              Enter an inspection/review reference and what was verified. This
              is local demo evidence, not proof of actual maintenance execution.
            </span>
          </div>
        </div>
        {a.due && (
          <p className="caption">
            {overdue(a, clock)
              ? `Due date passed at demo clock ${clock}`
              : `Due-date review uses demo clock ${clock}`}
            . Historical snapshot dates are not evaluated here.
          </p>
        )}
        {error && (
          <p id={`${a.id}-error`} className="error-text" role="alert">
            {error}
          </p>
        )}
        <div className="button-row">
          {next && (
            <Button
              type={next === "Closed" ? "button" : "submit"}
              variant="primary"
              onClick={
                next === "Closed"
                  ? () => {
                      setConfirmed(false);
                      setConfirmation(true);
                    }
                  : undefined
              }
            >
              {next === "Approved"
                ? "Approve action"
                : next === "In Progress"
                  ? "Start action"
                  : next === "Pending Verification"
                    ? "Submit for verification"
                    : "Review closure"}
            </Button>
          )}
          {a.state === "Draft" && (
            <Button variant="danger" onClick={() => setTerminal("Rejected")}>
              Reject draft
            </Button>
          )}
          {active && (
            <Button variant="danger" onClick={() => setTerminal("Cancelled")}>
              Cancel action
            </Button>
          )}
          {a.state === "Pending Verification" && (
            <Button onClick={() => move("In Progress")}>
              Return for more work
            </Button>
          )}
        </div>
      </form>
      {a.reviewer && (
        <Notice tone="success">
          Verified by {a.reviewer} (simulated role). Completion evidence
          retained. Source risk case remains unchanged.
        </Notice>
      )}
      <details>
        <summary>Action change history · {a.history.length} entries</summary>
        <ol className="history">
          {a.history.map((c, i) => (
            <li key={i}>
              <time>{c.at}</time> · {c.actor}
              <br />
              {c.description}
            </li>
          ))}
        </ol>
      </details>
      {confirmation && (
        <Modal
          title="Verify action closure"
          onClose={() => setConfirmation(false)}
        >
          <p>
            Review the completion evidence and confirm its relevance to this
            action. Choose the Engineering reviewer simulated role to close.
          </p>
          <pre className="excerpt">
            {a.completionEvidence || "No completion evidence recorded."}
          </pre>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            I confirm that I reviewed the completion evidence and the
            verification criterion is met in this prototype.
          </label>
          <p>
            Current simulated role: <strong>{role}</strong>
          </p>
          {error && <Notice tone="error">{error}</Notice>}
          <div className="button-row">
            <Button onClick={() => setConfirmation(false)}>Keep pending</Button>
            <Button
              variant="primary"
              disabled={
                !confirmed ||
                !a.completionEvidence.trim() ||
                role !== "Engineering reviewer"
              }
              onClick={() => move("Closed")}
            >
              Confirm verified closure
            </Button>
          </div>
          <p className="caption">
            Closure requires evidence, confirmation and the Engineering reviewer
            role. This does not close a source risk case.
          </p>
        </Modal>
      )}
      {terminal && (
        <Modal
          title={
            terminal === "Rejected" ? "Reject this draft" : "Cancel this action"
          }
          onClose={() => setTerminal(null)}
        >
          <Field
            label="Required reason"
            value={reason}
            onChange={setReason}
            error={error}
          />
          <div className="button-row">
            <Button onClick={() => setTerminal(null)}>Keep action</Button>
            <Button
              variant="danger"
              disabled={!reason.trim()}
              onClick={() => move(terminal)}
            >
              {terminal === "Rejected"
                ? "Reject with reason"
                : "Cancel with reason"}
            </Button>
          </div>
        </Modal>
      )}
    </article>
  );
}
