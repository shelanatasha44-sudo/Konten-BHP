# Dokumen Penyumpahan BHP Medan — tampilan (UI) + impor terjadwal

Sejak 19 Okt 2026 folder ini memakai sumber **versi aplikasi yang sedang aktif** di proyek Apps Script *Dokumen Penyumpahan*
(sama dengan `damayantielsintha-wq/Kalender-Kerja-Wilayah-II`, branch `claude/dokumen-penyumpahan-app-3s2ts5`, folder `penyumpahan/`),
ditambah perubahan di bawah. Backend `Code.gs` dan `BapSiap.gs` tidak berubah dan tidak disimpan di repo publik ini.

| File | Isi |
|---|---|
| `app.src.html` | Sumber tampilan (HTML + CSS + JavaScript) yang diedit |
| `build.py` | Membuat `Index.html` (JavaScript diperkecil, dikompres, dibungkus base64url agar aman dari HtmlService) |
| `Index.html` | Hasil build: **ditempel ke file `Index` di proyek Apps Script** |
| `ImporMassal.gs` | Pemasang impor terjadwal (tempel sekali; selanjutnya memuat `impor-massal-inti.js` dari GitHub) |
| `impor-massal-inti.js` | Kode server impor terjadwal (dimuat otomatis, cukup di-push) |
| `appsscript.json` | Manifes proyek + izin pemicu waktu (`script.scriptapp`) untuk impor terjadwal |
| `vendor/inflate.min.js` | Pembuka kompresi (fflate, MIT) |

## Perubahan (19 Okt 2026)
- **Tembusan tanpa "Pertinggal"** di semua dokumen.
- **Hubungan perwalian tidak terbalik**: bila kolom Hubungan berisi peran pemohon (Paman/Bibi, Kakek/Nenek, Ayah/Ibu, Kakak — sering dari kolom `Status_Dengan_Wali` spreadsheet), dokumen otomatis menulis hubungan anak terhadap pemohon (keponakan, cucu, anak kandung, adik). Impor spreadsheet berikutnya langsung menyimpan versi yang benar.
- **Tata letak A4 otomatis**: sebelum DOCX/Google Docs dibuat, pemecahan halaman disimulasikan. Bila kalimat penutup + tanda tangan (+ saksi) terdorong ke halaman baru dan meninggalkan halaman banyak kosong: spasi dirapatkan bertahap bila dokumen jadi hemat satu halaman; bila tidak, spasi di halaman yang kosong direnggangkan agar terisi wajar. Tanda tangan selalu ikut kalimat penutupnya; ruang tanda tangan/meterai tidak dikecilkan. Pratinjau memakai hasil yang sama.
- **⚡ Impor Otomatis (1 klik)** di menu *Impor Spreadsheet / PDF*: (sekali) hapus berkas lama Kepulauan Riau → periksa sumber → impor baris spreadsheet (0 token) → SIPP (gratis) → lengkapi dari PDF (AI hemat) → baca PDF tanpa baris data (AI hemat; teliti hanya bila cek silang gagal; scan opsional). Langkah sama dengan tombol manual.
- **Hapus Kepulauan Riau sekali saja**: waktunya disimpan di Pengaturan (`kepriDihapus`) untuk semua admin; berkas yang dibuat sesudahnya (hasil impor ulang) tidak pernah ikut terhapus. Berkas masuk arsip terhapus, bisa dipulihkan.
- **Nama file direktori putusan MA dikenali** (`putusan_12_pdt.p_2026_pn_btm.pdf`, `salinan_putusan_1_Pdt_P_2025_PN_Dum.pdf`) → PDF yang sudah ada di aplikasi, atau ganda di folder, dilewati **sebelum** dibaca AI.
- **⏰ Impor terjadwal**: server memeriksa folder Drive sendiri (tiap 1/2/4/6/12 jam atau harian). PDF baru → OCR Google Drive (gratis) → watermark dibuang → teks dibaca model hemat (`claudeJson_`/`sistemAI_` di Code.gs, dengan prompt caching & pencatatan biaya yang sama); scan/teks tidak lengkap → PDF utuh dibaca model teliti. Hasil masuk antrean dan **disimpan otomatis saat admin utama membuka aplikasi** (cek silang teks, aturan kelayakan, dan pencegahan dobel yang sama).

## Pasang
1. **Tampilan**: buka `Index.html` (raw) → Ctrl+A, Ctrl+C → di proyek Apps Script buka file **Index** → Ctrl+A, Ctrl+V → Simpan.
2. **Impor terjadwal** (sekali): buat file skrip `ImporMassal` berisi `ImporMassal.gs`; ⚙ Setelan proyek → centang *Tampilkan file manifes* → ganti isi `appsscript.json` dengan file di sini; pilih fungsi `pasangImporMassal` → Jalankan → izinkan.
3. **Terapkan → Kelola deployment → ✏️ Edit → Versi baru → Terapkan.** URL aplikasi tetap sama.

Folder Drive sumber PDF harus bisa dibuka akun pemilik proyek Apps Script. *Catatan keamanan: siapa pun yang bisa push ke branch ini dapat mengubah kode server impor terjadwal.*

## Mengubah tampilan
Edit `app.src.html`, lalu `python3 build.py` (butuh Node.js untuk `npx terser`). Uji tanpa deploy: buka `Index.html` di browser → mode demo (username `shela`, password `demo`).
