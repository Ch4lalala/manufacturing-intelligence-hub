import { raw, incidents } from "@/lib/data";
import { makeBundle } from "@/lib/evidence";
import { requestMode, sourceTime } from "@/lib/time";
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const a = raw.assets.find((a) => a.tag === p.get("asset"));
  if (!a)
    return Response.json(
      { error: "Unknown asset. Select a supplied scenario." },
      { status: 400 },
    );
  try {
    const mode = requestMode(p.get("mode"));
    const asOf = (
      p.get("asOf") ?? (a.production.at(-1)!.values.Timestamp as string)
    ).replace("T", " ");
    return Response.json(
      makeBundle(
        a,
        incidents,
        raw.version,
        mode,
        sourceTime(asOf),
        p.has("asOf"),
      ),
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    return Response.json(
      { error: "Choose a valid scope, calendar date and source-local time." },
      { status: 400 },
    );
  }
}
