# E-Sertifikat Kantor Wilayah Kementerian Hukum Sumatera Utara

Web sertifikat elektronik: pengelola membuat acara, peserta mengisi daftar hadir lalu langsung mengunduh sertifikat PDF, dan setiap sertifikat memuat kode QR menuju halaman cek keaslian.

- `public/` halaman web (beranda, daftar hadir, verifikasi, kelola)
- `src/index.js` Cloudflare Worker (API)
- `schema.sql` tabel database D1
- Pemasangan otomatis lewat GitHub Actions (`.github/workflows/esertifikat.yml`) memakai secret `CLOUDFLARE_API_TOKEN`.
