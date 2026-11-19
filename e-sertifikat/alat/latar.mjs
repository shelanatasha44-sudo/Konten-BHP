// Membuat gambar latar desain sertifikat (tanpa teks) untuk web e-sertifikat
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/npm-tools/node_modules/playwright');

const W = 1122, H = 794, CX = W / 2, S = 2.5;
const f = (n) => +n.toFixed(2);
const [pohonT, pohonD] = fs.readFileSync(new URL('./pohon.txt', import.meta.url), 'utf8').split('\n');
// tanda air pohon Pengayoman (viewBox logo 1760 x 1984)
const tandaAir = (warna, op, tinggi = 300, cy = 405) => {
  const sk = tinggi / 1984, w = 1760 * sk;
  return `<g opacity="${op}" transform="translate(${f(CX - w / 2)} ${f(cy - tinggi / 2)}) scale(${sk})"><g transform="${pohonT}"><path d="${pohonD}" fill="${warna}"/></g></g>`;
};

// ---------- GADING EMAS ----------
function sudutGading(x, y, sx, sy) {
  const s = (dx, dy) => `${f(x + sx * dx)} ${f(y + sy * dy)}`;
  return `<g fill="none" stroke="url(#emas)">
    <path d="M${s(0, 74)} L${s(0, 0)} L${s(74, 0)}" stroke-width="1.5"/>
    <path d="M${s(10, 48)} L${s(10, 10)} L${s(48, 10)}" stroke-width=".7"/>
    <path d="M${s(74, 0)} C${s(88, 0)} ${s(94, 8)} ${s(88, 14)} C${s(83, 19)} ${s(76, 12)} ${s(82, 8)}" stroke-width=".9"/>
    <path d="M${s(0, 74)} C${s(0, 88)} ${s(8, 94)} ${s(14, 88)} C${s(19, 83)} ${s(12, 76)} ${s(8, 82)}" stroke-width=".9"/>
    <rect x="-3.5" y="-3.5" width="7" height="7" fill="url(#emas)" stroke="none" transform="translate(${s(10, 10)}) rotate(45)"/>
  </g>`;
}
const gading = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="dasar" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#FFFDF9"/><stop offset=".6" stop-color="#FBF6EE"/><stop offset="1" stop-color="#F3EADD"/></radialGradient>
    <linearGradient id="emas" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="${H}"><stop offset="0" stop-color="#D9BC84"/><stop offset=".3" stop-color="#C7A465"/><stop offset=".55" stop-color="#E6CF9F"/><stop offset=".8" stop-color="#B8925A"/><stop offset="1" stop-color="#D6B87F"/></linearGradient>
    <filter id="kabur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="46"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#dasar)"/>
  <g filter="url(#kabur)">
    <ellipse cx="70" cy="60" rx="240" ry="150" fill="#EBCFC6" opacity=".75"/>
    <ellipse cx="250" cy="20" rx="160" ry="70" fill="#EEDFC2" opacity=".7"/>
    <ellipse cx="${W - 60}" cy="${H - 50}" rx="250" ry="150" fill="#EBCFC6" opacity=".7"/>
    <ellipse cx="${W - 260}" cy="${H - 10}" rx="170" ry="70" fill="#EEDFC2" opacity=".75"/>
    <ellipse cx="${W - 40}" cy="40" rx="130" ry="80" fill="#EEDFC2" opacity=".55"/>
    <ellipse cx="40" cy="${H - 40}" rx="130" ry="80" fill="#EEDFC2" opacity=".55"/>
  </g>
  ${tandaAir('#B8925A', .05)}
  <g fill="none" stroke="url(#emas)">
    <rect x="26" y="26" width="${W - 52}" height="${H - 52}" stroke-width="1.5"/>
    <rect x="34" y="34" width="${W - 68}" height="${H - 68}" stroke-width=".6"/>
  </g>
  ${sudutGading(48, 48, 1, 1)}${sudutGading(W - 48, 48, -1, 1)}${sudutGading(48, H - 48, 1, -1)}${sudutGading(W - 48, H - 48, -1, -1)}
