# Source audit report

Prepared 2 October 2026. This checks the competition source snapshot and extracted facts. It does not test a built app, forecast, AI model or operational outcome.

## Passed source checks

- 22 source snapshot files present: 16 original data baselines, one explanation deck, one supplemental meeting note, two official PDFs and two Microsoft reference files.
- Data-baseline split: 5 production workbooks, 5 equipment workbooks, 5 RCA decks and 1 incident register.
- Original worksheet values, formulas and cached values extracted with source coordinates; 6 presentations extracted with slide/shape/table context; 2 official PDFs extracted page-by-page.
- 380 register rows retained. Monetary sums use Decimal during the audit. Every Total Loss row equals Act. Loss + Pot. Loss.
- 226 usable AR identifiers absent as literal `n/a`; two nonmissing AR identifiers are reused. No records removed or merged.
- All five assets have 720 hourly records, 26 weekly records and an 11-slide RCA deck. Weekly classifications recomputed only with the whitelisted source formula grammar and checked against source caches where present.
- Five original RCA-to-incident links checked by AR/tag/plant/date context.
- Numerical results and source ranges in processed/verified_metrics.json; source byte sizes/SHA-256 and source profiles in processed/source_inventory.json.

## Findings requiring visibility, not numerical repair

15 findings are listed in docs/DATA_RULES.md, including KO units/threshold versions/oil samples, HE asset-vs-plant status, PM continuity discrepancy, availability/PM assumptions, missing/reused AR identities, loss semantics and conflicting report control/CAPA statements.

## Verification boundaries

Extraction is not independent verification of industrial truth. Original files are competition scenarios; source-stated data may conflict. Reading values successfully does not prove sensor correctness, historical alarm dispatch, predictive capability, actual loss accounting or action effectiveness. PPTX visual content remains accessible through the original decks.

The prototype and live API are not built/tested in this package. The implementing Codex must populate app/IMPLEMENTATION_STATUS.md against docs/ACCEPTANCE.md.

## Reproduction

1. Run `python scripts/verify_package.py` before re-extraction.
2. Install read-only dependencies from scripts/requirements-audit.txt if unavailable.
3. Run `python scripts/audit_sources.py` and compare verified_metrics.json to this snapshot.
4. Keep any changed source snapshots separate and document differences; do not overwrite the original hash baseline to hide a change.
