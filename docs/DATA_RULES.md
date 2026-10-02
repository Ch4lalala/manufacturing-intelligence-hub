# Data, evidence and claim rules

All figures below were recalculated from original files on 2 October 2026. Re-run `scripts/audit_sources.py`; derived outputs are supporting artifacts, originals take precedence. Preserve source units and raw representations. The package includes the complete 16 baseline data files, one explanation PPTX, one supplemental meeting summary, two official PDFs, and two Microsoft reference files.

## Verified register figures

Source: `sources/baseline/incidents/Incident Database.xlsx`, sheet `Incident Database`, header row 3, data rows 4-383. Units: hours; monetary columns in k US$.

| Measure | Exact value | Meaning |
| --- | --- | --- |
| Records | 380 | Register rows, not failures of five demo assets |
| Downtime column sum | 2,261.1 h | Sum across incidents, not demonstrated avoidable plant shutdown |
| Act. Loss sum | 61,886.46 k US$ | Source column label; not an externally audited realized cash figure |
| Pot. Loss sum | 5,307.97 k US$ | Potential loss, not actual spend or savings |
| Total Loss sum | 67,194.43 k US$ | Exactly Act. Loss + Pot. Loss on each row |
| Register dates | 2024-01-04 to 2026-07-25 | Different scope from individual 2026 hourly scenarios |
| Plants | 12 | Source labels, not verified actual company facilities |
| Unique tags | 379 | Same-tag retrieval alone offers little repeat-incident coverage |
| Missing usable AR identifier | 226 | Literal `n/a`, not blank Excel cells; preserve original |
| Reused nonmissing AR identifiers | 2 identifiers, each on 2 rows | Qualified join needed; never use AR alone as row primary key |

Register statuses: 113 RISK CLOSED; 92 CA/PA EXECUTION; 71 RCA PROCESS; 47 RISK CANCELED; 37 MONITORING RESULT; 20 NEW REGISTERED. These are source snapshots, not a measured overdue backlog. Five detailed cases (rows 4-8) sum to 84.5 h downtime and 2,584.84 k US$ Act. Loss. This small curated sample is not representative of all equipment reliability or model prediction accuracy.

## Original source schema

- Incident workbook: `Dashboard` summary and `Incident Database` detail. Read actual detail rows rather than trusting hardcoded highlights or cached summary alone. Column names are in `processed/incidents.json`.
- Five production workbooks: `PI Tag` rows 2-8 for tag/unit metadata; `Sheet2` rows 2-721 for 720 hourly records each. Windows differ: PU March, KO April, HE May, BL June, PM July 2026 (30 days in each supplied file; do not infer complete month where calendar has 31 days).
- Five equipment workbooks: `Equipment Info` identification/limits; `Condition History` rows 2-27 for 26 weekly observations; `Performance Summary` source-stated KPIs/formulas. Health formula is OR-based breach classification; extraction uses a whitelist parser and never executes arbitrary Excel code.
- Five RCA decks: 11 slides each. Source chapters include chronology (3), past performance/impact (4), 4P (6), 4M+1E/root cause (7), actions (9), preventive/risk/PM (10), closure summary (11). Extraction preserves slide/shape and table data. Repeated decorative/footer text must not become independent evidence.
- Explanation deck: five slides. It helps explain intended usage; numerical highlights/marketing conclusions do not override original records or prove preventive performance.
- Meeting `.txt`: user-provided summary with `[cite: 1]` tokens whose underlying citation source was not supplied. Treat as supplemental, not verified verbatim transcript. It says all five RCAs should be accessible, weekly/hourly measurements differ, participant KPIs/dummy data/batch processing allowed.

## Data-quality register

