# Source integrity — 2 October 2026

The required initial command was run before any extraction or app data transformation:

```bash
cd /Users/acit/Documents/MyWork/CALIBER_Codex_Handoff
python scripts/verify_package.py
```

It returned exit **1** with:

```text
Original source snapshot: 22 files checked; 0 discrepancies
Handoff package: 46 files checked; 2 discrepancies
size changed: CODEX_PROMPT.md
hash changed: CODEX_PROMPT.md
Verification FAILED. Review differences before using source-derived claims.
```

Both reported discrepancies concern the same handoff instruction file, which was already changed when implementation began. No original source is missing or changed. All 16 baseline data files, explanation, supplemental summary, two official PDFs and two reference snapshots match the source inventory. All other manifested handoff files, including the authoritative specifications and factual extraction snapshots, match their manifest.

| CODEX_PROMPT.md | Manifest                                                           | Present file                                                       |
| --------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Bytes           | 9490                                                               | 9413                                                               |
| SHA-256         | `8f4caf5a553c34bdc2707a6f28530e123cfdaca8fd547ecd74b76b1430db5d40` | `170a155f23004b7553916df7b7ec62bbafb03337fa31811d98523e6258563022` |

Disposition: preserve the present file and original manifest; use the current user instruction and intact authoritative docs. The prior prompt bytes are unavailable, so the edit's exact textual origin is not asserted. This instruction-file discrepancy does not invalidate baseline totals. The **full package verifier does not pass**, and its discrepancy is not hidden or “fixed” by changing expected hashes.

App transformation `scripts/normalize.py` independently checks all 22 originals before reading workbook data, checks every manifested file and allows only this explicitly recorded prompt discrepancy. It verifies each of the 380 original register rows against extraction values, all weekly measurements/statuses, and all hourly numerical/status fields. It reads original Performance Summary caches and preserves their exact source conventions. Original PPTX XML was inspected for report chronology, findings and action-table relationships. Requested official PDF pages were read from the original PDFs using `pdftotext` after the hash check.

Original register recalculation with Python Decimal reproduced 2261.1 h downtime, Act. Loss 61886.46 k US$, Pot. Loss 5307.97 k US$ and Total Loss 67194.43 k US$. All 380 source row identities and the qualified five report links survive normalization. No supplied source or extractor output was overwritten, and the supplied extractor was not rerun. New `app/` files are allowed by the package verifier.

Full inventory, expected hashes, current instruction-file discrepancy and original-recalculation totals are stored in `data/normalized.json` under `inventory` and `integrity`. Re-run the original verifier if sources move or change; identify affected files before making source-derived claims.

## Repair recheck — 3 October 2026

The initial repair integrity command again checked 22 originals with zero discrepancies and 46 handoff files with the same two size/hash discrepancies for CODEX_PROMPT.md. No original or authoritative fact file is missing/changed. Branch main, reviewed/current HEAD 3759e2efc21e5e1727022bfd487066d4fb7fbb45. The user's existing next-env.d.ts edit and untracked repair prompt were preserved. The private .env.local was neither opened nor modified.

`npm run normalize` again reconciled all 380 register rows and full hourly/weekly observations against originals; normalized JSON is unchanged. `prepare:runtime` verifies original sizes/hashes before creating runtime copies and verifies workbook extraction against the original manifest. No extractor was rerun and no expected manifest hash changed. Generated copies are ignored, server-only, and verified again for original downloads. Artifact-only production verification confirms all 22 downloaded originals match their inventory hashes; see verification/deploy-runtime.json.
