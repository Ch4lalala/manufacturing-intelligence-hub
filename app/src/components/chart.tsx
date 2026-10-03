"use client";
import { useId, useState, type ReactNode } from "react";
import { number } from "@/lib/domain";
import { Icon } from "./icons";
import { Button, Pagination, Panel } from "./ui";
export type Point = {
  time: string;
  value: number;
  source?: () => void;
  status?: string;
};
export function Chart({
  title,
  unit,
  points,
  caption,
  alarm,
  trip,
  forecastStart,
  direction,
  headerControl,
}: {
  title: string;
  unit: string;
  points: Point[];
  caption: string;
  alarm?: number;
  trip?: number;
  forecastStart?: number;
  direction?: ">=" | "<=";
  headerControl?: ReactNode;
}) {
  const id = useId(),
    [table, setTable] = useState(false),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(0);
  if (!points.length)
    return (
      <Panel title={title} sub={unit}>
        {headerControl && <div className="chart-controls">{headerControl}</div>}
        <p>No eligible observations in this source scope.</p>
      </Panel>
    );
  const min = Math.min(
      0,
      ...points.map((p) => p.value),
      alarm ?? Infinity,
      trip ?? Infinity,
    ),
    max =
      Math.max(...points.map((p) => p.value), alarm ?? 0, trip ?? 0) * 1.08 ||
      1;
  const x = (i: number) => 52 + (i / Math.max(1, points.length - 1)) * 660,
    y = (v: number) => 214 - ((v - min) / (max - min)) * 174;
  const path = (start: number, end: number) =>
    points
      .slice(start, end)
      .map(
        (p, i) =>
          `${i ? "L" : "M"}${x(i + start).toFixed(2)},${y(p.value).toFixed(2)}`,
      )
      .join(" ");
  const chosen = points[Math.min(selected, points.length - 1)];
  const safePage = Math.min(page, Math.max(1, Math.ceil(points.length / 20)));
  const comparator = direction === ">=" ? "≥" : direction === "<=" ? "≤" : "";
  return (
    <Panel
      title={title}
      sub={`${unit} · ${points.length} ${forecastStart ? "synthetic points" : "source observations"}`}
      action={
        <Button onClick={() => setTable((v) => !v)}>
          <Icon name={table ? "overview" : "data"} />
          {table ? "Show chart" : "View readings"}
        </Button>
      }
    >
      {headerControl && <div className="chart-controls">{headerControl}</div>}
      <div className="chart-legend" aria-label="Chart legend">
        <span>
          <i className="legend-line" />
          {forecastStart !== undefined
            ? "Synthetic history"
            : "Source observations"}
        </span>
        {alarm !== undefined && (
          <span>
            <i className="legend-line alarm" />
            ALARM {comparator} {alarm} {unit}
          </span>
        )}
        {trip !== undefined && (
          <span>
            <i className="legend-line trip" />
            TRIP {comparator} {trip} {unit}
          </span>
        )}
        {forecastStart !== undefined && (
          <span>
            <i className="legend-line forecast" />
            Synthetic persistence forecast
          </span>
        )}
      </div>
      <p className="chart-axis">
        Value ({unit}) ·{" "}
        {forecastStart !== undefined
          ? "Simulation Timeline (Hours)"
          : "Observation Timeline"}
      </p>
      <svg
        viewBox="0 0 740 258"
        role="img"
        aria-labelledby={`${id}-title ${id}-desc`}
        className="chart"
      >
        <title id={`${id}-title`}>{title}</title>
        <desc id={`${id}-desc`}>
          {caption}. Values range{" "}
          {number(Math.min(...points.map((p) => p.value)), 3)} to{" "}
          {number(Math.max(...points.map((p) => p.value)), 3)} {unit}.
        </desc>
        {[0, 1, 2, 3].map((i) => {
          const v = min + ((max - min) * i) / 3;
          return (
            <g key={i}>
              <line
                x1="52"
                x2="714"
                y1={y(v)}
                y2={y(v)}
                className="grid-line"
              />
              <text x="44" y={y(v) + 4} textAnchor="end">
                {number(v, 1)}
              </text>
            </g>
          );
        })}
        {alarm !== undefined && (
          <g>
            <line
              x1="52"
              x2="714"
              y1={y(alarm)}
              y2={y(alarm)}
              className="alarm-line"
            />
            <text x="55" y={y(alarm) - 5} className="alarm-label">
              ALARM {comparator} {alarm} {unit}
            </text>
          </g>
        )}
        {trip !== undefined && (
          <g>
            <line
              x1="52"
              x2="714"
              y1={y(trip)}
              y2={y(trip)}
              className="trip-line"
            />
            <text x="55" y={y(trip) - 5} className="trip-label">
              TRIP {comparator} {trip} {unit}
            </text>
          </g>
        )}
        <path d={path(0, forecastStart ?? points.length)} className="series" />
        {forecastStart !== undefined && (
          <path
            d={path(forecastStart - 1, points.length)}
            className="series forecast"
          />
        )}
        {points.length <= 30 &&
          points.map((p, i) => (
            <circle
              key={i}
              cx={x(i)}
              cy={y(p.value)}
              r="3"
              className={`point ${p.status?.toLowerCase() ?? ""}`}
            >
              <title>
                {p.time} · {number(p.value, 3)} {unit}
                {p.status ? ` · ${p.status}` : ""}
              </title>
            </circle>
          ))}
        <circle
          cx={x(Math.min(selected, points.length - 1))}
          cy={y(chosen.value)}
          r="5"
          className="selected-point"
        />
        <text x="52" y="244">
          {points[0].time.slice(0, 16)}
        </text>
        <text x="714" y="244" textAnchor="end">
          {points.at(-1)!.time.slice(0, 16)}
        </text>
      </svg>
      <div className="chart-inspect">
        <label htmlFor={`${id}-sample`}>Inspect observation</label>
        <input
          id={`${id}-sample`}
          type="range"
          min="0"
          max={points.length - 1}
          value={Math.min(selected, points.length - 1)}
          onChange={(e) => setSelected(Number(e.target.value))}
        />
        <span>
          {chosen.time} ·{" "}
          <strong>
            {number(chosen.value, 3)} {unit}
          </strong>
          {chosen.status ? ` · ${chosen.status}` : ""}
        </span>
        {chosen.source && (
          <Button variant="text" onClick={chosen.source}>
            View source
          </Button>
        )}
      </div>
      <p className="caption">{caption}</p>
      {table && (
        <>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Observation time</th>
                  <th>Value ({unit})</th>
                  <th>Status</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {points
                  .slice((safePage - 1) * 20, safePage * 20)
                  .map((p, i) => (
                    <tr key={i}>
                      <td>{p.time}</td>
                      <td className="numeric">{number(p.value, 3)}</td>
                      <td>{p.status ?? "—"}</td>
                      <td>
                        {p.source ? (
                          <Button variant="text" onClick={p.source}>
                            View source
                          </Button>
                        ) : (
                          "Synthetic / generator assumptions"
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <Pagination
            total={points.length}
            page={safePage}
            onChange={setPage}
          />
        </>
      )}
    </Panel>
  );
}
