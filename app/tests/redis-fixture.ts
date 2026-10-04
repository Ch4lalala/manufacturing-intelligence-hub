import fs from "node:fs";
import path from "node:path";
import {
  spawn,
  spawnSync,
  execFile,
  type ChildProcess,
} from "node:child_process";
import { promisify } from "node:util";
import http from "node:http";
import https from "node:https";
import type { AddressInfo } from "node:net";

const exec = promisify(execFile);
export const redisServer =
  process.env.CALIBER_TEST_REDIS_SERVER ?? "redis-server";
export const redisCli = process.env.CALIBER_TEST_REDIS_CLI ?? "redis-cli";
export const redisAvailable =
  spawnSync(redisServer, ["--version"], { stdio: "ignore" }).status === 0;
export async function startRedisFixture(tls = false) {
  const root = fs.mkdtempSync("/tmp/caliber-redis-");
  const socket = path.join(root, "redis.sock");
  const child: ChildProcess = spawn(
    redisServer,
    [
      "--port",
      "0",
      "--unixsocket",
      socket,
      "--unixsocketperm",
      "700",
      "--save",
      "",
      "--appendonly",
      "no",
      "--dir",
      root,
    ],
    { stdio: "ignore" },
  );
  const command = async (args: (string | number)[]) => {
    const { stdout, stderr } = await exec(
      redisCli,
      ["-s", socket, "--json", ...args.map(String)],
      { timeout: 5000 },
    );
    if (stderr.trim()) throw new Error("Local Redis command failed.");
    const result: unknown = JSON.parse(stdout);
    if (typeof result === "string" && result.startsWith("error:"))
      throw new Error("Local Redis command failed.");
    return result;
  };
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      ready = (await command(["PING"])) === "PONG";
    } catch {
      /* startup */
    }
    if (ready) break;
    await new Promise((r) => setTimeout(r, 20));
  }
  if (!ready) {
    child.kill();
    fs.rmSync(root, { recursive: true, force: true });
    throw new Error("Isolated Redis failed to start.");
  }
  let failure: "none" | "unavailable" | "hang" | "invalid" = "none";
  let provider: ((body: unknown) => Promise<Response>) | undefined;
  let control: ((body: unknown) => Promise<Response>) | undefined;
  const handler: http.RequestListener = async (req, res) => {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 120000) {
        res.writeHead(413).end();
        return;
      }
    }
    const endpoint =
      req.url === "/v1/chat/completions"
        ? provider
        : req.url === "/test-control"
          ? control
          : undefined;
    if (endpoint) {
      const response = await endpoint(JSON.parse(body));
      res.writeHead(response.status, { "Content-Type": "application/json" });
      res.end(await response.text());
      return;
    }
    if (failure === "hang") return;
    if (
      req.headers.authorization !== "Bearer redis-fixture-only-token" ||
      failure === "unavailable"
    ) {
      res.writeHead(503).end(
        JSON.stringify({
          error: "Test-only store failure; never show this detail",
        }),
      );
      return;
    }
    if (failure === "invalid") {
      res.end('{"result":"unexpected"}');
      return;
    }
    try {
      const result = await command(JSON.parse(body));
      res
        .writeHead(200, { "Content-Type": "application/json" })
        .end(JSON.stringify({ result }));
    } catch {
      res.writeHead(400).end('{"error":"Local Redis command failed"}');
    }
  };
  let certFile: string | undefined;
  let server: http.Server | https.Server;
  if (tls) {
    certFile = path.join(root, "cert.pem");
    const keyFile = path.join(root, "key.pem"),
      config = path.join(root, "openssl.cnf");
    fs.writeFileSync(
      config,
      "[req]\ndistinguished_name=dn\nx509_extensions=v3\nprompt=no\n[dn]\nCN=localhost\n[v3]\nsubjectAltName=DNS:localhost,IP:127.0.0.1\nbasicConstraints=critical,CA:TRUE\n",
    );
    await exec("openssl", [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-days",
      "1",
      "-keyout",
      keyFile,
      "-out",
      certFile,
      "-config",
      config,
    ]);
    server = https.createServer(
      { key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) },
      handler,
    );
  } else server = http.createServer(handler);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const base = `${tls ? "https" : "http"}://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {
    base,
    certFile,
    command,
    setFailure: (state: typeof failure) => {
      failure = state;
    },
    setProvider: (fn: typeof provider) => {
      provider = fn;
    },
    setControl: (fn: typeof control) => {
      control = fn;
    },
    stop: async () => {
      server.closeAllConnections();
      await new Promise<void>((r) => server.close(() => r()));
      const stopped = new Promise<void>((r) => child.once("exit", () => r()));
      child.kill("SIGTERM");
      await stopped;
      fs.rmSync(root, { recursive: true, force: true });
    },
  };
}
