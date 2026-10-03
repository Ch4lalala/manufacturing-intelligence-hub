"use client";
import type { Quality, Incident, Evidence } from "@/lib/types";
import { money, number } from "@/lib/domain";
import { useHub } from "./hub";
import { Panel, Badge, Button, SourceButton } from "./ui";
export function QualityPanel({
  quality,
  compact = false,
}: {
  quality: Quality[];
  compact?: boolean;
}) {
  const { openSource } = useHub();
  return (
    <Panel
      title="Evidence Discrepancies"
      sub="Discrepancies identified across source datasets requiring verification."
      className="evidence-rail"
    >
      {quality.slice(0, compact ? 3 : quality.length).map((q) => (
        <div className="quality-card" key={q.id}>
          <div className="quality-title">
            <Badge tone="warning">{q.id}</Badge>
            <h3>{q.title}</h3>
          </div>
          <p>{q.detail}</p>
          <Button
            variant="text"
            onClick={() =>
              openSource({
                title: `${q.id} · ${q.title}`,
                locators: q.locators,
                warnings: [q.detail],
              })
            }
          >
            Compare source records
          </Button>
        </div>
      ))}
    </Panel>
  );
}
export function IncidentDetail({ incident }: { incident: Incident }) {
  const { catalog, openSource } = useHub();
  const hasReport = catalog.assets.some(
    (a) => a.linked_incident_id === incident.id,
  );
  return (
    <Panel
      title={incident.title}
      sub={`${incident.id} · ${incident.plant} / ${incident.tag} · Event ${incident.date}`}
      action={<Badge>{incident.status}</Badge>}
    >
      <div className="form-grid">
        <div>
          <p className="caption">Identifier</p>
          <code>
            {incident.rawAR} · {incident.tag} · {incident.plant} ·{" "}
            {incident.date}
          </code>
        </div>
        <div>
          <p className="caption">Equipment Hierarchy</p>
          <p>
            {incident.equipment} / {incident.component} / {incident.mechanism}
          </p>
        </div>
        <div>
          <p className="caption">Downtime</p>
          <strong>{number(incident.downtime)} h</strong>
        </div>
        <div>
          <p className="caption">Risk Score</p>
          <strong>{incident.risk ?? "Unavailable"}</strong>
        </div>
        <div>
          <p className="caption">Actual Loss</p>
          <strong>{money(incident.actual)} k US$</strong>
        </div>
        <div>
          <p className="caption">Potential Loss</p>
          <strong>{money(incident.potential)} k US$</strong>
        </div>
      </div>
      <p className="caption">
        Total Exposure: {money(incident.total)} k US$ ·{" "}
        {hasReport
          ? "RCA documentation available."
          : "Standard event record without attached RCA."}
      </p>
      <Button
        onClick={() =>
          openSource({
            title: incident.id,
            locators: [incident.source],
            excerpt: JSON.stringify(incident.raw, null, 2),
            period: incident.date,
            unit: "h; k US$",
            kind: "source",
            warnings: ["Historical record separate from active actions."],
          })
        }
      >
        View source record
      </Button>
    </Panel>
  );
}
export function Citations({
  ids,
  evidence,
}: {
  ids: string[];
  evidence: Evidence[];
}) {
  const { openSource } = useHub();
  return (
    <span className="evidence-links">
      {ids.map((id) => {
        const e = evidence.find((e) => e.id === id);
        return e ? (
          <SourceButton
            key={id}
            evidence={e}
            onOpen={openSource}
            label={
              e.category === "report"
                ? `RCA slide ${e.locator.slide} · shape ${e.locator.shape}`
                : e.category === "weekly"
                  ? `Weekly ${e.time}`
                  : id
            }
          />
        ) : (
          <span key={id}>Unavailable citation</span>
        );
      })}
    </span>
  );
}
