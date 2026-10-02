# Prompt perbaikan Manufacturing Intelligence Hub — CALIBER Case 2

Salin seluruh instruksi di bawah ke Codex yang memiliki akses ke repository. Alternatifnya, lampirkan file ini dan minta Codex membaca serta menjalankannya. Path dalam prompt relatif terhadap root repository; kode aplikasi berada di `app/`.

---

Kamu bertugas memperbaiki prototipe CALIBER 2026 Case 2 dalam repository:
https://github.com/Ch4lalala/manufacturing-intelligence-hub

Kerjakan implementasi, pengujian, dan dokumentasi sampai selesai. Pertahankan prototipe yang sudah ada dan fokus pada perbaikan di bawah. Produk menggunakan bahasa Inggris; laporan hasil untuk tim menggunakan bahasa Indonesia.

## 1. Tujuan dan batas pekerjaan

Solusi harus menghubungkan Executive Overview → Problem Tank → Investigation → reviewed action → verified closure, dengan sumber dan keterbatasan yang dapat diperiksa.

Pertahankan jawaban terhadap kebutuhan Case 2:

- Pemetaan sumber, definisi KPI, kepemilikan data, dan usulan konsolidasi dashboard.
- Tampilan eksekutif untuk KPI operasional, produksi, downtime, serta energi/emisi sesuai ketersediaan data.
- Ilustrasi forecast energi yang jelas terpisah dari data nyata, pencarian insiden serupa, dan indikasi kemungkinan akar masalah.
- Problem Tank dengan alasan prioritas, bukti, panduan tindak lanjut, PIC/peran, tenggat, status, dan verifikasi penutupan.

Perbaikan harus memperkuat kualitas prototipe, kelayakan, relevansi operasi kimia, dan kejelasan presentasi. Jangan mengarang bobot penilaian, skor juri, keunikan terhadap peserta lain, peluang menang, atau keuntungan yang belum diukur.

Gunakan stack dan lockfile yang tersedia. Hindari migrasi framework, desain ulang besar, atau penambahan infrastruktur yang tidak diperlukan. Tidak perlu membuat slide/video. Siapkan perubahan dan instruksi deployment; push, publikasi deployment baru, dan submission kompetisi memerlukan instruksi terpisah. Jika URL preview sudah disediakan, pemeriksaan baca-saja diperbolehkan.

## 2. Pemeriksaan awal dan file wajib

Mulai dengan memeriksa root proyek, `git status`, branch, dan commit. Pertahankan perubahan milik pengguna. Review sebelumnya memakai commit `3759e2efc21e5e1727022bfd487066d4fb7fbb45`; temuan di prompt ini adalah temuan pada commit tersebut. Periksa ulang terhadap checkout saat ini. Jika suatu masalah sudah diperbaiki, verifikasi dan jangan mengulang perubahan.

Baca instruksi `AGENTS.md` yang berlaku dan panduan Next versi terpasang di `node_modules/next/dist/docs/` sebelum mengubah kode terkait. Jika dokumentasi lokal tidak tersedia, gunakan dokumentasi resmi yang sesuai versi proyek.

Baca file berikut sebelum implementasi:

**Kebutuhan dan data:**

- `README_START_HERE.md` dan `CODEX_PROMPT.md` sebagai konteks handoff awal.
- `docs/SOLUTION_SPEC.md`, `docs/DATA_RULES.md`, `docs/DATA_CONTRACTS.md`, `docs/ACCEPTANCE.md`, `docs/RUBRIC_AND_DIFFERENTIATION.md`, `docs/IMPLEMENTATION_ROADMAP.md`.
- `validation/REQUIREMENTS_TRACEABILITY.csv`, `validation/AUDIT_REPORT.md`, `validation/DELIVERY_CHECKS.md`.
- `processed/source_inventory.json`, `processed/source_origins.json`, `processed/verified_metrics.json`, `processed/assets.json`, `processed/incidents.json`.
- `processed/workbook_extraction.json`, `processed/presentation_extraction.json`, `processed/official_text.json` sesuai kebutuhan penelusuran sumber.
- `PACKAGE_MANIFEST.json` dan `scripts/verify_package.py`.
- `sources/official/The Case - CALIBER 2026.pdf` dan `sources/official/Booklet CALIBER 2026 - Registration Extended.pdf` untuk memeriksa expected solution, key questions, dan rubric.

