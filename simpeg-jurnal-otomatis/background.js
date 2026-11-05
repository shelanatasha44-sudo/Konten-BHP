/* Penjadwal: tiap hari kerja pada jam yang disetel (bawaan 08:15) mengisi jurnal hari H
 * dan menyusulkan H-1 bila kemarin hari kerja dan belum terisi. Bila Chrome baru dibuka
 * setelah jam tersebut, pengisian langsung dijalankan (cek tiap 30 menit + saat Chrome dibuka).
 */
importScripts('kegiatan.js', 'filler.js');
var J = self.JurnalBHP;

var sedangJalan = false;

async function ambilCfg() {
  var s = await chrome.storage.sync.get('cfg');
  var cfg = Object.assign({}, J.DEFAULTS, s.cfg || {});
  cfg.selectors = Object.assign({}, J.DEFAULTS.selectors, (s.cfg && s.cfg.selectors) || {});
  return cfg;
}
async function ambilStatus() {
  var s = await chrome.storage.local.get(['selesai', 'log', 'tertunda']);
  return { selesai: s.selesai || {}, log: s.log || [], tertunda: s.tertunda || null };
}
async function catat(pesan, jenis) {
  var st = await ambilStatus();
  st.log.unshift({ waktu: new Date().toLocaleString('id-ID'), pesan: pesan, jenis: jenis || 'info' });
  await chrome.storage.local.set({ log: st.log.slice(0, 80) });
}
function beritahu(judul, pesan) {
  try { chrome.notifications.create({ type: 'basic', iconUrl: 'icon128.png', title: judul, message: pesan, priority: 1 }); } catch (e) { /* tanpa ikon */ }
}
function tidur(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function hariIni() { return J.iso(new Date()); }
function lewatJam(cfg) {
  var p = (cfg.jam || '08:15').split(':'); var n = new Date();
  return n.getHours() * 60 + n.getMinutes() >= (+p[0]) * 60 + (+p[1]);
}

function tungguMuat(tabId) {
  return new Promise(function (resolve) {
    var selesai = false;
    function dengar(id, info) { if (id === tabId && info.status === 'complete') { selesai = true; chrome.tabs.onUpdated.removeListener(dengar); resolve(true); } }
    chrome.tabs.onUpdated.addListener(dengar);
    setTimeout(function () { if (!selesai) { chrome.tabs.onUpdated.removeListener(dengar); resolve(false); } }, 45000);
  });
}

async function bukaTab(url) {
  var host = new URL(url).host;
  var tabs = await chrome.tabs.query({});
  var ada = tabs.find(function (t) { try { return t.url && new URL(t.url).host === host; } catch (e) { return false; } });
  if (ada) { await chrome.tabs.update(ada.id, { url: url }); await tungguMuat(ada.id); return ada.id; }
  var tab = await chrome.tabs.create({ url: url, active: false });
  await tungguMuat(tab.id);
  return tab.id;
}

/** Isi jurnal satu tanggal. opsi: { paksa, uji } */
async function isiTanggal(tanggal, opsi) {
  opsi = opsi || {};
  var cfg = await ambilCfg();
  if (opsi.uji) cfg.simpanOtomatis = false;
  var st = await ambilStatus();
  var sudah = (st.selesai[tanggal] && st.selesai[tanggal].jumlah) || 0;
  var daftar = J.susunJurnal(tanggal, cfg);
  if (sudah >= daftar.length && !opsi.paksa) return { ok: true, pesan: tanggal + ' sudah terisi.' };
  var mulaiDari = opsi.paksa ? 0 : sudah;   // lanjutkan dari kegiatan yang belum tersimpan

  var tabId = await bukaTab(cfg.url);
  for (var i = mulaiDari; i < daftar.length; i++) {
    await tidur(1200);
    var hasil;
    try {
      var r = await chrome.scripting.executeScript({ target: { tabId: tabId }, world: 'MAIN', func: simpegIsiSatuKegiatan, args: [daftar[i], cfg] });
      hasil = r && r[0] && r[0].result;
    } catch (e) { hasil = { ok: false, pesan: 'Gagal menyuntik skrip: ' + e.message }; }
    if (!hasil) hasil = { ok: false, pesan: 'Tidak ada balasan dari halaman.' };

    if (hasil.login) {
      await chrome.storage.local.set({ tertunda: { tanggal: tanggal, sejak: Date.now() } });
      await catat('SIMPEG minta login. Pengisian ' + tanggal + ' dilanjutkan otomatis setelah Anda login.', 'peringatan');
      beritahu('Jurnal SIMPEG', 'Silakan login SIMPEG — jurnal ' + tanggal + ' akan diisi otomatis setelah login.');
      chrome.tabs.update(tabId, { active: true });
      return { ok: false, login: true, pesan: hasil.pesan };
    }
    if (!hasil.ok) {
      await catat(tanggal + ' kegiatan ' + (i + 1) + ': ' + hasil.pesan + (hasil.kolomHalaman ? ' | Kolom: ' + hasil.kolomHalaman.join(' ; ') : ''), 'galat');
      beritahu('Jurnal SIMPEG gagal', hasil.pesan);
      return hasil;
    }
    if (hasil.uji) {
      await catat('UJI ' + tanggal + ': form terisi, kolom terdeteksi → ' + JSON.stringify(hasil.terdeteksi), 'info');
      chrome.tabs.update(tabId, { active: true });
      return hasil; // uji coba cukup satu kegiatan
    }
    st = await ambilStatus();
    st.selesai[tanggal] = { jumlah: i + 1, waktu: new Date().toLocaleString('id-ID') };
    await chrome.storage.local.set({ selesai: st.selesai });
    await catat(tanggal + ' ✓ ' + daftar[i].jamMulai + '–' + daftar[i].jamSelesai + ' ' + daftar[i].uraian.slice(0, 70) + '…', 'ok');
    // muat ulang halaman supaya form bersih untuk kegiatan berikutnya
    if (i < daftar.length - 1) { await tidur(cfg.jedaMs || 2500); await chrome.tabs.update(tabId, { url: cfg.url }); await tungguMuat(tabId); }
  }
  await chrome.storage.local.set({ tertunda: null });
  beritahu('Jurnal SIMPEG terisi', tanggal + ': ' + daftar.length + ' kegiatan tersimpan.');
  return { ok: true, pesan: tanggal + ': ' + daftar.length + ' kegiatan tersimpan.' };
}

/** Pengisian rutin: H (setelah jam setel) + susulan H-1. */
async function rutin(alasan) {
  if (sedangJalan) return;
  var cfg = await ambilCfg();
  if (!cfg.aktif || !cfg.url) return;
  var h = hariIni();
  var target = [];
  if (cfg.isiKemarin) { var kmrn = J.addDays(h, -1); if (J.hariKerja(kmrn, cfg)) target.push(kmrn); }
  if (J.hariKerja(h, cfg) && lewatJam(cfg)) target.push(h);
  var st = await ambilStatus();
  target = target.filter(function (t) { return !(st.selesai[t] && st.selesai[t].jumlah >= J.susunJurnal(t, cfg).length); });
  if (!target.length) return;
  sedangJalan = true;
  try {
    await catat('Mulai (' + alasan + '): ' + target.join(', '), 'info');
    for (var i = 0; i < target.length; i++) {
      var r = await isiTanggal(target[i]);
      if (!r.ok) break;
    }
  } catch (e) { await catat('Galat: ' + e.message, 'galat'); }
  finally { sedangJalan = false; }
}

function jadwalkan() {
  ambilCfg().then(function (cfg) {
    var p = (cfg.jam || '08:15').split(':');
    var t = new Date(); t.setHours(+p[0], +p[1], 0, 0);
    if (t <= new Date()) t.setDate(t.getDate() + 1);
    chrome.alarms.create('tepat', { when: t.getTime(), periodInMinutes: 1440 });
    chrome.alarms.create('cek', { periodInMinutes: 30 });
  });
}

chrome.runtime.onInstalled.addListener(function (d) {
  jadwalkan();
  if (d.reason === 'install') chrome.runtime.openOptionsPage();
});
chrome.runtime.onStartup.addListener(function () { jadwalkan(); setTimeout(function () { rutin('Chrome dibuka'); }, 60000); });
chrome.alarms.onAlarm.addListener(function (a) { rutin(a.name === 'tepat' ? 'jadwal harian' : 'cek berkala'); });
chrome.storage.onChanged.addListener(function (c, area) { if (area === 'sync' && c.cfg) jadwalkan(); });

// Setelah login SIMPEG: lanjutkan pengisian yang tertunda.
chrome.tabs.onUpdated.addListener(async function (id, info, tab) {
  if (info.status !== 'complete' || sedangJalan || !tab.url) return;
  var st = await ambilStatus();
  if (!st.tertunda || Date.now() - st.tertunda.sejak > 6 * 3600 * 1000) return;
  var cfg = await ambilCfg();
  try { if (new URL(tab.url).host !== new URL(cfg.url).host) return; } catch (e) { return; }
  var r = await chrome.scripting.executeScript({ target: { tabId: id }, func: function () { var p = document.querySelector('input[type=password]'); return !(p && p.offsetParent); } }).catch(function () { return null; });
  if (r && r[0] && r[0].result) { await chrome.storage.local.set({ tertunda: null }); rutin('setelah login'); }
});

// Pesan dari popup / pengaturan
chrome.runtime.onMessage.addListener(function (m, _s, balas) {
  (async function () {
    if (m.aksi === 'isi') {
      if (sedangJalan) return balas({ ok: false, pesan: 'Sedang mengisi, tunggu sebentar.' });
      sedangJalan = true;
      try { balas(await isiTanggal(m.tanggal, { paksa: m.paksa, uji: m.uji })); }
      catch (e) { balas({ ok: false, pesan: e.message }); }
      finally { sedangJalan = false; }
    } else if (m.aksi === 'tandai') {
      var st = await ambilStatus();
      if (m.selesai) st.selesai[m.tanggal] = { jumlah: 99, waktu: 'ditandai manual' }; else delete st.selesai[m.tanggal];
      await chrome.storage.local.set({ selesai: st.selesai });
      balas({ ok: true });
    } else balas({ ok: false });
  })();
  return true;
});
