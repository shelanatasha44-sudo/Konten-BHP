const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType,
  WidthType, BorderStyle, ShadingType, PageBreak, Footer, PageNumber, VerticalAlign,
} = require("docx");

const FONT = "Arial";
const SIZE = 22; // 11pt
const CONTENT_W = 9026; // A4 with 1" margins

// Inline markup: **bold**, _italic_
function runs(text, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|_[^_]+_)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), font: FONT, size: SIZE, ...base }));
    const t = m[0];
    if (t.startsWith("**")) out.push(new TextRun({ text: t.slice(2, -2), bold: true, font: FONT, size: SIZE, ...base }));
    else out.push(new TextRun({ text: t.slice(1, -1), italics: true, font: FONT, size: SIZE, ...base }));
    last = m.index + t.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), font: FONT, size: SIZE, ...base }));
  return out;
}

const SP = { after: 120, line: 300 };
function p(text, o = {}) {
  return new Paragraph({
    children: runs(text, o.run || {}),
    alignment: o.align || AlignmentType.JUSTIFIED,
    spacing: { ...SP, ...(o.spacing || {}) },
    indent: o.indent,
    keepNext: o.keepNext,
  });
}
// Numbered item with hanging indent: level 0 at 0.5", level 1 at 1.0", level 2 at 1.4"
const LV = [ { left: 567, hanging: 567 }, { left: 1134, hanging: 454 }, { left: 1588, hanging: 397 } ];
function item(label, text, level = 0) {
  return new Paragraph({
    children: [new TextRun({ text: label + "\t", font: FONT, size: SIZE }), ...runs(text)],
    alignment: AlignmentType.JUSTIFIED,
    spacing: SP,
    indent: LV[level],
    tabStops: [{ type: "left", position: LV[level].left }],
  });
}
function body(text, level = 0) { return p(text, { indent: { left: LV[level].left } }); }
function heading(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, font: FONT, size: SIZE })],
    spacing: { before: 240, after: 120 }, keepNext: true,
    indent: { left: 567, hanging: 567 }, tabStops: [{ type: "left", position: 567 }],
  });
}
function sub(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, font: FONT, size: SIZE })],
    spacing: { before: 160, after: 100 }, keepNext: true, indent: { left: 567 },
  });
}
function center(text, o = {}) {
  return new Paragraph({ children: runs(text, o.run || {}), alignment: AlignmentType.CENTER, spacing: { after: o.after ?? 0, line: 276 } });
}
const blank = () => new Paragraph({ children: [], spacing: { after: 0 } });
const pb = () => new Paragraph({ children: [new PageBreak()] });

const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NOB = { top: NONE, bottom: NONE, left: NONE, right: NONE };
const LINE = { style: BorderStyle.SINGLE, size: 4, color: "808080" };
const B = { top: LINE, bottom: LINE, left: LINE, right: LINE };

// Key : value table without borders
function kv(rows, widths = [1900, 300, CONTENT_W - 2200]) {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: widths,
    rows: rows.map(([k, v]) => new TableRow({ children: [
      new TableCell({ borders: NOB, width: { size: widths[0], type: WidthType.DXA }, children: [p(k, { align: AlignmentType.LEFT, spacing: { after: 40 } })] }),
      new TableCell({ borders: NOB, width: { size: widths[1], type: WidthType.DXA }, children: [p(":", { align: AlignmentType.LEFT, spacing: { after: 40 } })] }),
      new TableCell({ borders: NOB, width: { size: widths[2], type: WidthType.DXA }, children: [].concat(v).map(t => p(t, { align: AlignmentType.LEFT, spacing: { after: 40 } })) }),
    ] })),
  });
}

// Bordered data table. aligns: array of "L"|"C"|"R"
function grid(header, rows, widths, aligns, o = {}) {
  const A = { L: AlignmentType.LEFT, C: AlignmentType.CENTER, R: AlignmentType.RIGHT };
  const cell = (t, i, isHead, bold) => new TableCell({
    borders: B, width: { size: widths[i], type: WidthType.DXA },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    verticalAlign: VerticalAlign.CENTER,
    shading: isHead ? { type: ShadingType.CLEAR, color: "auto", fill: "D9E2F3" } : (bold ? { type: ShadingType.CLEAR, color: "auto", fill: "F2F2F2" } : undefined),
    children: [new Paragraph({ children: runs(t, { size: 20, bold: isHead || bold }), alignment: isHead ? AlignmentType.CENTER : A[aligns[i]], spacing: { after: 0, line: 264 } })],
  });
  const total = widths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: total, type: WidthType.DXA }, columnWidths: widths,
    indent: o.indent ? { size: o.indent, type: WidthType.DXA } : undefined,
    rows: [
      new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, i, true)) }),
      ...rows.map(r => new TableRow({ cantSplit: true, children: r.cells.map((t, i) => cell(t, i, false, r.bold)) })),
    ],
  });
}
const R = (...cells) => ({ cells });
const RB = (...cells) => ({ cells, bold: true });

function kop() {
  return [
    center("**KEMENTERIAN HUKUM REPUBLIK INDONESIA**"),
    center("**KANTOR WILAYAH SUMATERA UTARA**"),
    center("**BALAI HARTA PENINGGALAN MEDAN**", { run: { size: 26 } }),
    center("Jalan Listrik No. 10 Medan", { run: { size: 18 } }),
    center("Telepon: (061) 451 7830, Faksimile: (061) 451 4328", { run: { size: 18 } }),
    new Paragraph({
      children: runs("Laman: www.bhpmedan.kemenkum.go.id, Pos-el: bhp.medan@kemenkum.go.id", { size: 18 }),
      alignment: AlignmentType.CENTER, spacing: { after: 240 },
      border: { bottom: { style: BorderStyle.DOUBLE, size: 6, color: "000000", space: 4 } },
    }),
  ];
}

