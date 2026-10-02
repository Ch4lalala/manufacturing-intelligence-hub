# Manufacturing Decision Hub - implementation specification

Status: agreed prototype direction, 2 October 2026. This is a handoff specification, not a claim of a built or validated system. The official casebook and booklet are authoritative. Read DATA_RULES.md and ACCEPTANCE.md with this file.

## 1. Goal, users and scope

Build a navigable English web prototype for CALIBER Case 2 that connects governed KPIs, issue detection, evidence-based probable RCA and accountable action tracking. Primary user: a plant manager prioritizing issues; second user: a reliability engineer inspecting evidence and drafting actions. Maintenance and Operations review assigned tasks. Personas and proposed data owners are design assumptions, not an audit of current company roles.

Five detailed asset scenarios must all be accessible: PU-2101B (ARP), KO-3201 (ZCU), PM-4405B (NUP), HE-3301 (ZCU), BL-5702 (OPP). All 380 incident-register rows must be searchable/filterable. These are competition scenario labels; do not assert they describe real company sites. KO-3201 is the guided demo case. HE-3301 supplies a second counterexample: asset OFF can coexist with nonzero plant rate.

The core product includes five views: Executive Overview; Data & KPI Map; Problem Tank; Investigation; Action Tracker. Source library is embedded in the Data Map and Investigation, with access to all five RCA decks via extracted content/source references. Full procurement, staff scheduling, automatic plant control and a tested predictive-failure model are roadmap extensions.

## 2. Traceability to the case

Casebook page 9 defines four expected capabilities; page 10 defines three mandatory questions. The prototype demonstrates each and documents the evidence boundary.

| Requirement | Implementation | Proof in demo | Boundary |
| --- | --- | --- | --- |
| Rationalize and integrate dashboards / KQ1 | Source catalog, entity links, KPI dictionary, quality warnings and conceptual consolidation matrix | KPI source drawer plus data-map screen | No real dashboard inventory supplied: proposed consolidation, no count of eliminated dashboards |
| Single pane of glass / KQ2 | Portfolio/register summaries and selected-scenario operational KPIs with distinct time labels | Executive view drills into issue/asset and source | Different asset windows must not masquerade as a simultaneous plant snapshot |
| Energy Forecasting use case | Separate illustrative utility scenario with reproducible sample assumptions and a simple forecast | Toggle into illustration; chart identifies history, forecast and provenance | No actual meter/energy/emission baseline or proven forecast accuracy |
| Similar-incident Retrieval use case | Filtered/lexical retrieval across register attributes; detailed RCA availability shown | Search a mechanism; open matching incidents and supporting text | Register matches may lack detailed RCA; qualitative relevance is not calibrated probability |
| AI Root Cause Indication / KQ3 | Evidence package, ranked hypotheses, supporting/contradicting evidence, missing checks | Engineer sees traceable claims and accepts/rejects hypothesis | Source-root-cause is known after inspection; prospective mode must exclude outcome leakage |
| Problem Tank and Alert Prioritization | Unified issue queue with severity, criticality, source risk score when available, dated evidence and review reason | Explain why KO is placed above another comparable issue | Priority policy is proposed, not an operationally validated risk model |
| Action Recommendation, Guidance and Tracking / KQ3 | Reviewable action drafts, PIC, due date, status history, verification evidence | Approve action, update progress, verify closure | Local demo updates do not represent actual historical CAPA completion |

## 3. View behavior and content

### Executive Overview

- Header shows mode, selected dataset window, plant/asset filter and as-of timestamp. Default mode: historical review, not live monitoring.
- Portfolio section: incident count, register downtime, Act. Loss and Pot. Loss separately; selected date/plant scope shown. All-source totals are allowed only for all-source scope. Provide status composition and ranked incidents using source risk scores.
- Detailed scenario section: selected asset's production trend and observed run status, weekly condition chart, linked downtime from RCA/register and unresolved data issues. Label each series with its source, unit and sampling frequency.
- Separate utility illustration area displays Energy, Energy Intensity, Emissions and forecast. Actual-baseline mode shows unavailable utility metrics honestly; illustrative mode explicitly says 'Illustrative utilities scenario - not company measurements'. Never add simulated figures into baseline portfolio totals.
- Every KPI has a 'Definition & source' drawer with formula, period, units, source file/sheet/range, proposed owner status and warnings. Distinguish source-stated KPI (e.g. PM compliance) from recomputed or demo-measured KPI.
- Main decision CTA: 'Open prioritized issues'. A selection carries plant/asset/time context into the queue and investigation.

### Data & KPI Map

