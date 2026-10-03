# CALIBER — laporan redesign visual

Tanggal: 3 Oktober 2026. Checkout awal `main` / `41fffaf12413245796f075de6fe5551bed123fbb`, bersih. Perbaikan scope evidence Action Tracker pada HEAD dipertahankan. Pekerjaan ini disiapkan untuk review lokal, tanpa commit/push/deployment.

## Keputusan desain

Industrial SaaS light mode menggantikan navy/teal lama. Canvas #F7F9FC, surface putih, primary #2563EB, teks #0F172A, secondary #64748B, border panel #E2E8F0. Radius kartu 16px dan shadow halus. Foreground semantic lebih gelap pada surface success/danger/warning/synthetic; teks dan ikon memperjelas status. Border input #8291A6 memenuhi target contrast 3:1; badge/tabel netral memakai #475569 agar contrast tidak turun pada #F1F5F9.

System sans memakai font lokal sehingga walkthrough tidak memerlukan font eksternal. Tags, angka dan excerpts memakai monospace/tabular numerals. CSS runtime adalah pemilik token; DESIGN.md mencerminkan nilai dan alasan. Tidak ada dependency baru atau perubahan lockfile.

| Area               | Perubahan visual / interaksi yang disengaja                                                                                                                                                                                                                          |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shell              | Sidebar putih persisten, ikon stroke konsisten, active/hover/focus states; header mengelompokkan Asset scenario dan Simulated role. Window/cutoff, timezone unknown dan review reference tetap jelas. Navigasi narrow scroll ke view aktif pada route change/resize. |
| Executive Overview | Empat KPI register tetap memiliki scope tersendiri. Tren hourly/weekly dan decision context muncul lebih awal, diikuti status/ranking register, tabel lima window aset independen dan utilities. Review scenario membuka window historical penuh.                    |
| Data & KPI Map     | Source library/coverage/quality tetap tersedia. Native KPI disclosures menampilkan nilai/status dan membuka sumber/editor owner. Preview angka memakai maksimal tiga desimal; drawer tetap menyimpan nilai exact.                                                    |
| Problem Tank       | Filter, episode cards, severity/status badges, priority reason, samples dan actions mengikuti sistem yang sama; register tetap searchable dan paginated.                                                                                                             |
| Investigation      | Urutan observations → signals → hypotheses → review → linked action terlihat. Scope/cutoff sejajar; charts memiliki legend, unit/time context dan source-formula comparison signs. Supporting/counter evidence dan missing checks dikelompokkan per hipotesis.       |
| Action Tracker     | Lifecycle memiliki current/completed text/icons; form owner/due/dependencies/evidence lebih terstruktur. Shared metric/drawer scope tidak diubah. Historical CAPA tetap read-only.                                                                                   |
| Dialog/feedback    | Sticky Close, metadata grid, warning yang tetap terlihat dan excerpt keyboard-focusable. Document scroll terkunci saat modal terbuka. Loading/error/disabled/busy/success serta reduced-motion memakai shared primitives.                                            |

Grafik hanya merender observations yang tersedia. Hourly dan weekly tetap terpisah. Tidak ada FFT/spectrum, waveform sensor dekoratif, rolling real-time controls, uptime/OEE/RUL, savings atau fleet status yang dibuat-buat.

## File yang berubah

- `src/app/globals.css`: tokens, shell, primitives, tables/forms/charts/dialogs, feedback dan responsive states.
- `src/components/icons.tsx`: ikon SVG bersama, tanpa dependency.
- `src/components/ui.tsx`, `hub.tsx`, `chart.tsx`: canonical primitives, aligned context, native popup behavior, legend/inspection/readings dan modal access.
- `src/components/overview.tsx`, `data-map.tsx`, `investigation.tsx`, `actions.tsx`: hierarchy, disclosure dan evidence/workflow presentation. Problem Tank, utilities, evidence panels dan demo-access memakai shared styling yang baru.
- `tests/domain.test.ts`, `tests/browser.spec.ts`: tambahan token/contrast, render/navigation/download/loading/threshold/busy/cancel checks; assertions lama tetap ada. Owner test membuka disclosure sebelum mengedit; KO closure juga dijalankan pada 390px.
- `DESIGN.md`, `UX-CONTRACT.md`, `README.md`, `IMPLEMENTATION_STATUS.md`, `REPAIR_REPORT.md`, laporan ini, `screenshots/` dan `verification/`.

