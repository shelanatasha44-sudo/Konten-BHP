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
- **Menu 🗑 Berkas Dihapus** (admin utama): berkas terhapus tidak lagi ikut di Daftar Berkas maupun hitungan provinsi/kota/bulan; dibuka dari menu sendiri dan bisa dipulihkan satu per satu atau sekaligus.
- **🧩 Lengkapi berkas yang tampil** (admin utama, di atas Daftar Berkas): untuk berkas yang sedang tampil (mis. hasil pencarian “Batam”), nama yang disamarkan dicari di SIPP lalu kolom kosong diisi dari PDF penetapan (AI hemat). Hanya mengisi yang kosong, tidak membuat berkas baru — tidak ada data ganda. Di menu Cek SIPP, tautan *SIPP ↗* kini juga muncul saat server gagal menghubungi SIPP (mis. tertahan verifikasi Cloudflare), supaya nomor perkara bisa dicari langsung di browser lalu namanya diisi lewat tombol *Pakai*.
- **SIPP lebih akurat** (kode server di `impor-massal-inti.js`, aktif sendiri dari GitHub): nomor perkara dicocokkan persis (pencarian SIPP bersifat “mengandung” — 48/Pdt.P/2026 juga memunculkan 148 & 248), halaman hasil berikutnya ikut ditelusuri, dan selain Data Umum kini **amar putusan** ikut diambil (cookie sesi `show_detil` → `show_putusan`). Teks SIPP (amar resmi didahulukan; petitum hanya bila amar belum terbit) dibaca AI hemat lalu diisikan lewat `isiDariPen`: hanya kolom kosong, dan nama/tanggal ditahan bila tidak tertulis persis di teks SIPP. SIPP yang memakai verifikasi Cloudflare (mis. PN Batam) dilaporkan jelas; cari manual lewat *Cek SIPP → SIPP ↗*.
- **Tembusan tanpa "Pertinggal"** di semua dokumen.
- **Hubungan perwalian tidak terbalik**: bila kolom Hubungan berisi peran pemohon (Paman/Bibi, Kakek/Nenek, Ayah/Ibu, Kakak — sering dari kolom `Status_Dengan_Wali` spreadsheet), dokumen otomatis menulis hubungan anak terhadap pemohon (keponakan, cucu, anak kandung, adik). Impor spreadsheet berikutnya langsung menyimpan versi yang benar.
- **Tata letak A4 otomatis** (disimulasikan sebelum DOCX/Google Docs dibuat): (1) spasi **seragam satu dokumen**; (2) dirapatkan seperlunya — pertama baris titik-titik isian BA Harta (24→20 pt), baru spasi teks (paling rapat 0,9×) — hanya bila **pasti** hemat satu halaman atau bila perkiraan normal pas-pasan (dihitung dengan halaman 10% lebih pendek, supaya tanda tangan tidak meluber ke halaman baru); (3) selain itu, bila penutup + tanda tangan pindah halaman dan meninggalkan halaman kosong, spasi seluruh dokumen direnggangkan bertahap (maks. ±1,35) lalu sisa ruang diisi jarak antarparagraf. Tanda tangan selalu ikut kalimat penutupnya; ruang tanda tangan/meterai tidak diubah. Pratinjau memakai hasil yang sama.
- **⚡ Impor Otomatis (1 klik)** di menu *Impor Spreadsheet / PDF*: (sekali) hapus berkas lama Kepulauan Riau → periksa sumber → impor baris spreadsheet (0 token) → SIPP (gratis) → lengkapi dari PDF (AI hemat) → baca PDF tanpa baris data (AI hemat; teliti hanya bila cek silang gagal; scan opsional). Langkah sama dengan tombol manual.
- **Hapus Kepulauan Riau sekali saja**: waktunya disimpan di Pengaturan (`kepriDihapus`) untuk semua admin; berkas yang dibuat sesudahnya (hasil impor ulang) tidak pernah ikut terhapus. Berkas masuk arsip terhapus, bisa dipulihkan.
- **Nama file direktori putusan MA dikenali** (`putusan_12_pdt.p_2026_pn_btm.pdf`, `salinan_putusan_1_Pdt_P_2025_PN_Dum.pdf`) → PDF yang sudah ada di aplikasi, atau ganda di folder, dilewati **sebelum** dibaca AI.
- **⏰ Impor terjadwal**: server memeriksa folder Drive sendiri (tiap 1/2/4/6/12 jam atau harian). PDF baru → OCR Google Drive (gratis) → watermark dibuang → teks dibaca model hemat (`claudeJson_`/`sistemAI_` di Code.gs, dengan prompt caching & pencatatan biaya yang sama); scan/teks tidak lengkap → PDF utuh dibaca model teliti. Hasil masuk antrean dan **disimpan otomatis saat admin utama membuka aplikasi** (cek silang teks, aturan kelayakan, dan pencegahan dobel yang sama).

