# Data contracts for the implementing Codex

The existing JSON files are source extraction snapshots, not a finished app schema. Preserve them and transform into app-facing types. Read originals when the extraction does not establish table context. Times in the baseline have no explicit timezone: retain source-local timestamps, disclose timezone unknown, and do not silently shift them to UTC.

## Existing extraction shape

| File | Shape and purpose |
| --- | --- |
| assets.json | Array of five objects. Fields include tag, name, plant_text, class, criticality_source, ar, thresholds, condition_headers, conditions, production and source references. Inspect the actual keys before implementation. |
| incidents.json | Array of 380 objects: id (`incident-row-N`), values (original column labels), source (file/sheet/cell). Values are raw representations. |
| workbook_extraction.json | Object keyed by relative source filename, with sheets/values/formulas. Preserves original row/column relationships and cached formula values. |
| presentation_extraction.json | Array of six decks, each file/slides/blocks. Blocks preserve shape IDs and text or table rows; slide numbering starts at 1. |
| official_text.json | Two PDF objects with pages numbered from 1. Extraction supports reading; original PDFs remain authoritative. |
| source_inventory.json | Array of 22 immutable source path/bytes/sha256 objects with worksheet/slide/page profiles where applicable. |
| verified_metrics.json | Recomputed totals, status counts, five asset counts, first-trip evidence and KO sample. Do not reuse full-register totals after filtering. |
| source_origins.json | Origins, retrieval date and authority notes. Retrieval date is not the historical availability date of a report. |

## Proposed app entities

These are design contracts, not company database claims.

- **SourceLocator**: file; optional sheet/cell or slide/shape; evidenceId; excerpt; `dataKind` (source/computed/proposed/synthetic); observationTime; availabilityTime (nullable); unit; warnings. Use stable IDs based on source path and location. Synthetic sources instead identify generator/assumptions.
- **Incident**: immutable source-row id; raw AR; usable AR (null for `n/a`); tag/plant/eventDate; source risk/status; component/mechanism; downtimeHours; actual/potential/totalLoss in explicitly named k-US$ fields; locator. Do not overwrite source status with workspace progress.
- **Asset**: exact tag plus reviewed source plant mapping; source criticality; explicit report/incident links. For the five reports, join by AR plus tag plus plant/date checks. For other rows, no detailed RCA is assumed.
- **Observation**: assetId; timestamp; samplingGrain; measurements with parameter/unit; source status/formula; locator. Hourly and weekly records are separate collections, not interpolated one-for-one matches.
- **KPI**: id; value or missing state; unit; period/filter context; formula; provenance; proposed owner; source/computed/synthetic status; caveats. Monetary aggregation uses decimal arithmetic or integer hundredths of k US$ to avoid binary rounding drift.
- **AlertEpisode**: id; source policy/version-uncertainty; asset; parameter family; supporting sample IDs; first/last observed time; severity; review status; priority tuple and explanation. Condition status is not proof of actual alarm delivery.
- **EvidenceBundle**: mode; asOf; eligible evidence; exclusions and reasons; contradictions; deterministic retrieval matches. Build it on the server before the model request. Never send the whole corpus in prospective mode.
- **Hypothesis**: id; title; evidence IDs; counter-evidence IDs; missing checks; qualitative strength; historical-finding vs proposed-hypothesis label; review state. Do not store unvalidated model numbers as facts.
- **WorkspaceAction**: id; case/hypothesis; guidance/source; simulated reviewer and owner role; dueDate; clockBasis; state; change history; completion evidence; verification reviewer. Missing real staff/parts/time estimates remain unknown.

## Scope and eligibility invariants

1. A register filter and a selected asset scenario have separate clocks/scopes. Every aggregate shows its scope. Events from 2024-2026 do not become a simultaneous April 2026 operating snapshot.
2. As-of eligibility is checked before retrieval, summary generation, model request and rendering. Exclude current-event report entirely in prospective replay. Unknown report availability means excluded by default; an explicit illustrative earlier-knowledge allowlist must be labeled as an assumption.
3. A source excerpt can contain future facts even when the underlying deck mentions an earlier date. Whole-deck availability and excerpt content both matter.
4. Unknown units block arithmetic comparisons. Merely matching the word 'vibration' does not establish interchangeability between velocity MM/S and displacement micron.
5. Source financial data is scenario exposure. Synthetic utilities and local workspace activity never enter raw incident totals.
6. Derived data includes transformation version. Re-import invalidates or migrates local actions explicitly; never silently join stale workspace IDs to a new source version.

## Provider response handling

Validate model JSON against the schema in SOLUTION_SPEC.md. Evidence IDs must resolve to eligible objects. Render numeric evidence from canonical source objects; narrative numbers must match a permitted fact with the same unit/context or be flagged/removed. Valid JSON alone does not establish correctness. Unsupported recommendation details remain proposals requiring engineering review. Provider errors and missing env select a visible replay state.
