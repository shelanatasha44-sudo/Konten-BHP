// Membuat gambar latar desain sertifikat bercorak Pengayoman (tanpa teks).
// Jalankan: node alat/latar-mewah.mjs  -> menulis public/desain/<nama>.jpg
// Bagian tengah dan bawah dibiarkan lapang karena teks digambar oleh public/js/sertifikat.js.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const W = 1122, H = 794, CX = W / 2, S = 2.5;
const f = (n) => +n.toFixed(2);
const [pohonT, pohonD] = fs.readFileSync(new URL('./pohon.txt', import.meta.url), 'utf8').split('\n');

// pohon Pengayoman (viewBox logo 1760 x 1984) dengan titik tengah cx, cy dan tinggi tertentu
const pohon = (cx, cy, tinggi, isi, op = 1, extra = '') => {
  const sk = tinggi / 1984, w = 1760 * sk;
  return `<g opacity="${op}" transform="translate(${f(cx - w / 2)} ${f(cy - tinggi / 2)}) scale(${f(sk)})" ${extra}><g transform="${pohonT}"><path d="${pohonD}" fill="${isi}"/></g></g>`;
};
// pohon timbul: bayangan, kilap, lalu isi, sehingga tampak seperti cap emas
const pohonTimbul = (cx, cy, t, isi, op) =>
  pohon(cx + 1.2, cy + 1.4, t, '#000', op * 0.35) + pohon(cx - 0.8, cy - 0.9, t, '#FFFFFF', op * 0.9) + pohon(cx, cy, t, isi, op);

// roset guilloche halus
function roset(cx, cy, R0, putaran = 5, lapis = 3, langkah = 22) {
  let g = '';
  for (let k = 0; k < lapis; k++) {
    let d = '';
    const R = R0 - k * langkah, r = 9 + k * 1.5, dd = R * 0.46 - k * 9;
    for (let i = 0; i <= 2400; i++) {
      const t = (i / 2400) * Math.PI * 2 * putaran;
      const x = cx + (R - r) * Math.cos(t) + dd * Math.cos(((R - r) / r) * t);
      const y = cy + (R - r) * Math.sin(t) - dd * Math.sin(((R - r) / r) * t);
      d += (i ? 'L' : 'M') + f(x) + ' ' + f(y);
    }
    g += `<path d="${d}"/>`;
  }
  return g;
}

// medali sudut: lingkaran bertingkat dengan pohon Pengayoman di dalamnya
const medali = (cx, cy, r, dasar, emas, pohonWarna) => `
  <circle cx="${cx}" cy="${cy}" r="${r + 5}" fill="none" stroke="${emas}" stroke-width=".8"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${dasar}" stroke="${emas}" stroke-width="1.6"/>
  <circle cx="${cx}" cy="${cy}" r="${r - 4}" fill="none" stroke="${emas}" stroke-width=".5" stroke-dasharray="1.2 2.2"/>
  ${pohon(cx, cy + 1, r * 1.32, pohonWarna)}`;

// pola pita berisi pohon Pengayoman kecil berselang belah ketupat
const polaPohon = (id, ukuran, pohonWarna, aksen) => `
  <pattern id="${id}" width="${ukuran}" height="${ukuran}" patternUnits="userSpaceOnUse">
    ${pohon(ukuran / 2, ukuran / 2, ukuran * 0.62, pohonWarna)}
    <rect x="-2" y="-2" width="4" height="4" fill="${aksen}" transform="rotate(45)"/>
    <rect x="${ukuran - 2}" y="-2" width="4" height="4" fill="${aksen}" transform="rotate(45 ${ukuran} 0)"/>
    <rect x="-2" y="${ukuran - 2}" width="4" height="4" fill="${aksen}" transform="rotate(45 0 ${ukuran})"/>
    <rect x="${ukuran - 2}" y="${ukuran - 2}" width="4" height="4" fill="${aksen}" transform="rotate(45 ${ukuran} ${ukuran})"/>
  </pattern>`;

