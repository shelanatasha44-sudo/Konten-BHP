// Kirim e-sertifikat Webinar Pengampuan BHP Medan secara otomatis.
// Dijalankan GitHub Actions setiap 5 menit pada hari acara.
// Alur: baca daftar hadir (Jotform) dan data pendaftar (Google Sheet), tunggu 15 menit sejak peserta
// pertama kali terlihat di daftar hadir, buat PDF sertifikat, kirim lewat Gmail, simpan status.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import nodemailer from 'nodemailer';
import { chromium } from 'playwright-core';
import { buatHtml } from './desain.mjs';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const env = process.env;
const CFG = {
  formHadir: env.FORM_HADIR || '263210953937057',
  sheet: '1CJq58lCnP8zScvhM3vzzYfJ5Yt_gvNHMhvMd0lR1LvY',
  gid: '555000111',
  urlVerifikasi: (env.URL_VERIFIKASI || 'https://sertifikat-bhp-medan.cf-layar.workers.dev').replace(/\/$/, ''),
  jedaMenit: Number(env.JEDA_MENIT || 15),
  mulai: new Date(env.MULAI || '2026-11-24T00:00:00+07:00'),
  selesai: new Date(env.SELESAI || '2026-11-26T00:00:00+07:00'),
  hadirSejak: env.HADIR_SEJAK || '2026-11-23 12:00:00',
  pengirim: env.GMAIL_USER || 'wilayah2bhpmedan@gmail.com',
  chrome: env.CHROME_PATH || '/usr/bin/google-chrome',
  formatNomor: (n) => `${String(n).padStart(3, '0')}/SERT/WP/BHP.MDN/XI/2026`,
};
const SMTP_PASS = env.GMAIL_APP_PASSWORD || '';
const KODE = env.SERTIFIKAT_KODE || '';
const GAS_URL = env.GAS_URL || '';
const KUNCI = KODE || SMTP_PASS;
const JF_KEY = env.JOTFORM_API_KEY || '';
const UJI = (env.UJI_EMAIL || '').trim();
const KERING = env.KERING === '1'; // tidak mengirim email, PDF disimpan ke folder keluaran
const SEMUA = env.SEMUA === '1'; // kirim juga ke pengisi daftar hadir yang tidak tercatat di data pendaftar
const STATUS = path.join(DIR, 'data/status.json');
const sensor = (x) => String(x).replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/gi, '<email>');
const log = (...a) => console.log(new Date().toISOString(), ...a.map(sensor));

// ---------- utilitas ----------
const hmac = (s) => crypto.createHmac('sha256', KUNCI || 'kunci-kosong').update(s).digest();
const kunciOrang = (email) => hmac('sert:' + email).toString('hex').slice(0, 24);
const tokenOrang = (email) => hmac('tok:' + email).toString('base64url').slice(0, 14);
const normHp = (p) => String(p || '').replace(/\D/g, '').replace(/^(62|0)/, '');
const normNama = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
const normEmail = (s) => String(s || '').trim().toLowerCase();
const emailSah = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const hashLewati = (email) => crypto.createHash('sha256').update('lewati:' + normEmail(email)).digest('hex').slice(0, 32);