function sign(left, right) {
  const w = CONTENT_W / 2;
  const col = (lines) => new TableCell({ borders: NOB, width: { size: w, type: WidthType.DXA },
    children: lines.map(t => new Paragraph({ children: runs(t), alignment: AlignmentType.CENTER, spacing: { after: 0, line: 276 } })) });
  return new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: [w, w],
    rows: [new TableRow({ children: [col(left), col(right)] })] });
}

// ============================ TELAAHAN STAF ============================
const telaah = [
  ...kop(),
  center("**TELAAHAN STAF**", { run: { size: 26 }, after: 240 }),
  kv([
    ["Kepada", "Yth. Kepala Balai Harta Peninggalan Medan"],
    ["Melalui", "Kepala Seksi Harta Peninggalan Wilayah II"],
    ["Dari", "Tim Kurator Kepailitan PT Rata Makmur (Dalam Pailit)"],
    ["Tanggal", "29 September 2026"],
    ["Nomor", "W.2.AHU.AHU.1-AH.06.06-          "],
    ["Lampiran", "2 (dua) berkas"],
    ["Hal", "Telaah atas Permohonan Debitor tanggal 2 September 2026 dan Arah Penyelesaian Kepailitan PT Rata Makmur (Dalam Pailit)"],
  ]),
  new Paragraph({ children: [], spacing: { after: 120 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 1 } } }),

  heading("I.\tPERSOALAN"),
  body("Melalui surat permohonan tanggal 2 September 2026 dan Rapat Pembahasan tanggal 14 September 2026, Debitor PT Rata Makmur (Dalam Pailit) meminta agar Kurator mewakili Debitor mengajukan permohonan pembayaran cicilan utang pajak kepada KPP Pratama Medan Polonia, serta menyatakan akan mengajukan rehabilitasi setelahnya. Di sisi lain, Laporan Pengurusan dan Pemberesan Boedel Pailit Triwulan III Tahun 2026 mencatat bahwa tanggapan tertulis kepada Debitor belum disampaikan, tagihan KPP Pratama Binjai belum dibayar, dan status tanah eks HGU No. 2/Sei Tampa masih menunggu tim khusus Kanwil BPN Sumatera Utara."),
  body("Persoalan yang ditelaah adalah:"),
  item("1.", "Dapatkah Kurator memenuhi permintaan Debitor untuk mengajukan permohonan angsuran pajak atas nama Debitor?"),
  item("2.", "Apakah syarat berakhirnya kepailitan dan rehabilitasi telah terpenuhi, dan berapa dana yang sebenarnya masih dibutuhkan?"),
  item("3.", "Bagaimana kedudukan tanah eks HGU No. 2/Sei Tampa dan apa yang masih dapat dibereskan untuk kepentingan kreditor?"),
  item("4.", "Langkah apa yang perlu diambil Kurator agar kepailitan ini dapat diselesaikan dalam waktu yang terukur?"),

  heading("II.\tPRAANGGAPAN"),
  item("1.", "Daftar Piutang Tetap tanggal 22 Juni 2023 sebesar **Rp1.432.871.696,00** bersifat tetap dan tidak dapat ditambah maupun dikurangi, sebagaimana ditegaskan Hakim Pengawas dalam Rapat Kreditor Lanjutan tanggal 10 Desember 2025."),
  item("2.", "Kepailitan ini berasal dari PKPU yang berakhir tanpa perdamaian, sehingga rencana perdamaian tidak dapat ditawarkan lagi (Pasal 292 UU 37/2004). Penyelesaian hanya dapat ditempuh melalui pemberesan harta pailit atau pembayaran penuh kepada seluruh kreditor."),
  item("3.", "Tidak ada aset lain milik Debitor yang diketahui selain yang telah tercatat, sesuai pernyataan Debitor dalam Rapat Kreditor Lanjutan tanggal 10 Desember 2025, kecuali ditemukan kemudian."),
  item("4.", "Sikap BPN atas tanah eks HGU No. 2/Sei Tampa belum berubah dari surat Kantor Pertanahan Kabupaten Langkat tanggal 12 Agustus 2024, yaitu hak telah berakhir pada 31 Agustus 2013."),
  item("5.", "Direktur PT Rata Makmur, Agam Singarimbun, berhalangan hadir karena kondisi kesehatan dan diwakili oleh kuasa hukumnya."),

  heading("III.\tFAKTA-FAKTA YANG MEMPENGARUHI"),
  sub("A. Perkara dan Daftar Piutang Tetap"),
  item("1.", "PT Rata Makmur dinyatakan pailit pada 10 April 2023 berdasarkan Putusan Pengadilan Niaga pada Pengadilan Negeri Medan Nomor 33/Pdt.Sus-PKPU/2022/PN Niaga Mdn, setelah berada dalam PKPU Sementara sejak 9 Agustus 2022 atas permohonan eks karyawan. Hakim Pengawas saat ini adalah Abdul Hadi Nasution, S.H., M.H."),
  item("2.", "Susunan Tim Kurator ditetapkan dengan Keputusan Kepala Balai Harta Peninggalan Medan Nomor W.2.AHU.AHU.1-AH.06.06-2929 Tahun 2026 tanggal 16 September 2026."),
  item("3.", "Daftar Piutang Tetap terdiri atas 8 (delapan) kreditor, dengan rincian sebagai berikut:"),
];
telaah.push(
  grid(["No", "Kreditor", "Sifat Tagihan", "Jumlah (Rp)"], [
    R("1", "KPP Pratama Medan Polonia", "Preferen", "14.636.625"),
    R("2", "KPP Pratama Binjai", "Preferen", "1.108.581.903"),
    R("3", "6 (enam) eks karyawan (Samin K dan kawan-kawan)", "Konkuren", "309.653.168"),
    RB("", "Jumlah", "", "1.432.871.696"),
  ], [600, 4200, 1600, 2059], ["C", "L", "C", "R"], { indent: 567 }),
  blank(),
  sub("B. Pembayaran yang telah terjadi"),
  item("1.", "Pada 29 Maret 2025, Debitor menyetor Rp170.000.000,00 kepada Kurator dengan persetujuan Hakim Pengawas. Dana tersebut dibagikan kepada 6 (enam) eks karyawan pada Juni 2025, setelah dipotong imbalan jasa Kurator."),
  item("2.", "Debitor membayar langsung tagihan KPP Pratama Medan Polonia sebesar Rp14.636.625,00 tanpa melalui Kurator. Hal ini diakui oleh KPP Pratama Medan Polonia dalam Rapat Kreditor Lanjutan tanggal 10 Desember 2025."),
  item("3.", "Tagihan KPP Pratama Binjai sebesar Rp1.108.581.903,00 belum dibayar sama sekali. Permohonan pengurangan tagihan pajak yang diajukan Debitor telah ditolak oleh KPP Pratama Binjai."),
  item("4.", "Debitor berjanji menyetor dana dari investor paling lambat 18 Desember 2025 untuk melunasi tagihan KPP Pratama Binjai. Janji tersebut tidak dipenuhi."),
  sub("C. Penugasan Hakim Pengawas (Rapat Kreditor Lanjutan, 10 Desember 2025)"),
  item("1.", "Kurator ditugaskan menyiapkan surat tanda terima pembayaran secara memuaskan (lunas) bagi KPP Pratama Binjai dan KPP Pratama Medan Polonia sesuai Daftar Piutang Tetap."),
  item("2.", "Kurator ditugaskan menyiapkan perhitungan tagihan yang harus dibayar serta seluruh biaya pengurusan dan pemberesan, yaitu PNBP 7% dari Daftar Piutang Tetap, biaya iklan Berita Negara Republik Indonesia, iklan di dua surat kabar, dan biaya lainnya."),
  sub("D. Permohonan Debitor dan Rapat Pembahasan tanggal 14 September 2026"),
  item("1.", "Debitor menyatakan seluruh kewajiban kepada para pemohon pailit telah dilunasi sesuai Daftar Pembagian Harta Pailit Tahap Pertama, dan sisa kewajiban hanya berupa utang pajak."),
  item("2.", "Debitor meminta Kurator mengajukan permohonan cicilan kepada KPP Pratama Medan Polonia atas nama Debitor. Menurut kuasa hukum Debitor, KPP pada dasarnya menyetujui skema bertahap asalkan permohonan diajukan oleh Kurator. Pernyataan ini belum didukung konfirmasi tertulis dari KPP mana pun."),
  item("3.", "Debitor menyatakan bahwa dengan penerapan Coretax, pengurusan tagihan pajak kini disatukan melalui KPP Pratama Medan Polonia."),
  item("4.", "Debitor siap menyetor pembayaran pertama Rp200.000.000,00, tetapi tidak menyerahkan rincian skema, besaran angsuran, batas waktu pelunasan, maupun bukti kemampuan keuangan."),
  item("5.", "Dalam rapat terungkap bahwa PT Rata Makmur tidak pernah mengubah Anggaran Dasarnya, HGU berakhir pada 2013, perseroan membagi aset secara internal pada 2021 sebelum dinyatakan pailit, dan penyelesaian kewajiban perseroan kini ditanggung secara pribadi oleh Agam Singarimbun."),
  item("6.", "Kurator menyimpulkan dalam rapat bahwa permintaan untuk mengajukan angsuran atas nama Debitor tidak dapat dipenuhi, rehabilitasi belum dapat didukung, dan hasil rapat akan dilaporkan kepada Hakim Pengawas serta dijawab secara tertulis kepada Debitor."),
  sub("E. Tanah eks HGU No. 2/Sei Tampa"),
  item("1.", "HGU No. 2/Sei Tampa, Kecamatan Selesai, Kabupaten Langkat, atas nama PT Rata Makmur, berjangka 25 tahun (Surat Ukur Sementara No. 471/1989), berakhir pada 31 Agustus 2013 tanpa permohonan perpanjangan atau pembaruan."),
  item("2.", "Kurator memblokir bidang tersebut pada 8 Mei 2023 dan melakukan sita umum pada 22 Mei 2023. Kurator pernah merencanakan lelang melalui KPKNL Medan dan menggelar FGD persiapan lelang pada 13 Agustus 2024. PT Raya Padang Langkat telah menyatakan minat membeli."),
  item("3.", "Kantor Pertanahan Kabupaten Langkat, melalui surat tanggal 12 Agustus 2024, menerangkan bahwa hak telah berakhir pada 31 Agustus 2013 dan bidang belum terpetakan pada aplikasi KKP. Luas menurut surat tersebut 388,7463 Ha, berbeda dengan 338,7463 Ha dalam laporan Kurator."),
  item("4.", "Kebun masih beroperasi dan diduga dikontrakkan kepada pihak lain untuk panen sawit. Kurator telah memerintahkan penyerahan hasil kebun, tetapi belum ada hasil yang masuk ke rekening harta pailit."),
  item("5.", "Legal Memorandum Kurator tanggal 28 September 2026 berpendapat bahwa tanah eks HGU bukan harta pailit, dan rencana lelang tanah perlu dialihkan ke pemberesan benda di atas tanah serta hasil kebun."),

  heading("IV.\tANALISIS"),
  sub("A. Permintaan agar Kurator mengajukan angsuran atas nama Debitor"),
  item("1.", "Pasal 15 ayat (3) UU 37/2004 mewajibkan Kurator independen dan bebas dari benturan kepentingan. Kurator mewakili kepentingan harta pailit dan seluruh kreditor, bukan kepentingan Debitor. Bila Kurator menjadi pemohon atas skema keringanan yang dirancang Debitor terhadap kreditor yang tagihannya diurus Kurator sendiri, Kurator berdiri di dua sisi sekaligus. Karena itu, sikap Kurator dalam rapat 14 September 2026 sudah tepat."),
  item("2.", "Penolakan itu tidak berarti Debitor tidak dapat membayar secara bertahap. Jalur yang sah dan netral sudah pernah dipakai dalam perkara ini, yaitu pada setoran Rp170.000.000,00 tahun 2025. Debitor atau pihak ketiga, termasuk Agam Singarimbun secara pribadi, menyetor dana ke rekening harta pailit dengan persetujuan Hakim Pengawas. Kurator kemudian membagikannya menurut Daftar Piutang Tetap dan urutan hak mendahulu. Dengan jalur ini, Kurator hanya memberitahukan penerimaan dana dan rencana pembagian kepada kreditor, tanpa memohon keringanan atas nama Debitor."),
  item("3.", "Sejak putusan pailit, Debitor demi hukum kehilangan hak menguasai dan mengurus kekayaannya (Pasal 24 ayat (1) UU 37/2004), dan pengurusan serta pemberesan menjadi tugas Kurator (Pasal 69 ayat (1)). Pembayaran langsung kepada KPP Pratama Medan Polonia menyimpang dari mekanisme ini. Namun, karena Hakim Pengawas telah menerimanya dan memerintahkan tanda terima lunas, pembayaran itu cukup dicatat. Ke depan, seluruh pembayaran harus melalui rekening harta pailit agar tidak terulang dan agar pembagian dapat dipertanggungjawabkan."),
  item("4.", "Klaim bahwa tagihan pajak kini disatukan di KPP Pratama Medan Polonia melalui Coretax adalah soal administrasi internal Direktorat Jenderal Pajak. Hal itu tidak mengubah kreditor yang tercatat dalam Daftar Piutang Tetap. Kurator perlu meminta konfirmasi tertulis dari kedua KPP mengenai unit yang berwenang menerima pembayaran dan menerbitkan pernyataan lunas atas tagihan KPP Pratama Binjai."),
  sub("B. Syarat berakhirnya kepailitan dan rehabilitasi"),
  item("1.", "Menurut Pasal 202 ayat (1) UU 37/2004, kepailitan berakhir segera setelah kreditor yang telah dicocokkan dibayar penuh, atau segera setelah daftar pembagian penutup menjadi mengikat. Rehabilitasi baru dapat dimohonkan setelah kepailitan berakhir (Pasal 215) dan hanya dikabulkan bila dilampiri bukti bahwa semua kreditor yang diakui telah memperoleh pembayaran secara memuaskan (Pasal 216)."),
  item("2.", "Pernyataan Debitor bahwa kewajiban kepada pemohon pailit telah lunas tidak sesuai dengan Daftar Piutang Tetap. Tagihan 6 (enam) eks karyawan berjumlah Rp309.653.168,00, sedangkan yang dibagikan kepada mereka paling banyak Rp170.000.000,00 sebelum dipotong imbalan jasa Kurator. Jadi, sisa tagihan eks karyawan **paling sedikit Rp139.653.168,00** masih terbuka, kecuali mereka menyatakan secara tertulis telah menerima pembayaran secara memuaskan."),
  item("3.", "Perkiraan dana yang masih dibutuhkan agar kepailitan dapat berakhir dengan pembayaran penuh adalah sebagai berikut (rincian pada Lampiran 2):"),
  grid(["Komponen", "Jumlah (Rp)", "Keterangan"], [
    R("Tagihan KPP Pratama Binjai", "1.108.581.903", "Belum dibayar"),
    R("Sisa tagihan 6 eks karyawan", "± 139.653.168", "Minimal; dicocokkan dengan Daftar Pembagian Tahap I"),
    R("PNBP 7% dari Daftar Piutang Tetap", "± 100.301.019", "Dikurangi bagian yang telah dipotong dari setoran 2025"),
    R("Iklan BNRI dan dua surat kabar, biaya lain", "belum dihitung", "Menunggu perhitungan Kurator"),
    RB("Perkiraan kebutuhan dana", "± 1.348.536.090", "Belum termasuk biaya iklan dan biaya lain"),
  ], [3300, 2000, 3159], ["L", "R", "L"], { indent: 567 }),
  blank(),
  body("Setoran awal Rp200.000.000,00 yang ditawarkan Debitor hanya sekitar 15% dari kebutuhan tersebut. Tanpa jadwal dan bukti sumber dana, tawaran ini belum dapat dijadikan dasar untuk menunda pemberesan."),
  item("4.", "Terdapat perbedaan penyebutan kedudukan eks karyawan. Daftar Piutang Tetap mencatat mereka sebagai kreditor konkuren, sedangkan Berita Acara Rapat Kreditor Lanjutan menyebut mereka kreditor preferen. Pasca Putusan Mahkamah Konstitusi Nomor 67/PUU-XI/2013, upah pekerja didahulukan atas semua jenis kreditor, termasuk tagihan negara. Karena daftar pembagian dapat dibantah (Pasal 193 UU 37/2004), urutan pembagian atas setoran berikutnya perlu dikonsultasikan dan ditetapkan bersama Hakim Pengawas sebelum dana dibagikan."),
  sub("C. Kedudukan tanah eks HGU No. 2/Sei Tampa"),
  item("1.", "HGU hapus demi hukum karena jangka waktunya berakhir, dan tanahnya menjadi tanah negara sejak 31 Agustus 2013 (Pasal 34 huruf a UUPA jo. Pasal 17 PP 40/1996; Pasal 2 ayat (3) huruf g PP 18/2021). Harta pailit hanya meliputi kekayaan Debitor pada saat putusan diucapkan dan yang diperoleh selama kepailitan (Pasal 21 UU 37/2004). Pada 10 April 2023, tanah itu sudah bukan milik Debitor, sehingga **bukan harta pailit** dan tidak dapat dilelang oleh Kurator."),
  item("2.", "Tenggat perpanjangan maupun pembaruan telah lama lewat. Karena itu, pernyataan Debitor bahwa HGU masih \"dapat diperbarui\" tidak memiliki dasar."),
  item("3.", "Prioritas bekas pemegang hak menurut Pasal 22 PP 18/2021 merupakan kewenangan Menteri untuk dipertimbangkan, bukan benda yang dapat dinilai dengan uang dan dijual. Peluangnya pun lemah, karena kebun diduga diusahakan pihak lain dan kedudukan subjek hukumnya bermasalah."),
  item("4.", "Yang masih dapat dibereskan untuk kepentingan kreditor ada tiga hal:"),
  item("a.", "bangunan dan benda bergerak milik PT Rata Makmur di lokasi kebun;", 1),
  item("b.", "hak atas ganti rugi atas tanaman, bangunan, dan benda yang masih diperlukan untuk melanjutkan pengusahaan tanah (Pasal 18 ayat (2) dan Pasal 4 ayat (4) PP 40/1996), yang ditagih kepada negara atau pemegang hak baru; dan", 1),
  item("c.", "hasil panen atau uang kontrak kebun yang diterima Debitor atau pihak lain sejak 10 April 2023.", 1),
  item("5.", "Melanjutkan rencana lelang tanah berisiko dibatalkan melalui perlawanan, sejalan dengan kaidah Putusan MA No. 213 K/Pdt.Sus-Pailit/2013 dan No. 426 K/Pdt.Sus-Pailit/2013. Selain itu, Kurator dapat dimintai pertanggungjawaban atas kerugian harta pailit (Pasal 72 UU 37/2004). Rencana lelang tahun 2024 karenanya perlu dihentikan secara resmi dan daftar harta pailit dikoreksi."),
  sub("D. Pembagian aset internal tahun 2021 dan tanggung jawab direksi"),
  item("1.", "Pengakuan bahwa aset perseroan dibagi secara internal pada 2021, sebelum PKPU dan pailit, perlu ditelusuri. Menurut Pasal 41 UU 37/2004, Kurator dapat memintakan pembatalan perbuatan hukum Debitor sebelum pailit yang merugikan kreditor, bila Debitor dan pihak penerima mengetahui atau patut mengetahui akibat tersebut. Karena perbuatan dilakukan lebih dari satu tahun sebelum putusan pailit, anggapan hukum Pasal 42 tidak berlaku, sehingga beban pembuktian ada pada Kurator. Sebelum menilai layak tidaknya gugatan, Kurator perlu terlebih dahulu memperoleh dokumen dan keterangan tentang pembagian tersebut (Pasal 110 UU 37/2004)."),
  item("2.", "Pasal 104 ayat (2) UU 40/2007 menentukan bahwa bila kepailitan terjadi karena kesalahan atau kelalaian direksi dan harta pailit tidak cukup, setiap anggota direksi bertanggung jawab secara tanggung renteng atas kewajiban yang tidak terlunasi. Membiarkan HGU berakhir tanpa permohonan dan membagi aset menjelang kesulitan keuangan merupakan petunjuk yang relevan. Pernyataan bahwa kewajiban perseroan kini ditanggung pribadi oleh Agam Singarimbun sejalan dengan tanggung jawab ini, dan dapat dijadikan dasar untuk meminta komitmen tertulis yang mengikat."),
  sub("E. Risiko bila tidak ada tindakan"),
  item("1.", "Kepailitan akan terus berlarut tanpa tenggat, sementara risiko pencatatan boedel pailit yang tidak akurat tercatat dengan profil Sangat Tinggi (Kode Risiko 15.1) dalam Dokumen Manajemen Risiko BHP Medan Tahun 2026."),
  item("2.", "Nilai hak keperdataan atas kebun dapat hilang bila kebun rusak atau dipanen tanpa pengawasan."),
  item("3.", "Bila tanggapan tertulis kepada Debitor terus tertunda, Debitor dapat menafsirkan bahwa Kurator tidak menolak skemanya."),

  heading("V.\tKESIMPULAN"),
  item("1.", "Kurator tidak dapat mengajukan permohonan angsuran pajak atas nama Debitor karena bertentangan dengan kewajiban independensi (Pasal 15 ayat (3) UU 37/2004). Pembayaran bertahap tetap dapat diterima melalui setoran ke rekening harta pailit dengan persetujuan Hakim Pengawas."),
  item("2.", "Syarat berakhirnya kepailitan dan rehabilitasi belum terpenuhi. Selain tagihan KPP Pratama Binjai sebesar Rp1.108.581.903,00, masih terdapat sisa tagihan eks karyawan paling sedikit Rp139.653.168,00 dan biaya kepailitan. Perkiraan kebutuhan dana sekitar Rp1,35 miliar."),
  item("3.", "Tanah eks HGU No. 2/Sei Tampa bukan harta pailit. Pemberesan harus dialihkan ke bangunan dan benda, hak ganti rugi, serta hasil kebun sejak 10 April 2023."),
  item("4.", "Pembagian aset tahun 2021 dan kelalaian direksi membuka kemungkinan upaya hukum terhadap pihak penerima aset dan anggota direksi, yang perlu didahului pengumpulan dokumen dan keterangan."),

  heading("VI.\tSARAN / TINDAKAN YANG DIUSULKAN"),
  item("1.", "Menyampaikan surat tanggapan tertulis kepada Debitor, sesuai konsep pada Lampiran 1, yang pada pokoknya:"),
  item("a.", "menolak mengajukan permohonan angsuran atas nama Debitor;", 1),
  item("b.", "membuka jalur setoran bertahap ke rekening harta pailit;", 1),
  item("c.", "meminta proposal pembayaran tertulis dalam 14 (empat belas) hari kerja, memuat jadwal, besaran angsuran, tanggal pelunasan akhir, sumber dan bukti dana, serta komitmen pribadi Agam Singarimbun; dan", 1),
  item("d.", "meminta dokumen pembagian aset internal tahun 2021.", 1),
  item("2.", "Melaporkan hasil rapat 14 September 2026 kepada Hakim Pengawas dan memohon arahan atau penetapan tentang:"),
  item("a.", "persetujuan penerimaan setoran bertahap ke rekening harta pailit;", 1),
  item("b.", "urutan pembagian antara eks karyawan dan kreditor pajak;", 1),
  item("c.", "penghentian rencana lelang tanah eks HGU dan koreksi daftar harta pailit; dan", 1),
  item("d.", "batas waktu bagi Debitor untuk melunasi.", 1),
  item("3.", "Menyurati KPP Pratama Binjai dan KPP Pratama Medan Polonia untuk meminta konfirmasi tertulis tentang posisi tagihan dan unit yang berwenang menerbitkan pernyataan lunas setelah penerapan Coretax, tanpa mengajukan keringanan atau angsuran atas nama Debitor."),
  item("4.", "Menyelesaikan penugasan Hakim Pengawas tanggal 10 Desember 2025, yaitu:"),
  item("a.", "menerbitkan tanda terima lunas bagi KPP Pratama Medan Polonia;", 1),
  item("b.", "menyusun perhitungan final tagihan dan biaya kepailitan; dan", 1),
  item("c.", "mencocokkan pembayaran kepada eks karyawan dengan Daftar Pembagian Tahap I.", 1),
  item("5.", "Menindaklanjuti tanah eks HGU dengan:"),
  item("a.", "menyurati tim khusus Kanwil BPN Sumatera Utara;", 1),
  item("b.", "menginventarisasi bangunan, benda, dan tanaman bersama Kantor Pertanahan Kabupaten Langkat, sekaligus menyelesaikan selisih luas;", 1),
  item("c.", "meminta KJPP menilai nilai ganti rugi; dan", 1),
  item("d.", "menagih hasil kebun sejak 10 April 2023, dan bila ditolak, mengajukan gugatan lain-lain ke Pengadilan Niaga.", 1),
  item("6.", "Bila sampai batas waktu yang ditetapkan Hakim Pengawas Debitor tidak menyetor sesuai jadwal, Kurator:"),
  item("a.", "menyusun daftar pembagian penutup atas harta pailit yang ada;", 1),
  item("b.", "mengusulkan pengakhiran kepailitan; dan", 1),
  item("c.", "menilai kelayakan gugatan pembatalan (Pasal 41 UU 37/2004) serta tuntutan tanggung jawab direksi (Pasal 104 ayat (2) UU 40/2007).", 1),

  heading("VII.\tPENUTUP"),
  body("Demikian telaahan staf ini disampaikan sebagai bahan pertimbangan dan pengambilan keputusan. Mohon arahan lebih lanjut."),
  blank(),
  sign(
    ["Mengetahui,", "Kepala Seksi Harta Peninggalan Wilayah II,", "", "", "", "**Elsintha Damayanti**"],
    ["Medan, 29 September 2026", "Tim Kurator PT Rata Makmur,", "Kurator Keperdataan Ahli Pertama,", "", "", "", "**Shela Natasha**"],
  ),
);

