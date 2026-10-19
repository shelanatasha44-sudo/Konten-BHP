/* IMPOR_INTI_OK — inti server Impor Terjadwal (Dokumen Penyumpahan BHP Medan, versi aplikasi aktif).
 * File ini TIDAK ditempel ke Apps Script: dimuat otomatis oleh ImporMassal.gs dari GitHub (cache 10 menit),
 * jadi perubahan di sini aktif sendiri tanpa deploy ulang.
 * Format wajib: satu ekspresi yang mengembalikan objek aksi (dipanggil lewat apiImpor(token, aksi, …)).
 *
 * Memakai fungsi yang sudah ada di Code.gs: super_ (sesi admin utama), idDrive_, anakDrive_ (Drive lanjutan),
 * claudeJson_ + sistemAI_ (model hemat/teliti, prompt caching, pencatatan biaya AI). Kunci Claude = CLAUDE_KEY.
 *
 * Hemat token: PDF baru diubah jadi teks oleh OCR Google Drive (gratis), watermark dibuang, lalu TEKSNYA yang dibaca
 * model hemat. PDF utuh (model teliti) hanya untuk scan/teks OCR tidak lengkap. PDF yang sudah diproses atau nomornya
 * sudah ada di aplikasi dilewati sebelum ke AI. Cek silang & aturan kelayakan dijalankan aplikasi saat menyimpan antrean.
 */