</svg>`;

// ---------- BIRU RESMI ----------
const NAVY = '#1F2A5A', NAVY2 = '#2F3E7E', EMAS = '#C9A13B';
function selempang(sx, sy) {
  // segitiga navy bersusun dengan garis emas di dua sudut berseberangan
  const x0 = sx > 0 ? 0 : W, y0 = sy > 0 ? 0 : H;
  const p = (dx, dy) => `${f(x0 + sx * dx)},${f(y0 + sy * dy)}`;
  return `<polygon points="${p(0, 0)} ${p(250, 0)} ${p(0, 171)}" fill="${NAVY}"/>
    <polygon points="${p(0, 0)} ${p(190, 0)} ${p(0, 130)}" fill="${NAVY2}"/>
    <polygon points="${p(0, 0)} ${p(125, 0)} ${p(0, 86)}" fill="${NAVY}"/>
    <line x1="${f(x0 + sx * 276)}" y1="${y0}" x2="${x0}" y2="${f(y0 + sy * 189)}" stroke="${EMAS}" stroke-width="1.6"/>
    <line x1="${f(x0 + sx * 290)}" y1="${y0}" x2="${x0}" y2="${f(y0 + sy * 198)}" stroke="${EMAS}" stroke-width=".7" opacity=".8"/>`;
}
function siku(x, y, sx, sy) {
  const s = (dx, dy) => `${f(x + sx * dx)} ${f(y + sy * dy)}`;
  return `<g fill="none" stroke="${EMAS}"><path d="M${s(0, 56)} L${s(0, 0)} L${s(56, 0)}" stroke-width="1.6"/><path d="M${s(8, 34)} L${s(8, 8)} L${s(34, 8)}" stroke-width=".8"/></g>
    <rect x="-3.5" y="-3.5" width="7" height="7" fill="${EMAS}" transform="translate(${s(8, 8)}) rotate(45)"/>`;
}
// garis gelombang halus (guilloche) di pita atas dan bawah
function gelombang(yTengah, amp, n) {
  let g = '';
  for (let k = 0; k < n; k++) {
    let d = '';
    for (let x = 40; x <= W - 40; x += 6) {
      const y = yTengah + amp * Math.sin(x / 38 + k * 0.55) * Math.cos(x / 170 + k * 0.2);
      d += (x === 40 ? 'M' : 'L') + x + ' ' + f(y);
    }
    g += `<path d="${d}" fill="none" stroke="${NAVY}" stroke-width=".45"/>`;
  }
  return g;
}
const biru = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="dasar" cx="50%" cy="45%" r="78%"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".65" stop-color="#F8FAFD"/><stop offset="1" stop-color="#EDF1F8"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#dasar)"/>
  <g opacity=".07">${gelombang(H - 58, 9, 7)}</g>
  ${tandaAir(NAVY, .035)}
  <rect x="24" y="24" width="${W - 48}" height="${H - 48}" fill="none" stroke="${NAVY}" stroke-width="2"/>
  <rect x="31" y="31" width="${W - 62}" height="${H - 62}" fill="none" stroke="${EMAS}" stroke-width=".9"/>
  ${selempang(1, 1)}${selempang(-1, -1)}
  ${siku(W - 46, 46, -1, 1)}${siku(46, H - 46, 1, -1)}
</svg>`;


