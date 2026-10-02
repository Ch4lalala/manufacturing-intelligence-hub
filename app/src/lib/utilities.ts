export type Assumptions = {
  seed: number;
  baseKwh: number;
  variationKwh: number;
  outputTon: number;
  factor: number;
};
export const DEFAULT_ASSUMPTIONS: Assumptions = {
  seed: 2026,
  baseKwh: 100,
  variationKwh: 12,
  outputTon: 10,
  factor: 0.4,
};
export const GENERATOR = "illustrative-utilities-v1";
export function utilitySamples(a: Assumptions) {
  let seed = a.seed >>> 0;
  return Array.from({ length: 72 }, (_, hour) => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    const kwh = Math.max(
      0,
      a.baseKwh +
        a.variationKwh *
          (Math.sin((hour * Math.PI) / 12) + (seed / 4294967296 - 0.5) * 0.4),
    );
    return {
      hour,
      kwh: Number(kwh.toFixed(3)),
      outputTon: a.outputTon,
      data_kind: "synthetic" as const,
      generator: GENERATOR,
      assumptionIds: Object.keys(a).map((k) => `${GENERATOR}:${k}`),
    };
  });
}
export function utilityMetrics(a: Assumptions) {
  const samples = utilitySamples(a);
  const energy = samples.reduce((s, p) => s + p.kwh, 0),
    output = samples.reduce((s, p) => s + p.outputTon, 0);
  const mean = samples.slice(-24).reduce((s, p) => s + p.kwh, 0) / 24;
  return {
    samples,
    energy,
    intensity: output > 0 ? energy / output : null,
    emissions: energy * a.factor,
    forecast: Array.from({ length: 24 }, (_, i) => ({
      hour: 72 + i,
      kwh: mean,
      data_kind: "synthetic" as const,
      generator: GENERATOR,
      assumptionIds: samples[0].assumptionIds,
    })),
    mean,
  };
}
