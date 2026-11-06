/* Penjadwal: tiap hari kerja pada jam yang disetel (bawaan 08:15) mengisi jurnal hari H
 * dan menyusulkan H-1 bila kemarin hari kerja dan belum terisi. Bila Chrome baru dibuka
 * setelah jam tersebut, pengisian langsung dijalankan (cek tiap 30 menit + saat Chrome dibuka).
 */
importScripts('kegiatan.js', 'filler.js');
var J = self.JurnalBHP;

var sedangJalan = false;

async function ambilCfg() {
  var s = await chrome.storage.sync.get('cfg');
  var l = await chrome.storage.local.get('dataRemote');
  var cfg = Object.assign({}, J.DEFAULTS, s.cfg || {});
  return J.gabungRemote(cfg, l.dataRemote && l.dataRemote.data);
}

/* Auto-update data: ambil data/kegiatan.json dari GitHub (bank kegiatan, libur, kunjungan).
 * Bila gagal/tidak valid, data terakhir yang tersimpan (atau bawaan plugin) tetap dipakai. */
async function perbaruiData(alasan) {
  try {
    var r = await fetch(J.DATA_URL + '?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    var data = await r.json();
    if (!J.validBank(data.bank)) throw new Error('isi bank kegiatan tidak valid');
    var lama = (await chrome.storage.local.get('dataRemote')).dataRemote;
    await chrome.storage.local.set({ dataRemote: { data: data, versi: data.versi || '?', waktu: new Date().toLocaleString('id-ID') } });
    if (!lama || lama.versi !== data.versi) await catat('Data kegiatan diperbarui dari GitHub → versi ' + (data.versi || '?') + ' (' + data.bank.length + ' kegiatan)', 'ok');
    return { ok: true, versi: data.versi, jumlah: data.bank.length };
  } catch (e) {
    await catat('Gagal ambil data kegiatan dari GitHub (' + alasan + '): ' + e.message + ' — memakai data terakhir.', 'peringatan');
    return { ok: false, pesan: e.message };
  }
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

  var tglTampil = J.formatTanggal(tanggal, 'dd-mm-yyyy');
  async function suntik(tabId, fn, args) {
    try {
      var r = await chrome.scripting.executeScript({ target: { tabId: tabId }, world: 'MAIN', func: fn, args: args });
      return (r && r[0] && r[0].result) || { ok: false, pesan: 'Tidak ada balasan dari halaman.' };
    } catch (e) { return { ok: false, pesan: 'Gagal menjalankan skrip di halaman: ' + e.message }; }
  }
  var tabId = await bukaTab(cfg.url);
  for (var i = mulaiDari; i < daftar.length; i++) {
    await tidur(1200);
    // pilih tanggal jurnal di kotak tanggal (datepicker) — halaman bisa memuat ulang
    var hasil = await suntik(tabId, simpegPilihTanggal, [tglTampil]);
    if (hasil.ok && hasil.berubah) {
      await tidur(1500);
      var t = await chrome.tabs.get(tabId);
      if (t.status === 'loading') await tungguMuat(tabId);
      await tidur(1200);
    }
    if (hasil.ok) {
      hasil = await suntik(tabId, simpegIsiSatuKegiatan, [daftar[i], cfg]);
      if (hasil.perluTanggal) {   // coba sekali lagi
        await suntik(tabId, simpegPilihTanggal, [tglTampil]); await tidur(3000);
        hasil = await suntik(tabId, simpegIsiSatuKegiatan, [daftar[i], cfg]);
      }
    }

    if (hasil.login) {
      await chrome.storage.local.set({ tertunda: { tanggal: tanggal, sejak: Date.now() } });
      await catat('SIMPEG minta login. Pengisian ' + tanggal + ' dilanjutkan otomatis setelah Anda login.', 'peringatan');
      beritahu('Jurnal SIMPEG', 'Silakan login SIMPEG — jurnal ' + tanggal + ' akan diisi otomatis setelah login.');
      chrome.tabs.update(tabId, { active: true });
      return { ok: false, login: true, pesan: hasil.pesan };
    }
    if (!hasil.ok) {
      await catat(tanggal + ' kegiatan ' + (i + 1) + ': ' + hasil.pesan, 'galat');
      beritahu('Jurnal SIMPEG gagal', hasil.pesan);
      return hasil;
    }
    if (hasil.uji) {
      await catat('UJI ' + tanggal + ': form terisi (belum disimpan). Periksa lalu klik Batal.', 'info');
      chrome.tabs.update(tabId, { active: true });
      return hasil; // uji coba cukup satu kegiatan
    }
    st = await ambilStatus();
    st.selesai[tanggal] = { jumlah: i + 1, waktu: new Date().toLocaleString('id-ID') };
    await chrome.storage.local.set({ selesai: st.selesai });
    await catat(tanggal + (hasil.lewati ? ' = sudah ada ' : ' ✓ ') + daftar[i].jamMulai + '–' + daftar[i].jamSelesai + ' ' + daftar[i].uraian.slice(0, 70) + '…', 'ok');
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
  await perbaruiData('sebelum mengisi');
  cfg = await ambilCfg();
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
    chrome.alarms.create('jagaSesi', { periodInMinutes: 15 });
    chrome.alarms.create('perbaruiData', { periodInMinutes: 360 });
  });
}