**Aplikasi:**

- `app/AGENTS.md`, `app/README.md`, `app/IMPLEMENTATION_STATUS.md`, `app/SOURCE_INTEGRITY.md`, `app/SOURCE_AND_ASSUMPTION_NOTES.md`, `app/WALKTHROUGH.md`.
- `app/DESIGN.md`, `app/UX-CONTRACT.md`, `app/package.json`, `app/package-lock.json`, `app/next.config.ts`, `app/.env.example`.
- `app/src/lib/types.ts`, `domain.ts`, `data.ts`, `evidence.ts`, `analysis.ts`, `actions.ts`, `quality.ts`, `utilities.ts`.
- Semua route di `app/src/app/api/`, terutama `analyze`, `episodes`, `case`, `source`, dan `status`.
- Komponen `hub`, `problems`, `investigation`, `actions`, dan `evidence-panels` di `app/src/components/`.
- `app/tests/domain.test.ts`, `app/tests/browser.spec.ts`, `app/playwright.config.ts`, `app/scripts/normalize.py`, `app/data/normalized.json`.

Periksa originals saat memvalidasi fakta: lima workbook produksi di `sources/baseline/production/`, lima workbook equipment di `sources/baseline/equipment/`, lima PPTX RCA di `sources/baseline/rca/`, serta `sources/baseline/incidents/Incident Database.xlsx`. Nama tepat dan lokasi berasal dari inventory, bukan perkiraan.

Jika checkout memuat seluruh handoff, tidak diperlukan unggahan ulang. Jika file sumber/spec hilang, cari di direktori handoff yang tersedia. Lanjutkan bagian yang tidak bergantung pada file tersebut dan laporkan nama file yang benar-benar hilang; jangan menggantikannya dengan data buatan.

## 3. Fakta yang wajib dijaga

Rekonsiliasikan dengan sumber; angka berikut merupakan baseline hasil audit, bukan hasil operasi aplikasi:

| Ukuran | Baseline | Makna |
| --- | ---: | --- |
| Incident register | 380 baris | Seluruh register, bukan hanya lima RCA |
| Downtime | 2,261.1 jam | Total register |
| Actual loss | 61,886.46 k US$ | Kerugian aktual sumber |
| Potential loss | 5,307.97 k US$ | Kerugian potensial sumber |
| Total exposure | 67,194.43 k US$ | Actual + potential; bukan savings |

- Kelima asset: PU-2101B, KO-3201, PM-4405B, HE-3301, BL-5702. Window produksi berbeda dan tidak menjadi snapshot plant serentak.
- AR dapat kosong/literal `n/a` atau berulang. Pertahankan raw values dan gunakan qualified joins, bukan AR sebagai ID unik.
- KO: MM/S dan micron berbeda besaran/unit; jangan dikonversi tanpa dasar. Weekly 1530 ppm dan angka RCA kemudian 1800 ppm tetap dibedakan.
- KO: threshold workbook 45/75 dan laporan terkait 60/45 tidak membuktikan tanggal efektif kebijakan. Tampilkan ketidakpastian versinya.
- HE: asset OFF dapat bersamaan dengan plant rate nonzero. Jangan menyamakannya dengan seluruh plant shutdown.
- PM: konflik workbook/report tentang suplai standby tetap terlihat; rate mempertahankan `T/H (equiv.)`.
- Alarm classifications tidak membuktikan alarm terkirim, diakui, atau diabaikan operator.
- Compliance PM 92% adalah pernyataan sumber tanpa work logs pendukung. Design-life generik tidak menjadi model remaining useful life.
- Tidak tersedia meter energi/emisi, faktor emisi tervalidasi, stock spare parts, jadwal teknisi, atau bukti savings. Utilities tetap `Data unavailable` kecuali pengguna memilih ilustrasi sintetis terpisah.
- Peran, approval, dan bukti penutupan di workspace adalah simulasi prototipe; jangan mengklaim autentikasi perusahaan atau maintenance nyata.
- Originals dan manifest asli tetap utuh. Ada discrepancy `CODEX_PROMPT.md` yang sudah dicatat dalam `app/SOURCE_INTEGRITY.md`; jangan menghapusnya atau menulis ulang manifest untuk membuat audit tampak lulus. Bedakan integritas originals, discrepancy handoff lama, dan perubahan aplikasi yang sekarang sah.

