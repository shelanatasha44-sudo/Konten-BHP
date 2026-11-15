# 📱 Jurnal SIMPEG Otomatis — Aplikasi Android (uji coba)

Aplikasi ini mengisi **Jurnal Harian di aplikasi SIMPEG KUMHAM** di HP dengan cara mengetuk layar
seperti tangan Anda sendiri. Isi kegiatan, jam, dan jumlahnya sama persis dengan plugin Chrome
(`simpeg-jurnal-otomatis`), karena keduanya memakai berkas `kegiatan.js` dan data GitHub yang sama.
Kegiatan yang sudah terisi lewat laptop akan dilewati, sehingga tidak tercatat dua kali.

Aplikasi tidak mengirim data ke server SIMPEG secara langsung. Semua pengisian berjalan di dalam
aplikasi SIMPEG resmi, jadi login, captcha, dan aturan SIMPEG tetap berlaku seperti biasa.

## Pasang (±5 menit)
1. Unduh **`JurnalSIMPEG.apk`** dari folder ini ke HP (buka berkasnya di GitHub → tombol unduh).
2. Buka berkas APK. Bila Android meminta, izinkan "Instal aplikasi tidak dikenal" untuk browser/File Manager.
3. **Android 13 ke atas:** buka *Setelan → Aplikasi → Jurnal SIMPEG → ⋮ (pojok kanan atas) →
   Izinkan setelan terbatas*. Langkah ini wajib untuk aplikasi yang dipasang dari APK, karena tanpa itu
   layanan aksesibilitas tidak bisa dinyalakan.
4. Buka aplikasi **Jurnal SIMPEG**, tekan tombol merah **Aktifkan**, lalu nyalakan
   *Jurnal SIMPEG Otomatis* di daftar Aksesibilitas.
5. Login di aplikasi **SIMPEG KUMHAM** seperti biasa.
6. Kembali ke Jurnal SIMPEG dan tekan **Uji 1 form (tanpa simpan)**. Aplikasi SIMPEG akan terbuka,
   lalu menu Kinerja → Jurnal Harian → tombol + diketuk sendiri dan form kegiatan pertama terisi tanpa disimpan.
   Periksa isinya, lalu tekan kembali untuk membatalkan.
7. Bila hasil uji sudah pas, gunakan **▶ Isi otomatis di aplikasi SIMPEG** untuk mengisi semua kegiatan.

## Cara kerja
- Aplikasi mengenali setiap layar SIMPEG dari teksnya (Beranda, Kinerja, Jurnal Harian, form Tambah,
  pemilih tanggal, pemilih jam), bukan dari posisi tombol. Untuk tanggal dan jam, aplikasi memakai
  mode ketik pada pemilih bila tersedia, dan beralih ke mengetuk angka pada jam analog bila tidak.
- Setiap pagi hari kerja pukul **08.15** (bisa diubah) muncul notifikasi. Ketuk notifikasi itu, lalu
  pengisian dimulai. HP yang terkunci tidak bisa diisi otomatis, karena Android tidak mengizinkan aplikasi
  membuka kunci layar.
- Sabtu, Minggu, hari libur, dan **masa tutup SIMPEG tanggal 14–18** (penarikan tukin) dilewati.
- Pengisian berhenti sendiri bila SIMPEG meminta login, bila tombol atau kolom tidak ditemukan, atau bila
  SIMPEG menolak simpanan. Penyebabnya dikirim lewat notifikasi dan dicatat di log.
- Isi kolom kata sandi tidak pernah dibaca atau direkam.

## Bila macet
Aplikasi ini belum pernah dicoba langsung di HP, jadi kemungkinan ada label tombol SIMPEG yang berbeda
dari dugaan. Saat satu langkah gagal, isi layar SIMPEG otomatis direkam ke log. Untuk memperbaikinya:
1. Buka **🩺 Diagnosa & log** → nyalakan **Rekam isi layar SIMPEG**.
2. Tekan **Uji 1 form** sekali lagi, atau jalani sendiri langkah Kinerja → Jurnal Harian → + → isi form.
3. Tekan **Bagikan log**, lalu kirimkan teksnya ke Claude. Selector tombol akan disesuaikan dari log itu.
4. Matikan lagi perekaman setelah selesai.

## Membangun ulang APK
Butuh Ubuntu dengan `android-sdk-build-tools`, `apksigner`, `zipalign`, dan Java 17+. Jalankan `./build.sh`.
Skrip ini menyalin `../simpeg-jurnal-otomatis/kegiatan.js`, lalu memakai aapt, javac, dx, zipalign, dan
apksigner tanpa Android Studio. APK ditandatangani dengan `kunci-tanda-tangan.jks` (kata sandi `jurnalsimpeg`)
supaya versi baru bisa dipasang menimpa versi lama tanpa menghapus aplikasi.

## Berkas
| Berkas | Isi |
|---|---|
| `JurnalSIMPEG.apk` | Aplikasi siap pasang |
| `src/.../LayananIsi.java` | Layanan aksesibilitas: mengenali layar SIMPEG dan mengisi form langkah demi langkah |
| `src/.../MainActivity.java` | Layar utama (WebView) dan jembatan ke layanan |
| `src/.../Pengingat.java` | Notifikasi harian dan penjadwalan ulang setelah HP dinyalakan |
| `assets/index.html` | Tampilan: pratinjau H-1/H/H+1, tombol isi/uji, pengaturan, diagnosa |
| `build.sh` | Skrip build APK |
