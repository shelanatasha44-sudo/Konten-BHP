// E-Sertifikat Kantor Wilayah Kementerian Hukum Sumatera Utara
// Cloudflare Worker + D1. Halaman statis ada di folder public.

const HURUF = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const BAWAAN = {
  desain: 'resmi',
  kop1: 'KEMENTERIAN HUKUM REPUBLIK INDONESIA',
  kop2: 'KANTOR WILAYAH SUMATERA UTARA',
  judulSertifikat: 'SERTIFIKAT',
  pembuka: 'diberikan kepada',
  kalimat: 'atas partisipasinya sebagai {peran} dalam',
  peran: 'Peserta',
  penyelenggara: 'Kantor Wilayah Kementerian Hukum Sumatera Utara',
  tampilQr: true,
  tampilKop: true,
  tampilJudul: true,
  buka: true,
};
const ISI_EMAIL = 'Yth. {nama},\n\nTerima kasih telah mengikuti {acara}. Bersama email ini kami kirimkan sertifikat elektronik Anda dengan nomor {nomor}.\n\nKeaslian sertifikat dapat diperiksa melalui {tautan}.\n\nSalam hormat,\n{pengirim}';

const json = (o, status = 200) => new Response(JSON.stringify(o), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});
const salah = (pesan, status = 400) => json({ ok: false, pesan }, status);

async function sha(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
const acak = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((x) => HURUF[x % HURUF.length]).join('');
const bersih = (s, max = 200) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const bersihTeks = (s, max = 3000) => String(s ?? '').replace(/\r/g, '').replace(/[\u0000-\u0009\u000b-\u001f]/g, ' ').slice(0, max);
const emailSah = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const hexSah = (w, c) => (/^#[0-9a-fA-F]{6}$/.test(w || '') ? w : c);
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------- kata sandi admin dan sesi masuk ----------
// Kata sandi tidak pernah ditulis di kode. Sumbernya: secret ADMIN_PASSWORD saat pemasangan,
// atau dibuat sendiri pada kunjungan pertama ke halaman admin, lalu disimpan sebagai hash PBKDF2.
const b64 = (u) => btoa(String.fromCharCode(...u));
const dariB64 = (t) => Uint8Array.from(atob(t), (c) => c.charCodeAt(0));
function samaWaktu(a, b) {
  if (a.length !== b.length) return false;
  let beda = 0;
  for (let i = 0; i < a.length; i++) beda |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return beda === 0;
}
async function turunan(sandi, garam, iter) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(sandi), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: garam, iterations: iter }, k, 256));
}
async function hashSandi(sandi) {
  const g = crypto.getRandomValues(new Uint8Array(16));
  return 'pbkdf2$100000$' + b64(g) + '$' + b64(await turunan(sandi, g, 100000));
}
async function cocokSandi(sandi, simpan) {
  const [, it, g, h] = String(simpan).split('$');
  return samaWaktu(b64(await turunan(sandi, dariB64(g), Number(it))), h);
}
async function ambilSandi(env) {
  const r = await env.DB.prepare("SELECT v FROM pengaturan WHERE k = 'sandiHash'").first();
  return r && r.v ? r.v : '';
}
async function periksaSandi(env, sandi) {
  const simpan = await ambilSandi(env);
  if (simpan) return cocokSandi(sandi, simpan);
  if (env.ADMIN_PASSWORD) return samaWaktu(await sha('s:' + sandi), await sha('s:' + env.ADMIN_PASSWORD));
  return false;
}
async function buatSesi(env) {
  const token = acak(40);
  const habis = new Date(Date.now() + 30 * 864e5).toISOString();
  await env.DB.prepare('INSERT INTO sesi (token, kadaluarsa) VALUES (?, ?)').bind(await sha('sesi:' + token), habis).run();
  return token;
}
async function pengelola(req, env) {
  const t = String(req.headers.get('x-sesi') || '').trim();
  if (!t) return false;
  const r = await env.DB.prepare('SELECT kadaluarsa FROM sesi WHERE token = ?').bind(await sha('sesi:' + t)).first();
  return !!(r && Date.parse(r.kadaluarsa) > Date.now());
}

