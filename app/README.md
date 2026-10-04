# CALIBER 2026 Case 2 — Manufacturing Decision Hub

Local English prototype with Executive Overview, Data & KPI Map, Problem Tank, Investigation and Action Tracker. Five asset scenarios, 380 immutable incidents, source inspection, evidence-dependent replay and reviewed action closure are implemented. See [repair report](REPAIR_REPORT.md) and [current verification](IMPLEMENTATION_STATUS.md).

## Visual redesign

Industrial SaaS light mode uses shared royal-blue/slate tokens, a persistent white sidebar, aligned asset/role header controls and source-window context. Overview emphasizes scenario trends; Data Map KPI disclosures retain source access and proposed-owner edits; Investigation shows the review sequence and each hypothesis's evidence/checks. Action scope, approval and verified closure remain unchanged. See [visual redesign report and captures](VISUAL_REDESIGN_REPORT.md) and [DESIGN.md](DESIGN.md).

Latest layout refinement: [A–E changes, verification and screenshots](UI_REFINEMENT_REPORT.md). Sidebar/reset, status distribution, governance accordions and independent panel flow retain the existing data/workflow.

## Install and run

Tested: Node **22.23.2**, npm **10.9.8**, macOS. Dependencies use exact versions and the existing lockfile. Keep the checkout's canonical `sources/`, `processed/` and `PACKAGE_MANIFEST.json` available for preparation/build; Python is needed only for optional normalization.

```bash
cd /Users/acit/Documents/MyWork/CALIBER_Codex_Handoff/app
npm ci
npm run dev
```

Open **http://127.0.0.1:3100**. `predev` verifies and copies source runtime files inside `app/runtime/`. Once prepared, requests use those copies and `data/normalized.json`, without parent-directory reads. No database or API key is needed for replay.

If port 3100 is occupied, inspect its owner:

```bash
lsof -nP -iTCP:3100 -sTCP:LISTEN
```

Use the existing app server, or prepare and start on another port:

```bash
npm run prepare:runtime
npx next dev --hostname 127.0.0.1 --port 3101
```

Production in the checkout:

```bash
npm run build
npx next start --hostname 127.0.0.1 --port 3102
```

`npm start` uses port 3100; stop only your own conflicting server. The documented verification used production port 3102.

Useful routes on the default port:

