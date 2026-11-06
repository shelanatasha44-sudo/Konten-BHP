/* Fungsi-fungsi ini disuntikkan ke halaman SIMPEG Jurnal Harian
 * (https://simpeg.kemenkum.go.id/devp/siap/skp_journal.php) lewat chrome.scripting (world MAIN).
 * Masing-masing harus mandiri (tidak memakai variabel dari luar).
 *
 * Form asli (Nov 2026): kotak tanggal di atas tabel (dd-mm-yyyy) → tombol "Tambah" → modal "Jurnal Harian":
 *   Waktu: Jam Mulai [jam]:[menit]  Jam Selesai [jam]:[menit]   (4 dropdown)
 *   SKP Tahunan/Tugas Tambahan/Kreatifitas (dropdown: butir SKP, Lain-Lain, Tugas Tambahan, Kreatifitas)
 *   Kegiatan (textarea) · Jumlah Diselesaikan · Satuan · Biaya → tombol "Simpan".
 */

/** Pilih tanggal jurnal di kotak tanggal halaman. Hasil: { ok, login?, berubah, nilai } */
function simpegPilihTanggal(tglDdMmYyyy) {
  var tampak = function (el) { return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length)); };
  var pw = document.querySelector('input[type=password]');
  if (pw && tampak(pw)) return { ok: false, login: true, pesan: 'Halaman login SIMPEG — silakan login dulu.' };
  var calon = Array.prototype.slice.call(document.querySelectorAll('input')).filter(function (el) {
    return !el.closest('.modal, [role=dialog]') && /^\d{2}[-\/]\d{2}[-\/]\d{4}$/.test((el.value || '').trim());
  });
  var el = calon[0];
  if (!el) return { ok: false, pesan: 'Kotak tanggal jurnal (dd-mm-yyyy) tidak ditemukan di halaman ' + location.pathname + '.' };
  if (el.value.trim() === tglDdMmYyyy) return { ok: true, berubah: false, nilai: el.value };
  var $ = window.jQuery;
  try { if ($ && $(el).data('datepicker')) $(el).datepicker('setDate', tglDdMmYyyy); } catch (e) { /* abaikan */ }
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, tglDdMmYyyy);
  ['input', 'change', 'blur'].forEach(function (t) { el.dispatchEvent(new Event(t, { bubbles: true })); });
  if ($) { try { $(el).trigger('change').trigger('changeDate'); } catch (e) { /* abaikan */ } }
  // bila kotak tanggal ada di form dengan tombol tampil/cari, kirim formnya
  var f = el.form;
  if (f) {
    var b = f.querySelector('button[type=submit], input[type=submit]');
    if (b) b.click();
  }
  return { ok: true, berubah: true, nilai: tglDdMmYyyy };
}

