/* Penggambar sertifikat (kanvas A4 mendatar) dan pembuat PDF. Bergantung pada lib/qrcode.js dan lib/jspdf.umd.min.js */
(function () {
  const W = 1122, H = 794, CX = W / 2;
  const TEMA = {
    elegan: {
      model: 'panel', latar: '/desain/elegan.jpg',
      judul: '#1F2A5A', teks: '#1F2A44', lembut: '#4A5578', redup: '#6B7490', acara: '#1F2A5A', peran: '#9A7A2A', nomor: '#9A7A2A',
      aksen: '#C9A13B', bingkaiQr: '#D4AF5A', panel1: '#C9D1EC', panel2: '#E3C77A',
    },
    gading: {
      latar: '/desain/gading.jpg',
      foil: ['#E9D3A2', '#C9A465', '#A8823F', '#CFAE70', '#9A7535'],
      kop1: '#8A786B', kop2: '#3A2E2A', aksen: '#C7A465', teks: '#3A2E2A', lembut: '#6B5D57', redup: '#857A73',
      acara: '#9C7A45', peran: '#A6766A', nomor: '#9C7A45', bingkaiQr: '#C7A465',
    },
    biru: {
      latar: '/desain/biru.jpg',
      judul: '#1F2A5A',
      kop1: '#55607F', kop2: '#1F2A5A', aksen: '#C9A13B', teks: '#1F2A44', lembut: '#4A5578', redup: '#6B7490',
      acara: '#1F2A5A', peran: '#9A7A2A', nomor: '#9A7A2A', bingkaiQr: '#1F2A5A',
    },
  };

  const muatGambar = (() => {
    const cache = {};
    return (src) => cache[src] || (cache[src] = new Promise((ok, gagal) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => { delete cache[src]; gagal(new Error('Gambar gagal dimuat')); };
      i.src = src;
    }));
  })();

  let hurufSiap = null;
  function siapkanHuruf() {
    if (!hurufSiap) {
      hurufSiap = Promise.all([
        '600 20px Cinzel', '700 20px Cinzel', 'italic 500 20px "Cormorant Garamond"', 'italic 600 20px "Cormorant Garamond"',
        '400 20px Inter', '500 20px Inter', '600 20px Inter',
      ].map((f) => document.fonts.load(f))).catch(() => {});
    }
    return hurufSiap;
  }

  // ---------- alat menggambar teks ----------
  function lebar(ctx, teks, jarak) {
    if (!jarak) return ctx.measureText(teks).width;
    let w = 0;
    for (const c of teks) w += ctx.measureText(c).width;
    return w + jarak * Math.max(0, [...teks].length - 1);
  }
  function tulis(ctx, teks, x, y, o) {
    o = o || {};
    let ukuran = o.ukuran;
    const huruf = (u) => `${o.gaya || ''} ${o.tebal || 400} ${u}px ${o.keluarga}`.trim();
    ctx.font = huruf(ukuran);
    let w = lebar(ctx, teks, o.jarak || 0);
    if (o.maks && w > o.maks) {
      ukuran = Math.max(o.min || ukuran * 0.5, ukuran * o.maks / w);
      ctx.font = huruf(ukuran);
      w = lebar(ctx, teks, (o.jarak || 0) * ukuran / o.ukuran);
    }
    const jarak = (o.jarak || 0) * ukuran / o.ukuran;
    let x0 = o.rata === 'kiri' ? x : o.rata === 'kanan' ? x - w : x - w / 2;
    ctx.fillStyle = o.warna || '#000';
    if (o.foil) {
      const g = ctx.createLinearGradient(0, y - ukuran * 0.8, 0, y + ukuran * 0.1);
      o.foil.forEach((c, i) => g.addColorStop(i / (o.foil.length - 1), c));
      ctx.fillStyle = g;
    }
    ctx.textBaseline = 'alphabetic';
    if (!jarak) ctx.fillText(teks, x0, y);
    else for (const c of teks) { ctx.fillText(c, x0, y); x0 += ctx.measureText(c).width + jarak; }
    return { lebar: w, ukuran, kiri: o.rata === 'kiri' ? x : o.rata === 'kanan' ? x - w : x - w / 2 };
  }
  function bungkus(ctx, teks, maks) {
    const kata = teks.split(' '), baris = [];
    let b = '';
    for (const k of kata) {
      const coba = b ? b + ' ' + k : k;
      if (ctx.measureText(coba).width > maks && b) { baris.push(b); b = k; } else b = coba;
    }
    if (b) baris.push(b);
    return baris;
  }
  // membagi teks menjadi 2 baris yang panjangnya seimbang (bila perlu)
  function bungkusSeimbang(ctx, teks, maks) {
    if (ctx.measureText(teks).width <= maks) return [teks];
    const k = teks.split(' ');
    let terbaik = null, nilai = Infinity;
    for (let i = 1; i < k.length; i++) {
      const a = k.slice(0, i).join(' '), b = k.slice(i).join(' ');
      const w = Math.max(ctx.measureText(a).width, ctx.measureText(b).width);
      if (w < nilai) { nilai = w; terbaik = [a, b]; }
    }
    return terbaik && nilai <= maks ? terbaik : bungkus(ctx, teks, maks);
  }
  function belahKetupat(ctx, x, y, r, warna) {
    ctx.save(); ctx.fillStyle = warna; ctx.beginPath();
    ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function pemisah(ctx, y, panjang, warna) {
    const a = CX - panjang / 2, b = CX + panjang / 2;
    for (const [x1, x2, kiri] of [[a, CX - 12, true], [CX + 12, b, false]]) {
      const g = ctx.createLinearGradient(x1, 0, x2, 0);
      g.addColorStop(kiri ? 0 : 1, warna + '00'); g.addColorStop(kiri ? 1 : 0, warna);
      ctx.strokeStyle = g; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
    }
    belahKetupat(ctx, CX, y, 5, warna);
  }
  function gambarQr(ctx, teks, x, y, sisi, warna) {
    const q = qrcode(0, 'M'); q.addData(teks); q.make();
    const n = q.getModuleCount(), s = sisi / n;
    ctx.fillStyle = warna;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) ctx.fillRect(x + c * s, y + r * s, s + 0.15, s + 0.15);
  }

  // ---------- bagian bersama ----------
  function kalimatPeran(ctx, acara, peserta, t, x, y, rata) {
    const peran = (peserta.peran || acara.peran || 'Peserta').toUpperCase();
    const pola = acara.kalimat || 'atas partisipasinya sebagai {peran} dalam';
    const [awal, akhir] = pola.split('{peran}').concat('');
    const ada = /\{peran\}/.test(pola);
    const fA = 'italic 500 19.5px "Cormorant Garamond"';
    ctx.font = fA; const wA = ctx.measureText(awal).width, wC = ctx.measureText(akhir || '').width;
    ctx.font = '700 14.5px Cinzel'; const wP = lebar(ctx, peran, 1.2);
    let xi = rata === 'kiri' ? x : x - (wA + (ada ? wP : 0) + wC) / 2;
    ctx.font = fA; ctx.fillStyle = t.lembut; ctx.fillText(awal, xi, y); xi += wA;
    if (ada) { tulis(ctx, peran, xi, y, { keluarga: 'Cinzel', tebal: 700, ukuran: 14.5, jarak: 1.2, warna: t.peran, rata: 'kiri' }); xi += wP; }
    ctx.font = fA; ctx.fillStyle = t.lembut; ctx.fillText(akhir || '', xi, y);
  }
  function judulAcara(ctx, acara, t, x, y, maks, rata) {
    let uk = 22, baris;
    for (; uk >= 15; uk -= 1) { ctx.font = `700 ${uk}px Cinzel`; baris = bungkusSeimbang(ctx, (acara.judul || 'Nama Acara').toUpperCase(), maks); if (baris.length <= 2) break; }
    baris.slice(0, 2).forEach((b, i) => tulis(ctx, b, x, y + i * (uk + 8), { keluarga: 'Cinzel', tebal: 700, ukuran: uk, jarak: 0.8, warna: t.acara, maks: maks + 40, rata }));
    y += (Math.min(baris.length, 2) - 1) * (uk + 8);
    if (acara.tema) { y += 27; tulis(ctx, acara.tema, x, y, { keluarga: '"Cormorant Garamond"', gaya: 'italic', tebal: 600, ukuran: 18, warna: t.lembut, maks, rata }); }
    const info = [acara.tanggal, acara.tempat].filter(Boolean).map((s) => s.toUpperCase());
    if (info.length) {
      y += 26;
      ctx.font = '500 11.5px Inter';
      const lb = info.map((s) => lebar(ctx, s, 1.3)), sela = 26;
      let xi = rata === 'kiri' ? x : x - (lb.reduce((a, b) => a + b, 0) + sela * (info.length - 1)) / 2;
      info.forEach((s, i) => {
        tulis(ctx, s, xi, y, { keluarga: 'Inter', tebal: 500, ukuran: 11.5, jarak: 1.3, warna: t.redup, rata: 'kiri' });
        xi += lb[i];
        if (i < info.length - 1) { belahKetupat(ctx, xi + sela / 2, y - 4, 3.2, t.aksen); xi += sela; }
      });
    }
  }
  function tandaTangan(ctx, acara, t, posisi, ttd) {
    (acara.penandatangan || []).slice(0, 2).forEach((p, i) => {
      const cx = posisi[i], terakhir = i === Math.min(2, acara.penandatangan.length) - 1;
      if (terakhir && acara.tempatTanggal) tulis(ctx, acara.tempatTanggal, cx, 556, { keluarga: 'Inter', tebal: 500, ukuran: 12, warna: t.lembut, maks: 270 });
      ctx.font = '600 12.5px Inter';
      bungkusSeimbang(ctx, p.jabatan || '', 270).slice(0, 2).forEach((b, k) => tulis(ctx, b, cx, 576 + k * 16, { keluarga: 'Inter', tebal: 600, ukuran: 12.5, warna: t.teks, maks: 280 }));
      if (ttd[i]) {
        const im = ttd[i], mh = 66, mw = 200, r = Math.min(mw / im.width, mh / im.height);
        ctx.drawImage(im, cx - im.width * r / 2, 602 + (mh - im.height * r) / 2, im.width * r, im.height * r);
      }
      const n = tulis(ctx, p.nama || '', cx, 690, { keluarga: 'Inter', tebal: 600, ukuran: 13.5, warna: t.teks, maks: 280 });
      ctx.strokeStyle = t.teks; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(cx - n.lebar / 2, 694); ctx.lineTo(cx + n.lebar / 2, 694); ctx.stroke();
      if (p.nip) tulis(ctx, 'NIP. ' + p.nip, cx, 709, { keluarga: 'Inter', tebal: 400, ukuran: 11, warna: t.redup, maks: 280 });
    });
  }
  function kotakQr(ctx, peserta, opsi, t, cx, qy, sisi, warnaLabel, warnaKode) {
    const qx = cx - sisi / 2;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(qx, qy, sisi, sisi);
    ctx.strokeStyle = t.bingkaiQr; ctx.lineWidth = 1; ctx.strokeRect(qx, qy, sisi, sisi);
    gambarQr(ctx, opsi.tautan || (location.origin + '/v/' + (peserta.kode || 'CONTOH')), qx + 6, qy + 6, sisi - 12, '#1B1B1F');
    tulis(ctx, 'Pindai untuk cek keaslian', cx, qy + sisi + 16, { keluarga: 'Inter', tebal: 500, ukuran: 9.5, warna: warnaLabel || t.redup });
    tulis(ctx, peserta.kode ? kodeTampil(peserta.kode) : 'KODE-CONTOH', cx, qy + sisi + 30, { keluarga: 'Inter', tebal: 600, ukuran: 10, jarak: 1, warna: warnaKode || t.nomor });
    return { x: qx, y: qy, s: sisi };
  }

  // ---------- model tengah (Gading Emas, Biru Resmi) ----------
  function modelTengah(ctx, acara, peserta, opsi, t, logo, ttd) {
    ctx.drawImage(logo, CX - 29, 44, 58, 65.4);
    tulis(ctx, (acara.kop1 || '').toUpperCase(), CX, 132, { keluarga: 'Cinzel', tebal: 600, ukuran: 12, jarak: 2.4, warna: t.kop1, maks: 760 });
    tulis(ctx, (acara.kop2 || '').toUpperCase(), CX, 152, { keluarga: 'Cinzel', tebal: 700, ukuran: 15, jarak: 1.5, warna: t.kop2, maks: 760 });
    pemisah(ctx, 169, 300, t.aksen);
    tulis(ctx, (acara.judulSertifikat || 'SERTIFIKAT').toUpperCase(), CX, 226, { keluarga: 'Cinzel', tebal: 700, ukuran: 50, jarak: 12, warna: t.judul || t.teks, foil: t.foil, maks: 700 });
    if (peserta.nomor) tulis(ctx, 'Nomor: ' + peserta.nomor, CX, 252, { keluarga: 'Inter', tebal: 500, ukuran: 11.5, jarak: 0.6, warna: t.nomor, maks: 600 });
    tulis(ctx, acara.pembuka || 'diberikan kepada', CX, 294, { keluarga: '"Cormorant Garamond"', gaya: 'italic', tebal: 500, ukuran: 21, warna: t.lembut, maks: 700 });
    tulis(ctx, peserta.nama || 'Nama Peserta', CX, 350, { keluarga: '"Cormorant Garamond"', gaya: 'italic', tebal: 600, ukuran: 54, warna: t.teks, maks: 880, min: 26 });
    pemisah(ctx, 372, 520, t.aksen);
    kalimatPeran(ctx, acara, peserta, t, CX, 404, 'tengah');
    judulAcara(ctx, acara, t, CX, 440, 900, 'tengah');
    const n = Math.min(2, (acara.penandatangan || []).length);
    const pakaiQr = acara.tampilQr !== false && (peserta.kode || opsi.contoh);
    const posTtd = n >= 2 ? [282, 840] : n === 1 ? [pakaiQr ? 800 : CX] : [];
    tandaTangan(ctx, acara, t, posTtd, ttd);
    return pakaiQr ? kotakQr(ctx, peserta, opsi, t, n === 1 ? 322 : CX, 590, 92) : null;
  }

  // ---------- model panel (Elegan Navy) ----------
  function modelPanel(ctx, acara, peserta, opsi, t, logo, ttd) {
    const PX = 165, X0 = 396, MAKS = 650;
    ctx.drawImage(logo, PX - 35, 62, 70, 79);
    let y = 176;
    ctx.font = '600 11.5px Cinzel';
    bungkusSeimbang(ctx, (acara.kop1 || '').toUpperCase(), 230).slice(0, 3).forEach((b) => { tulis(ctx, b, PX, y, { keluarga: 'Cinzel', tebal: 600, ukuran: 11.5, jarak: 1.8, warna: t.panel1, maks: 250 }); y += 17; });
    ctx.strokeStyle = t.panel2; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(PX - 34, y - 2); ctx.lineTo(PX - 7, y - 2); ctx.moveTo(PX + 7, y - 2); ctx.lineTo(PX + 34, y - 2); ctx.stroke();
    belahKetupat(ctx, PX, y - 2, 3.5, t.panel2);
    y += 24;
    ctx.font = '700 15px Cinzel';
    bungkusSeimbang(ctx, (acara.kop2 || '').toUpperCase(), 240).slice(0, 3).forEach((b) => { tulis(ctx, b, PX, y, { keluarga: 'Cinzel', tebal: 700, ukuran: 15, jarak: 1.4, warna: t.panel2, maks: 255 }); y += 21; });

    tulis(ctx, (acara.judulSertifikat || 'SERTIFIKAT').toUpperCase(), X0 - 3, 128, { keluarga: 'Cinzel', tebal: 700, ukuran: 54, jarak: 10, warna: t.judul, rata: 'kiri', maks: MAKS });
    const g = ctx.createLinearGradient(X0, 0, X0 + 150, 0); g.addColorStop(0, t.aksen); g.addColorStop(1, t.aksen + '00');
    ctx.fillStyle = g; ctx.fillRect(X0, 146, 150, 2);
    belahKetupat(ctx, X0, 147, 4, t.aksen);
    if (peserta.nomor) tulis(ctx, 'Nomor: ' + peserta.nomor, X0, 174, { keluarga: 'Inter', tebal: 500, ukuran: 11.5, jarak: 0.6, warna: t.nomor, rata: 'kiri', maks: MAKS });
    tulis(ctx, acara.pembuka || 'diberikan kepada', X0, 232, { keluarga: '"Cormorant Garamond"', gaya: 'italic', tebal: 500, ukuran: 21, warna: t.lembut, rata: 'kiri', maks: MAKS });
    tulis(ctx, peserta.nama || 'Nama Peserta', X0, 292, { keluarga: '"Cormorant Garamond"', gaya: 'italic', tebal: 600, ukuran: 54, warna: t.teks, rata: 'kiri', maks: MAKS, min: 26 });
    const g2 = ctx.createLinearGradient(X0, 0, X0 + MAKS, 0); g2.addColorStop(0, t.aksen); g2.addColorStop(0.7, t.aksen + '66'); g2.addColorStop(1, t.aksen + '00');
    ctx.fillStyle = g2; ctx.fillRect(X0, 312, MAKS, 1.2);
    kalimatPeran(ctx, acara, peserta, t, X0, 350, 'kiri');
    judulAcara(ctx, acara, t, X0, 388, MAKS, 'kiri');
    const n = Math.min(2, (acara.penandatangan || []).length);
    tandaTangan(ctx, acara, t, n >= 2 ? [560, 905] : [905], ttd);
    const pakaiQr = acara.tampilQr !== false && (peserta.kode || opsi.contoh);
    return pakaiQr ? kotakQr(ctx, peserta, opsi, t, PX, 586, 100, t.panel1, t.panel2) : null;
  }

  // ---------- sertifikat ----------
  async function gambar(kanvas, acara, peserta, opsi) {
    opsi = opsi || {};
    const S = opsi.skala || 2.5;
    const t = TEMA[acara.desain] || TEMA.elegan;
    await siapkanHuruf();
    const [latar, logo] = await Promise.all([muatGambar(t.latar), muatGambar('/img/logo.png')]);
    const ttd = await Promise.all((acara.penandatangan || []).map((p) => (p.ttd ? muatGambar(p.ttd).catch(() => null) : null)));
    kanvas.width = Math.round(W * S); kanvas.height = Math.round(H * S);
    const ctx = kanvas.getContext('2d');
    ctx.setTransform(S, 0, 0, S, 0, 0);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(latar, 0, 0, W, H);
    const qr = (t.model === 'panel' ? modelPanel : modelTengah)(ctx, acara, peserta, opsi, t, logo, ttd);
    kanvas._qr = qr;
    return kanvas;
  }

  const kodeTampil = (k) => (k || '').replace(/^(.{5})(.{5})$/, '$1-$2');

  async function pdf(acara, peserta) {
    const kanvas = document.createElement('canvas');
    const tautan = location.origin + '/v/' + peserta.kode;
    await gambar(kanvas, acara, peserta, { skala: 2.5, tautan });
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
    doc.addImage(kanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 297, 210, undefined, 'FAST');
    const q = kanvas._qr;
    if (q && peserta.kode) doc.link(q.x * 297 / W, q.y * 210 / H, q.s * 297 / W, q.s * 210 / H, { url: tautan });
    doc.setProperties({ title: 'Sertifikat ' + (peserta.nama || ''), subject: acara.judul || '', creator: acara.penyelenggara || '' });
    return doc;
  }

  const namaBerkas = (nama) => 'Sertifikat ' + String(nama || 'Peserta').replace(/[\\/:*?"<>|]+/g, ' ').replace(/[.\s]+$/, '').trim() + '.pdf';

  async function unduh(acara, peserta) {
    const doc = await pdf(acara, peserta);
    doc.save(namaBerkas(peserta.nama));
  }

  window.Sertifikat = { gambar, pdf, unduh, kodeTampil, namaBerkas, TEMA };
})();
