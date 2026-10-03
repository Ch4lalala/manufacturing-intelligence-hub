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

Replay is always available and makes **no provider call**. Server guards default to disabled, even if an existing private file contains a key/model. Workspace roles do not unlock provider access.

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

Limits and revocation apply to **one server process**, reset on restart and are not shared between instances. `AI_LIVE_MODE=public`, recognized serverless platforms, incomplete guard configuration or non-loopback origin disable live access. Public live cannot be enabled by supplying only a key. A verified shared quota/access backing would require a separate implementation; no paid service was created.

Composition uses ordinary `/chat/completions`, without streaming, embeddings or special response formats. A structured response can supply different engineering inference prose. Observations must bind exact source/derived fact IDs, values, units, source times and asset; hypotheses must cite eligible abnormal signals and counter-evidence. Unsupported facts/strength/schema or provider failures produce labeled replay. Validation checks arithmetic/provenance and conservative text restrictions; it does not establish causal correctness or industrial safety.

The UI distinguishes **no live request**, **blocked**, **attempted but failed**, and **validated live response**. Configuration alone is never shown as successful integration. **Real SumoPod support/model behavior: NOT TESTED** in this repair. Existing `.env.local` was preserved and not opened; local guard configuration and an explicitly authorized minimal real call are still needed for external verification.

## Sources and deployment preparation

`npm run build` runs `prepare:runtime`: all 22 originals must match inventory SHA-256/size, and workbook extraction must match the original manifest. It creates ignored server-only `runtime/sources/...`, `runtime/workbook-excerpts.json` and `runtime/manifest.json`. Canonical originals stay unchanged. `next.config.ts` traces runtime files into `/api/source` and normalized data into server routes; environment files, screenshots and verification reports are excluded.

For **Vercel configuration**, use repository **Root Directory `app`**, Install Command `npm ci`, Build Command `npm run build`, framework Next.js. Include files outside Root Directory in the build checkout so preparation can read canonical handoff files. Leave public live disabled. Verify source routes in the actual deployment before presenting it: Vercel deployment size/routing/function tracing remain **NOT TESTED**. No deployment or push was performed.

For an artifact-only local runtime:

```bash
npm run build
mkdir -p .next/standalone/.next/static
cp -R .next/static/. .next/standalone/.next/static/
# Copy ONLY .next/standalone to your isolated runtime directory, then:
cd /path/to/isolated-runtime
PORT=3102 HOSTNAME=127.0.0.1 AI_LIVE_MODE=disabled node server.js
```

Do not copy `.env.local` into artifacts. Supply private variables separately only for an approved local live demo. `npm run test:deploy` automatically creates a temporary artifact-only directory, starts the production server, verifies all source downloads/excerpts and controlled missing-source states, then removes its own temporary files.

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

Modular UI in `src/components/`; pure temporal/signals/evidence/action modules in `src/lib/`; server AI/access/source routes in `src/app/api/`. No framework migration, database, Azure, vector store or new service. Existing dependency lock retained. ESLint 9 is deprecated upstream but remains compatible with the installed lint stack.

The supplied Microsoft workflow snapshot at commit `26b906d3e2e3f073ced52bd15ee2ae6c150625fe` inspired sequential evidence/review/action. No reference implementation code, tire-factory data or Azure dependencies were imported. Canonical license remains in `../sources/reference/Microsoft_LICENSE`.

Team slides/video, competition submission/access/size checks and actual industrial validation remain separate. No winning odds, measured savings or production readiness claim is made.
