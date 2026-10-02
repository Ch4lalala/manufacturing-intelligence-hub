# Acceptance gates for the prototype

These are implementation acceptance checks, not proven competition scores or company outcomes. Codex must record pass/fail/not-tested with evidence in app/IMPLEMENTATION_STATUS.md. Unknown live API credentials do not block the local evidence-replay prototype.

## Source and numerical integrity

- [ ] All 22 source snapshot files match source_inventory SHA-256; all 16 data baselines are present.
- [ ] 380 incident rows survive normalization; `n/a` AR is null semantically with raw value retained; two duplicated AR values never collapse cases.
- [ ] Default full-register scope reproduces exact totals and status counts in verified_metrics.json. Filtered results are recomputed and never reuse all-source totals.
- [ ] Five assets each expose 720 hourly records, 26 weekly records and their own 11-slide RCA. Not all 380 incidents are claimed to have detailed reports.
- [ ] Monetary unit k US$ is converted consistently; Act. Loss and Pot. Loss never merge into realized savings.
- [ ] KO unit mismatch blocks invalid cross-source comparison; weekly/RCA reading conflicts remain visible.
- [ ] HE OFF with nonzero PLANT_RATE and 13 OFF sample vs 12 h RCA difference is preserved; PM continuity discrepancy is visible.
- [ ] Availability/PM source values have caveats and are not described as independently validated.
- [ ] Utility samples never contaminate baseline portfolio, alerts or RCA; every utility sample/forecast carries illustration status and assumptions.

## Product completeness

- [ ] Five views are reachable with real navigation; filters/search/links function; selected asset/time context persists correctly.
- [ ] Executive Overview distinguishes multi-year register totals from asset-specific windows and synthetic utilities.
- [ ] KPI drawers contain period, formula, unit, source locator, owner status and caveats. Data Map includes source mapping and proposed consolidation.
- [ ] Problem Tank explains priority and alerts; historical case statuses are separate from demo incident/action states; duplicate breach samples form episodes.
- [ ] Investigation renders evidence/source excerpts, similar-incident matches, hypotheses, contradictions, missing checks and report availability.
- [ ] All five historical RCA outcomes can be reviewed. Pre-event mode excludes same-event outcome text and future observations, including from retrieval, cards and LLM context.
- [ ] Actions need approval; verification evidence and reviewer confirmation gate closure. Local updates persist after reload; reset restores clean demo without editing originals.

## AI and resilience

- [ ] AI_BASE_URL configured server-side; key/model absent yields explicit evidence-replay mode, no fake live AI.
- [ ] Live API has bounded timeout/error handling; invalid JSON, unknown citations and unsupported numbers are rejected/flagged.
- [ ] API key cannot appear in client bundle, logs, errors or source control; do not print it during testing.
- [ ] Live integration is marked not-tested if no authorized usable key/model exists. A provider/model list is not a successful analysis test.
- [ ] Prospective context test proves future/current-event RCA cannot reach the model. Citation test proves each reference resolves to eligible evidence.
- [ ] Model supplies no automatic equipment command, procurement, invented staff/stock or execution instruction absent approved references.

## Build and visual verification

- [ ] Install with documented lockfile, lint/typecheck/build succeed on installed runtime.
- [ ] Focused tests cover aggregation/filtering, qualified incident joins, unit conflicts, temporal evidence, action-state closure and provider fallback.
- [ ] Run app, capture each view and the KO guided flow at desktop widths; inspect for overflow, clipped text, chart units, unreadable sources and inactive controls. Use available browser tooling; record if manual viewing remains untested.
- [ ] Keyboard focus, textual severity cues, responsive tables, loading/error/empty states are usable.
- [ ] Three-minute guided route works without internet/model calls using evidence replay; live mode can be switched in explicitly.

## Required handoff from executing Codex

- App source, lockfile, README run/setup, .env.example, source/assumption notes, acceptance status and screenshots.
- Explicit list of live vs replay behavior; verification results vs untested gates; original-data warnings; remaining blockers.
- A concise 180-second walkthrough outline for team recording. No slides/video authoring required by this prompt.
- App remains local until team separately requests deployment. Original source snapshots remain unmodified; raw data should not be pushed/published incidentally.
