// Himpunan konsep surat BHP Medan — mengikuti format surat CV Hitado (28 Sept 2026)
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType,
  BorderStyle, ShadingType, PageBreak, ImageRun, HorizontalPositionRelativeFrom,
  VerticalPositionRelativeFrom, TextWrappingType, LevelFormat, VerticalAlign,
} = require("docx");

const FONT = "Arial";
const SZ = 22;           // 11 pt, seperti isi surat CV Hitado
const LOGO = fs.readFileSync("logo.png");
const PERKARA = "Putusan Pengadilan Niaga pada Pengadilan Negeri Medan Nomor 33/Pdt.Sus-PKPU/2022/PN Niaga Mdn tanggal 10 April 2023";
const HGU = "eks Hak Guna Usaha Nomor 2/Sei Tampa, Kecamatan Selesai, Kabupaten Langkat";

function runs(text, base = {}) {
  const out = []; const re = /(\*\*[^*]+\*\*|_[^_]+_)/g; let last = 0, m;
  const mk = (t, o) => new TextRun({ text: t, font: FONT, size: SZ, ...base, ...o });
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(mk(text.slice(last, m.index), {}));
    const t = m[0];
    out.push(t.startsWith("**") ? mk(t.slice(2, -2), { bold: true }) : mk(t.slice(1, -1), { italics: true }));
    last = m.index + t.length;
  }
  if (last < text.length) out.push(mk(text.slice(last), {}));
  return out;
}
const LS = { line: 276 };
// paragraf pembuka / penutup: menjorok baris pertama 709
const par = (t, after = 120, keepNext = false) => new Paragraph({ children: runs(t), alignment: AlignmentType.JUSTIFIED, spacing: { ...LS, after }, indent: { firstLine: 709 }, keepNext, keepLines: true });
const plain = (t, o = {}) => new Paragraph({ children: runs(t, o.run || {}), alignment: o.align || AlignmentType.LEFT, spacing: { ...LS, after: o.after ?? 0, before: o.before ?? 0 }, indent: o.indent });
const kutip = (t) => new Paragraph({ children: runs(t, { italics: false }), alignment: AlignmentType.JUSTIFIED, spacing: { after: 160 }, indent: { left: 1077, right: 849 } });
const blank = () => new Paragraph({ children: [], spacing: { after: 0 } });

// Penomoran: tiap surat memakai instance sendiri agar mulai dari 1
let inst = 0;
const numbering = { config: [
  { reference: "butir", levels: [
    { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 453, hanging: 340 } }, run: { font: FONT, size: SZ } } },
    { level: 1, format: LevelFormat.LOWER_LETTER, text: "%2.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 850, hanging: 340 } }, run: { font: FONT, size: SZ } } },
  ] },
  { reference: "tembusan", levels: [
    { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 453, hanging: 283 } }, run: { size: 16 } } },
  ] },
] };
// cont: lanjutkan nomor dari daftar sebelumnya (setelah kutipan pasal); keepLast: butir terakhir ikut ke halaman penutup
function butirList(items, { cont = false, keepLast = false } = {}) {
  const n = cont ? inst : ++inst;
  return items.map((it, i) => {
    const [lvl, t] = Array.isArray(it) ? it : [0, it];
    return new Paragraph({ children: runs(t), numbering: { reference: "butir", level: lvl, instance: n }, alignment: AlignmentType.JUSTIFIED,
      spacing: { ...LS, after: 120 }, keepLines: true, keepNext: keepLast && i === items.length - 1 });
  });
}

const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NOB = { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE };
const LINE = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const B = { top: LINE, bottom: LINE, left: LINE, right: LINE };

// brk: kop dimulai di halaman baru (pengganti paragraf page break, agar tidak ada halaman kosong)
function kop(brk = true) {
  let first = brk;
  const k = (t) => { const p = new Paragraph({ children: t, alignment: AlignmentType.CENTER, indent: { left: 1418 }, pageBreakBefore: first }); first = false; return p; };
  return [
    k([
      new TextRun({ text: "KEMENTERIAN HUKUM REPUBLIK INDONESIA", font: FONT, size: 24 }),
      new ImageRun({ type: "png", data: LOGO, transformation: { width: 77, height: 87 },
        floating: { horizontalPosition: { relative: HorizontalPositionRelativeFrom.COLUMN, offset: -5997 },
          verticalPosition: { relative: VerticalPositionRelativeFrom.PARAGRAPH, offset: 87999 },
          wrap: { type: TextWrappingType.NONE }, allowOverlap: true } }),
    ]),
    k([new TextRun({ text: "KANTOR WILAYAH SUMATERA UTARA", font: FONT, size: 24 })]),
    k([new TextRun({ text: "BALAI HARTA PENINGGALAN MEDAN", font: FONT, size: 24, bold: true })]),
    k([new TextRun({ text: "Jalan Listrik No. 10 Medan", font: FONT, size: 20 })]),
    k([new TextRun({ text: "Telepon: (061) 451 7830, Faksimile: (061) 451 4328", font: FONT, size: 20 })]),
    new Paragraph({ children: [new TextRun({ text: "Laman: www.bhpmedan.kemenkum.go.id, Pos-el: bhp.medan@kemenkum.go.id", font: FONT, size: 20 })],
      alignment: AlignmentType.CENTER, indent: { left: 1418 } }),
    // garis kop selebar margin (seperti garis horizontal surat CV Hitado), bukan mulai dari indentasi teks kop
    new Paragraph({ children: [], spacing: { before: 40, after: 160, line: 120, lineRule: "exact" },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: "A0A0A0", space: 1 } } }),
  ];
}

function kepala(sifat, lampiran, hal) {
  const W = [1304, 236, 4139, 3402];
  const c = (t, i, right) => new TableCell({ borders: NOB, width: { size: W[i], type: WidthType.DXA },
    children: [new Paragraph({ children: runs(t), alignment: right ? AlignmentType.RIGHT : AlignmentType.LEFT, spacing: { after: 40 } })] });
  const row = (a, b, d = "") => new TableRow({ children: [c(a, 0), c(":", 1), c(b, 2), c(d, 3, true)] });
  return new Table({ width: { size: 9081, type: WidthType.DXA }, columnWidths: W, borders: NOB, rows: [
    row("Nomor", "W.2.AHU.AHU.1-AH.06.06-……", "Medan, ……………… 2026"),
    row("Sifat", sifat), row("Lampiran", lampiran), row("Hal", hal),
  ] });
}

function tujuan(lines) {
  return [blank(), ...lines.map(t => plain(t)), blank()];
}

function ttd(jabatan = "Kepala,", nama = "Syafriadi Lubis", tanggal) {
  const W = [5896, 3061];
  const cell = (ps, i) => new TableCell({ borders: NOB, width: { size: W[i], type: WidthType.DXA }, children: ps });
  return new Table({ width: { size: 8957, type: WidthType.DXA }, columnWidths: W, borders: NOB, rows: [new TableRow({ cantSplit: true, children: [
    cell([blank()], 0),
    cell([...(tanggal ? [plain(tanggal)] : []), plain(jabatan), blank(), blank(), blank(), plain(nama)], 1),
  ] })] });
}