`src/lib/actions.ts`, temporal/retrieval/validation/domain modules, API routes, factual normalized JSON, originals, manifest, `.env.local` dan provider credentials tidak diubah. Next-generated next-env.d.ts dipulihkan ke bytes awal setelah build.

## Perilaku yang dipertahankan

Lima views dan lima aset, seluruh 380 incident rows, 226 literal n/a serta qualified joins. Monetary units k US$ dan exposure actual + potential tetap terpisah dari savings. Konflik KO (unit/samples/alarm), HE (OFF samples/plant rate/downtime), PM (standby supply), reliability assumptions dan timezone unknown tetap terlihat.

Midnight/end-of-day prospective eligibility tetap sama. Current RCA, future readings dan historical outcomes tidak masuk pre-event context/results/drawers. Action cards serta metric drawers memakai actionTrackerMetrics yang sama; pending/closure evidence sesuai definisi; acknowledged episodes historical tidak bocor. State transitions, acceptance per hipotesis, approval/evidence/reviewer gates, persistence/history/reset dan imported CAPA tidak diubah.

Utilities baseline tetap unavailable; synthetic assumptions dan persistence forecast terisolasi. Live/replay/blocked/failed labels tetap jujur. Public live tetap disabled dan role/workspace completion tetap simulasi.

## Verifikasi yang dijalankan

Dari handoff root: `python scripts/verify_package.py` — **22 originals / 0 discrepancies**. Verifier package exit 1 untuk discrepancy ukuran/hash lama `CODEX_PROMPT.md`; manifest tetap utuh. Tidak rerun extractor/normalizer.

Dari app:

```bash
npm run typecheck
npm run lint
npm test > verification/redesign-domain-results.tap 2>&1
npm run build > verification/redesign-build.log 2>&1
# Isolated standalone + static copy, tanpa .env, server di temporary directory:
PORT=3103 HOSTNAME=127.0.0.1 AI_LIVE_MODE=disabled AI_API_KEY= AI_MODEL= node server.js
CALIBER_TEST_BASE_URL=http://127.0.0.1:3103 npm run test:browser > verification/redesign-browser.log 2>&1
npm run test:deploy > verification/redesign-artifact-check.log 2>&1
npm run format:check
npx -p @google/design.md designmd lint DESIGN.md
```

Formatting memakai targeted `npx prettier --write` pada files yang berubah. `git diff --check` dijalankan. Premium audit:

```bash
python /Users/acit/.codex/plugins/cache/openai-curated-remote/frontend-design-premium/1.4.0/skills/frontend-design-premium/scripts/audit_project.py /Users/acit/Documents/MyWork/CALIBER_Codex_Handoff/app --mode strict --output /Users/acit/Documents/MyWork/CALIBER_Codex_Handoff/app/verification/redesign-premium-audit.json
```

| Check                           | Hasil final / bukti                                                                                                                                                                                                                                                                          |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typecheck/lint/build/formatting | PASS; runtime originals verified dalam prebuild. Stack/lock dipertahankan.                                                                                                                                                                                                                   |
| Domain/API                      | **30/30 PASS**, [TAP](verification/redesign-domain-results.tap). Seluruh 29 tes sebelumnya plus token/document/semantic contrast.                                                                                                                                                            |
| Production browser              | **17/17 PASS**, [hasil](verification/browser-results.json), [log](verification/redesign-browser.log). Seluruh 15 regresi sebelumnya plus render/download/loading/threshold dan mocked live busy/cancel.                                                                                      |
| Artifact-only local runtime     | **53/53 PASS**, [hasil](verification/deploy-runtime.json), [log](verification/redesign-artifact-check.log). Semua 22 downloads hash-matched, source excerpts/failure states, public guard; providerCalls 0. Ini bukan Vercel deployment.                                                     |
| Accessibility/layout            | Axe WCAG2A/AA/2.1AA nol violations pada lima views dan source dialog. 1440/1024/390 tanpa document horizontal overflow; tables own scrolling. Dialog focus/Escape/restoration, native select keyboard, disclosure edits, reduced motion, actual KO closure di 390 dan sumber PageDown diuji. |
| Design context                  | CSS/document token drift/contrast test PASS. DESIGN lint exit 0, **0 errors / 23 advisory warnings** (component metadata/orphan-token references pada format dokumen; CSS mapping diverifikasi terpisah). Premium strict audit **0 findings**.                                               |
| Visual inspection               | Lima desktop views, layout 1024/narrow, source drawer, prospective/normal-only, verified closure dan scope drawer diperiksa dari screenshot production. Forced-colors capture/keyboard excerpt diperiksa juga.                                                                               |

