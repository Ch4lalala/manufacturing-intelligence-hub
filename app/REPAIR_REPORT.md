# Laporan perbaikan — CALIBER Case 2

**3 Oktober 2026.** Repository `manufacturing-intelligence-hub`, branch `main`, HEAD `3759e2efc21e5e1727022bfd487066d4fb7fbb45`, sama dengan commit review. Implementasi tetap menggunakan Next.js/TypeScript dan lockfile yang tersedia. Produk berbahasa Inggris; laporan ini untuk tim.

## Kondisi awal dan integritas

Seluruh handoff/spec/originals ditemukan di checkout. Instruksi AGENTS aplikasi, dokumentasi Next terpasang, dokumen data/acceptance/rubric, serta halaman resmi dan originals yang relevan dibaca. Tidak ada fakta baseline yang diganti dengan data buatan.

`python scripts/verify_package.py` dijalankan sebelum normalisasi: **22 originals, nol discrepancy**; 46 berkas handoff memiliki dua discrepancy ukuran/hash pada **CODEX_PROMPT.md yang sudah berubah sebelumnya**. Manifest dan berkas tersebut tetap dipertahankan. `npm run normalize` mencocokkan 380 register rows dan seluruh data hourly/weekly dengan workbook original; normalized JSON tidak berubah. Lihat [SOURCE_INTEGRITY](SOURCE_INTEGRITY.md).

Perubahan pengguna yang sudah ada dipertahankan: `app/next-env.d.ts` dengan import tipe development dan prompt repair yang untracked. Next meregenerasi next-env saat build; isi awal pengguna dikembalikan persis setelah build. `.env.local` tidak dibuka/diedit atau dicetak oleh pekerjaan ini; Next tetap memuatnya secara internal saat build sesuai perilaku framework. Tidak ada commit, reset, pergantian branch, push, deployment atau submission.

## Reproduksi pada checkout awal

Bukti sebelum perubahan: [repair-before.json](verification/repair-before.json).

| Temuan                             | Hasil pemeriksaan awal                                                                                                                                  | Hasil akhir                                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| A: KO cutoff 22 April 00:00        | Tank memasukkan weekly 22 April/11 supporting samples; Investigation terakhir 15 April/10 samples.                                                      | Keduanya berakhir 15 April dengan evidence IDs identik. End-of-day memasukkan 22 April di keduanya.                     |
| B: normal-only KO 10 Desember 2025 | Satu pembacaan NORMAL tetap menghasilkan dua hipotesis dan dua draft.                                                                                   | `Insufficient anomaly evidence`, nol diagnosis mekanisme/draft.                                                         |
| B: live canonical restriction      | Inspeksi kode mengonfirmasi kewajiban narasi canonical; tidak ada panggilan provider nyata untuk mereproduksinya.                                       | Narasi inference berbeda diterima dengan fakta terikat, citation/signals/strength divalidasi melalui fake transport.    |
| C: runtime app-only                | Harness tanpa parent handoff menghasilkan ENOENT untuk excerpt XLSX dan download 404.                                                                   | Artifact-only production runtime lulus 53 pemeriksaan tanpa parent source directory.                                    |
| D: anonymous live                  | Inspeksi route awal mengonfirmasi tidak adanya server access/quota guard; hasil mock review pada prompt bukan pengujian provider nyata oleh repair ini. | Session/limit guard diuji; unauthorized, public, missing config, quota dan concurrency menghasilkan nol fetch tambahan. |

Tidak ditemukan perbaikan A–D yang sudah lengkap sebelum pekerjaan ini. Fungsi dasar, konflik sumber, qualified joins, replay fallback dan workflow yang memang sudah bekerja dipertahankan lalu diuji ulang.

## Perubahan final dan alasan

### A — waktu konsisten di seluruh alur

`src/lib/time.ts` memvalidasi kalender/jam dan mempertahankan source-local. Weekly date-only eligible pada 23:59:59; hourly mengikuti timestamp. Ini konvensi replay konservatif, bukan bukti waktu publikasi. `evidence.ts`, route case/episodes/analyze dan UI memakai aturan yang sama. Asset/mode/cutoff diteruskan Tank → Investigation. Pergantian aset historical tanpa cutoff mempertahankan masing-masing full window; Data Map dengan observasi kosong tetap membuka metadata sumber tanpa crash.

Prospective mengeluarkan event day/future, seluruh remarks, RCA, current incident/risk/status/loss dan retrieval dengan availability tidak diketahui. Action Tracker prospective hanya menampilkan aksi dari asset/cutoff yang sama; snapshot/history historis tidak bocor. Cutoff historical hanya membatasi observasi, sedangkan findings completed-report tetap diberi label retrospektif.

