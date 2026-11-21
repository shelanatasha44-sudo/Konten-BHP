// Membuat gambar latar desain sertifikat premium bercorak Pengayoman dan tenun ulos Batak (tanpa teks).
// Jalankan: node alat/latar-mewah.mjs  -> menulis public/desain/<nama>.jpg
// Daerah teks (tengah, kop di atas, keterangan QR di kiri bawah, pengesahan di tengah bawah) dibiarkan lapang,
// karena teks digambar oleh public/js/sertifikat.js.
import { createRequire } from 'node:module';
import { pohonD } from './logo.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');

const W = 1122, H = 794, CX = W / 2, S = 2.5;
const f = (n) => +n.toFixed(2);

// ---------- unsur dasar ----------
// pohon Pengayoman (logo baru, viewBox 167 x 183; pohonnya sendiri kira-kira x 8..158, y 10..158)
const pohon = (cx, cy, tinggi, warna, op = 1) => {
  const sk = tinggi / 148;
  return `<g opacity="${op}" transform="translate(${f(cx - 83 * sk)} ${f(cy - 84 * sk)}) scale(${f(sk)})"><path d="${pohonD}" fill="none" stroke="${warna}" stroke-width="6.5"/></g>`;
};
// pohon timbul (bayangan dan kilap) untuk tanda air
const pohonTimbul = (cx, cy, t, warna, op) =>
  pohon(cx + 1.3, cy + 1.5, t, '#000000', op * 0.3) + pohon(cx - 0.9, cy - 1, t, '#FFFFFF', op * 1.2) + pohon(cx, cy, t, warna, op);

// roset guilloche
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

// medali sudut berisi pohon Pengayoman
const medali = (cx, cy, r, dasar, emas, pohonWarna) => `
  <circle cx="${cx}" cy="${cy}" r="${r + 6}" fill="none" stroke="${emas}" stroke-width=".7"/>
  <circle cx="${cx}" cy="${cy}" r="${r + 3}" fill="none" stroke="${emas}" stroke-width=".4" stroke-dasharray="1 2"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${dasar}" stroke="${emas}" stroke-width="1.8" filter="url(#bayang)"/>
  <circle cx="${cx}" cy="${cy}" r="${r - 4}" fill="none" stroke="${emas}" stroke-width=".5"/>
  ${pohon(cx, cy + 1, r * 1.08, pohonWarna)}`;