function tembusan(list) {
  if (!list || !list.length) return [];
  const n = ++inst;
  return [
    blank(),
    new Paragraph({ children: [new TextRun({ text: "Tembusan:", font: FONT, size: 16 })], spacing: { ...LS, after: 40 } }),
    ...list.map(t => new Paragraph({ children: [new TextRun({ text: t, font: FONT, size: 16 })], numbering: { reference: "tembusan", level: 0, instance: n }, alignment: AlignmentType.JUSTIFIED, spacing: LS })),
  ];
}

function grid(header, rows, widths, aligns) {
  const A = { L: AlignmentType.LEFT, C: AlignmentType.CENTER, R: AlignmentType.RIGHT, J: AlignmentType.JUSTIFIED };
  const cell = (t, i, head) => new TableCell({ borders: B, width: { size: widths[i], type: WidthType.DXA },
    margins: { left: 80, right: 80 }, verticalAlign: VerticalAlign.CENTER,
    shading: head ? { type: ShadingType.CLEAR, color: "auto", fill: "F2F2F2" } : undefined,
    children: [new Paragraph({ children: runs(t, { size: 20, bold: head }), alignment: head ? AlignmentType.CENTER : A[aligns[i]], spacing: { before: 60, after: 60 } })] });
  return new Table({ width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths, rows: [
    new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, i, true)) }),
    ...rows.map(r => new TableRow({ cantSplit: true, children: r.map((t, i) => cell(t, i, false)) })),
  ] });
}

// Satu surat lengkap
function surat({ label, sifat = "Segera", lampiran = "-", hal, kepada, pembuka, butir = [], sisip = [], setelah = [], penutup, tembus, jabatan, nama }) {
  return [
    ...kop(), kepala(sifat, lampiran, hal), ...tujuan(kepada),
    par(pembuka), ...butirList(butir), ...sisip, ...(typeof setelah === "function" ? setelah() : setelah),
    par(penutup, 200, true), ttd(jabatan, nama), ...tembusan(tembus),
  ];
}
const pb = () => new Paragraph({ children: [new PageBreak()] });
const HP = ["Yth. Hakim Pengawas Kepailitan", "PT Rata Makmur (Dalam Pailit)", "pada Pengadilan Niaga pada Pengadilan Negeri Medan", "di Tempat"];
const TEMBUS_HP = ["Direktur Jenderal Administrasi Hukum Umum", "Direktur Perdata Direktorat Jenderal Administrasi Hukum Umum", "Kepala Kantor Wilayah Kementerian Hukum Sumatera Utara"];

// ============================ SAMPUL DAN DAFTAR ============================
const DAFTAR = [
  ["1", "Hakim Pengawas", "Laporan dan permohonan arahan atas kedudukan eks HGU serta perubahan arah pemberesan", "Fase 1"],
  ["2", "Hakim Pengawas", "Permohonan penyegelan harta pailit dan pengangkatan penilai", "Fase 1"],
  ["3", "Kepala Kanwil BPN Sumatera Utara", "Permohonan penegasan status tanah, kebutuhan bangunan dan tanaman, serta kewajiban ganti rugi", "Fase 1"],
  ["4", "Kepala Kantor Pertanahan Kabupaten Langkat", "Permohonan data dan pendampingan pengukuran pada operasi lapangan", "Fase 1"],
  ["5", "Kapolres Langkat", "Permohonan bantuan pengamanan kegiatan", "Fase 1"],
  ["6", "Camat Selesai", "Pemberitahuan kegiatan dan permohonan kehadiran wakil pemerintah daerah sebagai saksi", "Fase 1"],
  ["7", "Pimpinan KJPP (3 KJPP)", "Permintaan penawaran jasa penilaian", "Fase 1"],
  ["8", "Direktur PT Rata Makmur dan pengelola kebun", "Teguran dan perintah penyerahan hasil kebun sejak 10 April 2023", "Fase 4"],
  ["9", "Umum dan peminat", "Pengumuman penawaran terbuka, berikut surat undangan kepada peminat", "Fase 5"],
  ["10", "Hakim Pengawas", "Permohonan izin penjualan di bawah tangan dan pelepasan kedudukan prioritas", "Fase 6"],
  ["11", "Menteri ATR/Kepala BPN c.q. Kepala Kanwil BPN Sumatera Utara", "Surat pernyataan pelepasan kedudukan prioritas bekas pemegang hak", "Fase 7"],
  ["12", "Kanwil BPN, Kantah Langkat, Debitor, pengelola kebun", "Pemberitahuan pengalihan hak tagih (cessie)", "Fase 7"],
  ["13", "Hakim Pengawas", "Laporan pelaksanaan penjualan dan cessie", "Fase 8"],
  ["Lamp.", "Notaris", "Pokok-pokok akta jual beli bangunan dan benda serta akta cessie", "Fase 7"],
];
const sampul = [
  ...kop(false),
  blank(),
  plain("**HIMPUNAN KONSEP SURAT**", { align: AlignmentType.CENTER, run: { size: 24 } }),
  plain("**DALAM RANGKA PENJUALAN DAN PENGALIHAN (CESSIE)**", { align: AlignmentType.CENTER }),
  plain("**HAK KEPERDATAAN ATAS EKS HGU NOMOR 2/SEI TAMPA**", { align: AlignmentType.CENTER }),
  plain("**KEPAILITAN PT RATA MAKMUR (DALAM PAILIT)**", { align: AlignmentType.CENTER, after: 240 }),
  par("Himpunan ini memuat konsep surat yang perlu diterbitkan Balai Harta Peninggalan Medan selaku Kurator, sesuai urutan tahapan dalam Simulasi Kegiatan dan Kajian Yuridis Cessie tanggal 29 September 2026. Nomor dan tanggal surat dikosongkan untuk diisi pada saat surat diterbitkan. Isi yang ditandai titik-titik (……) diisi sesuai keadaan pada saat itu."),
  blank(),
  grid(["No", "Tujuan", "Hal", "Tahap"], DAFTAR, [850, 2650, 4481, 1100], ["C", "L", "L", "C"]),
];