// ---------- ELEGAN NAVY (panel samping) ----------
const PANEL = 330;
function rosetBesar(cx, cy) {
  let d = '';
  const n = 60;
  for (let i = 0; i <= n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2, r = i % 2 ? 36 : 39.5;
    d += (i ? 'L' : 'M') + f(cx + r * Math.cos(a)) + ' ' + f(cy + r * Math.sin(a));
  }
  let sinar = '';
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, r1 = 8, r2 = i % 2 ? 15 : 20;
    sinar += `<line x1="${f(cx + r1 * Math.cos(a))}" y1="${f(cy + r1 * Math.sin(a))}" x2="${f(cx + r2 * Math.cos(a))}" y2="${f(cy + r2 * Math.sin(a))}" stroke="url(#emasE)" stroke-width="${i % 2 ? .8 : 1.3}"/>`;
  }
  return `<g filter="url(#bayangan)"><path d="${d}Z" fill="url(#emasE)"/></g>
    <circle cx="${cx}" cy="${cy}" r="31" fill="none" stroke="#7A5A1E" stroke-width=".6" opacity=".7"/>
    <circle cx="${cx}" cy="${cy}" r="27.5" fill="url(#navyE)"/>
    <circle cx="${cx}" cy="${cy}" r="24.5" fill="none" stroke="url(#emasE)" stroke-width=".9"/>
    ${sinar}
    <path d="M${cx} ${cy - 6} L${cx + 6} ${cy} L${cx} ${cy + 6} L${cx - 6} ${cy} Z" fill="url(#emasE)"/>`;
}
function gelombangTegak(n) {
  let g = '';
  for (let k = 0; k < n; k++) {
    let d = '';
    for (let y = 0; y <= H; y += 5) {
      const x = 40 + k * 20 + 10 * Math.sin(y / 34 + k * 0.7) * Math.cos(y / 150 + k * 0.3);
      d += (y === 0 ? 'M' : 'L') + f(x) + ' ' + y;
    }
    g += `<path d="${d}" fill="none" stroke="#E3C77A" stroke-width=".5"/>`;
  }
  return g;
}
const elegan = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="kertas" cx="62%" cy="45%" r="70%"><stop offset="0" stop-color="#FFFEFB"/><stop offset=".7" stop-color="#FAF6EE"/><stop offset="1" stop-color="#F2EBDD"/></radialGradient>
    <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#27346F"/><stop offset=".55" stop-color="#1D275A"/><stop offset="1" stop-color="#121A43"/></linearGradient>
    <linearGradient id="navyE" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2B3878"/><stop offset="1" stop-color="#151E4A"/></linearGradient>
    <linearGradient id="emasE" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F6E3A8"/><stop offset=".35" stop-color="#D4AF5A"/><stop offset=".6" stop-color="#F1D892"/><stop offset="1" stop-color="#A9822F"/></linearGradient>
    <linearGradient id="garisTegak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D4AF5A" stop-opacity=".2"/><stop offset=".5" stop-color="#E9CF8A"/><stop offset="1" stop-color="#D4AF5A" stop-opacity=".2"/></linearGradient>
    <pattern id="garisHalus" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="9" stroke="#C9A13B" stroke-width=".35"/></pattern>
    <filter id="bayangan" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-color="#000" flood-opacity=".35"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#kertas)"/>
  <rect x="${PANEL}" width="${W - PANEL}" height="${H}" fill="url(#garisHalus)" opacity=".05"/>
  <g transform="translate(${(PANEL + W) / 2 - CX} 0)">${tandaAir('#B8925A', .045, 330, 400)}</g>
  <rect width="${PANEL}" height="${H}" fill="url(#panel)"/>
  <g opacity=".1">${gelombangTegak(14)}</g>
  <rect x="${PANEL}" y="0" width="2.4" height="${H}" fill="url(#garisTegak)"/>
  <rect x="${PANEL + 7}" y="0" width=".8" height="${H}" fill="url(#garisTegak)"/>
  <rect x="${PANEL + 26}" y="24" width="${W - PANEL - 50}" height="${H - 48}" fill="none" stroke="#D4AF5A" stroke-width="1.1"/>
  <rect x="${PANEL + 32}" y="30" width="${W - PANEL - 62}" height="${H - 60}" fill="none" stroke="#D4AF5A" stroke-width=".5" opacity=".8"/>
  ${[[W - 24, 24, -1, 1], [W - 24, H - 24, -1, -1]].map(([x, y, sx, sy]) => `<path d="M${x + sx * 0} ${y + sy * 30} L${x} ${y} L${x + sx * 30} ${y}" fill="none" stroke="#D4AF5A" stroke-width="2.2"/><rect x="-3" y="-3" width="6" height="6" fill="#D4AF5A" transform="translate(${x + sx * 10} ${y + sy * 10}) rotate(45)"/>`).join('')}
  <rect x="22" y="22" width="${PANEL - 44}" height="${H - 44}" fill="none" stroke="#D4AF5A" stroke-width=".6" opacity=".55"/>
  ${rosetBesar(PANEL + 1, 452)}
