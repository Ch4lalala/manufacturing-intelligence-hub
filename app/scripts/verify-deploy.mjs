import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import net from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(app, ".next/standalone");
const artifacts = fs.mkdtempSync(
  path.join(os.tmpdir(), "caliber-deploy-only-"),
);
const assertions = [];
const check = (name, condition) => {
  assertions.push({ name, pass: !!condition });
  if (!condition) throw Error("Deployment assertion failed: " + name);
};
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let child;
try {
  fs.cpSync(source, artifacts, { recursive: true });
  fs.cpSync(
    path.join(app, ".next/static"),
    path.join(artifacts, ".next/static"),
    { recursive: true },
  );
  const envFiles = fs
    .readdirSync(artifacts)
    .filter((name) => /^\.env(?:\.|$)/.test(name));
  check(
    "Standalone root contains no private environment files",
    envFiles.length === 0,
  );
  check(
    "No parent sources or processed extraction directory",
    !fs.existsSync(path.join(path.dirname(artifacts), "sources")) &&
      !fs.existsSync(path.join(path.dirname(artifacts), "processed")),
  );
  const port = await new Promise((resolve) => {
    const listener = net.createServer();
    listener.listen(0, "127.0.0.1", () => {
      const port = listener.address().port;
      listener.close(() => resolve(port));
    });
  });
  const env = {
    ...process.env,
    NODE_ENV: "production",
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    AI_API_KEY: "",
    AI_MODEL: "",
    AI_LIVE_MODE: "public",
    DEMO_PASSCODE: "",
    DEMO_SESSION_SECRET: "",
  };
  child = spawn(process.execPath, ["server.js"], {
    cwd: artifacts,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  // No secrets are configured in this isolated child; do not persist its logs.
  child.stdout.resume();
  child.stderr.resume();
  const base = "http://127.0.0.1:" + port;
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw Error("Isolated server exited");
    try {
      if ((await fetch(base + "/api/status")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await pause(100);
  }
  check("Clean standalone server started", ready);
  const get = async (route) => fetch(base + route);
  const raw = JSON.parse(
    fs.readFileSync(path.join(artifacts, "data/normalized.json"), "utf8"),
  );
  const ko = raw.assets.find((a) => a.tag === "KO-3201");
  for (const asset of raw.assets) {
    const scoped = await (
      await get("/api/case?" + new URLSearchParams({ asset: asset.tag }))
    ).json();
    check(
      asset.tag + " observation coverage in clean runtime",
      scoped.conditions.length === 26 &&
        scoped.production.length === 720 &&
        scoped.report.slides.length === 11,
    );
    const first = asset.conditions[0];
    const weekly = await get(
      "/api/source?" + new URLSearchParams({ ...first.source }),
    );
    check(
      asset.tag + " exact weekly source excerpt",
      weekly.ok &&
        (await weekly.json()).excerpt.includes(String(first.measurements[0])),
    );
    const finding = asset.report.slides
      .flatMap((s) => s.blocks.map((b) => ({ ...b, slide: s.slide })))
      .find((b) => b.text?.startsWith("ROOT CAUSE:"));
    const report = await get(
      "/api/source?" +
        new URLSearchParams({
          file: asset.report.file,
          slide: String(finding.slide),
          shape: String(finding.shape_id),
        }),
    );
    check(
      asset.tag + " exact historical finding locator",
      report.ok &&
        (await report.json()).excerpt ===
          `SLIDE ${finding.slide}\nShape ${finding.shape_id}: ${finding.text}`,
    );
  }
  for (const original of raw.inventory) {
    const response = await get(
      "/api/source?" +
        new URLSearchParams({ file: original.path, download: "1" }),
    );
    const actual = crypto
      .createHash("sha256")
      .update(new Uint8Array(await response.arrayBuffer()))
      .digest("hex");
    check(
      "Verified original download: " + original.path,
      response.ok && actual === original.sha256,
    );
  }
  const bundle = await (await get("/api/case?asset=KO-3201")).json();
  check(
    "Normalized data and all register-source identities available",
    bundle.production.length === 720 &&
      bundle.conditions.length === 26 &&
      raw.incidents.length === 380,
  );
  const excerpt = await get(
    "/api/source?" +
      new URLSearchParams({
        file: ko.info_source.file,
        sheet: "Condition History",
        cell: "A21:H22",
      }),
  );
  check(
    "Exact XLSX locator works without parent extraction",
    excerpt.ok && (await excerpt.json()).excerpt.includes("1372.791"),
  );
  const root = ko.report.slides
    .find((s) => s.slide === 7)
    .blocks.find((b) => b.text?.startsWith("ROOT CAUSE:"));
  const deck = await get(
    "/api/source?" +
      new URLSearchParams({
        file: ko.report.file,
        slide: "7",
        shape: String(root.shape_id),
      }),
  );
  check(
    "PPTX source excerpt resolves",
    deck.ok && (await deck.json()).excerpt.includes("ROOT CAUSE"),
  );
  const pdf = raw.official[0];
  const page = await get(
    "/api/source?" + new URLSearchParams({ file: pdf.file, page: "9" }),
  );
  check(
    "PDF page excerpt resolves",
    page.ok && (await page.json()).excerpt.includes("PAGE 9"),
  );
  const download = await get(
    "/api/source?" +
      new URLSearchParams({ file: ko.info_source.file, download: "1" }),
  );
  const sha = crypto
    .createHash("sha256")
    .update(new Uint8Array(await download.arrayBuffer()))
    .digest("hex");
  check(
    "Original download matches expected SHA-256",
    download.ok &&
      sha === raw.inventory.find((s) => s.path === ko.info_source.file).sha256,
  );
  const productionFile = ko.production[0].source.file;
  const pi = await get(
    "/api/source?" +
      new URLSearchParams({
        file: productionFile,
        sheet: "PI Tag",
        cell: "D4",
      }),
  );
  check(
    "Production metadata locator resolves original unit",
    pi.ok && (await pi.json()).excerpt.includes("MM/S"),
  );
  check(
    "Unknown path returns controlled 404",
    (await get("/api/source?file=../../.env.local")).status === 404,
  );
  check(
    "Unknown worksheet never substitutes another source",
    (
      await get(
        "/api/source?" +
          new URLSearchParams({ file: ko.info_source.file, sheet: "wrong" }),
      )
    ).status === 404,
  );
  fs.renameSync(
    path.join(artifacts, "runtime", ko.info_source.file),
    path.join(artifacts, "runtime", ko.info_source.file + ".test-missing"),
  );
  const missing = await get(
    "/api/source?" +
      new URLSearchParams({ file: ko.info_source.file, download: "1" }),
  );
  check(
    "Missing original returns controlled error",
    missing.status === 404 &&
      Object.keys(await missing.json()).join(",") === "error",
  );
  fs.renameSync(
    path.join(artifacts, "runtime/workbook-excerpts.json"),
    path.join(artifacts, "runtime/workbook-excerpts.json.test-missing"),
  );
  const unavailable = await get(
    "/api/source?" +
      new URLSearchParams({
        file: ko.info_source.file,
        sheet: "Condition History",
        cell: "A21:H22",
      }),
  );
  check(
    "Missing runtime excerpts return controlled 503",
    unavailable.status === 503 &&
      !(await unavailable.text()).includes("ENOENT"),
  );
  const session = await (await get("/api/demo-session")).json();
  check(
    "Public live session disabled",
    session.enabled === false && session.authenticated === false,
  );
  const blocked = await fetch(base + "/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      asset: ko.tag,
      mode: "prospective",
      asOf: "2026-04-22 23:59:59",
      live: true,
    }),
  });
  const fallback = await blocked.json();
  check(
    "Public live fails closed and offers deterministic replay",
    blocked.status === 403 &&
      fallback.execution === "replay" &&
      fallback.liveState === "blocked",
  );
  const html = await get("/");
  check(
    "Application page available",
    html.ok && (await html.text()).includes("CALIBER"),
  );
  fs.mkdirSync(path.join(app, "verification"), { recursive: true });
  fs.writeFileSync(
    path.join(app, "verification/deploy-runtime.json"),
    JSON.stringify(
      {
        scope: "Local production artifact-only runtime, not deployed Vercel",
        assertions,
        passed: assertions.length,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      artifactOnlyRuntime: "PASS",
      checks: assertions.length,
      providerCalls: 0,
    }),
  );
} finally {
  if (child && child.exitCode === null) {
    child.kill("SIGTERM");
    await new Promise((resolve) => child.once("exit", resolve));
  }
  fs.rmSync(artifacts, { recursive: true, force: true });
}
