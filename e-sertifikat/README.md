# E-Sertifikat Kantor Wilayah Kementerian Hukum Sumatera Utara

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/shelanatasha44-sudo/Konten-BHP/tree/esertifikat/e-sertifikat)

Web sertifikat elektronik. Halaman utama adalah daftar hadir kegiatan aktif. Peserta mengisi daftar hadir dan menerima sertifikat PDF di email. Isian absen dapat ditambah oleh admin per kegiatan (misalnya nomor HP, jabatan, NIP, atau pilihan). PDF sertifikat diunduh oleh admin: per peserta, yang dicentang, atau semua sekaligus (ZIP atau satu PDF), lengkap dengan rekap per instansi. Setiap sertifikat memuat kode QR menuju halaman cek keaslian.

- `public/` halaman web (daftar hadir, cek keaslian, admin di `/admin`)
- Admin masuk dengan kata sandi. Kata sandi dibuat pada kunjungan pertama ke `/admin`
- `src/index.js` Cloudflare Worker (API); tabel database D1 dibuat otomatis saat pertama dipakai
- Desain sertifikat: Resmi Navy Emas, Gading Lembut, atau desain sendiri (misalnya dari Canva)
- Email otomatis lewat Google Apps Script milik panitia (menu Email Otomatis), dengan pengiriman susulan tiap menit

## Logo dan desain bercorak Pengayoman

- `alat/logo.mjs` logo Pengayoman geometris; `node alat/buat-logo.mjs` membuat `public/img/logo.png` dan `logo.svg`
- `node alat/latar-mewah.mjs` membuat latar desain Pengayoman Ulos Emas, Navy Agung Ragidup, Ulos Marun Kencana, dan Gorga Sitolu Bolit di `public/desain/`

## Tabel `berkas` (berkas pengganti)

Worker menyajikan berkas di tabel D1 `berkas` (kolom `jalur`, `tipe`, `data` base64) lebih dulu daripada folder `public`
untuk `/admin`, `/js/*`, `/img/*`, dan `/desain/*`. Ini dipakai bila berkas belum bisa ikut terpasang lewat wrangler.
Setelah `npx wrangler deploy` biasa berhasil memasang folder `public`, kosongkan tabel ini: `DELETE FROM berkas`.