// ============================ SURAT-SURAT ============================
const S1 = surat({
  label: "Konsep Surat 1", lampiran: "1 (satu) berkas",
  hal: "Laporan dan Permohonan Arahan atas Kedudukan Eks HGU Nomor 2/Sei Tampa dalam Kepailitan PT Rata Makmur (Dalam Pailit)",
  kepada: HP,
  pembuka: `Sehubungan dengan pelaksanaan tugas Balai Harta Peninggalan Medan selaku Kurator dalam perkara kepailitan PT Rata Makmur (Dalam Pailit) berdasarkan ${PERKARA}, dengan hormat kami laporkan hal-hal sebagai berikut:`,
  butir: [
    "Bahwa pada tanggal 14 September 2026 Kurator telah melaksanakan rapat dengan kuasa hukum dan keluarga Debitor untuk membahas surat permohonan Debitor tanggal 2 September 2026. Kurator menolak permintaan agar Kurator mengajukan permohonan angsuran pajak atas nama Debitor guna menjaga independensi sebagaimana dimaksud Pasal 15 ayat (3) Undang-Undang Nomor 37 Tahun 2004 tentang Kepailitan dan Penundaan Kewajiban Pembayaran Utang, dan telah menyampaikan tanggapan tertulis kepada Debitor;",
    `Bahwa berdasarkan surat Kepala Kantor Pertanahan Kabupaten Langkat Nomor HP.02.04/712-12.05/VIII/2024 tanggal 12 Agustus 2024, hak atas ${HGU} telah berakhir pada tanggal 31 Agustus 2013 dan tidak pernah dimohonkan perpanjangan maupun pembaruan;`,
    "Bahwa menurut Pasal 34 huruf a Undang-Undang Nomor 5 Tahun 1960 jo. Pasal 17 Peraturan Pemerintah Nomor 40 Tahun 1996, Hak Guna Usaha hapus karena berakhirnya jangka waktu, dan hapusnya hak tersebut mengakibatkan tanahnya menjadi tanah negara. Dengan demikian, pada saat putusan pailit diucapkan tanggal 10 April 2023, tanah tersebut telah bukan lagi kekayaan Debitor, sehingga berada di luar harta pailit sebagaimana dimaksud Pasal 21 Undang-Undang Nomor 37 Tahun 2004;",
    "Bahwa berdasarkan asas pemisahan horizontal yang dianut hukum tanah nasional, bangunan, benda, dan tanaman di atas tanah tersebut tidak ikut beralih kepada negara. Pasal 18 Peraturan Pemerintah Nomor 40 Tahun 1996 menentukan bahwa apabila bangunan, tanaman, dan benda tersebut masih diperlukan untuk melangsungkan atau memulihkan pengusahaan tanahnya, kepada bekas pemegang hak diberikan ganti rugi, sedangkan Pasal 4 ayat (4) peraturan pemerintah dimaksud membebankan ganti kerugian atas tanaman atau bangunan milik bekas pemegang hak kepada pemegang Hak Guna Usaha yang baru;",
    "Bahwa oleh karena itu yang masih dapat dibereskan untuk kepentingan para Kreditor adalah: (a) bangunan dan benda milik Debitor di lokasi kebun; (b) hak atas ganti rugi atas bangunan, tanaman, dan benda yang masih diperlukan untuk pengusahaan tanah; dan (c) hak menagih hasil kebun yang diterima Debitor atau pihak lain sejak tanggal 10 April 2023;",
    "Bahwa rencana Kurator sebelumnya untuk melelang tanah eks HGU melalui KPKNL Medan, sebagaimana dilaporkan dalam Laporan Perkembangan Kepailitan tanggal 10 Januari 2025, perlu dihentikan, karena penjualan atas benda yang bukan milik Debitor pailit berisiko dibatalkan dan menimbulkan kerugian bagi harta pailit;",
    "Bahwa Kurator merencanakan pemberesan melalui penjualan satu paket atas bangunan dan benda, pengalihan (cessie) hak atas ganti rugi dan hak menagih hasil kebun, serta pelepasan kedudukan prioritas bekas pemegang hak, yang ditawarkan secara terbuka kepada para peminat, termasuk calon pemohon Hak Guna Usaha baru. Rencana ini akan dimohonkan izin tersendiri kepada Hakim Pengawas setelah penilaian selesai dilakukan.",
  ],
  sisip: [par("Berdasarkan uraian tersebut, dengan hormat kami mohon arahan Hakim Pengawas atas hal-hal berikut:"),
    ...butirList([
      "penghentian rencana lelang tanah eks HGU Nomor 2/Sei Tampa dan koreksi daftar harta pailit sehingga hanya memuat bangunan, benda, dan hak tagih sebagaimana tersebut di atas;",
      "persetujuan atas arah pemberesan melalui penjualan satu paket sebagaimana diuraikan pada angka 7; dan",
      "persetujuan agar setiap setoran dana dari Debitor atau pihak ketiga untuk pelunasan tagihan diterima melalui rekening harta pailit dan dibagikan menurut Daftar Piutang Tetap tanggal 22 Juni 2023.",
    ])],
  penutup: "Demikian laporan dan permohonan ini kami sampaikan. Atas perhatian dan arahan Hakim Pengawas, kami ucapkan terima kasih.",
  tembus: TEMBUS_HP,
});

const S2 = surat({
  label: "Konsep Surat 2",
  hal: "Permohonan Penyegelan Harta Pailit dan Pengangkatan Penilai dalam Kepailitan PT Rata Makmur (Dalam Pailit)",
  kepada: HP,
  pembuka: `Sehubungan dengan pelaksanaan tugas Balai Harta Peninggalan Medan selaku Kurator dalam perkara kepailitan PT Rata Makmur (Dalam Pailit) berdasarkan ${PERKARA}, dengan hormat kami sampaikan hal-hal sebagai berikut:`,
  butir: [
    `Bahwa di lokasi ${HGU} terdapat bangunan dan benda milik Debitor yang merupakan harta pailit, sedangkan kebun diketahui masih diusahakan dan diduga dipanen oleh pihak lain tanpa penyerahan hasil kepada Kurator;`,
    "Bahwa untuk mengamankan harta pailit tersebut dan mencegah pemindahan atau perusakan, Kurator memandang perlu dilakukan penyegelan. Pasal 99 ayat (1) Undang-Undang Nomor 37 Tahun 2004 menentukan sebagai berikut:",
  ],
  setelah: () => [
    kutip("\"Kurator dapat meminta penyegelan harta pailit kepada Pengadilan, berdasarkan alasan untuk mengamankan harta pailit, melalui Hakim Pengawas.\""),
    ...butirList([
      "Bahwa sesuai Pasal 99 ayat (2) undang-undang dimaksud, penyegelan dilakukan oleh juru sita di tempat harta tersebut berada dengan dihadiri 2 (dua) orang saksi, salah satu di antaranya adalah wakil pemerintah daerah setempat. Kurator telah berkoordinasi dengan Camat Selesai dan Kepolisian Resor Langkat untuk kehadiran saksi dan pengamanan kegiatan;",
      "Bahwa guna menentukan nilai wajar atas bangunan, benda, hak ganti rugi atas tanaman, dan hak menagih hasil kebun sebagai dasar pemberesan, diperlukan penilaian oleh Kantor Jasa Penilai Publik. Kurator telah meminta penawaran kepada paling sedikit 3 (tiga) KJPP dan memilih KJPP …………………… sebagai penilai;",
      "Bahwa untuk efisiensi dan keamanan, Kurator merencanakan penyegelan, inventarisasi, pengukuran oleh Kantor Pertanahan Kabupaten Langkat, dan peninjauan oleh penilai dilaksanakan bersamaan pada hari …………, tanggal …………… 2026.",
    ], { cont: true }),
    par("Berdasarkan uraian tersebut, dengan hormat kami mohon Hakim Pengawas berkenan:"),
    ...butirList([
      "meneruskan permintaan penyegelan atas bangunan dan benda milik PT Rata Makmur (Dalam Pailit) di lokasi eks HGU Nomor 2/Sei Tampa kepada Pengadilan, untuk dilaksanakan oleh juru sita pada tanggal tersebut; dan",
      "menerbitkan penetapan pengangkatan KJPP …………………… sebagai penilai harta pailit PT Rata Makmur (Dalam Pailit).",
    ], { keepLast: true }),
  ],
  penutup: "Demikian permohonan ini kami sampaikan. Atas perhatian dan perkenan Hakim Pengawas, kami ucapkan terima kasih.",
  tembus: ["Ketua Pengadilan Negeri Medan (sebagai laporan)", "Kepala Kantor Wilayah Kementerian Hukum Sumatera Utara"],
});