## Mode ringkas pengisian manual (30 Okt 2026)
- Tombol **🧾 Ringkas ✓ / Tampilan lengkap** di atas form berkas (pilihan diingat di perangkat; bawaan: ringkas).
- Mode ringkas menyembunyikan kolom opsional yang **masih kosong**: provinsi, alamat SIPP, nomor surat SPS, email, kantor lurah/camat, kota permohonan, tanggal surat permohonan, link Zoom, tembusan Kanwil, saksi BA, harta selain tanah & uang (emas, surat berharga, perabot, barang bergerak, hutang), serta kotak hitungan otomatis (usia, hari/tanggal BA, lafaz).
- Kolom yang sudah berisi atau ditandai merah/kuning oleh pemeriksaan **selalu tampil**. Nomor BA, BAP, dan BA Inventarisasi tampil sejak tanggal sumpah tiba (hari H).
- Di bawah form ada tombol **➕ Tampilkan N kolom lainnya** untuk membuka semua kolom.

## Pembaca PDF lebih teliti & cepat (30 Okt 2026)
- **Instruksi AI lebih ketat**: nama/NIK/nomor disalin persis, NIK wajib 16 digit, pemohon tidak tertukar dengan kuasa/saksi/pasangan, tanggal lahir anak tidak tertukar, tanggal penetapan = tanggal diucapkan (bukan tanggal daftar/sidang), amar didahulukan, "para Pemohon" → Pemohon I sebagai nama.
- **Cek silang lebih lengkap**: selain nama, nomor dan tanggal penetapan, kini NIK (16 digit & tertulis di teks), tanggal lahir pemohon dan terampu ikut diperiksa.
- **Koreksi otomatis dari teks asli**: nilai AI yang tidak tertulis di penetapan (NIK, tanggal lahir, tanggal/nomor penetapan) diganti nilai yang tertulis persis di teks; NIK yang meleset 1–2 digit dicocokkan dengan NIK di teks. Kolom yang dikoreksi ditampilkan (🛠) di layar periksa. Berlaku juga untuk impor massal & impor terjadwal (termasuk koreksi arah hubungan).
- **Lebih cepat**: hasil baca langsung tampil; isi BAP disusun AI di latar belakang dan masuk ke berkas begitu selesai (hanya bila isi BAP masih kosong). Melengkapi berkas yang sudah punya isi BAP tidak lagi menyusun BAP ulang.
- **AI dijalankan lagi = hanya mengisi yang kosong, data baru tetap masuk**: isian lama tidak pernah ditimpa; anak yang belum tercatat ditambahkan, harta & saksi baru ditambahkan (aset dengan nomor sertifikat/rekening sama atau uraian yang sama tidak diulang), slot anak kosong diisi tanpa menimpa isiannya. PDF di impor massal/terjadwal yang berkasnya sudah ada kini melengkapi kolom kosong berkas itu (sebelumnya dilewati).

## Pasang
1. **Tampilan**: buka `Index.html` (raw) → Ctrl+A, Ctrl+C → di proyek Apps Script buka file **Index** → Ctrl+A, Ctrl+V → Simpan.
2. **Impor terjadwal** (sekali): buat file skrip `ImporMassal` berisi `ImporMassal.gs`; ⚙ Setelan proyek → centang *Tampilkan file manifes* → ganti isi `appsscript.json` dengan file di sini; pilih fungsi `pasangImporMassal` → Jalankan → izinkan.
3. **Terapkan → Kelola deployment → ✏️ Edit → Versi baru → Terapkan.** URL aplikasi tetap sama.
## Prioritas: nama wali/pengampu + kantor kelurahan
Surat antar cukup tahu **siapa** dan **ke mana** dikirim.
- **Surat Antar ke Wali/Pengampu**: wajib *nama + alamat*. **Surat Antar ke Lurah**: wajib *nama + kelurahan tempat tinggal + alamat kantor kelurahan*. **Undangan**: *nama + alamat + tanggal sumpah*. Isian lain yang kosong (nomor/tanggal penetapan, jadwal, dll.) tidak lagi menghalangi pengambilan nomor SPS atau pembuatan surat; di surat tampil "……" kuning dan bisa dilengkapi di Google Docs. Dokumen hari H (Permohonan, BAP, BA Sumpah, BA Inventarisasi) tetap wajib lengkap.
- Pemeriksaan: kelurahan kosong = **kesalahan** (merah), alamat kantor kelurahan kosong = peringatan (surat ke Lurah hanya bertuliskan "di Tempat").
- Impor Massal PDF / Spreadsheet / CSV: kelurahan diambil dari alamat bila tidak tertulis terpisah; berkas tanpa kelurahan ditandai **perlu cek** dan nama kelurahan tampil di daftar hasil baca. AI diminta memprioritaskan nama pemohon dan kelurahan.

