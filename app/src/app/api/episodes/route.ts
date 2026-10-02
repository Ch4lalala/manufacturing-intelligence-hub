import { raw, incidents } from "@/lib/data";
import { makeBundle } from "@/lib/evidence";
import { rankEpisodes } from "@/lib/domain";
import { requestMode, sourceTime } from "@/lib/time";
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  try {
    const mode = requestMode(query.get("mode"));
    const cutoff = query.get("asOf") ? sourceTime(query.get("asOf")!) : null;
    if (mode === "prospective" && !cutoff) throw new Error("Cutoff required");
    const asset = query.get("asset");
    if (asset && !raw.assets.some((a) => a.tag === asset))
      throw new Error("Unknown asset");
    const episodes = raw.assets
      .filter((a) => !asset || a.tag === asset)
      .flatMap(
        (a) =>
          makeBundle(
            a,
            incidents,
            raw.version,
            mode,
            cutoff ?? String(a.production.at(-1)!.values.Timestamp),
            !!cutoff,
          ).episodes,
      );
    return Response.json(rankEpisodes(episodes), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      {
        error:
          "Choose a supplied asset, valid scope and real source-local replay time.",
      },
      { status: 400 },
    );
  }
}
