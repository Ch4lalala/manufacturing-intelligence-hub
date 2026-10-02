You are implementing CALIBER 2026 Case 2 for a student team. Build the complete local English web prototype specified in this handoff. Work autonomously through implementation, verification and documentation. The team handles slides/video; do not stop after a plan, scaffold, static screenshots or placeholder UI. The application does not exist yet. Create it under `app/` in the current handoff root. Avoid routine confirmation requests; ask only for genuinely blocking facts that cannot be safely handled as unknown. Missing API key/model should select explicit evidence replay, while you finish the app.

## Authoritative inputs - read before writing app code

1. `README_START_HERE.md`
2. `docs/SOLUTION_SPEC.md`, `docs/DATA_RULES.md`, `docs/DATA_CONTRACTS.md`, `docs/ACCEPTANCE.md`, `docs/RUBRIC_AND_DIFFERENTIATION.md`, `docs/IMPLEMENTATION_ROADMAP.md`, and `validation/REQUIREMENTS_TRACEABILITY.csv`.
3. `processed/source_inventory.json`, `processed/source_origins.json`, `processed/verified_metrics.json`
4. `processed/assets.json`, `processed/incidents.json`, `processed/presentation_extraction.json`, `processed/workbook_extraction.json`, `processed/official_text.json`
5. Original `sources/official/The Case - CALIBER 2026.pdf` pages 8-12 and `sources/official/Booklet CALIBER 2026 - Registration Extended.pdf` pages 7,9-11,15. Use original source files under `sources/baseline/` to resolve tables/formulas/report context. The supplemental meeting summary is not a verbatim official transcript.
6. `sources/reference/Microsoft_README.md` and `Microsoft_LICENSE` only as a workflow reference. The pinned reference commit is 26b906d3e2e3f073ced52bd15ee2ae6c150625fe. Do not import tire-factory data, fake OEE, staff, stock or Azure dependencies into our baseline.

First verify original source SHA-256 against the existing manifest before rerunning any extractor. Inventory is 22 source files including 16 baseline data files (5 production,5 equipment,5 RCA,1 register),1 explanation,1 meeting note,2 official PDFs,2 reference snapshots. If any original source is missing or changed, identify it explicitly. Continue unaffected work with current verified files; do not replace missing baseline facts with invented data.

Run `python scripts/verify_package.py` as the initial integrity check. The package manifest covers the supplied handoff files; new app files are allowed. Resolve source/hash discrepancies before claiming the affected facts.

## Mandatory solution

Implement Executive Overview, Data & KPI Map, Problem Tank, Investigation (asset trends + similar incidents + RCA), Action Tracker. All five asset scenarios and their historical RCA contents must be navigable. All 380 register incidents remain searchable/filterable. Primary demo is KO-3201; HE-3301 shows asset-vs-plant impact. The app answers every expected capability and all three mandatory Case 2 questions, including governance, executive visibility, utility-forecast illustration, probable RCA, priority, guidance, ownership and action verification. Read the full specification for behavior; this prompt is not a replacement for it.

Data integrity is a functional requirement:

- Use source-derived values, units, dates, formulas, definitions and explicit locators. Display source-stated, computed, proposed and synthetic status as appropriate.
- 226 AR values are literal `n/a`; two other AR identifiers are reused on different incidents. No AR-only deduplication or join. Stable record row IDs and qualified links are required.
- Financial columns are in k US$. Total Loss = Act. Loss + Pot. Loss. No claim that total exposure equals realized loss or recoverable savings.
- Preserve differing windows and hourly/weekly measurement sources. No simultaneous aggregate of nonmatching production windows. PM rate is equivalent throughput. No OEE/RUL/prediction-confidence or claimed improvement percentages.
- KO MM/S vs micron comparison is blocked pending verification. 1530 ppm weekly vs 1800 ppm later report reading and historical 60-vs-45 alarm conflict remain visible. Alarm counts describe workbook-classified weekly readings, not ignored alerts.
- HE has 13 OFF samples with nonzero plant rate while RCA reports 12 h downtime; PM dataset/report disagree on standby supply. Preserve rather than harmonize these facts.
- Source availability/PM compliance and generic design-life metadata remain source-stated with limitations.
- Default energy/emissions cards say data unavailable in baseline. An isolated illustrative utilities mode is functional with deterministic sample generation, explicit editable assumptions, synthetic labels, simple persistence forecast and no contamination of baseline/AI cases. Do not fabricate company factors or legal limits.