const S3 = surat({
  label: "Konsep Surat 3",
  hal: "Permohonan Penegasan Status Tanah Eks HGU Nomor 2/Sei Tampa dan Kewajiban Ganti Rugi atas Bangunan dan Tanaman",
  kepada: ["Yth. Kepala Kantor Wilayah Badan Pertanahan Nasional", "Provinsi Sumatera Utara", "c.q. Ketua Tim Khusus Penanganan Eks HGU PT Rata Makmur", "di Medan"],
  pembuka: `Menunjuk ${PERKARA} yang menyatakan PT Rata Makmur pailit dengan segala akibat hukumnya serta mengangkat Balai Harta Peninggalan Medan sebagai Kurator, serta menindaklanjuti koordinasi sebelumnya dengan Kantor Wilayah Badan Pertanahan Nasional Provinsi Sumatera Utara, bersama ini kami sampaikan hal-hal sebagai berikut:`,
  butir: [
    `Bahwa berdasarkan surat Kepala Kantor Pertanahan Kabupaten Langkat Nomor HP.02.04/712-12.05/VIII/2024 tanggal 12 Agustus 2024, ${HGU} atas nama PT Rata Makmur telah berakhir pada tanggal 31 Agustus 2013, dan terhadap bidang tersebut tercatat blokir dari Balai Harta Peninggalan Medan;`,
    "Bahwa Kurator berpendapat tanah tersebut telah menjadi tanah negara, sehingga Kurator tidak akan melelang tanahnya. Namun demikian, bangunan, benda, dan tanaman kelapa sawit di atas tanah tersebut merupakan milik PT Rata Makmur, dan hak-hak keperdataan atas benda tersebut merupakan harta pailit yang wajib dibereskan Kurator untuk kepentingan para kreditor;",
    "Bahwa Pasal 18 Peraturan Pemerintah Nomor 40 Tahun 1996 mengatur kewajiban bekas pemegang hak atas bangunan, benda, dan tanaman, serta hak atas ganti rugi apabila bangunan, tanaman, dan benda tersebut masih diperlukan untuk melangsungkan atau memulihkan pengusahaan tanahnya. Pasal 4 ayat (4) peraturan pemerintah dimaksud membebankan ganti kerugian atas tanaman atau bangunan milik bekas pemegang hak kepada pemegang Hak Guna Usaha yang baru;",
    "Bahwa terdapat perbedaan luas bidang, yaitu 388,7463 Ha menurut surat Kantor Pertanahan Kabupaten Langkat dan 338,7463 Ha menurut data yang ada pada Kurator, sedangkan bidang tersebut belum terpetakan pada aplikasi KKP.",
  ],
  sisip: [par("Sehubungan dengan hal tersebut, dengan hormat kami mohon penegasan tertulis mengenai:"),
    ...butirList([
      "status hukum tanah eks HGU Nomor 2/Sei Tampa pada saat ini, termasuk apakah terdapat rencana penataan kembali, pemberian Hak Pengelolaan, atau peruntukan lain atas tanah tersebut;",
      "apakah bangunan, benda, dan tanaman di atas tanah tersebut dinilai masih diperlukan untuk melangsungkan pengusahaan tanahnya;",
      "ada tidaknya permohonan hak baru atas tanah tersebut, serta kewajiban pemohon untuk memberikan ganti kerugian kepada bekas pemegang hak atas bangunan dan tanaman;",
      "kedudukan prioritas bekas pemegang hak sebagaimana dimaksud Pasal 22 Peraturan Pemerintah Nomor 18 Tahun 2021, dan tata cara pelepasannya oleh Kurator apabila diperlukan; dan",
      "luas dan batas bidang yang benar, serta kesediaan Kantor Pertanahan Kabupaten Langkat untuk melakukan pengukuran bersama Kurator.",
    ])],
  penutup: "Penegasan tersebut sangat kami perlukan sebagai dasar pemberesan dan penentuan nilai harta pailit. Demikian permohonan ini kami sampaikan, atas perhatian dan kerja sama Bapak/Ibu diucapkan terima kasih.",
  tembus: ["Hakim Pengawas Kepailitan PT Rata Makmur (Dalam Pailit)", "Kepala Kantor Wilayah Kementerian Hukum Sumatera Utara", "Kepala Kantor Pertanahan Kabupaten Langkat"],
});

const S4 = surat({
  label: "Konsep Surat 4", sifat: "Segera",
  hal: "Permohonan Data dan Pendampingan Pengukuran Bidang Eks HGU Nomor 2/Sei Tampa",
  kepada: ["Yth. Kepala Kantor Pertanahan", "Kabupaten Langkat", "di Stabat"],
  pembuka: `Menunjuk ${PERKARA} serta surat Bapak/Ibu Nomor HP.02.04/712-12.05/VIII/2024 tanggal 12 Agustus 2024, bersama ini kami sampaikan bahwa Kurator akan melaksanakan penyegelan dan inventarisasi harta pailit PT Rata Makmur (Dalam Pailit) di lokasi ${HGU}. Sehubungan dengan hal tersebut, kami mohon bantuan Bapak/Ibu berupa:`,
  butir: [
    "salinan data yuridis dan data fisik bidang eks HGU Nomor 2/Sei Tampa, termasuk Surat Ukur Sementara Nomor 471/1989 tanggal 6 Juni 1989 dan gambar situasinya;",
    "penugasan petugas ukur untuk mendampingi kegiatan pada hari …………, tanggal …………… 2026, guna mengambil titik koordinat batas bidang dan letak bangunan; dan",
    "penjelasan atas perbedaan luas 388,7463 Ha dan 338,7463 Ha.",
  ],
  penutup: "Biaya yang timbul atas pelayanan tersebut akan dibebankan pada harta pailit sesuai ketentuan yang berlaku. Demikian permohonan ini kami sampaikan, atas perhatian dan kerja sama Bapak/Ibu diucapkan terima kasih.",
  tembus: ["Hakim Pengawas Kepailitan PT Rata Makmur (Dalam Pailit)", "Kepala Kantor Wilayah Badan Pertanahan Nasional Provinsi Sumatera Utara"],
});