| ID | Source finding | Required implementation |
| --- | --- | --- |
| DQ01 | KO3201_VIB metadata `PI Tag!D4` says MM/S; equipment weekly header `Condition History!C1` says micron | Preserve both, mark incompatible/needs review, no automatic unit conversion or shared alarm line |
| DQ02 | KO weekly 22-Apr A21:H21: 71.674 micron, 1372.791 ppm; 29-Apr A22:H22: 76.5 micron, 1530 ppm. RCA2 slide 3/6 cites a later sample of 1800 ppm and a different vibration chronology | Display each value with measurement source/time; unknown exact comparability is unresolved, never replace or average them |
| DQ03 | KO workbook alarm 45 micron (`Equipment Info!D5`); RCA2 slide 7 says prior alert was 60, slide 10 recommends tightening to 45 | Version/effective date unknown; replay uses documented workbook policy only, not proof of historic alarm dispatch or lead time |
| DQ04 | HE hourly RUN_STATUS OFF has 13 records and PLANT_RATE 12.094-12.397 T/H; RCA4 downtime 12 h | Asset status, sampled OFF count, reported downtime and plant loss are distinct; 13 samples do not overwrite 12 h RCA |
| DQ05 | PM hourly OFF samples have near-zero PLANT_RATE (0-0.104 equivalent T/H), but RCA3 slides 3/4 say standby pump maintained supply with reduced margin | Preserve disagreement; no unsupported claim of total plant shutdown or successful continuity from hourly values alone |
| DQ06 | Performance Summary uses 4368 h = 26*7*24; first-last weekly timestamp interval spans 25 weeks | Source availability is a stated convention, not verified planned-operation availability. Do not silently rebase denominator |
| DQ07 | All five Performance Summary!B14 values are 92% PM compliance; no PM work-log inputs supplied | Show source-stated value with validation caveat; no claim recomputed compliance or increased compliance |
| DQ08 | Equipment Info!B11 contains generic bearing/seal design-life wording even for HE | Do not treat generic source metadata as validated technical design basis or calculate remaining life |
| DQ09 | 226 Incident Database AR values are `n/a` | Raw `n/a` retained; normalized usable identifier null; do not drop those incidents from queue/retrieval |
| DQ10 | AR-2026-OP2-0171 reused on Serial 129/331; AR-2024-ZCU-0236 on Serial 133/188 | Stable row IDs + qualified AR/tag/plant/date links; two unrelated rows must not merge |
| DQ11 | ALARM reading counts before first TRIP: PU 6, KO 11, PM 6, HE 10, BL 15 | Counts of formula-classified weekly readings, not unique notifications, ignored warnings or proven opportunities to prevent failure |
| DQ12 | Explanation deck slide 3 highlights US$67.2M 'losses'; original Total Loss includes potential | Use exact raw columns and label Act./Pot. separately. Do not turn total exposure into realized loss or solution savings |
| DQ13 | Post-repair remarks may say CAPA executed while RCA action plans show open/in-progress items | Separate repair completion, individual CAPA progress and risk-case closure; don't label overdue without authoritative dates/history |
| DQ14 | PU RCA1 slide 3 describes flush low-flow alarm, slide 7 says no trip/alarm on loss of flush | Present conflicting source statements. Do not silently infer which event/control was present |
| DQ15 | Original files lack energy/emission meters/factors, legacy dashboard inventory, technician schedules, parts stock, acknowledgement logs and measured benefit results | Explicit missing coverage and proposed integration contracts; any generated sample values are synthetic, not asserted facts |

## Temporal and semantic integrity

Do not sum hourly rates across nonmatching asset windows; do not represent them as simultaneous plant operations. PM throughput unit includes `(equiv.)`; preserve it. Avoid double counting multiple tags that might describe one plant flow. Source file names/code labels do not establish stream aggregation rules.

Do not calculate OEE, savings, greenhouse-gas compliance, probability of failure, verified lead time, validated RUL or forecast accuracy from these files. The needed input/validation is absent. Annualizing the register or five examples is unsupported.

Record date availability and observation time separately. Prospective evidence excludes future data and entire current-event RCA. Earlier RCA publication availability is also unknown; use explicit allowlist of earlier reports only as illustrative historical knowledge, disclose the assumption, or exclude them conservatively. Retrospective review must visibly reveal the known historical outcome.

Extracted text is not necessarily full visual fidelity; table relationships and report context matter. Raw reports remain available. Source evidence IDs need stable source file + sheet/range or slide/shape. A citation must open the cited information, not merely a filename.

## Utility illustration and financial claims

There are no verified utility numbers in this package. A later Codex-generated utility demo needs a versioned assumption registry, deterministic generation and synthetic labels at each chart/KPI. No copied company emission factor or legal threshold without an authoritative source. Default baseline cards remain unavailable; simulation is isolated.

Historical losses are exposure, not guaranteed recoverable value. Proposed improvement targets must be labeled hypotheses. Pilot results, reduction percentages, ROI, forecasting/AI accuracy, latency and jury scores are absent. Never populate them with plausible-looking values.

## Source precedence and changes

Official casebook/booklet > original dataset facts in context > supplemental meeting summary > our design assumptions > Microsoft technical reference. If original files disagree, show the conflict and choose the relevant source explicitly; priority does not erase contradictions. Proposed controls/owners must be labeled proposed.

SHA-256 inventories freeze the sources included here. `source_origins.json` lists URLs and retrieval metadata. Source snapshots may change externally; Codex must not mix new live downloads with old normalized totals without rerunning the audit and reporting the difference. Earlier problem-identification document is background work; this source audit supersedes its shorthand 'blank AR' with literal `n/a` and adds duplicated AR/conflict findings.
