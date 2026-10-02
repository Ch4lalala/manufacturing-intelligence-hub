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
      title="Evidence needs review"
      sub="Conflicts stay visible; engineering verification is required."
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
            Compare source excerpts
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
          <p className="caption">Qualified source identity</p>
          <code>
            {incident.rawAR} · {incident.tag} · {incident.plant} ·{" "}
            {incident.date}
          </code>
          <p className="caption">
            {incident.ar === null
              ? "Raw AR is literal n/a; usable identifier is null."
              : "AR is not a unique primary key."}
          </p>
        </div>
        <div>
          <p className="caption">Equipment / component / mechanism</p>
          <p>
            {incident.equipment} / {incident.component} / {incident.mechanism}
          </p>
        </div>
        <div>
          <p className="caption">Downtime (source column)</p>
          <strong>{number(incident.downtime)} h</strong>
        </div>
        <div>
          <p className="caption">Source risk score</p>
          <strong>{incident.risk ?? "Unavailable"}</strong>
        </div>
        <div>
          <p className="caption">Act. Loss</p>
          <strong>{money(incident.actual)} k US$</strong>
        </div>
        <div>
          <p className="caption">Pot. Loss</p>
          <strong>{money(incident.potential)} k US$</strong>
        </div>
      </div>
      <p className="caption">
        Total exposure = {money(incident.total)} k US$ = Act. Loss + Pot. Loss.
        Exposure does not establish savings. Source status is a historical
        snapshot.{" "}
        {hasReport
          ? "Detailed RCA available via a qualified link."
          : "Detailed RCA was not supplied for this row."}
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
            warnings: [
              "No AR-only join; historical status is separate from local actions.",
            ],
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