chrome.runtime.onInstalled.addListener(function (d) {
  jadwalkan();
  perbaruiData('pasang/muat ulang');
  if (d.reason === 'install') chrome.runtime.openOptionsPage();
});
chrome.runtime.onStartup.addListener(function () { jadwalkan(); perbaruiData('Chrome dibuka'); setTimeout(function () { rutin('Chrome dibuka'); }, 60000); });
chrome.alarms.onAlarm.addListener(function (a) {
  if (a.name === 'jagaSesi') return jagaSesi();
  if (a.name === 'perbaruiData') return perbaruiData('berkala');
  rutin(a.name === 'tepat' ? 'jadwal harian' : 'cek berkala');
});

/* Jaga sesi: tiap 15 menit "menyentuh" SIMPEG memakai cookie login yang ada, agar sesi web
 * tidak kedaluwarsa karena menganggur. Tidak melewati captcha: bila sesi sudah habis,
 * hanya memberi tahu supaya login ulang. */
async function jagaSesi() {
  var cfg = await ambilCfg();
  if (!cfg.aktif || !cfg.jagaSesi || sedangJalan || !cfg.url) return;
  try {
    var r = await fetch(cfg.url, { credentials: 'include', cache: 'no-store', redirect: 'follow' });
    var html = await r.text();
    var habis = /signin\.php/i.test(r.url) || /type=["']?password/i.test(html);
    var st = await chrome.storage.local.get('sesi');
    var sebelumnya = st.sesi && st.sesi.habis;
    await chrome.storage.local.set({ sesi: { habis: habis, cek: new Date().toLocaleString('id-ID') } });
    if (habis && !sebelumnya) {
      await catat('Sesi SIMPEG habis — login ulang di Chrome agar jurnal bisa diisi otomatis.', 'peringatan');
      beritahu('SIMPEG perlu login', 'Sesi web SIMPEG habis. Login sekali lagi (NIP → password → captcha).');
    }
  } catch (e) { /* jaringan putus: abaikan */ }
}
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
    } else if (m.aksi === 'perbarui') {
      balas(await perbaruiData('diminta'));
    } else if (m.aksi === 'tandai') {
      var st = await ambilStatus();
      if (m.selesai) st.selesai[m.tanggal] = { jumlah: 99, waktu: 'ditandai manual' }; else delete st.selesai[m.tanggal];
      await chrome.storage.local.set({ selesai: st.selesai });
      balas({ ok: true });
    } else balas({ ok: false });
  })();
  return true;
});
