# Implementation status — repair, 3 October 2026

Current checkout: branch **main**, HEAD **3759e2efc21e5e1727022bfd487066d4fb7fbb45**. This report supersedes the earlier 2 October results. Changes remain uncommitted for review; existing user changes are preserved. No push, publication, deployment or submission was performed. See [Indonesian repair report](REPAIR_REPORT.md).

## Verification actually performed

| Check                                 | Result                          | Evidence and practical limit                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Original sources                      | **PASS: 22/22**                 | Original SHA-256/size checks; all 16 baseline files present. [Integrity note](SOURCE_INTEGRITY.md).                                                                                                                                                                                                                                                           |
| Full original handoff manifest        | **FAIL: known discrepancy**     | 46 files checked; the same two size/hash discrepancies concern pre-existing CODEX_PROMPT.md. Manifest preserved. No factual original/spec changed.                                                                                                                                                                                                            |
| Original reconciliation               | **PASS**                        | `npm run normalize` verifies every register row and complete hourly/weekly numeric/status values against originals. Normalized JSON unchanged.                                                                                                                                                                                                                |
| Fresh dependency install              | **PASS**                        | `npm ci`, existing exact lock, Node 22.23.2/npm 10.9.8; zero vulnerabilities reported by that install. ESLint 9 deprecation remains a tooling limitation.                                                                                                                                                                                                     |
| Typecheck / lint / build / formatting | **PASS**                        | Actual package commands exit 0. Build produces standalone output and all eight page/route entries. No dependency or framework migration.                                                                                                                                                                                                                      |
| Domain/API regressions                | **PASS: 27/27**                 | [Domain](tests/domain.test.ts), [repair](tests/repair.test.ts). Calendar/cutoff equality, evidence states, fact validation, qualified links, closure, quotas, signed session handlers, runtime errors, and a hanging fake transport actually aborted at the 15-second deadline.                                                                               |
| Production Chromium                   | **PASS: 14/14**                 | Production standalone on loopback port 3102, explicit CALIBER_TEST_BASE_URL. [Browser JSON](verification/browser-results.json). All views/assets/55 slide selections, native asset changes, empty historical Data Map/source access, KO closure/reload/reset, second-hypothesis action, cutoff propagation, no-anomaly state, mocked auth/retry/quota states. |
| Artifact-only production runtime      | **PASS: 53 checks**             | Only standalone+static files copied to a temporary directory with no parent sources/processed. [Results](verification/deploy-runtime.json). All five scopes, exact XLSX/PPTX/PDF locators, all 22 original SHA downloads, unknown/missing-source states, public live disabled and replay. Zero provider calls.                                                |
| Client/server boundary                | **PASS for checked boundary**   | [Scan](verification/client-boundary.json): 13 client JS files contain no server AI/access environment names; standalone has no .env files. Private .env.local not opened; no claim of external secret rotation or exhaustive security audit.                                                                                                                  |
| Accessibility and responsive          | **PASS in tested scope**        | Axe WCAG2/2.1 A/AA reports no violations on the five desktop views. Keyboard dialog Escape/focus restore and native select work; widths 1440/1024/390 have no document horizontal overflow. Not a formal certification.                                                                                                                                       |
| Screenshot inspection                 | **PASS for listed captures**    | All five desktop views, KO replay/closure, midnight/end-of-day, normal-only, scoped action and narrow layouts inspected. [Screenshots](#screenshots).                                                                                                                                                                                                         |
| Design checks                         | **PASS with advisory warnings** | Premium strict audit zero findings; DESIGN.md lint exits 0, zero errors, 12 advisory warnings retained (component sizing subkeys and unreferenced palette metadata). Existing visual identity retained.                                                                                                                                                       |
| Real SumoPod                          | **NOT TESTED**                  | Fake transport proves validation/guards/fallback only. Existing private env preserved without inspection; exact model/provider support and deliberately enabled local demo guard plus authorized minimal real request remain unverified.                                                                                                                      |
| Deployed Vercel                       | **NOT TESTED**                  | No preview URL supplied, no deployment published. Artifact-only check is local production evidence; function tracing/routing/platform size and external access still require deployed verification.                                                                                                                                                           |

## Repair acceptance

| Area                       | Current verified behavior                                                                                                                                                                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A: common temporal gate    | Weekly date-only is eligible at source-local 23:59:59; hourly exact timestamps. Real calendar/time rejection. KO midnight latest weekly **15 April** in both APIs/UI, end-of-day **22 April** in both. Tank preserves asset/mode/cutoff.                                                                |
| A: prospective boundary    | All five assets exclude event day/future, every remark, current incident/report/outcome/risk/loss and unknown-availability historical retrieval. Only same-scope prospective actions render. Historical cutoff limits observations while known report context stays explicitly retrospective.           |
| B: signal-dependent replay | Source comparison direction/thresholds, same-unit trends and hourly state/rate review signals. Normal-only scope has zero hypotheses/actions; empty observations have their own state. Proposed triggers and source-version uncertainty are visible.                                                    |
| B: live composition        | Different inference prose accepted with exact typed fact bindings, citations, signal/mechanism constraints, normal counter-evidence, checks and qualitative strength. Empty hypothesis arrays valid. Unknown/wrong/future citations, invented values/units/times/assets and inflated strength rejected. |
| B: action linkage          | Every draft carries its hypothesis ID and support; second hypothesis creates its own action. Accepted content cannot be reused for changed composition. Draft → Approved → In Progress → Pending Verification → Closed remains gated; owner/date/evidence/reviewer required.                            |
| C: deploy source runtime   | Verified server-only copies traced inside app/standalone; no parent reads during requests. Exact source whitelists, controlled missing/corrupt state, no fallback to another sheet/asset. All original downloads rechecked by SHA.                                                                      |
| D: server usage guards     | Signed HttpOnly session, local/origin check and configured single-process minute/day/concurrency caps before provider fetch. Unauthorized/quota/concurrent rejections create no calls. Missing access settings/public platform fail closed while replay works.                                          |

## Baseline completeness retained

- **380 records**, rows 4–383, **226 literal n/a** AR values, two reused AR pairs; five report joins remain qualified by AR/tag/plant/date, never AR-only.
- **2261.1 h downtime; 61886.46 actual + 5307.97 potential = 67194.43 k US$ exposure**. Filter totals recompute from matching records. These are source historical loss/exposure, not recoverable savings.
- PU-2101B, KO-3201, PM-4405B, HE-3301, BL-5702 each have **720 hourly / 26 weekly / 11 RCA slides**. Distinct production months stay independent; other 375 incidents are explicitly register-only.
- KO MM/S/micron comparison blocked; 1530 weekly/1800 later-report ppm and alarm threshold version conflicts remain. HE 13 OFF/nonzero plant-rate samples differ from report 12 h; PM standby conflict and T/H (equiv.) retained.
- KPI definitions/source drawers, proposed data ownership/consolidation, priority reasons, lexical retrieval, read-only historical recommendations, local workflow/history/reset all remain functional.
- Default energy/emissions unavailable. Synthetic assumptions/history/persistence forecast are isolated from incidents, alerts and AI context; zero-output intensity unavailable. No company factor or legal limit invented.

## Exact verification commands

From the root before normalization:

```bash
python scripts/verify_package.py
```

From `app/`:

```bash
npm ci
npm run normalize
npm run typecheck
npm run lint
npm test
npm run build
# Production standalone: static files copied as described in README.
PORT=3102 HOSTNAME=127.0.0.1 AI_LIVE_MODE=disabled node .next/standalone/server.js
CALIBER_TEST_BASE_URL=http://127.0.0.1:3102 npm run test:browser
npm run test:deploy
npm run format
npm run format:check
python /Users/acit/.codex/plugins/cache/openai-curated-remote/frontend-design-premium/1.4.0/skills/frontend-design-premium/scripts/audit_project.py /Users/acit/Documents/MyWork/CALIBER_Codex_Handoff/app --mode strict
npx -p @google/design.md designmd lint DESIGN.md
```

The package verifier's exit 1 is documented, not presented as a pass. Browser tests used existing Chromium; no fresh browser installation was needed. Design tooling was auxiliary and does not change the app lockfile. Build regenerated Next types; the user's original next-env.d.ts edit was restored exactly afterward. The user's existing port-3100 server was preserved; test production server used a separate port.

## Screenshots

| Scope                         | Capture                                                                                                                                                                                                                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Five desktop views            | [Overview](screenshots/overview-1440.png), [Data Map](screenshots/data-1440.png), [Tank](screenshots/problems-1440.png), [Investigation](screenshots/investigation-1440.png), [Actions](screenshots/actions-1440.png)                                                       |
| KO temporal comparison        | [Midnight](screenshots/repair-midnight.png), [end-of-day](screenshots/repair-end-of-day.png), [pre-event replay](screenshots/prospective-replay.png), [readable signal detail](screenshots/repair-signal-detail.png), [fact provenance](screenshots/repair-fact-drawer.png) |
| Evidence state/action linkage | [Normal-only](screenshots/repair-insufficient.png), [second hypothesis action](screenshots/repair-second-hypothesis-action.png), [verified closure](screenshots/ko-verified-action.png)                                                                                     |
| Failure/auth states           | [Source drawer](screenshots/source-drawer.png), [mocked demo access/quota](screenshots/repair-demo-access.png)                                                                                                                                                              |
| Domain context                | [HE asset vs plant](screenshots/he-asset-plant.png), [utility illustration](screenshots/illustrative-utilities.png)                                                                                                                                                         |
| Responsive                    | Each view also has `-1024.png` and `-390.png` captures in screenshots/.                                                                                                                                                                                                     |

## Material limitations

Real provider and deployed platform are **NOT TESTED**. No distributed quota store, dollar budget enforcement, enterprise identity or CMMS integration exists; local live limits reset on restart. Provider response features/model access remain unknown. Validator is deliberately conservative and cannot prove general engineering prose correct or safe.

Replay timing uses observation timestamps as a conservative proxy, with unknown publication/revision/ingestion history and source timezone. Proposed signal rules have no industrial performance validation. Source disagreements need engineering/source-owner resolution. Demo closure and roles show prototype workflow only; they do not verify equipment maintenance. Utilities are synthetic and forecast accuracy has not been evaluated on real data.

Firefox/Safari, physical devices, formal screen-reader/zoom studies, adversarial security certification, spoken three-minute duration, slides/video, final <=10 MB competition package and submission access remain **NOT TESTED/team work**. No winning standing, ROI, improvement, safety or production readiness claim.
