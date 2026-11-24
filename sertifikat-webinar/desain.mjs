// Desain sertifikat Webinar Pengampuan BHP Medan (A4 lanskap).
// buatHtml({ nama, nomor, qrSvg, urlVerifikasi }) menghasilkan HTML lengkap.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const FONT_CSS = fs.readFileSync(path.join(DIR, 'fonts/semua.css'), 'utf8');
const LOGO = fs.readFileSync(path.join(DIR, 'logo.svg'), 'utf8').replace('<svg ', '<svg class="logo" ');
const POHON = fs.readFileSync(path.join(DIR, 'aset_logo_trace.svg'), 'utf8').match(/<path[^>]*d="([^"]+)"/)[1];
const pohon = (x, y, w, op) => `<path d="${POHON}" fill="#E3C98A" fill-rule="evenodd" opacity="${op}" transform="translate(${x} ${y}) scale(${(w / 1760).toFixed(5)})"/>`;

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const f = (n) => n.toFixed(2);

// Roset guilloche: kumpulan kurva hipotrokoid tipis.
function roset(cx, cy, R, r, d, putaran, langkah) {
  let p = '';
  for (let i = 0; i <= langkah; i++) {
    const t = (i / langkah) * Math.PI * 2 * putaran;
    const x = cx + (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
    const y = cy + (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
    p += (i ? 'L' : 'M') + f(x) + ' ' + f(y);
  }
  return p;
}

// Gelombang guilloche untuk pita bingkai.
function gelombang(w, h, fase, amp, per) {
  let p = '';
  for (let x = 0; x <= w; x += 0.6) {
    const y = h / 2 + amp * Math.sin((x / per) * Math.PI * 2 + fase);
    p += (x ? 'L' : 'M') + f(x) + ' ' + f(y);
  }
  return p;
}

function polaPita() {
  const w = 18, h = 7.2, g = [];
  for (let i = 0; i < 9; i++) g.push(`<path d="${gelombang(w, h, (i * Math.PI * 2) / 9, 2.6, 9)}"/>`);
  for (let i = 0; i < 9; i++) g.push(`<path d="${gelombang(w, h, (i * Math.PI * 2) / 9 + Math.PI, 2.6, 9)}" transform="translate(0 ${h}) scale(1 -1)"/>`);
  return `<pattern id="pita" width="${w}" height="${h}" patternUnits="userSpaceOnUse"><g fill="none" stroke="#D9BC7A" stroke-width="0.09" opacity="0.62">${g.join('')}</g></pattern>`;
}

function sudut(x, y, sx, sy) {
  // ornamen sudut filigri emas
  return `<g transform="translate(${x} ${y}) scale(${sx} ${sy})" fill="none" stroke="url(#emas)" stroke-linecap="round">
    <path d="M0 30 V0 H30" stroke-width="0.75"/>
    <path d="M2.4 26 V2.4 H26" stroke-width="0.22"/>
    <path d="M6 24 C6 12 12 6 24 6" stroke-width="0.32"/>
    <path d="M24 6 C28.4 6 29.4 10.2 26.2 11.2 C24.2 11.8 23.1 9.6 25 8.9" stroke-width="0.32"/>
    <path d="M6 24 C6 28.4 10.2 29.4 11.2 26.2 C11.8 24.2 9.6 23.1 8.9 25" stroke-width="0.32"/>
    <path d="M9.5 18 C9.5 13 13 9.5 18 9.5" stroke-width="0.18"/>
    <circle cx="14.6" cy="14.6" r="0.75" fill="url(#emas)" stroke="none"/>
    <circle cx="33.5" cy="0" r="0.55" fill="#C9A45C" stroke="none"/><circle cx="0" cy="33.5" r="0.55" fill="#C9A45C" stroke="none"/>
  </g>
  <rect x="-1.5" y="-1.5" width="3" height="3" fill="url(#emas)" transform="translate(${x + sx * 6} ${y + sy * 6}) rotate(45)"/>`;
}

function gedung() {
  // siluet garis gedung pemerintahan (watermark)
  const kolom = [];
  for (let i = 0; i < 8; i++) {
    const x = 18 + i * 14;
    kolom.push(`<rect x="${x}" y="46" width="6" height="52" rx="0.6"/><line x1="${x + 1.5}" y1="48" x2="${x + 1.5}" y2="96"/><line x1="${x + 4.5}" y1="48" x2="${x + 4.5}" y2="96"/>`);
  }
  return `<g fill="none" stroke="#9C7A2E" stroke-width="0.7">
    <path d="M10 40 L70 12 L130 40 Z"/><path d="M22 36 L70 18 L118 36"/>
    <rect x="8" y="40" width="124" height="5"/>
    ${kolom.join('')}
    <rect x="10" y="98" width="120" height="4"/><rect x="5" y="102" width="130" height="4"/><rect x="0" y="106" width="140" height="4"/>
    <circle cx="70" cy="30" r="4"/>
  </g>`;
}

function segel() {
  // medali emas bergerigi dengan teks melingkar
  const gerigi = [];
  const n = 48;
  let d = '';
  for (let i = 0; i <= n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2;
    const r = i % 2 ? 15.2 : 16.6;
    d += (i ? 'L' : 'M') + f(17 + r * Math.cos(a)) + ' ' + f(17 + r * Math.sin(a));
  }
  gerigi.push(`<path d="${d}Z" fill="url(#emasSegel)"/>`);
  const garisHalus = roset(17, 17, 9, 2.25, 3.4, 4, 900);
  return `<svg viewBox="0 0 34 44" class="segel" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="emasSegel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F1DDA6"/><stop offset=".35" stop-color="#C9A45C"/><stop offset=".6" stop-color="#E9D195"/><stop offset="1" stop-color="#9C7A2E"/></linearGradient>
      <path id="busur" d="M17 17 m-11.2 0 a11.2 11.2 0 1 1 22.4 0 a11.2 11.2 0 1 1 -22.4 0"/>
    </defs>
    <path d="M10 28 L6.5 43 L11 40.4 L13.8 44 L16 30 Z" fill="#13284F"/><path d="M24 28 L27.5 43 L23 40.4 L20.2 44 L18 30 Z" fill="#0B1A3A"/>
    <path d="M10 28 L6.5 43 L11 40.4 L13.8 44 L16 30 Z M24 28 L27.5 43 L23 40.4 L20.2 44 L18 30 Z" fill="none" stroke="#C9A45C" stroke-width="0.3"/>
    ${gerigi.join('')}
    <circle cx="17" cy="17" r="14.2" fill="none" stroke="#FFF3CF" stroke-width="0.2" opacity=".8"/>
    <circle cx="17" cy="17" r="13.6" fill="none" stroke="#7E5F22" stroke-width="0.25"/>
    ${Array.from({ length: 72 }, (_, i) => { const a = (i / 72) * Math.PI * 2; return `<circle cx="${f(17 + 14.9 * Math.cos(a))}" cy="${f(17 + 14.9 * Math.sin(a))}" r="0.17" fill="#7E5F22" opacity=".7"/>`; }).join('')}
    <circle cx="17" cy="17" r="9.4" fill="#13284F"/>
    <circle cx="17" cy="17" r="8.7" fill="none" stroke="#E3C98A" stroke-width="0.25"/>
    ${Array.from({ length: 36 }, (_, i) => { const a = (i / 36) * Math.PI * 2; return `<line x1="${f(17 + 6.2 * Math.cos(a))}" y1="${f(17 + 6.2 * Math.sin(a))}" x2="${f(17 + 8.2 * Math.cos(a))}" y2="${f(17 + 8.2 * Math.sin(a))}" stroke="#C9A45C" stroke-width="0.12" opacity=".7"/>`; }).join('')}
    <path d="${garisHalus}" fill="none" stroke="#C9A45C" stroke-width="0.12" opacity=".55"/>
    <text font-family="Cinzel" font-weight="700" font-size="2.05" letter-spacing=".42" fill="#4A3510"><textPath href="#busur" startOffset="0">WEBINAR PENGAMPUAN &#183; BALAI HARTA PENINGGALAN MEDAN &#183;</textPath></text>
    <path d="M17 9.6 L17.55 11.1 L19.1 11.15 L17.9 12.1 L18.3 13.6 L17 12.75 L15.7 13.6 L16.1 12.1 L14.9 11.15 L16.45 11.1 Z" fill="#E3C98A"/>
    <text x="17" y="16.4" text-anchor="middle" font-family="Cinzel" font-weight="700" font-size="1.9" fill="#E3C98A" letter-spacing=".25">BHP MEDAN</text>
    <text x="17" y="20.4" text-anchor="middle" font-family="Cinzel" font-weight="700" font-size="3.4" fill="url(#emasSegel)">2026</text>
    <path d="M13.2 22 H20.8" stroke="#C9A45C" stroke-width="0.22"/>
  </svg>`;
}

export function buatHtml({ nama, nomor, qrSvg, urlVerifikasi }) {
  const W = 297, H = 210;
  const rosetBesar = [
    roset(W / 2, 112, 58, 7.25, 30, 4, 2600),
    roset(W / 2, 112, 52, 6.5, 22, 4, 2400),
    roset(W / 2, 112, 44, 5.5, 14, 4, 2000),
  ];
  return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Sertifikat ${esc(nama)}</title>
<style>
${FONT_CSS}
@page { size: 297mm 210mm; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 297mm; height: 210mm; }
body { position: relative; overflow: hidden; background: #0B1A3A; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: 'Inter', sans-serif; color: #13284F; }
.latar { position: absolute; inset: 0; width: 297mm; height: 210mm; }
.isi { position: absolute; left: 20mm; right: 20mm; top: 18mm; bottom: 18mm; display: flex; flex-direction: column; align-items: center; text-align: center; }
.kop { display: flex; align-items: center; gap: 4mm; }
.logo { width: 13.5mm; height: auto; display: block; }
.kop .t { text-align: left; line-height: 1.3; }
.kop .t div { font-family: 'Inter'; font-size: 6.9pt; letter-spacing: .2em; font-weight: 600; color: #13284F; }
.kop .t div.b { font-size: 7.6pt; font-weight: 600; color: #0B1A3A; }
.kop .t div.g { color: #9C7A2E; font-weight: 500; font-size: 6.2pt; }
.judul { margin-top: 5mm; display: flex; align-items: center; gap: 5mm; }
.judulsvg { width: 150mm; height: 16.5mm; display: block; }
.judul h1 { font-family: 'Cinzel'; font-weight: 600; font-size: 39pt; letter-spacing: .32em; margin-right: -.32em; line-height: 1; color: #0B1A3A; }
.hias { display: flex; align-items: center; gap: 1.6mm; }
.hias i { display: block; height: .35mm; width: 22mm; background: linear-gradient(90deg, rgba(201,164,92,0), #C9A45C); }
.hias.kanan i { background: linear-gradient(90deg, #C9A45C, rgba(201,164,92,0)); }
.hias b { display: block; width: 2mm; height: 2mm; transform: rotate(45deg); background: linear-gradient(135deg, #F1DDA6, #9C7A2E); }
.nomor { margin-top: 1.8mm; font-size: 7.6pt; letter-spacing: .24em; color: #8A6A2A; font-weight: 500; }
.sub-judul { margin-top: .6mm; font-family: 'Cinzel'; font-weight: 600; font-size: 7.4pt; letter-spacing: .55em; margin-right: -.55em; color: #9C7A2E; }
.acara { margin-top: 2.6mm; font-family: 'Cinzel'; font-weight: 700; font-size: 14pt; letter-spacing: .3em; margin-right: -.3em; color: #0B1A3A; }
.tema { margin-top: 1.4mm; font-family: 'Playfair Display'; font-style: italic; font-weight: 500; font-size: 14pt; color: #7E5F22; }
.subtema { margin-top: 1mm; font-family: 'Cormorant Garamond'; font-weight: 500; font-size: 12.5pt; color: #3B4A68; letter-spacing: .02em; }
.subtema::before { content: 'Sub tema: '; font-style: italic; }
.waktu { margin-top: 2.8mm; display: flex; align-items: center; gap: 3.2mm; font-size: 6.6pt; letter-spacing: .2em; font-weight: 600; color: #13284F; padding: 1.6mm 5mm; border-top: .25mm solid rgba(201,164,92,.7); border-bottom: .25mm solid rgba(201,164,92,.7); }
.waktu b { width: 1.4mm; height: 1.4mm; transform: rotate(45deg); background: #C9A45C; display: block; }
.beri { margin-top: 3.4mm; font-family: 'Cormorant Garamond'; font-style: italic; font-size: 15pt; color: #3B4A68; }
.nama { margin-top: 1.2mm; height: 17mm; width: 236mm; display: flex; align-items: center; justify-content: center; }
.nama span { font-family: 'Playfair Display'; font-style: italic; font-weight: 600; font-size: 33pt; line-height: 1.15; color: #0B1A3A; white-space: nowrap; letter-spacing: .005em; }
.sulur { width: 150mm; height: 8.5mm; display: block; margin-top: -.4mm; }
.garisnama { margin-top: .6mm; display: flex; align-items: center; gap: 2mm; }
.garisnama i { display: block; height: .3mm; width: 62mm; background: linear-gradient(90deg, rgba(201,164,92,0), #C9A45C 60%, #9C7A2E); }
.garisnama i.k { background: linear-gradient(90deg, #9C7A2E, #C9A45C 40%, rgba(201,164,92,0)); }
.garisnama b { width: 1.8mm; height: 1.8mm; transform: rotate(45deg); background: #C9A45C; display: block; }
.sebagai { margin-top: 1.6mm; display: flex; align-items: center; gap: 3mm; font-family: 'Cormorant Garamond'; font-size: 13.5pt; color: #3B4A68; font-style: italic; }
.peran { font-family: 'Cinzel'; font-style: normal; font-weight: 700; font-size: 10.5pt; letter-spacing: .38em; padding: 1.3mm 3.2mm 1.3mm 4.6mm; color: #0B1A3A; border: .3mm solid #C9A45C; border-radius: 6mm; background: linear-gradient(180deg, #FFFDF6, #F6EBCF); }
.badan { margin-top: 4mm; width: 210mm; font-family: 'Cormorant Garamond'; font-size: 13.4pt; line-height: 1.5; color: #22314F; font-weight: 500; text-wrap: balance; }
.badan em { font-style: italic; font-weight: 600; color: #7E5F22; }
.badan strong { font-weight: 600; color: #0B1A3A; }
.bawah { position: absolute; left: 0; right: 0; bottom: 7mm; height: 41mm; }
.segel { position: absolute; left: 12mm; bottom: 2.5mm; width: 29mm; height: auto; }
.ttd { position: absolute; left: 50%; transform: translateX(-50%); bottom: 0; width: 86mm; text-align: center; font-family: 'Cormorant Garamond'; color: #22314F; }
.ttd .tgl { font-size: 11.5pt; font-weight: 500; }
.ttd .jab { font-size: 11.5pt; font-weight: 600; color: #0B1A3A; margin-top: .2mm; }
.qr { margin: 1.3mm auto 1mm; width: 20mm; height: 20mm; padding: 2.2mm; border: .3mm solid #C9A45C; border-radius: 1.4mm; background: #FFFDF8; }
.qr svg { width: 100%; height: 100%; display: block; }
.ttd .nm { font-family: 'Playfair Display'; font-weight: 600; font-size: 11pt; color: #0B1A3A; letter-spacing: .02em; }
.ttd .nm::after { content: ''; display: block; width: 46mm; height: .25mm; margin: .9mm auto 0; background: linear-gradient(90deg, rgba(201,164,92,0), #C9A45C, rgba(201,164,92,0)); }
.info { position: absolute; right: 21mm; bottom: 2mm; width: 50mm; text-align: left; border-left: .3mm solid #C9A45C; padding-left: 3.4mm; }
.info .lb { font-size: 5.6pt; letter-spacing: .22em; color: #9C7A2E; font-weight: 600; margin-top: 1.7mm; }
.info .lb:first-child { margin-top: 0; }
.info .vl { font-family: 'Cormorant Garamond'; font-size: 11pt; font-weight: 600; color: #0B1A3A; line-height: 1.2; }
.kaki { position: absolute; left: 0; right: 0; bottom: -4.8mm; text-align: center; font-size: 5.7pt; letter-spacing: .06em; color: #6B7487; }
.kaki b { color: #8A6A2A; font-weight: 600; }
</style></head><body>
<svg class="latar" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
  <defs>
    ${polaPita()}
    <linearGradient id="navy" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#13284F"/><stop offset=".55" stop-color="#0B1A3A"/><stop offset="1" stop-color="#091530"/></linearGradient>
    <radialGradient id="kertas" cx=".5" cy=".42" r=".75"><stop offset="0" stop-color="#FFFDF7"/><stop offset=".7" stop-color="#FBF6EA"/><stop offset="1" stop-color="#F3EBD6"/></radialGradient>
    <linearGradient id="navyGel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0B1A3A"/><stop offset=".6" stop-color="#13284F"/><stop offset="1" stop-color="#1C3766"/></linearGradient>
    <pattern id="damask" width="9" height="9" patternUnits="userSpaceOnUse"><path d="M4.5 1.2 L5.4 4.5 L4.5 7.8 L3.6 4.5 Z" fill="#C9A45C" opacity=".05"/><circle cx="0" cy="0" r=".35" fill="#C9A45C" opacity=".12"/><circle cx="9" cy="9" r=".35" fill="#C9A45C" opacity=".12"/><circle cx="9" cy="0" r=".35" fill="#C9A45C" opacity=".12"/><circle cx="0" cy="9" r=".35" fill="#C9A45C" opacity=".12"/></pattern>
    <linearGradient id="emas" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E9D195"/><stop offset=".3" stop-color="#C9A45C"/><stop offset=".55" stop-color="#F1DDA6"/><stop offset=".8" stop-color="#B88E3E"/><stop offset="1" stop-color="#9C7A2E"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#navy)"/>
  <rect width="${W}" height="${H}" fill="url(#pita)"/>
  <rect x="7.2" y="7.2" width="${W - 14.4}" height="${H - 14.4}" fill="none" stroke="url(#emas)" stroke-width="0.45"/>
  <rect x="9" y="9" width="${W - 18}" height="${H - 18}" fill="url(#kertas)"/>
  <rect x="9" y="9" width="${W - 18}" height="${H - 18}" fill="url(#damask)"/>
  ${[0, 1].map((k) => `<g ${k ? `transform="rotate(180 ${W / 2} ${H / 2})"` : ''}>
    <path d="M9 9 H82 C62 13 34 27 9 60 Z" fill="url(#navyGel)"/>
    <path d="M9 9 H66 C50 13 28 24 9 48 Z" fill="#0B1A3A" opacity=".5"/>
    <path d="M86 9 C65 14 36 29 9 64" fill="none" stroke="url(#emas)" stroke-width="0.9"/>
    <path d="M91 9 C69 15 39 32 9 69" fill="none" stroke="#C9A45C" stroke-width="0.3"/>
    <path d="M96 9 C73 16 42 35 9 74" fill="none" stroke="#C9A45C" stroke-width="0.15" opacity=".7"/>
    <g fill="none" stroke="#C9A45C" stroke-width="0.12" opacity=".35"><path d="M60 9 C46 13 27 23 9 44"/><path d="M52 9 C40 13 24 21 9 38"/><path d="M44 9 C34 12 21 19 9 32"/></g>
  </g>`).join('')}
  ${pohon(17, 14, 15.5, 0.3)}${pohon(W - 32.5, H - 31.5, 15.5, 0.3)}
  <g opacity=".11" fill="none" stroke="#B88E3E" stroke-width="0.14">${rosetBesar.map((d) => `<path d="${d}"/>`).join('')}</g>
  <g opacity=".05" transform="translate(${W / 2 - 63} 70) scale(0.9)">${gedung()}</g>
  <rect x="10.2" y="10.2" width="${W - 20.4}" height="${H - 20.4}" fill="none" stroke="#C9A45C" stroke-width="0.55" stroke-dasharray="0 1.25" stroke-linecap="round" opacity=".9"/>
  <rect x="11.6" y="11.6" width="${W - 23.2}" height="${H - 23.2}" fill="none" stroke="url(#emas)" stroke-width="0.7"/>
  <rect x="13.4" y="13.4" width="${W - 26.8}" height="${H - 26.8}" fill="none" stroke="#C9A45C" stroke-width="0.22"/>
  ${sudut(W - 15.6, 15.6, -1, 1)}
</svg>
<div class="isi">
  <div class="kop">${LOGO}<div class="t"><div>KEMENTERIAN HUKUM REPUBLIK INDONESIA</div><div>KANTOR WILAYAH SUMATERA UTARA</div><div class="b">BALAI HARTA PENINGGALAN MEDAN</div></div></div>
  <div class="judul"><span class="hias"><i></i><b></b></span><svg class="judulsvg" viewBox="0 0 200 22" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="foil" x1="0" y1="0" x2="1" y2="0.35"><stop offset="0" stop-color="#7E5F22"/><stop offset=".18" stop-color="#C9A45C"/><stop offset=".34" stop-color="#F6E7B8"/><stop offset=".5" stop-color="#B88E3E"/><stop offset=".68" stop-color="#E9D195"/><stop offset=".85" stop-color="#A9853A"/><stop offset="1" stop-color="#7E5F22"/></linearGradient></defs><text x="100" y="18.2" text-anchor="middle" font-family="Cinzel" font-weight="700" font-size="20.5" letter-spacing="6.2" fill="url(#foil)" stroke="#6B4F1B" stroke-width="0.12">SERTIFIKAT</text></svg><span class="hias kanan"><b></b><i></i></span></div>
  <div class="sub-judul">CERTIFICATE OF PARTICIPATION</div>
  <div class="nomor">NOMOR ${esc(nomor)}</div>
  <div class="beri">Diberikan dengan hormat kepada</div>
  <div class="nama"><span id="nm">${esc(nama)}</span></div>
  ${''}<svg class="sulur" viewBox="0 0 140 8" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="url(#emas2)" stroke-linecap="round"><path d="M4 4 H58" stroke-width="0.35"/><path d="M136 4 H82" stroke-width="0.35"/><path d="M58 4 C62 4 63 1 66 1.2 C68.6 1.4 68.4 4 70 4 C71.6 4 71.4 1.4 74 1.2 C77 1 78 4 82 4" stroke-width="0.4"/><path d="M58 4 C62 4 63 7 66 6.8 C68.6 6.6 68.4 4 70 4 C71.6 4 71.4 6.6 74 6.8 C77 7 78 4 82 4" stroke-width="0.4"/></g><rect x="68.6" y="2.6" width="2.8" height="2.8" transform="rotate(45 70 4)" fill="url(#emas2)"/><circle cx="4" cy="4" r=".7" fill="#C9A45C"/><circle cx="136" cy="4" r=".7" fill="#C9A45C"/><defs><linearGradient id="emas2" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="140" y2="0"><stop offset="0" stop-color="#E9D195" stop-opacity=".2"/><stop offset=".3" stop-color="#C9A45C"/><stop offset=".5" stop-color="#9C7A2E"/><stop offset=".7" stop-color="#C9A45C"/><stop offset="1" stop-color="#E9D195" stop-opacity=".2"/></linearGradient></defs></svg>
  <div class="sebagai">atas peran sertanya sebagai <span class="peran">PESERTA</span> dalam</div>
  <div class="acara">WEBINAR PENGAMPUAN</div>
  <div class="tema">&#8220;Menjaga yang Tak Lagi Mampu, Melindungi Hak yang Tetap Ada&#8221;</div>
  <div class="subtema">Pengampuan sebagai Pencegah Sengketa Harta Keluarga</div>
  <div class="waktu"><span>SELASA, 24 NOVEMBER 2026</span><b></b><span>09.30 S.D. 12.00 WIB</span><b></b><span>BALAI HARTA PENINGGALAN MEDAN &amp; ZOOM MEETING</span></div>
  <div class="bawah">
    ${segel()}
    <div class="ttd"><div class="tgl">Medan, 24 November 2026</div><div class="jab">Kepala Balai Harta Peninggalan Medan,</div><div class="qr">${qrSvg}</div><div class="nm">Syafriadi Lubis</div></div>
    
    <div class="kaki">Sertifikat elektronik resmi Balai Harta Peninggalan Medan. Keaslian dapat diperiksa dengan memindai kode QR atau melalui <b>${esc(urlVerifikasi)}</b></div>
  </div>
</div>
<script>
(async () => {
  await document.fonts.ready;
  const s = document.getElementById('nm'), box = s.parentElement;
  let fs = 33;
  while (s.scrollWidth > box.clientWidth && fs > 18) { fs -= 0.5; s.style.fontSize = fs + 'pt'; }
  document.body.dataset.siap = '1';
})();
</script>
</body></html>`;
}
