/* Fungsi ini disuntikkan ke halaman SIMPEG (chrome.scripting, world MAIN) untuk
 * mengisi SATU kegiatan. Harus mandiri (tidak boleh memakai variabel dari luar).
 * Hasil: { ok, login?, pesan, terdeteksi: {peran: deskripsi kolom} }
 */
async function simpegIsiSatuKegiatan(entri, cfg) {
  var tidur = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var tampak = function (el) {
    if (!el || el.disabled) return false;
    var s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') {
      // select2/chosen menyembunyikan <select> aslinya — tetap dianggap tampak bila ada pembungkusnya
      return el.tagName === 'SELECT' && !!(el.nextElementSibling && /select2|chosen/.test(el.nextElementSibling.className || ''));
    }
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  };
  var teks = function (el) { return (el && (el.innerText || el.value || el.textContent) || '').trim(); };

  function cariTombol(akar, pola) {
    var calon = akar.querySelectorAll('button, a, input[type=submit], input[type=button], [role=button]');
    for (var i = 0; i < calon.length; i++) {
      var t = (teks(calon[i]) + ' ' + (calon[i].title || '') + ' ' + (calon[i].getAttribute('aria-label') || '')).trim();
      if (tampak(calon[i]) && pola.test(t)) return calon[i];
    }
    return null;
  }

  function wadahAktif() {
    var modal = Array.prototype.slice.call(document.querySelectorAll('.modal.show, .modal.in, .modal[style*="display: block"], [role=dialog]'))
      .filter(function (m) { return tampak(m) && m.querySelector('input, textarea, select'); });
    return modal[modal.length - 1] || document;
  }

  // 1) Halaman login?
  var pw = document.querySelector('input[type=password]');
  if (pw && tampak(pw)) return { ok: false, login: true, pesan: 'Halaman login SIMPEG — silakan login dulu.' };

  // 2) Buka form (tombol Tambah) bila perlu
  var polaTambah = cfg.tombolTambah ? new RegExp(cfg.tombolTambah, 'i') : /^\s*(\+\s*)?(tambah|input|isi|buat)\b.*(jurnal|kegiatan|aktivitas|harian)?/i;
  var akar = wadahAktif();
  var adaTextarea = akar.querySelector('textarea');
  if (cfg.tombolTambah || !adaTextarea || !tampak(adaTextarea)) {
    var tb = cariTombol(document, polaTambah);
    if (tb) { tb.click(); await tidur(1500); akar = wadahAktif(); }
  }

  // 3) Deteksi kolom
  function deskripsi(el) {
    var bag = [el.name, el.id, el.placeholder, el.getAttribute('aria-label'), el.title, el.className];
    if (el.id) { var lb = document.querySelector('label[for="' + CSS.escape(el.id) + '"]'); if (lb) bag.push(teks(lb)); }
    var lbl = el.closest('label'); if (lbl) bag.push(teks(lbl));
    var grup = el.closest('.form-group, .mb-3, .form-row, .input-group, tr') || el.parentElement;
    if (grup && grup.classList.contains('input-group')) grup = grup.parentElement;
    if (grup) { var l2 = grup.querySelector('label, th, .control-label, .form-label'); if (l2) bag.push(teks(l2)); }
    var prev = el.previousElementSibling; if (prev && /LABEL|SPAN|B|STRONG/.test(prev.tagName)) bag.push(teks(prev));
    return bag.filter(Boolean).join(' | ').toLowerCase();
  }
  var POLA = [
    ['jamMulai', /jam.{0,3}mulai|waktu.{0,3}mulai|mulai|start|jam_awal|jam.{0,3}awal|dari.{0,3}jam/],
    ['jamSelesai', /jam.{0,3}selesai|waktu.{0,3}selesai|selesai|akhir|end|sampai/],
    ['tanggal', /tanggal|tgl|date/],
    ['skp', /skp|rencana.{0,6}kinerja|rhk|indikator|butir/],
    ['output', /output|hasil|keluaran/],
    ['satuan', /satuan|unit/],
    ['volume', /volume|jumlah|kuantitas|qty|vol\b/],
    ['keterangan', /keterangan|catatan|ket\b/],
    ['uraian', /uraian|kegiatan|aktivitas|aktifitas|deskripsi|jurnal|pekerjaan|nama.{0,3}kegiatan/]
  ];
  var semua = Array.prototype.slice.call(akar.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=submit]):not([type=button]):not([type=file]):not([type=search]), textarea, select'))
    .filter(tampak);
  var peta = {}, dipakai = new Set(), terdeteksi = {};
  var sel = cfg.selectors || {};
  Object.keys(sel).forEach(function (k) {
    if (!sel[k]) return;
    var el = document.querySelector(sel[k]);
    if (el) { peta[k] = el; dipakai.add(el); }
  });
  POLA.forEach(function (p) {
    if (peta[p[0]]) return;
    var calon = semua.filter(function (el) { return !dipakai.has(el) && p[1].test(deskripsi(el)); });
    if (p[0] === 'uraian') calon.sort(function (a, b) { return (b.tagName === 'TEXTAREA') - (a.tagName === 'TEXTAREA'); });
    if (p[0] === 'tanggal') calon = calon.filter(function (el) { return el.type !== 'time'; });
    if (calon[0]) { peta[p[0]] = calon[0]; dipakai.add(calon[0]); }
  });
  // cadangan: textarea pertama yang belum dipakai = uraian; input type=time berurutan = jam
  if (!peta.uraian) { var ta = semua.filter(function (e) { return e.tagName === 'TEXTAREA' && !dipakai.has(e); })[0]; if (ta) { peta.uraian = ta; dipakai.add(ta); } }
  var waktu = semua.filter(function (e) { return e.type === 'time' && !dipakai.has(e); });
  if (!peta.jamMulai && waktu[0]) { peta.jamMulai = waktu.shift(); dipakai.add(peta.jamMulai); }
  if (!peta.jamSelesai && waktu[0]) { peta.jamSelesai = waktu.shift(); dipakai.add(peta.jamSelesai); }

  Object.keys(peta).forEach(function (k) { terdeteksi[k] = (peta[k].tagName.toLowerCase() + (peta[k].name ? '[name=' + peta[k].name + ']' : peta[k].id ? '#' + peta[k].id : '')); });
  if (!peta.uraian) {
    return { ok: false, pesan: 'Kolom uraian kegiatan tidak ditemukan. Isi selektor di Pengaturan.', terdeteksi: terdeteksi,
      kolomHalaman: semua.slice(0, 25).map(function (e) { return e.tagName.toLowerCase() + ' ' + deskripsi(e).slice(0, 80); }) };
  }

  // 4) Isi nilai
  function setNilai(el, nilai) {
    if (nilai == null || nilai === '') return;
    var $ = window.jQuery;
    if (el.tagName === 'SELECT') {
      var opsi = Array.prototype.slice.call(el.options);
      var cocok = opsi.filter(function (o) { return o.value && teks(o).toLowerCase() === String(nilai).toLowerCase(); })[0] ||
        opsi.filter(function (o) { return o.value && teks(o).toLowerCase().indexOf(String(nilai).toLowerCase()) >= 0; })[0] ||
        opsi.filter(function (o) { return o.value && String(nilai).toLowerCase().indexOf(teks(o).toLowerCase()) >= 0 && teks(o).length > 2; })[0] ||
        opsi.filter(function (o) { return o.value && !/pilih|--/i.test(teks(o)); })[0];
      if (cocok) { el.value = cocok.value; }
    } else {
      var proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, nilai);
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
    if ($) { try { $(el).val(el.value).trigger('change'); } catch (e) { /* abaikan */ } }
  }
  function nilaiTanggal(el) {
    if (el.type === 'date') return entri.tanggal;
    if (el.type === 'datetime-local') return entri.tanggal + 'T' + entri.jamMulai;
    var p = entri.tanggal.split('-');
    return (cfg.formatTanggal || 'dd-mm-yyyy').replace('yyyy', p[0]).replace('mm', p[1]).replace('dd', p[2]);
  }
  var nilai = {
    tanggal: peta.tanggal && nilaiTanggal(peta.tanggal),
    jamMulai: entri.jamMulai, jamSelesai: entri.jamSelesai,
    skp: cfg.nilaiSkp || '', uraian: entri.uraian, output: entri.output,
    satuan: entri.satuan, volume: entri.volume, keterangan: entri.keterangan
  };
  // tanggal dulu (beberapa form memuat ulang isian setelah tanggal berubah)
  if (peta.tanggal) { setNilai(peta.tanggal, nilai.tanggal); await tidur(400); }
  ['skp', 'jamMulai', 'jamSelesai', 'uraian', 'output', 'volume', 'satuan', 'keterangan'].forEach(function (k) {
    if (peta[k]) setNilai(peta[k], nilai[k]);
  });
  await tidur(300);

  if (!cfg.simpanOtomatis) return { ok: true, uji: true, pesan: 'Form terisi (mode uji, tidak disimpan).', terdeteksi: terdeteksi };

  // 5) Simpan
  var form = peta.uraian.closest('form');
  var polaSimpan = cfg.tombolSimpan ? new RegExp(cfg.tombolSimpan, 'i') : /^\s*(simpan|save|kirim|submit|tambahkan)\b/i;
  var tombol = cariTombol(form || akar, polaSimpan) || cariTombol(akar, polaSimpan) ||
    (form && form.querySelector('button[type=submit], input[type=submit]'));
  if (!tombol) return { ok: false, pesan: 'Tombol Simpan tidak ditemukan. Isi teks tombol simpan di Pengaturan.', terdeteksi: terdeteksi };
  tombol.click();
  await tidur(1200);
  // konfirmasi SweetAlert / bootbox
  var konfirm = document.querySelector('.swal2-confirm, .swal-button--confirm, .bootbox-accept, .modal.show .btn-primary.confirm');
  if (konfirm && tampak(konfirm) && /ya|ok|simpan|yes|lanjut/i.test(teks(konfirm))) { konfirm.click(); await tidur(1200); }
  var galat = document.querySelector('.swal2-icon-error, .alert-danger, .invalid-feedback[style*="block"], .is-invalid');
  if (galat && tampak(galat)) {
    var pesanGalat = teks(document.querySelector('.swal2-html-container, .alert-danger, .invalid-feedback') || galat);
    return { ok: false, pesan: 'SIMPEG menolak: ' + (pesanGalat || 'ada kolom tidak valid'), terdeteksi: terdeteksi };
  }
  var okBtn = document.querySelector('.swal2-confirm, .swal-button');
  if (okBtn && tampak(okBtn)) okBtn.click();
  return { ok: true, pesan: 'Tersimpan', terdeteksi: terdeteksi };
}