Putaran awal menemukan contrast netral/input dan excerpt scrolling tanpa keyboard focus; semuanya diperbaiki tanpa menurunkan assertions. Screenshot final menunggu finite control transitions selesai/dinonaktifkan saat capture agar tidak merekam highlight view sebelumnya. Hover tidak menghapus active navigation styling.

Server pengguna pada 3100/3102 tidak dihentikan. Test menggunakan standalone sementara pada 3103 tanpa private env; hanya runtime/proses test milik pekerjaan ini dibersihkan setelah verifikasi.

## Screenshot final

| View               | Desktop 1440                                              | Full page / 1024 / narrow                                                                                                        |
| ------------------ | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Executive Overview | [Desktop](screenshots/redesign-overview-desktop.png)      | [Full](screenshots/overview-1440.png), [1024](screenshots/overview-1024.png), [390](screenshots/overview-390.png)                |
| Data & KPI Map     | [Desktop](screenshots/redesign-data-desktop.png)          | [Full](screenshots/data-1440.png), [1024](screenshots/data-1024.png), [390](screenshots/data-390.png)                            |
| Problem Tank       | [Desktop](screenshots/redesign-problems-desktop.png)      | [Full](screenshots/problems-1440.png), [1024](screenshots/problems-1024.png), [390](screenshots/problems-390.png)                |
| Investigation      | [Desktop](screenshots/redesign-investigation-desktop.png) | [Full](screenshots/investigation-1440.png), [1024](screenshots/investigation-1024.png), [390](screenshots/investigation-390.png) |
| Action Tracker     | [Desktop](screenshots/redesign-actions-desktop.png)       | [Full](screenshots/actions-1440.png), [1024](screenshots/actions-1024.png), [390](screenshots/actions-390.png)                   |

State penting:

- [Prospective Investigation](screenshots/prospective-replay.png), [midnight](screenshots/repair-midnight.png), [end-of-day](screenshots/repair-end-of-day.png), [normal-only](screenshots/repair-insufficient.png).
- [Evidence drawer](screenshots/redesign-source-drawer.png), [actual KO verified closure](screenshots/ko-verified-action.png), [closure review 390](screenshots/redesign-closure-390.png).
- [Prospective zero-action drawer tanpa historical leakage](screenshots/action-scope-zero-drawer.png), [matched scoped closure fixture](screenshots/action-scope-matched-drawer.png), [narrow drawer](screenshots/action-scope-drawer-390.png). Matched fixture adalah synthetic test workspace, bukan historical baseline.
- [Loading](screenshots/redesign-loading.png), [scope error/retry](screenshots/redesign-scope-error.png), [mocked live pending/cancellation](screenshots/redesign-live-pending.png), [synthetic utilities](screenshots/illustrative-utilities.png), [forced colors](screenshots/redesign-forced-colors.png).

## Batas verifikasi

Tidak ada push/deployment dan perbaikan ini **belum diverifikasi di Vercel**. Real SumoPod endpoint/model, paid call dan provider latency tidak diuji; busy/error/session/quota paths memakai transport mock/fake. `.env.local` tidak dibaca/diedit. Tidak fresh npm ci karena dependency/lock tetap sama.

Browser yang diuji adalah Chromium lokal; Firefox/Safari, perangkat fisik/touch/virtual keyboard, full 200% zoom matrix serta studi screen reader formal belum diuji. Native picker popup appearance tetap milik platform, bukan authored geometry. Tidak ada domain engineering/safety/forecast performance atau savings validation, dan tidak ada klaim produksi/kompetisi. Dokumentasi hasil sebelumnya dipertahankan sebagai catatan historis terpisah.
