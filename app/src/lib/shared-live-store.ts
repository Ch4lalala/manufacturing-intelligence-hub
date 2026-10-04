import { randomBytes } from "node:crypto";
import type { LiveConfig, LiveStore, QuotaSlot } from "./live-access";

export type RedisConfig = { url: string; token: string; namespace: string };
export function validRedisConfig(config: RedisConfig | undefined) {
  if (!config?.token || !/^[a-zA-Z0-9_-]{1,64}$/.test(config.namespace))
    return false;
  try {
    const url = new URL(config.url);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === "/"
    );
  } catch {
    return false;
  }
}

// One atomic script reserves minute/day budget AND a bounded concurrency lease.
// Redis TIME owns bucket boundaries; app instances do not need synchronized clocks.
// All keys use one cluster hash slot. Failed provider attempts keep their budget.
export const RESERVE_SCRIPT = `
local clock = redis.call('TIME')
local now = tonumber(clock[1]) * 1000 + math.floor(tonumber(clock[2]) / 1000)
local minute = tostring(math.floor(now / 60000))
local day = tostring(math.floor(now / 86400000))
if redis.call('EXISTS', KEYS[4]) == 1 then return 'revoked' end
redis.call('ZREMRANGEBYSCORE', KEYS[3], '-inf', now)
if redis.call('ZCARD', KEYS[3]) >= tonumber(ARGV[3]) then return 'busy' end
local mc = 0
local dc = 0
if redis.call('HGET', KEYS[1], 'bucket') == minute then
  mc = tonumber(redis.call('HGET', KEYS[1], 'count') or '0')
end
if redis.call('HGET', KEYS[2], 'bucket') == day then
  dc = tonumber(redis.call('HGET', KEYS[2], 'count') or '0')
end
if mc >= tonumber(ARGV[1]) or dc >= tonumber(ARGV[2]) then return 'quota' end
redis.call('HSET', KEYS[1], 'bucket', minute, 'count', mc + 1)
redis.call('HSET', KEYS[2], 'bucket', day, 'count', dc + 1)
redis.call('EXPIRE', KEYS[1], 120)
redis.call('EXPIRE', KEYS[2], 172800)
redis.call('ZADD', KEYS[3], now + tonumber(ARGV[5]), ARGV[4])
redis.call('PEXPIRE', KEYS[3], tonumber(ARGV[5]) + 1000)
return 'ok'
`;
export const LOGIN_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], 60) end
return count
`;

export class RedisLiveStore implements LiveStore {
  readonly kind = "shared" as const;
  private prefix: string;
  constructor(
    private config: RedisConfig,
    private fetcher: typeof fetch = fetch,
  ) {
    if (!validRedisConfig(config))
      throw new Error("Shared access store configuration is invalid.");
    this.prefix = `${config.namespace}:{live}:`;
  }
  private async command(command: (string | number)[]): Promise<unknown> {
    try {
      const response = await this.fetcher(this.config.url, {
        method: "POST",
        redirect: "error",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.token}`,
        },
        body: JSON.stringify(command),
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error();
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error();
      const decoder = new TextDecoder();
      let text = "",
        size = 0;
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 8192) {
          await reader.cancel();
          throw new Error();
        }
        text += decoder.decode(chunk.value, { stream: true });
      }
      const body = JSON.parse(text + decoder.decode());
      if (!body || body.error || !("result" in body)) throw new Error();
      return body.result;
    } catch {
      // Never expose Redis URL/token, response errors, or request internals.
      throw new Error(
        "Shared live access store is unavailable. Evidence replay remains available.",
      );
    }
  }
  async health() {
    // Probe the required Lua + write capability; a read-only token/PING alone
    // must not advertise a ready public access store. No budget is consumed.
    if (
      (await this.command([
        "EVAL",
        "redis.call('SET', KEYS[1], '1', 'EX', 60); return redis.call('GET', KEYS[1])",
        1,
        this.prefix + "health",
      ])) !== "1"
    )
      throw new Error("Shared access store health check failed.");
  }
  async loginAllowed() {
    const count = await this.command([
      "EVAL",
      LOGIN_SCRIPT,
      1,
      this.prefix + "logins",
    ]);
    if (!Number.isSafeInteger(count) || Number(count) < 1)
      throw new Error("Invalid shared access state.");
    return Number(count) <= 5;
  }
  async revoke(id: string) {
    if (
      (await this.command([
        "SET",
        this.prefix + "revoked:" + id,
        "1",
        "EX",
        1800,
      ])) !== "OK"
    )
      throw new Error("Session revocation could not be persisted.");
  }
  async isRevoked(id: string) {
    const result = await this.command([
      "EXISTS",
      this.prefix + "revoked:" + id,
    ]);
    if (result !== 0 && result !== 1)
      throw new Error("Invalid shared access state.");
    return result === 1;
  }
  async acquire(
    config: LiveConfig,
    _now?: number,
    id?: string,
  ): Promise<QuotaSlot> {
    if (!id || !/^[a-f0-9]{32}$/.test(id))
      return {
        ok: false,
        status: 401,
        reason: "Unlock demo live access before requesting a provider call.",
      };
    const lease = randomBytes(16).toString("hex");
    const result = await this.command([
      "EVAL",
      RESERVE_SCRIPT,
      4,
      this.prefix + "minute",
      this.prefix + "day",
      this.prefix + "active",
      this.prefix + "revoked:" + id,
      config.minuteLimit,
      config.dailyLimit,
      config.concurrencyLimit,
      lease,
      60000,
    ]);
    if (result === "revoked")
      return {
        ok: false,
        status: 401,
        reason: "Demo session expired or was locked. Unlock live access again.",
      };
    if (result === "busy")
      return {
        ok: false,
        status: 429,
        reason:
          "A live demo request is already running. Wait for it to finish; replay remains available.",
      };
    if (result === "quota")
      return {
        ok: false,
        status: 429,
        reason:
          "Live demo usage limit reached. Evidence replay remains available.",
      };
    if (result !== "ok") throw new Error("Invalid shared quota state.");
    let released = false;
    return {
      ok: true,
      release: async () => {
        if (released) return;
        const result = await this.command([
          "ZREM",
          this.prefix + "active",
          lease,
        ]);
        if (result !== 0 && result !== 1)
          throw new Error("Invalid shared lease state.");
        released = true;
      },
    };
  }
}