// pita tenun ulos: garis tepi, deretan segitiga (ipon-ipon), dan belah ketupat bersusun.
// Digambar satu per satu agar motif pas di setiap sisi tanpa sambungan.
function pitaUlos(x, y, panjang, tinggi, tegak, w) {
  const u = tinggi * 0.95; // lebar satu motif
  const n = Math.max(1, Math.round(panjang / u)), du = panjang / n;
  const g = [];
  const titik = (a, b) => (tegak ? `${f(x + b)} ${f(y + a)}` : `${f(x + a)} ${f(y + b)}`); // a sepanjang pita, b melintang
  const kotak = (a, b, pa, pb, isi, op = 1) => (tegak ? `<rect x="${f(x + b)}" y="${f(y + a)}" width="${f(pb)}" height="${f(pa)}" fill="${isi}" opacity="${op}"/>` : `<rect x="${f(x + a)}" y="${f(y + b)}" width="${f(pa)}" height="${f(pb)}" fill="${isi}" opacity="${op}"/>`);
  g.push(kotak(0, 0, panjang, tinggi, w.dasar));
  // garis tenun halus melintang
  [0.2, 0.8].forEach((p) => g.push(kotak(0, tinggi * p - 0.5, panjang, 1, w.garis, 0.9)));
  [0.13, 0.87].forEach((p) => g.push(kotak(0, tinggi * p - 0.3, panjang, 0.6, w.emas, 0.8)));
  // ipon-ipon (segitiga) di kedua tepi
  const s = tinggi * 0.1, ns = Math.round(panjang / (s * 1.6)), ds = panjang / ns;
  let d = '';
  for (let i = 0; i < ns; i++) {
    const a = i * ds;
    d += `M${titik(a, 0)} L${titik(a + ds / 2, s)} L${titik(a + ds, 0)} Z `;
    d += `M${titik(a, tinggi)} L${titik(a + ds / 2, tinggi - s)} L${titik(a + ds, tinggi)} Z `;
  }
  g.push(`<path d="${d}" fill="${w.emas}"/>`);
  // motif tengah pita, berbeda untuk tiap desain
  const t = tinggi / 2, hb = tinggi * 0.26, lt = f(tinggi * 0.045);
  const m = w.motif || 'ragidup';
  if (m === 'ragidup') {
    // belah ketupat bersusun dengan titik tengah, diselingi silang kecil (ulos Ragidup)
    let dk = '', dkIsi = '', dsl = '';
    for (let i = 0; i < n; i++) {
      const a = i * du + du / 2, lb = du * 0.36, l2 = lb * 0.5, h2 = hb * 0.5, c = i * du, k = tinggi * 0.07;
      dk += `M${titik(a - lb, t)} L${titik(a, t - hb)} L${titik(a + lb, t)} L${titik(a, t + hb)} Z `;
      dkIsi += `M${titik(a - l2, t)} L${titik(a, t - h2)} L${titik(a + l2, t)} L${titik(a, t + h2)} Z `;
      dsl += `M${titik(c - k, t - k)} L${titik(c + k, t + k)} M${titik(c - k, t + k)} L${titik(c + k, t - k)} `;
    }
    g.push(`<path d="${dk}" fill="none" stroke="${w.emas}" stroke-width="${lt}"/><path d="${dkIsi}" fill="${w.aksen}"/><path d="${dsl}" stroke="${w.emas}" stroke-width="${f(tinggi * 0.035)}" fill="none"/>`);
  } else if (m === 'sadum') {
    // dua garis zigzag sejajar dengan belah ketupat kecil di setiap puncak (ulos Sadum)
    let z1 = '', z2 = '', dot = '';
    for (let i = 0; i <= n * 2; i++) {
      const a = i * du / 2, atas = i % 2 === 0;
      z1 += (i ? 'L' : 'M') + titik(a, atas ? t - hb : t + hb) + ' ';
      z2 += (i ? 'L' : 'M') + titik(a, atas ? t - hb * 0.35 : t + hb * 0.35) + ' ';
      const pb = atas ? t + hb * 0.62 : t - hb * 0.62, r = tinggi * 0.07;
      dot += `M${titik(a - r, pb)} L${titik(a, pb - r)} L${titik(a + r, pb)} L${titik(a, pb + r)} Z `;
    }
    g.push(`<path d="${z1}" fill="none" stroke="${w.emas}" stroke-width="${lt}" stroke-linejoin="miter"/><path d="${z2}" fill="none" stroke="${w.aksen}" stroke-width="${f(tinggi * 0.03)}"/><path d="${dot}" fill="${w.emas}"/>`);
  } else if (m === 'hotang') {
    // dua untai rotan yang saling berjalin dengan mata di tengah (ulos Ragi Hotang)
    let u1 = '', u2 = '', mata = '';
    const N = Math.round(panjang / 1.5);
    for (let i = 0; i <= N; i++) {
      const a = panjang * i / N, sn = Math.sin(Math.PI * 2 * a / du);
      u1 += (i ? 'L' : 'M') + titik(a, t + hb * sn) + ' ';
      u2 += (i ? 'L' : 'M') + titik(a, t - hb * sn) + ' ';
    }
    for (let i = 0; i < n * 2; i++) { const a = du / 4 + i * du / 2, [px, py] = titik(a, t).split(' '); mata += `<circle cx="${px}" cy="${py}" r="${f(tinggi * 0.075)}" fill="${w.aksen}" stroke="${w.emas}" stroke-width="${f(tinggi * 0.02)}"/>`; }
    g.push(`<path d="${u1}" fill="none" stroke="${w.emas}" stroke-width="${f(tinggi * 0.07)}"/><path d="${u2}" fill="none" stroke="${w.emas}" stroke-width="${f(tinggi * 0.07)}"/><path d="${u1}" fill="none" stroke="${w.dasar}" stroke-width="${f(tinggi * 0.025)}"/><path d="${u2}" fill="none" stroke="${w.dasar}" stroke-width="${f(tinggi * 0.025)}"/>${mata}`);
  } else if (m === 'gorga') {
    // sulur pilin berpasangan yang berjalan sepanjang pita (gorga simeol-meol)
    let d = '';
    for (let i = 0; i < n; i++) {
      const a = i * du + du / 2, r = hb * 0.95, arah = i % 2 ? 1 : -1;
      const [x1, y1] = titik(a - du * 0.24, t).split(' ').map(Number), [x2, y2] = titik(a + du * 0.24, t).split(' ').map(Number);
      d += pilin(x1, y1, r, 1.15, arah, tegak ? 0 : -Math.PI / 2) + ' ' + pilin(x2, y2, r, 1.15, arah, tegak ? Math.PI : Math.PI / 2) + ' ';
      d += `M${titik(a - du * 0.24, t - r * (tegak ? 0 : 1))} C${titik(a - du * 0.05, t - r)} ${titik(a + du * 0.05, t + r)} ${titik(a + du * 0.24, t + r * (tegak ? 0 : 1))} `;
    }
    g.push(`<path d="${d}" fill="none" stroke="${w.emas}" stroke-width="${f(tinggi * 0.05)}" stroke-linecap="round"/>`);
  }
  // bingkai emas tipis pita
  g.push(tegak ? `<rect x="${x}" y="${y}" width="${tinggi}" height="${panjang}" fill="none" stroke="${w.emas}" stroke-width=".9"/>` : `<rect x="${x}" y="${y}" width="${panjang}" height="${tinggi}" fill="none" stroke="${w.emas}" stroke-width=".9"/>`);
  return g.join('');
}
// empat sisi pita ulos mengelilingi bidang (m = jarak dari tepi kertas)
const bingkaiUlos = (m, h, w) => pitaUlos(m, m, W - 2 * m, h, false, w) + pitaUlos(m, H - m - h, W - 2 * m, h, false, w)
  + pitaUlos(m, m + h, H - 2 * m - 2 * h, h, true, w) + pitaUlos(W - m - h, m + h, H - 2 * m - 2 * h, h, true, w);

