/**
 * SERTIFIKAT OTOMATIS
 * Sertifikat PDF dikirim otomatis ke email peserta yang sudah mendaftar,
 * beberapa menit setelah peserta mengisi daftar hadir.
 * Semua pengaturan ada di tab "Pengaturan", semua tombol ada di menu "Sertifikat".
 */

const MASTER_DESAIN = '10yaUzigwrQSdaBTPRVTOztQRdZBOA12ieurAiXqj4uI';
const TAB = { atur: 'Pengaturan', daftar: 'Pendaftaran', hadir: 'Daftar Hadir', terbit: 'Terbit' };
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
    tabDaftar: String(ambil('nama tab pendaftaran') || TAB.daftar),
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
  const ditolak = new Set(rows.filter((r) => /^Ditolak/.test(r[5])).map((r) => normEmail(r[3])));
  const jumlah = rows.filter((r) => r[5] === 'Terkirim').length;
  return { sh, rows, sudah, ditolak, jumlah };
}

// ---------- sertifikat ----------
function formatNomor(pola, n) {
  return pola.replace('{n}', String(n).padStart(3, '0'));
}

function buatPdf(cfg, nama, nomor, kode) {
  if (!cfg.desainId) throw new Error('Link desain sertifikat belum diisi. Jalankan menu Sertifikat, 1. Siapkan desain sertifikat.');
  const salinan = DriveApp.getFileById(cfg.desainId).makeCopy('sementara ' + nomor);
  try {
    const pres = SlidesApp.openById(salinan.getId());
    pres.replaceAllText('{{NAMA}}', nama);
    pres.replaceAllText('{{NOMOR}}', nomor);
    pres.replaceAllText('{{ACARA}}', cfg.acara);
    pres.replaceAllText('{{TANGGAL}}', cfg.tanggal);
    const url = cfg.linkVerifikasi ? cfg.linkVerifikasi + (cfg.linkVerifikasi.indexOf('?') < 0 ? '?' : '&') + 'kode=' + kode : '';
    pres.getSlides().forEach((slide) => slide.getShapes().forEach((s) => {
      let teks = '';
      try { teks = s.getText().asString(); } catch (e) { return; }
      if (teks.indexOf('{{QR}}') < 0) return;
      if (url) {
        const qr = UrlFetchApp.fetch('https://quickchart.io/qr?size=600&margin=1&text=' + encodeURIComponent(url)).getBlob();
        slide.insertImage(qr, s.getLeft(), s.getTop(), s.getWidth(), s.getWidth());
      }
      s.remove();
    }));
    pres.saveAndClose();
    return salinan.getAs('application/pdf').setName('Sertifikat - ' + nama.replace(/[\\/:*?"<>|]+/g, ' ').trim() + '.pdf');
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
    const daftar = bacaTab(cfg.tabDaftar), hadir = bacaTab(cfg.tabHadir);
    const byEmail = new Map(), byHp = new Map();
    daftar.rows.forEach((r) => {
      const o = { nama: String(r[daftar.iNama] || '').trim(), email: normEmail(r[daftar.iEmail]) };
      if (!o.nama || !emailSah(o.email)) return;
      if (!byEmail.has(o.email)) byEmail.set(o.email, o);
      const hp = daftar.iHp >= 0 ? normHp(r[daftar.iHp]) : '';
      if (hp && !byHp.has(hp)) byHp.set(hp, o);
    });
    const t = bacaTerbit();
    for (const r of hadir.rows) {
      const waktu = hadir.iWaktu >= 0 ? r[hadir.iWaktu] : null;
      if (waktu instanceof Date && now - waktu < cfg.jeda * 60000) continue;
      const em = hadir.iEmail >= 0 ? normEmail(r[hadir.iEmail]) : '';
      const hp = hadir.iHp >= 0 ? normHp(r[hadir.iHp]) : '';
      const p = (em && byEmail.get(em)) || (hp && byHp.get(hp));
      if (!p) {
        // Hanya peserta yang terdaftar yang mendapat sertifikat.
        if (em && !t.ditolak.has(em)) { t.sh.appendRow([now, '', '', em, '', 'Ditolak: tidak terdaftar']); t.ditolak.add(em); }
        continue;
      }
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
  [cfg.tabDaftar, cfg.tabHadir].forEach((n) => { if (!ss.getSheetByName(n)) pesan += 'Tab "' + n + '" belum ada. Hubungkan Google Form lalu ganti nama tab hasilnya.\n'; });
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
  const kode = String((e && e.parameter && e.parameter.kode) || '').trim();
  let isi = '<p>Pindai kode QR pada sertifikat untuk memeriksa keasliannya.</p>';
  if (kode) {
    const baris = bacaTerbit().rows.find((r) => String(r[4]) === kode && r[5] === 'Terkirim');
    const cfg = bacaPengaturan();
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    isi = baris
      ? '<div class="ok">&#10003; SERTIFIKAT SAH</div><h2>' + esc(baris[2]) + '</h2><p>Nomor ' + esc(baris[1]) + '<br>' + esc(cfg.acara) + '<br>' + esc(cfg.tanggal) + '</p>'
      : '<div class="no">Sertifikat tidak ditemukan</div>';
  }
  return HtmlService.createHtmlOutput('<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:Arial,sans-serif;background:#F4F1EA;display:flex;justify-content:center;padding:40px 16px;color:#22314F}.k{background:#fff;max-width:440px;width:100%;padding:28px;border-radius:14px;text-align:center;box-shadow:0 6px 24px rgba(0,0,0,.08)}.ok{color:#1E6B35;font-weight:bold}.no{color:#8A2323;font-weight:bold}h2{margin:14px 0 6px}</style><div class="k"><h3>Verifikasi Sertifikat</h3>' + isi + '</div>')
    .setTitle('Verifikasi Sertifikat');
}
