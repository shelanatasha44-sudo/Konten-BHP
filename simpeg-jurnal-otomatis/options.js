var J = self.JurnalBHP;
var PERAN = { tanggal: 'Tanggal', jamMulai: 'Jam mulai', jamSelesai: 'Jam selesai', uraian: 'Uraian kegiatan', output: 'Output/hasil', volume: 'Volume/jumlah', satuan: 'Satuan', keterangan: 'Keterangan', skp: 'Dropdown SKP' };
var $ = function (id) { return document.getElementById(id); };
var wadah = $('selektor');
Object.keys(PERAN).forEach(function (k) {
  var d = document.createElement('div');
  var l = document.createElement('label'); l.textContent = PERAN[k];
  var i = document.createElement('input'); i.type = 'text'; i.id = 'sel_' + k; i.placeholder = 'otomatis';
  d.appendChild(l); d.appendChild(i); wadah.appendChild(d);
});

chrome.storage.sync.get('cfg', function (s) {
  var c = Object.assign({}, J.DEFAULTS, s.cfg || {});
  ['url', 'formatTanggal', 'tombolTambah', 'tombolSimpan', 'jedaMs', 'jam', 'jumlahMin', 'jumlahMax', 'nilaiSkp'].forEach(function (k) { $(k).value = c[k]; });
  ['aktif', 'simpanOtomatis', 'isiKemarin'].forEach(function (k) { $(k).checked = !!c[k]; });
  $('libur').value = (c.libur || []).join('\n');
  $('kunjungan').value = (c.kunjungan || []).map(function (k) { return [k.mulai, k.selesai, k.kota].join(','); }).join('\n');
  $('kegiatanTambahan').value = (c.kegiatanTambahan || []).map(function (k) { return [k.u, k.o, k.s, k.vol.join('-')].join(' | '); }).join('\n');
  Object.keys(PERAN).forEach(function (k) { $('sel_' + k).value = (c.selectors || {})[k] || ''; });
});

$('simpan').onclick = async function () {
  var url = $('url').value.trim();
  if (url) {
    // minta izin bila SIMPEG di luar domain kemenkum/kemenkumham
    var asal = new URL(url).origin + '/*';
    if (!/kemenkum(ham)?\.go\.id$/.test(new URL(url).hostname)) {
      var ok = await chrome.permissions.request({ origins: [asal] });
      if (!ok) { $('pesan').textContent = 'Izin akses ke ' + asal + ' ditolak.'; return; }
    }
  }
  var baris = function (id) { return $(id).value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); };
  var cfg = {
    url: url, formatTanggal: $('formatTanggal').value, tombolTambah: $('tombolTambah').value.trim(), tombolSimpan: $('tombolSimpan').value.trim(),
    jedaMs: +$('jedaMs').value || 2500, jam: $('jam').value || '08:15',
    jumlahMin: Math.min(4, Math.max(1, +$('jumlahMin').value || 3)), jumlahMax: Math.min(4, Math.max(1, +$('jumlahMax').value || 4)),
    aktif: $('aktif').checked, simpanOtomatis: $('simpanOtomatis').checked, isiKemarin: $('isiKemarin').checked,
    nilaiSkp: $('nilaiSkp').value.trim(),
    libur: baris('libur').filter(function (x) { return /^\d{4}-\d{2}-\d{2}$/.test(x); }),
    kunjungan: baris('kunjungan').map(function (x) { var p = x.split(',').map(function (y) { return y.trim(); }); return { mulai: p[0], selesai: p[1] || p[0], kota: p[2] || 'Batam' }; }),
    kegiatanTambahan: baris('kegiatanTambahan').map(function (x) {
      var p = x.split('|').map(function (y) { return y.trim(); }); var v = (p[3] || '1-1').split('-');
      return { u: p[0], o: p[1] || '', s: p[2] || 'Kegiatan', vol: [+v[0] || 1, +(v[1] || v[0]) || 1] };
    }),
    selectors: {}
  };
  Object.keys(PERAN).forEach(function (k) { cfg.selectors[k] = $('sel_' + k).value.trim(); });
  chrome.storage.sync.set({ cfg: cfg }, function () { $('pesan').textContent = '✓ Tersimpan ' + new Date().toLocaleTimeString('id-ID'); });
};