## 4. Perbaikan A — satu aturan waktu untuk seluruh alur

**Temuan pada commit review:** `api/episodes` memakai tanggal weekly pada `00:00:00`, sementara `makeBundle` memakai `23:59:59`. Pada KO dengan cutoff `2026-04-22 00:00:00`, Problem Tank memasukkan weekly 22 April tetapi Investigation terakhir hanya 15 April.

Implementasikan helper/policy eligibility bersama untuk route, bundle, prioritas, UI, dan context AI. Atur dengan jelas:

1. Weekly date-only baru eligible pada akhir hari sumber, bukan tengah malam. Ini konvensi konservatif replay, bukan bukti kapan data benar-benar dipublikasikan.
2. Hourly memakai timestamp sumber. Semua timestamp diperlakukan sebagai source-local; jangan diam-diam digeser dengan timezone browser.
3. Dalam prospective/pre-event, pertahankan pengecualian current event day, future observations, outcome/status/loss current event, RCA pascainspeksi, dan remarks yang dapat membocorkan hasil.
4. Tanggal publikasi/revisi register/RCA tidak tersedia; historical incident retrieval tetap unavailable dalam prospective kecuali ada provenance availability yang dapat diverifikasi.
5. Historical review boleh menampilkan hasil RCA dengan label retrospektif. Jika ada cutoff historis, semantiknya harus eksplisit dan tidak disamakan dengan pre-event prediction.
6. Validasi kalender dan jam, bukan hanya regex. Tolak tanggal mustahil tanpa normalisasi diam-diam.

Pastikan asset, mode, dan cutoff yang dipakai Problem Tank diteruskan ke Investigation. Jangan memperbaiki masalah dengan melonggarkan gate Investigation. Uji route/API dan navigasi UI, selain helper.

## 5. Perbaikan B — analisis mengikuti bukti

**Temuan pada commit review:** `analysis.ts` memiliki pasangan judul tetap per tag. Jika tidak ada breached weekly, replay memakai normal weekly sebagai support dan tetap menghasilkan mekanisme yang sama dengan strength `plausible`. Live AI hanya memilih/mengurutkan canonical candidates dan menyalin teks tetap. Ini replay konservatif yang terdokumentasi, tetapi belum menunjukkan perubahan hipotesis mengikuti bukti.

Bangun alur: eligible evidence → deterministic signal summary → eligible similar incidents/context → composed hypotheses → validation → human review.

**Signal summary dan replay:**

- Hitung sinyal dari observasi eligible: klasifikasi/formula, perubahan parameter yang sebanding, tren, dan apakah observasi benar-benar menunjukkan abnormalitas. Sebutkan aturan dan unit yang dipakai.
- Gunakan threshold sumber beserta versi/keterbatasannya. Aturan tambahan harus diberi label proposed/illustrative dan alasan, tanpa menyatakan validasi industri.
- Asset taxonomy boleh membantu memilih mekanisme relevan; temuan dan strength harus ditentukan bukti yang ada, bukan tag saja.
- Kasus tanpa eligible observations menghasilkan state yang sesuai. Observasi normal tanpa sinyal anomali yang dapat dibuktikan menghasilkan `Insufficient anomaly evidence`; jangan membuat diagnosis mekanisme atau maintenance draft seolah kerusakan sudah terlihat.
- Jangan mendefinisikan “normal” hanya dari label weekly jika ada hourly atau tren lain yang sah menunjukkan anomali. Jelaskan bukti yang mengubah kesimpulan.
- Normal baseline boleh menjadi counter-evidence dengan alasan yang jelas. Missing measurement bukan bukti normal.
- Historical report findings dibedakan dari AI hypotheses dan source recommendations. Jangan mengubah temuan diketahui menjadi klaim prediksi.

