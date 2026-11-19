// E-Sertifikat Kantor Wilayah Kementerian Hukum Sumatera Utara
// Cloudflare Worker + D1. Halaman statis ada di folder public.

// Kode pengelola tidak disimpan di sini, hanya sidik SHA-256 dari "esert:" + kode.
const SIDIK_PENGELOLA = '125db3503526cc34d21bdf46f2722de5f1759a32ebedc4d33013080ca1f5cab7';

const HURUF = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const BAWAAN = {
  desain: 'elegan',
  kop1: 'KEMENTERIAN HUKUM REPUBLIK INDONESIA',
  kop2: 'KANTOR WILAYAH SUMATERA UTARA',
  judulSertifikat: 'SERTIFIKAT',
  pembuka: 'diberikan kepada',
  kalimat: 'atas partisipasinya sebagai {peran} dalam',
  peran: 'Peserta',
  penyelenggara: 'Kantor Wilayah Kementerian Hukum Sumatera Utara',
  tampilQr: true,
  buka: true,
};

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
const emailSah = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

async function pengelola(req) {
  const kode = String(req.headers.get('x-kode-pengelola') || '').trim().toUpperCase();
  if (!kode) return false;
  const h = await sha('esert:' + kode);
  let beda = 0;
  for (let i = 0; i < h.length; i++) beda |= h.charCodeAt(i) ^ SIDIK_PENGELOLA.charCodeAt(i);
  return beda === 0 && h.length === SIDIK_PENGELOLA.length;
}

const gambarSah = (s) => (typeof s === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(s) && s.length < 450000 ? s : '');
const waktuSah = (s) => { if (!s) return ''; const d = new Date(s); return isNaN(d) ? '' : d.toISOString(); };

function rapikanAcara(masuk, lama = {}) {
  const m = { ...BAWAAN, ...lama, ...masuk };
  const ttd = Array.isArray(m.penandatangan) ? m.penandatangan.slice(0, 2).map((p) => ({
    jabatan: bersih(p && p.jabatan, 120),
    nama: bersih(p && p.nama, 90),
    nip: bersih(p && p.nip, 40),
    ttd: gambarSah(p && p.ttd),
  })).filter((p) => p.nama || p.jabatan) : [];
  return {
    judul: bersih(m.judul, 160),
    tema: bersih(m.tema, 200),
    tanggal: bersih(m.tanggal, 80),
    tempat: bersih(m.tempat, 120),
    penyelenggara: bersih(m.penyelenggara, 120),
    desain: ['elegan', 'gading', 'biru'].includes(m.desain) ? m.desain : 'elegan',
    kop1: bersih(m.kop1, 80),
    kop2: bersih(m.kop2, 80),
    judulSertifikat: bersih(m.judulSertifikat, 30) || 'SERTIFIKAT',
    pembuka: bersih(m.pembuka, 80),
    kalimat: bersih(m.kalimat, 120),
    peran: bersih(m.peran, 40) || 'Peserta',
    formatNomor: bersih(m.formatNomor, 60) || '{n}/SERT',
    tempatTanggal: bersih(m.tempatTanggal, 80),
    tampilQr: m.tampilQr !== false,
    buka: m.buka !== false,
    mulai: waktuSah(m.mulai),
    sampai: waktuSah(m.sampai),
    penandatangan: ttd,
  };
}

async function ambilAcara(env, id) {
  const r = await env.DB.prepare('SELECT data, dibuat FROM acara WHERE id = ?').bind(id).first();
  return r ? { id, ...JSON.parse(r.data), dibuat: r.dibuat } : null;
}

const untukPeserta = (r) => ({ pk: r.pk, nama: r.nama, nomor: r.nomor, kode: r.kode, peran: r.peran, status: r.status, waktu: r.waktu });

