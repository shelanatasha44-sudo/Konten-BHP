# 📝 SIMPEG Jurnal Harian Otomatis — BHP Medan Wilayah II

Ekstensi Chrome yang mengisi **jurnal harian SIMPEG** sendiri setiap **Senin–Jumat pukul 08.15**
dengan **3–4 kegiatan** Seksi Harta Peninggalan Wilayah II (perwalian/pengampuan, surat antar,
penyumpahan, SIPP, SPS, SAPA WALI, kunjungan Kepri, dll.), ditambah **Zoom Apel Pagi** dan **ISHOMA**.

Disesuaikan dengan form asli **Kinerja → Jurnal Harian** (`/devp/siap/skp_journal.php`): pilih tanggal di
kotak tanggal → **Tambah** → Jam Mulai/Selesai (jam & menit) → *SKP Tahunan/Tugas Tambahan/Kreatifitas*
(kegiatan kerja = butir SKP tahunan, apel & ISHOMA = Lain-Lain) → Kegiatan → Jumlah Diselesaikan →
Satuan → Biaya 0 → **Simpan**. Kegiatan yang sudah ada di tabel tanggal itu dilewati (tidak dobel).

## Cara kerja
- Jalan di Chrome Anda sendiri, memakai sesi login SIMPEG Anda (tidak menyimpan kata sandi, tidak ada server).
- Pukul **08.15** (bisa diubah) tab SIMPEG dibuka di latar → form jurnal diisi → **Simpan**, satu per satu kegiatan.
- Laptop baru dibuka siang? Dicek tiap 30 menit dan saat Chrome dibuka, jadi tetap terisi hari itu.
- **H-1 disusulkan otomatis** bila kemarin hari kerja dan belum terisi (sesuai aturan SIMPEG: H-1, H, H+1).
- Sabtu/Minggu & tanggal libur/cuti di Pengaturan dilewati.
- **Tetap login**: selama Chrome menyala, SIMPEG "disentuh" tiap 15 menit supaya sesi web tidak habis karena menganggur.
- Sesi tetap habis (mis. laptop mati semalam) → notifikasi "SIMPEG perlu login". Login sekali
  (NIP → password → captcha); pengisian yang tertunda **lanjut sendiri**. Captcha tidak diisi otomatis.
- Kegiatan tidak berulang dalam satu minggu, jam diatur 08.00–16.00 (Jumat istirahat 11.30–13.30).
- **23–27 Nov 2026** (kunjungan Kepri, Batam) otomatis berisi kegiatan perjalanan dinas, penyumpahan, inventarisasi harta, dan konsultasi di lokasi. Tanggal/kota bisa diubah.

## Pasang (±3 menit)
1. Unduh folder `simpeg-jurnal-otomatis` (GitHub → Code → Download ZIP, lalu ekstrak).
2. Chrome → `chrome://extensions` → nyalakan **Developer mode** → **Load unpacked** → pilih folder ini.
3. Halaman Pengaturan terbuka (URL Jurnal Harian sudah terisi) → **Simpan pengaturan**. Login SIMPEG di Chrome.
4. Klik ikon ekstensi → **Uji isi form (tanpa simpan)**. Tab SIMPEG terbuka, tanggal dipilih, form Tambah terisi
   tanpa disimpan. Periksa, lalu klik **Batal**.
5. Sudah pas → biarkan. Besok pukul 08.15 terisi sendiri. Bisa juga klik **Isi sekarang**.

> Laptop dimatikan/tidur → tidak ada yang mengisi (login SIMPEG web memakai captcha, jadi tidak bisa dari server).
> Saat laptop dinyalakan lagi, H-1 yang terlewat disusulkan otomatis setelah Anda login.
> Chrome harus menyala (boleh di latar) dan Anda tetap login SIMPEG. Di Chrome: Setelan → Sistem →
> *Terus jalankan aplikasi latar belakang saat Google Chrome ditutup* = aktif, agar tetap jalan saat jendela ditutup.

## Popup
- Pratinjau kegiatan H-1 / H / H+1 / tanggal mana pun (hasil per tanggal selalu sama dengan yang diisikan).
- **Isi sekarang**, **Uji isi form**, **Tandai sudah/belum** (mis. bila sudah diisi manual), dan log terakhir.

## Pengaturan
| Bagian | Isi |
|---|---|
| Halaman SIMPEG | URL jurnal, teks tombol Tambah/Simpan (bawaan "Tambah"/"Simpan") |
| Jadwal | Jam, jumlah kegiatan (3–4), aktif/nonaktif, simpan otomatis (matikan = mode uji), susul H-1, hari libur/cuti, kunjungan dinas |
| Isi form | Pilihan SKP untuk kegiatan kerja, apel pagi, ISHOMA, jaga sesi |
| Kegiatan tambahan | `uraian \| output \| satuan \| 1-3`, ikut diacak dengan bank kegiatan bawaan |

## File
| File | Isi |
|---|---|
| `manifest.json` | Manifes MV3 (izin: alarms, storage, scripting, tabs, notifications; akses `*.kemenkum.go.id`, `*.kemenkumham.go.id`) |
| `kegiatan.js` | Bank kegiatan Wilayah II + penyusun jurnal per tanggal |
| `filler.js` | Pilih tanggal + isi form Tambah Jurnal Harian SIMPEG, cegah dobel, jawab alert |
| `background.js` | Penjadwal, susulan H-1, jaga sesi, lanjut setelah login, log |
| `popup.*`, `options.*` | Tampilan |
