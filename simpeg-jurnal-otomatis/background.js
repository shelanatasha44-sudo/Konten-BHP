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
/* Lencana di ikon plugin: ✓ hijau = hari ini terisi, ! merah = perlu login, … = sedang mengisi. */
async function perbaruiLencana() {
  try {
    var cfg = await ambilCfg();
    var st = await ambilStatus();
    var s = await chrome.storage.local.get('sesi');
    var h = hariIni(), teks = '', warna = '#6b7280', judul = 'Jurnal SIMPEG Otomatis';
    if (sedangJalan) { teks = '…'; warna = '#1d4ed8'; judul += ' — sedang mengisi'; }
    else if (J.dalamMasaTutup(h, cfg)) { teks = 'tup'; warna = '#b45309'; judul += ' — SIMPEG ditutup (penarikan tukin)'; }
    else if (st.tertunda || (s.sesi && s.sesi.habis)) { teks = '!'; warna = '#b91c1c'; judul += ' — perlu login SIMPEG'; }
    else if (J.hariKerja(h, cfg) && st.selesai[h] && st.selesai[h].jumlah >= J.susunJurnal(h, cfg).length) { teks = '✓'; warna = '#15803d'; judul += ' — hari ini sudah terisi'; }
    else if (!cfg.aktif) { teks = 'off'; judul += ' — otomatis dimatikan'; }
    await chrome.action.setBadgeText({ text: teks });
    await chrome.action.setBadgeBackgroundColor({ color: warna });
    await chrome.action.setTitle({ title: judul });
  } catch (e) { /* abaikan */ }
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

async function suntik(tabId, fn, args) {
  try {
    var r = await chrome.scripting.executeScript({ target: { tabId: tabId }, world: 'MAIN', func: fn, args: args || [] });
    // Tanpa balasan biasanya berarti halaman memuat ulang di tengah jalan (mis. setelah Simpan).
    return (r && r[0] && r[0].result) || { ok: false, putus: true, pesan: 'Tidak ada balasan dari halaman (halaman memuat ulang).' };
  } catch (e) { return { ok: false, pesan: 'Gagal menjalankan skrip di halaman: ' + e.message }; }
}

/* Tab khusus plugin (tidak mengambil alih tab SIMPEG yang sedang dipakai). */
async function bukaTab(url) {
  var s = await chrome.storage.session.get('tabJurnal').catch(function () { return {}; });
  if (s.tabJurnal) {
    try { await chrome.tabs.get(s.tabJurnal); return s.tabJurnal; } catch (e) { /* sudah ditutup */ }
  }
  var tab = await chrome.tabs.create({ url: url, active: false });
  await tungguMuat(tab.id);
  await chrome.storage.session.set({ tabJurnal: tab.id }).catch(function () {});
  return tab.id;
}
async function tutupTabPlugin() {
  var s = await chrome.storage.session.get('tabJurnal').catch(function () { return {}; });
  if (!s.tabJurnal) return;
  try { var t = await chrome.tabs.get(s.tabJurnal); if (!t.active) await chrome.tabs.remove(s.tabJurnal); } catch (e) { /* sudah ditutup */ }
  await chrome.storage.session.remove('tabJurnal').catch(function () {});
}

/* Buka Jurnal Harian lalu pilih tanggal (halaman bisa memuat ulang setelah tanggal diganti). */
async function keJurnalTanggal(tabId, cfg, tglTampil) {
  var hasil = await keJurnal(tabId, cfg);
  if (hasil.ok) hasil = await suntik(tabId, simpegPilihTanggal, [tglTampil]);
  if (hasil.ok && hasil.berubah) {
    await tidur(1500);
    var t = await chrome.tabs.get(tabId);
    if (t.status === 'loading') await tungguMuat(tabId);
    await tidur(1200);
  }
  return hasil;
}

/* Tambah satu kegiatan; bila gagal karena halaman belum siap, ulangi sekali dari awal. */
async function isiSatu(tabId, cfg, tglTampil, entri) {
  var hasil, putusSaatIsi = false;
  for (var coba = 0; coba < 3; coba++) {
    hasil = await keJurnalTanggal(tabId, cfg, tglTampil);
    if (hasil.ok) {
      hasil = await suntik(tabId, simpegIsiSatuKegiatan, [entri, cfg]);
      if (hasil.perluTanggal) {
        await suntik(tabId, simpegPilihTanggal, [tglTampil]); await tidur(3000);
        hasil = await suntik(tabId, simpegIsiSatuKegiatan, [entri, cfg]);
      }
      if (hasil.putus) {   // halaman dimuat ulang oleh SIMPEG setelah Simpan: tunggu, lalu cek tabel
        putusSaatIsi = true;
        var t = await chrome.tabs.get(tabId);
        if (t.status === 'loading') await tungguMuat(tabId);
        await tidur(1200);
        continue;
      }
    }
    if (hasil.ok && hasil.lewati && putusSaatIsi) return { ok: true, pesan: 'Tersimpan (halaman dimuat ulang oleh SIMPEG).' };
    if (hasil.ok || hasil.login || /menolak/.test(hasil.pesan || '')) return hasil;
    await tidur(3000);
  }
  return hasil;
}

/* Verifikasi akhir: muat ulang tabel tanggal itu dan cari kegiatan yang belum tampak. */
function kunciTeks(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 60); }
async function cekTabel(tabId, cfg, tglTampil, daftar) {
  var hasil = await keJurnalTanggal(tabId, cfg, tglTampil);
  if (!hasil.ok) return null;
  var t = await suntik(tabId, simpegBacaTabel);
  if (!t.ok || (t.tanggal && t.tanggal !== tglTampil)) return null;
  var kunci = (t.sel || []).map(kunciTeks);
  return daftar.filter(function (e) {
    var m = kunciTeks(e.uraian);
    return !kunci.some(function (k) { return k && (k === m || (k.length >= 25 && m.indexOf(k) === 0) || (m.length >= 25 && k.indexOf(m) === 0)); });
  });
}