// Menerbitkan sertifikat. Nomor urut dihitung di dalam satu perintah SQL sehingga tidak bisa kembar.
async function terbitkan(env, acara, d) {
  const lama = await env.DB.prepare('SELECT * FROM peserta WHERE acara = ? AND pk = ?').bind(acara.id, d.pk).first();
  if (lama) return { rec: lama, ulang: true };
  const pola = acara.formatNomor || '{n}/SERT';
  for (let i = 0; i < 5; i++) {
    const kode = acak(10);
    try {
      await env.DB.prepare(
        `INSERT INTO peserta (acara, pk, urut, nomor, kode, nama, email, instansi, peran, status, sumber, waktu)
         SELECT ?1, ?2, n, replace(?3, '{n}', printf('%03d', n)), ?4, ?5, ?6, ?7, ?8, 'sah', ?9, ?10
         FROM (SELECT COALESCE(MAX(urut), 0) + 1 AS n FROM peserta WHERE acara = ?1) WHERE true
         ON CONFLICT (acara, pk) DO NOTHING`
      ).bind(acara.id, d.pk, pola, kode, d.nama, d.email || '', d.instansi || '', d.peran || acara.peran || 'Peserta', d.sumber || 'hadir', new Date().toISOString()).run();
      break;
    } catch (e) {
      if (!/UNIQUE/i.test(String(e && e.message))) throw e;
    }
  }
  const rec = await env.DB.prepare('SELECT * FROM peserta WHERE acara = ? AND pk = ?').bind(acara.id, d.pk).first();
  if (!rec) throw new Error('Sertifikat gagal diterbitkan, silakan coba lagi.');
  return { rec, ulang: false };
}

// Tabel database dibuat otomatis saat pertama kali dipakai.
const SKEMA = [
  'CREATE TABLE IF NOT EXISTS acara (id TEXT PRIMARY KEY, data TEXT NOT NULL, dibuat TEXT NOT NULL, diubah TEXT NOT NULL)',
  `CREATE TABLE IF NOT EXISTS peserta (acara TEXT NOT NULL, pk TEXT NOT NULL, urut INTEGER NOT NULL, nomor TEXT NOT NULL, kode TEXT NOT NULL UNIQUE, nama TEXT NOT NULL, email TEXT, instansi TEXT, peran TEXT, status TEXT NOT NULL DEFAULT 'sah', sumber TEXT, waktu TEXT NOT NULL, PRIMARY KEY (acara, pk), UNIQUE (acara, urut))`,
  'CREATE INDEX IF NOT EXISTS idx_peserta_urut ON peserta (acara, urut)',
];
let dbSiap = null;
function siapkanDb(env) {
  if (!dbSiap) dbSiap = env.DB.batch(SKEMA.map((q) => env.DB.prepare(q))).catch((e) => { dbSiap = null; throw e; });
  return dbSiap;
}