const emasDef = (id, a = ['#E9D39A', '#B8923A', '#F3E2AE', '#A7802C', '#DDBE77']) =>
  `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="${H}">${a.map((w, i) => `<stop offset="${i / (a.length - 1)}" stop-color="${w}"/>`).join('')}</linearGradient>`;
const kertasDef = (id, a, b, c) => `<radialGradient id="${id}" cx="50%" cy="46%" r="75%"><stop offset="0" stop-color="${a}"/><stop offset=".62" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></radialGradient>`;
const pengamanDef = (id, warna) => `<pattern id="${id}" width="44" height="16" patternUnits="userSpaceOnUse"><g fill="none" stroke="${warna}" stroke-width=".35"><path d="M0 8 C11 0 22 0 33 8 S 44 16 55 8"/><path d="M-11 8 C0 16 11 16 22 8 S 33 0 44 8"/></g></pattern>`;

// sulur emas di tengah tepi atas dan bawah
const sulur = (y, arah, emas) => {
  const s = (dx, dy) => `${f(CX + dx)} ${f(y + arah * dy)}`;
  const sisi = (m) => `<path d="M${s(m * 18, 0)} C${s(m * 46, 0)} ${s(m * 60, arah * 0 + 10)} ${s(m * 82, 8)} C${s(m * 104, 6)} ${s(m * 112, -4)} ${s(m * 100, -8)} C${s(m * 92, -11)} ${s(m * 86, -3)} ${s(m * 92, 1)}" />
    <path d="M${s(m * 82, 8)} C${s(m * 120, 12)} ${s(m * 150, 4)} ${s(m * 190, 2)}" stroke-width=".7"/>`;
  return `<g fill="none" stroke="${emas}" stroke-width="1.1" stroke-linecap="round">${sisi(1)}${sisi(-1)}</g>
    <rect x="-4" y="-4" width="8" height="8" fill="${emas}" transform="translate(${CX} ${y}) rotate(45)"/>`;
};

// ---------- 1. PENGAYOMAN EMAS (unggulan) ----------
const pengayoman = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>${kertasDef('k1', '#FFFEF9', '#FBF6E9', '#F1E7CF')}${emasDef('e1')}${pengamanDef('p1', '#C9AE6E')}
    ${polaPohon('pp1', 26, '#B8923A', '#D9BC78')}
    <radialGradient id="sinar1" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#E9D39A" stop-opacity=".38"/><stop offset="1" stop-color="#E9D39A" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#k1)"/>
  <rect x="64" y="64" width="${W - 128}" height="${H - 128}" fill="url(#p1)" opacity=".2"/>
  <ellipse cx="${CX}" cy="400" rx="330" ry="250" fill="url(#sinar1)"/>
  <g fill="none" stroke="#B8923A" stroke-width=".35" opacity=".2">${roset(CX, 400, 175, 7, 3, 24)}</g>
  ${pohonTimbul(CX, 404, 360, '#B8923A', .075)}
  <rect x="12" y="12" width="${W - 24}" height="${H - 24}" fill="none" stroke="url(#e1)" stroke-width="3"/>
  <rect x="20" y="20" width="${W - 40}" height="${H - 40}" fill="none" stroke="url(#e1)" stroke-width=".8"/>
  <rect x="26" y="26" width="${W - 52}" height="26" fill="url(#pp1)" opacity=".55"/>
  <rect x="26" y="${H - 52}" width="${W - 52}" height="26" fill="url(#pp1)" opacity=".55"/>
  <rect x="26" y="52" width="26" height="${H - 104}" fill="url(#pp1)" opacity=".55"/>
  <rect x="${W - 52}" y="52" width="26" height="${H - 104}" fill="url(#pp1)" opacity=".55"/>
  <rect x="26" y="26" width="${W - 52}" height="${H - 52}" fill="none" stroke="url(#e1)" stroke-width="1"/>
  <rect x="52" y="52" width="${W - 104}" height="${H - 104}" fill="none" stroke="url(#e1)" stroke-width="1.4"/>
  <rect x="57" y="57" width="${W - 114}" height="${H - 114}" fill="none" stroke="url(#e1)" stroke-width=".5"/>
  ${[[52, 52], [W - 52, 52], [52, H - 52], [W - 52, H - 52]].map(([x, y]) => medali(x, y, 24, '#FFFBF0', 'url(#e1)', '#A7802C')).join('')}
  ${sulur(57, 1, 'url(#e1)')}
