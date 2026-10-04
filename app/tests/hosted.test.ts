import test from "node:test";
import assert from "node:assert/strict";
import { RedisLiveStore, validRedisConfig } from "../src/lib/shared-live-store";
import {
  liveAvailability,
  checkedLiveAvailability,
  authorizeLive,
  issueSession,
  sessionId,
  allowedLiveOrigin,
  DemoLimiter,
  type LiveConfig,
} from "../src/lib/live-access";
import { guardedAnalysis } from "../src/lib/analysis-service";
import { makeBundle } from "../src/lib/evidence";
import { raw, incidents } from "../src/lib/data";
import { fakeCompletion } from "./fixtures";
import { GET, POST, DELETE } from "../src/app/api/demo-session/route";
import { GET as statusGET } from "../src/app/api/status/route";
import { redisAvailable, startRedisFixture } from "./redis-fixture";

test(
  "Hosted shared guard integration against an isolated real Redis",
  { skip: !redisAvailable },
  async (t) => {
    const fixture = await startRedisFixture();
    const originalFetch = globalThis.fetch;
    const redis = {
      url: "https://redis.fixture.test",
      token: "redis-fixture-only-token",
      namespace: "hosted-tests",
    };
    const config: LiveConfig = {
      mode: "public",
      platformPublic: true,
      allowedOrigins: ["https://caliber.fixture.test"],
      redis,
      passcode: "fixture-only-passcode",
      sessionSecret:
        "fixture-only-session-secret-at-least-thirty-two-characters",
      minuteLimit: 2,
      dailyLimit: 3,
      concurrencyLimit: 1,
    };
    const fetcher: typeof fetch = (input, init) => {
      assert.equal(String(input), redis.url);
      return originalFetch(fixture.base, init);
    };
    const store = () => new RedisLiveStore(redis, fetcher);
    const request = (
      token = issueSession(config),
      origin: string | null = config.allowedOrigins![0],
      url = config.allowedOrigins![0],
    ) =>
      new Request(url + "/api/analyze", {
        method: "POST",
        headers: {
          cookie: "caliber-live-demo=" + token,
          ...(origin ? { origin } : {}),
        },
      });
    const bundle = makeBundle(
      raw.assets.find((a) => a.tag === "KO-3201")!,
      incidents,
      raw.version,
      "prospective",
      "2026-04-22 23:59:59",
    );
    let calls = 0;
    const provider: typeof fetch = async () => {
      calls++;
      return fakeCompletion(bundle);
    };
    const keys = `${redis.namespace}:{live}:`;
    try {
      await t.test(
        "Explicit opt-in, HTTPS origin, signed session, shared-only store and absent/forged Origin guards",
        async () => {
          assert.equal(liveAvailability(config).enabled, true);
          assert.equal(
            validRedisConfig({
              ...redis,
              url: "https://token:secret@redis.fixture.test",
            }),
            false,
          );
          assert.equal(
            validRedisConfig({ ...redis, url: "http://redis.fixture.test" }),
            false,
          );
          assert.equal(
            validRedisConfig({ ...redis, url: redis.url + "/?token=x" }),
            false,
          );
          assert.equal(
            (await checkedLiveAvailability(config, store())).enabled,
            true,
          );
          for (const r of [
            request("", null),
            request(issueSession(config), "https://attacker.test"),
            request(issueSession(config), null),
            request(
              issueSession(config),
              config.allowedOrigins![0],
              "https://unlisted.test",
            ),
          ]) {
            assert.equal((await authorizeLive(r, config, store())).ok, false);
          }
          const spoof = request();
          spoof.headers.set("host", "unlisted.test");
          assert.equal(allowedLiveOrigin(spoof, config), false);
          const forwarded = request(
            issueSession(config),
            config.allowedOrigins![0],
            "https://unlisted.test",
          );
          forwarded.headers.set("x-forwarded-host", "caliber.fixture.test");
          assert.equal(allowedLiveOrigin(forwarded, config), false);
          assert.equal(
            (await authorizeLive(request(), config, new DemoLimiter())).ok,
            false,
          );
          const token = issueSession(config);
          assert.equal(
            (await authorizeLive(request(token + "x"), config, store())).ok,
            false,
          );
          assert.equal(
            (await authorizeLive(request(), config, store())).ok,
            true,
          );
          assert.equal(calls, 0);
        },
      );
      await t.test(
        "Atomic concurrency and daily quota hold across independent store instances; release cannot refund",
        async () => {
          await fixture.command(["FLUSHDB"]);
          const token = issueSession(config),
            id = sessionId(token, config)!;
          const slots = await Promise.all(
            Array.from({ length: 12 }, () =>
              store().acquire(config, undefined, id),
            ),
          );
          assert.equal(slots.filter((s) => s.ok).length, 1);
          for (const slot of slots)
            if (slot.ok) {
              await slot.release();
              await slot.release();
            }
          const once = await store().acquire(
            { ...config, minuteLimit: 10, dailyLimit: 2 },
            undefined,
            id,
          );
          assert.equal(once.ok, true);
          if (once.ok) await once.release();
          const denied = await store().acquire(
            { ...config, minuteLimit: 10, dailyLimit: 2 },
            undefined,
            id,
          );
          assert.equal(denied.ok, false);
          assert.equal(
            await fixture.command(["HGET", keys + "day", "count"]),
            "2",
          );
          assert.equal(
            await fixture.command(["HGET", keys + "minute", "count"]),
            "2",
          );
        },
      );
      await t.test(
        "UTC bucket rollover and expired concurrency leases recover; current daily count survives minute rollover",
        async () => {
          await fixture.command(["FLUSHDB"]);
          const id = sessionId(issueSession(config), config)!;
          const slot = await store().acquire(config, undefined, id);
          assert.equal(slot.ok, true);
          await fixture.command([
            "ZADD",
            keys + "active",
            0,
            "expired-instance-lease",
          ]);
          // Simulate an instance dying: set its existing lease deadline in the past.
          const leases = (await fixture.command([
            "ZRANGE",
            keys + "active",
            0,
            -1,
          ])) as string[];
          for (const lease of leases)
            await fixture.command(["ZADD", keys + "active", 0, lease]);
          await fixture.command([
            "HSET",
            keys + "minute",
            "bucket",
            "old-minute",
            "count",
            10,
          ]);
          const next = await store().acquire(config, undefined, id);
          assert.equal(next.ok, true);
          assert.equal(
            await fixture.command(["HGET", keys + "minute", "count"]),
            "1",
          );
          assert.equal(
            await fixture.command(["HGET", keys + "day", "count"]),
            "2",
          );
          if (next.ok) await next.release();
          await fixture.command([
            "HSET",
            keys + "day",
            "bucket",
            "old-day",
            "count",
            100,
          ]);
          const tomorrow = await store().acquire(config, undefined, id);
          assert.equal(tomorrow.ok, true);
          assert.equal(
            await fixture.command(["HGET", keys + "day", "count"]),
            "1",
          );
          if (tomorrow.ok) await tomorrow.release();
        },
      );
      await t.test(
        "Login attempts and revocation survive instance replacement; reservation rechecks logout",
        async () => {
          await fixture.command(["FLUSHDB"]);
          const attempts = await Promise.all(
            Array.from({ length: 12 }, () => store().loginAllowed()),
          );
          assert.equal(attempts.filter(Boolean).length, 5);
          const token = issueSession(config),
            id = sessionId(token, config)!;
          assert.equal(
            (await authorizeLive(request(token), config, store())).ok,
            true,
          );
          await store().revoke(id);
          assert.equal(await store().isRevoked(id), true);
          assert.equal(
            (await authorizeLive(request(token), config, store())).ok,
            false,
          );
          const slot = await store().acquire(config, undefined, id);
          assert.equal(slot.ok, false);
          if (!slot.ok) assert.equal(slot.status, 401);
        },
      );
      await t.test(
        "Only validated live compositions consume provider calls; normal-only and exhausted quota stay replay",
        async () => {
          await fixture.command(["FLUSHDB"]);
          calls = 0;
          const result = await guardedAnalysis(
            request(),
            bundle,
            true,
            { ...config, dailyLimit: 1 },
            { key: "fake-key", model: "fake-model" },
            provider,
            store(),
          );
          assert.equal(result.analysis.liveState, "validated");
          assert.equal(calls, 1);
          assert.equal(
            (
              await guardedAnalysis(
                request(),
                bundle,
                true,
                { ...config, dailyLimit: 1 },
                { key: "fake-key", model: "fake-model" },
                provider,
                store(),
              )
            ).status,
            429,
          );
          assert.equal(calls, 1);
          const normal = makeBundle(
            raw.assets.find((a) => a.tag === "KO-3201")!,
            incidents,
            raw.version,
            "prospective",
            "2025-12-10 23:59:59",
          );
          const replay = await guardedAnalysis(
            request(),
            normal,
            true,
            config,
            { key: "fake-key", model: "fake-model" },
            provider,
            store(),
          );
          assert.equal(replay.analysis.execution, "replay");
          assert.equal(calls, 1);
          const missing = await guardedAnalysis(
            request(),
            bundle,
            true,
            config,
            {},
            provider,
            store(),
          );
          assert.equal(missing.analysis.liveState, "blocked");
          assert.equal(calls, 1);
        },
      );
      await t.test(
        "Store outages, invalid replies, and bounded transport timeout fail closed without provider calls or secrets",
        async () => {
          calls = 0;
          for (const failure of ["unavailable", "invalid", "hang"] as const) {
            fixture.setFailure(failure);
            const result = await guardedAnalysis(
              request(),
              bundle,
              true,
              config,
              { key: "fake-key", model: "fake-model" },
              provider,
              store(),
            );
            assert.equal(result.status, 503);
            assert.equal(result.analysis.liveState, "blocked");
            assert.equal(calls, 0);
            assert.doesNotMatch(
              JSON.stringify(result),
              /redis-fixture-only-token|Test-only store failure|redis\.fixture\.test/,
            );
          }
          fixture.setFailure("none");
        },
      );
      await t.test(
        "Real hosted session/status handlers issue Secure cookies, persist logout, and reject cross-origin/config errors",
        async () => {
          await fixture.command(["FLUSHDB"]);
          const env = {
            AI_LIVE_MODE: "public",
            VERCEL: "1",
            AI_ALLOWED_ORIGINS: config.allowedOrigins![0],
            UPSTASH_REDIS_REST_URL: redis.url,
            UPSTASH_REDIS_REST_TOKEN: redis.token,
            AI_QUOTA_NAMESPACE: redis.namespace,
            DEMO_PASSCODE: config.passcode!,
            DEMO_SESSION_SECRET: config.sessionSecret!,
            AI_MAX_CALLS_PER_MINUTE: "2",
            AI_MAX_CALLS_PER_DAY: "3",
            AI_MAX_CONCURRENT: "1",
            AI_API_KEY: "fake-key",
            AI_MODEL: "fake-model",
          };
          const previous = Object.fromEntries(
            Object.keys(env).map((key) => [key, process.env[key]]),
          );
          const req = (method = "GET", cookie = "", passcode = "") =>
            new Request(config.allowedOrigins![0] + "/api/demo-session", {
              method,
              headers: { origin: config.allowedOrigins![0], cookie },
              body:
                method === "POST" ? JSON.stringify({ passcode }) : undefined,
            });
          try {
            Object.assign(process.env, env);
            globalThis.fetch = fetcher;
            assert.equal((await (await GET(req())).json()).enabled, true);
            assert.equal((await POST(req("POST", "", "wrong"))).status, 401);
            const unlocked = await POST(req("POST", "", config.passcode));
            assert.equal(unlocked.status, 200);
            const cookie = unlocked.headers.get("set-cookie")!;
            assert.match(cookie, /HttpOnly; SameSite=Strict/);
            assert.match(cookie, /; Secure$/);
            assert.equal(
              (await (await GET(req("GET", cookie))).json()).authenticated,
              true,
            );
            const status = await (await statusGET()).json();
            assert.equal(status.liveAccess.enabled, true);
            assert.equal(status.liveTested, false);
            assert.doesNotMatch(
              JSON.stringify(status),
              /fake-key|fake-model|redis-fixture-only-token|fixture-only-passcode/,
            );
            assert.equal((await DELETE(req("DELETE", cookie))).status, 200);
            assert.equal(
              (await (await GET(req("GET", cookie))).json()).authenticated,
              false,
            );
            const cross = req("POST", "", config.passcode);
            cross.headers.set("origin", "https://attacker.test");
            assert.equal((await POST(cross)).status, 403);
            fixture.setFailure("unavailable");
            assert.equal((await GET(req())).status, 503);
            assert.equal(
              (await POST(req("POST", "", config.passcode))).status,
              503,
            );
            assert.equal(
              (await (await statusGET()).json()).liveAccess.enabled,
              false,
            );
          } finally {
            globalThis.fetch = originalFetch;
            fixture.setFailure("none");
            for (const [key, value] of Object.entries(previous)) {
              if (value === undefined) delete process.env[key];
              else process.env[key] = value;
            }
          }
        },
      );
    } finally {
      globalThis.fetch = originalFetch;
      await fixture.stop();
    }
  },
);
