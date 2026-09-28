# Dokumen Penyumpahan BHP Medan — tampilan (UI)

Folder ini hanya berisi **tampilan** aplikasi Dokumen Penyumpahan. Backend (`Code.gs`, `BapSiap.gs`) tetap di proyek Apps Script dan tidak disimpan di repo publik ini karena memuat data pribadi dan kredensial.

| File | Isi |
|---|---|
| `app.src.html` | Sumber tampilan (HTML + CSS + JavaScript) yang diedit |
| `build.py` | Membuat `Index.html`: JavaScript diperkecil (terser), dikompres, lalu dibungkus base64url agar tidak dirusak HtmlService |
| `Index.html` | Hasil build: **file ini yang ditempel ke proyek Apps Script** |
| `vendor/inflate.min.js` | Pembuka kompresi (fflate, MIT) |

## Perubahan dibanding versi `damayantielsintha-wq/Kalender-Kerja-Wilayah-II` (ec4746f)
- **Mode HP**: menu kiri menjadi navigasi bawah (Daftar Berkas, Berkas Baru, Jadwal Sumpah, ☰ Lainnya); menu lain muncul sebagai lembar dari bawah. Bar atas ringkas (judul + tombol 👤 + kotak cari). Saat berkas dibuka, daftar disembunyikan dan ada tombol **← Daftar Berkas**. Input 16px agar iPhone tidak zoom otomatis.
- **Lebih ringan**: `Index.html` turun dari ±280 KB menjadi ±127 KB (JavaScript diperkecil dan dikompres). Font web tidak dimuat di HP dan tidak lagi menahan tampilan di desktop. Bayangan dimatikan di HP; animasi dimatikan bila HP meminta *reduced motion*.
- Tampilan desktop tidak berubah.

## Cara pasang
1. Buka `Index.html` versi *raw* dari repo ini, **Ctrl+A → Ctrl+C**.
2. Di proyek Apps Script *Dokumen Penyumpahan*, buka file **Index**, **Ctrl+A → Ctrl+V**, lalu simpan.
3. **Terapkan → Kelola deployment → ✏️ Edit → Versi: Versi baru → Terapkan.** URL aplikasi tetap sama.

## Mengubah tampilan
Edit `app.src.html`, lalu jalankan `python3 build.py` (butuh Node.js untuk `npx terser`; tanpa itu build tetap jalan, hanya tanpa pengecilan JavaScript). Uji tanpa deploy: buka `Index.html` di browser → mode demo (username `shela`, password `demo`).