/** Tambah satu kegiatan. Hasil: { ok, login?, lewati?, uji?, pesan } */
async function simpegIsiSatuKegiatan(entri, cfg) {
  var tidur = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var tampak = function (el) { return !!(el && !el.disabled && (el.offsetWidth || el.offsetHeight || el.getClientRects().length)); };
  var teks = function (el) { return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim(); };
  var norm = function (s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); };
  var p = entri.tanggal.split('-'), tglTampil = p[2] + '-' + p[1] + '-' + p[0];

  var pw = document.querySelector('input[type=password]');
  if (pw && tampak(pw)) return { ok: false, login: true, pesan: 'Halaman login SIMPEG — silakan login dulu.' };

  // 1) pastikan tanggal halaman = tanggal jurnal
  var kotakTgl = Array.prototype.slice.call(document.querySelectorAll('input')).filter(function (el) {
    return !el.closest('.modal, [role=dialog]') && /^\d{2}[-\/]\d{2}[-\/]\d{4}$/.test((el.value || '').trim());
  })[0];
  if (kotakTgl && kotakTgl.value.trim() !== tglTampil) {
    return { ok: false, perluTanggal: true, pesan: 'Tanggal halaman ' + kotakTgl.value + ' belum berubah ke ' + tglTampil + '.' };
  }

  // 2) cegah dobel: kegiatan yang sama sudah ada di tabel
  var sel = Array.prototype.slice.call(document.querySelectorAll('table td'));
  if (sel.some(function (td) { return norm(teks(td)) === norm(entri.uraian); })) {
    return { ok: true, lewati: true, pesan: 'Sudah ada, dilewati.' };
  }

  // 3) buka modal lewat tombol "Tambah"
  function cariTombol(akar, pola) {
    var c = akar.querySelectorAll('button, a, input[type=submit], input[type=button]');
    for (var i = 0; i < c.length; i++) { var t = teks(c[i]) || c[i].value || ''; if (tampak(c[i]) && pola.test(t)) return c[i]; }
    return null;
  }
  function modalAktif() {
    var ta = Array.prototype.slice.call(document.querySelectorAll('textarea')).filter(tampak)[0];
    return ta ? (ta.closest('.modal, [role=dialog], form') || document) : null;
  }
  var modal = modalAktif();
  if (!modal) {
    var tb = cariTombol(document, new RegExp(cfg.tombolTambah || '^\\s*Tambah\\s*$', 'i'));
    if (!tb) return { ok: false, pesan: 'Tombol "Tambah" tidak ditemukan.' };
    tb.click();
    for (var w = 0; w < 20 && !(modal = modalAktif()); w++) await tidur(250);
    if (!modal) return { ok: false, pesan: 'Form Jurnal Harian tidak muncul setelah klik Tambah.' };
    await tidur(400);
  }

  function setNilai(el, nilai) {
    if (el.tagName === 'SELECT') el.value = nilai;
    else Object.getOwnPropertyDescriptor(el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set.call(el, nilai);
    ['input', 'change', 'blur'].forEach(function (t) { el.dispatchEvent(new Event(t, { bubbles: true })); });
    if (window.jQuery) { try { window.jQuery(el).trigger('change'); } catch (e) { /* abaikan */ } }
  }
  function pilihOpsi(select, cocok) {
    var o = Array.prototype.slice.call(select.options).filter(cocok)[0];
    if (!o) return false;
    setNilai(select, o.value); return true;
  }

  // 4) jam & menit: 4 dropdown berisi angka, berurutan
  var selects = Array.prototype.slice.call(modal.querySelectorAll('select')).filter(tampak);
  var jamSel = selects.filter(function (s) {
    var o = Array.prototype.slice.call(s.options);
    return o.length >= 12 && o.filter(function (x) { return /^\d{1,2}$/.test(teks(x) || x.value); }).length >= o.length - 1;
  });
  if (jamSel.length < 4) return { ok: false, pesan: 'Dropdown jam/menit tidak lengkap (' + jamSel.length + '/4).' };
  var waktu = entri.jamMulai.split(':').concat(entri.jamSelesai.split(':'));
  for (var j = 0; j < 4; j++) {
    var target = +waktu[j];
    if (!pilihOpsi(jamSel[j], function (o) { return +(teks(o) || o.value) === target && /^\d/.test(teks(o) || o.value); })) {
      return { ok: false, pesan: 'Pilihan waktu ' + waktu[j] + ' tidak ada di dropdown.' };
    }
  }

  // 5) SKP: entri.skp (mis. "Lain-Lain") / pengaturan / butir SKP pertama
  var skpSel = selects.filter(function (s) { return jamSel.indexOf(s) < 0; })[0];
  if (skpSel) {
    var mau = norm(entri.skp || cfg.nilaiSkp || '');
    var ok = mau && pilihOpsi(skpSel, function (o) { return o.value && norm(teks(o)).indexOf(mau) >= 0; });
    if (!ok) pilihOpsi(skpSel, function (o) { return o.value !== '' && !/^(lain-lain|tugas tambahan|kreatifitas|kreativitas|-+|pilih)/i.test(teks(o)); });
    await tidur(400);
  }

  // 6) Kegiatan, Jumlah Diselesaikan, Satuan, Biaya
  var ta = Array.prototype.slice.call(modal.querySelectorAll('textarea')).filter(tampak)[0];
  setNilai(ta, entri.uraian);
  function labelDari(el) {
    var t = [el.name, el.id, el.placeholder].join(' ');
    var n = el.previousSibling, k = 0;
    while (n && k < 4) { t += ' ' + (n.textContent || ''); n = n.previousSibling; k++; }
    if (el.parentElement) { var l = el.parentElement.querySelector('label'); if (l) t += ' ' + teks(l); }
    if (el.id) { var lf = document.querySelector('label[for="' + el.id + '"]'); if (lf) t += ' ' + teks(lf); }
    return t.toLowerCase();
  }
  var masukan = Array.prototype.slice.call(modal.querySelectorAll('input')).filter(function (el) {
    return tampak(el) && !/^(hidden|file|checkbox|radio|submit|button)$/i.test(el.type);
  });
  var peta = {};
  masukan.forEach(function (el) {
    var l = labelDari(el);
    if (!peta.jumlah && /jumlah|diselesaikan|volume/.test(l)) peta.jumlah = el;
    else if (!peta.satuan && /satuan/.test(l)) peta.satuan = el;
    else if (!peta.biaya && /biaya/.test(l)) peta.biaya = el;
  });
  // cadangan urutan: Jumlah, Satuan, Biaya
  if (!peta.jumlah && masukan[0]) peta.jumlah = masukan[0];
  if (!peta.satuan && masukan[1]) peta.satuan = masukan[1];
  if (peta.jumlah) setNilai(peta.jumlah, entri.volume);
  if (peta.satuan) setNilai(peta.satuan, entri.satuan);
  if (peta.biaya) setNilai(peta.biaya, '0');
  await tidur(300);

  if (!cfg.simpanOtomatis) return { ok: true, uji: true, pesan: 'Form terisi (mode uji, tidak disimpan).' };

  // 7) Simpan — alert/confirm bawaan browser dijawab otomatis agar tidak macet
  window.__jurnalPesan = '';
  window.alert = function (m) { window.__jurnalPesan = String(m); };
  window.confirm = function (m) { window.__jurnalPesan = String(m); return true; };
  var simpan = cariTombol(modal.closest('.modal, [role=dialog]') || modal, new RegExp(cfg.tombolSimpan || '^\\s*Simpan\\s*$', 'i')) ||
    cariTombol(document, /^\s*Simpan\s*$/i);
  if (!simpan) return { ok: false, pesan: 'Tombol Simpan tidak ditemukan.' };
  simpan.click();
  await tidur(1800);
  var konfirm = document.querySelector('.swal2-confirm, .swal-button--confirm, .bootbox-accept');
  if (konfirm && tampak(konfirm)) { konfirm.click(); await tidur(1200); }
  var pesan = window.__jurnalPesan || teks(document.querySelector('.swal2-html-container, .swal2-title, .alert-danger'));
  if (/gagal|error|tidak (dapat|bisa|boleh)|wajib|harus|melebihi|sudah lewat|batas/i.test(pesan)) {
    return { ok: false, pesan: 'SIMPEG menolak: ' + pesan };
  }
  return { ok: true, pesan: 'Tersimpan' + (pesan ? ' (' + pesan + ')' : '') };
}

