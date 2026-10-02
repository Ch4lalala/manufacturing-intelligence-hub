import { raw, incidents } from "@/lib/data";
import {
  assetMeta,
  deriveEpisodes,
  qualifiedIncident,
  eligibleTime,
  rankEpisodes,
} from "@/lib/domain";
export async function GET(request: Request) {
  const asOf = new URL(request.url).searchParams.get("asOf");
  if (asOf && !/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(asOf))
    return Response.json(
      { error: "Use a valid source-local time." },
      { status: 400 },
    );
  return Response.json(
    rankEpisodes(
      raw.assets.flatMap((a) =>
        deriveEpisodes(
          assetMeta(a),
          a.conditions.filter(
            (c) => !asOf || eligibleTime(c.date + " 00:00:00", asOf),
          ),
          !asOf || a.eventDate <= asOf.slice(0, 10)
            ? qualifiedIncident(a, incidents)
            : null,
          "historical",
        ),
      ),
    ),
    { headers: { "Cache-Control": "no-store" } },
  );
}
