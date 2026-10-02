import fs from "node:fs";
import path from "node:path";
import type { Asset, Catalog, SourceFile, Deck } from "./types";
import { assetMeta, normalizeIncident } from "./domain";
// Used by server modules only; raw corpus never imported into a client component.
export const raw = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data/normalized.json"), "utf8"),
) as {
  version: string;
  assets: Asset[];
  incidents: Parameters<typeof normalizeIncident>[0][];
  inventory: SourceFile[];
  integrity: Catalog["integrity"];
  official: { file: string; pages: { page: number; text: string }[] }[];
  explanation: Deck;
};
export const incidents = raw.incidents.map(normalizeIncident);
export function catalog(): Catalog {
  return {
    version: raw.version,
    assets: raw.assets.map(assetMeta),
    incidents,
    inventory: raw.inventory,
    integrity: raw.integrity,
  };
}