// sulur gorga Batak (simeol-meol): sulur melengkung dengan ujung pilin
function pilin(cx, cy, r0, putaran, arah, mulai) {
  let d = '';
  const N = 90;
  for (let i = 0; i <= N; i++) {
    const t = i / N, sudut = mulai + arah * t * putaran * Math.PI * 2, r = r0 * (1 - 0.82 * t);
    d += (i ? 'L' : 'M') + f(cx + r * Math.cos(sudut)) + ' ' + f(cy + r * Math.sin(sudut));
  }
  return d;
}
function gorga(x, y, sx, sy, w, skala = 1) {
  const p = (dx, dy) => [x + sx * dx * skala, y + sy * dy * skala];
  const k = (dx, dy) => p(dx, dy).map(f).join(' ');
  const arah = sx * sy;
  const [a1, b1] = p(58, 22), [a2, b2] = p(22, 58), [a3, b3] = p(44, 44);
  const sudut = (dx, dy) => Math.atan2(sy * dy, sx * dx);
  return `<g fill="none" stroke-linecap="round">
    <path d="M${k(4, 4)} C${k(30, 2)} ${k(52, 6)} ${k(58, 22)}" stroke="${w.emas}" stroke-width="${2.2 * skala}"/>
    <path d="M${k(4, 4)} C${k(2, 30)} ${k(6, 52)} ${k(22, 58)}" stroke="${w.emas}" stroke-width="${2.2 * skala}"/>
    <path d="${pilin(a1, b1, 10 * skala, 1.3, arah, sudut(-1, 0))}" stroke="${w.emas}" stroke-width="${1.6 * skala}"/>
    <path d="${pilin(a2, b2, 10 * skala, 1.3, -arah, sudut(0, -1))}" stroke="${w.emas}" stroke-width="${1.6 * skala}"/>
    <path d="M${k(8, 8)} C${k(24, 14)} ${k(34, 26)} ${k(40, 40)}" stroke="${w.merah}" stroke-width="${1.6 * skala}"/>
    <path d="${pilin(a3, b3, 7 * skala, 1.2, arah, sudut(-1, -1))}" stroke="${w.merah}" stroke-width="${1.4 * skala}"/>
    <path d="M${k(10, 4)} C${k(30, 8)} ${k(44, 12)} ${k(50, 20)}" stroke="${w.putih}" stroke-width="${0.8 * skala}" opacity=".9"/>
    <path d="M${k(4, 10)} C${k(8, 30)} ${k(12, 44)} ${k(20, 50)}" stroke="${w.putih}" stroke-width="${0.8 * skala}" opacity=".9"/>
  </g>
  <rect x="${-3.5 * skala}" y="${-3.5 * skala}" width="${7 * skala}" height="${7 * skala}" fill="${w.emas}" transform="translate(${k(4, 4).replace(' ', ' ')}) rotate(45)"/>`;
}

