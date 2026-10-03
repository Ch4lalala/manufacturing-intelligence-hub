import { Panel } from "./ui";

const labels: Record<string, { label: string; tone: string }> = {
  "RISK CLOSED": { label: "Risk closed", tone: "success" },
  "RISK CANCELED": { label: "Risk canceled", tone: "neutral" },
  "CA/PA EXECUTION": { label: "CA/PA execution", tone: "primary" },
  "RCA PROCESS": { label: "RCA process", tone: "warning" },
  "MONITORING RESULT": { label: "Monitoring result", tone: "primary" },
  "NEW REGISTERED": { label: "New registered", tone: "neutral" },
};

export function StatusComposition({
  statuses,
  total,
}: {
  statuses: Record<string, number>;
  total: number;
}) {
  return (
    <Panel
      title="Status Composition"
      sub={`${total} records in active scope`}
      className="status-composition"
    >
      {total > 0 ? (
        <ul className="status-distribution">
          {Object.entries(statuses).map(([status, count]) => {
            const display = labels[status] ?? {
              label: status,
              tone: "neutral",
            };
            return (
              <li
                className={`status-distribution-row ${display.tone}`}
                data-source-status={status}
                key={status}
              >
                <span
                  className="status-label"
                  title={`Source status: ${status}`}
                >
                  {display.label}
                </span>
                <span className="status-track" aria-hidden="true">
                  <span style={{ width: `${(count / total) * 100}%` }} />
                </span>
                <strong className="status-count">{count}</strong>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="empty">
          No records match this scope. Adjust the register filters or reset
          scope.
        </div>
      )}
    </Panel>
  );
}
