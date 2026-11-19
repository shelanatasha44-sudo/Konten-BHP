/**
 * SERTIFIKAT OTOMATIS
 * Sertifikat PDF dikirim otomatis ke email peserta beberapa menit setelah
 * peserta mengisi daftar hadir. Peserta tidak perlu mendaftar terlebih dahulu.
 * Semua pengaturan ada di tab "Pengaturan", semua tombol ada di menu "Sertifikat".
 */

const MASTER_DESAIN = '10yaUzigwrQSdaBTPRVTOztQRdZBOA12ieurAiXqj4uI'; // desain contoh warna lembut
const TAB = { atur: 'Pengaturan', hadir: 'Daftar Hadir', terbit: 'Terbit' };
const KOLOM_TERBIT = ['Waktu', 'Nomor', 'Nama', 'Email', 'Kode Verifikasi', 'Status'];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Sertifikat')
    .addItem('1. Siapkan desain sertifikat', 'siapkan')
    .addItem('2. Kirim contoh ke email saya', 'kirimContoh')
    .addSeparator()
    .addItem('3. Nyalakan pengiriman otomatis', 'nyalakan')
    .addItem('Matikan pengiriman otomatis', 'matikan')
    .addSeparator()
    .addItem('Proses sekarang', 'prosesManual')
    .addToUi();
}

// ---------- pengaturan ----------
function bacaPengaturan() {
  const sh = SpreadsheetApp.getActive().getSheetByName(TAB.atur);
  if (!sh) throw new Error('Tab "Pengaturan" tidak ditemukan.');
  const v = {};
  sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 2).getValues().forEach(([k, isi]) => {
    if (k) v[String(k).toLowerCase().trim()] = isi;
  });
  const ambil = (k) => v[k] === undefined ? '' : v[k];
  const linkDesain = String(ambil('link desain sertifikat'));
  return {
    acara: String(ambil('nama acara')),
    tanggal: String(ambil('tanggal acara')),
    desainId: (linkDesain.match(/[-\w]{25,}/) || [''])[0],
    formatNomor: String(ambil('format nomor sertifikat') || '{n}/SERT/2026'),
    jeda: Number(ambil('jeda kirim (menit)')) || 0,
    pengirim: String(ambil('nama pengirim email') || 'Panitia'),
    subjek: String(ambil('subjek email') || 'E-Sertifikat'),
    isi: String(ambil('isi email')),
    mulai: ambil('aktif mulai') instanceof Date ? ambil('aktif mulai') : null,
    sampai: ambil('aktif sampai') instanceof Date ? ambil('aktif sampai') : null,
    linkVerifikasi: String(ambil('link verifikasi (web app)')).trim(),
    tabHadir: String(ambil('nama tab daftar hadir') || TAB.hadir),
  };
}

function tulisPengaturan(label, nilai) {
  const sh = SpreadsheetApp.getActive().getSheetByName(TAB.atur);
  const data = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase().trim() === label) { sh.getRange(i + 1, 2).setValue(nilai); return; }
  }
}

// ---------- data peserta ----------
const normEmail = (s) => String(s || '').trim().toLowerCase();
const normHp = (s) => String(s || '').replace(/\D/g, '').replace(/^(62|0)/, '');
const emailSah = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

function bacaTab(nama) {
  const sh = SpreadsheetApp.getActive().getSheetByName(nama);
  if (!sh) throw new Error('Tab "' + nama + '" tidak ditemukan. Samakan nama tab hasil Google Form dengan tab Pengaturan.');
  const data = sh.getDataRange().getValues();
  const h = (data[0] || []).map((x) => String(x).toLowerCase());
  const cari = (re, kecuali) => h.findIndex((x) => re.test(x) && !(kecuali && kecuali.test(x)));
  return {
    rows: data.slice(1),
    iNama: cari(/nama/, /instansi|lembaga|kantor/),
    iEmail: cari(/e-?mail|surel/),
    iHp: cari(/whats|\bwa\b|\bhp\b|telepon|ponsel|nomor/, /sertifikat/),
    iWaktu: cari(/timestamp|stempel waktu|waktu/),
  };
}