// Merapikan penulisan nama dan gelar untuk sertifikat.
const GELAR = {
  sh: 'S.H.', mh: 'M.H.', mkn: 'M.Kn.', mhum: 'M.Hum.', mhli: 'M.H.Li.', llm: 'LL.M.', se: 'S.E.', ssos: 'S.Sos.', spd: 'S.Pd.', mpd: 'M.Pd.',
  skom: 'S.Kom.', st: 'S.T.', ssi: 'S.Si.', sip: 'S.IP.', sap: 'S.AP.', sak: 'S.Ak.', mm: 'M.M.', msi: 'M.Si.', map: 'M.AP.', mak: 'M.Ak.',
  ak: 'Ak.', amd: 'A.Md.', ske: 'S.Ke.', skm: 'S.K.M.', skep: 'S.Kep.', ns: 'Ns.', shi: 'S.H.I.', sag: 'S.Ag.', sei: 'S.E.I.', spsi: 'S.Psi.',
  mpsi: 'M.Psi.', spt: 'S.Pt.', spn: 'Sp.N.', ssy: 'S.Sy.', sth: 'S.Th.', mth: 'M.Th.', mkom: 'M.Kom.', mt: 'M.T.', mba: 'M.B.A.', ssn: 'S.Sn.', sstp: 'S.STP.', mtr: 'M.Tr.', ked: 'S.Ked.', sked: 'S.Ked.', mkes: 'M.Kes.', cpns: '', phd: 'Ph.D.', cht: 'CHT.',
};
const kunciGelar = (t) => t.toLowerCase().replace(/[^a-z]/g, '');
const huruf = (w) => w.split(/([-'’])/).map((x) => (/[-'’]/.test(x) ? x : x.charAt(0).toUpperCase() + x.slice(1).toLowerCase())).join('');
export function rapikanNama(raw) {
  let s = String(raw || '').replace(/[\u3164\u115F\u1160\u200B-\u200D\u2060\uFEFF]/g, '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').replace(/^[,\s]+|[,\s]+$/g, '').trim();
  if (!s) return s;
  let [depan, ...sisa] = s.split(', ');
  // Gelar yang ditulis tanpa koma di belakang nama, misalnya "Budi SH MH".
  const kata = depan.split(' ');
  const ekor = [];
  while (kata.length > 1 && GELAR[kunciGelar(kata[kata.length - 1])] !== undefined && /^[A-Za-z.]+$/.test(kata[kata.length - 1])) ekor.unshift(kata.pop());
  depan = kata.filter((w, i) => i === 0 || w.toLowerCase() !== kata[i - 1].toLowerCase()).join(' ');
  const kataNama = new Set(depan.toLowerCase().split(' '));
  const gelar = [...ekor, ...sisa.join(' ').split(/[\s,]+/)].filter((g) => g && !kataNama.has(g.toLowerCase())).map((g) => {
    const k = kunciGelar(g);
    return GELAR[k] !== undefined ? GELAR[k] : g;
  }).filter(Boolean);
  const hurufSama = depan === depan.toLowerCase() || depan === depan.toUpperCase();
  depan = depan.split(' ').map((w) => (hurufSama || (w.length >= 3 && w === w.toUpperCase() && /[A-Z]/.test(w) && !/^[IVX]+$/.test(w)) ? huruf(w) : w)).join(' ');
  return gelar.length ? depan + ', ' + [...new Set(gelar)].join(', ') : depan;
}

function parseCSV(t) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
    else if (c !== '\r') f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}

// ---------- data ----------
async function ambilPendaftar() {
  const r = await fetch(`https://docs.google.com/spreadsheets/d/${CFG.sheet}/export?format=csv&gid=${CFG.gid}`, { redirect: 'follow' });
  if (!r.ok || !/csv/i.test(r.headers.get('content-type') || '')) throw new Error('Sheet pendaftar tidak bisa dibaca (' + r.status + ')');
  const rows = parseCSV(await r.text());
  const h = rows[0].map((x) => x.toLowerCase());
  const iN = h.findIndex((x) => /nama/.test(x)), iP = h.findIndex((x) => /whats|nomor/.test(x)), iE = h.findIndex((x) => /mail/.test(x));
  const byEmail = new Map(), byHp = new Map(), byNama = new Map();
  for (const x of rows.slice(1)) {
    const nama = (x[iN] || '').trim();
    if (!nama) continue;
    const o = { nama, email: normEmail(x[iE]), hp: normHp(x[iP]) };
    if (o.email && !byEmail.has(o.email)) byEmail.set(o.email, o);
    if (o.hp && !byHp.has(o.hp)) byHp.set(o.hp, o);
    const nn = normNama(nama);
    if (nn && !byNama.has(nn)) byNama.set(nn, o);
  }
  log('Pendaftar terbaca:', byEmail.size, 'email,', byHp.size, 'nomor WA');
  return { byEmail, byHp, byNama };
}

function nilai(a) {
  if (!a || a.answer == null) return '';
  if (typeof a.answer === 'object') return a.answer.full || [a.answer.first, a.answer.middle, a.answer.last].filter(Boolean).join(' ') || Object.values(a.answer).join(' ');
  return String(a.answer);
}

async function ambilHadir() {
  if (!JF_KEY) throw new Error('Secret JOTFORM_API_KEY belum diisi');
  const filter = encodeURIComponent(JSON.stringify({ 'status:ne': 'DELETED', 'created_at:gt': CFG.hadirSejak }));
  const r = await fetch(`https://api.jotform.com/form/${CFG.formHadir}/submissions?limit=1000&orderby=created_at,ASC&filter=${filter}&apiKey=${encodeURIComponent(JF_KEY)}`);
  const j = await r.json();
  if (j.responseCode !== 200) throw new Error('Jotform: ' + (j.message || j.responseCode));
  return (j.content || []).map((s) => {
    const A = Object.values(s.answers || {});
    const cari = (fn) => A.find((a) => a.answer && fn(a));
    const em = cari((a) => a.type === 'control_email') || cari((a) => /e-?mail|surel/i.test(a.text || ''));
    const nm = cari((a) => a.type === 'control_fullname') || cari((a) => /nama/i.test(a.text || '') && !/instansi|lembaga|kantor/i.test(a.text || ''));
    const hp = cari((a) => a.type === 'control_phone') || cari((a) => /whats|\bwa\b|\bhp\b|telepon|ponsel|nomor/i.test(a.text || ''));
    return { email: normEmail(nilai(em)), nama: nilai(nm).replace(/\s+/g, ' ').trim(), hp: normHp(nilai(hp)), dibuat: s.created_at };
  });
}