</svg>`;

// ---------- 2. NAVY AGUNG ----------
const agung = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>${kertasDef('k2', '#FFFFFD', '#FAF7EF', '#F0EADB')}${emasDef('e2')}${pengamanDef('p2', '#9AA9CC')}
    ${polaPohon('pp2', 30, '#C9A24C', '#8E7330')}
    <linearGradient id="navy2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1B2550"/><stop offset=".5" stop-color="#253170"/><stop offset="1" stop-color="#161E44"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#navy2)"/>
  <rect width="${W}" height="${H}" fill="url(#pp2)" opacity=".3"/>
  <rect x="58" y="58" width="${W - 116}" height="${H - 116}" fill="url(#k2)"/>
  <rect x="66" y="66" width="${W - 132}" height="${H - 132}" fill="url(#p2)" opacity=".16"/>
  <g fill="none" stroke="#B8923A" stroke-width=".35" opacity=".14">${roset(CX, 400, 165, 6, 3, 22)}</g>
  ${pohonTimbul(CX, 400, 320, '#1F2A5A', .04)}
  <rect x="10" y="10" width="${W - 20}" height="${H - 20}" fill="none" stroke="url(#e2)" stroke-width="1.2"/>
  <rect x="50" y="50" width="${W - 100}" height="${H - 100}" fill="none" stroke="url(#e2)" stroke-width="2.4"/>
  <rect x="58" y="58" width="${W - 116}" height="${H - 116}" fill="none" stroke="url(#e2)" stroke-width=".9"/>
  <rect x="64" y="64" width="${W - 128}" height="${H - 128}" fill="none" stroke="#1F2A5A" stroke-width=".5" opacity=".5"/>
  ${[[50, 50], [W - 50, 50], [50, H - 50], [W - 50, H - 50]].map(([x, y]) => medali(x, y, 26, '#1F2A5A', 'url(#e2)', '#E3C77A')).join('')}
</svg>`;

// ---------- 3. MARUN KENCANA ----------
const marun = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>${kertasDef('k3', '#FFFDF8', '#FAF3E6', '#EFE2CB')}${emasDef('e3', ['#EBD49B', '#BE9443', '#F4E3B0', '#A97F31', '#DCBB72'])}${pengamanDef('p3', '#C79A8E')}
    <linearGradient id="mr3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6E1423"/><stop offset=".5" stop-color="#85192C"/><stop offset="1" stop-color="#5A0F1C"/></linearGradient>
    ${polaPohon('pp3', 22, '#E2C27A', '#E2C27A')}
  </defs>
  <rect width="${W}" height="${H}" fill="url(#k3)"/>
  <rect x="60" y="60" width="${W - 120}" height="${H - 120}" fill="url(#p3)" opacity=".18"/>
  <g fill="none" stroke="#9C2A3A" stroke-width=".35" opacity=".12">${roset(CX, 400, 170, 5, 3, 22)}</g>
  ${pohonTimbul(CX, 400, 340, '#85192C', .04)}
  <!-- pita marun di empat tepi -->
  <rect x="18" y="18" width="${W - 36}" height="30" fill="url(#mr3)"/><rect x="18" y="${H - 48}" width="${W - 36}" height="30" fill="url(#mr3)"/>
  <rect x="18" y="48" width="30" height="${H - 96}" fill="url(#mr3)"/><rect x="${W - 48}" y="48" width="30" height="${H - 96}" fill="url(#mr3)"/>
  <rect x="22" y="22" width="${W - 44}" height="22" fill="url(#pp3)" opacity=".55"/><rect x="22" y="${H - 44}" width="${W - 44}" height="22" fill="url(#pp3)" opacity=".55"/>
  <rect x="22" y="44" width="22" height="${H - 88}" fill="url(#pp3)" opacity=".55"/><rect x="${W - 44}" y="44" width="22" height="${H - 88}" fill="url(#pp3)" opacity=".55"/>
  <rect x="14" y="14" width="${W - 28}" height="${H - 28}" fill="none" stroke="url(#e3)" stroke-width="2"/>
  <rect x="18" y="18" width="${W - 36}" height="${H - 36}" fill="none" stroke="url(#e3)" stroke-width=".8"/>
  <rect x="48" y="48" width="${W - 96}" height="${H - 96}" fill="none" stroke="url(#e3)" stroke-width="1.6"/>
  <rect x="55" y="55" width="${W - 110}" height="${H - 110}" fill="none" stroke="url(#e3)" stroke-width=".6"/>
  ${[[33, 33], [W - 33, 33], [33, H - 33], [W - 33, H - 33]].map(([x, y]) => medali(x, y, 21, '#6E1423', 'url(#e3)', '#E9CF8A')).join('')}
  ${sulur(55, 1, 'url(#e3)')}
