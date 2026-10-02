# CALIBER 2026 Case 2 — Manufacturing Decision Hub

Complete local English prototype: Executive Overview, Data & KPI Map, Problem Tank, Investigation and Action Tracker. All five detailed scenarios, 380 immutable register rows, original-source drawers, condition trends, incident retrieval, reviewed actions, temporal evidence replay and an isolated utility illustration are implemented.

## Run locally

Keep `app/` inside the supplied handoff root. The original-download and workbook-excerpt routes use the verified `../sources/` and `../processed/` files. Application data is already normalized in `data/normalized.json`; Python is not required to run the app.

Tested runtime: Node **22.23.2**, npm **10.9.8** on macOS. Next.js requires Node 20.9 or newer; use Node 22 for the tested path. Dependencies are exact versions with `package-lock.json`.

```bash
cd /Users/acit/Documents/MyWork/CALIBER_Codex_Handoff/app
npm ci
npm run dev
```

Open **http://127.0.0.1:3100**. The server binds to loopback only. If that port is occupied, inspect its owner before stopping anything; use `npx next dev --hostname 127.0.0.1 --port 3101` for another local port.

For the production build:

```bash
cd /Users/acit/Documents/MyWork/CALIBER_Codex_Handoff/app
npm run build
npm start
```

Stop an existing dev server on this app's port before `npm start`. Once dependencies are installed, the full replay walkthrough works without internet or an API key. No database, Azure, FastAPI, embeddings, vector store or separate agent processes are needed.

Useful local links:

- [Overview](http://127.0.0.1:3100/?view=overview)
- [Governed sources and definitions](http://127.0.0.1:3100/?view=data)
- [All 380 incidents](http://127.0.0.1:3100/?view=problems&tank=register)
- [KO investigation](http://127.0.0.1:3100/?view=investigation&asset=KO-3201)
- [KO pre-event replay](http://127.0.0.1:3100/?view=investigation&asset=KO-3201&mode=prospective&asOf=2026-04-22%2023:59:59)
- [HE asset-versus-plant contrast](http://127.0.0.1:3100/?view=investigation&asset=HE-3301)
- [Action Tracker](http://127.0.0.1:3100/?view=actions)

## Optional live AI

Evidence replay is always available and makes **no live AI call**. A missing server key or exact model ID causes an explicit replay result, with live API marked **not-tested**.

```bash
cd /Users/acit/Documents/MyWork/CALIBER_Codex_Handoff/app
cp .env.example .env.local
```

Edit `.env.local` privately:

```dotenv
AI_BASE_URL=https://ai.sumopod.com/v1
AI_API_KEY=
AI_MODEL=
```

Fill the key and the exact model ID available to the team. No model is guessed. Restart the server after configuration. Never prefix credentials with `NEXT_PUBLIC_`, paste them into chat or put them in source control. `.env.local` is ignored.

Use **Request live AI composition** explicitly. The server sends a compact eligible evidence bundle to ordinary `/chat/completions`, with a 15-second timeout, request cancellation and bounded output. It assumes no streaming, special response-format or embedding support. Invalid JSON, unsupported claims/numbers, missing evidence or ineligible citations fall back visibly to replay. Errors do not expose provider bodies or credentials.

Live composition selects and orders canonical source-backed hypotheses and review drafts. Free factual narrative, new numbers, staff, parts stock and execution instructions are rejected. This intentionally conservative validation limits model expressiveness. A configured key/model is not proof of successful integration; a real validated response is still required. The supplied handoff contains neither credential nor model, so **successful live integration remains untested**.

## Demo actions and local persistence

In KO Investigation, click **Evidence replay - no live AI call**, inspect citations and accept the finding for action review. Create a reviewed draft. In Action Tracker, assign an owner role and demo due date, approve, start, record completion evidence and submit for verification. Choose **Engineering reviewer** in the simulated-role control, open closure review, confirm evidence and close.

Draft → Approved → In Progress → Pending Verification → Closed. Rejection/cancellation requires a reason. Source report actions and source risk statuses remain read-only. Local workspace changes persist in this browser's localStorage, with dataset-version handling and change history. Another tab's update loads with a notice. Storage failure shows a memory-only warning. **Reset prototype workspace** clears actions, owner edits, reviews, acknowledgements and local history. It is also available in the narrow-layout footer.

Roles and verification evidence are simulated. They are not enterprise identity enforcement or proof of actual maintenance completion. Overdue is evaluated only for demo actions against the visible editable demo clock.

## Data and evidence boundaries

- Source financial units are **k US$**. Act. and Pot. Loss are separate; total exposure is their sum, not savings.
- Register filters recompute totals. Asset hourly windows differ and are never combined into a simultaneous plant snapshot. PM rate retains **T/H (equiv.)**.
- KO MM/S versus micron comparison is blocked; 1530 ppm weekly versus later 1800 ppm and the historical 60-versus-45 alarm discrepancy stay visible.
- HE has 13 OFF samples with nonzero plant rate while its report states 12 h downtime. PM dataset/report standby-supply disagreement remains visible.
- Source availability uses 4368 h as a workbook convention; source 92% PM compliance lacks underlying work logs. Generic design-life text is not a remaining-life model.
- Pre-event replay excludes the entire current-event RCA, all other RCA reports with unknown publication availability, current register outcomes/status/risk/loss summaries, future observations and every observation remark. It excludes the current event day and later observations; date-only weekly readings become eligible only at end-of-day. Earlier register retrieval is conservatively unavailable in that mode because availability/revision dates were not supplied.
- Historical review exposes known post-inspection findings. It does not claim a successful earlier prediction.
- Utilities default to **Data unavailable**. The explicit illustration generates synthetic readings and a persistence forecast with editable assumptions, separate from baseline totals, alerts and AI evidence.

Read [source integrity](SOURCE_INTEGRITY.md), [source and assumption notes](SOURCE_AND_ASSUMPTION_NOTES.md), [implementation acceptance results](IMPLEMENTATION_STATUS.md) and the [three-minute walkthrough](WALKTHROUGH.md).

## Verification commands

```bash
cd /Users/acit/Documents/MyWork/CALIBER_Codex_Handoff/app
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:browser
npm run format:check
```

Playwright starts a local dev server when port 3100 is free, or uses the existing app server. Screenshots are in `screenshots/`; machine-readable browser results are in `verification/browser-results.json`. Browser provider calls are mocked for failure-state checks; domain tests validate server provider handling with fake transports. They do not establish real SumoPod support.

Optional data regeneration (only after checking original hashes):

```bash
cd /Users/acit/Documents/MyWork/CALIBER_Codex_Handoff
python scripts/verify_package.py
cd app
python -m pip install openpyxl
npm run normalize
```

The supplied package verifier intentionally continues to report the pre-existing changed `CODEX_PROMPT.md`; see SOURCE_INTEGRITY.md. Do not overwrite the manifest or originals to hide that discrepancy. App normalization checks all original hashes and all other manifested files before transforming anything. It verifies register values, weekly measurements and hourly numeric fields against original workbooks. It does not rerun or modify the supplied extractor.

## Implementation map and reference

`src/components/` contains shared controls and separate views; `src/lib/` contains pure aggregation, thresholds, retrieval, evidence gating, validation, utilities and action state logic. `src/app/api/` handles read-only source access and optional server AI. The only mutable demo data is browser workspace state.

The [Microsoft workflow reference](https://github.com/microsoft/agentic-factory-hack/tree/26b906d3e2e3f073ced52bd15ee2ae6c150625fe) inspired sequential triage → evidence → reviewed action. No Microsoft implementation code or tire-factory dataset was imported; no Azure dependency was added. Its supplied MIT snapshot remains in `../sources/reference/Microsoft_LICENSE`.

Compatible versions were checked against the [official Next installation guide](https://nextjs.org/docs/app/getting-started/installation), installed Next documentation and package peer declarations. TypeScript 7 was incompatible with the supplied lint tooling and ESLint 10 with its React plugin; the tested lock pins TypeScript 6.0.3 and ESLint 9.39.5. ESLint 9 is deprecated upstream but remains the compatible lint tool for this exact Next config; all required checks run with it.

No publication, push or submission is performed. Team slides/video and combined submission packaging remain the team's work. The local source checkout and dependencies are not a submission-size-compliant archive.
