// Dipakai oleh alat/buat-logo.mjs dan alat/latar-mewah.mjs.
// Logo Pengayoman geometris (viewBox 167 x 183, sama dengan gambar acuan)
export const pohonD = [
  'M60.25 36 A22.75 22.75 0 0 1 105.75 36',
  'M34.5 58 A21.75 21.75 0 0 1 78 58 V157',
  'M11.5 81 A26.75 23 0 0 1 65 81 V154.5 H30',
  'M65 81 V75 A13 13 0 0 1 78 62',
  'M131.5 58 A21.75 21.75 0 0 0 88 58 V157',
  'M154.5 81 A26.75 23 0 0 0 101 81 V154.5 H136',
  'M101 81 V75 A13 13 0 0 0 88 62',
].join(' ');
export const logoSvg = (opsi = {}) => {
  const { latar = '#1F1F57', warna = '#FFF307', teks = true, ukuran = 167 } = opsi;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 167 183" width="${ukuran}" height="${ukuran * 183 / 167}">
  ${latar ? `<rect width="167" height="183" rx="7" fill="${latar}"/>` : ''}
  <path d="${pohonD}" fill="none" stroke="${warna}" stroke-width="6.5" stroke-linejoin="miter" stroke-linecap="butt"/>
  ${teks ? `<text x="83" y="172.3" text-anchor="middle" font-family="Inter" font-weight="800" font-size="14" fill="${warna}" textLength="104.5" lengthAdjust="spacingAndGlyphs">PENGAYOMAN</text>` : ''}
</svg>`;
};