- Inventory shows the 16 baseline data files plus explanation, official references and note classifications. Source relationships: plant -> asset -> observation; incident -> explicit links -> report; problem -> actions -> verification.
- Cardinality checks show 226 AR placeholders and the two duplicated AR identifiers. Preserve raw `n/a`, normalize to null in app identifiers and retain provenance. Join using qualified keys, never silently collapse rows by AR or tag.
- Display all metadata units, source windows, freshness relative to selected replay time, and quality findings in DATA_RULES.md.
- A conceptual dashboard-consolidation table maps production views, condition views, incident register and RCA/action views to governed capabilities. Its heading says 'Proposed consolidation - existing dashboard inventory not supplied'. A draft owner/definition is 'Proposed', never 'Official'.
- Unknown mappings are needs-review records rather than silently imputed values. Current unit conflict blocks only invalid comparisons, not every read of that asset.

### Problem Tank

- Two explicit tabs: historical register incidents; derived condition alerts for selected scenario replay. They have different source and status semantics.
- Create one alert episode per asset/parameter family or grouped breach, not a new case every sample. Preserve supporting sample IDs, breach conditions and first/last observed times. Acknowledge/group/reopen must work without duplicating episodes.
- Proposed ordering for comparable alerts: TRIP before ALARM; source criticality High before Medium if available; source risk score descending if available and temporally eligible; timestamp tie-break. Never substitute a missing score with an invented value. Source-data problems get a 'Needs data review' flag and explanation.
- Episode severity comes from workbook threshold logic, preserving parameter direction (low pressure/flow is bad, high vibration/temp is bad). Current workbook thresholds are version-uncertain, so label the replay rule as source-workbook policy, not proof of historical notifications.
- Filters include plant, asset, severity, source, status, risk and time. Cards show operational context; no unsafe automatic trip/maintenance action.

### Investigation

- One case view combines asset identity, operational chronology, separate hourly/weekly charts, register record, similar incidents, probable causes, contradictory evidence, missing checks and action drafts.
- Similar-incident retrieval uses component, equipment type, mechanism text, title and context, not only same asset tag. Explain matched terms/attributes. Rank is relevance; do not present percentages as likelihood.
- The report corpus includes all five RCA decks, source slide IDs and text. Use structured evidence IDs. Display the exact source excerpt for a citation. Report conclusions are 'Historical RCA finding'; model conclusions remain 'Hypothesis'.
- Default historical-review mode may cite the completed report and explain known findings. Optional pre-event replay is restricted to eligible observations/register summaries and earlier knowledge. Current-event report is entirely excluded there because its availability date is unknown and it contains post-event findings. Global historical stats/labels must not leak into prospective agent context.
- Analysis stages: collect eligible evidence (deterministic), retrieve related records (deterministic), compose hypotheses (LLM or explicitly labeled evidence replay), validate citations/numbers (deterministic), engineer review, draft actions.
- Show analysis progress with brief result summaries. Developer traces remain in a diagnostic drawer; raw prompts/tool implementation details do not dominate user screens. Request output justification, not hidden chain-of-thought.
- Known source discrepancies appear together with their sources and remain unresolved. Never 'average away' KO's weekly oil reading and later inspection sample.

### Action Tracker

- Show imported historical report actions in a read-only section with source PIC/dates/status as snapshot. Demo actions are editable separately and tagged 'Prototype workspace'.
- New action needs case, hypothesis/findings link, guidance, role/owner, priority reason, due date, dependencies, source evidence and review status. Do not guess technician names, parts inventory, estimates or execution procedure details.
- State flow: Draft -> Approved -> In Progress -> Pending Verification -> Closed. Rejected/Cancelled are explicit alternatives with a reason. Approval, review and closure roles are simulated; there is no claim of enterprise identity enforcement.
- Closure requires completion evidence and reviewer confirmation. Updating one task must not mark the whole problem or historical risk register closed. Preserve change history and permit reset of demo state.
- Derived measures: local acknowledged cases, local action completion and verified closure count. Imported case-status counts remain separate. Overdue is computed against the selected demo clock for demo tasks; imported due dates with stale snapshot status are never labeled actual overdue today.

## 4. Utilities illustration and forecast

No energy/emissions workbook is supplied. To demonstrate requested visibility without inventing actual figures:

1. Default cards show missing baseline coverage and proposed source contracts (interval, meter, consumption, unit, product output, emission factor source).
2. Offer an explicit isolated illustrative mode. Codex creates deterministic sample utility readings from a documented generator, seed and editable assumptions. Every generated point carries `data_kind=synthetic`, generator version and assumption IDs. Do not pretend sample constants are industry standards or company measurements.
3. Use a simple next-24-hour persistence forecast equal to the last 24 available hourly readings' mean. Horizon/algorithm are design choices, not observed results. Label forecast clearly and show source window. No calibrated confidence interval or claimed accuracy; optional hindcast metrics can be computed only on synthetic holdout and labeled as such.
4. Emission = sample energy x explicit user-editable illustrative factor, with declared units. No legal limit/real factor may be guessed. Intensity needs a matching output and time window; mark unavailable if denominator is missing/zero. Avoid attaching unrelated PM equivalent throughput to real energy intensity.
5. Illustration never triggers actual-baseline alerts, modifies real register rows, or feeds the probable-cause analysis unless the entire case itself is labeled synthetic.