const S5 = surat({
  label: "Konsep Surat 5", lampiran: "1 (satu) berkas",
  hal: "Permohonan Bantuan Pengamanan Kegiatan Penyegelan dan Inventarisasi Harta Pailit PT Rata Makmur (Dalam Pailit)",
  kepada: ["Yth. Kepala Kepolisian Resor Langkat", "di Stabat"],
  pembuka: `Menunjuk ${PERKARA} yang menyatakan PT Rata Makmur pailit serta mengangkat Balai Harta Peninggalan Medan sebagai Kurator, dengan hormat kami sampaikan bahwa Kurator bersama juru sita Pengadilan Niaga pada Pengadilan Negeri Medan, Kantor Pertanahan Kabupaten Langkat, dan penilai akan melaksanakan kegiatan sebagai berikut:`,
  butir: [
    "Kegiatan: penyegelan, inventarisasi, dan pengukuran harta pailit PT Rata Makmur (Dalam Pailit);",
    "Hari/tanggal: …………, …………… 2026, pukul 08.00 WIB s.d. selesai;",
    "Titik kumpul: Kantor Kepolisian Sektor Selesai;",
    `Lokasi: ${HGU};`,
    "Jumlah peserta: ± …… orang.",
  ],
  setelah: [par("Mengingat lokasi kebun masih diusahakan oleh pihak lain dan terdapat potensi gangguan keamanan, dengan hormat kami mohon bantuan pengamanan dari Kepolisian Resor Langkat selama kegiatan berlangsung, serta kesediaan Bapak/Ibu untuk menunjuk perwira penghubung yang dapat kami hubungi guna koordinasi teknis. Sebagai bahan pertimbangan, bersama ini kami lampirkan salinan putusan pailit dan penetapan Hakim Pengawas.")],
  penutup: "Demikian permohonan ini kami sampaikan. Atas perhatian dan bantuan Bapak/Ibu, kami ucapkan terima kasih.",
  tembus: ["Kepala Kepolisian Daerah Sumatera Utara", "Hakim Pengawas Kepailitan PT Rata Makmur (Dalam Pailit)", "Kepala Kepolisian Sektor Selesai"],
});

const S6 = surat({
  label: "Konsep Surat 6",
  hal: "Pemberitahuan Kegiatan dan Permohonan Kehadiran Wakil Pemerintah Daerah sebagai Saksi Penyegelan",
  kepada: ["Yth. Camat Selesai", "Kabupaten Langkat", "di Tempat"],
  pembuka: `Menunjuk ${PERKARA}, dengan hormat kami beritahukan bahwa pada hari …………, tanggal …………… 2026, Kurator bersama juru sita Pengadilan Niaga pada Pengadilan Negeri Medan akan melaksanakan penyegelan dan inventarisasi harta pailit PT Rata Makmur (Dalam Pailit) yang terletak di ${HGU}.`,
  butir: [
    "Sesuai Pasal 99 ayat (2) Undang-Undang Nomor 37 Tahun 2004, penyegelan dilakukan oleh juru sita dengan dihadiri 2 (dua) orang saksi, salah satu di antaranya adalah wakil pemerintah daerah setempat;",
    "Sehubungan dengan hal tersebut, kami mohon kesediaan Bapak/Ibu untuk hadir atau menugaskan wakil dari Kantor Camat Selesai sebagai saksi, serta memberitahukan kegiatan ini kepada Kepala Desa Sei Tampa dan Kepala Desa Bekulap;",
    "Kami juga mengharapkan informasi dari Bapak/Ibu mengenai keadaan terakhir di lokasi kebun, termasuk pihak-pihak yang saat ini menguasai atau mengusahakan kebun tersebut.",
  ],
  penutup: "Demikian pemberitahuan dan permohonan ini kami sampaikan. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.",
  tembus: ["Bupati Langkat", "Hakim Pengawas Kepailitan PT Rata Makmur (Dalam Pailit)", "Kepala Desa Sei Tampa", "Kepala Desa Bekulap"],
});

const S7 = surat({
  label: "Konsep Surat 7", sifat: "Biasa",
  hal: "Permintaan Penawaran Jasa Penilaian Harta Pailit PT Rata Makmur (Dalam Pailit)",
  kepada: ["Yth. Pimpinan KJPP ……………………", "di ……………………"],
  pembuka: `Menunjuk ${PERKARA}, Balai Harta Peninggalan Medan selaku Kurator bermaksud menggunakan jasa Kantor Jasa Penilai Publik untuk menilai harta pailit PT Rata Makmur (Dalam Pailit) dengan ruang lingkup sebagai berikut:`,
  butir: [
    `nilai pasar dan nilai likuidasi bangunan dan benda milik Debitor di lokasi ${HGU}, termasuk nilai sisa apabila bangunan dibongkar;`,
    "nilai ganti rugi atas tanaman kelapa sawit dan bangunan yang masih diperlukan untuk melangsungkan pengusahaan tanah, dengan memperhatikan umur, kerapatan, dan kondisi tanaman;",
    "nilai hak menagih hasil kebun sejak tanggal 10 April 2023 berdasarkan perkiraan produksi dan harga tandan buah segar pada periode tersebut; dan",
    "rekomendasi nilai wajar untuk penjualan satu paket atas seluruh hak tersebut dalam kondisi apa adanya (as is).",
  ],
  setelah: [par("Tanah eks HGU telah menjadi tanah negara dan tidak termasuk objek penilaian. Kami mohon Saudara menyampaikan surat penawaran yang memuat biaya, jangka waktu penyelesaian, susunan tim penilai, dan salinan izin KJPP paling lambat tanggal …………… 2026. Biaya jasa penilaian akan dibebankan pada harta pailit setelah memperoleh persetujuan Hakim Pengawas.")],
  penutup: "Demikian permintaan ini kami sampaikan. Atas perhatian Saudara, kami ucapkan terima kasih.",
  tembus: ["Hakim Pengawas Kepailitan PT Rata Makmur (Dalam Pailit)"],
});

const S8 = surat({
  label: "Konsep Surat 8", lampiran: "-",
  hal: "Teguran dan Perintah Penyerahan Hasil Kebun Eks HGU Nomor 2/Sei Tampa kepada Kurator",
  kepada: ["Yth. 1. Direktur PT Rata Makmur (Dalam Pailit)", "c.q. Kuasa Hukum, Frien Jones I.H.T. dan Kesia Yohana P.", "Jl. Sriwijaya No. 68 A, Kelurahan Petisah Hulu, Medan", "2. Pihak yang mengusahakan atau memanen kebun eks HGU Nomor 2/Sei Tampa", "di Tempat"],
  pembuka: `Menunjuk ${PERKARA} serta surat Kurator sebelumnya perihal perintah penyerahan hasil kebun lahan PT Rata Makmur (Dalam Pailit), dengan ini kami sampaikan hal-hal sebagai berikut:`,
  butir: [
    "Bahwa sejak putusan pernyataan pailit diucapkan, Debitor demi hukum kehilangan haknya untuk menguasai dan mengurus kekayaannya yang termasuk dalam harta pailit (Pasal 24 ayat (1) Undang-Undang Nomor 37 Tahun 2004), dan kepailitan meliputi segala sesuatu yang diperoleh selama kepailitan (Pasal 21);",
    "Bahwa hasil panen kelapa sawit maupun uang kontrak panen atas kebun eks HGU Nomor 2/Sei Tampa yang diterima sejak tanggal 10 April 2023 merupakan bagian dari harta pailit yang wajib diserahkan kepada Kurator;",
    "Bahwa setiap perjanjian pengusahaan atau panen yang dibuat Debitor setelah tanggal 10 April 2023 tidak mengikat harta pailit;",
    "Bahwa sampai dengan saat ini belum ada hasil kebun yang diserahkan kepada Kurator.",
  ],
  setelah: [par("Sehubungan dengan hal tersebut, dengan ini Kurator memerintahkan Saudara untuk, dalam waktu 14 (empat belas) hari kalender sejak surat ini diterima:"),
    ...butirList([
      "menyerahkan kepada Kurator rincian seluruh hasil panen dan uang kontrak yang diterima sejak tanggal 10 April 2023, berikut salinan perjanjian dan bukti penerimaannya;",
      "menyetorkan jumlah tersebut ke rekening harta pailit PT Rata Makmur (Dalam Pailit) Nomor …………………… pada Bank ……………………; dan",
      "menyerahkan kunci serta dokumen bangunan milik PT Rata Makmur di lokasi kebun kepada Kurator.",
    ]),
    par("Apabila perintah ini tidak dipenuhi, Kurator akan menempuh upaya hukum, termasuk mengajukan gugatan kepada Pengadilan Niaga pada Pengadilan Negeri Medan dan memohon kepada Hakim Pengawas agar mengusulkan tindakan terhadap Debitor sebagaimana dimaksud Pasal 93 Undang-Undang Nomor 37 Tahun 2004.", 120, true),
  ],
  penutup: "Demikian untuk menjadi perhatian dan dilaksanakan.",
  tembus: ["Hakim Pengawas Kepailitan PT Rata Makmur (Dalam Pailit)", "Kepala Kepolisian Sektor Selesai"],
});