// rumbai ulos (benang ujung kain) di tepi atas dan bawah
function rumbai(y, arah, panjang, warna) {
  let d = '';
  for (let x = 30; x <= W - 30; x += 3.2) d += `M${f(x)} ${y} v${arah * (panjang - ((x * 7) % 3))} `;
  return `<path d="${d}" stroke="${warna}" stroke-width=".9" opacity=".75"/>`;
}

const emasDef = (id, a = ['#EED9A0', '#B8923A', '#F7E7B4', '#A57E2B', '#E0C27C', '#9C7426']) =>
  `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="${H}">${a.map((w, i) => `<stop offset="${f(i / (a.length - 1))}" stop-color="${w}"/>`).join('')}</linearGradient>`;
const kertasDef = (id, a, b, c) => `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${CX}" cy="${H * 0.46}" r="${W * 0.62}"><stop offset="0" stop-color="${a}"/><stop offset=".6" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></radialGradient>`;
const pengamanDef = (id, warna) => `<pattern id="${id}" width="44" height="16" patternUnits="userSpaceOnUse"><g fill="none" stroke="${warna}" stroke-width=".35"><path d="M0 8 C11 0 22 0 33 8 S 44 16 55 8"/><path d="M-11 8 C0 16 11 16 22 8 S 33 0 44 8"/></g></pattern>`;
// tekstur kertas halus dan bayangan lembut
const efekDef = `
  <filter id="serat" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .38  0 0 0 0 .25  0 0 0 .5 0"/></filter>
  <filter id="bayang" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1.2" stdDeviation="1.4" flood-color="#000" flood-opacity=".28"/></filter>
  <filter id="bayangPanel" x="-5%" y="-5%" width="110%" height="110%"><feDropShadow dx="0" dy="2" stdDeviation="5" flood-color="#000" flood-opacity=".35"/></filter>`;
const serat = (op = 0.18) => `<rect width="${W}" height="${H}" filter="url(#serat)" opacity="${op}"/>`;


