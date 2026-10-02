import { raw, incidents } from "@/lib/data";
import { makeBundle } from "@/lib/evidence";
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const a = raw.assets.find((a) => a.tag === p.get("asset"));
  if (!a)
    return Response.json(
      { error: "Unknown asset. Select a supplied scenario." },
      { status: 400 },
    );
  const mode = p.get("mode") === "prospective" ? "prospective" : "historical";
  const asOf = (
    p.get("asOf") ?? (a.production.at(-1)!.values.Timestamp as string)
  ).replace("T", " ");
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(asOf))
    return Response.json(
      { error: "Use a source-local replay timestamp." },
      { status: 400 },
    );
  return Response.json(makeBundle(a, incidents, raw.version, mode, asOf), {
    headers: { "Cache-Control": "no-store" },
  });
}