**Live AI:**

- Provider: `AI_BASE_URL=https://ai.sumopod.com/v1`. Gunakan server-side `AI_API_KEY` dan `AI_MODEL` yang benar-benar disediakan. Model dan dukungan fitur provider belum dikonfirmasi; jangan mengarang model atau menganggap embedding/streaming/structured-output tersedia.
- Kirim context ringkas yang dipilih dari bukti eligible dan sinyalnya, bukan hanya citations dari template canonical. Pertahankan provenance tiap item.
- Historical similar-incident retrieval dapat memakai pencarian/ranking deterministik yang tersedia; berikan alasan kemiripan dan perbedaan. Insiden serupa bukan pembuktian sebab saat ini. Tidak wajib vector database.
- Minta output terstruktur: ringkasan observasi, hipotesis, supporting evidence, counter-evidence, missing checks, qualitative strength beserta alasan, dan action drafts untuk review.
- Izinkan penjelasan mekanisme sebagai hipotesis/inference; fakta observasi harus berasal dari source IDs. Pisahkan pengetahuan teknik umum dari fakta kasus.
- Hapus kewajiban menyalin seluruh judul/narasi canonical persis, sambil mempertahankan validasi ketat atas fakta dan temporal eligibility.
- Ikat angka, unit, timestamp, asset, dan klaim faktual ke field sumber atau deterministic derived-fact IDs. Untuk fakta turunan, simpan input, formula, dan provenance. Mencari angka yang kebetulan muncul di teks bukan validasi yang memadai.
- Tolak citation tidak dikenal, asset salah, future/post-event evidence, unit tidak kompatibel, angka unsupported, dan strength yang melebihi kategori bukti. Validator tidak membuktikan kausalitas; engineering review tetap diperlukan.
- Output boleh tidak memiliki hipotesis saat bukti tidak memadai. Perbarui schema/UI dengan benar; jangan menciptakan hipotesis agar memenuhi minimum array length.
- Evidence text adalah data tidak tepercaya, bukan instruksi. Pertahankan timeout, cancellation, ukuran context/response, bounded output, dan sanitized errors.
- Hasil invalid/provider gagal kembali ke deterministic replay dengan label yang jelas. Bedakan no live request, live attempted but failed, dan validated live response. Jangan menampilkan hasil fallback sebagai live AI.
- Tidak ada probabilitas numerik, klaim fault prediction accuracy, spare stock/staff fiktif, kontrol mesin otomatis, atau instruksi eksekusi engineering tanpa dasar.

**Keterhubungan tindakan:**

Pastikan setiap draft yang ditawarkan terhubung ke hipotesis/bukti yang direview. Jika acceptance selain hipotesis pertama tidak dapat membuat draft, perbaiki hubungan tersebut. Jangan menempelkan seluruh tindakan ke hipotesis pertama secara implisit.

Pertahankan loop Draft → Approved → In Progress → Pending Verification → Closed, dengan owner role, due date, approval, completion evidence, reviewer, alasan rejection/cancellation, dan history. Source CAPA/remarks tidak otomatis menutup action workspace.

## 6. Perbaikan C — sumber tersedia dalam runtime deployment

**Temuan pada commit review:** `api/source` membaca originals dari `../sources/` dan excerpts XLSX dari `../processed/workbook_extraction.json`; `next.config.ts` belum memasukkan tracing files di luar root `app/`. Dalam simulasi app-only runtime, excerpt XLSX menghasilkan ENOENT dan download original 404. Ini risiko packaging yang direproduksi lokal, bukan laporan kegagalan Vercel yang sudah diperiksa.

Pilih solusi berdasarkan struktur deploy sebenarnya:

- Package salinan runtime yang diverifikasi ke lokasi server-only di dalam app; atau
- Konfigurasi `outputFileTracingRoot` dan `outputFileTracingIncludes` sesuai Next versi proyek, sambil memastikan path runtime benar.

Simpan originals kanonis tanpa perubahan. Jika menyalin, gunakan build/preparation script dan cek hashes. Pertahankan catalog IDs/locators agar citations tetap resolve. Package hanya files yang diperlukan, tidak secret atau seluruh dependency tree.

