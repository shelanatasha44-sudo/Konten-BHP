# 🚀 Deploy Kalender Kerja Wilayah II (sekali saja, ±10 menit)

> ✅ **Sudah di-deploy (9 Nov 2026):** **<https://bit.ly/kalenderkerjawilayah2>** → <https://script.google.com/macros/s/AKfycbxZhTNgSluvGvlJcjUjCQTVISnCLOesN60xseYz4cNK2nMfTbU8K3Gw6W9mLtT2pS8F/exec>

Hasil akhirnya: **satu link tetap** (`https://script.google.com/macros/s/…/exec`) yang bisa dibuka dan **diedit** oleh semua anggota tim dari HP maupun laptop, ditambah link pendek (mis. `bit.ly/kalenderwil2`).

> Kerjakan dari **laptop/PC** dengan akun Google yang akan menjadi **pemilik** kalender (data & lampiran tersimpan di Drive akun ini).

---

## 1. Buat proyek Apps Script
1. Buka <https://script.google.com> → **＋ Proyek baru**.
2. Klik judul *Proyek tanpa judul* → ganti menjadi **Kalender Kerja Wilayah II**.

## 2. Tempel 3 file
| Di Apps Script | Isi dari repo (buka file → tombol **Raw** → Ctrl+A, Ctrl+C) |
|---|---|
| `Code.gs` (sudah ada, hapus isinya dulu) | `kalender-kerja-wilayah-ii/Code.gs` |
| **＋ → HTML** → beri nama **`Index`** (tanpa `.html`) | `kalender-kerja-wilayah-ii/Index.html` |
| ⚙️ **Setelan proyek** → centang *Tampilkan file manifes "appsscript.json" di editor* → buka `appsscript.json` | `kalender-kerja-wilayah-ii/appsscript.json` |

Klik 💾 **Simpan** (Ctrl+S).

## 3. Jalankan `setup` (membuat database & folder)
1. Di bilah atas pilih fungsi **`setup`** → **▶ Jalankan**.
2. Muncul *Perlu otorisasi* → **Tinjau izin** → pilih akun Anda.
3. Bila muncul **"Google belum memverifikasi aplikasi ini"**: klik **Lanjutan** → **Buka Kalender Kerja Wilayah II (tidak aman)** → **Izinkan**. (Normal untuk aplikasi buatan sendiri.)
4. Di *Log eksekusi* tampil link **Spreadsheet** dan **Folder Drive**.

## 4. Bagikan folder ke tim sebagai Editor (wajib agar bisa mengedit)
1. Buka Google Drive → folder **Kalender Kerja Wilayah II**.
2. Klik kanan → **Bagikan** → masukkan email anggota tim → peran **Editor** → Kirim.
   *Tanpa langkah ini anggota tim tidak bisa membuka/mengedit data.* Anggota baru nanti cukup ditambahkan di sini.

## 5. Deploy sebagai aplikasi web
1. **Terapkan → Deployment baru** → ikon ⚙️ → **Aplikasi web**.
2. Isi:
   - Deskripsi: `v1`
   - **Jalankan sebagai: Saya (akun pemilik)**
   - **Yang memiliki akses: Siapa saja** (tanpa login — siapa pun yang punya link bisa membuka & mengisi; nama ditanyakan sekali per perangkat)
3. **Terapkan** → salin **URL aplikasi web** (berakhiran `/exec`). **Inilah link khusus kalender.**

## 6. Link pendek (opsional)
Buka <https://bitly.com> → *Create* → tempel URL `/exec` → ubah ujungnya, mis. **`bit.ly/kalenderwil2`**.

## 7. Pasang di HP
Buka link → login akun Google → (pertama kali) izinkan akses seperti langkah 3 → menu browser → **Tambahkan ke Layar Utama**. Kalender lalu terbuka seperti aplikasi.

---

## Setelah deploy
- **Link tidak pernah berubah.** Perubahan *tampilan* (`Index.html`) yang di-push ke GitHub branch `ccr-82a96c14-ey9957` aktif sendiri paling lambat 10 menit — tidak perlu deploy ulang.
  - `…/exec?segar=1` → langsung memuat tampilan terbaru.
  - `…/exec?ui=lokal` → pakai file `Index` di proyek (cadangan bila GitHub bermasalah).
- Bila `Code.gs` berubah: tempel ulang, lalu **Terapkan → Kelola deployment → ✏️ Edit → Versi: Versi baru → Terapkan** (link tetap sama). Jangan pakai *Deployment baru*, karena itu membuat link baru.
- **Bagikan kegiatan 1 tanggal**: pilih tanggal → **📤 Bagikan** (HP: di atas daftar kegiatan hari itu; laptop: ikon 📤 saat kursor di kotak tanggal, atau Ctrl+K → *Bagikan*). Bisa ke WhatsApp, salin teks, email, atau salin **link tanggal** (`…/exec?tgl=2026-11-09`) yang membuka kalender langsung di tanggal itu.
- Ringan di HP: data terakhir tersimpan di perangkat dan langsung tampil saat dibuka, lalu diperbarui di belakang; sinkron otomatis tiap 30 detik.

> Catatan keamanan: siapa pun yang bisa push ke branch `ccr-82a96c14-ey9957` dapat mengubah tampilan kalender. Data tetap hanya bisa dibaca/diubah oleh akun yang diberi akses Editor ke folder Drive.