### B — hipotesis dan tindakan mengikuti evidence

`signals.ts` menghasilkan source facts dan derived facts dengan input IDs/formula/provenance. Sinyal berasal dari threshold/formula/direction sumber, tren dalam unit yang sama, OFF state dan perubahan rate. Aturan tambahan seperempat jarak/perubahan diberi label proposed; tidak diklaim sebagai alarm policy tervalidasi.

`analysis-replay.ts` memilih mekanisme berdasarkan parameter/sinyal, dengan supporting/counter evidence, missing checks dan qualitative strength. Normal tanpa sinyal dan tanpa observasi memiliki state berbeda. Findings historis tetap source statements terpisah. `analysis.ts` mengirim context eligible ringkas termasuk similar incident historis dan alasan/perbedaannya; tidak meminta salinan canonical prose.

`analysis-validation.ts` mengikat observation ke exact fact/value/unit/time/asset, mengecek signal/mechanism/support/strength dan action link. Narrative inference dibatasi agar tidak membawa numeric case facts sendiri. Array hipotesis boleh kosong. Unsupported output/provider error/timeout/cancellation kembali ke replay dengan state yang jujur. Validator tidak membuktikan kebenaran semantik seluruh prose atau kausalitas.

Draft memiliki hypothesis ID sendiri. Acceptance terikat ke isi hasil, sehingga narasi baru tidak mewarisi acceptance lama. Hipotesis kedua dapat membuat aksinya sendiri. Workflow tetap membutuhkan owner/date/approval/completion evidence/reviewer confirmation; snapshot CAPA sumber tidak berubah.

### C — runtime sumber siap diperiksa sebagai artefak

`prepare-runtime.mjs` memverifikasi sebelum menyalin 22 originals dan extraction workbook ke `app/runtime/` yang server-only/ignored. `next.config.ts` menyertakan runtime dalam tracing dan normalized data, mengecualikan env/screenshots/reports. `source-runtime.ts` memakai whitelist inventory dan boundary path, memverifikasi original download, melayani locator exact, serta memberi error terkendali untuk unknown/missing/corrupt source. Tidak ada substitusi sheet/asset.

`verify-deploy.mjs` menjalankan server dari temporary standalone + static saja, tanpa parent handoff, lalu memverifikasi semua aset/excerpt/original hashes dan missing state. Temp directory milik tes dibersihkan. Ini **local production packaging check**, belum bukti deployment Vercel.

### D — live AI gagal tertutup sebelum provider fetch

`live-access.ts`, `analysis-service.ts` dan `/api/demo-session` menambahkan signed expiring HttpOnly session, origin/loopback check, batas login, request/minute, quota harian UTC dan concurrency. Role workspace tetap simulasi terpisah. Missing access/quota config menonaktifkan live; replay bebas provider.

Mode publik/platform serverless dinonaktifkan karena shared backing belum tersedia. Limiter/revocation berlaku **satu proses**, reset saat restart; bukan distributed quota/dollar budget. Tidak dibuat layanan berbayar baru. `.env.example` tidak mengandung secrets. UI passcode masked/Show-Hide, auth error/retry/lock dan replay fallback memakai komponen/tokens yang sudah ada.

### Berkas utama

| Kelompok       | Berkas                                                                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Waktu/evidence | `src/lib/time.ts`, `evidence.ts`, `domain.ts`, routes `case`, `episodes`, `analyze`                                                           |
| Analisis/fakta | `signals.ts`, `analysis-replay.ts`, `analysis-validation.ts`, `analysis.ts`, `types.ts`, `actions.ts`                                         |
| Server access  | `live-access.ts`, `analysis-service.ts`, route `demo-session`, `status`, `.env.example`                                                       |
| Runtime        | `scripts/prepare-runtime.mjs`, `scripts/verify-deploy.mjs`, `source-runtime.ts`, source route, `next.config.ts`, `.gitignore`, `package.json` |
| UI             | `hub.tsx`, `problems.tsx`, `investigation.tsx`, `actions.tsx`, `ui.tsx`, `demo-access.tsx`, `signal-panel.tsx`                                |
| Tests/bukti    | `domain.test.ts`, `repair.test.ts`, `fixtures.ts`, `browser.spec.ts`, Playwright config, `verification/`, `screenshots/`                      |
| Handoff        | README, IMPLEMENTATION_STATUS, SOURCE_AND_ASSUMPTION_NOTES, SOURCE_INTEGRITY, UX-CONTRACT, DESIGN, WALKTHROUGH, laporan ini                   |