// Isian tambahan daftar hadir yang diatur admin per kegiatan (misalnya nomor HP, jabatan, NIP).
const JENIS_ISIAN = ['teks', 'hp', 'angka', 'pilihan'];
const daftarPilihan = (x) => (Array.isArray(x) ? x : String(x || '').split(/\n|,/)).map((v) => bersih(v, 80)).filter(Boolean).slice(0, 40);
function rapikanIsian(daftar) {
  if (!Array.isArray(daftar)) return [];
  const sudah = new Set();
  return daftar.slice(0, 12).map((f) => {
    let id = String((f && f.id) || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
    if (!id || sudah.has(id) || id === 'nama' || id === 'email' || id === 'instansi') id = 'f' + acak(6).toLowerCase();
    sudah.add(id);
    const jenis = JENIS_ISIAN.includes(f && f.jenis) ? f.jenis : 'teks';
    return { id, label: bersih(f && f.label, 60), jenis, wajib: !!(f && f.wajib), pilihan: jenis === 'pilihan' ? daftarPilihan(f.pilihan) : [] };
  }).filter((f) => f.label && (f.jenis !== 'pilihan' || f.pilihan.length));
}
// Memeriksa jawaban peserta terhadap isian kegiatan. Mengembalikan { data } atau { galat }.
function periksaIsian(acara, masuk, longgar) {
  const data = {};
  const jawab = masuk && typeof masuk === 'object' ? masuk : {};
  for (const f of acara.isian || []) {
    const v = bersih(jawab[f.id], 150);
    if (!v) { if (f.wajib && !longgar) return { galat: f.label + ' wajib diisi.' }; continue; }
    if (f.jenis === 'hp' && !/^\+?[0-9][0-9\s-]{7,18}$/.test(v)) return { galat: f.label + ' belum benar. Tulis angka saja, misalnya 081234567890.' };
    if (f.jenis === 'angka' && !/^[0-9][0-9\s.]*$/.test(v)) return { galat: f.label + ' hanya boleh berisi angka.' };
    if (f.jenis === 'pilihan' && !f.pilihan.includes(v)) return { galat: 'Pilih ' + f.label + ' dari daftar.' };
    data[f.id] = v;
  }
  return { data };
}
function periksaInstansi(acara, v, longgar) {
  const mode = acara.instansiMode || 'opsional';
  if (mode === 'sembunyi') return { nilai: '' };
  if (!v && mode === 'wajib' && !longgar) return { galat: 'Instansi wajib diisi.' };
  if (v && (acara.instansiPilihan || []).length && !acara.instansiPilihan.includes(v) && !longgar) return { galat: 'Pilih instansi dari daftar.' };
  return { nilai: v };
}

const waktuSah = (s) => { if (!s) return ''; const d = new Date(s); return isNaN(d) ? '' : d.toISOString(); };

function rapikanAcara(masuk, lama = {}) {
  const m = { ...BAWAAN, ...lama, ...masuk };
  const ttd = Array.isArray(m.penandatangan) ? m.penandatangan.slice(0, 1).map((p) => ({
    jabatan: bersih(p && p.jabatan, 120),
    nama: bersih(p && p.nama, 90),
    nip: bersih(p && p.nip, 40),
  })).filter((p) => p.nama || p.jabatan) : [];
  return {
    judul: bersih(m.judul, 160),
    tema: bersih(m.tema, 200),
    tanggal: bersih(m.tanggal, 80),
    tempat: bersih(m.tempat, 120),
    penyelenggara: bersih(m.penyelenggara, 120),
    desain: ['resmi', 'gading', 'sendiri'].includes(m.desain) ? m.desain : 'resmi',
    warnaTeks: hexSah(m.warnaTeks, '#1F2A5A'),
    warnaAksen: hexSah(m.warnaAksen, '#B8923A'),
    tampilKop: m.tampilKop !== false,
    tampilJudul: m.tampilJudul !== false,
    latarVersi: Number(lama.latarVersi || 0),
    kop1: bersih(m.kop1, 80),
    kop2: bersih(m.kop2, 80),
    judulSertifikat: bersih(m.judulSertifikat, 30) || 'SERTIFIKAT',
    pembuka: bersih(m.pembuka, 80),
    kalimat: bersih(m.kalimat, 120),
    peran: bersih(m.peran, 40) || 'Peserta',
    formatNomor: bersih(m.formatNomor, 60),
    tempatTanggal: bersih(m.tempatTanggal, 80),
    tampilQr: m.tampilQr !== false,
    kirimEmail: m.kirimEmail !== false,
    buka: m.buka !== false,
    mulai: waktuSah(m.mulai),
    sampai: waktuSah(m.sampai),
    penandatangan: ttd,
    isian: rapikanIsian(m.isian),
    instansiMode: ['opsional', 'wajib', 'sembunyi'].includes(m.instansiMode) ? m.instansiMode : 'opsional',
    instansiPilihan: daftarPilihan(m.instansiPilihan),
  };
}

// Tabel database dibuat otomatis saat pertama kali dipakai.
const SKEMA = [
  'CREATE TABLE IF NOT EXISTS acara (id TEXT PRIMARY KEY, data TEXT NOT NULL, dibuat TEXT NOT NULL, diubah TEXT NOT NULL)',
  `CREATE TABLE IF NOT EXISTS peserta (acara TEXT NOT NULL, pk TEXT NOT NULL, urut INTEGER NOT NULL, nomor TEXT NOT NULL, kode TEXT NOT NULL UNIQUE,
    nama TEXT NOT NULL, email TEXT, instansi TEXT, peran TEXT, status TEXT NOT NULL DEFAULT 'sah', sumber TEXT, waktu TEXT NOT NULL,
    email_status TEXT, email_waktu TEXT, PRIMARY KEY (acara, pk), UNIQUE (acara, urut))`,
  'CREATE INDEX IF NOT EXISTS idx_peserta_urut ON peserta (acara, urut)',
  'CREATE TABLE IF NOT EXISTS latar (acara TEXT PRIMARY KEY, data TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS pengaturan (k TEXT PRIMARY KEY, v TEXT)',
  'CREATE TABLE IF NOT EXISTS sesi (token TEXT PRIMARY KEY, kadaluarsa TEXT NOT NULL)',
];
let dbSiap = null;
function siapkanDb(env) {
  if (!dbSiap) {
    dbSiap = env.DB.batch(SKEMA.map((q) => env.DB.prepare(q)))
      .then(() => env.DB.prepare('ALTER TABLE peserta ADD COLUMN data TEXT').run().catch((e) => {
        if (!/duplicate column/i.test(String(e && e.message))) throw e;
      }))
      .catch((e) => { dbSiap = null; throw e; });
  }
  return dbSiap;
}

async function ambilAcara(env, id) {
  const r = await env.DB.prepare('SELECT data, dibuat FROM acara WHERE id = ?').bind(id).first();
  return r ? { id, ...JSON.parse(r.data), dibuat: r.dibuat } : null;
}

async function ambilPengaturan(env) {
  const { results } = await env.DB.prepare('SELECT k, v FROM pengaturan').all();
  const o = {};
  for (const r of results) o[r.k] = r.v;
  return o;
}

const untukPeserta = (r) => ({ pk: r.pk, nama: r.nama, nomor: r.nomor, kode: r.kode, peran: r.peran, status: r.status, waktu: r.waktu, email_status: r.email_status });

// Menerbitkan sertifikat. Nomor urut dihitung di dalam satu perintah SQL sehingga tidak bisa kembar.
async function terbitkan(env, acara, d) {
  const lama = await env.DB.prepare('SELECT * FROM peserta WHERE acara = ? AND pk = ?').bind(acara.id, d.pk).first();
  if (lama) return { rec: lama, ulang: true };
  const pola = acara.formatNomor || '';
  for (let i = 0; i < 5; i++) {
    const kode = acak(10);
    try {
      await env.DB.prepare(
        `INSERT INTO peserta (acara, pk, urut, nomor, kode, nama, email, instansi, peran, status, sumber, waktu, data)
         SELECT ?1, ?2, n, replace(?3, '{n}', printf('%03d', n)), ?4, ?5, ?6, ?7, ?8, 'sah', ?9, ?10, ?11
         FROM (SELECT COALESCE(MAX(urut), 0) + 1 AS n FROM peserta WHERE acara = ?1) WHERE true
         ON CONFLICT (acara, pk) DO NOTHING`
      ).bind(acara.id, d.pk, pola, kode, d.nama, d.email || '', d.instansi || '', d.peran || acara.peran || 'Peserta', d.sumber || 'hadir', new Date().toISOString(), JSON.stringify(d.data || {})).run();
      break;
    } catch (e) {
      if (!/UNIQUE/i.test(String(e && e.message))) throw e;
    }
  }
  const rec = await env.DB.prepare('SELECT * FROM peserta WHERE acara = ? AND pk = ?').bind(acara.id, d.pk).first();
  if (!rec) throw new Error('Sertifikat gagal diterbitkan, silakan coba lagi.');
  return { rec, ulang: false };
}

// ---------- email lewat Google Apps Script milik panitia ----------
const NAMA_KANWIL = 'Kantor Wilayah Kementerian Hukum Sumatera Utara';
function isiEmail(atur, acara, rec, asal, susulan) {
  const tautan = asal + '/v/' + rec.kode + (susulan ? '?unduh=1' : '');
  const pengirim = atur.namaPengirim || acara.penyelenggara || NAMA_KANWIL;
  const ganti = (s) => String(s || '').replace(/\{nama\}/g, rec.nama).replace(/\{acara\}/g, acara.judul).replace(/\{nomor\}/g, rec.nomor)
    .replace(/\{tautan\}/g, tautan).replace(/\{pengirim\}/g, pengirim);
  let isi = atur.isi || ISI_EMAIL;
  if (!rec.nomor) isi = isi.replace(/\s*dengan nomor \{nomor\}/g, '');
  let teks = ganti(isi);
  // tautan cek keaslian selalu ikut, walaupun isi email diubah panitia
  if (!teks.includes(tautan)) teks += '\n\nCek keaslian sertifikat: ' + tautan;
  if (susulan) teks += '\n\nBerkas PDF sertifikat dapat diunduh melalui tautan di atas.';
  const subjek = ganti(atur.subjek || 'E-Sertifikat {acara}');
  const html = `<div style="background:#F4F1EA;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #E7E1D3">
    <div style="background:#1F2A5A;padding:22px 26px;text-align:center">
      <img src="${asal}/img/logo.png" width="44" alt="" style="display:block;margin:0 auto 10px">
      <div style="color:#E3C77A;font-size:11px;letter-spacing:3px;font-weight:bold">SERTIFIKAT ELEKTRONIK</div>
      <div style="color:#ffffff;font-size:16px;font-weight:bold;margin-top:6px;line-height:1.35">${esc(acara.judul)}</div>
    </div>
    <div style="padding:24px 26px;color:#1F2A44;font-size:15px;line-height:1.7">${esc(teks).replace(/\n/g, '<br>')}
      <div style="text-align:center;margin:22px 0 6px"><a href="${tautan}" style="display:inline-block;background:#C9A13B;color:#1F2A44;text-decoration:none;font-weight:bold;padding:11px 22px;border-radius:10px">${susulan ? 'Unduh dan Cek Keaslian Sertifikat' : 'Cek Keaslian Sertifikat'}</a></div>
    </div>
    <div style="border-top:1px solid #E7E1D3;padding:14px 26px;color:#6B7490;font-size:12px;text-align:center">${esc(pengirim)}</div>
  </div></div>`;
  return { teks, subjek, html, pengirim };
}

async function kirimLewatMailer(atur, data) {
  if (!atur.mailerUrl || !atur.mailerKunci) throw new Error('Pengiriman email belum diatur oleh pengelola.');
  const r = await fetch(atur.mailerUrl, { method: 'POST', headers: { 'content-type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ kunci: atur.mailerKunci, ...data }) });
  let d = {};
  try { d = JSON.parse(await r.text()); } catch (e) { throw new Error('Layanan email tidak menjawab dengan benar. Periksa tautan Apps Script.'); }
  if (!d.ok) throw new Error(d.pesan === 'kunci tidak sesuai' ? 'Apps Script menolak karena kode pengaman berbeda. Buka Apps Script, jalankan fungsi aturUlang, lalu kirim uji lagi.' : 'Email gagal dikirim: ' + (d.pesan || 'tanpa keterangan'));
  return d;
}

async function api(req, env, url) {
  await siapkanDb(env);
  const p = url.pathname.replace(/\/+$/, '').split('/').slice(2); // ['acara', id, ...]
  const m = req.method;
  const admin = await pengelola(req, env);
  const badan = async () => { try { return await req.json(); } catch (e) { return {}; } };

  const simpanAtur = (k, v) => env.DB.prepare('INSERT INTO pengaturan (k, v) VALUES (?, ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v').bind(k, v);

  // ---- masuk admin ----
  if (p[0] === 'status-admin' && m === 'GET') {
    const perluDibuat = !(await ambilSandi(env)) && !env.ADMIN_PASSWORD;
    return json({ ok: true, perluDibuat, masuk: admin });
  }
  if (p[0] === 'masuk' && m === 'POST') {
    const b = await badan();
    const sandi = String(b.sandi || '');
    if (!sandi) return salah('Kata sandi wajib diisi.');
    if (!(await periksaSandi(env, sandi))) { await new Promise((r) => setTimeout(r, 600)); return salah('Kata sandi salah.', 401); }
    return json({ ok: true, sesi: await buatSesi(env) });
  }
  if (p[0] === 'keluar' && m === 'POST') {
    const t = String(req.headers.get('x-sesi') || '');
    if (t) await env.DB.prepare('DELETE FROM sesi WHERE token = ?').bind(await sha('sesi:' + t)).run();
    return json({ ok: true });
  }
  if (p[0] === 'sandi' && m === 'POST') {
    const b = await badan();
    const baru = String(b.baru || '');
    if (baru.length < 8) return salah('Kata sandi baru paling sedikit 8 karakter.');
    const belumAda = !(await ambilSandi(env)) && !env.ADMIN_PASSWORD;
    if (!belumAda) {
      if (!admin) return salah('Silakan masuk sebagai admin.', 401);
      if (!(await periksaSandi(env, String(b.lama || '')))) return salah('Kata sandi lama salah.', 401);
    }
    await simpanAtur('sandiHash', await hashSandi(baru)).run();
    await env.DB.prepare('DELETE FROM sesi').run();
    return json({ ok: true, sesi: await buatSesi(env) });
  }

  // ---- kegiatan aktif (ditampilkan di halaman utama) ----
  if (p[0] === 'aktif') {
    if (m === 'GET') {
      const atur = await ambilPengaturan(env);
      let a = atur.acaraAktif ? await ambilAcara(env, atur.acaraAktif) : null;
      if (!a) {
        const r = await env.DB.prepare('SELECT id FROM acara ORDER BY dibuat DESC LIMIT 1').first();
        a = r ? await ambilAcara(env, r.id) : null;
      }
      return json({ ok: true, acara: a });
    }
    if (m === 'PUT') {
      if (!admin) return salah('Silakan masuk sebagai admin.', 401);
      const b = await badan();
      if (!(await ambilAcara(env, String(b.id || '')))) return salah('Kegiatan tidak ditemukan.', 404);
      await simpanAtur('acaraAktif', String(b.id)).run();
      return json({ ok: true });
    }
  }

  // ---- acara ----
  if (p[0] === 'acara') {
    if (!p[1] && m === 'GET') {
      if (!admin) return salah('Silakan masuk sebagai admin.', 401);
      const { results } = await env.DB.prepare(
        `SELECT a.id, a.data, a.dibuat, (SELECT COUNT(*) FROM peserta p WHERE p.acara = a.id) AS jumlah
         FROM acara a ORDER BY a.dibuat DESC`).all();
      const atur = await ambilPengaturan(env);
      const aktif = atur.acaraAktif || (results[0] && results[0].id);
      return json({ ok: true, acara: results.map((r) => { const d = JSON.parse(r.data); return { id: r.id, judul: d.judul, tanggal: d.tanggal, tempat: d.tempat, buka: d.buka, desain: d.desain, dibuat: r.dibuat, jumlah: r.jumlah, aktif: r.id === aktif }; }) });
    }
    if (!p[1] && m === 'POST') {
      if (!admin) return salah('Silakan masuk sebagai admin.', 401);
      const data = rapikanAcara(await badan());
      if (!data.judul || !data.tanggal) return salah('Nama kegiatan dan tanggal wajib diisi.');
      const now = new Date().toISOString();
      for (let i = 0; i < 5; i++) {
        const id = acak(6);
        const r = await env.DB.prepare('INSERT OR IGNORE INTO acara (id, data, dibuat, diubah) VALUES (?, ?, ?, ?)').bind(id, JSON.stringify(data), now, now).run();
        if (r.meta.changes) { await simpanAtur('acaraAktif', id).run(); return json({ ok: true, id }); }
      }
      return salah('Gagal membuat acara.', 500);
    }
    if (p[1] && m === 'GET') {
      const a = await ambilAcara(env, p[1]);
      return a ? json({ ok: true, acara: a }) : salah('Acara tidak ditemukan.', 404);
    }
    if (p[1] && m === 'PUT') {
      if (!admin) return salah('Silakan masuk sebagai admin.', 401);
      const lama = await ambilAcara(env, p[1]);
      if (!lama) return salah('Acara tidak ditemukan.', 404);
      const data = rapikanAcara(await badan(), lama);
      if (!data.judul || !data.tanggal) return salah('Nama kegiatan dan tanggal wajib diisi.');
      await env.DB.prepare('UPDATE acara SET data = ?, diubah = ? WHERE id = ?').bind(JSON.stringify(data), new Date().toISOString(), p[1]).run();
      return json({ ok: true, id: p[1] });
    }
  }

  // ---- gambar latar desain sendiri (misalnya dari Canva) ----
  if (p[0] === 'latar' && p[1]) {
    if (m === 'GET') {
      const r = await env.DB.prepare('SELECT data FROM latar WHERE acara = ?').bind(p[1]).first();
      if (!r) return salah('Latar tidak ditemukan.', 404);
      const [kepala, isi] = r.data.split(',');
      const tipe = (kepala.match(/data:(image\/[a-z]+)/) || [])[1] || 'image/jpeg';
      const bin = Uint8Array.from(atob(isi), (c) => c.charCodeAt(0));
      return new Response(bin, { headers: { 'content-type': tipe, 'cache-control': 'public, max-age=31536000, immutable' } });
    }
    if (m === 'PUT') {
      if (!admin) return salah('Silakan masuk sebagai admin.', 401);
      const lama = await ambilAcara(env, p[1]);
      if (!lama) return salah('Acara tidak ditemukan.', 404);
      const b = await badan();
      if (typeof b.data !== 'string' || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(b.data) || b.data.length > 1900000) return salah('Gambar latar tidak sah atau terlalu besar.');
      await env.DB.prepare('INSERT INTO latar (acara, data) VALUES (?, ?) ON CONFLICT (acara) DO UPDATE SET data = excluded.data').bind(p[1], b.data).run();
      const data = { ...rapikanAcara({}, lama), latarVersi: Date.now() };
      await env.DB.prepare('UPDATE acara SET data = ?, diubah = ? WHERE id = ?').bind(JSON.stringify(data), new Date().toISOString(), p[1]).run();
      return json({ ok: true, latarVersi: data.latarVersi });
    }
  }

  // ---- pengaturan email (pengelola) ----
  if (p[0] === 'pengaturan') {
    if (!admin) return salah('Silakan masuk sebagai admin.', 401);
    const atur = await ambilPengaturan(env);
    if (!p[1] && m === 'GET') {
      return json({ ok: true, pengaturan: { mailerUrl: atur.mailerUrl || '', namaPengirim: atur.namaPengirim || '', subjek: atur.subjek || 'E-Sertifikat {acara}', isi: atur.isi || ISI_EMAIL, siap: !!(atur.mailerUrl && atur.mailerKunci) } });
    }
    if (!p[1] && m === 'PUT') {
      const b = await badan();
      const mailerUrl = bersih(b.mailerUrl, 300);
      if (mailerUrl && !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(mailerUrl)) return salah('Tautan harus berupa alamat Aplikasi web Apps Script yang berakhiran /exec.');
      const baru = { mailerUrl, namaPengirim: bersih(b.namaPengirim, 100), subjek: bersih(b.subjek, 150), isi: bersihTeks(b.isi, 3000) };
      // kunci dibuat sekali dan tidak pernah diganti, agar Apps Script lama maupun baru tetap menerima
      if (mailerUrl && !atur.mailerKunci) baru.mailerKunci = acak(32);
      baru.asal = url.origin;
      await env.DB.batch(Object.entries(baru).map(([k, v]) => env.DB.prepare('INSERT INTO pengaturan (k, v) VALUES (?, ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v').bind(k, v)));
      return json({ ok: true });
    }
    if (p[1] === 'uji' && m === 'POST') {
      const b = await badan();
      const ke = bersih(b.email, 120).toLowerCase();
      if (!emailSah(ke)) return salah('Alamat email uji belum benar.');
      const contoh = { nama: 'Nama Peserta', nomor: '001/SERT', kode: 'CONTOH0000' };
      const e = isiEmail(atur, { judul: 'Contoh Kegiatan', penyelenggara: BAWAAN.penyelenggara }, contoh, url.origin);
      try { const d = await kirimLewatMailer(atur, { to: ke, subject: '[Uji] ' + e.subjek, html: e.html, text: e.teks, nama: e.pengirim }); return json({ ok: true, sisa: d.sisa }); }
      catch (err) { return salah(err.message, 502); }
    }
  }

  // ---- kirim sertifikat PDF ke email peserta ----
  if (p[0] === 'kirim' && p[1] && p[2] && m === 'POST') {
    if (!admin) return salah('Pengiriman email hanya dapat dilakukan oleh admin.', 401);
    const acara = await ambilAcara(env, p[1]);
    if (!acara) return salah('Acara tidak ditemukan.', 404);
    const rec = await env.DB.prepare('SELECT * FROM peserta WHERE acara = ? AND kode = ?').bind(p[1], p[2].toUpperCase()).first();
    if (!rec || rec.status !== 'sah') return salah('Sertifikat tidak ditemukan.', 404);
    if (!rec.email) return salah('Peserta ini tidak memiliki email.');
    const atur = await ambilPengaturan(env);
    if (!atur.mailerUrl || !atur.mailerKunci) return json({ ok: true, lewati: true, email_status: 'belum diatur' });
    const b = await badan();
    if (typeof b.pdf !== 'string' || b.pdf.length > 4000000 || !b.pdf.startsWith('JVBER')) return salah('Berkas PDF tidak sah.');
    const e = isiEmail(atur, acara, rec, url.origin);
    try {
      await kirimLewatMailer(atur, { to: rec.email, subject: e.subjek, html: e.html, text: e.teks, nama: e.pengirim, pdf: b.pdf, namaBerkas: 'Sertifikat ' + rec.nama.replace(/[\\/:*?"<>|]+/g, ' ').replace(/[.\s]+$/, '').trim() + '.pdf' });
      await env.DB.prepare("UPDATE peserta SET email_status = 'terkirim', email_waktu = ? WHERE acara = ? AND pk = ?").bind(new Date().toISOString(), p[1], rec.pk).run();
      return json({ ok: true, email_status: 'terkirim' });
    } catch (err) {
      await env.DB.prepare("UPDATE peserta SET email_status = 'gagal', email_waktu = ? WHERE acara = ? AND pk = ?").bind(new Date().toISOString(), p[1], rec.pk).run();
      return salah(err.message, 502);
    }
  }

  // ---- daftar hadir (peserta mengisi sendiri) ----
  if (p[0] === 'hadir' && p[1] && m === 'POST') {
    const acara = await ambilAcara(env, p[1]);
    if (!acara) return salah('Acara tidak ditemukan.', 404);
    const now = Date.now();
    if (!acara.buka) return salah('Daftar hadir sudah ditutup oleh panitia.', 403);
    if (acara.mulai && now < Date.parse(acara.mulai)) return salah('Daftar hadir belum dibuka.', 403);
    if (acara.sampai && now > Date.parse(acara.sampai)) return salah('Daftar hadir sudah ditutup.', 403);
    const b = await badan();
    const nama = bersih(b.nama, 120), email = bersih(b.email, 120).toLowerCase();
    if (nama.length < 3) return salah('Nama lengkap wajib diisi.');
    if (!emailSah(email)) return salah('Alamat email belum benar.');
    const ins = periksaInstansi(acara, bersih(b.instansi, 120));
    if (ins.galat) return salah(ins.galat);
    const isi = periksaIsian(acara, b.isian);
    if (isi.galat) return salah(isi.galat);
    const pk = (await sha('email:' + email)).slice(0, 24);
    const { rec, ulang } = await terbitkan(env, acara, { pk, nama, email, instansi: ins.nilai, data: isi.data, sumber: 'hadir' });
    if (rec.status === 'dicabut') return salah('Sertifikat untuk email ini telah dibatalkan oleh panitia.', 403);
    const atur = await ambilPengaturan(env);
    if (atur.asal !== url.origin) await simpanAtur('asal', url.origin).run();
    return json({ ok: true, ulang, peserta: untukPeserta(rec) });
  }

  // ---- kelola peserta (pengelola) ----
  if (p[0] === 'peserta' && p[1]) {
    if (!admin) return salah('Silakan masuk sebagai admin.', 401);
    const acara = await ambilAcara(env, p[1]);
    if (!acara) return salah('Acara tidak ditemukan.', 404);
    if (!p[2] && m === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM peserta WHERE acara = ? ORDER BY urut').bind(p[1]).all();
      return json({ ok: true, peserta: results });
    }
    if (!p[2] && m === 'POST') {
      const b = await badan();
      const nama = bersih(b.nama, 120), email = bersih(b.email, 120).toLowerCase();
      if (nama.length < 3) return salah('Nama wajib diisi.');
      if (email && !emailSah(email)) return salah('Alamat email belum benar.');
      const pk = email ? (await sha('email:' + email)).slice(0, 24) : 'm' + acak(12).toLowerCase();
      const isi = periksaIsian(acara, b.isian, true);
      if (isi.galat) return salah(isi.galat);
      const { rec, ulang } = await terbitkan(env, acara, { pk, nama, email, instansi: bersih(b.instansi, 120), data: isi.data, peran: bersih(b.peran, 40) || acara.peran, sumber: 'manual' });
      return json({ ok: true, ulang, peserta: rec });
    }
    if (p[2] && m === 'PATCH') {
      const b = await badan();
      const rec = await env.DB.prepare('SELECT * FROM peserta WHERE acara = ? AND pk = ?').bind(p[1], p[2]).first();
      if (!rec) return salah('Peserta tidak ditemukan.', 404);
      const nama = b.nama !== undefined ? bersih(b.nama, 120) : rec.nama;
      if (nama.length < 3) return salah('Nama wajib diisi.');
      const peran = b.peran !== undefined ? (bersih(b.peran, 40) || rec.peran) : rec.peran;
      const instansi = b.instansi !== undefined ? bersih(b.instansi, 120) : rec.instansi;
      const status = ['sah', 'dicabut'].includes(b.status) ? b.status : rec.status;
      let data = rec.data || '{}';
      if (b.isian !== undefined) {
        const isi = periksaIsian(acara, b.isian, true);
        if (isi.galat) return salah(isi.galat);
        data = JSON.stringify(isi.data);
      }
      await env.DB.prepare('UPDATE peserta SET nama = ?, peran = ?, instansi = ?, status = ?, data = ? WHERE acara = ? AND pk = ?').bind(nama, peran, instansi, status, data, p[1], p[2]).run();
      return json({ ok: true, peserta: { ...rec, nama, peran, instansi, status, data } });
    }
  }

  // ---- verifikasi (publik) ----
  if (p[0] === 'verifikasi' && p[1] && m === 'GET') {
    const kode = p[1].toUpperCase().replace(/[^A-Z0-9]/g, '');
    const rec = kode.length === 10 ? await env.DB.prepare('SELECT * FROM peserta WHERE kode = ?').bind(kode).first() : null;
    if (!rec) return json({ ok: true, status: 'tidak' });
    const acara = await ambilAcara(env, rec.acara);
    return json({
      ok: true,
      status: rec.status === 'dicabut' ? 'dicabut' : 'sah',
      acaraId: rec.acara,
      sertifikat: { nama: rec.nama, nomor: rec.nomor, peran: rec.peran, instansi: rec.instansi, kode: rec.kode, terbit: rec.waktu },
      acara: acara ? { judul: acara.judul, tema: acara.tema, tanggal: acara.tanggal, tempat: acara.tempat, penyelenggara: acara.penyelenggara } : null,
    });
  }

  return salah('Alamat tidak dikenal.', 404);
}

export default {
  async scheduled(ev, env, ctx) {
    // email hanya dikirim oleh admin dari menu Peserta
  },
  async fetch(req, env) {
    const url = new URL(req.url);
    try {
      if (url.pathname.startsWith('/api/')) return await api(req, env, url);
      // halaman dengan alamat dinamis memakai berkas HTML yang sama
      if (/^\/hadir\/[A-Za-z0-9]+\/?$/.test(url.pathname)) return env.ASSETS.fetch(new Request(new URL('/', url), req));
      if (/^\/kelola\/?$/.test(url.pathname)) return Response.redirect(new URL('/admin', url), 302);
      if (/^\/v\/[A-Za-z0-9-]+\/?$/.test(url.pathname)) return env.ASSETS.fetch(new Request(new URL('/v', url), req));
      return env.ASSETS.fetch(req);
    } catch (e) {
      return salah('Terjadi gangguan: ' + String((e && e.message) || e), 500);
    }
  },
};
