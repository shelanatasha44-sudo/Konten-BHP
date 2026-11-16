/**
 * Penerima Daftar Hadir Webinar Pengampuan BHP Medan.
 * Setiap kiriman dari halaman daftar hadir langsung ditambahkan ke spreadsheet
 * "Daftar Hadir Webinar Pengampuan 24 November 2026" (folder 10 Daftar Hadir Peserta).
 */
const SHEET_ID = '18rlMVmiesWFSLkxF7w_sx1fPejIRqGovBHXgPWrrIlg';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const p = (e && e.parameter) || {};
    const sh = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    const clean = (v, n) => String(v || '').replace(/^[=+\-@]/, "'$&").slice(0, n);
    const no = Math.max(sh.getLastRow(), 1);
    sh.appendRow([
      no,
      Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss'),
      clean(p.nama, 200), clean(p.email, 200), clean(p.wa, 30),
      clean(p.instansi, 200), clean(p.saran, 2000)
    ]);
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return ContentService.createTextOutput('Penerima daftar hadir aktif.');
}