</svg>`;


// ---------- RESMI (navy emas, bingkai meander) ----------
function meanderDatar(x0, x1, y) {
  // deretan kunci Yunani di pita mendatar (tinggi 12)
  let d = '';
  for (let x = x0; x + 11 <= x1; x += 13) d += `M${f(x + 1)} ${f(y + 10.5)} V${f(y + 1.5)} H${f(x + 10)} V${f(y + 8.5)} H${f(x + 4)} V${f(y + 4.5)} H${f(x + 7)} V${f(y + 6.5)} `;
  return d;
}
function meanderTegak(y0, y1, x) {
  let d = '';
  for (let y = y0; y + 11 <= y1; y += 13) d += `M${f(x + 10.5)} ${f(y + 1)} H${f(x + 1.5)} V${f(y + 10)} H${f(x + 8.5)} V${f(y + 4)} H${f(x + 4.5)} V${f(y + 7)} H${f(x + 6.5)} `;
  return d;
}
function rosetHalus(cx, cy) {
  let g = '';
  for (let k = 0; k < 3; k++) {
    let d = '';
    const R = 150 - k * 22, r = 9 + k * 1.5, dd = 70 - k * 14;
    for (let i = 0; i <= 2400; i++) {
      const t = (i / 2400) * Math.PI * 2 * 5;
      const x = cx + (R - r) * Math.cos(t) + dd * Math.cos(((R - r) / r) * t);
      const y = cy + (R - r) * Math.sin(t) - dd * Math.sin(((R - r) / r) * t);
      d += (i ? 'L' : 'M') + f(x) + ' ' + f(y);
    }
    g += `<path d="${d}"/>`;
  }
  return g;
}
const pitaX0 = 26, pitaY0 = 26, pitaX1 = W - 26, pitaY1 = H - 26; // tepi luar pita meander
const resmi = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="kertasR" cx="50%" cy="44%" r="75%"><stop offset="0" stop-color="#FFFFFD"/><stop offset=".65" stop-color="#FBF8F0"/><stop offset="1" stop-color="#F3EEE1"/></radialGradient>
    <linearGradient id="emasR" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="${H}"><stop offset="0" stop-color="#D8B970"/><stop offset=".25" stop-color="#B8923A"/><stop offset=".5" stop-color="#E4CB8C"/><stop offset=".75" stop-color="#A9842F"/><stop offset="1" stop-color="#D2B068"/></linearGradient>
    <pattern id="pengaman" width="44" height="16" patternUnits="userSpaceOnUse">
      <g fill="none" stroke="#9AA9CC" stroke-width=".35">
        <path d="M0 8 C11 0 22 0 33 8 S 44 16 55 8"/><path d="M-11 8 C0 16 11 16 22 8 S 33 0 44 8"/>
      </g>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#kertasR)"/>
  <rect x="58" y="58" width="${W - 116}" height="${H - 116}" fill="url(#pengaman)" opacity=".16"/>
  <g fill="none" stroke="#B8923A" stroke-width=".35" opacity=".13">${rosetHalus(CX, 395)}</g>
  ${tandaAir('#1F2A5A', .035, 310, 400)}
  <rect x="14" y="14" width="${W - 28}" height="${H - 28}" fill="none" stroke="#1F2A5A" stroke-width="2.2"/>
  <rect x="19" y="19" width="${W - 38}" height="${H - 38}" fill="none" stroke="url(#emasR)" stroke-width=".8"/>
  <rect x="${pitaX0}" y="${pitaY0}" width="${pitaX1 - pitaX0}" height="${pitaY1 - pitaY0}" fill="none" stroke="url(#emasR)" stroke-width="1.1"/>
  <rect x="${pitaX0 + 14}" y="${pitaY0 + 14}" width="${pitaX1 - pitaX0 - 28}" height="${pitaY1 - pitaY0 - 28}" fill="none" stroke="url(#emasR)" stroke-width="1.1"/>
  <g fill="none" stroke="url(#emasR)" stroke-width="1" stroke-linecap="square">
    <path d="${meanderDatar(pitaX0 + 18, pitaX1 - 18, pitaY0 + 1)}"/>
    <path d="${meanderDatar(pitaX0 + 18, pitaX1 - 18, pitaY1 - 13)}"/>
    <path d="${meanderTegak(pitaY0 + 18, pitaY1 - 18, pitaX0 + 1)}"/>
    <path d="${meanderTegak(pitaY0 + 18, pitaY1 - 18, pitaX1 - 13)}"/>
  </g>
  ${[[pitaX0, pitaY0], [pitaX1 - 14, pitaY0], [pitaX0, pitaY1 - 14], [pitaX1 - 14, pitaY1 - 14]].map(([x, y]) => `<rect x="${x}" y="${y}" width="14" height="14" fill="#1F2A5A" stroke="url(#emasR)" stroke-width="1"/><rect x="-3" y="-3" width="6" height="6" fill="url(#emasR)" transform="translate(${x + 7} ${y + 7}) rotate(45)"/>`).join('')}
  <rect x="${pitaX0 + 20}" y="${pitaY0 + 20}" width="${pitaX1 - pitaX0 - 40}" height="${pitaY1 - pitaY0 - 40}" fill="none" stroke="#1F2A5A" stroke-width=".5" opacity=".55"/>
</svg>`;

const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
for (const [nama, svg] of [['resmi', resmi], ['gading', gading]]) {
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: S });
  await p.setContent(`<html><body style="margin:0">${svg}</body></html>`);
  await p.screenshot({ path: `/tmp/${nama}.png` });
  await p.close();
}
await b.close();
console.log('ok');