async function api(req, env, url) {
  await siapkanDb(env);
  const p = url.pathname.replace(/\/+$/, '').split('/').slice(2); // ['acara', id, ...]
  const m = req.method;
  const admin = await pengelola(req);
  const badan = async () => { try { return await req.json(); } catch (e) { return {}; } };

  // ---- acara ----
  if (p[0] === 'acara') {
    if (!p[1] && m === 'GET') {
      if (!admin) return salah('Kode pengelola tidak sesuai.', 401);
      const { results } = await env.DB.prepare(
        `SELECT a.id, a.data, a.dibuat, (SELECT COUNT(*) FROM peserta p WHERE p.acara = a.id) AS jumlah
         FROM acara a ORDER BY a.dibuat DESC`).all();
      return json({ ok: true, acara: results.map((r) => { const d = JSON.parse(r.data); return { id: r.id, judul: d.judul, tanggal: d.tanggal, tempat: d.tempat, buka: d.buka, desain: d.desain, dibuat: r.dibuat, jumlah: r.jumlah }; }) });
    }
    if (!p[1] && m === 'POST') {
      if (!admin) return salah('Kode pengelola tidak sesuai.', 401);
      const data = rapikanAcara(await badan());
      if (!data.judul || !data.tanggal) return salah('Judul acara dan tanggal wajib diisi.');
      const now = new Date().toISOString();
      for (let i = 0; i < 5; i++) {
        const id = acak(6);
        const r = await env.DB.prepare('INSERT OR IGNORE INTO acara (id, data, dibuat, diubah) VALUES (?, ?, ?, ?)').bind(id, JSON.stringify(data), now, now).run();
        if (r.meta.changes) return json({ ok: true, id });
      }
      return salah('Gagal membuat acara.', 500);
    }
    if (p[1] && m === 'GET') {
      const a = await ambilAcara(env, p[1]);
      return a ? json({ ok: true, acara: a }) : salah('Acara tidak ditemukan.', 404);
    }
    if (p[1] && m === 'PUT') {
      if (!admin) return salah('Kode pengelola tidak sesuai.', 401);
      const lama = await ambilAcara(env, p[1]);
      if (!lama) return salah('Acara tidak ditemukan.', 404);
      const data = rapikanAcara(await badan(), lama);
      if (!data.judul || !data.tanggal) return salah('Judul acara dan tanggal wajib diisi.');
      await env.DB.prepare('UPDATE acara SET data = ?, diubah = ? WHERE id = ?').bind(JSON.stringify(data), new Date().toISOString(), p[1]).run();
      return json({ ok: true, id: p[1] });
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
    const nama = bersih(b.nama, 120), email = bersih(b.email, 120).toLowerCase(), instansi = bersih(b.instansi, 120);
    if (nama.length < 3) return salah('Nama lengkap wajib diisi.');
    if (!emailSah(email)) return salah('Alamat email belum benar.');
    const pk = (await sha('email:' + email)).slice(0, 24);
    const { rec, ulang } = await terbitkan(env, acara, { pk, nama, email, instansi, sumber: 'hadir' });
    if (rec.status === 'dicabut') return salah('Sertifikat untuk email ini telah dibatalkan oleh panitia.', 403);
    return json({ ok: true, ulang, peserta: untukPeserta(rec) });
  }

  // ---- kelola peserta (pengelola) ----
  if (p[0] === 'peserta' && p[1]) {
    if (!admin) return salah('Kode pengelola tidak sesuai.', 401);
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
      const { rec, ulang } = await terbitkan(env, acara, { pk, nama, email, instansi: bersih(b.instansi, 120), peran: bersih(b.peran, 40) || acara.peran, sumber: 'manual' });
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
      await env.DB.prepare('UPDATE peserta SET nama = ?, peran = ?, instansi = ?, status = ? WHERE acara = ? AND pk = ?').bind(nama, peran, instansi, status, p[1], p[2]).run();
      return json({ ok: true, peserta: { ...rec, nama, peran, instansi, status } });
    }
  }

  // ---- verifikasi (publik) ----
  if (p[0] === 'verifikasi' && p[1] && m === 'GET') {
    const kode = p[1].toUpperCase().replace(/[^A-Z0-9]/g, '');
    let rec = kode.length === 10 ? await env.DB.prepare('SELECT * FROM peserta WHERE kode = ?').bind(kode).first() : null;
    if (!rec) return json({ ok: true, status: 'tidak' });
    const acara = await ambilAcara(env, rec.acara);
    return json({
      ok: true,
      status: rec.status === 'dicabut' ? 'dicabut' : 'sah',
      sertifikat: { nama: rec.nama, nomor: rec.nomor, peran: rec.peran, instansi: rec.instansi, kode: rec.kode, terbit: rec.waktu },
      acara: acara ? { judul: acara.judul, tema: acara.tema, tanggal: acara.tanggal, tempat: acara.tempat, penyelenggara: acara.penyelenggara } : null,
    });
  }

  return salah('Alamat tidak dikenal.', 404);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    try {
      if (url.pathname.startsWith('/api/')) return await api(req, env, url);
      // halaman dengan alamat dinamis memakai berkas HTML yang sama
      if (/^\/hadir\/[A-Za-z0-9]+\/?$/.test(url.pathname)) return env.ASSETS.fetch(new Request(new URL('/hadir', url), req));
      if (/^\/v\/[A-Za-z0-9-]+\/?$/.test(url.pathname)) return env.ASSETS.fetch(new Request(new URL('/v', url), req));
      return env.ASSETS.fetch(req);
    } catch (e) {
      return salah('Terjadi gangguan: ' + String((e && e.message) || e), 500);
    }
  },
};