/** Cek halaman sekarang: login? sudah di Jurnal Harian? Hasil: { login, jurnal, path, judul } */
function simpegCekHalaman() {
  var tampak = function (el) { return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length)); };
  var teks = function (el) { return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim(); };
  var pw = document.querySelector('input[type=password]');
  if (pw && tampak(pw)) return { login: true, jurnal: false, path: location.pathname, judul: document.title };
  var judul = Array.prototype.slice.call(document.querySelectorAll('h1,h2,h3,h4,h5,b,strong,div,span,td'))
    .some(function (el) { return el.children.length === 0 && /^jurnal harian$/i.test(teks(el)) && tampak(el); });
  var tambah = Array.prototype.slice.call(document.querySelectorAll('button,a,input[type=button],input[type=submit]'))
    .some(function (el) { return tampak(el) && /^\s*tambah\s*$/i.test(teks(el) || el.value || ''); });
  var tgl = Array.prototype.slice.call(document.querySelectorAll('input')).some(function (el) {
    return !el.closest('.modal, [role=dialog]') && /^\d{2}[-\/]\d{2}[-\/]\d{4}$/.test((el.value || '').trim());
  });
  return { login: false, jurnal: !!(tambah && (judul || tgl)), adaTanggal: tgl, path: location.pathname, judul: document.title };
}

/** Klik menu "Jurnal Harian" (di halaman Kinerja/skp.php). Hasil: { ok, href } */
function simpegKlikMenuJurnal() {
  var tampak = function (el) { return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length)); };
  var teks = function (el) { return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim(); };
  var calon = Array.prototype.slice.call(document.querySelectorAll('a,button,li,td,div,span'))
    .filter(function (el) { return tampak(el) && /^jurnal harian$/i.test(teks(el)); });
  calon.sort(function (a, b) { return (b.tagName === 'A') - (a.tagName === 'A'); });
  var el = calon[0];
  if (!el) return { ok: false, pesan: 'Menu "Jurnal Harian" tidak ditemukan di ' + location.pathname };
  var a = el.closest('a') || el.querySelector('a') || el;
  var href = a.getAttribute && a.getAttribute('href');
  a.click();
  return { ok: true, href: href || '' };
}
