# Dokumen Penyumpahan BHP Medan — tampilan (UI)

Folder ini hanya berisi **tampilan** aplikasi Dokumen Penyumpahan. Backend (`Code.gs`, `BapSiap.gs`) tetap di proyek Apps Script dan tidak disimpan di repo publik ini karena memuat data pribadi dan kredensial.

| File | Isi |
|---|---|
| `app.src.html` | Sumber tampilan (HTML + CSS + JavaScript) yang diedit |
| `build.py` | Membuat `Index.html`: JavaScript diperkecil (terser), dikompres, lalu dibungkus base64url agar tidak dirusak HtmlService |
| `Index.html` | Hasil build: **file ini yang ditempel ke proyek Apps Script** |
| `vendor/inflate.min.js` | Pembuka kompresi (fflate, MIT) |
| `ImporMassal.gs` | Pemasang backend **Impor Massal PDF** (tempel sekali ke proyek Apps Script; selanjutnya memperbarui diri dari GitHub) |
| `impor-massal-inti.js` | Kode server impor massal yang dimuat otomatis oleh `ImporMassal.gs` (cukup di-push, tanpa deploy ulang) |

## Perubahan dibanding versi `damayantielsintha-wq/Kalender-Kerja-Wilayah-II` (ec4746f)
- **Mode HP**: menu kiri menjadi navigasi bawah (Daftar Berkas, Berkas Baru, Jadwal Sumpah, ☰ Lainnya); menu lain muncul sebagai lembar dari bawah. Bar atas ringkas (judul + tombol 👤 + kotak cari). Saat berkas dibuka, daftar disembunyikan dan ada tombol **← Daftar Berkas**. Input 16px agar iPhone tidak zoom otomatis.
- **Lebih ringan**: `Index.html` turun dari ±280 KB menjadi ±127 KB (JavaScript diperkecil dan dikompres). Font web tidak dimuat di HP dan tidak lagi menahan tampilan di desktop. Bayangan dimatikan di HP; animasi dimatikan bila HP meminta *reduced motion*.
- **Dokumen A4 lebih rapi** (DOCX/Google Docs): kalimat penutup ("Demikian …"), tanda tangan Kepala, dan Tembusan selalu tampil bersama (tidak ada tanda tangan atau sebagian tembusan yang tertinggal sendirian di halaman baru); blok Pernyataan + tanda tangan + saksi di BA Penghadapan tidak terpisah; tabel Hari/Tanggal–Pukul–Tempat dan tabel identitas tidak terbelah; judul harta (A–F, AKTIVA, PASSIVA) dan kalimat yang berakhir titik dua selalu ikut isinya. Pratinjau di aplikasi kini memakai margin yang sama dengan dokumen (atas 1 cm, kanan 2 cm, bawah 2,5 cm, kiri 3 cm; kertas A4).
- **Dokumen yang dibuat**: Surat Antar ke Wali/Pengampu, Surat Antar ke Lurah, Undangan Sumpah (bila sumpah di kantor/Kanwil/Zoom), dan Dokumen Penyumpahan (Permohonan, BAP, BA Sumpah, BA Inventarisasi). *Undangan ke Kepala Desa/Lurah (menyaksikan)* dan *Tanda Terima Berkas* dihapus dari aplikasi.
- Tampilan desktop tidak berubah.

## Impor Massal PDF penetapan dari Google Drive (AI Claude, hemat token)
**Pasang sekali** (di proyek Apps Script *Dokumen Penyumpahan*):
1. File → + → Skrip, beri nama `ImporMassal`, tempel isi `ImporMassal.gs`, Simpan.
2. Pilih fungsi `pasangImporMassal` → **Jalankan** → izinkan akses.
3. Terapkan → Kelola deployment → ✏️ Edit → **Versi baru** → Terapkan.

Setelah itu kode server (`impor-massal-inti.js`) diambil otomatis dari GitHub (cache 10 menit, cadangan di Script Properties), jadi perbaikan berikutnya cukup di-push. Kunci Claude memakai yang sudah disimpan di Pengaturan. Folder Drive harus bisa dibuka akun pemilik proyek Apps Script. *Catatan keamanan: siapa pun yang bisa push ke branch ini dapat mengubah kode server tersebut.*