async function muatUrl(tabId, url) {
  await chrome.tabs.update(tabId, { url: url });
  await tungguMuat(tabId);
  await tidur(1200);
}
async function tungguSetelahKlik(tabId) {
  await tidur(900);
  var t = await chrome.tabs.get(tabId);
  if (t.status === 'loading') await tungguMuat(tabId);
  await tidur(1300);
}

/* Buka halaman Jurnal Harian. SIMPEG bisa membelokkan alamat langsung ke Beranda, jadi bila
 * perlu lewat menu seperti manusia: Kinerja (skp.php) → "Jurnal Harian". */
var lewatMenu = false;
async function keJurnal(tabId, cfg) {
  var p = { path: '?' };
  for (var coba = 0; coba < 2; coba++) {
    if (!lewatMenu) {
      await muatUrl(tabId, cfg.url);
      p = await suntik(tabId, simpegCekHalaman);
      if (p.login) return { ok: false, login: true, pesan: 'Halaman login SIMPEG' };
      if (p.jurnal) return { ok: true };
    }
    await muatUrl(tabId, new URL('skp.php', cfg.url).href);
    p = await suntik(tabId, simpegCekHalaman);
    if (p.login) return { ok: false, login: true, pesan: 'Halaman login SIMPEG' };
    if (!p.jurnal) {
      var k = await suntik(tabId, simpegKlikMenuJurnal);
      if (k.ok) await tungguSetelahKlik(tabId);
      p = await suntik(tabId, simpegCekHalaman);
    }
    if (p.login) return { ok: false, login: true, pesan: 'Halaman login SIMPEG' };
    if (p.jurnal) { lewatMenu = true; return { ok: true, lewatMenu: true }; }
  }
  return { ok: false, pesan: 'Halaman Jurnal Harian tidak terbuka (terakhir di ' + (p.path || '?') + ' — "' + (p.judul || '') + '"). Buka SIMPEG → Kinerja → Jurnal Harian sekali secara manual lalu coba lagi.' };
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
  var tabId = await bukaTab(cfg.url);
  for (var i = mulaiDari; i < daftar.length; i++) {
    var hasil = await isiSatu(tabId, cfg, tglTampil, daftar[i]);

    if (hasil.login) return await mintaLogin(tanggal, tabId, hasil);
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
    if (opsi.uji) {  // mode uji: kegiatan yang sudah ada dilewati tanpa mencatat status
      await catat('UJI ' + tanggal + ': "' + daftar[i].uraian.slice(0, 40) + '…" sudah ada, lanjut ke kegiatan berikutnya.', 'info');
      continue;
    }
    st = await ambilStatus();
    st.selesai[tanggal] = { jumlah: i + 1, waktu: new Date().toLocaleString('id-ID') };
    await chrome.storage.local.set({ selesai: st.selesai });
    await catat(tanggal + (hasil.lewati ? ' = sudah ada ' : ' ✓ ') + daftar[i].jamMulai + '–' + daftar[i].jamSelesai + ' ' + daftar[i].uraian.slice(0, 70) + '…', 'ok');
    // jeda; kegiatan berikutnya membuka ulang halaman Jurnal Harian (form bersih)
    if (i < daftar.length - 1) await tidur(cfg.jedaMs || 2500);
  }
  if (opsi.uji) return { ok: true, pesan: 'Semua kegiatan ' + tanggal + ' sudah ada di SIMPEG — tidak ada yang perlu diuji.' };

  // Verifikasi: yang belum tampak di tabel diisi ulang sekali, lalu dicek lagi.
  var hilang = await cekTabel(tabId, cfg, tglTampil, daftar);
  if (hilang && hilang.length) {
    await catat(tanggal + ': ' + hilang.length + ' kegiatan belum tampak di tabel SIMPEG, diisi ulang.', 'peringatan');
    for (var h = 0; h < hilang.length; h++) {
      var r2 = await isiSatu(tabId, cfg, tglTampil, hilang[h]);
      if (r2.login) return await mintaLogin(tanggal, tabId, r2);
      await tidur(cfg.jedaMs || 2500);
    }
    hilang = await cekTabel(tabId, cfg, tglTampil, daftar);
  }
  await chrome.storage.local.set({ tertunda: null });
  if (hilang && hilang.length) {
    var daftarHilang = hilang.map(function (e) { return e.jamMulai + ' ' + e.uraian.slice(0, 50); }).join('; ');
    await catat(tanggal + ': masih belum tampak di SIMPEG → ' + daftarHilang + '. Periksa manual.', 'galat');
    beritahu('Jurnal SIMPEG perlu dicek', tanggal + ': ' + hilang.length + ' kegiatan belum tampak di tabel. Buka popup untuk rinciannya.');
    return { ok: false, pesan: hilang.length + ' kegiatan belum tampak di tabel SIMPEG.' };
  }
  var cek = hilang ? ' (terverifikasi di tabel)' : '';
  await catat(tanggal + ': ' + daftar.length + ' kegiatan lengkap' + cek + '.', 'ok');
  beritahu('Jurnal SIMPEG terisi', tanggal + ': ' + daftar.length + ' kegiatan tersimpan' + cek + '.');
  if (cfg.tutupTab) await tutupTabPlugin();
  return { ok: true, pesan: tanggal + ': ' + daftar.length + ' kegiatan tersimpan' + cek + '.' };
}