// ---------- motif tenun sebagai tanda air timbul (berbeda tiap desain) ----------
// isi satu ubin motif; digambar tiga kali (bayangan, kilap, dasar) agar tampak timbul seperti cap pada kertas
const UBIN = {
  ragidup: [48, 48, (c) => `<g fill="none" stroke="${c}" stroke-width=".9">
      <path d="M24 4 L44 24 L24 44 L4 24 Z"/><path d="M24 12 L36 24 L24 36 L12 24 Z"/>
      <path d="M0 0 L5 5 M48 0 L43 5 M0 48 L5 43 M48 48 L43 43"/></g>
      <path d="M24 19 L29 24 L24 29 L19 24 Z" fill="${c}"/>`],
  sadum: [36, 26, (c) => `<g fill="none" stroke="${c}" stroke-width=".9" stroke-linejoin="miter">
      <path d="M0 9 L9 3 L18 9 L27 3 L36 9"/><path d="M0 17 L9 23 L18 17 L27 23 L36 17"/></g>
      <path d="M18 10.5 L20.5 13 L18 15.5 L15.5 13 Z M0 10.5 L2.5 13 L0 15.5 Z M36 10.5 L33.5 13 L36 15.5 Z" fill="${c}"/>`],
  hotang: [34, 34, (c) => `<g fill="none" stroke="${c}" stroke-width="1">
      <path d="M0 8.5 C8.5 0 8.5 0 17 8.5 S25.5 17 34 8.5"/><path d="M0 8.5 C8.5 17 8.5 17 17 8.5 S25.5 0 34 8.5"/>
      <path d="M8.5 17 C0 25.5 0 25.5 8.5 34"/><path d="M8.5 17 C17 25.5 17 25.5 8.5 34"/>
      <path d="M25.5 17 C17 25.5 17 25.5 25.5 34"/><path d="M25.5 17 C34 25.5 34 25.5 25.5 34"/></g>`],
  gorga: [60, 36, (c) => {
    // gelombang dengan pilin bergantian di atas dan di bawah (sulur gorga), dipisah garis halus
    let d = 'M0 18';
    for (let x = 0; x <= 60; x += 1.5) d += ` L${f(x)} ${f(18 - 5 * Math.sin(Math.PI * 2 * x / 60))}`;
    return `<g fill="none" stroke="${c}" stroke-width=".9" stroke-linecap="round">
      <path d="${d}"/>
      <path d="${pilin(15, 7.5, 5.5, 1.25, 1, Math.PI / 2)}"/><path d="${pilin(45, 28.5, 5.5, 1.25, 1, -Math.PI / 2)}"/>
      <path d="M0 .5 H60 M0 35.5 H60" stroke-width=".5" stroke-dasharray="1.5 2.5"/></g>`;
  }],
};
function tandaAirMotif(id, nama, warna, kuat = 0.09, x = 0, y = 0, lebar = W, tinggi = H) {
  const [uw, uh, isi] = UBIN[nama];
  const pola = (pid, c, dx, dy) => `<pattern id="${pid}" width="${uw}" height="${uh}" patternUnits="userSpaceOnUse" patternTransform="translate(${f(CX - uw / 2 + dx)} ${f(400 - uh / 2 + dy)})">${isi(c)}</pattern>`;
  return `<defs>${pola(id + 'g', '#000000', .7, .8)}${pola(id + 'k', '#FFFFFF', -.6, -.6)}${pola(id + 'd', warna, 0, 0)}
      <radialGradient id="${id}r" cx="50%" cy="50%" r="62%"><stop offset="0" stop-color="#fff" stop-opacity=".08"/><stop offset=".5" stop-color="#fff" stop-opacity=".22"/><stop offset=".8" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></radialGradient>
      <mask id="${id}m"><rect x="${x}" y="${y}" width="${lebar}" height="${tinggi}" fill="url(#${id}r)"/></mask></defs>
    <g mask="url(#${id}m)">
      <rect x="${x}" y="${y}" width="${lebar}" height="${tinggi}" fill="url(#${id}g)" opacity="${f(kuat * 0.55)}"/>
      <rect x="${x}" y="${y}" width="${lebar}" height="${tinggi}" fill="url(#${id}k)" opacity="${f(kuat * 2.2)}"/>
      <rect x="${x}" y="${y}" width="${lebar}" height="${tinggi}" fill="url(#${id}d)" opacity="${f(kuat)}"/>
    </g>`;
}

