import { raw, incidents } from "@/lib/data";
import { makeBundle } from "@/lib/evidence";
import { requestMode, sourceTime } from "@/lib/time";
import { guardedAnalysis } from "@/lib/analysis-service";
import { liveConfig } from "@/lib/live-access";
export const runtime = "nodejs";
export const maxDuration = 30;
export async function POST(request: Request) {
  try {
    const text = await request.text();
    if (text.length > 2000)
      return Response.json(
        { error: "Analysis request is too large." },
        { status: 413 },
      );
    const input = JSON.parse(text),
      asset = raw.assets.find((a) => a.tag === input.asset);
    if (
      !asset ||
      typeof input.asOf !== "string" ||
      typeof input.live !== "boolean"
    )
      throw new Error("Invalid scope");
    const mode = requestMode(input.mode),
      time = sourceTime(input.asOf);
    const bundle = makeBundle(
      asset,
      incidents,
      raw.version,
      mode,
      time,
      input.observationCutoff === true,
    );
    const result = await guardedAnalysis(
      request,
      bundle,
      input.live,
      liveConfig(),
      {
        key: process.env.AI_API_KEY,
        model: process.env.AI_MODEL,
        base: process.env.AI_BASE_URL,
      },
    );
    return Response.json(result.analysis, {
      status: result.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      {
        error:
          "Choose a supplied asset, valid scope and real source-local date/time. Evidence replay remains available.",
      },
      { status: 400 },
    );
  }
}
