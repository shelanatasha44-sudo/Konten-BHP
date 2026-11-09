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
  var VERSI = '2026-11-09.1-kalender';
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
  function triggerKu() { var kg = PROPS.getProperty('KEG_PICU_ID'); return ScriptApp.getProjectTriggers().filter(function (g) { return g.getHandlerFunction() === 'imporTerjadwal' && g.getUniqueId() !== kg; }); }

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

  /* ---------- SIPP: ambil data perkara (Data Umum + Amar Putusan) dengan nomor yang PERSIS sama ----------
   * Pencarian SIPP bersifat "mengandung" (48/Pdt.P/2026 juga menemukan 148 & 248) dan berhalaman 20 baris,
   * jadi baris dipilih dengan pola nomor utuh dan halaman berikutnya ikut ditelusuri. Halaman detail & amar
   * butuh cookie sesi dari show_detil. Situs yang dilindungi verifikasi Cloudflare dilaporkan apa adanya. */
  var BLN_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var BLN_PENDEK = { jan: 0, feb: 1, peb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5, jul: 6, agu: 7, agt: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, nop: 10, des: 11, dec: 11 };
  function teksSipp(h) {
    return String(h || '').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<br\s*\/?>|<\/(p|tr|li|div|h\d)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#039;|&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/&copy;/g, '©')
      .replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{2,}/g, '\n').trim();
  }
  /* "30 Jun. 2026" → "30 Juni 2026", "30 April tahun 2010" → "30 April 2010" (agar cocok dengan cek tanggal di aplikasi) */
  function rapiTgl(t) {
    return String(t || '').replace(/\b(\d{1,2}) (Jan|Feb|Peb|Mar|Apr|Mei|May|Jun|Jul|Agu|Agt|Aug|Sep|Okt|Oct|Nov|Nop|Des|Dec)[a-z]*\.? (\d{4})\b/g, function (m, d, b, y) {
      return d + ' ' + BLN_ID[BLN_PENDEK[b.toLowerCase()]] + ' ' + y;
    }).replace(new RegExp('\\b(\\d{1,2} (?:' + BLN_ID.join('|') + ')) tahun (\\d{4})\\b', 'gi'), '$1 $2');
  }
  function polaNomor(no) {
    var e = String(no).trim().replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&').replace(/\s+/g, '\\s*');
    return new RegExp('(^|[^0-9])' + e + '(?![0-9])', 'i');
  }
  function cfBlok(h) { return /Just a moment|Tunggu sebentar|challenge-platform|cf-chl-|Melakukan verifikasi keamanan/i.test(h); }
  function cookieDari(res) {
    var h = res.getAllHeaders(), c = h['Set-Cookie'] || h['set-cookie'] || [];
    if (!Array.isArray(c)) c = [c];
    return c.map(function (x) { return String(x).split(';')[0]; }).join('; ');
  }
  function ambilSipp(dom, nomor) {
    var base = 'https://' + dom, ua = 'Mozilla/5.0 (BHP Medan cek perkara)', pola = polaNomor(nomor);
    var buka = function (url, o) {
      o = o || {};
      var hd = { 'User-Agent': ua }; if (o.cookie) hd.Cookie = o.cookie;
      var p = { muteHttpExceptions: true, followRedirects: o.ikut !== false, validateHttpsCertificates: false, headers: hd, method: o.post ? 'post' : 'get' };
      if (o.post) p.payload = o.post;
      return UrlFetchApp.fetch(url, p);
    };
    var cari = function (h) {
      var rows = String(h).match(/<tr[\s\S]*?<\/tr>/gi) || [];
      for (var i = 0; i < rows.length; i++) {
        if (!pola.test(teksSipp(rows[i]))) continue;
        var m = rows[i].match(/href="([^"]*show_detil\/([^"\/]+))"/i) || rows[i].match(/href="([^"]*detil[^"]*)"/i);
        if (m) return { href: /^https?:/.test(m[1]) ? m[1] : base + '/' + m[1].replace(/^\//, ''), tok: m[2] || '' };
      }
      return null;
    };
    var r = buka(base + '/list_perkara/search', { post: { search_keyword: nomor } }), h = r.getContentText();
    if (cfBlok(h)) throw new Error('SIPP ' + dom + ' dilindungi verifikasi Cloudflare — buka SIPP ↗ di browser untuk mencari nomor ini');
    if (r.getResponseCode() >= 400) throw new Error('SIPP ' + dom + ' tidak bisa dibuka (HTTP ' + r.getResponseCode() + ')');
    var hit = cari(h), pg = h.match(/window\.open\('([^']*\/list_perkara\/page\/)'\+pageNumber\+'([^']*)'/), tot = Number((h.match(/totalPage = '(\d+)'/) || [])[1] || 0);
    for (var n = 2; !hit && pg && (n - 1) * 20 < tot && n <= 15; n++) hit = cari(buka(pg[1] + n + pg[2]).getContentText());
    if (!hit) return { ada: false, url: base + '/list_perkara/search' };
    var r1 = buka(hit.href, { ikut: false }), ck = cookieDari(r1), loc = (r1.getAllHeaders().Location || r1.getAllHeaders().location || ''), dh;
    if (r1.getResponseCode() >= 300 && r1.getResponseCode() < 400 && loc) { loc = /^https?:/.test(loc) ? loc : base + '/' + String(loc).replace(/^\//, ''); dh = buka(loc, { cookie: ck }).getContentText(); }
    else dh = r1.getContentText();
    var tok = hit.tok || ((dh.match(/show_putusan\/([^'"\/]+)/) || [])[1] || ''), ph = '';
    if (tok) try { ph = buka(base + '/show_putusan/' + tok, { cookie: ck }).getContentText(); } catch (e) { }
    return { ada: true, url: hit.href, detail: rapiTgl(teksSipp(dh)), putusan: rapiTgl(teksSipp(ph)) };
  }
  /* teks ringkas untuk dibaca AI aplikasi: amar (resmi) didahulukan; petitum hanya bila amar belum ada */
  function ringkasSipp(no, s) {
    var d = s.detail || '', p = s.putusan || '';
    var sub = function (t, a, b) { var i = t.search(a); if (i < 0) return ''; var r = t.slice(i), j = r.slice(5).search(b); return (j < 0 ? r : r.slice(0, j + 5)).trim(); };
    var klas = (d.match(/Klasifikasi Perkara\s*\n?([^\n]+)/) || [])[1] || '';
    var pem = sub(d, /\nPemohon\s*\nNo/, /\n(Kuasa Hukum Pemohon|Termohon)\b/);
    var tglP = (p.match(/Tanggal Putusan\s*\n?(?:[A-Za-z]+, )?([^\n]+)/) || [])[1] || '';
    var amar = sub(p, /Amar Putusan/, /\n(Pemberitahuan Putusan|Tanggal Minutasi)\b/);
    var pet = sub(d, /\nPetitum\b/, /\n(Pihak Dipublikasikan|Prodeo)\b/);
    return ['DATA SIPP PENGADILAN — PERKARA ' + no, klas ? 'Klasifikasi: ' + klas.trim() : '', tglP ? 'Tanggal penetapan/putusan: ' + tglP.trim() : '', pem,
      amar ? 'AMAR PENETAPAN (resmi):\n' + amar.replace(/^Amar Putusan\s*/, '') : (pet ? 'PETITUM (isi permohonan; amar belum dipublikasikan):\n' + pet.replace(/^\n?Petitum\s*/, '') : '')]
      .filter(Boolean).join('\n').slice(0, 14000);
  }
  function cekSipp(d) {
    var nomor = String(d.nomorPenetapan || '').trim();
    if (!nomor) return { status: 'lewat', pesan: 'Nomor penetapan kosong' };
    var dom = String(d.sippDomain || '').trim() || sippDomain_(d.pengadilan, nomor);
    /* alamat SIPP yang tidak mengikuti pola sipp.pn-<kota>.go.id */
    dom = String(dom || '').toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    dom = ({ 'sipp.pn-pematangsiantar.go.id': 'sipp.pn-pematangsiantarkota.go.id' })[dom] || dom;
    if (!dom) return { status: 'lewat', pesan: 'Nama pengadilan tidak dikenali' };
    var cache = CacheService.getScriptCache(), ck = 'sipp3_' + Utilities.base64EncodeWebSafe(dom + nomor).slice(0, 200), s = null;
    try { s = JSON.parse(cache.get(ck) || 'null'); } catch (e) { }
    if (!s) { s = ambilSipp(dom, nomor); try { cache.put(ck, JSON.stringify(s).slice(0, 95000), 21600); } catch (e) { } }
    if (!s.ada) return { status: 'tidak_ada', domain: dom, url: s.url, pesan: 'Nomor perkara tidak ditemukan di SIPP ' + dom };
    var teks = ringkasSipp(nomor, s), T = normNama_(s.detail + ' ' + s.putusan), temu = namaSipp_(s.detail), nama = [];
    /* tabel "Pemohon — No | Nama" di Data Umum (nama ditulis huruf biasa, tidak tertangkap namaSipp_) */
    var blok = (s.detail.match(/\nPemohon\s*\nNo Nama\n([\s\S]*?)\n(?:Kuasa Hukum Pemohon|Termohon)\b/) || [])[1] || '';
    var pm = blok.split('\n').map(function (l) { var m = l.match(/^\d+\.?\s+(.+)$/); return m ? m[1].trim() : ''; }).filter(function (n) { return n && !/disamarkan|\*|x{3}/i.test(n); });
    if (pm.length) temu.pemohon = pm;
    if (d.nama) nama.push({ peran: 'Pemohon', nama: d.nama });
    if (d.jenis === 'Perwalian') (d.anak || []).forEach(function (a) { if (a && a.nama) nama.push({ peran: 'Anak', nama: a.nama }); });
    else if (d.terampu && d.terampu.nama) nama.push({ peran: 'Terampu', nama: d.terampu.nama });
    var hasil = nama.map(function (x) { return { peran: x.peran, nama: x.nama, ada: adaNama_(x.nama, T) }; });
    return { status: hasil.some(function (x) { return x.ada === false; }) ? 'beda' : 'cocok', domain: dom, url: s.url, hasil: hasil, pemohon: temu.pemohon, kandidat: temu.kandidat, petitum: temu.petitum, teks: teks };
  }
  function sipp(t, ids) {
    var u = user_(t), semua = berkas_(false), mulai = Date.now();
    var pilih = semua.filter(function (d) { return (ids || []).indexOf(d.id) >= 0; });
    var out = pilih.map(function (d) {
      var r;
      if (Date.now() - mulai > 240000) r = { status: 'lewat', pesan: 'Waktu habis — jalankan lagi' };
      else try { r = cekSipp(d); } catch (e) { r = { status: 'gagal', pesan: String(e.message || e).slice(0, 220) }; }
      r.id = d.id; r.nama = d.nama; r.nomor = d.nomorPenetapan; r.pengadilan = d.pengadilan;
      return r;
    });
    log_(u, 'CEK_SIPP', '', '', pilih.length + ' berkas dicek ke SIPP');
    return out;
  }

  /* Data tambahan hasil SIPP (nama wali, anak, tanggal) disimpan di file Drive PRIBADI — bukan di GitHub publik.
   * Aplikasi mengisikannya ke kolom kosong saja (isiDariPen). */
  var TAMBAH_FILE = ['10nrFTLcZqrxMAtb_HtsjchfObY3gFIO_'];
  function tambahData(t) {
    user_(t);
    var cache = CacheService.getScriptCache(), c = cache.get('tambah_data');
    if (c) return JSON.parse(c);
    var gab = {};
    TAMBAH_FILE.forEach(function (id) {
      try { var j = JSON.parse(DriveApp.getFileById(id).getBlob().getDataAsString('UTF-8')); Object.keys(j.data || {}).forEach(function (k) { gab[k] = j.data[k]; }); } catch (e) { }
    });
    try { cache.put('tambah_data', JSON.stringify(gab), 600); } catch (e) { }
    return gab;
  }


  /* ---------- AI pembaca penetapan generasi baru: Opus 5.5 (teliti) / Opus 5 (hemat) ----------
   * Dipanggil aplikasi: apiImpor(token, 'bacaAI', {teks | b64+mime, prompt, mode, maks}).
   * - model dipilih per panggilan (tidak bergantung pada deploy Code.gs);
   * - thinking adaptif (bawaan Opus 5.x), kedalaman diatur effort: teliti = medium, hemat = low;
   * - fallbacks "default": bila filter keamanan menolak, server Anthropic otomatis mengulang dengan model cadangan;
   * - jawaban terpotong/bukan JSON → diperbaiki, lalu diulang sekali dengan batas token lebih besar.
   * Script Properties CLAUDE_MODEL_TELITI / CLAUDE_MODEL_HEMAT tetap bisa menimpa model. */
  var MODEL_AI = { teliti: 'claude-opus-5-5', hemat: 'claude-opus-5' }, MODEL_AI_VERSI = '2026-11-opus';
  function props_() { return PropertiesService.getScriptProperties(); }
  /* sekali saja: pembaca lama di Code.gs (apiAnalisaTeks / apiBacaPenetapanAI / BAP) ikut memakai model baru */
  function pasangModel_() {
    var p = props_();
    if (p.getProperty('MODEL_AI_VERSI') === MODEL_AI_VERSI) return;
    p.setProperties({ CLAUDE_MODEL_TELITI: MODEL_AI.teliti, CLAUDE_MODEL_HEMAT: MODEL_AI.hemat, MODEL_AI_VERSI: MODEL_AI_VERSI });
  }
  try { pasangModel_(); } catch (e) { }
  function modelKu_(mode) {
    var p = props_();
    return mode === 'hemat' ? (p.getProperty('CLAUDE_MODEL_HEMAT') || MODEL_AI.hemat) : (p.getProperty('CLAUDE_MODEL_TELITI') || MODEL_AI.teliti);
  }
  function perbaikiJson(t) {
    t = String(t || '').replace(/```(?:json)?/g, '');
    var i = t.indexOf('{');
    if (i < 0) throw new Error('Jawaban AI bukan JSON.');
    t = t.slice(i);
    var j = t.lastIndexOf('}');
    try { return JSON.parse(t.slice(0, j + 1)); } catch (e) { }
    /* tutup string / kurung yang terpotong; buang koma & kunci menggantung */
    var tump = [], dlmStr = false, esc = false, o = '';
    for (var k = 0; k < t.length; k++) {
      var c = t[k];
      if (dlmStr) {
        if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') dlmStr = false;
        else if (c === '\n' || c === '\r' || c === '\t') { o += ' '; continue; }
      } else if (c === '"') dlmStr = true; else if (c === '{' || c === '[') tump.push(c === '{' ? '}' : ']');
      else if (c === '}' || c === ']') tump.pop();
      o += c;
    }
    if (dlmStr) o += '"';
    o = o.replace(/,\s*"[^"]*"\s*:?\s*$/, '').replace(/[,:]\s*$/, '');
    while (tump.length) o += tump.pop();
    return JSON.parse(o.replace(/,\s*([}\]])/g, '$1'));
  }
  /* effort: 'low' | 'medium' | 'high' — bawaan teliti = medium, hemat = low. Pembacaan awal aplikasi memakai Opus 5.5 + low (cepat);
     hasil yang tidak lolos cek silang dibaca ulang dengan medium. */
  function panggilClaude_(content, sistem, mode, maks, effort) {
    var model = modelKu_(mode), kunci = props_().getProperty('CLAUDE_KEY');
    if (!kunci) throw new Error('Kunci Claude belum diisi (Pengaturan → AI Claude).');
    var body = { model: model, max_tokens: maks, output_config: { effort: /^(low|medium|high)$/.test(effort || '') ? effort : (mode === 'hemat' ? 'low' : 'medium') }, fallbacks: 'default',
      system: [{ type: 'text', text: sistem, cache_control: { type: 'ephemeral' } }], messages: [{ role: 'user', content: content }] };
    var hdr = { 'x-api-key': kunci, 'anthropic-version': '2023-06-01', 'anthropic-beta': 'server-side-fallback-2026-07-01' };
    var res = null, galat = '';
    for (var i = 0; i < 4; i++) {
      try {
        res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', { method: 'post', contentType: 'application/json', muteHttpExceptions: true, headers: hdr, payload: JSON.stringify(body) });
        var c = res.getResponseCode();
        if (c === 200) break;
        galat = 'Claude HTTP ' + c + ': ' + res.getContentText().slice(0, 300);
        /* fitur cadangan belum didukung akun → kirim tanpa fallbacks */
        if (c === 400 && /fallback/i.test(galat) && body.fallbacks) { delete body.fallbacks; delete hdr['anthropic-beta']; continue; }
        /* model hemat tidak tersedia → model teliti */
        if ((c === 404 || (c === 400 && /model/i.test(galat))) && body.model !== modelKu_('teliti')) { body.model = modelKu_('teliti'); continue; }
        if (!(c === 429 || c >= 500)) break;
      } catch (e) { galat = String(e.message || e).slice(0, 200); res = null; }
      Utilities.sleep(1200 * (i + 1));
    }
    if (!res || res.getResponseCode() !== 200) throw new Error(galat || 'Claude tidak bisa dihubungi');
    var j = JSON.parse(res.getContentText());
    try { if (typeof pakaiAI_ === 'function') pakaiAI_(j.model || body.model, j.usage); } catch (e) { }
    if (j.stop_reason === 'refusal') throw new Error('Claude menolak memproses dokumen ini.');
    return { teks: (j.content || []).filter(function (x) { return x.type === 'text'; }).map(function (x) { return x.text || ''; }).join(''), stop: j.stop_reason, model: j.model || body.model };
  }
  function bacaAI(t, o) {
    user_(t);
    o = o || {};
    var mode = o.mode === 'hemat' ? 'hemat' : 'teliti', maks = Math.min(32000, Math.max(4000, Number(o.maks) || 12000));
    var sistem = (typeof sistemAI_ === 'function' ? sistemAI_(o.prompt || '') : (o.prompt || '') + '\nBalas HANYA satu objek JSON, tanpa penjelasan.');
    var content;
    if (o.teks) content = [{ type: 'text', text: '<penetapan>\n' + String(o.teks).slice(0, 150000) + '\n</penetapan>' }];
    else if (o.b64) {
      var mime = o.mime || 'application/pdf';
      content = [/pdf/.test(mime) ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: o.b64 } }
        : { type: 'image', source: { type: 'base64', media_type: mime, data: o.b64 } },
        { type: 'text', text: 'Baca dokumen penetapan terlampir sesuai instruksi. Periksa setiap halaman, termasuk lampiran dan amar.' }];
    } else throw new Error('Tidak ada dokumen untuk dibaca.');
    var h = panggilClaude_(content, sistem, mode, maks, o.effort), d;
    try { d = perbaikiJson(h.teks); }
    catch (e) {
      if (h.stop !== 'max_tokens' && !/JSON|Unexpected|position/.test(String(e.message || e))) throw e;
      h = panggilClaude_(content, sistem, mode, Math.min(32000, maks * 2), o.effort);
      d = perbaikiJson(h.teks);
    }
    if (d && typeof d === 'object' && !Array.isArray(d)) d._model = h.model;
    return d;
  }
  function modelAI(t) { user_(t); pasangModel_(); return { teliti: modelKu_('teliti'), hemat: modelKu_('hemat') }; }


  /* ---------- Kalender Kegiatan Wilayah II: lampiran Drive + pengingat email H-1 ----------
   * Disimpan di Pengaturan (kunci "kegiatan") seperti sebelumnya; kolom baru: warna, lampiran [{id,nama,url,mime}], notif.
   * Pengingat: pemicu harian pukul ±07.00 WIB (handler imporTerjadwal, ID-nya dicatat di KEG_PICU_ID agar tidak tercampur
   * dengan jadwal impor) mengirim email ke KEG_EMAIL untuk kegiatan bertanda notif yang berlangsung BESOK. Satu kegiatan
   * hanya dikirimi sekali per tanggal (dicatat di KEG_TERKIRIM). Email memakai MailApp; bila izin kirim email belum diberikan
   * (appsscript.json belum memuat script.send_mail), dikirim lewat notifikasi berbagi Google Drive sebagai cadangan. */
  var KEG_EMAIL = 'wilayah2bhpmedan@gmail.com', KEG_PICU = 'KEG_PICU_ID', KEG_TERKIRIM = 'KEG_TERKIRIM', KEG_FOLDER = 'KEG_FOLDER_ID';
  /* ---------- SATU SUMBER DATA: database Kalender Kerja Wilayah II ----------
   * Kegiatan Wilayah II dibaca & disimpan di spreadsheet "Kalender Kerja Wilayah II — Database" (sheet Kegiatan & Lampiran),
   * sehingga sama persis di aplikasi Kalender Kerja Wilayah II (bit.ly/kalenderkerjawilayah2) dan menu Jadwal Sumpah.
   * Spreadsheet dicari otomatis di Drive pemilik (ID diingat di KAL_SHEET_ID). Kolom khusus Penyumpahan (jenis, warna,
   * notif, jamTeks) ditaruh SETELAH kolom milik Kalender — Kalender mengabaikan & tidak menimpanya.
   * Kegiatan lama di Pengaturan dipindahkan sekali (KEG_PINDAH); salinan lama tetap disimpan sebagai cadangan.
   * Bila spreadsheet Kalender tidak ditemukan, kembali memakai Pengaturan seperti dulu. */
  var KAL_NAMA = 'Kalender Kerja Wilayah II — Database', KAL_PROP = 'KAL_SHEET_ID';
  var KAL_EV = ['id', 'judul', 'deskripsi', 'mulai', 'selesai', 'jamMulai', 'jamSelesai', 'seharian', 'lokasi', 'kategori', 'prioritas', 'status', 'peserta', 'checklist', 'tautan',
    'dibuatOleh', 'dibuatPada', 'diubahOleh', 'diubahPada', 'dihapus', 'jenis', 'warna', 'notif', 'jamTeks'];
  var KAL_FILE = ['id', 'eventId', 'fileId', 'nama', 'mime', 'ukuran', 'url', 'oleh', 'pada', 'dihapus'];
  var KAL_LOG = ['waktu', 'pengguna', 'aksi', 'eventId', 'judul', 'detail'];
  var KAL_KAT = ['Umum', 'Rapat', 'Koordinasi', 'Penyumpahan', 'Inventarisasi', 'Lapangan', 'Laporan', 'Pelatihan', 'Cuti', 'Lainnya'];
  var KAL_SS_ = null;
  function kalSs_() {
    if (KAL_SS_) return KAL_SS_;
    var id = PROPS.getProperty(KAL_PROP);
    if (id) try { var a = SpreadsheetApp.openById(id); if (a.getSheetByName('Kegiatan')) return (KAL_SS_ = a); } catch (e) { }
    var it = DriveApp.searchFiles('title = "' + KAL_NAMA + '" and mimeType = "application/vnd.google-apps.spreadsheet" and trashed = false'), pilih = null;
    while (it.hasNext()) { var f = it.next(); if (!pilih || f.getLastUpdated() > pilih.getLastUpdated()) pilih = f; }
    if (!pilih) return null;
    var ss = SpreadsheetApp.openById(pilih.getId());
    if (!ss.getSheetByName('Kegiatan')) return null;
    PROPS.setProperty(KAL_PROP, pilih.getId());
    return (KAL_SS_ = ss);
  }
  function kalTeks_(v) { v = v == null ? '' : String(v); return /^[\d:\-+=]/.test(v) ? "'" + v : v; }
  function kalHeader_(sh, cols) {
    var n = Math.max(sh.getLastColumn(), 1), h = sh.getRange(1, 1, 1, n).getValues()[0];
    for (var i = 0; i < cols.length; i++) if (h[i] !== cols[i]) { sh.getRange(1, i + 1).setValue(cols[i]).setFontWeight('bold'); }
  }
  function kalBaca_(sh, cols) {
    var last = sh.getLastRow();
    if (last < 2) return [];
    return sh.getRange(2, 1, last - 1, cols.length).getDisplayValues().map(function (r, i) {
      var o = { _row: i + 2 }; cols.forEach(function (c, j) { o[c] = r[j]; }); return o;
    });
  }
  function katDariJenis_(j) {
    j = String(j || '');
    if (/penyumpahan|sumpah/i.test(j)) return 'Penyumpahan';
    if (/inventaris/i.test(j)) return 'Inventarisasi';
    if (/koordinasi/i.test(j)) return 'Koordinasi';
    if (/rapat|zoom|daring|meeting/i.test(j)) return 'Rapat';
    if (/pelatihan|webinar|bimtek|sosialisasi|diklat/i.test(j)) return 'Pelatihan';
    if (/laporan/i.test(j)) return 'Laporan';
    if (/lapangan|kunjungan|dinas luar|monitoring/i.test(j)) return 'Lapangan';
    if (/cuti/i.test(j)) return 'Cuti';
    return KAL_KAT.indexOf(j) >= 0 ? j : 'Lainnya';
  }
  /* "10:00", "10.00 - 12.00 WIB", "09.30 s.d. selesai" → {mulai, selesai} */
  function jamDariTeks_(t) {
    var m = String(t || '').match(/([01]?\d|2[0-3])[:.]([0-5]\d)/g) || [];
    var f = function (x) { var p = x.split(/[:.]/); return ('0' + p[0]).slice(-2) + ':' + p[1]; };
    return { mulai: m[0] ? f(m[0]) : '', selesai: m[1] ? f(m[1]) : '' };
  }
  function kalKeKeg_(e, lamp) {
    var j = jamDariTeks_(e.jamTeks), jamAsli = e.jamTeks && j.mulai === e.jamMulai && j.selesai === e.jamSelesai;
    var jenis = e.jenis && katDariJenis_(e.jenis) === e.kategori ? e.jenis : (e.kategori || 'Lainnya');
    return { id: e.id, tgl: e.mulai, sampai: e.selesai && e.selesai !== e.mulai ? e.selesai : '',
      jam: jamAsli ? e.jamTeks : (String(e.seharian).toUpperCase() === 'TRUE' || !e.jamMulai ? '' : e.jamMulai + (e.jamSelesai ? '–' + e.jamSelesai : '')),
      judul: e.judul, jenis: jenis, warna: jenis === e.jenis && /^#[0-9a-f]{6}$/i.test(e.warna || '') ? e.warna : '', tempat: e.lokasi, ket: e.deskripsi,
      lampiran: lamp || [], notif: String(e.notif).toUpperCase() === 'TRUE', oleh: e.dibuatOleh, diubah: e.diubahOleh, pada: e.diubahPada,
      status: e.status, sumber: 'kalender' };
  }
  function kalDaftar_(ss) {
    var ev = kalBaca_(ss.getSheetByName('Kegiatan'), KAL_EV), sf = ss.getSheetByName('Lampiran'), per = {};
    if (sf) kalBaca_(sf, KAL_FILE).forEach(function (x) {
      if (x.dihapus === 'TRUE' || !x.eventId || !x.fileId) return;
      (per[x.eventId] = per[x.eventId] || []).push({ id: x.fileId, nama: x.nama, url: 'https://drive.google.com/file/d/' + x.fileId + '/view', mime: x.mime });
    });
    return ev.filter(function (e) { return e.id && e.dihapus !== 'TRUE' && /^\d{4}-\d{2}-\d{2}$/.test(e.mulai); })
      .map(function (e) { return kalKeKeg_(e, per[e.id]); });
  }
  function kalLog_(ss, u, aksi, id, judul, detail) {
    var sh = ss.getSheetByName('Log');
    if (sh) sh.appendRow([new Date().toISOString(), (u && u.nama ? u.nama : 'Dokumen Penyumpahan') + ' (Dokumen Penyumpahan)', aksi, id || '', judul || '', detail || ''].map(kalTeks_));
  }
  /* tulis satu kegiatan (format Penyumpahan) ke sheet Kegiatan + Lampiran; kolom khusus Kalender (prioritas, status, peserta, checklist, tautan) dipertahankan */
  function kalTulis_(ss, o, u) {
    var sh = ss.getSheetByName('Kegiatan'); kalHeader_(sh, KAL_EV);
    var rows = kalBaca_(sh, KAL_EV), lama = rows.filter(function (r) { return r.id === o.id; })[0], j = jamDariTeks_(o.jam), now = new Date().toISOString();
    var e = { id: o.id, judul: o.judul, deskripsi: o.ket, mulai: o.tgl, selesai: o.sampai || o.tgl, jamMulai: j.mulai, jamSelesai: j.mulai ? j.selesai : '', seharian: j.mulai ? 'FALSE' : 'TRUE',
      lokasi: o.tempat, kategori: katDariJenis_(o.jenis), prioritas: lama ? lama.prioritas : 'Sedang', status: lama ? lama.status : 'Direncanakan',
      peserta: lama && lama.peserta ? lama.peserta : '[]', checklist: lama && lama.checklist ? lama.checklist : '[]', tautan: lama && lama.tautan ? lama.tautan : '[]',
      dibuatOleh: lama ? lama.dibuatOleh : (o.oleh || u.nama), dibuatPada: lama ? lama.dibuatPada : (o.pada || now), diubahOleh: o.diubah || u.nama, diubahPada: now, dihapus: '',
      jenis: o.jenis, warna: o.warna || '', notif: o.notif ? 'TRUE' : 'FALSE', jamTeks: o.jam || '' };
    var baris = KAL_EV.map(function (c) { return kalTeks_(e[c]); });
    if (lama) sh.getRange(lama._row, 1, 1, KAL_EV.length).setValues([baris]); else sh.appendRow(baris);
    var sf = ss.getSheetByName('Lampiran');
    if (sf) {
      var ada = kalBaca_(sf, KAL_FILE).filter(function (x) { return x.eventId === o.id && x.dihapus !== 'TRUE'; }), mau = {};
      (o.lampiran || []).forEach(function (l) { mau[l.id] = l; });
      ada.forEach(function (x) { if (!mau[x.fileId]) sf.getRange(x._row, KAL_FILE.indexOf('dihapus') + 1).setValue('TRUE'); else delete mau[x.fileId]; });
      Object.keys(mau).forEach(function (fid) {
        var l = mau[fid];
        sf.appendRow([Utilities.getUuid().replace(/-/g, '').slice(0, 12), o.id, fid, l.nama, l.mime || '', '', 'https://drive.google.com/file/d/' + fid + '/view', u.nama, now, ''].map(kalTeks_));
      });
    }
    return !!lama;
  }
  /* sekali saja: kegiatan lama di Pengaturan → database Kalender (yang id-nya belum ada) */
  function kalPindah_(ss) {
    if (PROPS.getProperty('KEG_PINDAH')) return;
    var lama = settings_().kegiatan || [], ada = {};
    kalBaca_(ss.getSheetByName('Kegiatan'), KAL_EV).forEach(function (r) { ada[r.id] = 1; });
    var n = 0;
    lama.forEach(function (k) { if (k && k.id && k.tgl && !ada[k.id]) { kalTulis_(ss, k, { nama: k.oleh || 'Dokumen Penyumpahan' }); n++; } });
    if (n) kalLog_(ss, null, 'PINDAH', '', '', n + ' kegiatan Wilayah II dari Dokumen Penyumpahan dipindahkan ke kalender ini');
    PROPS.setProperty('KEG_PINDAH', new Date().toISOString() + ' · ' + n + ' kegiatan');
  }
  function kegDaftar_() {
    var ss = null;
    try { ss = kalSs_(); } catch (e) { ss = null; }
    if (!ss) return settings_().kegiatan || [];
    kalPindah_(ss);
    return kalDaftar_(ss);
  }
  /* dipanggil aplikasi: daftar kegiatan terbaru + sumbernya */
  function kegDaftar(t) {
    user_(t);
    var ss = null; try { ss = kalSs_(); } catch (e) { }
    if (ss) { var lock = LockService.getScriptLock(); lock.waitLock(20000); try { kalPindah_(ss); } finally { lock.releaseLock(); } }
    return { kegiatan: ss ? kalDaftar_(ss) : (settings_().kegiatan || []), sumber: ss ? 'kalender' : 'pengaturan', url: ss ? ss.getUrl() : '' };
  }
  function kegBersih_(ev, u, lama) {
    var tgl = /^\d{4}-\d{2}-\d{2}$/, warna = /^#[0-9a-f]{6}$/i;
    if (!ev || !tgl.test(String(ev.tgl || '')) || !String(ev.judul || '').trim()) throw new Error('Tanggal dan judul kegiatan wajib diisi.');
    var lamp = (Array.isArray(ev.lampiran) ? ev.lampiran : []).filter(function (x) { return x && /^[\w-]{10,}$/.test(String(x.id || '')); }).slice(0, 20)
      .map(function (x) { return { id: String(x.id), nama: String(x.nama || 'lampiran').slice(0, 150), url: 'https://drive.google.com/file/d/' + x.id + '/view', mime: String(x.mime || '').slice(0, 80) }; });
    return { id: ev.id || Utilities.getUuid(), tgl: String(ev.tgl), sampai: tgl.test(String(ev.sampai || '')) && ev.sampai >= ev.tgl ? String(ev.sampai) : '', jam: String(ev.jam || '').slice(0, 40),
      judul: String(ev.judul).trim().slice(0, 200), jenis: String(ev.jenis || 'Lainnya').trim().slice(0, 60) || 'Lainnya', warna: warna.test(String(ev.warna || '')) ? String(ev.warna) : '',
      tempat: String(ev.tempat || '').slice(0, 300), ket: String(ev.ket || '').slice(0, 1500), lampiran: lamp, notif: !!ev.notif,
      oleh: lama && lama.oleh ? lama.oleh : u.nama, diubah: u.nama, pada: new Date().toISOString() };
  }
  function kegSimpan(t, ev) {
    var u = user_(t), lock = LockService.getScriptLock(); lock.waitLock(20000);
    try {
      var L = kegDaftar_(), i = L.findIndex(function (x) { return x.id === (ev && ev.id); }), o = kegBersih_(ev, u, i >= 0 ? L[i] : null), ss = kalSs_();
      if (ss) {
        var ubah = kalTulis_(ss, o, u);
        kalLog_(ss, u, ubah ? 'UBAH' : 'BUAT', o.id, o.judul, o.jenis + ' ' + o.tgl + (o.notif ? ' · pengingat email H-1' : ''));
        L = kalDaftar_(ss);
      } else {
        if (i >= 0) L[i] = o; else L.push(o);
        setSetting_('kegiatan', L);
      }
      log_(u, 'KEGIATAN', o.id, o.judul, (i >= 0 ? 'Ubah ' : 'Tambah ') + o.jenis + ' ' + o.tgl + (o.notif ? ' · pengingat email H-1' : '') + (o.lampiran.length ? ' · ' + o.lampiran.length + ' lampiran' : ''));
      if (o.notif) try { pasangPicuKeg_(); if (o.tgl === besok_()) pengingatKeg_(); } catch (e) { }
      return L;
    } finally { lock.releaseLock(); }
  }
  function kegHapus(t, id) {
    var u = user_(t), lock = LockService.getScriptLock(); lock.waitLock(20000);
    try {
      var ss = kalSs_(), L;
      if (ss) {
        var sh = ss.getSheetByName('Kegiatan'), r = kalBaca_(sh, KAL_EV).filter(function (x) { return x.id === id; })[0];
        if (r) {
          sh.getRange(r._row, KAL_EV.indexOf('dihapus') + 1).setValue('TRUE');
          sh.getRange(r._row, KAL_EV.indexOf('diubahOleh') + 1, 1, 2).setValues([[u.nama, new Date().toISOString()]]);
          kalLog_(ss, u, 'HAPUS', id, r.judul, 'Dihapus dari Dokumen Penyumpahan (bisa dipulihkan dari Kalender Kerja)');
        }
        L = kalDaftar_(ss);
      } else {
        L = kegDaftar_().filter(function (x) { return x.id !== id; });
        setSetting_('kegiatan', L);
      }
      log_(u, 'KEGIATAN', id, '', 'Hapus kegiatan (lampiran tetap di Drive)');
      return L;
    } finally { lock.releaseLock(); }
  }
  function folderKeg_() {
    /* lampiran disimpan di folder "Lampiran" milik Kalender Kerja Wilayah II supaya tim yang punya akses kalender bisa membukanya */
    try {
      var ss = kalSs_();
      if (ss) { var ps = DriveApp.getFileById(ss.getId()).getParents(); if (ps.hasNext()) { var it = ps.next().getFoldersByName('Lampiran'); if (it.hasNext()) return it.next(); } }
    } catch (e) { }
    var id = PROPS.getProperty(KEG_FOLDER);
    if (id) try { var f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) { }
    var b = folderRoot_().createFolder('Lampiran Kegiatan Wilayah II');
    PROPS.setProperty(KEG_FOLDER, b.getId());
    return b;
  }
  /* o = {nama, mime, b64, tgl, judul} → file di Drive: Lampiran Kegiatan Wilayah II/2026-11/<file> */
  function kegUnggah(t, o) {
    var u = user_(t);
    o = o || {};
    if (!o.b64) throw new Error('File kosong.');
    var bytes = Utilities.base64Decode(o.b64);
    if (bytes.length > 25 * 1024 * 1024) throw new Error('File terlalu besar (maks. 25 MB).');
    var akar = folderKeg_(), bln = /^\d{4}-\d{2}/.test(String(o.tgl || '')) ? String(o.tgl).slice(0, 7) : Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM');
    var it = akar.getFoldersByName(bln), f = it.hasNext() ? it.next() : akar.createFolder(bln);
    var nama = String(o.nama || 'lampiran').replace(/[\\\/:*?"<>|]/g, '_').slice(0, 150);
    var file = f.createFile(Utilities.newBlob(bytes, String(o.mime || 'application/octet-stream'), (o.tgl ? o.tgl + ' — ' : '') + nama));
    log_(u, 'KEGIATAN', '', String(o.judul || ''), 'Unggah lampiran ' + nama);
    return { id: file.getId(), nama: nama, url: file.getUrl(), mime: file.getMimeType() };
  }
  function picuKeg_() {
    var id = PROPS.getProperty(KEG_PICU);
    return id ? ScriptApp.getProjectTriggers().filter(function (g) { return g.getUniqueId() === id; })[0] || null : null;
  }
  function pasangPicuKeg_() {
    if (picuKeg_()) return;
    var g = ScriptApp.newTrigger('imporTerjadwal').timeBased().everyDays(1).atHour(7).inTimezone('Asia/Jakarta').create();
    PROPS.setProperty(KEG_PICU, g.getUniqueId());
  }
  function besok_() { return Utilities.formatDate(new Date(Date.now() + 864e5), 'Asia/Jakarta', 'yyyy-MM-dd'); }
  var BLN_ = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
    HARI_ = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  function tglPanjang_(s) { var p = String(s).split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]); return HARI_[d.getDay()] + ', ' + (+p[2]) + ' ' + BLN_[+p[1] - 1] + ' ' + p[0]; }
  function escH_(x) { return String(x == null ? '' : x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function isiEmailKeg_(k) {
    var w = k.warna || '#1b2345', baris = [['Hari, tanggal', tglPanjang_(k.tgl) + (k.sampai && k.sampai !== k.tgl ? ' s.d. ' + tglPanjang_(k.sampai) : '')], ['Waktu', k.jam || '-'], ['Tempat', k.tempat || '-'], ['Jenis', k.jenis]];
    var html = '<div style="font-family:Arial,sans-serif;max-width:560px;border:1px solid #e4e7ef;border-radius:12px;overflow:hidden">'
      + '<div style="background:' + w + ';color:#fff;padding:14px 18px"><div style="font-size:12px;opacity:.85">PENGINGAT H-1 · KEGIATAN WILAYAH II BHP MEDAN</div><div style="font-size:18px;font-weight:bold;margin-top:4px">' + escH_(k.judul) + '</div></div>'
      + '<table style="padding:12px 18px;font-size:14px">' + baris.map(function (b) { return '<tr><td style="color:#6b7087;padding:3px 12px 3px 0">' + b[0] + '</td><td><b>' + escH_(b[1]) + '</b></td></tr>'; }).join('') + '</table>'
      + (k.ket ? '<p style="padding:0 18px;font-size:14px;white-space:pre-wrap">' + escH_(k.ket) + '</p>' : '')
      + (k.lampiran && k.lampiran.length ? '<p style="padding:0 18px;font-size:14px">Dokumen: ' + k.lampiran.map(function (l) { return '<a href="' + escH_(l.url) + '">' + escH_(l.nama) + '</a>'; }).join(' · ') + '</p>' : '')
      + '<p style="padding:8px 18px 14px;font-size:12px;color:#6b7087">Dikirim otomatis oleh aplikasi Dokumen Penyumpahan BHP Medan (dicatat oleh ' + escH_(k.oleh || '-') + ').</p></div>';
    var teks = 'PENGINGAT H-1 — ' + k.judul + '\n' + baris.map(function (b) { return b[0] + ': ' + b[1]; }).join('\n') + (k.ket ? '\n\n' + k.ket : '')
      + (k.lampiran && k.lampiran.length ? '\n\nDokumen:\n' + k.lampiran.map(function (l) { return '- ' + l.nama + ': ' + l.url; }).join('\n') : '');
    return { subjek: '⏰ Besok: ' + k.judul + ' (' + tglPanjang_(k.tgl) + ')', html: html, teks: teks };
  }
  /* cadangan tanpa izin email: buat catatan pengingat (Google Docs) lalu bagikan ke KEG_EMAIL → Google Drive mengirim email berisi pesannya */
  function kirimLewatDrive_(k, isi) {
    var h = { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, api = 'https://www.googleapis.com/drive/v3/files', b = 'bts' + Date.now();
    var meta = { name: 'Pengingat H-1 — ' + k.tgl + ' — ' + k.judul, mimeType: 'application/vnd.google-apps.document', parents: [folderKeg_().getId()] };
    var r = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id', { method: 'post', headers: h, muteHttpExceptions: true,
      contentType: 'multipart/related; boundary=' + b,
      payload: '--' + b + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(meta) + '\r\n--' + b + '\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n' + isi.teks + '\r\n--' + b + '--' });
    if (r.getResponseCode() !== 200) throw new Error('Drive: ' + r.getContentText().slice(0, 200));
    var id = JSON.parse(r.getContentText()).id;
    var p = UrlFetchApp.fetch(api + '/' + id + '/permissions?sendNotificationEmail=true&supportsAllDrives=true&emailMessage=' + encodeURIComponent(isi.teks.slice(0, 1800)),
      { method: 'post', contentType: 'application/json', headers: h, muteHttpExceptions: true, payload: JSON.stringify({ role: 'reader', type: 'user', emailAddress: KEG_EMAIL }) });
    if (p.getResponseCode() !== 200) throw new Error('Drive berbagi: ' + p.getContentText().slice(0, 200));
    return 'drive';
  }
  function kirimKeg_(k) {
    var isi = isiEmailKeg_(k);
    try { MailApp.sendEmail({ to: KEG_EMAIL, subject: isi.subjek, body: isi.teks, htmlBody: isi.html, name: 'Kalender Wilayah II BHP Medan' }); return 'email'; }
    catch (e) { if (!/izin|permission|authoriz|otoris|scope|MailApp/i.test(String(e.message || e))) throw e; return kirimLewatDrive_(k, isi); }
  }
  function pengingatKeg_(paksa) {
    if (!paksa && +Utilities.formatDate(new Date(), 'Asia/Jakarta', 'H') < 7) return [];
    var b = besok_(), sudah = {};
    try { sudah = JSON.parse(PROPS.getProperty(KEG_TERKIRIM) || '{}'); } catch (e) { }
    var hasil = [];
    kegDaftar_().filter(function (k) { return k.notif && k.tgl === b && !sudah[k.id + '|' + k.tgl]; }).forEach(function (k) {
      try { hasil.push(k.judul + ' → ' + kirimKeg_(k)); sudah[k.id + '|' + k.tgl] = new Date().toISOString(); }
      catch (e) { hasil.push(k.judul + ' ✕ ' + String(e.message || e).slice(0, 120)); }
    });
    var batas = Utilities.formatDate(new Date(Date.now() - 40 * 864e5), 'Asia/Jakarta', 'yyyy-MM-dd');
    Object.keys(sudah).forEach(function (x) { if (x.split('|')[1] < batas) delete sudah[x]; });
    PROPS.setProperty(KEG_TERKIRIM, JSON.stringify(sudah));
    if (hasil.length) PROPS.setProperty('KEG_LOG', JSON.stringify({ pada: new Date().toISOString(), hasil: hasil }));
    return hasil;
  }
  function kegNotifStatus(t) {
    user_(t);
    var log = null; try { log = JSON.parse(PROPS.getProperty('KEG_LOG') || 'null'); } catch (e) { }
    return { email: KEG_EMAIL, aktif: !!picuKeg_(), log: log };
  }
  /* kirim pengingat contoh sekarang (untuk mencoba) */
  function kegNotifTes(t, id) {
    var u = super_(t), k = kegDaftar_().filter(function (x) { return x.id === id; })[0];
    if (!k) throw new Error('Kegiatan tidak ditemukan — simpan dulu.');
    pasangPicuKeg_();
    var cara = kirimKeg_(k);
    log_(u, 'KEGIATAN', k.id, k.judul, 'Tes pengingat email ke ' + KEG_EMAIL + ' (' + cara + ')');
    return cara;
  }

  return {
    versi: VERSI,
    kegSimpan: kegSimpan,
    kegDaftar: kegDaftar,
    kegHapus: kegHapus,
    kegUnggah: kegUnggah,
    kegNotifStatus: kegNotifStatus,
    kegNotifTes: kegNotifTes,
    bacaAI: bacaAI,
    modelAI: modelAI,
    sipp: sipp,
    tambahData: tambahData,
    jadwalStatus: jadwalStatus,
    jadwalAtur: jadwalAtur,
    jadwalJalan: function (t) { super_(t); return terjadwal(240000); },
    antrean: function (t) { super_(t); return baca().antrean; },
    selesai: selesai,
    terjadwal: function () {
      var ing = null;
      try { ing = pengingatKeg_(); } catch (e) { ing = ['✕ ' + String(e.message || e).slice(0, 120)]; }
      try {
        var d = baca(), akhir = Date.parse(d.log && d.log.terakhir || 0) || 0;
        if (!triggerKu().length || (d.jam && Date.now() - akhir < d.jam * 36e5 * 0.75)) return { pengingat: ing, impor: 'dilewati' };
      } catch (e) { }
      return terjadwal(300000);
    }
  };
})()