// ============================ LAMPIRAN 1: KONSEP SURAT ============================
const lamp1 = [
  pb(),
  p("**Lampiran 1** Telaahan Staf tanggal 29 September 2026: Konsep Surat Tanggapan kepada Debitor", { align: AlignmentType.LEFT, spacing: { after: 240 } }),
  ...kop(),
  kv([
    ["Nomor", "W.2.AHU.AHU.1-AH.06.06-          "],
    ["Lampiran", "-"],
    ["Hal", "Tanggapan atas Surat Permohonan tanggal 2 September 2026"],
  ], [1400, 300, CONTENT_W - 1700]),
  p("Medan,      Oktober 2026", { align: AlignmentType.RIGHT, spacing: { before: 120 } }),
  p("Yth. Direktur PT Rata Makmur (Dalam Pailit)", { align: AlignmentType.LEFT, spacing: { after: 0 } }),
  p("c.q. Frien Jones I.H.T. dan Kesia Yohana P., selaku Kuasa Hukum", { align: AlignmentType.LEFT, spacing: { after: 0 } }),
  p("Jl. Sriwijaya No. 68 A, Kelurahan Petisah Hulu", { align: AlignmentType.LEFT, spacing: { after: 0 } }),
  p("di –", { align: AlignmentType.LEFT, spacing: { after: 0 } }),
  p("Medan", { align: AlignmentType.LEFT, indent: { left: 567 }, spacing: { after: 240 } }),
  p("Menindaklanjuti surat permohonan Saudara tanggal 2 September 2026 dan Rapat Pembahasan tanggal 14 September 2026 di Balai Harta Peninggalan Medan, dengan ini kami selaku Kurator PT Rata Makmur (Dalam Pailit) berdasarkan Putusan Pengadilan Niaga pada Pengadilan Negeri Medan Nomor 33/Pdt.Sus-PKPU/2022/PN Niaga Mdn tanggal 10 April 2023 menyampaikan tanggapan sebagai berikut:"),
  item("1.", "Kurator tidak dapat mengajukan permohonan pembayaran cicilan utang pajak kepada KPP Pratama Medan Polonia maupun KPP Pratama Binjai atas nama Debitor. Pasal 15 ayat (3) Undang-Undang Nomor 37 Tahun 2004 mewajibkan Kurator bersikap independen dan tidak mempunyai benturan kepentingan dengan Debitor maupun Kreditor."),
  item("2.", "Apabila Debitor bermaksud melunasi kewajibannya secara bertahap, pembayaran dapat dilakukan dengan menyetor dana ke rekening harta pailit PT Rata Makmur (Dalam Pailit) yang dikelola Kurator. Setiap setoran dan pembagiannya dilaksanakan dengan persetujuan Hakim Pengawas dan sesuai Daftar Piutang Tetap tanggal 22 Juni 2023. Pembayaran yang dilakukan langsung kepada Kreditor tanpa melalui Kurator tidak dibenarkan, sesuai Pasal 24 ayat (1) dan Pasal 69 ayat (1) Undang-Undang Nomor 37 Tahun 2004."),
  item("3.", "Menurut catatan Kurator, kewajiban yang belum terlunasi bukan hanya tagihan pajak. Tagihan KPP Pratama Binjai sebesar Rp1.108.581.903,00 belum dibayar. Tagihan 6 (enam) eks karyawan menurut Daftar Piutang Tetap berjumlah Rp309.653.168,00 dan baru dibayar sebagian dari setoran Rp170.000.000,00 pada tahun 2025. Selain itu masih terdapat biaya kepailitan, antara lain PNBP dan biaya pengumuman. Rincian final akan kami sampaikan setelah perhitungan selesai."),
  item("4.", "Untuk dapat dipertimbangkan dan dimohonkan persetujuan Hakim Pengawas, Debitor diminta menyampaikan proposal pembayaran tertulis paling lambat 14 (empat belas) hari kerja sejak surat ini diterima, yang memuat:"),
  item("a.", "jumlah dan jadwal setiap setoran;", 1),
  item("b.", "tanggal pelunasan akhir;", 1),
  item("c.", "sumber dana beserta bukti kemampuan keuangan;", 1),
  item("d.", "pernyataan komitmen tertulis dari Sdr. Agam Singarimbun selaku Direktur; dan", 1),
  item("e.", "dokumen dan keterangan mengenai pembagian aset internal perseroan pada tahun 2021 sebagaimana disampaikan dalam rapat tanggal 14 September 2026.", 1),
  item("5.", "Sesuai Pasal 215 dan Pasal 216 Undang-Undang Nomor 37 Tahun 2004, permohonan rehabilitasi baru dapat diajukan setelah kepailitan berakhir dan wajib dilampiri bukti bahwa seluruh Kreditor yang diakui telah memperoleh pembayaran secara memuaskan."),
  item("6.", "Kurator juga meminta Debitor menyerahkan kepada Kurator seluruh hasil kebun eks HGU No. 2/Sei Tampa, termasuk uang kontrak panen, yang diterima sejak 10 April 2023, berikut perinciannya."),
  p("Apabila sampai batas waktu tersebut proposal tidak kami terima, Kurator akan melanjutkan pemberesan harta pailit sesuai ketentuan peraturan perundang-undangan dan melaporkannya kepada Hakim Pengawas.", { spacing: { before: 120 } }),
  p("Demikian kami sampaikan, atas perhatian Saudara diucapkan terima kasih."),
  blank(),
  sign([""], ["Kepala,", "", "", "", "**Syafriadi Lubis**"]),
  blank(),
  p("Tembusan:", { align: AlignmentType.LEFT, spacing: { after: 0 } }),
  item("1.", "Yth. Hakim Pengawas Kepailitan PT Rata Makmur (Dalam Pailit) pada Pengadilan Niaga pada Pengadilan Negeri Medan;"),
  item("2.", "Kepala KPP Pratama Binjai;"),
  item("3.", "Kepala KPP Pratama Medan Polonia."),
];