async function mintaLogin(tanggal, tabId, hasil) {
  await chrome.storage.local.set({ tertunda: { tanggal: tanggal, sejak: Date.now() } });
  await catat('SIMPEG minta login. Pengisian ' + tanggal + ' dilanjutkan otomatis setelah Anda login.', 'peringatan');
  beritahu('Jurnal SIMPEG', 'Silakan login SIMPEG — jurnal ' + tanggal + ' akan diisi otomatis setelah login. Klik notifikasi ini untuk membuka SIMPEG.');
  chrome.tabs.update(tabId, { active: true });
  perbaruiLencana();
  return { ok: false, login: true, pesan: hasil.pesan };
}

/** Pengisian rutin: H (setelah jam setel) + susulan H-1. */
async function rutin(alasan) {
  if (sedangJalan) return;
  var cfg = await ambilCfg();
  if (!cfg.aktif || !cfg.url) return;
  var h = hariIni();
  if (J.dalamMasaTutup(h, cfg)) {   // SIMPEG ditutup untuk penarikan tukin: jangan mencoba, cukup catat sekali sehari
    var s = await chrome.storage.local.get('catatTutup');
    if (s.catatTutup !== h) {
      await chrome.storage.local.set({ catatTutup: h });
      await catat('SIMPEG sedang ditutup (penarikan tukin tgl ' + cfg.masaTutup.dari + '–' + cfg.masaTutup.sampai + '). Pengisian otomatis berhenti dan berjalan lagi setelah masa tutup.', 'info');
    }
    return;
  }
  var target = [];
  if (cfg.isiKemarin) { var kmrn = J.addDays(h, -1); if (J.hariKerja(kmrn, cfg)) target.push(kmrn); }
  if (J.hariKerja(h, cfg) && lewatJam(cfg)) target.push(h);
  var st = await ambilStatus();
  target = target.filter(function (t) { return !(st.selesai[t] && st.selesai[t].jumlah >= J.susunJurnal(t, cfg).length); });
  if (!target.length) return;
  await perbaruiData('sebelum mengisi');
  cfg = await ambilCfg();
  sedangJalan = true; perbaruiLencana();
  try {
    await catat('Mulai (' + alasan + '): ' + target.join(', '), 'info');
    for (var i = 0; i < target.length; i++) {
      var r = await isiTanggal(target[i]);
      if (!r.ok) break;
    }
  } catch (e) { await catat('Galat: ' + e.message, 'galat'); }
  finally { sedangJalan = false; perbaruiLencana(); }
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
  perbaruiLencana();
  if (d.reason === 'install') chrome.runtime.openOptionsPage();
});
// Service worker bisa "tidur" sebelum setTimeout 60 detik selesai, jadi penundaan memakai alarm.
chrome.runtime.onStartup.addListener(function () {
  jadwalkan(); perbaruiData('Chrome dibuka'); perbaruiLencana();
  chrome.alarms.create('mulaiChrome', { delayInMinutes: 1 });
});
chrome.alarms.onAlarm.addListener(function (a) {
  if (a.name === 'jagaSesi') return jagaSesi();
  if (a.name === 'perbaruiData') return perbaruiData('berkala');
  rutin(a.name === 'tepat' ? 'jadwal harian' : a.name === 'mulaiChrome' ? 'Chrome dibuka' : 'cek berkala');
});
// Klik notifikasi → buka/fokus tab SIMPEG (mis. untuk login).
chrome.notifications.onClicked.addListener(async function (id) {
  var cfg = await ambilCfg();
  var s = await chrome.storage.session.get('tabJurnal').catch(function () { return {}; });
  try { if (s.tabJurnal) { var t = await chrome.tabs.update(s.tabJurnal, { active: true }); await chrome.windows.update(t.windowId, { focused: true }); return; } } catch (e) { /* tab sudah ditutup */ }
  chrome.tabs.create({ url: cfg.url, active: true });
  chrome.notifications.clear(id);
});
chrome.storage.onChanged.addListener(function (c, area) { if (area === 'local' && (c.selesai || c.tertunda || c.sesi)) perbaruiLencana(); });

