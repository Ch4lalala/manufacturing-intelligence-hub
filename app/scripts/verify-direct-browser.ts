import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import net from "node:net";
import { spawn, type ChildProcess } from "node:child_process";
import { raw, incidents } from "../src/lib/data";
import { makeBundle } from "../src/lib/evidence";
import { fakeCompletion } from "../tests/fixtures";
async function main() {
  const normal = process.argv.includes("--normal");
  let calls = 0;
  let mode = "valid";
  const provider = http.createServer(async (req, res) => {
    if (req.url === "/calls") {
      res.end(JSON.stringify({ calls }));
      return;
    }
    let body = "";
    for await (const chunk of req) body += chunk;
    if (req.url === "/mode") {
      mode = JSON.parse(body).mode;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ mode }));
      return;
    }
    const context = JSON.parse(JSON.parse(body).messages[1].content);
    const asset = raw.assets.find((a) => a.tag === context.caseId)!;
    calls++;
    const reply = fakeCompletion(
      makeBundle(
        asset,
        incidents,
        raw.version,
        context.mode,
        context.asOf,
        context.observationCutoff,
      ),
    );
    res.setHeader("Content-Type", "application/json");
    const envelope = await reply.json();
    if (["contract", "strength", "checks"].includes(mode)) {
      const payload = structuredClone(context.schema);
      payload.summary =
        "The observed pattern may support an engineering condition review. The cause remains unconfirmed.";
      if (mode === "strength")
        payload.hypotheses[0].strength = "plausible for source breaches";
      if (mode === "checks")
        payload.hypotheses[0].missingChecks = ["Request inspection review."];
      envelope.choices[0].message.content = JSON.stringify(payload);
    }
    if (mode === "fenced")
      envelope.choices[0].message.content =
        "\n```json\n" + envelope.choices[0].message.content + "\n```\n\n";
    if (mode === "truncated") {
      envelope.choices[0].finish_reason = "length";
      envelope.choices[0].message.content = "private-fixture-partial-output";
    }
    if (mode === "citation") {
      const payload = JSON.parse(envelope.choices[0].message.content);
      payload.hypotheses[0].evidenceIds = ["private-fixture-ineligible-id"];
      envelope.choices[0].message.content = JSON.stringify(payload);
    }
    res.end(JSON.stringify(envelope));
  });
  await new Promise<void>((r) => provider.listen(0, "127.0.0.1", r));
  const providerBase = `http://127.0.0.1:${(provider.address() as net.AddressInfo).port}`;
  const runtime = fs.mkdtempSync(
    path.join(os.tmpdir(), "caliber-direct-runtime-"),
  );
  let server: ChildProcess | undefined;
  try {
    fs.cpSync(".next/standalone", runtime, {
      recursive: true,
      filter: (file) => !/^\.env(?:\.|$)/.test(path.basename(file)),
    });
    fs.cpSync(".next/static", path.join(runtime, ".next/static"), {
      recursive: true,
    });
    const port = await new Promise<number>((r) => {
      const socket = net.createServer();
      socket.listen(0, "127.0.0.1", () => {
        const port = (socket.address() as net.AddressInfo).port;
        socket.close(() => r(port));
      });
    });
    const base = `http://localhost:${port}`,
      origin = `https://localhost:${port}`;
    server = spawn(process.execPath, ["server.js"], {
      cwd: runtime,
      stdio: "ignore",
      env: {
        ...process.env,
        PORT: String(port),
        HOSTNAME: "localhost",
        VERCEL: normal ? "" : "1",
        AI_LIVE_MODE: normal ? "disabled" : "direct",
        AI_API_KEY: normal ? "" : "direct-fixture-key",
        AI_MODEL: normal ? "" : "direct-fixture-model",
        AI_BASE_URL: providerBase,
        DEMO_PASSCODE: "",
        DEMO_SESSION_SECRET: "",
        UPSTASH_REDIS_REST_URL: "",
        UPSTASH_REDIS_REST_TOKEN: "",
        AI_MAX_CALLS_PER_MINUTE: "",
        AI_MAX_CALLS_PER_DAY: "",
        AI_MAX_CONCURRENT: "",
      },
    });
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try {
        if ((await fetch(base + "/api/status")).ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    if (!ready)
      throw Error("Isolated direct production server failed to start.");
    const child = spawn(
      process.execPath,
      [
        "node_modules/@playwright/test/cli.js",
        "test",
        normal
          ? "--config=playwright.config.ts"
          : "--config=playwright.direct.config.ts",
      ],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          CALIBER_TEST_BASE_URL: base,
          CALIBER_TEST_HTTPS_ORIGIN: origin,
          CALIBER_TEST_PROVIDER: providerBase,
        },
      },
    );
    process.exitCode = await new Promise<number>((r) =>
      child.once("exit", (code) => r(code ?? 1)),
    );
  } finally {
    if (server && server.exitCode === null) {
      const ended = new Promise((r) => server!.once("exit", r));
      server.kill("SIGTERM");
      await ended;
    }
    await new Promise<void>((r) => provider.close(() => r()));
    fs.rmSync(runtime, { recursive: true, force: true });
  }
}
main().catch(() => {
  process.stderr.write(
    "Direct production verification failed. No real provider was contacted.\n",
  );
  process.exitCode = 1;
});
