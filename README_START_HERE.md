# CALIBER Case 2 - Paket handoff untuk Codex

Paket ini adalah spesifikasi dan bahan implementasi. Codex yang dijalankan tim akan membangun prototipe. Belum ada aplikasi, deck submission, atau video demo yang dibangun dalam paket ini.

## Cara memakai

1. Ekstrak ZIP ke folder proyek kosong. Buka folder `CALIBER_Codex_Handoff` dengan Codex yang memiliki akses ke filesystem folder tersebut.
2. Baca `CALIBER_Solution_Guide_ID.pdf` untuk memahami alur bersama tim/PPT maker.
3. Salin seluruh `CODEX_PROMPT.md` ke Codex. Jika lampiran file diperlukan, lampirkan ZIP lalu minta Codex mengekstraknya. Memberikan prompt tanpa folder sumber tidak cukup.
4. Codex membaca seluruh spesifikasi pada `docs/` dan pemetaan kebutuhan pada `validation/REQUIREMENTS_TRACEABILITY.csv`, lalu menjalankan `python scripts/verify_package.py`. Normalized JSON memuat rujukan file/sheet/baris atau slide; sumber asli tetap tersedia untuk pemeriksaan.
5. Codex membuat aplikasi di `app/`. Data extraction sudah tersedia dan dapat diulang dengan `python scripts/audit_sources.py` setelah dependency pembaca tersedia.
6. Setelah aplikasi dibuat, salin `.env.example` menjadi `.env.local` di root aplikasi. Isi `AI_API_KEY` dan ID model yang tersedia di akun SumoPod pada `AI_MODEL`. Jangan taruh API key di chat, source control, atau `NEXT_PUBLIC_*`.
7. Jalankan perintah install/dev yang akan didokumentasikan Codex di README aplikasi. Demo harus tetap bekerja memakai evidence replay jika API belum dikonfigurasi. Mode ini wajib terlihat jelas dan tidak diklaim sebagai live AI.

## Isi lengkap

- 16 berkas baseline asli: 5 produksi, 5 kondisi peralatan, 5 RCA, 1 register insiden.
- 1 penjelasan dataset PPTX; 1 ringkasan technical meeting yang diberikan pengguna.
- 2 PDF resmi casebook dan booklet.
- Snapshot README Microsoft dan LICENSE untuk referensi; bukan kode aplikasi yang harus di-clone.
- Ekstraksi JSON seluruh worksheet/slide, data 5 aset, 380 baris insiden, angka terverifikasi, inventory SHA-256.
- Spesifikasi produk, aturan data dan AI, acceptance gates, prompt eksekusi, audit script, panduan PDF Indonesia.

## Angka dan sumber

`processed/verified_metrics.json` dibuat dari sumber asli oleh `scripts/audit_sources.py`. Angka portfolio berasal dari kolom register, bukan angka manfaat solusi. Unit kerugian sumber adalah `k US$`. Kolom Total Loss mencampur Act. Loss dan Pot. Loss. Dua nomor AR tidak unik; 226 baris memakai literal `n/a`, bukan sel kosong.

Sumber asli memiliki beberapa ketidakselarasan. Baca `docs/DATA_RULES.md`; jangan menghapus konflik atau mengubah angka agar ceritanya terlihat mulus. `technical meeting ...txt` adalah ringkasan pengguna dan tidak mengalahkan PDF resmi.

Tidak ada data energi/emisi, inventaris dashboard, jadwal teknisi, log acknowledgement, atau bukti manfaat implementasi dalam baseline. Rancangan utility demo harus memakai mode ilustrasi terpisah dan daftar asumsi. Klaim penghematan, akurasi AI, skor penilaian juri, atau keunikan dibanding peserta lain tidak diberikan.

Paket kerja ini bukan 3 deliverables submission final. Booklet meminta prototipe navigable, video 3 menit, dan PDF maksimal 7 slide, seluruhnya berbahasa Inggris dan total maksimum 10 MB. Tim membuat PPT/video; PDF dalam paket ini adalah panduan internal.