// ============================ LAMPIRAN 2: POSISI TAGIHAN ============================
const lamp2 = [
  pb(),
  p("**Lampiran 2** Telaahan Staf tanggal 29 September 2026", { align: AlignmentType.LEFT, spacing: { after: 120 } }),
  center("**POSISI TAGIHAN DAN PERKIRAAN KEBUTUHAN DANA**"),
  center("**KEPAILITAN PT RATA MAKMUR (DALAM PAILIT)**", { after: 240 }),
  p("**A. Posisi tagihan menurut Daftar Piutang Tetap (22 Juni 2023)**", { align: AlignmentType.LEFT }),
  grid(["No", "Kreditor", "Sifat", "Tagihan (Rp)", "Telah dibayar (Rp)", "Sisa (Rp)", "Keterangan"], [
    R("1", "KPP Pratama Medan Polonia", "Preferen", "14.636.625", "14.636.625", "0", "Dibayar langsung oleh Debitor; tanda terima lunas perlu diterbitkan"),
    R("2", "KPP Pratama Binjai", "Preferen", "1.108.581.903", "0", "1.108.581.903", "Pengurangan ditolak; janji setor 18 Des 2025 tidak dipenuhi"),
    R("3", "6 eks karyawan", "Konkuren", "309.653.168", "≤ 170.000.000", "≥ 139.653.168", "Rp170 juta dikurangi imbalan jasa Kurator; dicocokkan dengan Daftar Pembagian Tahap I"),
    RB("", "Jumlah", "", "1.432.871.696", "≤ 184.636.625", "≥ 1.248.235.071", ""),
  ], [400, 1650, 900, 1400, 1350, 1400, 1926], ["C", "L", "C", "R", "R", "R", "L"]),
  blank(),
  p("**B. Biaya kepailitan**", { align: AlignmentType.LEFT }),
  grid(["Komponen", "Dasar", "Perkiraan (Rp)"], [
    R("PNBP 7% dari Daftar Piutang Tetap", "7% × Rp1.432.871.696", "100.301.019"),
    R("Dikurangi bagian yang telah dipotong dari setoran Rp170 juta", "Sesuai bukti setor PNBP", "( ... )"),
    R("Iklan BNRI dan dua surat kabar", "Penugasan Hakim Pengawas 10 Des 2025", "( ... )"),
    R("Biaya pengurusan dan pemberesan lain", "Penilaian, perjalanan, dan lain-lain", "( ... )"),
  ], [4200, 2900, 1926], ["L", "L", "R"]),
  blank(),
  p("**C. Perkiraan kebutuhan dana minimum agar kepailitan dapat berakhir dengan pembayaran penuh**", { align: AlignmentType.LEFT }),
  grid(["Komponen", "Jumlah (Rp)"], [
    R("Sisa tagihan KPP Pratama Binjai", "1.108.581.903"),
    R("Sisa tagihan eks karyawan (minimal)", "139.653.168"),
    R("PNBP 7% (sebelum dikurangi bagian yang telah dipotong)", "100.301.019"),
    RB("Jumlah perkiraan", "1.348.536.090"),
  ], [6000, 3026], ["L", "R"]),
  blank(),
  p("_Catatan: angka sisa tagihan eks karyawan dan PNBP adalah perkiraan. Angka final ditetapkan setelah Kurator mencocokkan Daftar Pembagian Tahap I dan bukti setor PNBP, sesuai penugasan Hakim Pengawas dalam Rapat Kreditor Lanjutan tanggal 10 Desember 2025._", { run: { size: 20 } }),
  p("**D. Sumber data**", { align: AlignmentType.LEFT, spacing: { before: 120 } }),
  item("1.", "Daftar Piutang Tetap PT Rata Makmur (Dalam Pailit) tanggal 22 Juni 2023."),
  item("2.", "Berita Acara Rapat Kreditor Lanjutan Nomor 33/Pdt.Sus-PKPU/2022/PN Niaga Mdn tanggal 10 Desember 2025."),
  item("3.", "Notula Rapat Pembahasan Rencana Pembayaran Utang Pajak tanggal 14 September 2026."),
  item("4.", "Laporan Perkembangan Kepailitan PT Rata Makmur tanggal 10 Januari 2025."),
  item("5.", "Laporan Pengurusan dan Pemberesan Boedel Pailit Triwulan III Tahun 2026 tanggal 22 September 2026."),
  item("6.", "Legal Memorandum Kurator: Eks HGU No. 2/Sei Tampa dalam Kepailitan PT Rata Makmur, 28 September 2026."),
];

const doc = new Document({
  creator: "Tim Kurator BHP Medan",
  title: "Telaahan Staf PT Rata Makmur",
  styles: { default: { document: { run: { font: FONT, size: SIZE } } } },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1440, right: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      new TextRun({ children: ["Halaman ", PageNumber.CURRENT, " dari ", PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: "808080" })] })] }) },
    children: [...telaah, ...lamp1, ...lamp2],
  }],
});

const out = process.argv[2] || "Telaahan_Staf_PT_Rata_Makmur.docx";
Packer.toBuffer(doc).then(b => { fs.writeFileSync(out, b); console.log("wrote", out); });
