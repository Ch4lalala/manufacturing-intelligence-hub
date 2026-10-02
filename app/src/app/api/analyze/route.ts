import { raw, incidents } from "@/lib/data";
import { makeBundle } from "@/lib/evidence";
import { analyze } from "@/lib/analysis";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const text = await request.text();
    if (text.length > 2000)
      return Response.json(
        { error: "Analysis request is too large." },
        { status: 413 },
      );
    const input = JSON.parse(text);
    const asset = raw.assets.find((a) => a.tag === input.asset);
    if (
      !asset ||
      !["historical", "prospective"].includes(input.mode) ||
      typeof input.asOf !== "string" ||
      !/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(input.asOf)
    )
      return Response.json(
        { error: "Choose an asset, mode and valid source-local time." },
        { status: 400 },
      );
    const bundle = makeBundle(
      asset,
      incidents,
      raw.version,
      input.mode,
      input.asOf,
    );
    return Response.json(
      await analyze(
        bundle,
        input.live === true,
        {
          key: process.env.AI_API_KEY,
          model: process.env.AI_MODEL,
          base: process.env.AI_BASE_URL,
        },
        fetch,
        request.signal,
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Analysis could not start. Use evidence replay or retry." },
      { status: 400 },
    );
  }
}
