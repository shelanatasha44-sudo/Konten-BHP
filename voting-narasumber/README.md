# Voting Narasumber Pengganti Dr. Janpatar Simamora

Halaman voting publik untuk Uji Publik Pengampuan Balai Harta Peninggalan Medan.

- Situs live: https://voting-narasumber-bhp-medan.netlify.app
- `public/index.html`: halaman voting (tema terang, tab Akademisi/Hakim, hasil live).
- `netlify/functions/api.mts`: server kecil yang menyimpan suara di Netlify Blobs.
  - `GET /api/results`: jumlah suara per kandidat (tanpa nama pemilih).
  - `POST /api/vote`: simpan atau perbarui suara satu perangkat.
  - `POST /api/admin`: daftar pemilih lengkap, perlu kata sandi admin.
  - `POST /api/admin/delete`: hapus satu suara, perlu kata sandi admin.

Kata sandi admin disimpan sebagai variabel lingkungan `ADMIN_PASSWORD` di pengaturan proyek Netlify, bukan di dalam kode.
