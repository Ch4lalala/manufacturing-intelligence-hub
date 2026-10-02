import { sourceResponse } from "@/lib/source-runtime";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return sourceResponse(new URL(request.url).searchParams);
}
