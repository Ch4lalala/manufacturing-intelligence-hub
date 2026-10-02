import {
  createHmac,
  randomBytes,
  timingSafeEqual,
  createHash,
} from "node:crypto";
export const SESSION_COOKIE = "caliber-live-demo";
const TTL = 30 * 60 * 1000;
export type LiveConfig = {
  mode: string;
  passcode?: string;
  sessionSecret?: string;
  minuteLimit: number;
  dailyLimit: number;
  concurrencyLimit: number;
  platformPublic: boolean;
};
export function liveConfig(): LiveConfig {
  const positive = (s: string | undefined, max: number) =>
    s && /^\d+$/.test(s) && Number(s) > 0 && Number(s) <= max ? Number(s) : 0;
  return {
    mode: process.env.AI_LIVE_MODE ?? "disabled",
    passcode: process.env.DEMO_PASSCODE,
    sessionSecret: process.env.DEMO_SESSION_SECRET,
    minuteLimit: positive(process.env.AI_MAX_CALLS_PER_MINUTE, 10),
    dailyLimit: positive(process.env.AI_MAX_CALLS_PER_DAY, 100),
    concurrencyLimit: positive(process.env.AI_MAX_CONCURRENT, 2),
    platformPublic: !!(
      process.env.VERCEL ||
      process.env.NETLIFY ||
      process.env.AWS_LAMBDA_FUNCTION_NAME
    ),
  };
}
export function liveAvailability(config: LiveConfig) {
  if (config.platformPublic || config.mode === "public")
    return {
      enabled: false,
      reason:
        "Public live analysis is disabled: a verified shared quota/access backing is not configured. Evidence replay is available.",
    };
  if (config.mode !== "local")
    return {
      enabled: false,
      reason: "Live demo access is disabled. Evidence replay is available.",
    };
  if (
    !config.passcode ||
    config.passcode.length < 12 ||
    !config.sessionSecret ||
    config.sessionSecret.length < 32 ||
    !config.minuteLimit ||
    !config.dailyLimit ||
    !config.concurrencyLimit
  )
    return {
      enabled: false,
      reason:
        "Live demo access and usage limits need server configuration. Evidence replay is available.",
    };
  return {
    enabled: true,
    reason:
      "Local demo access only; usage limits apply to this one server process.",
  };
}
export function sameOrigin(request: Request) {
  const url = new URL(request.url),
    origin = request.headers.get("origin");
  return !origin || origin === url.origin;
}
function loopbackRequest(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("host") ?? url.host;
  return (
    ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) &&
    host === url.host &&
    sameOrigin(request)
  );
}
const digest = (value: string) => createHash("sha256").update(value).digest();
export function passcodeMatches(value: unknown, config: LiveConfig) {
  return (
    typeof value === "string" &&
    value.length <= 256 &&
    !!config.passcode &&
    timingSafeEqual(digest(value), digest(config.passcode))
  );
}
export function issueSession(config: LiveConfig, now = Date.now()) {
  if (!liveAvailability(config).enabled)
    throw new Error("Live access unavailable");
  const payload = Buffer.from(
    JSON.stringify({
      id: randomBytes(16).toString("hex"),
      exp: now + TTL,
      audience: "caliber-live-demo",
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", config.sessionSecret!)
    .update(payload)
    .digest("hex");
  return payload + "." + signature;
}
export function sessionId(
  token: string | undefined,
  config: LiveConfig,
  now = Date.now(),
): string | null {
  if (!token || token.length > 512 || !config.sessionSecret) return null;
  const [payload, signature, ...extra] = token.split(".");
  if (extra.length || !payload || !/^[a-f0-9]{64}$/.test(signature ?? ""))
    return null;
  const expected = createHmac("sha256", config.sessionSecret)
    .update(payload)
    .digest();
  if (!timingSafeEqual(Buffer.from(signature, "hex"), expected)) return null;
  try {
    const value = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );
    return /^[a-f0-9]{32}$/.test(value.id) &&
      value.audience === "caliber-live-demo" &&
      Number.isSafeInteger(value.exp) &&
      value.exp > now &&
      value.exp <= now + TTL
      ? value.id
      : null;
  } catch {
    return null;
  }
}
export function cookieToken(request: Request) {
  return request.headers
    .get("cookie")
    ?.split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(SESSION_COOKIE + "="))
    ?.slice(SESSION_COOKIE.length + 1);
}
export function sessionCookie(token: string, request: Request, clear = false) {
  return `${SESSION_COOKIE}=${clear ? "" : token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${clear ? 0 : TTL / 1000}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}
export class DemoLimiter {
  private minuteStart = 0;
  private minuteCalls = 0;
  private day = "";
  private dayCalls = 0;
  private active = 0;
  private loginStart = 0;
  private logins = 0;
  private revoked = new Map<string, number>();
  loginAllowed(now = Date.now()) {
    if (now - this.loginStart >= 60000) {
      this.loginStart = now;
      this.logins = 0;
    }
    return ++this.logins <= 5;
  }
  revoke(id: string, now = Date.now()) {
    for (const [key, expiry] of this.revoked)
      if (expiry <= now) this.revoked.delete(key);
    this.revoked.set(id, now + TTL);
  }
  isRevoked(id: string, now = Date.now()) {
    return (this.revoked.get(id) ?? 0) > now;
  }
  acquire(
    config: LiveConfig,
    now = Date.now(),
  ):
    | { ok: true; release: () => void }
    | { ok: false; reason: string; status: number } {
    const day = new Date(now).toISOString().slice(0, 10);
    if (day !== this.day) {
      this.day = day;
      this.dayCalls = 0;
    }
    if (now - this.minuteStart >= 60000) {
      this.minuteStart = now;
      this.minuteCalls = 0;
    }
    if (this.active >= config.concurrencyLimit)
      return {
        ok: false,
        status: 429,
        reason:
          "A live demo request is already running. Wait for it to finish; replay remains available.",
      };
    if (
      this.minuteCalls >= config.minuteLimit ||
      this.dayCalls >= config.dailyLimit
    )
      return {
        ok: false,
        status: 429,
        reason:
          "Live demo usage limit reached. Evidence replay remains available.",
      };
    this.active++;
    this.minuteCalls++;
    this.dayCalls++;
    let released = false;
    return {
      ok: true,
      release: () => {
        if (!released) {
          this.active--;
          released = true;
        }
      },
    };
  }
}
const globalState = globalThis as typeof globalThis & {
  caliberDemoLimiter?: DemoLimiter;
};
export const demoLimiter = (globalState.caliberDemoLimiter ??=
  new DemoLimiter());
export function authorizeLive(
  request: Request,
  config: LiveConfig,
  limiter = demoLimiter,
  now = Date.now(),
) {
  const availability = liveAvailability(config);
  if (!availability.enabled)
    return { ok: false as const, status: 403, reason: availability.reason };
  if (!loopbackRequest(request))
    return {
      ok: false as const,
      status: 403,
      reason:
        "Live analysis is limited to the configured local demo origin. Evidence replay is available.",
    };
  const id = sessionId(cookieToken(request), config, now);
  if (!id || limiter.isRevoked(id, now))
    return {
      ok: false as const,
      status: 401,
      reason:
        "Unlock demo live access before requesting a provider call. Workspace roles are simulations.",
    };
  return { ok: true as const, id };
}
export function sessionRequestAllowed(request: Request, config: LiveConfig) {
  return liveAvailability(config).enabled && loopbackRequest(request);
}