function cocokkan(h, p) {
  // Hanya peserta yang terdaftar (email atau nomor WA ada di data pendaftar) yang mendapat sertifikat.
  const daftar = (h.email && p.byEmail.get(h.email)) || (h.hp && p.byHp.get(h.hp)) || null;
  if (!daftar) {
    if (SEMUA && emailSah(h.email) && h.nama) return { email: h.email, nama: h.nama, terdaftar: true };
    return { email: '', nama: '', terdaftar: false };
  }
  const email = emailSah(daftar.email) ? daftar.email : emailSah(h.email) ? h.email : '';
  return { email, nama: daftar.nama, terdaftar: true };
}

// ---------- sertifikat ----------
async function buatQr(url) {
  const svg = await QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#0B1A3A', light: '#00000000' } });
  return svg.replace('<svg ', '<svg preserveAspectRatio="xMidYMid meet" ');
}

export async function buatPdf(browser, data, coba = 0) {
  let gagalQr = false;
  const token = coba ? crypto.randomBytes(11).toString('base64url').slice(0, 14) : tokenOrang(data.email);
  const url = `${CFG.urlVerifikasi}/#${token}`;
  const html = buatHtml({ nama: data.nama, nomor: data.nomor, qrSvg: await buatQr(url), urlVerifikasi: CFG.urlVerifikasi.replace(/^https?:\/\//, '') });
  const tmp = path.join(DIR, `.tmp-${crypto.randomBytes(4).toString('hex')}.html`);
  fs.writeFileSync(tmp, html);
  const page = await browser.newPage({ deviceScaleFactor: 3 });
  try {
    await page.goto('file://' + tmp, { waitUntil: 'load' });
    await page.waitForFunction(() => document.body.dataset.siap === '1', null, { timeout: 20000 });
    // Pastikan QR benar-benar terbaca sebelum PDF dibuat.
    const png = PNG.sync.read(await page.locator('.qr').screenshot());
    const hasil = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    if (!hasil || hasil.data !== url) gagalQr = true;
    else {
    const pdf = await page.pdf({ width: '297mm', height: '210mm', printBackground: true, preferCSSPageSize: true });
    return { pdf, token, url };
    }
  } finally {
    await page.close();
    fs.unlinkSync(tmp);
  }
  if (coba >= 3) throw new Error('QR tidak terbaca setelah beberapa percobaan');
  return buatPdf(browser, data, coba + 1);
}

// Data verifikasi disimpan terenkripsi. Hanya pemegang QR (token) yang bisa membukanya.
function simpanVerifikasi(token, isi) {
  const id = crypto.createHash('sha256').update(token).digest('hex').slice(0, 24);
  const key = crypto.createHash('sha256').update('kunci:' + token).digest();
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([c.update(JSON.stringify(isi), 'utf8'), c.final(), c.getAuthTag()]);
  fs.writeFileSync(path.join(DIR, 'situs/v', id + '.json'), JSON.stringify({ iv: iv.toString('base64'), data: data.toString('base64') }));
}

// ---------- email ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function isiEmail(d) {
  const html = `<div style="background:#EEF0F5;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#FFFDF7;border-radius:10px;overflow:hidden;border:1px solid #E3D3A8">
<tr><td style="background:#0B1A3A;padding:22px 28px;border-bottom:3px solid #C9A45C">
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="padding-right:14px"><img src="cid:logo" width="44" height="50" alt="Pengayoman" style="display:block"></td>
<td style="color:#F5EEDC;font-size:11px;letter-spacing:2px;line-height:1.6">KEMENTERIAN HUKUM REPUBLIK INDONESIA<br>KANTOR WILAYAH SUMATERA UTARA<br><b style="color:#E3C98A">BALAI HARTA PENINGGALAN MEDAN</b></td></tr></table></td></tr>
<tr><td style="padding:30px 32px 8px;color:#22314F;font-size:15px;line-height:1.7">
<div style="font-size:12px;letter-spacing:3px;color:#9C7A2E;font-weight:bold">E-SERTIFIKAT WEBINAR PENGAMPUAN</div>
<h1 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#0B1A3A;margin:10px 0 16px;font-weight:normal">Terima kasih telah hadir, ${esc(d.nama)}</h1>
<p style="margin:0 0 14px">Kehadiran Anda dalam Webinar Pengampuan <i>&#8220;Menjaga yang Tak Lagi Mampu, Melindungi Hak yang Tetap Ada&#8221;</i> pada Selasa, 24 November 2026 sudah tercatat. Bersama email ini kami sampaikan e-sertifikat Anda dalam bentuk PDF terlampir.</p>
<p style="margin:0 0 22px">Nomor sertifikat: <b style="color:#0B1A3A">${esc(d.nomor)}</b></p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#0B1A3A;border-radius:6px;border:1px solid #C9A45C"><a href="${d.url}" style="display:inline-block;padding:12px 22px;color:#F1DDA6;text-decoration:none;font-size:14px;font-weight:bold;letter-spacing:1px">Lihat dan verifikasi sertifikat</a></td></tr></table>
<p style="margin:22px 0 0;font-size:13px;color:#6B7487">Semoga materi webinar bermanfaat. Informasi layanan pengampuan dan kegiatan kami lainnya dapat diikuti di Instagram @bhpmedan_kemenkum.</p>
</td></tr>
<tr><td style="padding:22px 32px 28px;color:#22314F;font-size:14px;line-height:1.6">Hormat kami,<br><b>Panitia Webinar Pengampuan</b><br>Balai Harta Peninggalan Medan</td></tr>
<tr><td style="background:#0B1A3A;color:#AEB6C8;font-size:11px;padding:12px 32px;text-align:center">Email ini dikirim otomatis. Mohon tidak membalas email ini.</td></tr>
</table></div>`;
  const text = `Terima kasih telah hadir, ${d.nama}.\n\nKehadiran Anda dalam Webinar Pengampuan "Menjaga yang Tak Lagi Mampu, Melindungi Hak yang Tetap Ada" pada Selasa, 24 November 2026 sudah tercatat. E-sertifikat Anda terlampir dalam bentuk PDF.\n\nNomor sertifikat: ${d.nomor}\nVerifikasi: ${d.url}\n\nHormat kami,\nPanitia Webinar Pengampuan\nBalai Harta Peninggalan Medan`;
  return { html, text };
}

function namaBerkas(nama) {
  return ('E-Sertifikat Webinar Pengampuan - ' + nama).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120).replace(/[.\s]+$/, '') + '.pdf';
}

let transport = null;
async function kirimEmail(d, pdf) {
  if (KERING) {
    fs.mkdirSync(path.join(DIR, 'keluaran'), { recursive: true });
    fs.writeFileSync(path.join(DIR, 'keluaran', namaBerkas(d.nama)), pdf);
    log('(kering) PDF disimpan untuk', d.nomor);
    return;
  }
  const { html, text } = isiEmail(d);
  if (SMTP_PASS) {
    transport ||= nodemailer.createTransport({ service: 'gmail', auth: { user: CFG.pengirim, pass: SMTP_PASS.replace(/\s+/g, '') } });
    await transport.sendMail({
      from: { name: 'Balai Harta Peninggalan Medan', address: CFG.pengirim },
      to: d.email,
      subject: 'E-Sertifikat Webinar Pengampuan BHP Medan',
      text, html,
      attachments: [
        { filename: namaBerkas(d.nama), content: pdf, contentType: 'application/pdf' },
        { filename: 'logo.png', path: path.join(DIR, 'logo-email.png'), cid: 'logo' },
      ],
    });
    return;
  }
  // Tanpa App Password: kirim lewat Apps Script milik wilayah2bhpmedan@gmail.com.
  if (!GAS_URL || !KODE) throw new Error('Secret SERTIFIKAT_KODE atau alamat Apps Script belum diisi');
  const r = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'content-type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      kode: KODE, jenis: 'sertifikat', to: d.email,
      subject: 'E-Sertifikat Webinar Pengampuan BHP Medan', body: text, html,
      namaPengirim: 'Balai Harta Peninggalan Medan',
      lampiran: [{ nama: namaBerkas(d.nama), mime: 'application/pdf', data: Buffer.from(pdf).toString('base64') }],
      inline: [{ cid: 'logo', nama: 'logo.png', mime: 'image/png', data: fs.readFileSync(path.join(DIR, 'logo-email.png')).toString('base64') }],
    }),
    redirect: 'follow',
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { throw new Error('Apps Script tidak membalas JSON (status ' + r.status + '). Periksa akses web app.'); }
  if (!j.ok) throw new Error('Apps Script: ' + j.error);
}

