# CALIBER — penyempurnaan layout A–E

Checkout awal: main / 16acb7b81f0b106c7c9ad930c2064e3df464254b, bersih. Perubahan pengguna pada commit tersebut, termasuk authored Select dan copy produk, dipertahankan. Tidak ada commit/push/deployment. Lima attachment referensi tidak tersedia sebagai gambar yang dapat dibuka dalam sesi ini; implementasi mengikuti deskripsi A–E dan diverifikasi melalui render aplikasi.

## Perubahan dan penyebab

| Area              | Perubahan                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — sidebar       | CALIBER satu baris; edition 2026 + Case 2 badge, subtitle sekunder. Blok dekoratif prototype/review/snapshot dihapus. Reset workspace menjadi secondary button di footer berpadding; sidebar pendek scroll tanpa shrink/overlap. Konfirmasi dan batas reset tetap sama. Duplicate mobile reset di document footer dihapus.                                                                                                                                                      |
| B — Overview      | Charts/status/catalog dan decision/discrepancy/reliability/priority menjadi dua column stacks independen. Catalog mengikuti Status Composition dalam kolom yang sama, sehingga tidak menunggu Priority Incidents. Semua panel natural-height, gap 20px, tanpa spacer/fixed matching height/margin negatif. Status memiliki label/bar/count sejajar, warna semantic dan angka tabular; count/proportion berasal dari filter register yang sama. Source status keys tidak diubah. |
| C — governance    | Shared Accordion berbasis details/summary dengan ikon, chevron tunggal, hover/focus/pressed dan native expanded semantics. Tiga kelompok asli serta seluruh informasi tetap ada; isi ditata dalam definition list/urutan phase. Tidak menambahkan progres, tanggal atau klaim selesai.                                                                                                                                                                                          |
| D — Data Map      | Source Library → Data Architecture pada satu kolom; KPI Dictionary pada kolom lain; Governance dan quality gaps full-width di bawah agar accordion terbuka tidak membuat satu kolom jauh lebih panjang. Existing source list scrolling/search/download dan KPI expansion/owner editing tetap berlaku. Coverage caption menjelaskan observations eligible serta original metadata window.                                                                                        |
| E — Investigation | Weekly/hourly charts → probable review mengalir pada satu kolom; evidence/discrepancies pada kolom lain. Similar retrieval/RCA tetap full-width, tidak menjadi tabel panjang pada rail sempit. Hourly selector masuk header area chart, termasuk empty state. Seluruh unit/count/slider/readings/source/tooltip tetap tersedia.                                                                                                                                                 |

Responsiveness memakai tokens/styles yang sama. Mobile utilities menjadi satu kolom; label action/citation panjang membungkus di dalam panel. Table overflow tetap lokal. Source Library dan Data Architecture scrolling regions memiliki nama serta keyboard focus. Dialog mengunci document scroll, memfokuskan Cancel saat reset, dan mengembalikan focus ke trigger setelah Escape.

Authored Select sudah ada pada checkout awal. Penamaan/association dilengkapi: visible combobox, labelled listbox, option IDs, active-descendant dan label focus. Hidden native adapter tetap ada; tidak mengganti primitive atau callback/domain behavior. Browser tests memilih option pada popup yang sebenarnya, bukan mengubah hidden select.

## File berubah

Implementasi: src/app/globals.css; src/components/hub.tsx, overview.tsx, data-map.tsx, investigation.tsx, chart.tsx, ui.tsx; status-composition.tsx baru. Tests: tests/browser.spec.ts (17 coverage sebelumnya + empat tes refinement, viewport 1280 ditambahkan). Documentation: DESIGN.md, UX-CONTRACT.md, premium-ui.json, README.md, IMPLEMENTATION_STATUS.md, REPAIR_REPORT.md dan laporan ini. Screenshot serta verification artifacts diperbarui.

Formatter juga merapikan sembilan file yang sudah tidak sesuai Prettier pada checkout awal: src/app/error.tsx, layout.tsx, not-found.tsx; src/components/actions.tsx, demo-access.tsx, evidence-panels.tsx, problems.tsx, signal-panel.tsx, utilities.tsx. Perubahan pada sembilan file ini hanya formatting; copy dan logic pengguna dipertahankan.

Tidak mengubah lib/domain/API, normalized data, originals, manifest, package/lockfile, .env atau credentials. next-env.d.ts yang dihasilkan build dipulihkan ke bytes awal. Server pengguna pada 3100/3102 dipertahankan; test memakai runtime standalone terisolasi pada 3103 tanpa private env.

## Verifikasi aktual

Dari handoff root, python scripts/verify_package.py: 22 originals / 0 discrepancies. Exit 1 tetap untuk dua discrepancy ukuran/hash CODEX_PROMPT.md yang sudah ada; manifest tidak ditulis ulang. Tidak rerun extractor/normalizer.

Dari app:

```bash
npm run typecheck
npm run lint
npm test > verification/refinement-domain.tap 2>&1
npm run build > verification/refinement-build.log 2>&1
# Standalone + static disalin ke temporary directory tanpa .env:
PORT=3103 HOSTNAME=127.0.0.1 AI_LIVE_MODE=disabled AI_API_KEY= AI_MODEL= node server.js
CALIBER_TEST_BASE_URL=http://127.0.0.1:3103 npm run test:browser > verification/refinement-browser.log 2>&1
npm run test:deploy > verification/refinement-artifact.log 2>&1
npm run format:check > verification/refinement-format.log 2>&1
npx -p @google/design.md designmd lint DESIGN.md > verification/refinement-design-lint.log 2>&1
python /Users/acit/.codex/plugins/cache/openai-curated-remote/frontend-design-premium/1.4.0/skills/frontend-design-premium/scripts/audit_project.py /Users/acit/Documents/MyWork/CALIBER_Codex_Handoff/app --mode strict --output /Users/acit/Documents/MyWork/CALIBER_Codex_Handoff/app/verification/refinement-premium-audit.json
git diff --check
```

| Check                             | Hasil                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Typecheck / lint / build / format | PASS                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Domain/API                        | 30/30 PASS; verification/refinement-domain.tap                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Production Chromium               | 21/21 PASS; verification/browser-results.json dan refinement-browser.log                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Artifact-only local runtime       | 53/53 PASS; provider calls 0, verification/refinement-artifact.log dan deploy-runtime.json                                                                                                                                                                                                                                                                                                                                                                                                       |
| Source integrity                  | 22 originals PASS; package discrepancy lama dicatat di atas                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| DESIGN lint                       | Exit 0; 0 errors, 23 advisory warnings (metadata/orphan token format). Palette/runtime mapping test tetap PASS.                                                                                                                                                                                                                                                                                                                                                                                  |
| Premium strict static audit       | Exit 1; enam ownership.native-select-conflict findings ditinjau. Scanner menyamakan JSX Select dengan literal select, dan hidden native adapter dengan user-facing control. Semua caller memakai shared authored owner; satu literal select aria-hidden/tabIndex -1 hanya value adapter. Ownership dicatat jujur sebagai authored; tidak mengubah scanner atau menghilangkan native adapter untuk mengejar hasil nol. Browser/Axe memeriksa kontrol actual. Lihat refinement-select-review.json. |

Suite mencakup lima views/assets dan 55 slide choices; midnight/end-of-day; normal-only/no-observations; draft hipotesis kedua; KO approval → verified closure/reload/reset; scope drawer termasuk asset/cutoff/mode exclusions; utility isolation; guards dan mocked busy/cancel/failure; keyboard, source/download hashes dan Axe. Widths 1440/1280/1024/390 tidak memiliki document overflow. Sidebar 1024×360 memeriksa reachable reset, focus, confirmation/cancellation serta unchanged storage. Status diuji all scope, plant filter dan empty scope, termasuk bar proportions/alignment. Governance terbuka/tertutup, source search/no-results/clear, KPI/source drawer, authored popup dan hourly slider/readings/source diuji.

Assertion lama yang terikat copy/native controls sebelum commit pengguna diperbarui ke rendered controls dan bukti yang sama. Closure tetap memeriksa Closed UI, completion persistence, history, reviewer dan metric drawer. Source count/filter/temporal exclusions tidak diturunkan. Axe assertion tidak dihapus; empty-text contrast dan localized overflow diperbaiki saat ditemukan. Reset focus dan document scroll lock juga diperbaiki berdasarkan regression failures.

## Screenshot final

| Referensi | Capture                                                                                                                                                                                                              |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A         | [Sidebar/reset](screenshots/refinement-A-sidebar.png), [short viewport](screenshots/refinement-sidebar-short.png)                                                                                                    |
| B         | [Status/scope dan aliran Overview](screenshots/refinement-B-overview.png), [empty status](screenshots/refinement-status-empty.png), [full](screenshots/refinement-overview-full.png)                                 |
| C         | [Governance closed](screenshots/refinement-C-governance-closed.png), [open](screenshots/refinement-C-governance-open.png)                                                                                            |
| D         | [Data column flow](screenshots/refinement-D-data-flow.png), [full](screenshots/refinement-data-full.png)                                                                                                             |
| E         | [Prospective Investigation flow](screenshots/refinement-E-investigation-flow.png), [narrow analysis](screenshots/refinement-investigation-390.png), [full historical](screenshots/refinement-investigation-full.png) |

Full view captures: screenshots/{overview,data,problems,investigation,actions}-{1440,1280,1024,390}.png. Workflow captures: ko-verified-action.png, action-scope-zero-drawer.png, action-scope-matched-drawer.png, redesign-closure-390.png, prospective-replay.png, source-drawer.png. Capture berasal dari final production build dan diperiksa secara visual, termasuk A–E serta layout narrow.

## Batas verifikasi

Chromium lokal, bukan Safari/Firefox/perangkat fisik atau studi screen reader formal. Tidak ada direct comparison ke lima attachment yang tidak tersedia, paid provider call, Vercel deployment atau fresh npm ci. Public live tetap disabled; mock/fake hanya membuktikan guarded state/fallback. Static auditor limitation dijelaskan secara eksplisit, bukan dilaporkan sebagai PASS. Source, temporal, action-scope dan API behavior diverifikasi melalui domain serta production browser regressions; tidak ada klaim industrial safety atau validated prediction/forecast performance.

Hanya runtime test milik pekerjaan ini pada 3103 dihentikan/dihapus setelah verifikasi; server pengguna tidak dihentikan.
