/* Penggambar sertifikat (kanvas A4 mendatar) dan pembuat PDF. Bergantung pada lib/qrcode.js dan lib/jspdf.umd.min.js */
(function () {
  const W = 1122, H = 794, CX = W / 2;
  const TEMA = {
    resmi: {
      latar: '/desain/resmi.jpg', judul: '#1F2A5A',
      kop1: '#3F4A6E', kop2: '#1F2A5A', aksen: '#B8923A', teks: '#1A2340', lembut: '#4A5578', redup: '#6B7490',
      acara: '#1F2A5A', peran: '#9A7A2A', nomor: '#8F6F24', bingkaiQr: '#B8923A',
    },
    gading: {
      latar: '/desain/gading.jpg', foil: ['#E9D3A2', '#C9A465', '#A8823F', '#CFAE70', '#9A7535'],
      kop1: '#8A786B', kop2: '#3A2E2A', aksen: '#C7A465', teks: '#3A2E2A', lembut: '#6B5D57', redup: '#857A73',
      acara: '#9C7A45', peran: '#A6766A', nomor: '#9C7A45', bingkaiQr: '#C7A465',
    },
  };
  const hex = (w, cadangan) => (/^#[0-9a-fA-F]{6}$/.test(w || '') ? w : cadangan);
  // tema untuk desain unggahan sendiri (misalnya dari Canva)
  function temaSendiri(acara) {
    const k = hex(acara.warnaTeks, '#1F2A5A'), a = hex(acara.warnaAksen, '#B8923A');
    return { latar: acara.latarData || ('/api/latar/' + acara.id + '?v=' + (acara.latarVersi || 0)), judul: k, kop1: k, kop2: k, aksen: a, teks: k,
      lembut: k + 'D9', redup: k + 'B3', acara: k, peran: a, nomor: a, bingkaiQr: a };
  }

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
    return y;
  }
  function kotakQr(ctx, peserta, opsi, t, cx, qy, sisi) {
    const qx = cx - sisi / 2;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(qx - 4, qy - 4, sisi + 8, sisi + 8);
    ctx.strokeStyle = t.bingkaiQr; ctx.lineWidth = 1; ctx.strokeRect(qx - 4, qy - 4, sisi + 8, sisi + 8);
    gambarQr(ctx, opsi.tautan || (location.origin + '/v/' + (peserta.kode || 'CONTOH')), qx, qy, sisi, '#141A33');
    return { x: qx - 4, y: qy - 4, s: sisi + 8 };
  }

  // ---------- satu tata letak resmi untuk semua desain ----------
  function modelResmi(ctx, acara, peserta, opsi, t, logo) {
    if (acara.tampilKop !== false) {
      ctx.drawImage(logo, CX - 31, 48, 62, 70);
      tulis(ctx, (acara.kop1 || '').toUpperCase(), CX, 142, { keluarga: 'Cinzel', tebal: 600, ukuran: 12.5, jarak: 2.6, warna: t.kop1, maks: 760 });
      tulis(ctx, (acara.kop2 || '').toUpperCase(), CX, 162, { keluarga: 'Cinzel', tebal: 700, ukuran: 15.5, jarak: 1.6, warna: t.kop2, maks: 760 });
      pemisah(ctx, 178, 320, t.aksen);
    }
    if (acara.tampilJudul !== false) tulis(ctx, (acara.judulSertifikat || 'SERTIFIKAT').toUpperCase(), CX, 236, { keluarga: 'Cinzel', tebal: 700, ukuran: 52, jarak: 14, warna: t.judul || t.teks, foil: t.foil, maks: 720 });
    if (peserta.nomor) tulis(ctx, 'Nomor: ' + peserta.nomor, CX, 262, { keluarga: 'Inter', tebal: 500, ukuran: 11.5, jarak: 0.8, warna: t.nomor, maks: 600 });
    tulis(ctx, acara.pembuka || 'diberikan kepada', CX, 304, { keluarga: '"Cormorant Garamond"', gaya: 'italic', tebal: 500, ukuran: 21, warna: t.lembut, maks: 700 });
    tulis(ctx, peserta.nama || 'Nama Peserta', CX, 358, { keluarga: '"Cormorant Garamond"', gaya: 'italic', tebal: 600, ukuran: 54, warna: t.teks, maks: 860, min: 26 });
    pemisah(ctx, 380, 560, t.aksen);
    kalimatPeran(ctx, acara, peserta, t, CX, 414, 'tengah');
    const yAkhir = judulAcara(ctx, acara, t, CX, 450, 880, 'tengah');

    // blok pengesahan di tengah sesuai tata naskah dinas: tempat tanggal, jabatan, QR (TTE), nama, NIP
    const p = (acara.penandatangan || [])[0];
    const pakaiQr = acara.tampilQr !== false && (peserta.kode || opsi.contoh);
    const ATAS = yAkhir + 24, BAWAH = 732;
    let qr = null;
    if (p && (p.nama || p.jabatan)) {
      ctx.font = '600 13px Inter';
      const jab = bungkusSeimbang(ctx, p.jabatan || '', 300).slice(0, 2);
      const adaTT = !!acara.tempatTanggal, adaNama = !!(p.nama || '').trim(), adaNip = !!(p.nip || '').trim();
      let sisi = 76;
      const tinggi = () => (adaTT ? 18 : 0) + jab.length * 17 + (pakaiQr ? 12 + sisi + 14 : 52) + (adaNama ? 18 : 0) + (adaNip ? 16 : 0);
      while (pakaiQr && tinggi() > BAWAH - ATAS && sisi > 60) sisi -= 2;
      let y = Math.max(ATAS, ATAS + (BAWAH - ATAS - tinggi()) / 2);
      if (adaTT) { tulis(ctx, acara.tempatTanggal, CX, y + 12, { keluarga: 'Inter', tebal: 500, ukuran: 12.5, warna: t.lembut, maks: 400 }); y += 18; }
      jab.forEach((b) => { tulis(ctx, b, CX, y + 13, { keluarga: 'Inter', tebal: 600, ukuran: 13, warna: t.teks, maks: 400 }); y += 17; });
      if (pakaiQr) { y += 12; qr = kotakQr(ctx, peserta, opsi, t, CX, y + 4, sisi - 8); y += sisi + 14; } else y += 52;
      if (adaNama) {
        const n = tulis(ctx, p.nama, CX, y + 12, { keluarga: 'Inter', tebal: 600, ukuran: 13.5, warna: t.teks, maks: 400 });
        ctx.strokeStyle = t.teks; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(CX - n.lebar / 2, y + 16); ctx.lineTo(CX + n.lebar / 2, y + 16); ctx.stroke();
        y += 18;
      }
      if (adaNip) tulis(ctx, 'NIP. ' + p.nip, CX, y + 13, { keluarga: 'Inter', tebal: 400, ukuran: 11, warna: t.redup, maks: 400 });
    } else if (pakaiQr) {
      qr = kotakQr(ctx, peserta, opsi, t, CX, Math.max(ATAS, ATAS + (BAWAH - ATAS - 92) / 2) + 4, 84);
    }

    // keterangan sertifikat elektronik di kiri bawah, tidak bersinggungan dengan blok pengesahan
    if (pakaiQr) {
      const X = 92, M = 272, tautan = (opsi.tautan || (location.origin + '/v/' + (peserta.kode || 'CONTOH'))).replace(/^https?:\/\//, '');
      const g = ctx.createLinearGradient(0, 652, 0, 728); g.addColorStop(0, t.aksen); g.addColorStop(1, t.aksen + '33');
      ctx.fillStyle = g; ctx.fillRect(X, 652, 2, 76);
      tulis(ctx, 'SERTIFIKAT ELEKTRONIK', X + 12, 664, { keluarga: 'Cinzel', tebal: 700, ukuran: 10, jarak: 1.5, warna: t.kop2, rata: 'kiri', maks: M });
      tulis(ctx, 'Keaslian dapat diperiksa dengan memindai', X + 12, 680, { keluarga: 'Inter', tebal: 400, ukuran: 10, warna: t.redup, rata: 'kiri', maks: M });
      tulis(ctx, 'kode QR atau membuka laman berikut:', X + 12, 694, { keluarga: 'Inter', tebal: 400, ukuran: 10, warna: t.redup, rata: 'kiri', maks: M });
      tulis(ctx, tautan, X + 12, 708, { keluarga: 'Inter', tebal: 500, ukuran: 10, warna: t.redup, rata: 'kiri', maks: M, min: 7.5 });
      tulis(ctx, 'Kode verifikasi: ' + (peserta.kode ? kodeTampil(peserta.kode) : 'KODE-CONTOH'), X + 12, 724, { keluarga: 'Inter', tebal: 600, ukuran: 10, jarak: 0.4, warna: t.nomor, rata: 'kiri', maks: M });
    }
    return qr;
  }

  // ---------- sertifikat ----------
  async function gambar(kanvas, acara, peserta, opsi) {
    opsi = opsi || {};
    const S = opsi.skala || 2.5;
    const t = acara.desain === 'sendiri' ? temaSendiri(acara) : (TEMA[acara.desain] || TEMA.resmi);
    await siapkanHuruf();
    const [latar, logo] = await Promise.all([muatGambar(t.latar), muatGambar('/img/logo.png')]);
    kanvas.width = Math.round(W * S); kanvas.height = Math.round(H * S);
    const ctx = kanvas.getContext('2d');
    ctx.setTransform(S, 0, 0, S, 0, 0);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(latar, 0, 0, W, H);
    const qr = modelResmi(ctx, acara, peserta, opsi, t, logo);
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
