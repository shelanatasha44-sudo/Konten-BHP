/**
 * PENGGANTI doGet — tampilan diambil langsung dari GitHub.
 *
 * Cara pasang (sekali saja, di proyek Apps Script "Dokumen Penyumpahan", file Code.gs):
 *   1. Hapus baris  const UI_URL = '...';  dan seluruh  function doGet() { ... }  yang lama.
 *   2. Tempel seluruh isi file ini di tempat yang sama, lalu Simpan.
 *   3. Terapkan → Kelola deployment → Edit → Versi baru → Terapkan.
 *
 * Setelah itu setiap perubahan Index.html yang di-push ke GitHub aktif sendiri
 * (paling lambat 10 menit, karena disimpan sementara di cache server).
 *   - Buka  …/exec?segar=1  untuk langsung memuat versi terbaru tanpa menunggu cache.
 *   - Buka  …/exec?ui=lokal  untuk memakai file Index di proyek ini (cadangan darurat).
 * Bila GitHub tidak bisa dihubungi, aplikasi otomatis memakai file Index di proyek ini.
 */
const UI_URL = 'https://raw.githubusercontent.com/shelanatasha44-sudo/Konten-BHP/ccr-82a96c14-ey9957/dokumen-penyumpahan/Index.html';
const UI_CACHE_DETIK = 600;
const UI_POTONG = 45000; // batas CacheService ±100 KB per kunci

function uiDariGitHub_(segar) {
  const cache = CacheService.getScriptCache();
  if (!segar) {
    const n = Number(cache.get('ui_n') || 0);
    if (n) {
      const keys = [];
      for (let i = 0; i < n; i++) keys.push('ui_' + i);
      const parts = cache.getAll(keys);
      if (Object.keys(parts).length === n) return keys.map(function (k) { return parts[k]; }).join('');
    }
  }
  try {
    const res = UrlFetchApp.fetch(UI_URL + '?t=' + Date.now(), { muteHttpExceptions: true });
    const html = res.getContentText('UTF-8');
    if (res.getResponseCode() !== 200 || html.indexOf('</html>') < 0) return null;
    const simpan = {};
    let k = 0;
    for (let i = 0; i < html.length; i += UI_POTONG) simpan['ui_' + (k++)] = html.slice(i, i + UI_POTONG);
    simpan.ui_n = String(k);
    try { cache.putAll(simpan, UI_CACHE_DETIK); } catch (e) { /* terlalu besar untuk cache: tetap tampil */ }
    return html;
  } catch (e) {
    return null;
  }
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  const html = p.ui === 'lokal' ? null : uiDariGitHub_(p.segar === '1');
  const out = html ? HtmlService.createHtmlOutput(html) : HtmlService.createHtmlOutputFromFile('Index');
  return out
    .setTitle('Dokumen Penyumpahan BHP')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
