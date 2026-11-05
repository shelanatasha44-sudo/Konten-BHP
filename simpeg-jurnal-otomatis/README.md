# 📝 SIMPEG Jurnal Harian Otomatis — BHP Medan Wilayah II

Ekstensi Chrome yang mengisi **jurnal harian SIMPEG** sendiri setiap **Senin–Jumat pukul 08.15**
dengan **3–4 kegiatan** Seksi Harta Peninggalan Wilayah II (perwalian/pengampuan, surat antar,
penyumpahan, SIPP, SPS, SAPA WALI, kunjungan Kepri, dll.).

## Cara kerja
- Jalan di Chrome Anda sendiri, memakai sesi login SIMPEG Anda (tidak menyimpan kata sandi, tidak ada server).
- Pukul **08.15** (bisa diubah) tab SIMPEG dibuka di latar → form jurnal diisi → **Simpan**, satu per satu kegiatan.
- Laptop baru dibuka siang? Dicek tiap 30 menit dan saat Chrome dibuka, jadi tetap terisi hari itu.
- **H-1 disusulkan otomatis** bila kemarin hari kerja dan belum terisi (sesuai aturan SIMPEG: H-1, H, H+1).
- Sabtu/Minggu & tanggal libur/cuti di Pengaturan dilewati.
- Sesi SIMPEG habis → muncul notifikasi "Silakan login"; setelah login, pengisian **lanjut sendiri**.
- Kegiatan tidak berulang dalam satu minggu, jam diatur 08.00–16.00 (Jumat istirahat 11.30–13.30).
- **23–27 Nov 2026** (kunjungan Kepri, Batam) otomatis berisi kegiatan perjalanan dinas, penyumpahan, inventarisasi harta, dan konsultasi di lokasi. Tanggal/kota bisa diubah.

## Pasang (±3 menit)
1. Unduh folder `simpeg-jurnal-otomatis` (GitHub → Code → Download ZIP, lalu ekstrak).
2. Chrome → `chrome://extensions` → nyalakan **Developer mode** → **Load unpacked** → pilih folder ini.
3. Halaman Pengaturan terbuka. Isi **URL halaman Jurnal Harian SIMPEG** (buka menu jurnal di SIMPEG, salin alamat dari address bar) → **Simpan pengaturan**.
4. Klik ikon ekstensi → **Uji isi form (tanpa simpan)**. Tab SIMPEG terbuka dan form terisi tanpa disimpan.
   Periksa kolomnya; bila ada yang meleset, isi *Selektor kolom* / teks tombol di Pengaturan.
5. Sudah pas → biarkan. Besok pukul 08.15 terisi sendiri. Bisa juga klik **Isi sekarang**.

> Chrome harus menyala (boleh di latar) dan Anda tetap login SIMPEG. Di Chrome: Setelan → Sistem →
> *Terus jalankan aplikasi latar belakang saat Google Chrome ditutup* = aktif, agar tetap jalan saat jendela ditutup.

## Popup
- Pratinjau kegiatan H-1 / H / H+1 / tanggal mana pun (hasil per tanggal selalu sama dengan yang diisikan).
- **Isi sekarang**, **Uji isi form**, **Tandai sudah/belum** (mis. bila sudah diisi manual), dan log terakhir.

## Pengaturan
| Bagian | Isi |
|---|---|
| Halaman SIMPEG | URL jurnal, format tanggal (`dd-mm-yyyy` bawaan), teks tombol Tambah/Simpan bila tidak terdeteksi |
| Jadwal | Jam, jumlah kegiatan (3–4), aktif/nonaktif, simpan otomatis (matikan = mode uji), susul H-1, hari libur/cuti, kunjungan dinas |
| Selektor kolom | Kosong = deteksi otomatis dari label (Tanggal, Jam Mulai/Selesai, Uraian/Kegiatan, Output/Hasil, Jumlah/Volume, Satuan, Keterangan, SKP) |
| Kegiatan tambahan | `uraian \| output \| satuan \| 1-3`, ikut diacak dengan bank kegiatan bawaan |

## File
| File | Isi |
|---|---|
| `manifest.json` | Manifes MV3 (izin: alarms, storage, scripting, tabs, notifications; akses `*.kemenkum.go.id`, `*.kemenkumham.go.id`) |
| `kegiatan.js` | Bank kegiatan Wilayah II + penyusun jurnal per tanggal |
| `filler.js` | Pengisi form di halaman SIMPEG (deteksi kolom, isi, Simpan, konfirmasi SweetAlert) |
| `background.js` | Penjadwal, susulan H-1, lanjut setelah login, log |
| `popup.*`, `options.*` | Tampilan |
