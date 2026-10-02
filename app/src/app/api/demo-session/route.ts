import {
  liveConfig,
  liveAvailability,
  sessionId,
  cookieToken,
  sessionCookie,
  issueSession,
  passcodeMatches,
  demoLimiter,
  sessionRequestAllowed,
} from "@/lib/live-access";
const headers = { "Cache-Control": "no-store" };
export async function GET(request: Request) {
  const config = liveConfig(),
    availability = liveAvailability(config),
    id = sessionId(cookieToken(request), config);
  return Response.json(
    {
      ...availability,
      authenticated: availability.enabled && !!id && !demoLimiter.isRevoked(id),
    },
    { headers },
  );
}
export async function POST(request: Request) {
  const config = liveConfig();
  if (!sessionRequestAllowed(request, config))
    return Response.json(
      {
        error:
          "Demo live access is unavailable for this origin. Use evidence replay.",
      },
      { status: 403, headers },
    );
  if (!demoLimiter.loginAllowed())
    return Response.json(
      {
        error:
          "Too many access attempts. Wait before trying again; replay remains available.",
      },
      { status: 429, headers },
    );
  try {
    const text = await request.text();
    if (text.length > 512) throw new Error("Too large");
    const input = JSON.parse(text);
    if (!passcodeMatches(input.passcode, config))
      return Response.json(
        { error: "Demo access could not be unlocked. Check the passcode." },
        { status: 401, headers },
      );
    return Response.json(
      { authenticated: true },
      {
        headers: {
          ...headers,
          "Set-Cookie": sessionCookie(issueSession(config), request),
        },
      },
    );
  } catch {
    return Response.json(
      { error: "Enter a valid demo passcode." },
      { status: 400, headers },
    );
  }
}
export async function DELETE(request: Request) {
  const config = liveConfig();
  if (!sessionRequestAllowed(request, config))
    return Response.json(
      { error: "Demo session change is unavailable for this origin." },
      { status: 403, headers },
    );
  const id = sessionId(cookieToken(request), config);
  if (id) demoLimiter.revoke(id);
  return Response.json(
    { authenticated: false },
    { headers: { ...headers, "Set-Cookie": sessionCookie("", request, true) } },
  );
}