// ---------- 1. PENGAYOMAN ULOS EMAS (unggulan) ----------
const w1 = { dasar: '#1A2350', garis: '#7A1626', emas: 'url(#e1)', aksen: '#E9D39A', motif: 'ragidup' };
const pengayoman = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>${kertasDef('k1', '#FFFEF8', '#FAF4E4', '#EFE3C6')}${emasDef('e1')}${pengamanDef('p1', '#C2A465')}${efekDef}
    <radialGradient id="sinar1" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#EAD49B" stop-opacity=".34"/><stop offset="1" stop-color="#EAD49B" stop-opacity="0"/></radialGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#k1)"/>${serat(.16)}
  ${tandaAirMotif('t1', 'ragidup', '#B8923A', .085, 56, 56, W - 112, H - 112)}
  <ellipse cx="${CX}" cy="400" rx="340" ry="255" fill="url(#sinar1)"/>
  <g fill="none" stroke="#B8923A" stroke-width=".35" opacity=".2">${roset(CX, 400, 178, 7, 3, 24)}</g>
  ${pohonTimbul(CX, 402, 330, '#B8923A', .085)}
  <rect x="8" y="8" width="${W - 16}" height="${H - 16}" fill="none" stroke="url(#e1)" stroke-width="2.6"/>
  <rect x="13" y="13" width="${W - 26}" height="${H - 26}" fill="none" stroke="url(#e1)" stroke-width=".6"/>
  <g filter="url(#bayang)">${bingkaiUlos(20, 30, w1)}</g>
  <rect x="56" y="56" width="${W - 112}" height="${H - 112}" fill="none" stroke="url(#e1)" stroke-width="1.6"/>
  <rect x="61" y="61" width="${W - 122}" height="${H - 122}" fill="none" stroke="url(#e1)" stroke-width=".5"/>
  ${[[35, 35], [W - 35, 35], [35, H - 35], [W - 35, H - 35]].map(([x, y]) => medali(x, y, 24, '#1A2350', 'url(#e1)', '#F0D78E')).join('')}
</svg>`;

// ---------- 2. NAVY AGUNG RAGIDUP ----------
const w2 = { motif: 'sadum', dasar: '#121A3E', garis: '#9C1C2E', emas: 'url(#e2)', aksen: '#F2DFA6', merah: '#B02A3A', putih: '#F4EBD6' };
const agung = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>${kertasDef('k2', '#FFFFFC', '#FAF6EC', '#EFE8D6')}${emasDef('e2')}${pengamanDef('p2', '#9AA9CC')}${efekDef}
    <linearGradient id="navy2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#18224D"/><stop offset=".5" stop-color="#24306E"/><stop offset="1" stop-color="#121A3E"/></linearGradient>
    <pattern id="kisi2" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0 H14 M0 0 V14" stroke="#C9A24C" stroke-width=".45" opacity=".5"/></pattern></defs>
  <rect width="${W}" height="${H}" fill="url(#navy2)"/>
  <rect width="${W}" height="${H}" fill="url(#kisi2)"/>
  ${bingkaiUlos(14, 26, w2)}
  <g filter="url(#bayangPanel)"><rect x="50" y="50" width="${W - 100}" height="${H - 100}" fill="url(#k2)"/></g>
  ${tandaAirMotif('t2', 'sadum', '#1F2A5A', .07, 50, 50, W - 100, H - 100)}
  <g fill="none" stroke="#B8923A" stroke-width=".35" opacity=".15">${roset(CX, 400, 168, 6, 3, 22)}</g>
  ${pohonTimbul(CX, 402, 310, '#1F2A5A', .05)}
  <rect x="50" y="50" width="${W - 100}" height="${H - 100}" fill="none" stroke="url(#e2)" stroke-width="2"/>
  <rect x="56" y="56" width="${W - 112}" height="${H - 112}" fill="none" stroke="url(#e2)" stroke-width=".6"/>
  ${gorga(60, 60, 1, 1, w2, .95)}${gorga(W - 60, 60, -1, 1, w2, .95)}
  ${[[27, 27], [W - 27, 27], [27, H - 27], [W - 27, H - 27]].map(([x, y]) => medali(x, y, 20, '#121A3E', 'url(#e2)', '#F0D78E')).join('')}
</svg>`;