Gunakan whitelist inventory dan boundary path yang benar; query pengguna tidak boleh memilih path sembarang. Tangani missing/corrupt data dengan respons yang terkendali dan UI retry, tanpa stack trace. Jangan mengganti excerpt gagal dengan teks dari sheet/asset lain.

Verifikasi production bundle dalam runtime bersih yang hanya berisi artefak deploy: normalized data, workbook excerpts, PPTX/PDF excerpts, original downloads, locator tertentu, file unknown, dan missing-file state. Jangan hanya menguji ketika seluruh parent handoff masih ada. Catat Vercel Root Directory yang harus dipakai dan langkah build yang benar.

## 7. Perbaikan D — penggunaan live AI dibatasi di server

**Temuan pada commit review:** `POST /api/analyze` dapat memanggil provider ketika anonymous request mengirim `live: true`. Risiko biaya muncul jika deployment publik mengaktifkan key/model dan tidak dilindungi akses deployment. Mock route review menghasilkan HTTP 200 dan satu provider call; tidak ada panggilan berbayar nyata pada review tersebut.

- Replay tetap dapat digunakan tanpa key dan tanpa panggilan provider.
- Terapkan akses demo di server sebelum live provider call. Gunakan mekanisme yang sesuai deployment, misalnya session demo bertanda tangan dengan cookie HttpOnly atau kontrol akses platform yang benar-benar diverifikasi melindungi route tersebut. Simulated workspace roles bukan autentikasi.
- Terapkan rate limit, concurrency limit, dan batas penggunaan/cost yang terdokumentasi. Nilai batas adalah konfigurasi operasional demo, bukan angka manfaat/hasil eksperimen.
- Jangan mengklaim limiter in-memory membatasi seluruh instance Vercel. Jika tidak ada shared quota store atau pembatas provider/deployment yang dapat diverifikasi, batasi klaimnya dan nonaktifkan public live mode sampai guard yang diperlukan tersedia; replay tetap bekerja. Jangan membuat akun/layanan berbayar baru diam-diam.
- Semua guard dijalankan sebelum fetch provider. Unauthorized, quota exhausted, dan concurrent rejection tidak menghasilkan provider call. Retry tidak boleh menyebabkan request berulang tanpa batas.
- Credentials, passcode, dan internal provider response tidak dikirim ke client, logs, artifact, atau Git. Jangan memakai `NEXT_PUBLIC_` untuk secrets.
- Tambahkan contoh konfigurasi kosong dan petunjuk deployment yang jelas. Missing auth/quota configuration harus gagal tertutup untuk public live usage dan menawarkan replay yang berfungsi.

## 8. Urutan pengerjaan

1. Catat kondisi checkout, sumber/spec yang ditemukan, dan status masalah pada versi saat ini.
2. Reproduksi masalah temporal dan paket runtime dengan test yang terarah; implementasikan shared eligibility dan packaging yang tepat.
3. Implementasikan evidence-dependent replay, live composition/validation, serta hubungan action ke review.
4. Implementasikan guard live AI dan failure states; perbarui UI tanpa mengubah identitas visual keseluruhan.
5. Jalankan checks, revisi dokumentasi, dan siapkan alur demo singkat yang mencerminkan perilaku final.

Gunakan judgement untuk keputusan implementasi rutin. Jika key/model, URL preview, atau quota backing belum tersedia, tetap selesaikan implementasi dan mock/local verification yang tidak bergantung padanya. Catat verifikasi nyata yang belum bisa dilakukan tanpa mengarang hasil.

## 9. Pengujian dan acceptance

