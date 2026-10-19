/**
 * PEMASANG IMPOR TERJADWAL (tempel SEKALI saja, selanjutnya memperbarui diri dari GitHub)
 *
 * Cara pasang di proyek Apps Script "Dokumen Penyumpahan":
 *   1. File → + → Skrip, beri nama  ImporMassal , tempel SELURUH isi file ini, lalu Simpan.
 *   2. ⚙ Setelan proyek → centang "Tampilkan file manifes appsscript.json" → buka appsscript.json, ganti isinya
 *      dengan dokumen-penyumpahan/appsscript.json dari GitHub (menambah izin pemicu waktu), Simpan.
 *   3. Pilih fungsi  pasangImporMassal  di bilah atas → Jalankan → izinkan akses (sekali saja).
 *   4. Terapkan → Kelola deployment → Edit → Versi baru → Terapkan.
 *   Folder Drive sumber PDF harus bisa dibuka akun pemilik proyek ini (minimal Pelihat).
 *
 * Isi sebenarnya (OCR PDF, panggil Claude lewat claudeJson_ di Code.gs, antrean) ada di file
 * dokumen-penyumpahan/impor-massal-inti.js di GitHub dan dimuat otomatis (di-cache 10 menit,
 * cadangan terakhir disimpan di Script Properties bila GitHub tidak bisa dihubungi).
 * Jadi perbaikan berikutnya cukup di-push ke GitHub — file ini tidak perlu ditempel ulang.
 * Perhatian: siapa pun yang bisa push ke branch tersebut dapat mengubah kode server ini.
 *
 * Kunci API Claude memakai kunci yang sudah disimpan lewat Pengaturan → AI Claude (CLAUDE_KEY).
 */
const IMPOR_INTI_URL = 'https://raw.githubusercontent.com/shelanatasha44-sudo/Konten-BHP/ccr-82a96c14-ey9957/dokumen-penyumpahan/impor-massal-inti.js';
const IMPOR_POTONG_PROP = 8000;
let IMPOR_INTI_ = null;

function intiImpor_(segar) {
  if (IMPOR_INTI_ && !segar) return IMPOR_INTI_;
  const cache = CacheService.getScriptCache(), props = PropertiesService.getScriptProperties();
  let kode = segar ? null : cache.get('impor_inti');
  if (!kode) {
    try {
      const r = UrlFetchApp.fetch(IMPOR_INTI_URL + '?t=' + Date.now(), { muteHttpExceptions: true });
      const t = r.getContentText('UTF-8');
      if (r.getResponseCode() === 200 && t.indexOf('IMPOR_INTI_OK') >= 0) {
        kode = t;
        try { cache.put('impor_inti', kode, 600); } catch (e) { /* terlalu besar untuk cache */ }
        const lama = Number(props.getProperty('IMPOR_INTI_N') || 0), simpan = {};
        let n = 0;
        for (let i = 0; i < kode.length; i += IMPOR_POTONG_PROP) simpan['IMPOR_INTI_' + (n++)] = kode.slice(i, i + IMPOR_POTONG_PROP);
        simpan.IMPOR_INTI_N = String(n);
        props.setProperties(simpan);
        for (let i = n; i < lama; i++) props.deleteProperty('IMPOR_INTI_' + i);
      }
    } catch (e) { /* GitHub tidak bisa dihubungi: pakai cadangan */ }
  }
  if (!kode) {
    const n = Number(props.getProperty('IMPOR_INTI_N') || 0);
    if (n) { kode = ''; for (let i = 0; i < n; i++) kode += props.getProperty('IMPOR_INTI_' + i) || ''; }
  }
  if (!kode) throw new Error('Kode impor massal belum bisa diambil dari GitHub. Coba lagi beberapa saat.');
  IMPOR_INTI_ = (0, eval)(kode);
  return IMPOR_INTI_;
}

/** Semua aksi impor massal dari aplikasi: google.script.run.apiImpor(token, aksi, …) */
function apiImpor(t, aksi, a, b, c) {
  const m = intiImpor_();
  if (typeof m[aksi] !== 'function') throw new Error('Aksi impor tidak dikenal: ' + aksi + ' (versi server ' + m.versi + ')');
  return m[aksi](t, a, b, c);
}

/** Dijalankan pemicu waktu (impor terjadwal). Jangan diganti namanya. */
function imporTerjadwal() {
  return intiImpor_().terjadwal();
}

/** Jalankan sekali dari editor untuk memberi izin & mengecek pemasangan. */
function pasangImporMassal() {
  izinImpor_();
  const m = intiImpor_(true);
  Logger.log('Impor terjadwal siap. Versi inti: ' + m.versi);
  return m.versi;
}

/* Dipanggil pasangImporMassal supaya Apps Script meminta semua izin yang dipakai kode inti (Drive, pemicu, internet, cache). */
function izinImpor_() {
  DriveApp.getRootFolder();
  ScriptApp.getProjectTriggers();
  ScriptApp.getOAuthToken();
  UrlFetchApp.getRequest('https://api.anthropic.com/v1/messages');
  CacheService.getScriptCache();
  PropertiesService.getScriptProperties();
  LockService.getScriptLock();
}
