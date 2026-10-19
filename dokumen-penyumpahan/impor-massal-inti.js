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
  var VERSI = '2026-10-19.6-sipp';
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

  return {
    versi: VERSI,
    sipp: sipp,
    jadwalStatus: jadwalStatus,
    jadwalAtur: jadwalAtur,
    jadwalJalan: function (t) { super_(t); return terjadwal(240000); },
    antrean: function (t) { super_(t); return baca().antrean; },
    selesai: selesai,
    terjadwal: function () { return terjadwal(300000); }
  };
})()
