import { checkedLiveAvailability, liveConfig } from "@/lib/live-access";
export async function GET() {
  return Response.json(
    {
      configured: Boolean(process.env.AI_API_KEY && process.env.AI_MODEL),
      liveTested: false,
      liveAccess: await checkedLiveAvailability(liveConfig()),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