const S9 = [
  ...kop(),
  plain("**PENGUMUMAN**", { align: AlignmentType.CENTER }),
  plain("Nomor W.2.AHU.AHU.1-AH.06.06-……", { align: AlignmentType.CENTER }),
  plain("**PENAWARAN TERBUKA PENJUALAN HAK KEPERDATAAN HARTA PAILIT**", { align: AlignmentType.CENTER }),
  plain("**PT RATA MAKMUR (DALAM PAILIT)**", { align: AlignmentType.CENTER, after: 200 }),
  par(`Balai Harta Peninggalan Medan selaku Kurator PT Rata Makmur (Dalam Pailit) berdasarkan ${PERKARA}, dengan ini mengumumkan penawaran terbuka atas satu paket hak keperdataan harta pailit dengan ketentuan sebagai berikut:`),
  ...butirList([
    `Objek: satu paket yang terdiri atas (a) bangunan dan benda milik PT Rata Makmur di lokasi ${HGU}; (b) hak atas ganti rugi atas bangunan, tanaman, dan benda yang masih diperlukan untuk pengusahaan tanah; (c) hak menagih hasil kebun sejak 10 April 2023; dan (d) pelepasan kedudukan prioritas bekas pemegang hak;`,
    "Status: tanah eks HGU telah menjadi tanah negara dan **tidak termasuk** objek yang dijual. Seluruh objek dijual dalam kondisi apa adanya (as is), tanpa jaminan dari Kurator mengenai pemberian hak atas tanah, besaran ganti rugi, maupun penguasaan fisik lokasi;",
    "Nilai limit: Rp……………………, berdasarkan penilaian KJPP ……………………;",
    "Penjelasan (aanwijzing): hari …………, tanggal …………… 2026, pukul 10.00 WIB, di Kantor Balai Harta Peninggalan Medan, Jalan Listrik No. 10 Medan;",
    "Penawaran tertulis dalam sampul tertutup disampaikan paling lambat hari …………, tanggal …………… 20…, pukul 15.00 WIB, dilampiri identitas atau akta pendirian peserta, surat pernyataan tidak terafiliasi dengan Debitor, direksi, maupun pihak yang mengusahakan kebun, serta bukti kemampuan dana;",
    "Pembukaan penawaran dilakukan di hadapan saksi pada hari …………, tanggal …………… 20…. Penjualan kepada penawar terbaik dilaksanakan setelah memperoleh izin Hakim Pengawas;",
    "Informasi lebih lanjut: Seksi Harta Peninggalan Wilayah II, Balai Harta Peninggalan Medan, telepon (061) 451 7830.",
  ]),
  blank(),
  ttd("Kepala,", "Syafriadi Lubis", "Medan, ……………… 20…"),
  //plain("**Catatan untuk surat undangan kepada peminat.** Pengumuman ini dikirim dengan surat pengantar kepada peminat yang telah diketahui, antara lain PT Raya Padang Langkat (surat minat tanggal 22 Agustus 2024), dengan hal \"Undangan Mengikuti Penawaran Terbuka Hak Keperdataan Harta Pailit PT Rata Makmur (Dalam Pailit)\". Isi surat pengantar cukup merujuk pengumuman ini dan melampirkannya.", { after: 0, run: { size: 18 } }),
];

const S10 = surat({
  label: "Konsep Surat 10", lampiran: "1 (satu) berkas",
  hal: "Permohonan Izin Penjualan di Bawah Tangan dan Pelepasan Kedudukan Prioritas atas Hak Keperdataan Eks HGU Nomor 2/Sei Tampa",
  kepada: HP,
  pembuka: `Sehubungan dengan pelaksanaan tugas Balai Harta Peninggalan Medan selaku Kurator dalam perkara kepailitan PT Rata Makmur (Dalam Pailit) berdasarkan ${PERKARA}, serta menindaklanjuti arahan Hakim Pengawas atas surat kami Nomor …………………… tanggal ……………, dengan hormat kami sampaikan hal-hal sebagai berikut:`,
  butir: [
    "Bahwa penyegelan dan inventarisasi harta pailit telah dilaksanakan pada tanggal ……………, sebagaimana Berita Acara Penyegelan dan Berita Acara Inventarisasi terlampir;",
    "Bahwa KJPP …………………… telah menyampaikan laporan penilaian tanggal ……………, dengan nilai wajar paket sebesar Rp…………………… dan nilai likuidasi sebesar Rp……………………;",
    "Bahwa Kurator telah mengumumkan penawaran terbuka pada tanggal …………… dan menerima …… penawaran. Penawar terbaik adalah …………………… dengan harga Rp……………………, yang telah menyatakan tidak terafiliasi dengan Debitor, direksi, maupun pihak yang mengusahakan kebun;",
    "Bahwa objek yang ditawarkan berupa hak atas ganti rugi, hak menagih hasil kebun, serta bangunan dan benda yang berdiri di atas tanah negara, tidak dapat dijual secara terpisah melalui lelang tanpa kehilangan nilainya, karena nilai hak-hak tersebut hanya dapat direalisasikan oleh pihak yang akan mengusahakan tanah tersebut;",
    "Bahwa Pasal 185 ayat (3) Undang-Undang Nomor 37 Tahun 2004 menentukan sebagai berikut:",
  ],
  setelah: () => [
    kutip("\"Semua benda yang tidak segera atau sama sekali tidak dapat dibereskan maka Kurator yang memutuskan tindakan yang harus dilakukan terhadap benda tersebut dengan izin Hakim Pengawas.\""),
    ...butirList([
      "Bahwa pengalihan hak atas ganti rugi dan hak menagih hasil kebun akan dilakukan dengan akta cessie sebagaimana dimaksud Pasal 613 Kitab Undang-Undang Hukum Perdata, sedangkan bangunan dan benda dialihkan dengan akta jual beli, seluruhnya dibuat di hadapan notaris dalam kondisi apa adanya (as is), dengan pembayaran lunas ke rekening harta pailit sebelum atau pada saat penandatanganan akta;",
      "Bahwa agar pembeli tidak terhalang dalam memohon hak atas tanah, Kurator perlu menyatakan pelepasan kedudukan prioritas bekas pemegang hak sebagaimana dimaksud Pasal 22 Peraturan Pemerintah Nomor 18 Tahun 2021. Kedudukan tersebut bukan merupakan benda yang dapat dijual, namun pelepasannya merupakan bagian dari nilai paket.",
    ], { cont: true }),
    par("Berdasarkan uraian tersebut, dengan hormat kami mohon Hakim Pengawas berkenan menerbitkan penetapan yang:"),
    ...butirList([
      "memberikan izin kepada Kurator untuk menjual bangunan dan benda serta mengalihkan dengan cessie hak atas ganti rugi dan hak menagih hasil kebun milik PT Rata Makmur (Dalam Pailit) secara di bawah tangan kepada …………………… dengan harga paling sedikit Rp……………………;",
      "memberikan izin kepada Kurator untuk menandatangani surat pernyataan pelepasan kedudukan prioritas bekas pemegang hak atas eks HGU Nomor 2/Sei Tampa; dan",
      "memerintahkan agar hasil penjualan disetor ke rekening harta pailit dan dibagikan sesuai daftar pembagian yang akan disusun Kurator.",
    ], { keepLast: true }),
  ],
  penutup: "Demikian permohonan ini kami sampaikan. Atas perhatian dan perkenan Hakim Pengawas, kami ucapkan terima kasih.",
  tembus: ["Ketua Pengadilan Negeri Medan (sebagai laporan)", ...TEMBUS_HP],
});