(function () {
  var VERSI = '2026-10-19.5-aktif';
  var OCR_MAKS_BYTE = 2 * 1024 * 1024, OCR_MAKS_HAL = 10, MAKS_AI = 30 * 1024 * 1024;
  var DATA_PROP = 'IMPOR_DATA_ID';
  var KECUALI = /kecuali|dikecualikan|arsip|batal|tidak dilayani/i;

  /* ---------- nomor perkara dari nama file (sama dengan aplikasi: nomorDariFile + nomorKunci) ---------- */
  function nomorDariFile(n) {
    n = String(n || '');
    var m = n.match(/\b(PA|PN|MS)[\s._-]*([A-Za-z]+)[\s._-]+0*(\d+)[\s._-]*Pdt[\s._-]*P[\s._-]*(\d{4})/i), no, th, j, k;
    if (m) { j = m[1]; k = m[2]; no = m[3]; th = m[4]; }
    else {
      m = n.match(/(?:^|[^\d])0*(\d{1,5})[\s._-]*Pdt[\s._-]*P[\s._-]+(\d{4})[\s._-]+(PA|PN|MS)[\s._-]*([A-Za-z]{2,6})(?![A-Za-z])/i);
      if (!m) return '';
      no = m[1]; th = m[2]; j = m[3]; k = m[4];
    }
    k = k.charAt(0).toUpperCase() + k.slice(1).toLowerCase(); j = j.toUpperCase();
    return no + '/Pdt.P/' + th + '/' + (j === 'PN' ? 'PN ' + k : j + '.' + k);
  }
  function nomorKunci(n) { return String(n || '').toUpperCase().replace(/[\s.]/g, '').replace(/^0+/, ''); }

  /* ---------- watermark & OCR ---------- */
  var WM = [/^Direktori Putusan Mahkamah Agung Republik Indonesia$/i, /^putusan\.mahkamahagung\.go\.id$/i, /^Halaman \d+( dari \d+)?(\s+(Penetapan|Putusan)\b.*)?$/i,
    /^Disclaimer$/i, /^Kepaniteraan Mahkamah Agung Republik Indonesia berusaha/i, /^pelaksanaan fungsi peradilan/i, /^Dalam hal Anda menemukan inakurasi/i,
    /^masih terdapat kemungkinan/i, /^Email\s*:\s*kepaniteraan@/i, /^(M|Ma|Mah|Mahk|Mahka|Mahkam|Mahkama)?h?(kamah|amah|mah|ah)?\s*Agung\s*Repub(lik)?(\s*Indonesi?a?)?$/i,
    /^R?e?p?u?b?lik Indonesi?a?$/i, /^Mahkamah Agung$/i, /^[A-Za-z]{1,3}$/];
  function bersihWM(t) {
    return String(t || '').replace(/\r/g, '').split('\n').filter(function (l) { l = l.trim(); return l && !WM.some(function (r) { return r.test(l); }); }).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  function jumlahHal(bytes) {
    var s = '', n = Math.min(bytes.length, 4 * 1024 * 1024);
    for (var i = 0; i < n; i += 8192) s += String.fromCharCode.apply(null, bytes.slice(i, Math.min(n, i + 8192)).map(function (b) { return b & 255; }));
    var m = s.match(/\/Type\s*\/Page(?!s)/g);
    return m ? m.length : 0;
  }
  /* PDF → Google Docs sementara (OCR gratis) → teks → dokumen sementara dihapus */
  function teksOcr(id) {
    var h = { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, api = 'https://www.googleapis.com/drive/v3/files/';
    var r = UrlFetchApp.fetch(api + id + '/copy?ocrLanguage=id&supportsAllDrives=true&fields=id', { method: 'post', contentType: 'application/json', headers: h,
      payload: JSON.stringify({ mimeType: 'application/vnd.google-apps.document', name: 'tmp-ocr-impor-bhp' }), muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) return '';
    var nid = JSON.parse(r.getContentText()).id;
    try {
      var e = UrlFetchApp.fetch(api + nid + '/export?mimeType=text%2Fplain', { headers: h, muteHttpExceptions: true });
      return e.getResponseCode() === 200 ? e.getContentText('UTF-8') : '';
    } finally {
      UrlFetchApp.fetch(api + nid + '?supportsAllDrives=true', { method: 'delete', headers: h, muteHttpExceptions: true });
    }
  }
  /* satu PDF: teks OCR lengkap → model hemat; selain itu PDF utuh → model teliti */
  function bacaSatu(prompt, id) {
    var f = DriveApp.getFileById(id), mime = f.getMimeType(), ukuran = f.getSize(), tx = '';
    if (mime === 'application/pdf' && ukuran <= OCR_MAKS_BYTE) {
      var hal = jumlahHal(f.getBlob().getBytes());
      if (hal && hal <= OCR_MAKS_HAL) { try { tx = bersihWM(teksOcr(id)); } catch (e) { tx = ''; } }
    }
    var lengkap = tx.replace(/\s/g, '').length > 1500 && /(demikian(lah)?\s+ditetapkan|menetapkan)/i.test(tx);
    if (lengkap) {
      var d = claudeJson_([{ type: 'text', text: '<penetapan>\n' + tx.slice(0, 120000) + '\n</penetapan>' }], 4000, { system: sistemAI_(prompt), mode: 'hemat' });
      return { data: d, teks: tx.slice(0, 60000), cara: 'teks OCR · AI hemat' };
    }
    if (ukuran > MAKS_AI) throw new Error('File terlalu besar untuk dibaca AI (' + Math.round(ukuran / 1048576) + ' MB).');
    var b64 = Utilities.base64Encode(f.getBlob().getBytes());
    var doc = mime === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } }
      : { type: 'image', source: { type: 'base64', media_type: mime, data: b64 } };
    var d2 = claudeJson_([doc, { type: 'text', text: 'Baca dokumen penetapan terlampir sesuai instruksi.' }], 8000, { system: sistemAI_(prompt), mode: 'teliti' });
    return { data: d2, teks: '', cara: 'PDF utuh · AI teliti' };
  }
  /* PDF di folder + subfolder satu tingkat (subfolder "Dikecualikan…" dilewati), sama seperti Impor Spreadsheet / PDF */
  function daftarPdf(folder) {
    var id = idDrive_(folder);
    if (!id) throw new Error('Tautan folder Google Drive tidak dikenali.');
    var f;
    try { f = Drive.Files.get(id, { fields: 'id, name, mimeType', supportsAllDrives: true }); }
    catch (e) { throw new Error('Folder tidak bisa dibuka (pastikan dibagikan ke akun pemilik aplikasi): ' + String(e.message || e).slice(0, 150)); }
    if (f.mimeType !== 'application/vnd.google-apps.folder') throw new Error('Impor terjadwal butuh tautan FOLDER Google Drive (bukan spreadsheet).');
    var out = [], pdf = function (x) { if (x.mimeType === 'application/pdf' || /\.pdf$/i.test(x.name)) out.push({ id: x.id, nama: x.name }); };
    anakDrive_(f.id).forEach(function (x) {
      if (x.mimeType === 'application/vnd.google-apps.folder') { if (!KECUALI.test(x.name)) anakDrive_(x.id).forEach(pdf); }
      else pdf(x);
    });
    return out;
  }

  /* ---------- data impor terjadwal (file JSON di Drive pemilik aplikasi) ---------- */
  function dataKosong() { return { folder: '', prompt: '', jam: 0, sudah: {}, kunci: {}, gagal: {}, antrean: [], log: {} }; }
  function fileData() {
    var id = PROPS.getProperty(DATA_PROP);
    if (id) { try { var f = DriveApp.getFileById(id); if (!f.isTrashed()) return f; } catch (e) { } }
    var baru = DriveApp.createFile('Impor Terjadwal BHP - data (jangan dihapus).json', JSON.stringify(dataKosong()), 'application/json');
    PROPS.setProperty(DATA_PROP, baru.getId());
    return baru;
  }
  function baca() {
    var d; try { d = JSON.parse(fileData().getBlob().getDataAsString('UTF-8')); } catch (e) { d = null; }
    d = d || dataKosong(); var k = dataKosong();
    for (var x in k) if (d[x] === undefined) d[x] = k[x];
    return d;
  }
  function simpan(d) { fileData().setContent(JSON.stringify(d)); }
  function denganKunci(fn) {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) throw new Error('Impor terjadwal sedang berjalan, coba lagi sebentar.');
    try { return fn(); } finally { lock.releaseLock(); }
  }
  function triggerKu() { return ScriptApp.getProjectTriggers().filter(function (g) { return g.getHandlerFunction() === 'imporTerjadwal'; }); }

  function jadwalStatus(t) {
    super_(t);
    var d = baca();
    return { versi: VERSI, aktif: triggerKu().length > 0, jam: d.jam, folder: d.folder, antrean: d.antrean.length, sudah: Object.keys(d.sudah).length, log: d.log };
  }
  /* c = {aktif, jam, folder, prompt, kunci:[nomorKunci berkas yang sudah ada]} */
  function jadwalAtur(t, c) {
    super_(t);
    c = c || {};
    return denganKunci(function () {
      var d = baca();
      if (c.folder) { daftarPdf(c.folder); d.folder = c.folder; }
      if (c.prompt) d.prompt = c.prompt;
      (c.kunci || []).forEach(function (k) { if (k) d.kunci[k] = 1; });
      triggerKu().forEach(function (g) { ScriptApp.deleteTrigger(g); });
      d.jam = 0;
      if (c.aktif) {
        if (!d.folder || !d.prompt) throw new Error('Isi tautan folder Drive dulu.');
        var jam = [1, 2, 4, 6, 8, 12, 24].indexOf(+c.jam) >= 0 ? +c.jam : 1;
        var b = ScriptApp.newTrigger('imporTerjadwal').timeBased();
        if (jam === 24) b.everyDays(1).atHour(6).create(); else b.everyHours(jam).create();
        d.jam = jam;
      }
      simpan(d);
      return true;
    });
  }
  /* dipanggil pemicu waktu (tanpa browser) atau tombol "Jalankan sekarang" */
  function terjadwal(batasMs) {
    var mulai = Date.now();
    return denganKunci(function () {
      var d = baca(), ringkas = { dibaca: 0, dilewati: 0, gagal: 0, sisa: 0 };
      if (!d.folder || !d.prompt || !PROPS.getProperty('CLAUDE_KEY')) return ringkas;
      var antre = {};
      d.antrean.forEach(function (x) { antre[x.id] = 1; });
      var baru = daftarPdf(d.folder).filter(function (x) {
        if (d.sudah[x.id] || antre[x.id] || (d.gagal[x.id] || 0) >= 3) return false;
        var k = nomorKunci(nomorDariFile(x.nama));
        if (k && d.kunci[k]) { d.sudah[x.id] = 1; ringkas.dilewati++; return false; }
        return true;
      });
      for (var i = 0; i < baru.length; i++) {
        if (Date.now() - mulai > batasMs) { ringkas.sisa = baru.length - i; break; }
        var x = baru[i], k1 = nomorKunci(nomorDariFile(x.nama));
        if (k1 && d.kunci[k1]) { d.sudah[x.id] = 1; ringkas.dilewati++; continue; } /* ganda dengan PDF yang baru dibaca */
        try {
          var r = bacaSatu(d.prompt, x.id);
          d.antrean.push({ id: x.id, nama: x.nama, data: r.data, teks: r.teks, cara: r.cara, waktu: new Date().toISOString() });
          var k2 = nomorKunci(r.data && r.data.nomorPenetapan); if (k2) d.kunci[k2] = 1;
          ringkas.dibaca++;
        } catch (e) {
          d.gagal[x.id] = (d.gagal[x.id] || 0) + 1; ringkas.gagal++;
          d.log.galat = x.nama + ': ' + String(e.message || e).slice(0, 200);
        }
        simpan(d);
      }
      d.log.terakhir = new Date().toISOString(); d.log.ringkas = ringkas;
      simpan(d);
      return ringkas;
    });
  }
  /* PDF sudah diproses (disimpan / ganda / ditolak) → keluar dari antrean & tidak dibaca lagi */
  function selesai(t, ids, kunci) {
    super_(t);
    return denganKunci(function () {
      var d = baca(), s = {};
      (ids || []).forEach(function (id) { if (id) { d.sudah[id] = 1; s[id] = 1; } });
      (kunci || []).forEach(function (k) { if (k) d.kunci[k] = 1; });
      d.antrean = d.antrean.filter(function (x) { return !s[x.id]; });
      simpan(d);
      return d.antrean.length;
    });
  }

  return {
    versi: VERSI,
    jadwalStatus: jadwalStatus,
    jadwalAtur: jadwalAtur,
    jadwalJalan: function (t) { super_(t); return terjadwal(240000); },
    antrean: function (t) { super_(t); return baca().antrean; },
    selesai: selesai,
    terjadwal: function () { return terjadwal(300000); }
  };
})()
