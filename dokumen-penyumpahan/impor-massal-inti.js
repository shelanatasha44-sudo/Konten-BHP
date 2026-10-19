/* IMPOR_INTI_OK — inti server Impor Massal PDF (Dokumen Penyumpahan BHP Medan).
 * File ini TIDAK ditempel ke Apps Script: dimuat otomatis oleh ImporMassal.gs dari GitHub (di-cache 10 menit),
 * jadi setiap perubahan di sini aktif sendiri tanpa deploy ulang.
 * Format wajib: satu ekspresi yang mengembalikan objek berisi aksi (dipanggil lewat apiImpor(token, aksi, …)).
 *
 * Hemat token:
 *  - PDF berlapisan teks: dari browser hanya teks bersihnya (watermark dibuang) yang dikirim ke Claude.
 *  - Impor terjadwal (tanpa browser): PDF diubah jadi teks oleh OCR Google Drive (gratis), watermark dibuang,
 *    lalu teksnya yang dikirim; bila hasil OCR tidak lengkap, baru PDF utuh dikirim.
 *  - Instruksi (sama untuk semua file) diberi cache_control → file ke-2 dst. membaca instruksi dari cache.
 *  - Jawaban dipaksa sesuai skema JSON (structured outputs) → tidak ada panggilan ulang karena JSON rusak.
 *  - File yang sudah diproses / nomor penetapannya sudah ada di aplikasi dilewati sebelum ke AI.
 */