const S11 = [
  ...kop(),
  plain("**SURAT PERNYATAAN**", { align: AlignmentType.CENTER }),
  plain("**PELEPASAN KEDUDUKAN PRIORITAS BEKAS PEMEGANG HAK**", { align: AlignmentType.CENTER }),
  plain("**ATAS EKS HAK GUNA USAHA NOMOR 2/SEI TAMPA**", { align: AlignmentType.CENTER }),
  plain("Nomor W.2.AHU.AHU.1-AH.06.06-……", { align: AlignmentType.CENTER, after: 200 }),
  plain("Yang bertanda tangan di bawah ini:", { after: 80 }),
  new Table({ width: { size: 9081, type: WidthType.DXA }, columnWidths: [2400, 236, 6445], borders: NOB, rows: [
    ["Nama", "Syafriadi Lubis"], ["Jabatan", "Kepala Balai Harta Peninggalan Medan"],
    ["Bertindak untuk", `dan atas nama Balai Harta Peninggalan Medan selaku Kurator PT Rata Makmur (Dalam Pailit) berdasarkan ${PERKARA}, dan berdasarkan Penetapan Hakim Pengawas Nomor …………………… tanggal ……………`],
  ].map(([a, b]) => new TableRow({ children: [
    new TableCell({ borders: NOB, width: { size: 2400, type: WidthType.DXA }, children: [plain(a, { after: 60 })] }),
    new TableCell({ borders: NOB, width: { size: 236, type: WidthType.DXA }, children: [plain(":", { after: 60 })] }),
    new TableCell({ borders: NOB, width: { size: 6445, type: WidthType.DXA }, children: [new Paragraph({ children: runs(b), alignment: AlignmentType.JUSTIFIED, spacing: { after: 60 } })] }),
  ] })) }),
  blank(),
  plain("dengan ini menyatakan:", { after: 120 }),
  ...butirList([
    `bahwa PT Rata Makmur (Dalam Pailit) adalah bekas pemegang ${HGU}, yang telah berakhir pada tanggal 31 Agustus 2013;`,
    "bahwa Kurator, untuk dan atas nama harta pailit PT Rata Makmur (Dalam Pailit), melepaskan kedudukan prioritas bekas pemegang hak atas tanah tersebut sebagaimana dimaksud Pasal 22 Peraturan Pemerintah Nomor 18 Tahun 2021, dan tidak akan mengajukan permohonan hak atas tanah tersebut;",
    "bahwa pelepasan ini tidak menghapus hak atas ganti rugi atas bangunan, tanaman, dan benda milik PT Rata Makmur, yang telah dialihkan kepada …………………… berdasarkan Akta Nomor …… tanggal …………… yang dibuat di hadapan ……………………, Notaris di ……………………; dan",
    "bahwa pernyataan ini dibuat untuk dipergunakan dalam proses penataan dan pemberian hak atas tanah eks HGU Nomor 2/Sei Tampa oleh Kementerian Agraria dan Tata Ruang/Badan Pertanahan Nasional.",
  ]),
  par("Demikian surat pernyataan ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.", 200),
  ttd("Kepala,", "Syafriadi Lubis", "Medan, ……………… 20…"),
  ...tembusan(["Menteri Agraria dan Tata Ruang/Kepala Badan Pertanahan Nasional", "Kepala Kantor Wilayah Badan Pertanahan Nasional Provinsi Sumatera Utara", "Kepala Kantor Pertanahan Kabupaten Langkat", "Hakim Pengawas Kepailitan PT Rata Makmur (Dalam Pailit)"]),
];

const S12 = surat({
  label: "Konsep Surat 12", lampiran: "1 (satu) berkas",
  hal: "Pemberitahuan Pengalihan Hak Tagih (Cessie) atas Hak Keperdataan Eks HGU Nomor 2/Sei Tampa",
  kepada: ["Yth. 1. Kepala Kantor Wilayah Badan Pertanahan Nasional Provinsi Sumatera Utara", "2. Kepala Kantor Pertanahan Kabupaten Langkat", "3. Direktur PT Rata Makmur (Dalam Pailit)", "4. Pihak yang mengusahakan atau memanen kebun eks HGU Nomor 2/Sei Tampa", "di Tempat"],
  pembuka: `Menunjuk ${PERKARA} dan Penetapan Hakim Pengawas Nomor …………………… tanggal ……………, dengan ini kami beritahukan bahwa berdasarkan Akta Nomor …… tanggal …………… yang dibuat di hadapan ……………………, Notaris di ……………………, Kurator PT Rata Makmur (Dalam Pailit) telah mengalihkan kepada:`,
  butir: [
    "Nama: ……………………;",
    "Alamat: ……………………;",
  ],
  setelah: [
    plain("hak-hak sebagai berikut:", { after: 120 }),
    ...butirList([
      "hak atas ganti rugi atas bangunan, tanaman, dan benda milik PT Rata Makmur di lokasi eks HGU Nomor 2/Sei Tampa sebagaimana dimaksud Pasal 18 dan Pasal 4 ayat (4) Peraturan Pemerintah Nomor 40 Tahun 1996; dan",
      "hak menagih hasil kebun dan uang kontrak panen yang diterima sejak tanggal 10 April 2023.",
    ]),
    par("Pemberitahuan ini disampaikan sesuai Pasal 613 Kitab Undang-Undang Hukum Perdata, yang menentukan bahwa penyerahan piutang atas nama berlaku terhadap pihak yang berutang setelah penyerahan itu diberitahukan kepadanya. Terhitung sejak surat ini diterima, pembayaran atas hak-hak tersebut hanya sah apabila dilakukan kepada penerima pengalihan sebagaimana tersebut di atas. Bangunan dan benda milik PT Rata Makmur di lokasi tersebut juga telah dijual kepada pihak yang sama berdasarkan akta tersendiri. Pemberitahuan ini juga disampaikan secara resmi melalui Juru Sita Pengadilan Niaga pada Pengadilan Negeri Medan."),
  ],
  penutup: "Demikian pemberitahuan ini kami sampaikan untuk menjadi perhatian. Atas kerja sama Bapak/Ibu/Saudara, kami ucapkan terima kasih.",
  tembus: ["Hakim Pengawas Kepailitan PT Rata Makmur (Dalam Pailit)", "Penerima pengalihan"],
});