Menu **📂 Impor Massal PDF** (admin utama):
- **⚡ Impor Otomatis (1 klik)**: (bila dicentang) hapus dulu berkas lama Kepulauan Riau → ambil semua PDF di folder → baca → **langsung simpan yang ✔ siap**. Yang *perlu cek* / *ditolak* ditinggal di tabel untuk diperiksa lalu disimpan manual. Penghapusan Kepri hanya sekali: waktunya dicatat di server untuk semua admin, dan berkas hasil impor massal tidak pernah ikut terhapus.
- **⏰ Impor terjadwal**: server memeriksa folder sendiri (tiap 1/2/4/6/12 jam atau harian) tanpa aplikasi dibuka. PDF diubah jadi teks lewat OCR Google Drive (gratis), watermark dibuang, lalu teksnya dibaca Claude; bila OCR tidak lengkap (mis. >10 halaman), PDF utuh yang dibaca. Hasil masuk antrean dan **otomatis disimpan saat admin utama membuka aplikasi**; yang perlu cek muncul di dialog (tombol *Tinjau*). Ada tombol *Jalankan sekarang*.
- **Tahan watermark**: teks PDF dibaca di browser, tulisan miring/samar "Mahkamah Agung Republik Indonesia", kop direktori, nomor halaman dan disclaimer dibuang sebelum dibaca AI. PDF scan dibaca Claude langsung dari Drive.
- **Hemat token**: hanya teks bersih yang dikirim (bukan PDF) bila PDF punya teks, instruksi di-cache (file ke-2 dst. jauh lebih murah), jawaban dipaksa sesuai skema JSON (tidak ada ulang karena JSON rusak), file yang sudah diproses atau nomor penetapannya sudah ada **dilewati sebelum ke AI**. Isi BAP oleh AI opsional. Model: Opus 5.5 (bawaan, paling akurat), Sonnet 5.5, Haiku 5.5 (paling murah). Token terpakai tampil di dialog.
- **Hapus berkas per provinsi** (manual, bagian bawah dialog): berkas dipindah ke arsip terhapus, masih bisa dipulihkan.

## Tata letak A4 otomatis
Sebelum DOCX/Google Docs dibuat, pemecahan halaman disimulasikan di browser. Bila kalimat penutup + tanda tangan (+ saksi) terdorong ke halaman baru dan meninggalkan halaman yang banyak kosong: spasi dirapatkan bertahap bila dengan itu dokumen hemat satu halaman; bila tetap tidak muat, spasi di halaman yang kosong direnggangkan supaya terisi wajar. Tanda tangan selalu pindah bersama kalimat penutupnya (tidak pernah sendirian) dan ruang tanda tangan/meterai tidak dikecilkan. Pratinjau di aplikasi memakai hasil yang sama.

## Pasang sekali: tampilan otomatis dari GitHub (disarankan)
Ganti `const UI_URL` dan `function doGet()` di `Code.gs` dengan isi `doGet-dari-GitHub.gs`, lalu deploy **Versi baru** sekali. Setelah itu setiap `Index.html` yang di-push ke branch ini aktif sendiri (maks. 10 menit; `…/exec?segar=1` untuk langsung). Bila GitHub tidak bisa dihubungi, aplikasi memakai file `Index` di proyek (`…/exec?ui=lokal` untuk memaksanya).

## Cara pasang manual (tanpa GitHub)
1. Buka `Index.html` versi *raw* dari repo ini, **Ctrl+A → Ctrl+C**.
2. Di proyek Apps Script *Dokumen Penyumpahan*, buka file **Index**, **Ctrl+A → Ctrl+V**, lalu simpan.
3. **Terapkan → Kelola deployment → ✏️ Edit → Versi: Versi baru → Terapkan.** URL aplikasi tetap sama.

## Mengubah tampilan
Edit `app.src.html`, lalu jalankan `python3 build.py` (butuh Node.js untuk `npx terser`; tanpa itu build tetap jalan, hanya tanpa pengecilan JavaScript). Uji tanpa deploy: buka `Index.html` di browser → mode demo (username `shela`, password `demo`).
