import {
  createHmac,
  randomBytes,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import {
  RedisLiveStore,
  validRedisConfig,
  type RedisConfig,
} from "./shared-live-store";
export const SESSION_COOKIE = "caliber-live-demo";
const TTL = 30 * 60 * 1000;
export type LiveConfig = {
  mode: string;
  providerConfigured?: boolean;
  passcode?: string;
  sessionSecret?: string;
  minuteLimit: number;
  dailyLimit: number;
  concurrencyLimit: number;
  platformPublic: boolean;
  allowedOrigins?: string[];
  redis?: RedisConfig;
};
type MaybePromise<T> = T | Promise<T>;
export type QuotaSlot =
  | { ok: true; release: () => MaybePromise<void> }
  | { ok: false; reason: string; status: number };
export interface LiveStore {
  readonly kind: "local" | "shared";
  health(): MaybePromise<void>;
  loginAllowed(now?: number): MaybePromise<boolean>;
  revoke(id: string, now?: number): MaybePromise<void>;
  isRevoked(id: string, now?: number): MaybePromise<boolean>;
  acquire(
    config: LiveConfig,
    now?: number,
    id?: string,
  ): MaybePromise<QuotaSlot>;
}
export function liveConfig(): LiveConfig {
  const positive = (s: string | undefined, max: number) =>
    s && /^\d+$/.test(s) && Number(s) > 0 && Number(s) <= max ? Number(s) : 0;
  return {
    mode: process.env.AI_LIVE_MODE ?? "disabled",
    providerConfigured: Boolean(process.env.AI_API_KEY && process.env.AI_MODEL),
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
    allowedOrigins: (process.env.AI_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    redis: {
      url: process.env.UPSTASH_REDIS_REST_URL ?? "",
      token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
      namespace: process.env.AI_QUOTA_NAMESPACE ?? "caliber-production",
    },
  };
}
function validPublicOrigin(origin: string) {
  try {
    const url = new URL(origin);
    return (
      url.protocol === "https:" &&
      url.origin === origin &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      !origin.includes("*")
    );
  } catch {
    return false;
  }
}
export function liveAvailability(config: LiveConfig) {
  if (config.mode === "direct")
    return {
      enabled: config.providerConfigured === true,
      reason: config.providerConfigured
        ? "Live AI composition is available without a demo passcode."
        : "Live AI needs a server API key and exact model ID. Evidence replay is available.",
    };
  if (config.platformPublic && config.mode !== "public")
    return {
      enabled: false,
      reason:
        "Hosted live analysis requires public mode and shared access configuration. Evidence replay is available.",
    };
  if (!["local", "public"].includes(config.mode))
    return {
      enabled: false,
      reason: "Live demo access is disabled. Evidence replay is available.",
    };
  if (
    !config.passcode ||
    config.passcode.length < 12 ||
    !config.sessionSecret ||
    config.sessionSecret.length < 32 ||
    !Number.isInteger(config.minuteLimit) ||
    config.minuteLimit < 1 ||
    config.minuteLimit > 10 ||
    !Number.isInteger(config.dailyLimit) ||
    config.dailyLimit < 1 ||
    config.dailyLimit > 100 ||
    !Number.isInteger(config.concurrencyLimit) ||
    config.concurrencyLimit < 1 ||
    config.concurrencyLimit > 2
  )
    return {
      enabled: false,
      reason:
        "Live demo access and usage limits need server configuration. Evidence replay is available.",
    };
  if (
    config.mode === "public" &&
    (!config.allowedOrigins?.length ||
      config.allowedOrigins.length > 10 ||
      !config.allowedOrigins.every(validPublicOrigin) ||
      !validRedisConfig(config.redis))
  )
    return {
      enabled: false,
      reason:
        "Hosted live access needs an exact HTTPS origin and shared quota store. Evidence replay is available.",
    };
  return {
    enabled: true,
    reason:
      config.mode === "public"
        ? "Protected demo access; shared usage limits apply. Evidence replay remains available."
        : "Local demo access only; usage limits apply to this one server process.",
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
  readonly kind = "local" as const;
  health() {}
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
export function liveStore(config: LiveConfig): LiveStore {
  return config.mode === "public" && validRedisConfig(config.redis)
    ? new RedisLiveStore(config.redis!)
    : demoLimiter;
}
export async function checkedLiveAvailability(
  config: LiveConfig,
  store = liveStore(config),
) {
  const availability = liveAvailability(config);
  if (!availability.enabled || config.mode === "direct") return availability;
  try {
    if (config.mode === "public" && store.kind !== "shared") throw new Error();
    await store.health();
    return availability;
  } catch {
    return {
      enabled: false,
      reason:
        "Shared live access store is unavailable. Evidence replay remains available.",
    };
  }
}
export function allowedLiveOrigin(request: Request, config: LiveConfig) {
  if (config.mode === "direct") {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");
    return (
      (request.headers.get("host") ?? url.host) === url.host &&
      (!config.platformPublic || url.protocol === "https:") &&
      (["GET", "HEAD"].includes(request.method)
        ? !origin || origin === url.origin
        : origin === url.origin)
    );
  }
  if (config.mode !== "public") return loopbackRequest(request);
  const url = new URL(request.url);
  if (
    !config.allowedOrigins?.includes(url.origin) ||
    !validPublicOrigin(url.origin)
  )
    return false;
  // Host and Origin must agree with the server URL. Forwarded headers are never trusted.
  if ((request.headers.get("host") ?? url.host) !== url.host) return false;
  const origin = request.headers.get("origin");
  if (
    request.method !== "GET" &&
    request.method !== "HEAD" &&
    origin !== url.origin
  )
    return false;
  return !origin || origin === url.origin;
}
export async function authorizeLive(
  request: Request,
  config: LiveConfig,
  limiter: LiveStore = liveStore(config),
  now = Date.now(),
) {
  const availability = liveAvailability(config);
  if (!availability.enabled)
    return { ok: false as const, status: 403, reason: availability.reason };
  if (
    !allowedLiveOrigin(request, config) ||
    (config.mode === "public" && limiter.kind !== "shared")
  )
    return {
      ok: false as const,
      status: 403,
      reason:
        "Live analysis is limited to the configured demo origin and access store. Evidence replay is available.",
    };
  if (config.mode === "direct") return { ok: true as const, id: "" };
  const id = sessionId(cookieToken(request), config, now);
  if (!id)
    return {
      ok: false as const,
      status: 401,
      reason:
        "Unlock demo live access before requesting a provider call. Workspace roles are simulations.",
    };
  try {
    if (await limiter.isRevoked(id, now))
      return {
        ok: false as const,
        status: 401,
        reason: "Demo session expired or was locked. Unlock live access again.",
      };
  } catch {
    return {
      ok: false as const,
      status: 503,
      reason:
        "Shared live access store is unavailable. Evidence replay remains available.",
    };
  }
  return { ok: true as const, id };
}
export function sessionRequestAllowed(request: Request, config: LiveConfig) {
  return liveAvailability(config).enabled && allowedLiveOrigin(request, config);
}