</svg>`;

// ---------- 4. ZAMRUD EMAS ----------
const zamrud = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>${kertasDef('k4', '#FFFFFB', '#F8F7EE', '#ECEBDC')}${emasDef('e4')}${pengamanDef('p4', '#8FB3A2')}
    <linearGradient id="zm4" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0D4A3A"/><stop offset=".5" stop-color="#14614C"/><stop offset="1" stop-color="#0A3B2E"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#k4)"/>
  <rect x="60" y="60" width="${W - 120}" height="${H - 120}" fill="url(#p4)" opacity=".18"/>
  <g fill="none" stroke="#14614C" stroke-width=".35" opacity=".13">${roset(CX, 400, 170, 8, 3, 22)}</g>
  ${pohonTimbul(CX, 400, 340, '#14614C', .045)}
  <!-- sudut segitiga zamrud dengan pohon emas -->
  ${[[0, 0, 1, 1], [W, 0, -1, 1], [0, H, 1, -1], [W, H, -1, -1]].map(([x, y, sx, sy]) => `
    <path d="M${x} ${y} H${x + sx * 160} L${x} ${y + sy * 112} Z" fill="url(#zm4)"/>
    <path d="M${x + sx * 160} ${y} L${x} ${y + sy * 112}" stroke="url(#e4)" stroke-width="2"/>
    <path d="M${x + sx * 174} ${y} L${x} ${y + sy * 122}" stroke="url(#e4)" stroke-width=".7"/>
    ${pohon(x + sx * 40, y + sy * 36, 44, '#E3C77A')}`).join('')}
  <rect x="16" y="16" width="${W - 32}" height="${H - 32}" fill="none" stroke="url(#e4)" stroke-width="1.6"/>
  <rect x="34" y="34" width="${W - 68}" height="${H - 68}" fill="none" stroke="url(#e4)" stroke-width=".7"/>
  <rect x="40" y="40" width="${W - 80}" height="${H - 80}" fill="none" stroke="#14614C" stroke-width="1.2" opacity=".6"/>
  ${sulur(40, 1, 'url(#e4)')}
</svg>`;

const keluar = new URL('../public/desain/', import.meta.url);
const b = await chromium.launch();
for (const [nama, svg] of [['pengayoman', pengayoman], ['agung', agung], ['marun', marun], ['zamrud', zamrud]]) {
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: S });
  await p.setContent(`<html><body style="margin:0">${svg}</body></html>`);
  await p.screenshot({ path: new URL(nama + '.jpg', keluar).pathname, type: 'jpeg', quality: 86 });
  await p.close();
}
await b.close();
console.log('ok');