## Hasil pengujian yang dijalankan

| Command/check                                                      | Hasil                                           | Batas bukti                                                                                                                                 |
| ------------------------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `python scripts/verify_package.py` dari root                       | Exit 1: originals PASS, discrepancy prompt lama | Tidak ditutupi sebagai full-package PASS.                                                                                                   |
| `npm ci`                                                           | PASS, zero vulnerabilities saat install         | Existing lock dipertahankan; bukan jaminan audit mendatang.                                                                                 |
| `npm run normalize`                                                | PASS                                            | Originals dicek dahulu; tidak rerun extractor/mengubah sumber.                                                                              |
| `npm run typecheck`, `npm run lint`                                | PASS                                            | Pemeriksaan checkout saat repair.                                                                                                           |
| `npm test`                                                         | **27/27 PASS**                                  | API gate/session handlers, exact facts/citations, guards/fallback, real 15-second abort dengan transport palsu, baseline/actions/utilities. |
| `npm run build`                                                    | PASS, standalone                                | Runtime sources dipaketkan server-only.                                                                                                     |
| `CALIBER_TEST_BASE_URL=http://127.0.0.1:3102 npm run test:browser` | **14/14 PASS**                                  | Chromium production; auth/provider failure UI dimock. Bukan real SumoPod.                                                                   |
| `npm run test:deploy`                                              | **53 checks PASS**, provider calls 0            | Clean artifact-only server, all five assets/all 22 original hashes, excerpt/error states. Bukan deployed Vercel.                            |
| `npm run format`, `npm run format:check`                           | PASS                                            | Scope mencakup source/tests/scripts baru/config/docs.                                                                                       |
| Premium strict audit                                               | PASS, nol findings                              | Identitas visual dipertahankan.                                                                                                             |
| `npx -p @google/design.md designmd lint DESIGN.md`                 | Exit 0, nol error, 12 advisory warnings         | Metadata ukuran komponen/palette lama; CSS runtime tetap source of truth.                                                                   |
| Client/static dan artifact env scan                                | PASS pada boundary yang diperiksa               | 13 client JS, nol nama variabel secret server; tidak ada .env di standalone. File secret pribadi tidak dibaca.                              |

Tes browser juga memperjelas selector caption empty scope yang muncul di beberapa panel. Tes pertama browser mendeteksi selector lama yang ambigu setelah tombol per-hipotesis ditambahkan; diperbaiki dengan exact label, bukan menghapus assertion closure. Tes deployment tambahan sempat membandingkan excerpt tanpa header locator; expected value diperbaiki menjadi header slide/shape plus text asli. Tes final mempertahankan assertion fakta dan source exact.

Bukti: [browser-results](verification/browser-results.json), [deploy-runtime](verification/deploy-runtime.json), [client-boundary](verification/client-boundary.json), [captures dan acceptance lengkap](IMPLEMENTATION_STATUS.md). Screenshot kelima desktop views, KO temporal/replay/closure/second draft serta narrow states diperiksa. Axe nol violation pada lima desktop views; horizontal document overflow nol pada 1440/1024/390. Formal accessibility/industrial validation belum dilakukan.

Baseline tetap **380 insiden, 2261.1 h; 61886.46 + 5307.97 = 67194.43 k US$**. 226 n/a dan dua reused AR pairs, perbedaan unit/time KO, HE OFF/plant impact, PM standby/equivalent rate dan synthetic utility isolation lulus tests. Tidak ada klaim exposure sebagai savings.

## Pemisahan tingkat verifikasi

| Tingkat                                                          | Status                                                                                                  |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Local implementation + pure/API tests                            | **VERIFIED** sesuai 27 checks                                                                           |
| Local production Chromium + standalone packaging                 | **VERIFIED** sesuai 14 browser tests/53 artifact checks                                                 |
| Mocked provider/auth UI                                          | **VERIFIED sebagai mock**; narasi berbeda, invalid/timeout/guard fallback teruji                        |
| Real SumoPod endpoint/model/output                               | **NOT TESTED**; tidak ada paid call, credentials tidak diinspeksi, guard local belum sengaja diaktifkan |
| Deployed Vercel/routing/function tracing                         | **NOT TESTED**; tidak ada URL preview/deployment                                                        |
| Engineer diagnosis/real maintenance/utility forecast performance | **NOT TESTED**; prototype/source inference/ilustrasi saja                                               |

## Menjalankan dan konfigurasi deployment

```bash
cd /Users/acit/Documents/MyWork/CALIBER_Codex_Handoff/app
npm ci
npm run dev
```