// ---------- 3. ULOS MARUN KENCANA ----------
const w3 = { dasar: '#6B0F1E', garis: '#151515', emas: 'url(#e3)', aksen: '#F4EAD5', motif: 'hotang' };
const marun = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>${kertasDef('k3', '#FFFDF7', '#F9F1E2', '#EEDFC4')}${emasDef('e3', ['#EFD8A0', '#BF9545', '#F7E5B3', '#A87E31', '#DDBB72', '#9A7228'])}${pengamanDef('p3', '#C39488')}${efekDef}</defs>
  <rect width="${W}" height="${H}" fill="url(#k3)"/>${serat(.16)}
  ${tandaAirMotif('t3', 'hotang', '#85192C', .075, 50, 50, W - 100, H - 100)}
  <g fill="none" stroke="#9C2A3A" stroke-width=".35" opacity=".12">${roset(CX, 400, 172, 5, 3, 22)}</g>
  ${pohonTimbul(CX, 402, 320, '#85192C', .05)}
  ${rumbai(9, -1, 0, '#000')}
  <g filter="url(#bayang)">${bingkaiUlos(16, 34, w3)}</g>
  <rect x="10" y="10" width="${W - 20}" height="${H - 20}" fill="none" stroke="url(#e3)" stroke-width="1.6"/>
  <rect x="56" y="56" width="${W - 112}" height="${H - 112}" fill="none" stroke="url(#e3)" stroke-width="1.4"/>
  <rect x="61" y="61" width="${W - 122}" height="${H - 122}" fill="none" stroke="#6B0F1E" stroke-width=".6" opacity=".6"/>
  ${[[33, 33], [W - 33, 33], [33, H - 33], [W - 33, H - 33]].map(([x, y]) => medali(x, y, 22, '#151515', 'url(#e3)', '#F0D78E')).join('')}
</svg>`;

// ---------- 4. GORGA SITOLU BOLIT (hitam, merah, putih, emas) ----------
const w4 = { motif: 'gorga', dasar: '#141414', garis: '#A3192C', emas: 'url(#e4)', aksen: '#F2EAD8', merah: '#B5202F', putih: '#F2EAD8' };
const gorgaD = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>${kertasDef('k4', '#FFFEFA', '#F8F4EA', '#ECE4D2')}${emasDef('e4')}${pengamanDef('p4', '#B9A88C')}${efekDef}
    <linearGradient id="hitam4" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1C1C1C"/><stop offset=".5" stop-color="#2A2622"/><stop offset="1" stop-color="#121212"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#hitam4)"/>
  ${bingkaiUlos(10, 22, w4)}
  <g filter="url(#bayangPanel)"><rect x="44" y="44" width="${W - 88}" height="${H - 88}" fill="url(#k4)"/></g>
  ${tandaAirMotif('t4', 'gorga', '#3A2E1A', .075, 44, 44, W - 88, H - 88)}
  <g fill="none" stroke="#8A6A2A" stroke-width=".35" opacity=".15">${roset(CX, 400, 170, 8, 3, 22)}</g>
  ${pohonTimbul(CX, 402, 320, '#3A2E1A', .045)}
  <rect x="44" y="44" width="${W - 88}" height="${H - 88}" fill="none" stroke="url(#e4)" stroke-width="2.2"/>
  <rect x="50" y="50" width="${W - 100}" height="${H - 100}" fill="none" stroke="#A3192C" stroke-width=".9"/>
  <rect x="54" y="54" width="${W - 108}" height="${H - 108}" fill="none" stroke="url(#e4)" stroke-width=".5"/>
  ${gorga(56, 56, 1, 1, w4, 1.05)}${gorga(W - 56, 56, -1, 1, w4, 1.05)}
  ${[[21, 21], [W - 21, 21], [21, H - 21], [W - 21, H - 21]].map(([x, y]) => medali(x, y, 16, '#141414', 'url(#e4)', '#F0D78E')).join('')}
</svg>`;

const keluar = new URL('../public/desain/', import.meta.url);
const b = await chromium.launch();
for (const [nama, svg] of [['pengayoman', pengayoman], ['agung', agung], ['marun', marun], ['gorga', gorgaD]]) {
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: S });
  await p.setContent(`<html><body style="margin:0">${svg}</body></html>`);
  await p.screenshot({ path: new URL(nama + '.jpg', keluar).pathname, type: 'jpeg', quality: 86 });
  await p.close();
}
await b.close();
console.log('ok');