/* Jaga sesi: tiap 15 menit "menyentuh" SIMPEG memakai cookie login yang ada, agar sesi web
 * tidak kedaluwarsa karena menganggur. Tidak melewati captcha: bila sesi sudah habis,
 * hanya memberi tahu supaya login ulang. */
async function jagaSesi() {
  var cfg = await ambilCfg();
  if (!cfg.aktif || !cfg.jagaSesi || sedangJalan || !cfg.url) return;
  perbaruiLencana();   // lencana ikut berganti saat masuk/keluar masa tutup
  try {
    var r = await fetch(cfg.url, { credentials: 'include', cache: 'no-store', redirect: 'follow' });
    var html = await r.text();
    // Halaman yang sudah login memuat menu "Keluar"/logout (dan bisa memuat modal Ubah Password
    // berisi kotak password), jadi kotak password saja tidak cukup sebagai tanda sesi habis.
    var halamanLogin = /signin\.php/i.test(r.url) || (/type=["']?password/i.test(html) && !/keluar|logout/i.test(html));
    var habis = r.ok && halamanLogin;
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
      sedangJalan = true; perbaruiLencana();
      try {
        if (m.uji) { balas(await isiTanggal(m.tanggal, { paksa: m.paksa, uji: true })); return; }
        // Tanggal di masa tutup: hari kerja masa tutup sebelumnya yang belum lengkap ikut diisi berurutan.
        var cfgS = await ambilCfg(), stS = await ambilStatus();
        var urut = J.tanggalSusulan(m.tanggal, cfgS).filter(function (t) {
          return t === m.tanggal || !(stS.selesai[t] && stS.selesai[t].jumlah >= J.susunJurnal(t, cfgS).length);
        });
        if (urut.length > 1) await catat('Isi berurutan (susulan masa tutup): ' + urut.join(', '), 'info');
        var hasilAkhir = { ok: true, pesan: '' }, pesan = [];
        for (var u = 0; u < urut.length; u++) {
          hasilAkhir = await isiTanggal(urut[u], { paksa: m.paksa });
          pesan.push(hasilAkhir.pesan);
          if (!hasilAkhir.ok) break;
        }
        balas({ ok: hasilAkhir.ok, pesan: pesan.join(' · ') });
      }
      catch (e) { balas({ ok: false, pesan: e.message }); }
      finally { sedangJalan = false; perbaruiLencana(); }
    } else if (m.aksi === 'bukaSimpeg') {
      var c = await ambilCfg();
      chrome.tabs.create({ url: c.url, active: true });
      balas({ ok: true });
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
