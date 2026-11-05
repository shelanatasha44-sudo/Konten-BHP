var J = self.JurnalBHP;
var tgl = document.getElementById('tgl');
var cfg = J.DEFAULTS;
var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'];

function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }

async function muat() {
  var s = await chrome.storage.sync.get('cfg');
  cfg = Object.assign({}, J.DEFAULTS, s.cfg || {});
  var ls = await chrome.storage.local.get('sesi');
  var sesi = ls.sesi
    ? (ls.sesi.habis ? '🔴 Sesi SIMPEG habis — login sekali, lalu isian lanjut sendiri' : '🟢 SIMPEG masih login (dicek ' + ls.sesi.cek + ')')
    : '⚪ Status sesi belum dicek — buka SIMPEG sekali';
  document.getElementById('info').innerHTML =
    (cfg.aktif ? '⏰ Otomatis Senin–Jumat pukul ' + cfg.jam : '⏸ Otomatis dimatikan') +
    (cfg.simpanOtomatis ? '' : ' · mode uji (tidak menyimpan)') + '<br>' + sesi;
  if (!tgl.value) tgl.value = J.iso(new Date());
  tampil();
}
async function tampil() {
  var t = tgl.value, d = new Date(t + 'T00:00');
  var st = await chrome.storage.local.get(['selesai', 'log', 'tertunda']);
  var sel = (st.selesai || {})[t];
  var stat = document.getElementById('status');
  var kerja = J.hariKerja(t, cfg);
  stat.textContent = HARI[d.getDay()] + ', ' + d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) + ' — ' +
    (!kerja ? 'bukan hari kerja' : sel ? '✅ terisi (' + sel.waktu + ')' : '⏳ belum diisi') +
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
  if (Math.abs((new Date(tgl.value) - new Date(h)) / 864e5) > 1 && !confirm('SIMPEG biasanya hanya menerima H-1, H, H+1. Tetap coba?')) return;
  kirim({ aksi: 'isi', tanggal: tgl.value });
};
document.getElementById('uji').onclick = function () { kirim({ aksi: 'isi', tanggal: tgl.value, uji: true, paksa: true }); };
document.getElementById('tandai').onclick = async function () {
  var st = await chrome.storage.local.get('selesai');
  chrome.runtime.sendMessage({ aksi: 'tandai', tanggal: tgl.value, selesai: !(st.selesai || {})[tgl.value] }, tampil);
};
document.getElementById('opsi').onclick = function () { chrome.runtime.openOptionsPage(); };
chrome.storage.onChanged.addListener(function () { tampil(); });
muat();
