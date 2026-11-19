# E-Sertifikat Kantor Wilayah Kementerian Hukum Sumatera Utara

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/shelanatasha44-sudo/Konten-BHP/tree/esertifikat/e-sertifikat)

Web sertifikat elektronik. Halaman utama adalah daftar hadir kegiatan aktif. Peserta mengisi daftar hadir, langsung mengunduh sertifikat PDF, dan menerima sertifikat di email. Setiap sertifikat memuat kode QR menuju halaman cek keaslian.

- `public/` halaman web (daftar hadir, cek keaslian, admin di `/admin`)
- Admin masuk dengan kata sandi. Kata sandi dibuat pada kunjungan pertama ke `/admin`
- `src/index.js` Cloudflare Worker (API); tabel database D1 dibuat otomatis saat pertama dipakai
- Desain sertifikat: Resmi Navy Emas, Gading Lembut, atau desain sendiri (misalnya dari Canva)
- Email otomatis lewat Google Apps Script milik panitia (menu Email Otomatis), dengan pengiriman susulan tiap menit