// ---------- utama ----------
async function main() {
  const now = new Date();
  if (UJI) {
    log('Mode uji: kirim contoh sertifikat');
    const browser = await chromium.launch({ executablePath: CFG.chrome });
    const d = { email: normEmail(UJI), nama: rapikanNama(env.UJI_NAMA || 'Contoh Nama Peserta, S.H.'), nomor: '000/SERT/WP/BHP.MDN/XI/2026' };
    const { pdf, token, url } = await buatPdf(browser, d);
    await browser.close();
    simpanVerifikasi(token, { nama: d.nama, nomor: d.nomor, peran: 'Peserta (contoh)', terbit: now.toISOString() });
    await kirimEmail({ ...d, url }, pdf);
    log('Contoh terkirim.');
    return;
  }
  if (now < CFG.mulai || now > CFG.selesai) { log('Di luar jadwal pengiriman, tidak ada yang dikerjakan.'); return; }

  const st = JSON.parse(fs.readFileSync(STATUS, 'utf8'));
  const simpan = () => { if (!KERING) fs.writeFileSync(STATUS, JSON.stringify(st, null, 1)); };
  const LEWATI = new Set(fs.existsSync(path.join(DIR, 'data/lewati.json')) ? JSON.parse(fs.readFileSync(path.join(DIR, 'data/lewati.json'), 'utf8')) : []);
  const [pendaftar, hadir] = await Promise.all([ambilPendaftar(), ambilHadir()]);
  log('Daftar hadir terbaca:', hadir.length);

  const siap = [], dilihat = new Set(), namaDilihat = new Set();
  let dilewati = 0;
  for (const h of hadir) {
    const o = cocokkan(h, pendaftar);
    if (o.nama) o.nama = rapikanNama(o.nama);
    if (!o.terdaftar) { log('Lewati 1 isian daftar hadir: tidak terdaftar sebagai peserta'); continue; }
    if (!o.email || !o.nama) { log('Lewati 1 isian daftar hadir: data pendaftar tanpa email atau nama'); continue; }
    const k = kunciOrang(o.email);
    if (dilihat.has(k) || st.terkirim[k]) continue;
    dilihat.add(k);
    if (LEWATI.has(hashLewati(o.email))) { dilewati++; continue; }
    const nn = normNama(o.nama);
    if (namaDilihat.has(nn)) continue;
    namaDilihat.add(nn);
    if (!st.pending[k]) { st.pending[k] = now.toISOString(); if (CFG.jedaMenit > 0) continue; }
    if (now - new Date(st.pending[k]) >= CFG.jedaMenit * 60000) siap.push({ ...o, k });
  }
  simpan();
  if (dilewati) log('Dilewati (sudah menerima sertifikat atau dikecualikan):', dilewati);
  log('Siap dikirim:', siap.length, '| menunggu:', Object.keys(st.pending).length - siap.length);
  if (!siap.length) return;

  const browser = await chromium.launch({ executablePath: CFG.chrome });
  const pratinjau = [];
  let ok = 0;
  for (const o of siap) {
    try {
      const n = st.nomorTerakhir + 1;
      const d = { email: o.email, nama: o.nama, nomor: CFG.formatNomor(n) };
      const { pdf, token, url } = await buatPdf(browser, d);
      await kirimEmail({ ...d, url }, pdf);
      if (KERING) { pratinjau.push({ nama: d.nama, email: d.email, nomor: d.nomor, url, berkas: namaBerkas(d.nama) }); }
      else simpanVerifikasi(token, { nama: d.nama, nomor: d.nomor, peran: 'Peserta', terbit: new Date().toISOString() });
      st.nomorTerakhir = n;
      st.terkirim[o.k] = { n, t: new Date().toISOString() };
      delete st.pending[o.k];
      simpan();
      ok++;
      await new Promise((r) => setTimeout(r, 1500));
    } catch (e) {
      log('Gagal mengirim satu sertifikat:', e.message);
      if (/limit|quota|kuota|Invalid login|auth|Kode salah|akses web app/i.test(e.message)) break;
    }
  }
  await browser.close();
  if (KERING) fs.writeFileSync(path.join(DIR, 'keluaran', 'daftar.json'), JSON.stringify(pratinjau, null, 1));
  log(KERING ? 'Pratinjau dibuat:' : 'Terkirim pada putaran ini:', ok);
}

if (!env.TANPA_MAIN) main().catch((e) => { console.error(sensor(e && e.stack || e)); process.exit(1); });
