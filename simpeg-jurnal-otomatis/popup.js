var J = self.JurnalBHP;
var tgl = document.getElementById('tgl');
var cfg = J.DEFAULTS;
var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'];

function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }

async function muat() {
  var s = await chrome.storage.sync.get('cfg');
  var ls = await chrome.storage.local.get(['sesi', 'dataRemote']);
  cfg = J.gabungRemote(Object.assign({}, J.DEFAULTS, s.cfg || {}), ls.dataRemote && ls.dataRemote.data);
  var dataInfo = ls.dataRemote ? '📦 Data kegiatan v' + ls.dataRemote.versi + ' dari GitHub (' + ls.dataRemote.waktu + ')' : '📦 Data kegiatan bawaan plugin';
  var sesi = ls.sesi
    ? (ls.sesi.habis ? '🔴 Sesi SIMPEG habis — login sekali, lalu isian lanjut sendiri' : '🟢 SIMPEG masih login (dicek ' + ls.sesi.cek + ')')
    : '⚪ Status sesi belum dicek — buka SIMPEG sekali';
  document.getElementById('info').innerHTML =
    (cfg.aktif ? '⏰ Otomatis Senin–Jumat pukul ' + cfg.jam : '⏸ Otomatis dimatikan') +
    (cfg.simpanOtomatis ? '' : ' · mode uji (tidak menyimpan)') +
    (J.dalamMasaTutup(J.iso(new Date()), cfg) ? '<br>🔒 SIMPEG sedang ditutup (penarikan tukin tgl ' + cfg.masaTutup.dari + '–' + cfg.masaTutup.sampai + '); pengisian otomatis menunggu masa tutup selesai' : '') +
    '<br>' + sesi + '<br>' + dataInfo;
  if (!tgl.value) tgl.value = J.iso(new Date());
  tampil();
}
async function tampil() {
  var t = tgl.value, d = new Date(t + 'T00:00');
  var st = await chrome.storage.local.get(['selesai', 'log', 'tertunda']);
  var sel = (st.selesai || {})[t];
  var stat = document.getElementById('status');
  var kerja = J.hariKerja(t, cfg);
  var total = kerja ? J.susunJurnal(t, cfg).length : 0;
  var ket = !sel ? '⏳ belum diisi'
    : sel.jumlah >= total ? '✅ terisi (' + sel.waktu + ')'
    : '◐ baru ' + sel.jumlah + ' dari ' + total + ' kegiatan (' + sel.waktu + ') — akan dilanjutkan';
  stat.textContent = HARI[d.getDay()] + ', ' + d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) + ' — ' +
    (!kerja ? 'bukan hari kerja' : ket) +
    (st.tertunda ? ' · menunggu login SIMPEG untuk ' + st.tertunda.tanggal : '');
  var ol = document.getElementById('daftar'); ol.textContent = '';
  if (kerja) J.susunJurnal(t, cfg).forEach(function (k) {
    var li = el('li'); li.appendChild(el('div', 'jam', k.jamMulai + '–' + k.jamSelesai + ' · ' + k.volume + ' ' + k.satuan));
    li.appendChild(el('div', '', k.uraian)); ol.appendChild(li);
  });
  document.getElementById('tandai').textContent = sel ? 'Tandai belum' : 'Tandai sudah';
  var lg = document.getElementById('log'); lg.textContent = '';
  (st.log || []).slice(0, 25).forEach(function (l) { lg.appendChild(el('div', l.jenis, l.waktu + ' — ' + l.pesan)); });
}
function kirim(m) {
  document.getElementById('status').textContent = '⏳ Memproses… (tab SIMPEG dibuka di latar)';
  chrome.runtime.sendMessage(m, function (r) { tampil().then(function () { if (r) document.getElementById('status').textContent += ' — ' + r.pesan; }); });
}
document.querySelectorAll('[data-d]').forEach(function (b) {
  b.onclick = function () { tgl.value = J.addDays(J.iso(new Date()), +b.dataset.d); tampil(); };
});
tgl.onchange = tampil;
document.getElementById('isi').onclick = function () {
  var h = J.iso(new Date());
  if (J.dalamMasaTutup(h, cfg) && !confirm('Hari ini masa tutup SIMPEG (penarikan tukin). Penyimpanan kemungkinan ditolak. Tetap coba?')) return;
  if (Math.abs((new Date(tgl.value) - new Date(h)) / 864e5) > 1 && !confirm('SIMPEG biasanya hanya menerima H-1, H, H+1. Tetap coba?')) return;
  kirim({ aksi: 'isi', tanggal: tgl.value });
};
document.getElementById('uji').onclick = function () { kirim({ aksi: 'isi', tanggal: tgl.value, uji: true, paksa: true }); };
document.getElementById('tandai').onclick = async function () {
  var st = await chrome.storage.local.get('selesai');
  chrome.runtime.sendMessage({ aksi: 'tandai', tanggal: tgl.value, selesai: !(st.selesai || {})[tgl.value] }, tampil);
};
document.getElementById('perbarui').onclick = function () {
  document.getElementById('status').textContent = '⏳ Mengambil data terbaru dari GitHub…';
  chrome.runtime.sendMessage({ aksi: 'perbarui' }, function (r) { muat(); if (r) document.getElementById('status').textContent = r.ok ? '✅ Data terbaru v' + r.versi + ' (' + r.jumlah + ' kegiatan)' : '⚠️ Gagal: ' + r.pesan; });
};
document.getElementById('buka').onclick = function () { chrome.runtime.sendMessage({ aksi: 'bukaSimpeg' }); window.close(); };
document.getElementById('opsi').onclick = function () { chrome.runtime.openOptionsPage(); };
chrome.storage.onChanged.addListener(function () { tampil(); });
muat();