## Technical and product decisions

Use Next.js + TypeScript, server routes for optional LLM, provided JSON extraction for data, and localStorage for isolated prototype actions/owner edits with reset and history. Check installed runtime and current official docs for compatible dependencies; lock versions. Create modular app code, not one enormous component. A FastAPI service, Azure infrastructure, vector database and separate agent processes are unnecessary unless evidence demonstrates they are needed. Product-facing information remains operational, not developer plumbing.

Use a restrained industrial dashboard aesthetic, English copy, readable charts/tables, source drawers and meaningful data states. Every visible control must work or be transparently disabled with reason. Keyboard access, textual severity labels, high contrast and desktop/responsive layouts are required. Do not use fictitious company logos or decorative machinery art. If design skills/AGENTS instructions are available, read and follow applicable instructions.

Implement a deterministic triage and evidence/retrieval layer. Optional LLM composes hypotheses and reviewable action drafts; deterministic validation checks its claims/citations. Action flow is Draft -> Approved -> In Progress -> Pending Verification -> Closed; rejection/cancellation requires reason. Closure requires evidence and reviewer confirmation. Imported historical actions are read-only snapshots, not changed by demo actions. UI approvals simulate roles rather than enterprise authentication.

## API settings and unknowns

`AI_BASE_URL=https://ai.sumopod.com/v1`, `AI_API_KEY`, `AI_MODEL` live in server-only `.env.local`. Exact model ID and API credentials are not included. Do not guess model ID or print/read secrets into user-facing logs. Never put the key in NEXT_PUBLIC variables. Ordinary OpenAI-style chat completions are the intended integration, but endpoint/model support is not proven until tested. Gate special response-format/streaming/embedding options by observed support; validate JSON output yourself.

Output hypotheses with source evidence IDs, counter-evidence and missing checks, not a definitive diagnosis before inspection. No invented numbers, probabilities, technician names, parts stock or plant commands. Provide timeout/error handling and always available 'Evidence replay - no live AI call'. Mark live API not-tested if credentials/model are missing. Read DATA_RULES.md for prospective vs historical modes: current-event RCA must never enter pre-event context, results or retrieval; no future observations or historical outcome labels leak into that mode. Known cooler leak is a historical report finding only in retrospective review.

## Execute in phases without approval gates between them

1. Source verification and normalization: inspect originals and processed data; generate a short source integrity note. Preserve original snapshots. Check exact totals and conflicts before UI construction.
2. Build the navigation, five views, source drawers, filtering, charts, similar-incident search and data dictionary. All-five coverage is a completion gate.
3. Implement alert episodes/priority explanation and reviewed action workflow with local persistence/reset.
4. Implement bounded server AI integration, schema/citation/number validation and evidence-replay fallback. Utilities demonstration remains isolated and clearly illustrative.
5. Run meaningful tests for source-derived totals/filtering, qualified joins, unit conflicts, temporal eligibility, action closure and API fallback. Run typecheck/lint/build and fix failures.
6. Run the app and inspect each view/KO walkthrough with available browser tools at desktop widths. Capture screenshots, fix clipping/overflow/nonfunctional controls. Record unavailable visual/live-API tests honestly.
7. Deliver app README (setup/run/env), lockfile, .env.example, source/assumption notes, IMPLEMENTATION_STATUS.md with acceptance results and screenshots, plus a concise three-minute walkthrough outline. Include the exact commands and what remains untested. Keep the app local; publish/push only if separately requested.

The work is complete when a teammate can install/run the app from the README, navigate all five assets and 380 incidents, trace factual numbers to sources, finish the KO action loop, see utility illustration limits, and distinguish live analysis from replay. End by reporting what works and material limitations. Do not claim winning probability, unique competition standing, savings, industrial safety validation, proven forecasting/prediction performance or successful live integration without evidence.
