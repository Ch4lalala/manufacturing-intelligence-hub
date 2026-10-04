import {
  liveConfig,
  liveAvailability,
  checkedLiveAvailability,
  sessionId,
  cookieToken,
  sessionCookie,
  issueSession,
  passcodeMatches,
  liveStore,
  sessionRequestAllowed,
} from "@/lib/live-access";
const headers = { "Cache-Control": "no-store" };
export async function GET(request: Request) {
  const config = liveConfig();
  const configured = liveAvailability(config);
  if (!configured.enabled)
    return Response.json({ ...configured, authenticated: false }, { headers });
  if (!sessionRequestAllowed(request, config))
    return Response.json(
      {
        enabled: false,
        authenticated: false,
        reason:
          "Live demo access is unavailable for this origin or configuration. Evidence replay is available.",
      },
      { headers },
    );
  const store = liveStore(config),
    availability = await checkedLiveAvailability(config, store);
  if (!availability.enabled)
    return Response.json(
      { ...availability, authenticated: false },
      { status: 503, headers },
    );
  const id = sessionId(cookieToken(request), config);
  try {
    return Response.json(
      {
        ...availability,
        authenticated: !!id && !(await store.isRevoked(id)),
      },
      { headers },
    );
  } catch {
    return unavailable();
  }
}
function unavailable(clearCookie?: string) {
  return Response.json(
    {
      enabled: false,
      authenticated: false,
      error:
        "Live access is temporarily unavailable. Evidence replay remains available.",
      reason:
        "Shared live access store is unavailable. Evidence replay remains available.",
    },
    {
      status: 503,
      headers: clearCookie
        ? { ...headers, "Set-Cookie": clearCookie }
        : headers,
    },
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
  const store = liveStore(config);
  try {
    if (!(await store.loginAllowed()))
      return Response.json(
        {
          error:
            "Too many access attempts. Wait before trying again; replay remains available.",
        },
        { status: 429, headers },
      );
  } catch {
    return unavailable();
  }
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
  try {
    if (id) await liveStore(config).revoke(id);
  } catch {
    return unavailable(sessionCookie("", request, true));
  }
  return Response.json(
    { authenticated: false },
    { headers: { ...headers, "Set-Cookie": sessionCookie("", request, true) } },
  );
}