function bacaTerbit() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(TAB.terbit);
  if (!sh) { sh = ss.insertSheet(TAB.terbit); sh.appendRow(KOLOM_TERBIT); sh.setFrozenRows(1); }
  const rows = sh.getDataRange().getValues().slice(1);
  const sudah = new Set(rows.filter((r) => /^(Terkirim|Gagal)/.test(r[5])).map((r) => normEmail(r[3])));
  const jumlah = rows.filter((r) => r[5] === 'Terkirim').length;
  return { sh, rows, sudah, jumlah };
}

// ---------- sertifikat ----------
function formatNomor(pola, n) {
  return pola.replace('{n}', String(n).padStart(3, '0'));
}

function linkVerifikasi(cfg) {
  if (cfg.linkVerifikasi) return cfg.linkVerifikasi;
  // Link terisi sendiri bila skrip sudah diterapkan sebagai Aplikasi web
  let url = '';
  try { url = ScriptApp.getService().getUrl() || ''; } catch (e) {}
  if (!/\/exec$/.test(url)) return '';
  tulisPengaturan('link verifikasi (web app)', url);
  return url;
}

function buatPdf(cfg, nama, nomor, kode) {
  if (!cfg.desainId) throw new Error('Link desain sertifikat belum diisi. Jalankan menu Sertifikat, 1. Siapkan desain sertifikat.');
  const salinan = DriveApp.getFileById(cfg.desainId).makeCopy('sementara ' + nomor);
  try {
    const pres = SlidesApp.openById(salinan.getId());
    const kotakNama = [];
    pres.getSlides().forEach((slide) => slide.getShapes().forEach((s) => {
      try { if (s.getText().asString().indexOf('{{NAMA}}') >= 0) kotakNama.push(s); } catch (e) {}
    }));
    pres.replaceAllText('{{NAMA}}', nama);
    pres.replaceAllText('{{NOMOR}}', nomor);
    pres.replaceAllText('{{ACARA}}', cfg.acara);
    pres.replaceAllText('{{TANGGAL}}', cfg.tanggal);
    // nama panjang dikecilkan otomatis supaya tetap satu baris
    kotakNama.forEach((s) => {
      const gaya = s.getText().getTextStyle();
      const ukuran = gaya.getFontSize();
      if (!ukuran) return;
      const muat = (s.getWidth() - 14) / (nama.length * 0.48);
      if (muat < ukuran) gaya.setFontSize(Math.max(Math.round(muat * 10) / 10, ukuran * 0.5));
    });
    const link = linkVerifikasi(cfg);
    const url = link ? link + (link.indexOf('?') < 0 ? '?' : '&') + 'kode=' + kode : '';
    pres.getSlides().forEach((slide) => slide.getShapes().forEach((s) => {
      let teks = '';
      try { teks = s.getText().asString(); } catch (e) { return; }
      if (teks.indexOf('{{QR}}') < 0) return;
      if (!url) { s.remove(); return; }
      // kotak {{QR}} tetap menjadi bingkai, kode QR diletakkan di dalamnya
      const qr = UrlFetchApp.fetch('https://quickchart.io/qr?size=600&margin=1&text=' + encodeURIComponent(url)).getBlob();
      const sisi = Math.min(s.getWidth(), s.getHeight());
      const jarak = sisi * 0.07;
      s.getText().setText('');
      slide.insertImage(qr, s.getLeft() + (s.getWidth() - sisi) / 2 + jarak, s.getTop() + (s.getHeight() - sisi) / 2 + jarak, sisi - 2 * jarak, sisi - 2 * jarak);
    }));
    pres.saveAndClose();
    return salinan.getAs('application/pdf').setName('Sertifikat - ' + nama.replace(/[\\/:*?"<>|]+/g, ' ').replace(/[.\s]+$/, '').trim() + '.pdf');
  } finally {
    salinan.setTrashed(true);
  }
}

function kirimEmail(cfg, email, nama, nomor, pdf) {
  const isi = (cfg.isi || 'Yth. {nama},\n\nTerima kasih telah mengikuti {acara}. Sertifikat Anda terlampir.\n\nSalam,\n{pengirim}')
    .replace(/{nama}/g, nama).replace(/{acara}/g, cfg.acara).replace(/{nomor}/g, nomor).replace(/{pengirim}/g, cfg.pengirim);
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#22314F;max-width:560px">' +
    esc(isi).replace(/\n/g, '<br>') + '</div>';
  MailApp.sendEmail({ to: email, subject: cfg.subjek.replace(/{acara}/g, cfg.acara), body: isi, htmlBody: html, name: cfg.pengirim, attachments: [pdf] });
}

// ---------- proses utama ----------
function proses() { jalankan(false); }
function prosesManual() { const n = jalankan(true); SpreadsheetApp.getUi().alert(n + ' sertifikat terkirim.'); }

function jalankan(manual) {
  const kunci = LockService.getScriptLock();
  if (!kunci.tryLock(10000)) return 0;
  let terkirim = 0;
  try {
    const cfg = bacaPengaturan();
    const now = new Date();
    if (!manual && ((cfg.mulai && now < cfg.mulai) || (cfg.sampai && now > cfg.sampai))) return 0;
    const hadir = bacaTab(cfg.tabHadir);
    if (hadir.iNama < 0 || hadir.iEmail < 0) throw new Error('Tab daftar hadir harus punya kolom Nama dan Email.');
    const t = bacaTerbit();
    for (const r of hadir.rows) {
      const waktu = hadir.iWaktu >= 0 ? r[hadir.iWaktu] : null;
      if (waktu instanceof Date && now - waktu < cfg.jeda * 60000) continue;
      const p = { nama: String(r[hadir.iNama] || '').replace(/\s+/g, ' ').trim(), email: normEmail(r[hadir.iEmail]) };
      if (!p.nama || !emailSah(p.email)) continue;
      if (t.sudah.has(p.email)) continue;
      if (MailApp.getRemainingDailyQuota() < 1) break;
      const nomor = formatNomor(cfg.formatNomor, t.jumlah + 1);
      const kode = Utilities.getUuid().replace(/-/g, '').slice(0, 12);
      try {
        kirimEmail(cfg, p.email, p.nama, nomor, buatPdf(cfg, p.nama, nomor, kode));
        t.sh.appendRow([new Date(), nomor, p.nama, p.email, kode, 'Terkirim']);
        t.jumlah++; terkirim++;
      } catch (e) {
        t.sh.appendRow([new Date(), '', p.nama, p.email, '', 'Gagal: ' + e.message]);
      }
      t.sudah.add(p.email);
    }
  } finally {
    kunci.releaseLock();
  }
  return terkirim;
}

// ---------- menu ----------
function siapkan() {
  const ui = SpreadsheetApp.getUi();
  const cfg = bacaPengaturan();
  let pesan = '';
  let milikSendiri = false;
  if (cfg.desainId) { try { milikSendiri = DriveApp.getFileById(cfg.desainId).getOwner().getEmail() === Session.getEffectiveUser().getEmail(); } catch (e) {} }
  if (!milikSendiri) {
    const sumber = cfg.desainId || MASTER_DESAIN;
    const baru = DriveApp.getFileById(sumber).makeCopy('Desain Sertifikat ' + (cfg.acara || ''));
    tulisPengaturan('link desain sertifikat', baru.getUrl());
    pesan += 'Desain sertifikat sudah dibuat di Google Drive Anda. Buka link di tab Pengaturan untuk mendesain.\n\n';
  } else pesan += 'Desain sertifikat sudah siap.\n\n';
  bacaTerbit();
  const ss = SpreadsheetApp.getActive();
  if (!ss.getSheetByName(cfg.tabHadir)) pesan += 'Tab "' + cfg.tabHadir + '" belum ada. Hubungkan Google Form daftar hadir lalu ganti nama tab hasilnya.\n';
  ui.alert('Siap', pesan.trim(), ui.ButtonSet.OK);
}

function kirimContoh() {
  const cfg = bacaPengaturan();
  const saya = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail();
  const nomor = formatNomor(cfg.formatNomor, 0);
  kirimEmail(cfg, saya, 'Nama Peserta Contoh, S.H.', nomor, buatPdf(cfg, 'Nama Peserta Contoh, S.H.', nomor, 'contoh'));
  SpreadsheetApp.getUi().alert('Contoh sertifikat sudah dikirim ke ' + saya + '.');
}

function nyalakan() {
  matikan(true);
  ScriptApp.newTrigger('proses').timeBased().everyMinutes(5).create();
  SpreadsheetApp.getUi().alert('Pengiriman otomatis menyala. Sistem memeriksa daftar hadir setiap 5 menit.');
}

function matikan(diam) {
  ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === 'proses').forEach((t) => ScriptApp.deleteTrigger(t));
  if (diam !== true) SpreadsheetApp.getUi().alert('Pengiriman otomatis dimatikan.');
}

// ---------- halaman verifikasi (Web App) ----------
function doGet(e) {
  const cari = String((e && e.parameter && e.parameter.kode) || '').trim();
  const cfg = bacaPengaturan();
  let data = null;
  if (cari) {
    const k = cari.toLowerCase();
    const baris = bacaTerbit().rows.find((r) => r[5] === 'Terkirim' && (String(r[4]).toLowerCase() === k || String(r[1]).trim().toLowerCase() === k));
    if (baris) data = { nama: baris[2], nomor: baris[1], kode: baris[4], terbit: tanggalIndonesia(baris[0]) };
  }
  let url = '';
  try { url = ScriptApp.getService().getUrl() || ''; } catch (err) {}
  const html = halamanVerifikasi({ cari: cari, data: data, acara: cfg.acara, tanggal: cfg.tanggal, penerbit: cfg.pengirim, url: url });
  return HtmlService.createHtmlOutput(html).setTitle('Verifikasi Sertifikat' + (cfg.acara ? ' | ' + cfg.acara : ''))
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function tanggalIndonesia(d) {
  if (!(d instanceof Date)) return String(d || '');
  const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return d.getDate() + ' ' + bulan[d.getMonth()] + ' ' + d.getFullYear();
}

// HALAMAN-MULAI
function halamanVerifikasi(v) {
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const baris = (label, isi) => isi ? '<div class="baris"><span>' + label + '</span><b>' + esc(isi) + '</b></div>' : '';
  const form = '<form class="cari" method="get" action="' + esc(v.url) + '" target="_top">' +
    '<label for="kode">Kode verifikasi atau nomor sertifikat</label>' +
    '<div class="isian"><input id="kode" name="kode" value="' + esc(v.data ? '' : v.cari) + '" placeholder="Contoh: 3f9a1c7b2e4d" autocomplete="off" required>' +
    '<button type="submit">Periksa</button></div></form>';
  let isi;
  if (v.data) {
    isi = '<div class="lencana sah"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="29"/><circle cx="32" cy="32" r="23" class="tipis"/><path d="M21 33l8 8 15-17"/></svg></div>' +
      '<div class="status sah">SERTIFIKAT SAH</div>' +
      '<p class="ket">Sertifikat ini tercatat resmi dan diterbitkan oleh <b>' + esc(v.penerbit) + '</b>.</p>' +
      '<div class="garis"><i></i></div>' +
      '<div class="label">Diberikan kepada</div><div class="nama">' + esc(v.data.nama) + '</div>' +
      '<div class="rincian">' + baris('Nomor sertifikat', v.data.nomor) + baris('Acara', v.acara) + baris('Tanggal acara', v.tanggal) + baris('Diterbitkan', v.data.terbit) + baris('Kode verifikasi', v.data.kode) + '</div>';
  } else if (v.cari) {
    isi = '<div class="lencana tidak"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="29"/><circle cx="32" cy="32" r="23" class="tipis"/><path d="M24 24l16 16M40 24L24 40"/></svg></div>' +
      '<div class="status tidak">TIDAK DITEMUKAN</div>' +
      '<p class="ket">Kode <b>' + esc(v.cari) + '</b> tidak tercatat sebagai sertifikat resmi. Periksa kembali kode pada sertifikat atau hubungi penyelenggara.</p>' + form;
  } else {
    isi = '<div class="lencana"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="29"/><circle cx="32" cy="32" r="23" class="tipis"/><path d="M22 20h20v24H22zM27 28h10M27 34h10M27 40h6"/></svg></div>' +
      '<div class="status">CEK KEASLIAN</div>' +
      '<p class="ket">Pindai kode QR pada sertifikat, atau ketik kode verifikasi maupun nomor sertifikat pada kolom di bawah ini.</p>' + form;
  }
  return '<!doctype html><html lang="id"><head><meta charset="utf-8"><base target="_top">' +
    '<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Cormorant+Garamond:ital,wght@1,600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">' +
    '<style>' +
    '*{box-sizing:border-box;margin:0;padding:0}' +
    'body{min-height:100vh;font-family:Inter,Arial,sans-serif;color:#3A2E2A;background:#F8F2E9;background-image:radial-gradient(60% 40% at 0% 0%,rgba(235,207,198,.7),transparent),radial-gradient(60% 40% at 100% 100%,rgba(238,223,194,.8),transparent);display:flex;flex-direction:column;align-items:center;padding:36px 16px 28px}' +
    '.atas{font-family:Cinzel,serif;font-weight:700;font-size:12px;letter-spacing:.32em;color:#A6766A;text-align:center}' +
    '.acara{font-family:Cinzel,serif;font-weight:700;font-size:17px;letter-spacing:.05em;color:#3A2E2A;text-align:center;margin-top:8px;max-width:520px;line-height:1.35}' +
    '.kartu{position:relative;width:100%;max-width:520px;margin-top:22px;padding:34px 26px 28px;border-radius:18px;text-align:center;background:#FFFDF9;border:1px solid #E3D2B0;box-shadow:0 20px 50px rgba(120,90,60,.12)}' +
    '.kartu:before{content:"";position:absolute;inset:7px;border:1px solid rgba(199,164,101,.3);border-radius:13px;pointer-events:none}' +
    '.lencana{width:84px;height:84px;margin:0 auto}.lencana svg{width:100%;height:100%;fill:none;stroke:#C7A465;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}.lencana .tipis{stroke-width:1;opacity:.6}' +
    '.lencana.sah svg{stroke:#A8823F}.lencana.sah circle:first-child{fill:rgba(199,164,101,.12)}.lencana.tidak svg{stroke:#B5654F}' +
    '.status{font-family:Cinzel,serif;font-weight:700;font-size:20px;letter-spacing:.16em;margin-top:14px;color:#9C7A45}.status.sah{color:#8A6A35}.status.tidak{color:#B5654F}' +
    '.ket{font-size:14.5px;line-height:1.6;color:#6B5D57;margin-top:10px}.ket b{color:#3A2E2A;font-weight:600}' +
    '.garis{position:relative;height:1px;margin:24px auto 20px;width:70%;background:linear-gradient(90deg,transparent,#C7A465,transparent)}.garis i{position:absolute;left:50%;top:50%;width:8px;height:8px;background:#C7A465;transform:translate(-50%,-50%) rotate(45deg)}' +
    '.label{font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:#857A73}' +
    '.nama{font-family:"Cormorant Garamond",serif;font-style:italic;font-weight:600;font-size:34px;line-height:1.15;color:#3A2E2A;margin-top:6px;word-break:break-word}' +
    '.rincian{margin-top:22px;text-align:left;border-top:1px solid #EDE2CF}' +
    '.baris{display:flex;justify-content:space-between;gap:16px;padding:11px 2px;border-bottom:1px solid #EDE2CF;font-size:13.5px}.baris span{color:#857A73;flex:none}.baris b{font-weight:600;color:#3A2E2A;text-align:right;word-break:break-word}' +
    '.cari{margin-top:22px;text-align:left}.cari label{display:block;font-size:12px;letter-spacing:.04em;color:#857A73;margin-bottom:8px}' +
    '.isian{display:flex;gap:8px}.isian input{flex:1;min-width:0;padding:13px 14px;border-radius:10px;border:1px solid #DCC9A3;background:#FFFFFF;color:#3A2E2A;font:500 15px Inter,Arial,sans-serif;outline:none}.isian input:focus{border-color:#B8925A}' +
    '.isian button{padding:0 18px;border:0;border-radius:10px;background:linear-gradient(180deg,#D9BC84,#B8925A);color:#FFFFFF;font:700 14px Inter,Arial,sans-serif;letter-spacing:.04em;cursor:pointer}' +
    '.kaki{margin-top:22px;font-size:12px;color:#857A73;text-align:center;line-height:1.6}.kaki b{color:#9C7A45;font-weight:600}' +
    '</style></head><body>' +
    '<div class="atas">VERIFIKASI SERTIFIKAT</div>' + (v.acara ? '<div class="acara">' + esc(v.acara) + '</div>' : '') +
    '<div class="kartu">' + isi + '</div>' +
    '<div class="kaki">Halaman resmi pemeriksaan keaslian sertifikat' + (v.penerbit ? '<br><b>' + esc(v.penerbit) + '</b>' : '') + '</div>' +
    '</body></html>';
}
// HALAMAN-SELESAI
