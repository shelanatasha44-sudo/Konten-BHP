/* Fungsi bersama untuk semua halaman */
const Umum = (() => {
  const KUNCI = 'esert-kode-pengelola';
  const kode = {
    ambil: () => { try { return localStorage.getItem(KUNCI) || ''; } catch (e) { return ''; } },
    simpan: (k) => { try { localStorage.setItem(KUNCI, k); } catch (e) {} },
    hapus: () => { try { localStorage.removeItem(KUNCI); } catch (e) {} },
  };

  async function api(jalur, opsi = {}) {
    const h = { 'content-type': 'application/json' };
    const k = kode.ambil();
    if (k) h['x-kode-pengelola'] = k;
    let r;
    try {
      r = await fetch(jalur, { method: opsi.method || 'GET', headers: h, body: opsi.body ? JSON.stringify(opsi.body) : undefined });
    } catch (e) {
      throw Object.assign(new Error('Koneksi internet bermasalah. Silakan coba lagi.'), { status: 0 });
    }
    let d = {};
    try { d = await r.json(); } catch (e) {}
    if (!r.ok || d.ok === false) throw Object.assign(new Error(d.pesan || 'Terjadi gangguan, silakan coba lagi.'), { status: r.status });
    return d;
  }

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const waktu = (iso, opsi) => {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleString('id-ID', Object.assign({ timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', year: 'numeric' }, opsi || {}));
  };
  const waktuJam = (iso) => waktu(iso, { hour: '2-digit', minute: '2-digit' }) + (iso ? ' WIB' : '');

  // datetime-local (WIB) <-> ISO
  const keIso = (v) => (v ? new Date(v + ':00+07:00').toISOString() : '');
  const dariIso = (iso) => (iso ? new Date(Date.parse(iso) + 7 * 3600e3).toISOString().slice(0, 16) : '');

  let tTimer;
  function toast(teks) {
    let el = document.querySelector('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = teks; el.classList.add('tampil');
    clearTimeout(tTimer); tTimer = setTimeout(() => el.classList.remove('tampil'), 2400);
  }

  async function salin(teks) {
    try { await navigator.clipboard.writeText(teks); toast('Tautan disalin'); }
    catch (e) { const t = document.createElement('textarea'); t.value = teks; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); toast('Tautan disalin'); }
  }

  const kodeBersih = (k) => String(k || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  return { api, esc, waktu, waktuJam, keIso, dariIso, toast, salin, kode, kodeBersih };
})();
