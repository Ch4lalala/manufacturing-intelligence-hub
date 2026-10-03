"use client";
import { useState } from "react";
import {
  DEFAULT_ASSUMPTIONS,
  GENERATOR,
  utilityMetrics,
  type Assumptions,
} from "@/lib/utilities";
import { number } from "@/lib/domain";
import { useHub } from "./hub";
import { Badge, Button, Field, Notice, Panel } from "./ui";
import { Chart } from "./chart";

const labels: Record<keyof Assumptions, string> = {
  seed: "Generator seed",
  baseKwh: "Mean energy / hour (kWh)",
  variationKwh: "Variation (kWh)",
  outputTon: "Matched output / hour (ton)",
  factor: "Illustrative factor (kg CO₂e/kWh)",
};

export function Utilities() {
  const { openSource } = useHub();
  const [enabled, setEnabled] = useState(false),
    [assumptions, setAssumptions] = useState(DEFAULT_ASSUMPTIONS),
    [draft, setDraft] = useState<Record<string, string>>(() =>
      Object.fromEntries(
        Object.entries(DEFAULT_ASSUMPTIONS).map(([k, v]) => [k, String(v)]),
      ),
    ),
    [error, setError] = useState("");
  const metrics = utilityMetrics(assumptions);
  const cards = enabled
    ? [
        {
          label: "Synthetic energy",
          value: number(metrics.energy, 2),
          unit: "kWh",
        },
        {
          label: "Synthetic energy intensity",
          value:
            metrics.intensity === null
              ? "Unavailable"
              : number(metrics.intensity, 3),
          unit: "kWh/ton",
        },
        {
          label: "Synthetic emissions",
          value: number(metrics.emissions, 2),
          unit: "kg CO₂e",
        },
      ]
    : [
        { label: "Energy", value: "Unavailable", unit: "No meter baseline" },
        {
          label: "Energy intensity",
          value: "Unavailable",
          unit: "No matched intervals",
        },
        {
          label: "Emissions",
          value: "Unavailable",
          unit: "No emissions baseline",
        },
      ];

  return (
    <section className="utility-zone">
      <div className="section-label">
        <div>
          <h2>Utilities & forecast</h2>
          <p>
            {enabled
              ? "Energy consumption modeling and persistence forecasting"
              : "Baseline coverage: utility telemetry"}
          </p>
        </div>
        <Button
          onClick={() => setEnabled((v) => !v)}
          variant={enabled ? "outline" : "primary"}
        >
          {enabled
            ? "Return to baseline utilities"
            : "Open illustrative utilities"}
        </Button>
      </div>
      <div className="utility-grid">
        {cards.map((c) => (
          <div className="metric" key={c.label}>
            <div className="metric-header">
              <span className="metric-label">{c.label}</span>
              <Badge tone={enabled ? "synthetic" : "neutral"}>
                {enabled ? "Model" : "Unavailable"}
              </Badge>
            </div>
            <div className="metric-value">{c.value}</div>
            <p className="caption">
              {c.unit} · {enabled ? "72 simulation hours" : "Baseline"}
            </p>
            <Button
              variant="text"
              onClick={() =>
                openSource({
                  title: c.label,
                  kind: enabled
                    ? "synthetic"
                    : "proposed missing-source contract",
                  locators: [],
                  unit: c.unit,
                  period: enabled
                    ? "Simulation hours 0–71"
                    : "No baseline window",
                  formula: c.label.includes("intensity")
                    ? "Σ energy / Σ matching output; unavailable for zero output"
                    : c.label.includes("emissions")
                      ? "Σ synthetic energy × editable illustrative factor"
                      : "Sum of hourly synthetic energy",
                  owner: "Utilities data steward",
                  excerpt: enabled
                    ? `${GENERATOR}\n${JSON.stringify(assumptions, null, 2)}\nAll points: data_kind=synthetic; assumption IDs ${Object.keys(assumptions).join(", ")}`
                    : "Proposed meter contract: meter ID, interval start/end, consumption, unit, product output in matching interval, factor value/unit/source/effective date. Inputs not supplied.",
                })
              }
            >
              Definition & assumptions
            </Button>
          </div>
        ))}
      </div>
      {enabled ? (
        <Panel
          title="Illustrative utility assumptions"
          sub={`${GENERATOR} · Deterministic energy generator`}
        >
          <Notice tone="info">
            Model parameters are configurable engineering assumptions. Persistence forecasts project the subsequent 24-hour horizon.
          </Notice>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              const values = Object.fromEntries(
                Object.entries(draft).map(([k, v]) => [k, Number(v)]),
              ) as Assumptions;
              if (
                Object.values(draft).some((v) => !v.trim()) ||
                Object.values(values).some(
                  (v) => !Number.isFinite(v) || v < 0,
                ) ||
                values.baseKwh > 100000 ||
                values.variationKwh > 100000 ||
                values.outputTon > 100000 ||
                values.factor > 100 ||
                !Number.isInteger(values.seed)
              ) {
                setError(
                  "Use nonnegative values; seed must be an integer. Energy/output maximum is 100000 and factor maximum is 100.",
                );
                document.getElementById("utility-seed")?.focus();
                return;
              }
              setError("");
              setAssumptions(values);
            }}
          >
            <div className="utility-assumptions">
              {(Object.keys(labels) as (keyof Assumptions)[]).map((k) => (
                <Field
                  key={k}
                  id={`utility-${k}`}
                  label={labels[k]}
                  value={draft[k]}
                  onChange={(v) => setDraft((d) => ({ ...d, [k]: v }))}
                  type="number"
                  min="0"
                  step={k === "seed" ? "1" : "any"}
                  error={k === "seed" ? error : undefined}
                />
              ))}
            </div>
            <div className="button-row">
              <Button type="submit" variant="primary">
                Apply assumptions
              </Button>
              <Button
                onClick={() => {
                  setAssumptions(DEFAULT_ASSUMPTIONS);
                  setDraft(
                    Object.fromEntries(
                      Object.entries(DEFAULT_ASSUMPTIONS).map(([k, v]) => [
                        k,
                        String(v),
                      ]),
                    ),
                  );
                  setError("");
                }}
              >
                Reset assumptions
              </Button>
            </div>
          </form>
          <Chart
            title="Synthetic hourly energy & persistence forecast"
            unit="kWh"
            forecastStart={72}
            points={[
              ...metrics.samples.map((p) => ({
                time: `History H${p.hour}`,
                value: p.kwh,
              })),
              ...metrics.forecast.map((p) => ({
                time: `Forecast H${p.hour}`,
                value: p.kwh,
                status: "Synthetic forecast",
              })),
            ]}
            caption={`Solid: 72 history hours. Dashed: next 24 hours, each ${number(metrics.mean, 3)} kWh = mean of history hours 48–71.`}
          />
        </Panel>
      ) : (
        <Notice>
          Live forecasting requires active interval meter connections and product output synchronization.
        </Notice>
      )}
    </section>
  );
}