- [Overview](http://127.0.0.1:3100/?view=overview)
- [Sources and KPI definitions](http://127.0.0.1:3100/?view=data)
- [All incidents](http://127.0.0.1:3100/?view=problems&tank=register)
- [KO investigation](http://127.0.0.1:3100/?view=investigation&asset=KO-3201)
- [KO pre-event midnight](http://127.0.0.1:3100/?view=problems&tank=conditions&asset=KO-3201&episodeAsset=KO-3201&mode=prospective&asOf=2026-04-22%2000:00:00)
- [KO pre-event end-of-day](http://127.0.0.1:3100/?view=investigation&asset=KO-3201&mode=prospective&asOf=2026-04-22%2023:59:59)
- [HE impact contrast](http://127.0.0.1:3100/?view=investigation&asset=HE-3301)

## Optional local live AI

Replay is always available and makes **no provider call**. Server guards default to disabled, even if an existing private file contains a key/model. Direct mode needs only provider settings and no Redis/passcode; protected public mode uses shared Redis guards. See the hosted setup below. Workspace roles do not unlock provider access.

Create `.env.local` **only if it does not already exist**:

```bash
cd /Users/acit/Documents/MyWork/CALIBER_Codex_Handoff/app
test -e .env.local || cp .env.example .env.local
```

Edit that dotfile privately in the app directory, with no `.txt` suffix. Preserve existing settings. For a deliberately enabled single-process local demo:

```dotenv
AI_BASE_URL=https://ai.sumopod.com/v1
AI_API_KEY=
AI_MODEL=
AI_LIVE_MODE=local
DEMO_PASSCODE=
DEMO_SESSION_SECRET=
AI_MAX_CALLS_PER_MINUTE=2
AI_MAX_CALLS_PER_DAY=20
AI_MAX_CONCURRENT=1
```

Supply the team's valid key and **exact provider model ID**; none is guessed. Choose a private passcode of at least 12 characters and a separate random session signing secret of at least 32 characters. Generate the latter locally, for example `node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("hex"))'`. Do not paste secrets into chat, commits or logs. Never use `NEXT_PUBLIC_` for these variables. Restart after editing.

In Investigation, unlock **Demo live access** with the passcode, then explicitly choose **Request live AI composition**. The server issues a signed, expiring, HttpOnly, SameSite=Strict cookie. Loopback/origin checks, login-attempt limits, request/minute, UTC-day quota and concurrency run before provider fetch. The default example permits at most two attempted calls/minute, twenty/day and one active request, with `max_tokens: 1600`, 15-second deadline, bounded context/response, cancellation and no automatic retry. Failed/invalid attempts conservatively consume quota. These are operational caps, **not a dollar spending guarantee**; provider pricing/billing caps remain unknown.

In **local** mode, limits and revocation apply to one process and reset on restart. Hosted environments require explicit **public** mode, exact HTTPS allowed origins and shared Redis guards; local mode on Vercel remains blocked. Missing/invalid configuration or unavailable shared storage fails closed. No paid service was created.

Composition uses ordinary `/chat/completions`, without streaming, embeddings or special response formats. A structured response can supply different engineering inference prose. Observations must bind exact source/derived fact IDs, values, units, source times and asset; hypotheses must cite eligible abnormal signals and counter-evidence. Unsupported facts/strength/schema or provider failures produce labeled replay. Validation checks arithmetic/provenance and conservative text restrictions; it does not establish causal correctness or industrial safety.

The UI distinguishes **no live request**, **blocked**, **attempted but failed**, and **validated live response**. Configuration alone is never shown as successful integration. **Real SumoPod support/model behavior: NOT TESTED** in this repair. Existing `.env.local` was preserved and not opened; local guard configuration and an explicitly authorized minimal real call are still needed for external verification.

## Direct AI on Vercel — no Redis or passcode

For the jury demo, keep your existing server-only provider values and set **Production** environment:

```dotenv
AI_BASE_URL=https://ai.sumopod.com/v1
AI_API_KEY=<your-existing-private-key>
AI_MODEL=<your-existing-exact-model-id>
AI_LIVE_MODE=direct
```

Deploy this code and the new environment together. Vercel environment changes apply to new deployments. Open Investigation and select **Request live AI composition** directly. No demo passcode, session secret, allowed-origin list, Redis, minute/day cap or concurrency quota is required in direct mode; old guard variables are ignored by this mode. It is explicitly opt-in, and every visitor can request provider work billed to your account. Provider/platform limits still apply. The API key stays on the server and must never use `NEXT_PUBLIC_`.

Source scope, temporal eligibility, schema/citation/number validation, the fifteen-second provider timeout, no automatic retries, busy-state duplicate prevention and evidence replay remain unchanged. Missing key/model disables direct access. Normal-only evidence does not request an AI diagnosis. A configured gateway does not prove real provider/model compatibility.

`npm run test:browser:direct` verifies an isolated production runtime with a local provider fixture and no Redis. No real API calls are made. See [direct AI report](DIRECT_AI_REPORT.md).

## Protected live AI on Vercel

The current implementation supports an explicitly enabled hosted demo. It retains passcode access, signed HttpOnly/Secure/SameSite=Strict sessions, expiry/revocation, evidence/citation validation and replay. Simulated workspace roles still do not authenticate provider access. Real SumoPod compatibility and the user's Vercel deployment remain untested; local hosted verification uses a provider fixture.

1. Connect an Upstash Redis database or compatible Redis REST service to the Vercel project. Use its HTTPS REST endpoint and **write-capable** token; a TCP `REDIS_URL` or read-only token is insufficient. No database/account is provisioned by this repository.
2. Under **Project → Settings → Environment Variables**, select **Production**. Preserve your existing provider settings; add/verify the variables below. Store credentials as **Secret**, never `NEXT_PUBLIC_*`.
3. Set your exact production URL in `AI_ALLOWED_ORIGINS`, with `https://`, no path or trailing slash. Multiple explicitly approved domains are comma-separated. Do not use a wildcard or automatically trust arbitrary preview/forwarded hosts.
4. Redeploy the reviewed code and environment configuration. New variables do not modify an existing deployment.
5. Open Investigation, enter **Demo passcode**, unlock live access and explicitly request composition. The passcode is not the provider API key. A validated response applies to that request only; configuration is not proof of successful integration.

```dotenv
AI_BASE_URL=https://ai.sumopod.com/v1
AI_API_KEY=<your-private-provider-key>
AI_MODEL=<exact-model-id-from-your-provider-account>
AI_LIVE_MODE=public
AI_ALLOWED_ORIGINS=https://your-project.vercel.app
DEMO_PASSCODE=<private-passcode-at-least-12-characters>
DEMO_SESSION_SECRET=<separate-random-secret-at-least-32-characters>
AI_MAX_CALLS_PER_MINUTE=2
AI_MAX_CALLS_PER_DAY=20
AI_MAX_CONCURRENT=1
UPSTASH_REDIS_REST_URL=https://<your-redis-rest-endpoint>
UPSTASH_REDIS_REST_TOKEN=<private-write-capable-rest-token>
AI_QUOTA_NAMESPACE=caliber-production
```

Place actual values privately in Vercel; the angle-bracket strings above are placeholders. Keep Preview live disabled unless explicitly configured with separate access/namespace/storage. The namespace must remain stable across production builds/cold starts. Rotating the signing secret invalidates old sessions but does not reset the same namespace's daily budget.

Public guards use atomic Redis Lua reservation for UTC minute buckets, UTC day budget and shared concurrent leases. Login attempts are limited to five per sixty-second shared window. Logout persists revocation for the session lifetime; reservation rechecks revocation. A lease expires after sixty seconds if an instance crashes or release fails. Budget is conservatively consumed before the provider attempt and is never refunded on failure. These are call caps, **not dollar billing limits**; configure provider-side spending controls separately if available. Redis command usage has its own provider terms.

Each Redis command has a three-second deadline and bounded response; store errors are sanitized and make **zero provider calls**. Provider work retains the fifteen-second deadline and no automatic retries/redirects. The live browser deadline and analyze function duration are thirty seconds to allow guard round trips. Expired/revoked access returns to the passcode form; storage failures provide explicit status retry plus replay without discarding the case or local actions.

Diagnostics: `/api/status` exposes only booleans/sanitized availability, not keys, model IDs, Redis endpoints/tokens or passcodes. `/api/demo-session` checks configured origin and shared-store readiness. Neither status check contacts the AI provider. Replay remains available without Redis or credentials.

References: [Vercel environment variables](https://vercel.com/docs/environment-variables), [Upstash REST command format](https://upstash.com/docs/redis/features/restapi), [atomic Lua execution](https://redis.io/docs/latest/develop/programmability/eval-intro/). See [hosted implementation report](HOSTED_AI_REPORT.md) for actual checks and deployment limits.

## Sources and deployment preparation

`npm run build` runs `prepare:runtime`: all 22 originals must match inventory SHA-256/size, and workbook extraction must match the original manifest. It creates ignored server-only `runtime/sources/...`, `runtime/workbook-excerpts.json` and `runtime/manifest.json`. Canonical originals stay unchanged. `next.config.ts` traces runtime files into `/api/source` and normalized data into server routes; environment files, screenshots and verification reports are excluded.

For **Vercel configuration**, use repository **Root Directory `app`**, Install Command `npm ci`, Build Command `npm run build`, framework Next.js. Include files outside Root Directory in the build checkout so preparation can read canonical handoff files. Live is disabled by default; enable it only using the protected hosted setup above. Verify source routes in the actual deployment before presenting it: Vercel deployment size/routing/function tracing remain **NOT TESTED**. No deployment or push was performed.

For an artifact-only local runtime:

```bash
npm run build
mkdir -p .next/standalone/.next/static
cp -R .next/static/. .next/standalone/.next/static/
# Copy ONLY .next/standalone to your isolated runtime directory, then:
cd /path/to/isolated-runtime
PORT=3102 HOSTNAME=127.0.0.1 AI_LIVE_MODE=disabled node server.js
```

Do not copy `.env.local` into artifacts. Supply private variables separately for an explicitly configured local or protected hosted demo. `npm run test:deploy` automatically creates a temporary artifact-only directory, starts the production server, verifies all source downloads/excerpts and controlled missing-source states, then removes its own temporary files.

## Evidence and action workflow

Weekly date-only readings become eligible at **source-local end-of-day**. This is a conservative replay convention; real publication/ingestion history is unknown. Hourly timestamps stay source-local. Impossible dates/times are rejected. Tank → Investigation carries asset, mode and cutoff. Prospective excludes current event day, future observations, all remarks, current incident outcomes/risk/loss, RCA reports and historical retrieval with unknown availability. Only actions from the same prospective review scope are visible. Historical cutoff limits observations; completed RCA remains explicitly retrospective context.

Signal rules use source threshold direction, comparable trends and hourly state changes. Additional quarter-distance/movement rules are proposed review rules, not validated alarm policy. No observations and normal-only evidence have separate states; **Insufficient anomaly evidence** offers no inferred mechanism or maintenance draft. Source historical findings remain separate from hypotheses.

Accept a specific hypothesis/finding, then create its linked draft. Owner/date → approve → start → completion evidence → submit for verification → simulated Engineering reviewer confirmation → close. Rejection/cancellation needs a reason. Accepted review is bound to the actual hypothesis content, so changed composition cannot reuse an earlier acceptance. Source CAPA snapshots remain read-only. LocalStorage persists actions, owners, reviews and history; confirmed reset clears the prototype workspace.

## Data boundaries

380 rows; 226 literal `n/a` ARs and two reused AR pairs; qualified joins preserve source row identity. Financial columns are **k US$**; exposure = actual + potential, never savings. Production windows differ and are never summed into a simultaneous plant snapshot. PM rate retains **T/H (equiv.)**. KO MM/S versus micron is blocked; 1530/1800 ppm and alarm-version conflicts remain visible. HE OFF/nonzero plant rate and reported downtime differ; PM standby supply remains disputed. Availability/PM compliance/design life retain source limits.

Energy/emissions default to **Data unavailable**. An explicit isolated synthetic mode has editable assumptions and a persistence forecast; no real company factor, legal limit or prediction performance is asserted. See [source notes](SOURCE_AND_ASSUMPTION_NOTES.md), [integrity note](SOURCE_INTEGRITY.md), [walkthrough](WALKTHROUGH.md).

## Verification

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
# In another terminal, run the production server on 3102 first:
CALIBER_TEST_BASE_URL=http://127.0.0.1:3102 npm run test:browser
npm run test:deploy
npm run format:check
```

Without the override Playwright uses/starts port 3100 dev; that is not the final production verification path. Tests use fake provider transport and mock browser access/failure states, never real credentials. Results/screenshots are in `verification/` and `screenshots/`.

Hosted Redis integration requires a local `redis-server` and `redis-cli`, separate from app production dependencies:

```bash
# From app/, with Redis binaries available on PATH:
npm run test:hosted
# After npm run build:
npm run test:browser:hosted
# Or pass binary paths with CALIBER_TEST_REDIS_SERVER and CALIBER_TEST_REDIS_CLI.
```

The Redis suite is marked skipped if Redis is unavailable; that is not a passing integration claim. The hosted browser command fails explicitly without Redis. Both create private temporary Redis instances with persistence disabled, never use the application database, and remove their own runtime after testing. Hosted browser tests proxy genuine production API responses through simulated HTTPS ingress, with TLS Redis/provider fixtures; they are not a Vercel or paid-provider test.

Optional normalization after checking originals:

```bash
cd /Users/acit/Documents/MyWork/CALIBER_Codex_Handoff
python scripts/verify_package.py
cd app
python -m pip install openpyxl
npm run normalize
```

The full package verifier still exits 1 for the **pre-existing `CODEX_PROMPT.md` size/hash discrepancy**. Originals pass. Preserve the original manifest; do not conceal the discrepancy. Normalization independently verifies originals and reconciles all source records before writing app data.

## Implementation and reference

Modular UI in `src/components/`; pure temporal/signals/evidence/action modules in `src/lib/`; server AI/access/source routes in `src/app/api/`. No framework migration, application database, Azure, vector store or separate app service. Optional hosted live access requires external Redis REST storage for shared guards. Existing dependency lock retained. ESLint 9 is deprecated upstream but remains compatible with the installed lint stack.

The supplied Microsoft workflow snapshot at commit `26b906d3e2e3f073ced52bd15ee2ae6c150625fe` inspired sequential evidence/review/action. No reference implementation code, tire-factory data or Azure dependencies were imported. Canonical license remains in `../sources/reference/Microsoft_LICENSE`.

Team slides/video, competition submission/access/size checks and actual industrial validation remain separate. No winning odds, measured savings or production readiness claim is made.
