"use client";
import type { Analysis, Bundle } from "@/lib/types";
import { selectedFacts } from "@/lib/signals";
import { useHub } from "./hub";
import { Badge, Button } from "./ui";
import { Citations } from "./evidence-panels";
export function SignalPanel({
  analysis,
  bundle,
}: {
  analysis: Analysis;
  bundle: Bundle;
}) {
  const { openSource } = useHub();
  return (
    <div className="quality-card">
      <h3>Observed signals & factual bindings</h3>
      <Badge>{analysis.signals.state.replaceAll("_", " ")}</Badge>
      <p className="caption">
        {analysis.signals.weekly} eligible weekly readings ·{" "}
        {analysis.signals.hourly} hourly readings. Signal rules are
        source-stated or explicitly proposed.
      </p>
      {analysis.signals.signals.map((s) => (
        <div className="quality-card" key={s.id}>
          <strong>
            {s.parameter} · {s.severity}
          </strong>
          <p className="caption">{s.rule}</p>
          <Citations ids={s.evidenceIds} evidence={bundle.evidence} />
        </div>
      ))}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Observation / derived fact</th>
              <th>Value</th>
              <th>Unit</th>
              <th>Source time</th>
              <th>Evidence</th>
            </tr>
          </thead>
          <tbody>
            {analysis.observations.map((binding) => {
              const f = selectedFacts(analysis.signals).find(
                (f) => f.id === binding.factId,
              );
              return f ? (
                <tr key={f.id}>
                  <td>
                    {f.field}
                    <span className="cell-sub">{f.kind}</span>
                  </td>
                  <td>{String(f.value)}</td>
                  <td>{f.unit}</td>
                  <td>{f.time ?? "Not dated / metadata"}</td>
                  <td>
                    <Button
                      variant="text"
                      onClick={() =>
                        openSource({
                          title: f.field,
                          detailHeading: "Bound observation & provenance",
                          kind: f.kind,
                          unit: f.unit,
                          period: f.time ?? "Source scope",
                          formula: f.formula ?? "Literal source field",
                          locators: bundle.evidence
                            .filter((e) => f.evidenceIds.includes(e.id))
                            .map((e) => e.locator),
                          excerpt: JSON.stringify(f, null, 2),
                          warnings: [
                            "Derived facts retain source input IDs and formula. This validates arithmetic/provenance, not causality.",
                          ],
                        })
                      }
                    >
                      Fact & provenance
                    </Button>
                  </td>
                </tr>
              ) : null;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