const S13 = surat({
  label: "Konsep Surat 13", lampiran: "1 (satu) berkas",
  hal: "Laporan Pelaksanaan Penjualan dan Pengalihan Hak Keperdataan Eks HGU Nomor 2/Sei Tampa",
  kepada: HP,
  pembuka: `Menindaklanjuti Penetapan Hakim Pengawas Nomor …………………… tanggal …………… dalam perkara kepailitan PT Rata Makmur (Dalam Pailit) berdasarkan ${PERKARA}, dengan hormat kami laporkan hal-hal sebagai berikut:`,
  butir: [
    "Pada tanggal …………… telah ditandatangani Akta Jual Beli Bangunan dan Benda Nomor …… dan Akta Cessie Nomor …… di hadapan ……………………, Notaris di ……………………, antara Kurator dan ……………………;",
    "Harga sebesar Rp…………………… telah diterima lunas pada rekening harta pailit Nomor …………………… tanggal ……………, sebagaimana bukti setor terlampir;",
    "Surat pernyataan pelepasan kedudukan prioritas telah ditandatangani dan disampaikan kepada Kantor Wilayah Badan Pertanahan Nasional Provinsi Sumatera Utara pada tanggal ……………;",
    "Pemberitahuan cessie telah disampaikan kepada seluruh pihak pada tanggal …………… sesuai Pasal 613 Kitab Undang-Undang Hukum Perdata, dan kunci serta dokumen bangunan telah diserahkan kepada pembeli di Kantor Balai Harta Peninggalan Medan pada tanggal ……………;",
    "Selanjutnya Kurator akan menyusun daftar pembagian sebagaimana dimaksud Pasal 189 Undang-Undang Nomor 37 Tahun 2004 untuk dimintakan persetujuan Hakim Pengawas, termasuk arahan mengenai urutan pembayaran antara tagihan eks karyawan dan tagihan pajak.",
  ],
  penutup: "Demikian laporan ini kami sampaikan. Atas perhatian Hakim Pengawas, kami ucapkan terima kasih.",
  tembus: TEMBUS_HP,
});

// Lampiran: pokok-pokok akta untuk notaris
const LAMP = [
  new Paragraph({ children: runs("**POKOK-POKOK AKTA JUAL BELI BANGUNAN DAN BENDA SERTA AKTA CESSIE**"), alignment: AlignmentType.CENTER, spacing: LS, pageBreakBefore: true }),
  plain("**HAK KEPERDATAAN EKS HGU NOMOR 2/SEI TAMPA**", { align: AlignmentType.CENTER, after: 200 }),
  par("Pokok-pokok ini disampaikan kepada notaris sebagai bahan penyusunan akta, dan bukan merupakan akta."),
  grid(["No", "Pokok", "Isi"], [
    ["1", "Para pihak", "Pihak Pertama: Balai Harta Peninggalan Medan selaku Kurator PT Rata Makmur (Dalam Pailit), diwakili Kepala, berdasarkan putusan pailit dan Penetapan Hakim Pengawas tentang izin penjualan. Pihak Kedua: pembeli/cessionaris"],
    ["2", "Objek akta jual beli", "Bangunan dan benda milik PT Rata Makmur di lokasi eks HGU Nomor 2/Sei Tampa sesuai Berita Acara Inventarisasi tanggal …………… (dilampirkan dalam akta)"],
    ["3", "Objek akta cessie", "(a) Hak atas ganti rugi atas bangunan, tanaman, dan benda menurut Pasal 18 dan Pasal 4 ayat (4) PP 40/1996; (b) hak menagih hasil kebun dan uang kontrak panen sejak 10 April 2023"],
    ["4", "Bukan objek", "Tanah eks HGU (tanah negara); hak Kurator untuk mengajukan gugatan pembatalan (Pasal 47 UU 37/2004) dan tuntutan tanggung jawab direksi"],
    ["5", "Harga dan pembayaran", "Rp…………………… dibayar lunas ke rekening harta pailit sebelum atau pada saat penandatanganan; akta tidak berlaku tanpa bukti setor"],
    ["6", "Kondisi as is", "Pihak Kedua menerima objek dalam keadaan apa adanya dan telah memeriksa sendiri status hukum dan keadaan lapangan"],
    ["7", "Batas tanggung jawab Kurator", "Kurator hanya menjamin bahwa hak tagih itu ada pada saat diserahkan (Pasal 1534 KUHPerdata); tidak menjamin besaran ganti rugi, kemampuan pihak yang berutang membayar (Pasal 1535), pemberian hak atas tanah kepada Pihak Kedua, maupun penguasaan fisik lokasi"],
    ["8", "Kewajiban pembongkaran", "Beban pembongkaran bangunan dan benda menurut Pasal 18 PP 40/1996, bila kelak diwajibkan, beralih kepada Pihak Kedua"],
    ["9", "Penyerahan", "Penyerahan yuridis dengan penyerahan kunci dan dokumen di kantor Kurator (Pasal 612 KUHPerdata); penguasaan fisik menjadi tanggung jawab Pihak Kedua"],
    ["10", "Pemberitahuan cessie", "Dilakukan Kurator kepada Kanwil BPN Sumut, Kantah Langkat, Debitor, dan pengelola kebun (Pasal 613 KUHPerdata)"],
    ["11", "Pernyataan tidak terafiliasi", "Pihak Kedua menyatakan tidak terafiliasi dengan Debitor, direksi, maupun pengelola kebun; bila tidak benar, Kurator berhak membatalkan tanpa pengembalian biaya selain harga"],
    ["12", "Pajak dan biaya", "Biaya akta dan pajak yang timbul atas pengalihan ditanggung Pihak Kedua"],
    ["13", "Penyelesaian sengketa", "Musyawarah; bila tidak tercapai, melalui Pengadilan Niaga pada Pengadilan Negeri Medan"],
  ], [600, 2400, 6081], ["C", "L", "J"]),
];

const children = [...sampul];
for (const s of [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12, S13, LAMP]) children.push(...s);

const doc = new Document({
  creator: "Balai Harta Peninggalan Medan",
  title: "Himpunan Konsep Surat Cessie PT Rata Makmur",
  styles: { default: { document: { run: { font: FONT, size: 24 } } } },
  numbering,
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 737, right: 1361, bottom: 737, left: 1474, header: 400, footer: 400 } } },
    children,
  }],
});
Packer.toBuffer(doc).then(b => { fs.writeFileSync(process.argv[2] || "surat.docx", b); console.log("wrote"); });