(function () {
  var VERSI = '2026-10-19.3';
  var MODEL_DEFAULT = 'claude-opus-5-5';
  var MODEL_BOLEH = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'];
  var POTONG = 3 * 1024 * 1024;        // PDF dikirim ke browser per 3 MB
  var MAKS_AI = 30 * 1024 * 1024;      // batas PDF utuh yang dikirim ke Claude
  var OCR_MAKS_BYTE = 2 * 1024 * 1024; // OCR Google Drive andal sampai ±2 MB / ±10 halaman
  var OCR_MAKS_HAL = 10;
  var DATA_PROP = 'IMPOR_DATA_ID';

  /* ---------- sesi: dicek sekali lewat apiInit (Code.gs) lalu diingat 30 menit ---------- */
  function cekSesi(t) {
    var cache = CacheService.getScriptCache();
    var k = 'imporok_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(t || '')));
    if (cache.get(k)) return;
    apiInit(t); // melempar SESI_HABIS bila token tidak berlaku
    cache.put(k, '1', 1800);
  }
  function idDrive(s) {
    s = String(s || '').trim();
    var m = s.match(/(?:folders\/|[?&]id=|\/d\/)([A-Za-z0-9_-]{10,})/);
    return m ? m[1] : s;
  }

  /* ---------- Drive ---------- */
  function daftarFolder(folder, sub) {
    var root;
    try { root = DriveApp.getFolderById(idDrive(folder)); }
    catch (e) { throw new Error('Folder Drive tidak bisa dibuka. Pastikan tautan benar dan folder dibagikan ke akun pemilik aplikasi (' + Session.getEffectiveUser().getEmail() + ').'); }
    var out = [], antre = [{ f: root, jalur: '' }];
    while (antre.length && out.length < 3000) {
      var x = antre.shift(), it = x.f.getFiles();
      while (it.hasNext()) {
        var f = it.next(), mime = f.getMimeType();
        if (mime !== 'application/pdf' && !/^image\/(png|jpe?g|webp)$/.test(mime)) continue;
        out.push({ id: f.getId(), nama: f.getName(), mime: mime, ukuran: f.getSize(), diubah: f.getLastUpdated().toISOString(), jalur: x.jalur, url: f.getUrl() });
      }
      if (sub) { var fs = x.f.getFolders(); while (fs.hasNext()) { var d = fs.next(); antre.push({ f: d, jalur: (x.jalur ? x.jalur + ' / ' : '') + d.getName() }); } }
    }
    out.sort(function (a, b) { return (a.jalur + a.nama).localeCompare(b.jalur + b.nama, 'id', { numeric: true }); });
    return { judul: root.getName(), url: root.getUrl(), file: out };
  }
  function ambil(t, id, mulai) {
    cekSesi(t);
    var f = DriveApp.getFileById(idDrive(id)), b = f.getBlob().getBytes(), m = Number(mulai) || 0, s = Math.min(b.length, m + POTONG);
    return { b64: Utilities.base64Encode(b.slice(m, s)), total: b.length, lanjut: s < b.length ? s : null, mime: f.getMimeType(), nama: f.getName() };
  }

  /* ---------- Claude ---------- */
  function kunciClaude() {
    var semua = PropertiesService.getScriptProperties().getProperties();
    if (semua.IMPOR_KUNCI_PROP && semua[semua.IMPOR_KUNCI_PROP]) return semua[semua.IMPOR_KUNCI_PROP];
    for (var k in semua) if (/^sk-ant-/.test(String(semua[k]).trim())) return String(semua[k]).trim();
    throw new Error('KUNCI_AI_TIDAK_ADA: kunci Claude belum disimpan (Pengaturan → AI Claude).');
  }
  function claude(o, konten) {
    var model = MODEL_BOLEH.indexOf(o.model) >= 0 ? o.model : MODEL_DEFAULT;
    var body = {
      model: model,
      max_tokens: Math.min(Number(o.maxTokens) || 16000, 32000),
      system: [{ type: 'text', text: String(o.system || ''), cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: konten }],
      output_config: { effort: o.effort || 'low', format: { type: 'json_schema', schema: o.schema } }
    };
    var pakaiFallback = model !== 'claude-haiku-5-5';
    function kirim(fb) {
      var h = { 'x-api-key': kunciClaude(), 'anthropic-version': '2023-06-01' };
      var b = JSON.parse(JSON.stringify(body));
      if (fb) { h['anthropic-beta'] = 'server-side-fallback-2026-07-01'; b.fallbacks = 'default'; }
      return UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', { method: 'post', contentType: 'application/json', headers: h, payload: JSON.stringify(b), muteHttpExceptions: true });
    }
    var res = kirim(pakaiFallback);
    if (pakaiFallback && res.getResponseCode() === 400 && /fallback/i.test(res.getContentText())) res = kirim(false);
    var kode = res.getResponseCode(), teks = res.getContentText();
    if (kode !== 200) {
      var pesan = teks;
      try { pesan = JSON.parse(teks).error.message; } catch (e) { }
      throw new Error('Claude ' + kode + ': ' + String(pesan).slice(0, 300));
    }
    var j = JSON.parse(teks);
    if (j.stop_reason === 'refusal') throw new Error('Claude menolak membaca dokumen ini.');
    if (j.stop_reason === 'max_tokens') throw new Error('Jawaban Claude terpotong (max_tokens).');
    var blok = (j.content || []).filter(function (c) { return c.type === 'text'; }).map(function (c) { return c.text; }).join('');
    return { data: JSON.parse(blok), usage: j.usage || {}, model: j.model || model };
  }
  function bungkus(s) { return '=== TRANSKRIP PENETAPAN (watermark sudah dibuang) ===\n' + String(s || '') + '\n=== AKHIR TRANSKRIP ==='; }
  function dokDrive(o, id) {
    var f = DriveApp.getFileById(idDrive(id)), mime = f.getMimeType();
    if (f.getSize() > MAKS_AI) throw new Error('File terlalu besar untuk dibaca AI (' + Math.round(f.getSize() / 1048576) + ' MB).');
    var data = Utilities.base64Encode(f.getBlob().getBytes());
    var isi = mime === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: data } }
      : { type: 'image', source: { type: 'base64', media_type: mime === 'image/jpg' ? 'image/jpeg' : mime, data: data } };
    return claude(o, [isi, { type: 'text', text: 'Baca dokumen terlampir sesuai instruksi.' }]);
  }

  /* ---------- watermark, nomor perkara, OCR ---------- */
  var WM = [/^Direktori Putusan Mahkamah Agung Republik Indonesia$/i, /^putusan\.mahkamahagung\.go\.id$/i, /^Halaman \d+( dari \d+)?(\s+(Penetapan|Putusan)\b.*)?$/i,
    /^Disclaimer$/i, /^Kepaniteraan Mahkamah Agung Republik Indonesia berusaha/i, /^pelaksanaan fungsi peradilan/i, /^Dalam hal Anda menemukan inakurasi/i,
    /^masih terdapat kemungkinan/i, /^Email\s*:\s*kepaniteraan@/i, /^(M|Ma|Mah|Mahk|Mahka|Mahkam|Mahkama)?h?(kamah|amah|mah|ah)?\s*Agung\s*Repub(lik)?(\s*Indonesi?a?)?$/i,
    /^R?e?p?u?b?lik Indonesi?a?$/i, /^Mahkamah Agung$/i, /^[A-Za-z]{1,3}$/];
  function bersihWM(t) {
    return String(t || '').replace(/\r/g, '').split('\n').filter(function (l) { l = l.trim(); return l && !WM.some(function (r) { return r.test(l); }); }).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  function kunciNomor(s) {
    var m = String(s || '').toLowerCase().replace(/_/g, ' ').match(/(\d{1,5})\s*[\/ .-]*\s*pdt\s*[. ]*\s*p\b\s*[\/ .-]*\s*(\d{4})\s*[\/ .-]*\s*(pa|pn)\s*[. ]*\s*([a-z]{2,6})/);
    return m ? (+m[1]) + '/' + m[2] + '/' + m[3] + '/' + m[4] : '';
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
  /* satu file untuk impor terjadwal: teks OCR bila lengkap, selain itu PDF utuh */
  function bacaSatu(o, f) {
    var id = f.getId(), mime = f.getMimeType(), ukuran = f.getSize(), tx = '';
    if (mime === 'application/pdf' && ukuran <= OCR_MAKS_BYTE) {
      var hal = jumlahHal(f.getBlob().getBytes());
      if (hal && hal <= OCR_MAKS_HAL) {
        try { tx = bersihWM(teksOcr(id)); } catch (e) { tx = ''; }
      }
    }
    var lengkap = tx.replace(/\s/g, '').length > 800 && /(demikian(lah)?\s+ditetapkan|ditetapkan\s+(di|pada)\b|menetapkan\s*:?)/i.test(tx);
    if (lengkap) { var r = claude(o, [{ type: 'text', text: bungkus(tx) }]); r.cara = 'AI · teks OCR'; r.teks = tx.slice(0, 40000); return r; }
    var r2 = dokDrive(o, id); r2.cara = 'AI · PDF'; r2.teks = ''; return r2;
  }

  /* ---------- data impor terjadwal (file JSON di Drive pemilik aplikasi) ---------- */
  function fileData() {
    var p = PropertiesService.getScriptProperties(), id = p.getProperty(DATA_PROP);
    if (id) { try { var f = DriveApp.getFileById(id); if (!f.isTrashed()) return f; } catch (e) { } }
    var baru = DriveApp.createFile('Impor Massal BHP - data (jangan dihapus).json', JSON.stringify(dataKosong()), 'application/json');
    p.setProperty(DATA_PROP, baru.getId());
    return baru;
  }
  function dataKosong() { return { folder: '', sub: true, opsi: null, sudah: {}, kunci: {}, gagal: {}, antrean: [], log: {}, catatan: {}, token: { masuk: 0, cache: 0, keluar: 0 } }; }
  function baca() {
    var d; try { d = JSON.parse(fileData().getBlob().getDataAsString('UTF-8')); } catch (e) { d = null; }
    d = d || dataKosong(); var k = dataKosong();
    for (var x in k) if (d[x] === undefined) d[x] = k[x];
    return d;
  }
  function simpan(d) { fileData().setContent(JSON.stringify(d)); }
  function denganKunci(fn) {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) throw new Error('Impor sedang berjalan, coba lagi sebentar.');
    try { return fn(); } finally { lock.releaseLock(); }
  }
  function triggerKu() { return ScriptApp.getProjectTriggers().filter(function (g) { return g.getHandlerFunction() === 'imporTerjadwal'; }); }

  function jadwalStatus(t) {
    cekSesi(t);
    var d = baca(), tr = triggerKu();
    return { versi: VERSI, aktif: tr.length > 0, jam: d.jam || 0, folder: d.folder, sub: d.sub, model: d.opsi && d.opsi.model, antrean: d.antrean.length,
      sudah: Object.keys(d.sudah).length, log: d.log, token: d.token, akun: Session.getEffectiveUser().getEmail() };
  }
  /* c = {aktif, jam, folder, sub, opsi, kunci:[nomor yang sudah ada di aplikasi]} */
  function jadwalAtur(t, c) {
    cekSesi(t);
    return denganKunci(function () {
      var d = baca();
      if (c.folder) { daftarFolder(c.folder, false); d.folder = c.folder; }
      if (c.sub !== undefined) d.sub = !!c.sub;
      if (c.opsi) d.opsi = c.opsi;
      (c.kunci || []).forEach(function (k) { if (k) d.kunci[k] = 1; });
      triggerKu().forEach(function (g) { ScriptApp.deleteTrigger(g); });
      if (c.aktif) {
        if (!d.folder || !d.opsi) throw new Error('Isi folder Drive dulu.');
        var jam = [1, 2, 4, 6, 8, 12, 24].indexOf(+c.jam) >= 0 ? +c.jam : 1;
        var b = ScriptApp.newTrigger('imporTerjadwal').timeBased();
        if (jam === 24) b.everyDays(1).atHour(6).create(); else b.everyHours(jam).create();
        d.jam = jam;
      } else d.jam = 0;
      simpan(d);
      return jadwalStatus(t);
    });
  }
  /* dipanggil pemicu waktu (tanpa browser) atau tombol "Jalankan sekarang" */
  function terjadwal(batasMs) {
    var mulai = Date.now();
    return denganKunci(function () {
      var d = baca(), ringkas = { dibaca: 0, dilewati: 0, gagal: 0, sisa: 0 };
      if (!d.folder || !d.opsi) return ringkas;
      var L = daftarFolder(d.folder, d.sub).file, antre = {};
      d.antrean.forEach(function (x) { antre[x.id] = 1; });
      var baru = L.filter(function (x) {
        if (d.sudah[x.id] || antre[x.id] || (d.gagal[x.id] || 0) >= 3) return false;
        var k = kunciNomor(x.nama);
        if (k && d.kunci[k]) { d.sudah[x.id] = 1; ringkas.dilewati++; return false; }
        return true;
      });
      for (var i = 0; i < baru.length; i++) {
        if (Date.now() - mulai > batasMs) { ringkas.sisa = baru.length - i; break; }
        var x = baru[i];
        try {
          var r = bacaSatu(d.opsi, DriveApp.getFileById(x.id)), u = r.usage || {};
          d.token.masuk += (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0); d.token.cache += u.cache_read_input_tokens || 0; d.token.keluar += u.output_tokens || 0;
          d.antrean.push({ id: x.id, nama: x.nama, url: x.url, jalur: x.jalur, ukuran: x.ukuran, mime: x.mime, data: r.data, teks: r.teks, cara: r.cara, waktu: new Date().toISOString() });
          var k2 = kunciNomor(r.data && r.data.nomorPenetapan); if (k2) d.kunci[k2] = 1;
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
  function antrean(t) { cekSesi(t); return baca().antrean; }
  /* catatan bersama semua admin (mis. waktu berkas lama Kepulauan Riau dihapus) */
  function catatan(t, k, v) {
    cekSesi(t);
    if (k === undefined || k === null) return baca().catatan;
    return denganKunci(function () { var d = baca(); d.catatan[k] = v; simpan(d); return d.catatan; });
  }
  /* file sudah diproses (disimpan / ganda) → keluar dari antrean & tidak dibaca lagi; kunci = nomor yang kini ada di aplikasi */
  function selesai(t, ids, kunci) {
    cekSesi(t);
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
    daftar: function (t, folder, sub) { cekSesi(t); return daftarFolder(folder, sub); },
    ambil: ambil,
    teks: function (t, o, s) { cekSesi(t); return claude(o, [{ type: 'text', text: bungkus(s) }]); },
    drive: function (t, o, id) { cekSesi(t); return dokDrive(o, id); },
    jadwalStatus: jadwalStatus,
    jadwalAtur: jadwalAtur,
    jadwalJalan: function (t) { cekSesi(t); return terjadwal(240000); },
    antrean: antrean,
    catatan: catatan,
    selesai: selesai,
    terjadwal: function () { return terjadwal(300000); }
  };
})()