## 5. Technical plan and AI integration

Use a single local Next.js + TypeScript application. Select compatible dependencies after checking installed runtime and current official documentation; create a lockfile. Use chart/table libraries only as needed. A separate FastAPI service is not required for this prototype. A local JSON snapshot is sufficient; use provided extraction/provenance. Keep utility generator and app data transformations deterministic.

- Normalize original files at build/import time; browser gets only needed views, not arbitrary filesystem access. Original source downloads, if added locally, use a fixed whitelist and safe route, not untrusted paths.
- Action workspace and proposed KPI-owner edits may persist in localStorage for prototype; import version migration, clear/reset and reload behavior are required. Explain local demo persistence in README, not as production-grade multi-user operations.
- Optional live analysis route runs only server-side. Env: `AI_BASE_URL=https://ai.sumopod.com/v1`, `AI_API_KEY`, `AI_MODEL`. Base URL came from the user; compatible endpoint behavior and exact model are unverified until a real authorized request succeeds. Never guess model ID, quotas or provider features.
- Prefer ordinary chat-completion messages with compact evidence. Capability-specific options (json_schema, streaming, embeddings) require verification; validate returned JSON with a schema regardless. Existing source retrieval can be lexical and deterministic; no vector database is required to make 5 reports/380 incidents usable.
- Output schema: caseId, mode, asOf, summary, hypotheses[{id,title,evidenceIds,counterEvidenceIds,missingChecks,strength}], actions[{title,guidance,evidenceIds,proposedOwnerRole,approvalRequired}], limitations. Strength is qualitative and uncalibrated. Citations reference available evidence IDs, never fabricated documents.
- Numerical facts should be rendered from authoritative evidence objects. Reject or flag new model-supplied numbers not present in eligible evidence. Logs exclude API keys and private token-bearing URLs; errors show actionable messages.
- Evidence-replay fallback is always available; display 'Evidence replay - no live AI call'. API failure never becomes a fake success. Add timeout, bounded retries only for transient failures, and request cancellation.

The Microsoft repository supplies a reference pattern for specialized sequential agents and observability. Use three capabilities: rule-based triage, evidence-based RCA composition, action planning. Distinct agents/processes are optional implementation choices. Do not import tire data, OEE assumptions, inventory or Azure infrastructure as case evidence. Attribute reused source code with the included license.

## 6. UI and demo

Product language: English. Style: restrained industrial operations interface; dark navy navigation, light high-contrast content, clear typography, readable compact tables, distinct warning/critical states with icons and text. No decorative plant imagery or fictional company logos. Support desktop 1440px and usable 1024px layouts. Keyboard navigation, visible focus, adequate contrast and non-color status signals matter.

Seed guided story:

1. Executive Overview: explain register scope; select KO-3201 historical scenario.
2. Open its warning, show weekly 22 April evidence and source threshold interpretation.
3. View hourly metadata separately and show blocked vibration-unit comparison.
4. Run historical-review analysis; inspect references and similar-incident results. Display cooler-leak conclusion as report finding after inspection, not a successful prior prediction.
5. Engineer reviews action draft, chooses demo owner/date, approves and records verification.
6. Optional short HE-3301 contrast: OFF with nonzero plant rate; utility illustration as scope extension if demo time allows.

The committee video limit is 3 minutes. The internal PDF is not the 7-slide deck. A suggested 180-second story budget is only a planning assumption: overview 25s, data lineage 20s, investigation 60s, action 45s, utility/closing 30s. Team may revise pacing.

## 7. Success, competitiveness and roadmap

Do not claim measured reduction in downtime/decision time or ROI. Historical register losses describe exposure, not avoidable savings. Pilot success measures: time to find correct evidence; citation validity; coverage of source mapping; engineer-reviewed hypothesis usefulness; priority agreement; percentage of actions closed with verification. Capture definitions and measurement plan before proposing numeric targets. Report a study result only after an actual test.

This direction fits all five rubric dimensions in design. Prototype quality and presentation quality cannot be proven by this specification; feasibility still depends on working code/provider integration; chemical relevance should be shown with compressor lubrication, fouling, spare-train context and asset-vs-plant effects. Rubric weights and competitor submissions are unknown. No ranking or winning probability is defensible.

Differentiation to demonstrate: KPI provenance and disagreement handling; transparent limits of AI knowledge; temporal replay without future evidence; full link from issue to verified action. These improve evidence of usefulness. Dashboard + RAG + agents alone are common patterns already in the Microsoft reference and are not a novelty claim.

Proposed roadmap (design proposal, not company commitment): local prototype and user walkthrough; small pilot with domain engineers and KPI owners; operational integration with historian/CMMS and utility meters; validation of alert policy and evidence workflow; only then consider scheduling/procurement and validated failure prediction. Production would require identity, authorization, audit, data retention, IT/OT boundaries and engineering change review beyond this prototype.
