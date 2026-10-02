export async function GET() {
  return Response.json(
    {
      configured: Boolean(process.env.AI_API_KEY && process.env.AI_MODEL),
      liveTested: false,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