Jalankan dari `app/` sesuai package scripts yang aktual:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run test:browser
npm run format:check
```

Pasang browser Playwright jika diperlukan. Sesuaikan format/check scope jika files baru belum dicakup scripts. Jalankan suite browser terhadap production build untuk verifikasi akhir. Jangan menulis test yang hanya menyalin implementation atau melemahkan assertions agar lulus.

Tambahkan regression checks yang bermakna:

| Kasus | Hasil yang harus diperiksa |
| --- | --- |
| KO, cutoff 22 April 2026 00:00:00 | Weekly 22 April excluded pada Problem Tank dan Investigation; source evidence konsisten |
| KO, cutoff 22 April 2026 23:59:59 | Weekly 22 April eligible di kedua alur; eligible observations dan evidence IDs cocok |
| Batas waktu, tanggal invalid, current event day | Tidak ada normalisasi tanggal mustahil atau future/outcome leakage |
| Eligible observations tanpa anomali terbukti | Insufficient anomaly evidence; tidak ada diagnosis/draft maintenance unsupported |
| KO dengan evidence ALARM eligible | Hipotesis memiliki alasan, supporting/counter evidence, dan missing checks yang sesuai sinyal |
| Historical RCA vs prospective | Findings retrospektif tersedia hanya pada scope yang benar; context provider diperiksa dengan mock transport |
| Structured live response valid | Narasi dapat berbeda dari template, fakta dan citations valid, status live benar |
| Unknown citation, wrong units, invented number, inflated strength | Output ditolak; fallback terlihat |
| Provider timeout/error/invalid JSON, missing config | Replay tetap berjalan dan status integrasi jujur |
| Unauthorized/quota/concurrency block | Tidak ada fetch provider; replay tersedia |
| Runtime hanya artefak deploy | Excerpts dan downloads bekerja tanpa parent source directory yang tidak ter-package |
| Kelima assets dan KO action loop | Source access, mode/cutoff, review, owner/date, approval, completion, verified closure, reload/reset berfungsi |
| Desktop/mobile dan failure states | Tidak ada overflow yang menghalangi workflow; navigasi keyboard, empty/loading/retry terbaca |

Rekonsiliasikan seluruh 380 register rows dan baseline totals. Periksa konflik KO/HE/PM, unit currency, serta isolasi synthetic utilities. Periksa client build untuk memastikan secrets tidak ikut.

Review sebelumnya berhasil menjalankan 17 domain checks melalui harness pure-module, tetapi tidak mengulang full dependency install/build/browser suite karena keterbatasan lingkungan. Hasil tersebut bukan pengganti pemeriksaan checkout dan build terbaru. Jangan mengandalkan status PASS lama di dokumentasi sebagai hasil pekerjaanmu.

Real provider verification hanya dilakukan jika key/model sah tersedia dan penggunaan demo telah diizinkan, dengan request minimal setelah guard siap. Fake transport bukan bukti kompatibilitas SumoPod. Jika tidak dapat diuji nyata, tulis `NOT TESTED` beserta kebutuhan yang kurang. Begitu pula, local production packaging check bukan bukti deployed Vercel check.

## 10. Deliverables dan laporan akhir

Selesaikan kode, meaningful regression tests, `.env.example` tanpa secrets, serta pembaruan README, IMPLEMENTATION_STATUS, SOURCE_AND_ASSUMPTION_NOTES, UX-CONTRACT/DESIGN jika perilaku berubah, dan WALKTHROUGH.

Buat `app/REPAIR_REPORT.md` yang berisi:

- Commit/checkout yang diperiksa; masalah yang direproduksi dan yang sudah teratasi sebelum perubahan.
- Perbaikan final, alasan, dan files yang berubah.
- Commands/tests yang benar-benar dijalankan beserta hasil, artifact bukti, dan keterbatasannya.
- Pemisahan verified local, mocked provider, real provider, dan deployed verification.
- Konfigurasi serta file runtime yang diperlukan untuk Vercel; langkah menyalakan live mode dengan guard.
- Traceability singkat perbaikan terhadap expected solution/key questions dan rubric resmi tanpa skor rekaan.
- Alur demo: sumber/KPI → prioritas → pre-event evidence → historical contrast → action review → verified closure.

Laporkan hasil kepada tim dalam bahasa Indonesia: apa yang berubah, mengapa, cara menjalankan, apa yang lulus, dan apa yang masih `NOT TESTED`/blocked. Jangan menyatakan siap deploy atau live AI terintegrasi bila buktinya belum ada. Tetap kirim perubahan yang konkret dan dapat direview meskipun verifikasi eksternal tertentu belum tersedia.