## Format surat antar & Kepulauan Riau
- Surat Antar ke Pengampu, Surat Antar ke Lurah (pengampuan & perwalian) mengikuti format Word terbaru (paragraf "Besar harapan kami agar Bapak/Ibu Lurah berkenan membantu meneruskan surat ini…"). Surat Antar ke Wali disusun dari format pengampu. Dasar PNBP: **PP Nomor 30 Tahun 2026** (berlaku 1 Agustus 2026) di semua surat.
- Tembusan Kanwil mengikuti provinsi tempat tinggal (mis. Kepala Kantor Wilayah Kementerian Hukum Kepulauan Riau); Sumatera Utara/tidak diketahui memakai Pengaturan.
- **Kepulauan Riau**: jadwal di surat berupa rentang kunjungan (bawaan Senin–Jumat, 23 s.d. 27 November 2026; ubah di ⚙ Pengaturan) — hari & jam dipilih wali/pengampu lewat WhatsApp, ditambah paragraf yang menegaskan BHP hadir sebagai perpanjangan tangan negara untuk mendampingi dan memberi konsultasi hukum.
- **Tujuan surat ke Lurah/Camat otomatis**: bila kolom kantor kelurahan kosong, alamat diambil dari data kantor (Kota Batam: 12 kantor camat + 30 kantor lurah; Tanjungpinang: 2 kantor camat — sumber batam.link & situs resmi kec*.batam.go.id/tanjungpinangkota.go.id). Kantor lurah tidak diketahui atau hanya tahu kecamatan → surat dialihkan ke **Kantor Camat**. Syarat minimal surat: **nama wali/pengampu + kelurahan/kecamatan**.
- Usia anak berkas Kepri dihitung pada hari pertama kunjungan; berkas yang ditolak atau semua anaknya sudah 17+ tidak ikut disurati.
- Menu **📦 Surat Massal Kepri**: semua Surat Antar ke Wali/Pengampu + ke Lurah berkas Kepulauan Riau dibuat sekaligus dalam satu ZIP (per kota/kabupaten) + `Daftar Pengiriman.csv`. Opsional ambil nomor SPS sekaligus.

## Isian baru tidak mengubah/menghapus data lain
- **Upload PDF penetapan ke berkas yang sudah ada** (tab 1 → *Isi otomatis dari PDF Penetapan*) hanya mengisi kolom yang masih kosong; anak baru ditambahkan tanpa menghapus anak lama. Kolom yang sudah berisi dan berbeda dengan penetapan **tidak diganti** — muncul daftar untuk dicentang bila memang ingin diganti.
- **Kelurahan** hanya ikut berubah saat alamat diketik bila kelurahan masih kosong atau memang salinan dari alamat sebelumnya.
- **Berkas diubah dua orang bersamaan**: perubahan Anda digabung ke data terbaru di server (sebelumnya perubahan Anda dibuang). Kolom yang diubah keduanya memakai isian orang lain dan Anda diberi tahu isian Anda supaya bisa diulang.

## Impor Massal PDF penetapan dari Google Drive (AI Claude, hemat token)
Menu **📂 Impor Massal PDF** (admin utama): tempel tautan folder Drive → **Ambil daftar PDF** → **Baca** → periksa → **Simpan**.
- **Pasang sekali**: di proyek Apps Script buat file skrip baru `ImporMassal`, tempel isi `ImporMassal.gs`, lalu deploy **Versi baru**. Kunci Claude yang sudah disimpan di Pengaturan dipakai otomatis. Folder Drive harus bisa dibuka akun pemilik proyek Apps Script.
- **Tahan watermark**: teks PDF dibaca di browser, tulisan miring/samar "Mahkamah Agung Republik Indonesia", kop direktori, nomor halaman dan disclaimer dibuang sebelum dibaca AI. PDF scan dibaca Claude langsung dari Drive (visi).
- **Hemat token**: PDF yang punya lapisan teks hanya dikirim teks bersihnya (bukan PDF), instruksi di-cache di server (berkas ke-2 dst. jauh lebih murah), jawaban dipaksa sesuai skema JSON (tidak ada ulang karena JSON rusak), dan file yang nomor penetapannya sudah ada di aplikasi / ganda di folder **dilewati sebelum ke AI**. Penyusunan isi BAP oleh AI opsional (dicentang = lebih boros). Pilihan model: Opus 5.5 (bawaan, paling akurat), Sonnet 5.5, Haiku 5.5 (paling murah). Jumlah token terpakai tampil di dialog.
- Hasil berlabel ✔ siap, *perlu cek* (ada isian kosong), *ditolak* (aturan kelayakan), *sudah ada*. Hanya yang dicentang yang disimpan.
- **Hapus berkas per provinsi** (bagian bawah dialog): mis. hapus semua berkas Kepulauan Riau sebelum input ulang. Berkas dipindah ke arsip terhapus, masih bisa dipulihkan.

Folder Drive sumber PDF harus bisa dibuka akun pemilik proyek Apps Script. *Catatan keamanan: siapa pun yang bisa push ke branch ini dapat mengubah kode server impor terjadwal.*

## Mengubah tampilan
Edit `app.src.html`, lalu `python3 build.py` (butuh Node.js untuk `npx terser`). Uji tanpa deploy: buka `Index.html` di browser → mode demo (username `shela`, password `demo`).
