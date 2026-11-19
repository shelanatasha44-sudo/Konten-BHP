# E-Sertifikat Kantor Wilayah Kementerian Hukum Sumatera Utara

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/shelanatasha44-sudo/Konten-BHP/tree/esertifikat/e-sertifikat)

Web sertifikat elektronik: pengelola membuat acara, peserta mengisi daftar hadir lalu langsung mengunduh sertifikat PDF, dan setiap sertifikat memuat kode QR menuju halaman cek keaslian.

- `public/` halaman web (beranda, daftar hadir, verifikasi, kelola)
- `src/index.js` Cloudflare Worker (API); tabel database D1 dibuat otomatis saat pertama dipakai
- Desain sertifikat: Resmi Navy Emas, Gading Lembut, atau desain sendiri (misalnya dari Canva)
- Email otomatis lewat Google Apps Script milik panitia (menu Pengaturan Email)
