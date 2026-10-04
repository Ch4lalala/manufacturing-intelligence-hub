// Isolated production build + real local Redis + TLS REST/provider fixtures.
// No user env file or real API token is copied or used. Nothing is deployed.
import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { spawn, type ChildProcess } from "node:child_process";
import { startRedisFixture, redisAvailable } from "../tests/redis-fixture";
import { raw, incidents } from "../src/lib/data";
import { makeBundle } from "../src/lib/evidence";
import { fakeCompletion } from "../tests/fixtures";
async function main() {
  if (!redisAvailable)
    throw new Error(
      "Install Redis for isolated testing or set CALIBER_TEST_REDIS_SERVER / CALIBER_TEST_REDIS_CLI. No hosted verification was run.",
    );
  const fixture = await startRedisFixture(true);
  const runtime = fs.mkdtempSync("/tmp/caliber-hosted-runtime-");
  let server: ChildProcess | undefined;
  let providerCalls = 0;
  fixture.setProvider(async (input) => {
    providerCalls++;
    const body = input as { messages: { content: string }[] };
    const context = JSON.parse(body.messages[1].content);
    const asset = raw.assets.find((a) => a.tag === context.caseId)!;
    return fakeCompletion(
      makeBundle(
        asset,
        incidents,
        raw.version,
        context.mode,
        context.asOf,
        context.observationCutoff,
      ),
    );
  });
  fixture.setControl(async (input) => {
    const { action, id } = input as { action: string; id?: string };
    if (action === "reset") {
      await fixture.command(["FLUSHDB"]);
      providerCalls = 0;
      fixture.setFailure("none");
    }
    if (action === "down") fixture.setFailure("unavailable");
    if (action === "up") fixture.setFailure("none");
    if (action === "revoke" && id && /^[a-f0-9]{32}$/.test(id))
      await fixture.command([
        "SET",
        "browser-hosted:{live}:revoked:" + id,
        "1",
        "EX",
        1800,
      ]);
    return Response.json({ providerCalls });
  });
  try {
    fs.cpSync(".next/standalone", runtime, {
      recursive: true,
      filter: (file) => !/^\.env(?:\.|$)/.test(path.basename(file)),
    });
    fs.cpSync(".next/static", path.join(runtime, ".next/static"), {
      recursive: true,
    });
    const port = await new Promise<number>((r) => {
      const listener = net.createServer();
      listener.listen(0, "127.0.0.1", () => {
        const port = (listener.address() as net.AddressInfo).port;
        listener.close(() => r(port));
      });
    });
    const base = `http://localhost:${port}`,
      origin = `https://localhost:${port}`;
    const env = {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "localhost",
      VERCEL: "1",
      AI_LIVE_MODE: "public",
      AI_ALLOWED_ORIGINS: origin,
      AI_QUOTA_NAMESPACE: "browser-hosted",
      UPSTASH_REDIS_REST_URL: fixture.base,
      UPSTASH_REDIS_REST_TOKEN: "redis-fixture-only-token",
      DEMO_PASSCODE: "browser-fixture-passcode",
      DEMO_SESSION_SECRET:
        "browser-fixture-signing-secret-at-least-thirty-two-characters",
      AI_MAX_CALLS_PER_MINUTE: "10",
      AI_MAX_CALLS_PER_DAY: "2",
      AI_MAX_CONCURRENT: "1",
      AI_API_KEY: "provider-fixture-only-key",
      AI_MODEL: "provider-fixture-model",
      AI_BASE_URL: fixture.base + "/v1",
      NODE_EXTRA_CA_CERTS: fixture.certFile!,
    };
    server = spawn(process.execPath, ["server.js"], {
      cwd: runtime,
      env,
      stdio: "ignore",
    });
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try {
        const response = await fetch(base + "/api/demo-session", {
          headers: { "x-forwarded-proto": "https", origin },
        });
        if (response.ok) {
          ready = (await response.json()).enabled === true;
          if (ready) break;
        }
      } catch {
        /* startup */
      }
      if (server.exitCode !== null)
        throw new Error("Isolated production runtime failed to start.");
      await new Promise((r) => setTimeout(r, 100));
    }
    if (!ready)
      throw new Error(
        "Hosted production guard did not become ready against the isolated TLS Redis fixture.",
      );
    const browser = spawn(
      process.execPath,
      [
        "node_modules/@playwright/test/cli.js",
        "test",
        "--config",
        "playwright.hosted.config.ts",
        ...process.argv.slice(2),
      ],
      {
        env: {
          ...env,
          CALIBER_TEST_BASE_URL: base,
          CALIBER_TEST_HTTPS_ORIGIN: origin,
          CALIBER_TEST_GATEWAY: fixture.base,
        },
        stdio: "inherit",
      },
    );
    const code = await new Promise<number>((r) =>
      browser.once("exit", (code) => r(code ?? 1)),
    );
    if (code) process.exitCode = code;
  } finally {
    if (server && server.exitCode === null) {
      const ended = new Promise<void>((r) => server!.once("exit", () => r()));
      server.kill("SIGTERM");
      await ended;
    }
    await fixture.stop();
    fs.rmSync(runtime, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : "Hosted browser verification failed.",
  );
  process.exitCode = 1;
});
