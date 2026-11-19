/* Penggambar sertifikat (kanvas A4 mendatar) dan pembuat PDF. Bergantung pada lib/qrcode.js dan lib/jspdf.umd.min.js */
(function () {
  const W = 1122, H = 794, CX = W / 2;
  const TEMA = {
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

  // ---------- sertifikat ----------
  async function gambar(kanvas, acara, peserta, opsi) {
    opsi = opsi || {};
    const S = opsi.skala || 2.5;
    const t = TEMA[acara.desain] || TEMA.gading;
    await siapkanHuruf();
    const [latar, logo] = await Promise.all([muatGambar(t.latar), muatGambar('/img/logo.png')]);
    const ttd = await Promise.all((acara.penandatangan || []).map((p) => (p.ttd ? muatGambar(p.ttd).catch(() => null) : null)));

    kanvas.width = Math.round(W * S); kanvas.height = Math.round(H * S);
    const ctx = kanvas.getContext('2d');
    ctx.setTransform(S, 0, 0, S, 0, 0);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(latar, 0, 0, W, H);

    // kop
    ctx.drawImage(logo, CX - 29, 44, 58, 65.4);
    tulis(ctx, (acara.kop1 || '').toUpperCase(), CX, 132, { keluarga: 'Cinzel', tebal: 600, ukuran: 12, jarak: 2.4, warna: t.kop1, maks: 760 });
    tulis(ctx, (acara.kop2 || '').toUpperCase(), CX, 152, { keluarga: 'Cinzel', tebal: 700, ukuran: 15, jarak: 1.5, warna: t.kop2, maks: 760 });
    pemisah(ctx, 169, 300, t.aksen);

    // judul dan nomor
    tulis(ctx, (acara.judulSertifikat || 'SERTIFIKAT').toUpperCase(), CX, 226, { keluarga: 'Cinzel', tebal: 700, ukuran: 50, jarak: 12, warna: t.judul || t.teks, foil: t.foil, maks: 700 });
    if (peserta.nomor) tulis(ctx, 'Nomor: ' + peserta.nomor, CX, 252, { keluarga: 'Inter', tebal: 500, ukuran: 11.5, jarak: 0.6, warna: t.nomor, maks: 600 });

    // penerima
    tulis(ctx, acara.pembuka || 'diberikan kepada', CX, 294, { keluarga: '"Cormorant Garamond"', gaya: 'italic', tebal: 500, ukuran: 21, warna: t.lembut, maks: 700 });
    tulis(ctx, peserta.nama || 'Nama Peserta', CX, 350, { keluarga: '"Cormorant Garamond"', gaya: 'italic', tebal: 600, ukuran: 54, warna: t.teks, maks: 880, min: 26 });
    pemisah(ctx, 372, 520, t.aksen);

    // kalimat dengan peran
    const peran = (peserta.peran || acara.peran || 'Peserta').toUpperCase();
    const [awal, akhir] = (acara.kalimat || 'atas partisipasinya sebagai {peran} dalam').split('{peran}').concat('');
    const fA = 'italic 500 19.5px "Cormorant Garamond"', fP = '700 14.5px Cinzel';
    ctx.font = fA; const wA = ctx.measureText(awal).width, wC = ctx.measureText(akhir || '').width;
    ctx.font = fP; const wP = lebar(ctx, peran, 1.2);
    const adaPeran = /\{peran\}/.test(acara.kalimat || '{peran}');
    let x = CX - (wA + (adaPeran ? wP : 0) + wC) / 2;
    ctx.font = fA; ctx.fillStyle = t.lembut; ctx.fillText(awal, x, 404); x += wA;
    if (adaPeran) { ctx.font = fP; tulis(ctx, peran, x, 404, { keluarga: 'Cinzel', tebal: 700, ukuran: 14.5, jarak: 1.2, warna: t.peran, rata: 'kiri' }); x += wP; }
    ctx.font = fA; ctx.fillStyle = t.lembut; ctx.fillText(akhir || '', x, 404);

    // nama acara (paling banyak 2 baris)
    let uk = 22, baris;
    for (; uk >= 15; uk -= 1) { ctx.font = `700 ${uk}px Cinzel`; baris = bungkus(ctx, (acara.judul || 'Nama Acara').toUpperCase(), 900); if (baris.length <= 2) break; }
    let y = 440;
    baris.slice(0, 2).forEach((b) => { tulis(ctx, b, CX, y, { keluarga: 'Cinzel', tebal: 700, ukuran: uk, jarak: 0.8, warna: t.acara, maks: 940 }); y += uk + 8; });
    y -= uk + 8;
    if (acara.tema) { y += 27; tulis(ctx, acara.tema, CX, y, { keluarga: '"Cormorant Garamond"', gaya: 'italic', tebal: 600, ukuran: 18, warna: t.lembut, maks: 900 }); }
    const info = [acara.tanggal, acara.tempat].filter(Boolean).map((s) => s.toUpperCase());
    if (info.length) {
      y += 26;
      ctx.font = '500 11.5px Inter';
      const lb = info.map((s) => lebar(ctx, s, 1.3)), sela = 26;
      let xi = CX - (lb.reduce((a, b) => a + b, 0) + sela * (info.length - 1)) / 2;
      info.forEach((s, i) => {
        tulis(ctx, s, xi, y, { keluarga: 'Inter', tebal: 500, ukuran: 11.5, jarak: 1.3, warna: t.redup, rata: 'kiri' });
        xi += lb[i];
        if (i < info.length - 1) { belahKetupat(ctx, xi + sela / 2, y - 4, 3.2, t.aksen); xi += sela; }
      });
    }

    // tanda tangan dan QR
    const ttdList = (acara.penandatangan || []).slice(0, 2);
    const pakaiQr = acara.tampilQr !== false && (peserta.kode || opsi.contoh);
    let posTtd, posQr;
    if (ttdList.length >= 2) { posTtd = [282, 840]; posQr = CX; }
    else if (ttdList.length === 1) { posTtd = pakaiQr ? [800] : [CX]; posQr = 322; }
    else { posTtd = []; posQr = CX; }
    ttdList.forEach((p, i) => {
      const cx = posTtd[i];
      const terakhir = i === ttdList.length - 1;
      if (terakhir && acara.tempatTanggal) tulis(ctx, acara.tempatTanggal, cx, 556, { keluarga: 'Inter', tebal: 500, ukuran: 12, warna: t.lembut, maks: 270 });
      ctx.font = '600 12.5px Inter';
      const bj = bungkus(ctx, p.jabatan || '', 270).slice(0, 2);
      bj.forEach((b, k) => tulis(ctx, b, cx, 576 + k * 16, { keluarga: 'Inter', tebal: 600, ukuran: 12.5, warna: t.teks, maks: 280 }));
      if (ttd[i]) {
        const im = ttd[i], mh = 66, mw = 200, r = Math.min(mw / im.width, mh / im.height);
        ctx.drawImage(im, cx - im.width * r / 2, 602 + (mh - im.height * r) / 2, im.width * r, im.height * r);
      }
      const n = tulis(ctx, p.nama || '', cx, 690, { keluarga: 'Inter', tebal: 600, ukuran: 13.5, warna: t.teks, maks: 280 });
      ctx.strokeStyle = t.teks; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(cx - n.lebar / 2, 694); ctx.lineTo(cx + n.lebar / 2, 694); ctx.stroke();
      if (p.nip) tulis(ctx, 'NIP. ' + p.nip, cx, 709, { keluarga: 'Inter', tebal: 400, ukuran: 11, warna: t.redup, maks: 280 });
    });
    if (pakaiQr) {
      const sisi = 92, qx = posQr - sisi / 2, qy = 590;
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(qx, qy, sisi, sisi);
      ctx.strokeStyle = t.bingkaiQr; ctx.lineWidth = 1; ctx.strokeRect(qx, qy, sisi, sisi);
      gambarQr(ctx, opsi.tautan || (location.origin + '/v/' + (peserta.kode || 'CONTOH')), qx + 6, qy + 6, sisi - 12, '#1B1B1F');
      tulis(ctx, 'Pindai untuk cek keaslian', posQr, 698, { keluarga: 'Inter', tebal: 500, ukuran: 9.5, warna: t.redup });
      tulis(ctx, peserta.kode ? kodeTampil(peserta.kode) : 'KODE-CONTOH', posQr, 712, { keluarga: 'Inter', tebal: 600, ukuran: 10, jarak: 1, warna: t.nomor });
    }
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
    if (acara.tampilQr !== false && peserta.kode) {
      const n = (acara.penandatangan || []).length;
      const pusat = n === 1 ? 322 : CX;
      doc.link((pusat - 46) * 297 / W, 590 * 210 / H, 92 * 297 / W, 92 * 210 / H, { url: tautan });
    }
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