Buka `http://127.0.0.1:3100`. Jika port sudah dipakai, identifikasi dengan lsof; jangan menghentikan service lain sembarang. Replay tidak membutuhkan key. Petunjuk alternatif port/production/artefak ada di [README](README.md).

Vercel: Root Directory **app**, install **npm ci**, build **npm run build**; canonical handoff files harus tersedia di build checkout di luar app. Runtime generated berisi originals/workbook excerpts/manifest yang terverifikasi; normalized data ditrace. Tidak menyalin `.env.local` ke artefak. Live public tetap disabled sampai shared access/quota backing benar-benar diimplementasikan dan diuji. Setelah deployment terpisah, ulang source routes, downloads dan error/access tests pada URL yang sebenarnya.

Live lokal: isi file **app/.env.local** secara privat, pertahankan isi pengguna. Exact key/model, `AI_LIVE_MODE=local`, passcode minimal 12 karakter, separate signing secret minimal 32, positive per-minute/day/concurrency caps. Restart, unlock Demo live access, lalu request live secara eksplisit. Example 2/minute, 20/day, concurrency 1; token cap 1600, deadline 15s, tidak auto-retry. Ini cap penggunaan single-process, bukan dollar budget atau global Vercel limiter. Ordinary completion support masih perlu minimal authorized real verification. Rincian lengkap di README/.env.example.

## Traceability resmi tanpa skor

| Authority                                            | Kebutuhan                                                                   | Bukti repair                                                                                                                                           |
| ---------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Casebook p9 expected solution; p10 KQ1               | Dashboard rationalization, source/KPI/ownership foundation                  | Data Map/lineage tetap bekerja; runtime originals/citations dapat ditelusuri tanpa parent handoff. Consolidation/owners tetap proposed.                |
| Casebook p9; p10 KQ2                                 | Executive visibility, utility illustration, similar incidents, probable RCA | Overview/totals tetap terverifikasi; utilities synthetic terisolasi; signal/evidence/fact-dependent replay dan context historis. Real AI belum teruji. |
| Casebook p9; p10 KQ3                                 | Problem Tank priority/guidance/PIC/progress/verification                    | Shared temporal priority scope, linked drafts dari setiap hypothesis, gated owner/date/evidence/reviewer closure.                                      |
| Booklet p11: Problem Understanding & Business Impact | Masalah/batas sumber dan evaluasi dampak jelas                              | Konflik/time/identity/availability tetap eksplisit; tidak mengarang ROI/manfaat.                                                                       |
| Booklet p11: Solution Design & Prototype Quality     | Alur konkret dan kualitas implementasi                                      | Production navigation, no-anomaly/failure states, source package, browser/typed/API checks.                                                            |
| Booklet p11: Presentation Quality Technical          | Narasi teknis dapat diperiksa                                               | English app dan WALKTHROUGH; slides/video tetap tugas tim.                                                                                             |
| Booklet p11: Feasibility & Roadmap                   | Kelayakan dan gate implementasi                                             | Existing stack/lock, local artifact evidence, bounded server live, public fail-closed; deployed/shared backing next gate.                              |
| Booklet p11: Chemical Domain Relevance               | Konteks compressor/pump/heat-transfer/partial plant impact                  | Parameter-driven candidates dan original RCA kelima assets; engineering checks tetap diperlukan.                                                       |

Tidak dihitung skor/bobot/peluang menang/keunikan terhadap peserta lain. Lihat `verification/traceability.csv` untuk mapping lanjutan.

## Alur demo

Sumber/KPI → priority episode KO → pre-event midnight/end-of-day → signal/fact/counter-evidence → historical contrast → accept hipotesis tertentu → linked draft → owner/date/approval → completion evidence → reviewer confirmation → verified closure. Tampilkan HE asset-vs-plant serta unavailable utilities/isolated illustration secara singkat. [WALKTHROUGH](WALKTHROUGH.md) menyediakan alokasi tiga menit; durasi spoken belum diukur.

## Batas yang masih material

Sumber konflik/threshold effective dates/ingestion history tetap unknown. Proposed trend triggers bukan fault detector tervalidasi. Validator factual bindings bukan causal proof; general narrative dapat memerlukan penolakan/manual review. Auth/quota single-process tidak memberikan enterprise identity/global cost enforcement. Real SumoPod dan deployed Vercel **NOT TESTED**. Safari/Firefox, physical devices, formal screen-reader/security/domain studies, slides/video/submission size/access juga belum diuji.

Perubahan konkret siap direview secara lokal. Tidak diklaim production-ready, industrially safe, real forecasting proven atau live provider terintegrasi sukses tanpa bukti eksternal.
