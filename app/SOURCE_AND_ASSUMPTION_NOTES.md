# Source and assumption notes

Authoritative hierarchy: official casebook/booklet → original baseline files in context → supplemental meeting summary → design assumptions → Microsoft workflow reference. Original conflicts remain unresolved. The note is a user-provided summary, not a verbatim committee transcript.

## Normalization and identity

Transformation `caliber-v1-595574f659c8` uses the supplied JSON and verified original workbooks. Original 22 source files and all 16 baseline files are unchanged. Stable incident IDs preserve original row numbers 4–383. Raw `n/a` remains intact with null usable AR. Reused AR identifiers never deduplicate records. The five report joins require AR, tag, plant and source event date, and a unique source row.

Financial aggregation uses integer hundredths of k US$. Downtime aggregation uses integer tenths of h, matching the source precision. Filtered aggregates are recomputed. Original register totals: 380 rows, 2261.1 h downtime, Act. Loss 61886.46 k US$, Pot. Loss 5307.97 k US$, Total Loss 67194.43 k US$. All-source dates 2024-01-04 to 2026-07-25. These are historical exposure columns; total exposure and historical loss are not recoverable savings or observed benefits.

Evidence IDs are stable asset + grain + source row/range, or asset + report slide + shape. Every ID retains the exact source filename and location. Report blocks keep shape IDs; RCA slide 9 action relationships were checked in the original PPTX XML and rendered as four structured rows. Other slides preserve ordered source blocks with individual citations and the original download. Text extraction is not a recreated slide layout.

## Source measurement scopes

| Asset    | Hourly production window     | Weekly readings | RCA slides | Key boundary                                                       |
| -------- | ---------------------------- | --------------- | ---------- | ------------------------------------------------------------------ |
| PU-2101B | 1–30 March 2026; 720 samples | 26              | 11         | Flush alarm source statements disagree                             |
| KO-3201  | 1–30 April 2026; 720 samples | 26              | 11         | MM/S vs micron; weekly/report samples; uncertain threshold version |
| HE-3301  | 1–30 May 2026; 720 samples   | 26              | 11         | 13 OFF samples, nonzero plant rate, 12 h reported downtime         |
| BL-5702  | 1–30 June 2026; 720 samples  | 26              | 11         | Alignment/coupling findings are retrospective                      |
| PM-4405B | 1–30 July 2026; 720 samples  | 26              | 11         | Equivalent throughput and conflicting standby narrative            |

Dates/timestamps are source-local with unknown timezone. Availability and PM compliance are source-stated with limitations. No OEE, RUL, probability or prediction confidence is produced.

Source-workbook threshold replay uses a whitelist parser for OR comparisons (`C`–`F`, `>=`/`<=`, numeric constants), never Excel execution. A grouped condition family yields one episode per asset, retaining all breach sample IDs and first/last dates. Proposed ordering: TRIP → High criticality → eligible source risk descending → latest sample. The policy and effective dates are not operationally validated. Grouped counts are weekly classifications, not notifications or ignored alerts.

## Temporal and AI policy

Observation and report availability are distinct. In pre-event illustration, source observation time is the eligibility proxy; actual ingestion history is unknown. Date-only samples are eligible only at the end of their source-local date. All current-event-day/later observations are excluded even if a later as-of is selected. Current RCA and all other reports are excluded because publication availability is unknown. Every observation remark is removed. Current register outcomes, status, source risk, financial exposure, summary KPIs and historical CAPA are excluded from this mode.

Earlier register retrieval is conservatively excluded in prospective analysis because availability/revision timestamps were not supplied. Historical mode supplies lexical retrieval across all 380 rows. Relevance uses term overlap with extra component weight, with no probability interpretation. Unknown report links remain register-only.

Live AI sees a compact server-built bundle of evidence IDs used by canonical candidates. It can select/reorder candidates, with strict schema, citation and claim validation. Numbers and exact source excerpts render from canonical evidence; extra narrative numbers, staff/stock, operating commands and new procedures are rejected. This constrains creativity and may cause replay fallback for otherwise plausible provider prose. It does not establish diagnosis accuracy. Provider transport/model support and successful real calls remain untested without credentials and an exact model.

## Proposed roles and workspace

Plant manager, Reliability engineer, Maintenance reviewer, Engineering reviewer and data stewards are proposed personas/roles. Owner/date choices are local demonstration inputs. Closure requires completion text and simulated engineering reviewer confirmation. No real maintenance work, identity controls or audit certification is demonstrated. Imported PIC codes are exact historical source values; no technician names are invented. Work, stock, duration and execution procedures remain unknown.

## Isolated synthetic utility registry

All values below are editable illustration assumptions, not company data, industry standards or legal limits.

| Assumption ID suffix | Default | Unit / meaning                                      |
| -------------------- | ------: | --------------------------------------------------- |
| seed                 |    2026 | Unsigned integer LCG seed                           |
| baseKwh              |     100 | Illustrative hourly center, kWh                     |
| variationKwh         |      12 | Illustrative variation amplitude, kWh               |
| outputTon            |      10 | Output in each matching synthetic hour, ton         |
| factor               |     0.4 | Illustrative kg CO₂e/kWh; no real factor provenance |

Generator `illustrative-utilities-v1`: 72 history hours indexed 0–71. Each step updates unsigned `seed = (1664525 × seed + 1013904223) mod 2^32`, uses `u = seed / 2^32`, and emits `max(0, baseKwh + variationKwh × (sin(hour × π / 12) + 0.4 × (u − 0.5)))`, rounded to three decimal kWh places. Matching synthetic output is `outputTon` each hour. Every sample carries `data_kind=synthetic`, generator version and all five assumption IDs. The seed is reproducibility metadata, not a physical measurement.

Energy = sum of 72 synthetic hours. Intensity = energy / matching output; missing for zero output. Emissions = synthetic energy × editable illustrative factor, in kg CO₂e. Next-24-hour persistence forecast equals the mean of the last 24 available history values, hours 48–71. Each forecast point has synthetic kind/version/assumption IDs. Forecast horizon and method are design choices. No confidence interval, legal limit, real-company emissions or forecasting performance is claimed.

Utility generator state never enters register aggregation, source episodes, retrieved incidents or AI evidence. Returning to baseline restores unavailable utility cards. This is a demonstration of the integration contract, not an evaluated forecasting model.

## Proposed pilot

Measure time to find correct evidence, reviewed citation validity, engineer usefulness, priority agreement and verified closure fraction among completed actions. Establish a representative baseline and agreed review criteria before targets. No benefit, ROI, safety validation, improvement percentage or competition standing has been measured.
